/**
 * The bucket ledger: wallet, earmarks, payments, wants and goals (MECHANICS §1, §1.2, §3).
 *
 * Earmarked goal money stays in the wallet ("counts as the bucket it came from") and is tracked
 * on each goal as `saved`. The player's own spending can only use the free part of the wallet;
 * automatic deductions and event losses can reach all of it, and earmarks shrink to fit.
 */
import { economy } from '@/core/economy.config';
import type { BucketId, GameState, NewWant } from '@/core/types';
import { amountOf, changeJoy, EPS, fxMoney, isUnlocked, K, nextId, note, unlock, type Ctx } from './util';

/** Joy for buying a planned want (LESSON_1.1 §6: "Joy +1 if a want was bought"). */
export const JOY_PER_WANT = 1;
const MAX_WANT_NAME = 40;

/** Buckets that hold plain cash and can be moved freely. */
export const CASH_BUCKETS: readonly BucketId[] = ['wallet', 'savings', 'emergency'];

export const earmarked = (s: GameState): number => s.goals.reduce((a, g) => a + g.saved, 0);
/** Wallet money not promised to a goal. */
export const freeWallet = (s: GameState): number => Math.max(0, s.buckets.wallet - earmarked(s));

/** If the wallet fell below the earmarked total, shrink earmarks (newest goal first). */
export function trimEarmarks(ctx: Ctx): void {
  let over = earmarked(ctx.s) - ctx.s.buckets.wallet;
  for (let i = ctx.s.goals.length - 1; i >= 0 && over > EPS; i--) {
    const g = ctx.s.goals[i]!;
    const cut = Math.min(g.saved, over);
    if (cut <= 0) continue;
    g.saved -= cut;
    over -= cut;
    if (g.status === 'met' && g.saved + EPS < g.amount) g.status = 'active';
    ctx.fx.push({ kind: 'goal', goalId: g.id, delta: -Math.round(cut) });
  }
}

export function credit(ctx: Ctx, bucket: BucketId, amount: number): void {
  if (amount <= 0) return;
  ctx.s.buckets[bucket] += amount;
  fxMoney(ctx, bucket, amount);
}

/** Take up to `amount` from a bucket. Returns what was actually taken. */
export function take(ctx: Ctx, bucket: BucketId, amount: number): number {
  const taken = Math.min(amount, Math.max(0, ctx.s.buckets[bucket]));
  if (taken <= 0) return 0;
  ctx.s.buckets[bucket] -= taken;
  if (ctx.s.buckets[bucket] < EPS) ctx.s.buckets[bucket] = economy.money.floor;
  fxMoney(ctx, bucket, -taken);
  if (bucket === 'wallet') trimEarmarks(ctx);
  return taken;
}

/**
 * Automatic deduction (MECHANICS §1.1 shortfall rule): paid in full from Wallet, then Savings.
 * If the two together cannot cover it, nothing is taken and the payment is missed.
 */
export function payAuto(ctx: Ctx, amount: number): boolean {
  if (amount <= 0) return true;
  const { wallet, savings } = ctx.s.buckets;
  if (wallet + savings + EPS < amount) return false;
  const fromWallet = take(ctx, 'wallet', amount);
  if (amount - fromWallet > EPS) take(ctx, 'savings', amount - fromWallet);
  return true;
}

/**
 * Forced loss (event costs, scam losses). Starts at `first`, then Wallet → Savings → Emergency.
 * Balances never go below ₹0: whatever cannot be covered is waived with a note.
 */
export function payChain(ctx: Ctx, amount: number, first: BucketId = 'wallet'): number {
  let left = amount;
  const order: BucketId[] = [first, ...CASH_BUCKETS.filter((b) => b !== first)];
  for (const bucket of order) {
    if (left <= EPS) break;
    left -= take(ctx, bucket, left);
  }
  if (left > EPS) note(ctx, K.shortfallWaived, { amount: Math.round(left) });
  return amount - Math.max(0, left);
}

