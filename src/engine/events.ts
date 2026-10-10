/**
 * The consequence engine (MECHANICS §6): apply an event choice, preview every choice ("what if"),
 * and "try again" once. Events are data (src/content/events); nothing here is random.
 *
 * Order inside one choice: loan → money → moves → invest → goal → possessions → insurance →
 * episode → joy → later → recurring → credit → shield → flags. A loan comes first so a purchase in
 * the same choice can be paid from it.
 */
import { economy } from '@/core/economy.config';
import type { Choice, LifeEvent, NowEffect } from '@/core/content-schema';
import type { BucketId, GameState, WhatIf } from '@/core/types';
import { applyLoan, changeScore, ensureProfile } from './credit';
import { closeRd, breakFd, openFd } from './deposits';
import { CASH_BUCKETS, credit, earmark, firstActiveGoal, freeWallet, moveCash, payChain } from './ledger';
import { buyGold, buyHolding, sellHolding, startEpisode } from './market';
import { netWorth } from './selectors';
import { addFlag, changeJoy, copy, isUnlocked, K, nextId, note, unlock, type Ctx, type EventRegistry } from './util';

/** Events that put money "into an FD" open one at the middle tenure on offer (6 months). */
const EVENT_FD_MONTHS = economy.clock.fdTenuresMonths[1];

// ---------- availability ----------

export function isAvailable(s: GameState, choice: Choice): boolean {
  const a = choice.availableIf;
  if (!a) return true;
  if (a.flag && !s.flags.includes(a.flag)) return false;
  if (a.notFlag && s.flags.includes(a.notFlag)) return false;
  if (a.minBucket && s.buckets[a.minBucket.bucket] < a.minBucket.amount) return false;
  if (a.unlocked && !isUnlocked(s, a.unlocked)) return false;
  if (a.insured !== undefined && s.insurance.health !== a.insured) return false;
  return true;
}

export const availableChoices = (s: GameState, event: LifeEvent): LifeEvent['choices'] =>
  event.choices.filter((c) => isAvailable(s, c));

// ---------- applying a choice ----------

/** Move money between any two buckets the way the player would (deposits and holdings included). */
function move(ctx: Ctx, from: BucketId, to: BucketId, amount: number | null): void {
  const isCash = (b: BucketId) => CASH_BUCKETS.includes(b);
  // Bring the money into the wallet first if it is not plain cash.
  if (!isCash(from)) {
    const before = ctx.s.buckets.wallet;
    if (from === 'fd') ctx.s.fds.filter((f) => f.status === 'active').forEach((f) => breakFd(ctx, f.id));
    else if (from === 'rd') ctx.s.rds.filter((r) => r.status === 'active').forEach((r) => closeRd(ctx, r.id));
    else if (from === 'gold') {
      sellHolding(ctx, 'goldEtf', 'all');
      sellHolding(ctx, 'goldPhysical', 'all');
    } else sellHolding(ctx, from === 'mf' ? 'mf' : 'shares', amount ?? 'all');
    if (to === 'wallet') return;
    amount = amount ?? ctx.s.buckets.wallet - before;
    from = 'wallet';
  }
  const available = from === 'wallet' ? freeWallet(ctx.s) : ctx.s.buckets[from];
  const wanted = Math.min(amount ?? available, available);
  if (wanted <= 0) return;
  if (isCash(to)) {
    if (to !== 'wallet') unlock(ctx, to as 'savings' | 'emergency');
    moveCash(ctx, from, to, wanted);
    return;
  }
  if (from !== 'wallet') moveCash(ctx, from, 'wallet', wanted);
  if (to === 'fd') {
    unlock(ctx, 'fd');
    openFd(ctx, wanted, EVENT_FD_MONTHS);
  } else if (to === 'gold') {
    unlock(ctx, 'gold');
    buyGold(ctx, wanted, 'etf');
  } else if (to === 'mf' || to === 'shares') {
    unlock(ctx, to);
    buyHolding(ctx, to, wanted);
  }
  // An RD cannot be opened by a one-off move: it needs an instalment and a tenure (use startRd).
}

function applyNow(ctx: Ctx, now: NowEffect): void {
  // If the lender says no, nothing else in this choice happens (no purchase without the money).
  if (now.loan && !applyLoan(ctx, now.loan)) return;

  if (now.money !== undefined && now.money < 0) payChain(ctx, -now.money, now.from ?? 'wallet');
  if (now.money !== undefined && now.money > 0) credit(ctx, now.to ?? 'wallet', now.money);

  for (const m of now.moves ?? []) move(ctx, m.from, m.to, m.amount);

  if (now.invest) {
    const { asset, amount } = now.invest;
    if (asset === 'gold') buyGold(ctx, amount, 'etf');
    else if (asset === 'goldPhysical') buyGold(ctx, amount, 'physical');
    else buyHolding(ctx, asset, amount);
  }

  if (now.goal !== undefined && now.goal !== 0) {
    const goal = firstActiveGoal(ctx.s) ?? ctx.s.goals.find((g) => g.saved > 0);
    if (!goal) note(ctx, K.noActiveGoal);
    else if (now.goal > 0) earmark(ctx, goal.id, now.goal);
    else {
      const cut = Math.min(goal.saved, -now.goal);
      goal.saved -= cut;
      if (goal.status === 'met' && goal.saved < goal.amount) goal.status = 'active';
      if (cut > 0) ctx.fx.push({ kind: 'goal', goalId: goal.id, delta: -Math.round(cut) });
    }
  }
  if (now.goalSlipMonths) {
    const goal = firstActiveGoal(ctx.s);
    if (goal) goal.deadlineMonth += now.goalSlipMonths;
  }

  for (const p of now.possessions ?? []) {
    ctx.s.possessions.push({
      id: nextId('p', ctx.s.possessions),
      name: p.nameKey,
      nameIsKey: true,
      cost: p.cost,
      category: p.category,
      boughtMonth: ctx.s.month,
      value: p.cost,
    });
    unlock(ctx, 'possessions');
    ctx.fx.push({ kind: 'possession', name: p.nameKey, value: Math.round(p.cost) });
  }

  if (now.insurance === 'buy') {
    ctx.s.insurance.health = true;
    addFlag(ctx, 'insured');
  }
  if (now.insurance === 'cancel') ctx.s.insurance.health = false;

  if (now.episode) startEpisode(ctx, now.episode);
  if (now.joy) changeJoy(ctx, now.joy);
}