/** Where maturing deposits and sale proceeds land. */
export const payoutBucket = (s: GameState): BucketId => (isUnlocked(s, 'savings') ? 'savings' : 'wallet');

// ---------- cash moves ----------

export function moveCash(ctx: Ctx, from: BucketId, to: BucketId, requested: number): number {
  if (from === to || !CASH_BUCKETS.includes(from) || !CASH_BUCKETS.includes(to)) return 0;
  if (to !== 'wallet' && !isUnlocked(ctx.s, to as 'savings' | 'emergency')) {
    note(ctx, K.notUnlocked, { bucket: to });
    return 0;
  }
  const available = from === 'wallet' ? freeWallet(ctx.s) : ctx.s.buckets[from];
  const amount = Math.min(amountOf(requested), available);
  if (amount <= 0) return 0;
  const moved = take(ctx, from, amount);
  credit(ctx, to, moved);
  return moved;
}

// ---------- wants ----------

const cleanName = (name: unknown): string => String(name ?? '').trim().slice(0, MAX_WANT_NAME);

export function addWant(ctx: Ctx, want: NewWant): void {
  const name = cleanName(want.name);
  const price = amountOf(want.price);
  if (!name || price <= 0) return;
  ctx.s.wants.push({
    id: nextId('w', ctx.s.wants),
    name,
    price,
    kind: want.kind === 'experience' ? 'experience' : 'item',
    ...(want.category ? { category: want.category } : {}),
    ...(amountOf(want.targetMonth) ? { targetMonth: Math.floor(want.targetMonth!) } : {}),
    createdMonth: ctx.s.month,
    status: 'open',
  });
  unlock(ctx, 'myWants');
}

export function updateWant(ctx: Ctx, wantId: string, changes: Partial<NewWant>): void {
  const w = ctx.s.wants.find((x) => x.id === wantId);
  if (!w || w.status === 'bought' || w.status === 'dropped') return;
  if (changes.name !== undefined && cleanName(changes.name)) w.name = cleanName(changes.name);
  if (changes.price !== undefined && amountOf(changes.price)) w.price = amountOf(changes.price);
  if (changes.kind !== undefined) w.kind = changes.kind === 'experience' ? 'experience' : 'item';
  if (changes.category !== undefined) w.category = changes.category;
  if (changes.targetMonth !== undefined && amountOf(changes.targetMonth)) w.targetMonth = Math.floor(changes.targetMonth);
  const goal = ctx.s.goals.find((g) => g.wantId === w.id);
  if (goal) goal.name = w.name;
}

export function dropWant(ctx: Ctx, wantId: string): void {
  const w = ctx.s.wants.find((x) => x.id === wantId);
  if (!w || w.status === 'bought' || w.status === 'dropped') return;
  w.status = 'dropped';
  const goal = ctx.s.goals.find((g) => g.wantId === w.id);
  if (goal && goal.saved > 0) {
    // The earmark is released back into the free wallet.
    ctx.fx.push({ kind: 'goal', goalId: goal.id, delta: -Math.round(goal.saved) });
    goal.saved = 0;
  }
  // A dropped want takes its goal with it (there is nothing left to save for).
  if (goal) ctx.s.goals = ctx.s.goals.filter((g) => g.id !== goal.id);
}

/** Buy a want from the free wallet plus whatever was earmarked for it. */
export function buyWant(ctx: Ctx, wantId: string): boolean {
  const w = ctx.s.wants.find((x) => x.id === wantId);
  if (!w || (w.status !== 'open' && w.status !== 'goal')) return false;
  const goal = ctx.s.goals.find((g) => g.wantId === w.id);
  const reserved = goal?.saved ?? 0;
  if (freeWallet(ctx.s) + reserved + EPS < w.price) {
    note(ctx, K.cannotAfford, { amount: Math.round(w.price - freeWallet(ctx.s) - reserved) });
    return false;
  }
  if (goal) {
    goal.saved = 0;
    goal.status = 'met';
  }
  take(ctx, 'wallet', w.price);
  w.status = 'bought';
  if (w.kind === 'item') {
    ctx.s.possessions.push({
      id: nextId('p', ctx.s.possessions),
      name: w.name,
      cost: w.price,
      category: w.category ?? 'other',
      boughtMonth: ctx.s.month,
      value: w.price,
    });
    unlock(ctx, 'possessions');
    ctx.fx.push({ kind: 'possession', name: w.name, value: Math.round(w.price) });
  }
  changeJoy(ctx, JOY_PER_WANT);
  return true;
}