export function applyChoice(ctx: Ctx, event: LifeEvent, choice: Choice): void {
  applyNow(ctx, choice.now);

  for (const later of choice.later ?? []) {
    const { inMonths, ...rest } = later;
    // The event shows after a month has closed, so "in 1 month" means the very next close.
    ctx.s.delayed.push({ id: nextId('d', ctx.s.delayed), dueMonth: ctx.s.month + inMonths - 1, ...rest, sourceEventId: event.id });
  }
  for (const r of choice.recurring ?? []) {
    ctx.s.recurring.push({
      id: nextId('r', ctx.s.recurring),
      labelKey: r.labelKey,
      perMonth: r.perMonth,
      monthsLeft: r.months,
      sourceEventId: event.id,
    });
  }

  if (choice.credit) {
    ensureProfile(ctx);
    changeScore(ctx, choice.credit);
  }
  if (choice.shield) {
    ctx.s.shield.seen += 1;
    if (choice.shield > 0) ctx.s.shield.correct += 1;
    ctx.fx.push({ kind: 'shield', seen: ctx.s.shield.seen, correct: ctx.s.shield.correct });
  }
  for (const flag of choice.flags ?? []) {
    addFlag(ctx, flag);
    FLAG_HOOKS[flag]?.(ctx);
  }
}

/**
 * A few flags also switch something in the state, because the choice schema has no field for it:
 * which savings account the player picked (Level 2) and pausing the SIP (Level 6).
 */
const FLAG_HOOKS: Record<string, (ctx: Ctx) => void> = {
  account_a: (ctx) => void (ctx.s.savingsAccount = 'A'),
  account_b: (ctx) => void (ctx.s.savingsAccount = 'B'),
  sip_paused: (ctx) => {
    if (ctx.s.sip) ctx.s.sip.active = false;
  },
};

// ---------- resolve, retry ----------

/**
 * RESOLVE_EVENT. First time: the state is snapshotted, the choice applied, and the choice recorded
 * as the first choice. Retry (once): the snapshot is restored, the new choice applied, and the
 * record keeps the first choice for the NGO's weak-spot stats.
 */
export function resolveEvent(ctx: Ctx, eventId: string, choiceId: string, isRetry: boolean): void {
  const event = ctx.reg.eventById(eventId);
  const choice = event?.choices.find((c) => c.id === choiceId);
  if (!event || !choice) return;
  const record = ctx.s.events[eventId];

  if (isRetry) {
    const snap = ctx.s.retrySnapshot;
    if (!record || record.retried || !snap || snap.eventId !== eventId) return;
    const restored: GameState = { ...copy(snap.before), retrySnapshot: null };
    if (!isAvailable(restored, choice)) return;
    ctx.s = restored;
    ctx.fx.length = 0;
    applyChoice(ctx, event, choice);
    ctx.s.events[eventId] = { firstChoiceId: snap.firstChoiceId, finalChoiceId: choiceId, retried: true, month: ctx.s.month };
    ctx.s.pendingEvents = ctx.s.pendingEvents.filter((id) => id !== eventId);
    return;
  }

  if (record || !isAvailable(ctx.s, choice)) return;
  const { retrySnapshot: _dropped, ...before } = copy(ctx.s);
  applyChoice(ctx, event, choice);
  ctx.s.events[eventId] = { firstChoiceId: choiceId, finalChoiceId: choiceId, retried: false, month: ctx.s.month };
  ctx.s.pendingEvents = ctx.s.pendingEvents.filter((id) => id !== eventId);
  ctx.s.retrySnapshot = { eventId, firstChoiceId: choiceId, before };
}

// ---------- what if ----------

/** Preview every choice on a copy of the state. The real state is never touched. */
export function whatIf(state: GameState, event: LifeEvent, reg: EventRegistry): WhatIf[] {
  return event.choices.map((choice) => {
    const available = isAvailable(state, choice);
    const ctx: Ctx = { s: copy(state), fx: [], reg };
    if (available) applyChoice(ctx, event, choice);
    const scoreBefore = state.creditScore ?? ctx.s.creditScore ?? 0;
    const wrong = (s: GameState) => s.shield.seen - s.shield.correct;
    return {
      choiceId: choice.id,
      verdict: choice.verdict,
      available,
      effects: ctx.fx,
      netWorthDelta: netWorth(ctx.s) - netWorth(state),
      joyDelta: ctx.s.joy - state.joy,
      creditDelta: (ctx.s.creditScore ?? 0) - scoreBefore,
      shieldDelta: ctx.s.shield.correct - state.shield.correct - (wrong(ctx.s) - wrong(state)),
    };
  });
}