// ---------- goals ----------

export function promoteGoal(ctx: Ctx, wantId: string, amount: number, deadlineMonth: number): void {
  const w = ctx.s.wants.find((x) => x.id === wantId);
  if (!w || (w.status !== 'open' && w.status !== 'goal')) return;
  const target = amountOf(amount) || w.price;
  const deadline = Math.max(ctx.s.month, Math.floor(amountOf(deadlineMonth)) || ctx.s.month);
  const existing = ctx.s.goals.find((g) => g.wantId === w.id);
  if (existing) {
    existing.amount = target;
    existing.deadlineMonth = deadline;
    existing.status = existing.saved + EPS >= target ? 'met' : 'active';
  } else {
    ctx.s.goals.push({
      id: nextId('g', ctx.s.goals),
      wantId: w.id,
      name: w.name,
      amount: target,
      deadlineMonth: deadline,
      saved: 0,
      status: 'active',
      extendedTimes: 0,
    });
  }
  w.status = 'goal';
  unlock(ctx, 'goals');
}

export function addGoal(ctx: Ctx, name: string, amount: number, deadlineMonth: number): void {
  const clean = cleanName(name);
  const target = amountOf(amount);
  if (!clean || target <= 0) return;
  ctx.s.goals.push({
    id: nextId('g', ctx.s.goals),
    name: clean,
    amount: target,
    deadlineMonth: Math.max(ctx.s.month, Math.floor(amountOf(deadlineMonth)) || ctx.s.month),
    saved: 0,
    status: 'active',
    extendedTimes: 0,
  });
  unlock(ctx, 'goals');
}

export function extendGoal(ctx: Ctx, goalId: string, deadlineMonth: number): void {
  const g = ctx.s.goals.find((x) => x.id === goalId);
  const deadline = Math.floor(amountOf(deadlineMonth));
  if (!g || deadline <= g.deadlineMonth || deadline < ctx.s.month) return;
  g.deadlineMonth = deadline;
  g.extendedTimes += 1;
  if (g.status === 'missed') g.status = 'active';
}

/** Earmark free wallet money toward a goal (capped at what the goal still needs). */
export function earmark(ctx: Ctx, goalId: string, requested: number): number {
  const g = ctx.s.goals.find((x) => x.id === goalId);
  if (!g || g.status === 'met') return 0;
  const amount = Math.min(amountOf(requested), freeWallet(ctx.s), Math.max(0, g.amount - g.saved));
  if (amount <= 0) return 0;
  g.saved += amount;
  ctx.fx.push({ kind: 'goal', goalId: g.id, delta: Math.round(amount) });
  return amount;
}

/** The first goal still being saved for (events that say "toward your goal" use it). */
export const firstActiveGoal = (s: GameState) => s.goals.find((g) => g.status === 'active');

/** Month-close check: goals reached are met; goals past their deadline are missed (extendable). */
export function checkGoals(ctx: Ctx): void {
  for (const g of ctx.s.goals) {
    if (g.status !== 'active') continue;
    if (g.saved + EPS >= g.amount) {
      g.status = 'met';
      note(ctx, K.goalMet, { goalId: g.id });
    } else if (ctx.s.month >= g.deadlineMonth) {
      g.status = 'missed';
      note(ctx, K.goalMissed, { goalId: g.id });
    }
  }
}
