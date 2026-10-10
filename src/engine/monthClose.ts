/**
 * One month close (MECHANICS §1.1), run by PLAN_MONTH, in this fixed order:
 *   1. automatic deductions: EMIs → RD instalments → SIP → insurance premium → other recurring
 *      charges, each under the shortfall rule (Wallet, then Savings, else missed)
 *   2. the player's plan: buy wants, earmark to goals, move to buckets, start RD / FD / SIP, insurance
 *   3. interest and accruals, deposit maturity, depreciation, market step, delayed effects, goals
 *   4. the month counter moves on and the month is logged
 *   5. events whose `after` is the sub-section just completed are queued
 */
import { economy } from '@/core/economy.config';
import { monthlyDepreciationFactor, savingsMonthInterest } from '@/core/finance';
import type { DelayedEffect, GameState, MonthLog, MonthPlan } from '@/core/types';
import { changeScore, collectLoanPayments, ensureProfile } from './credit';
import { collectRdInstalments, matureDeposits, openFd, startRd } from './deposits';
import { buyWant, checkGoals, credit, earmark, freeWallet, moveCash, payAuto, payChain, take } from './ledger';
import { addToHolding, buyGold, buyHolding, stepMarket } from './market';
import { investmentTypes, monthsCovered, savedPool } from './selectors';
import { addFlag, addMilestone, amountOf, changeJoy, isUnlocked, K, nextId, note, type Ctx } from './util';

/** "First ₹10,000 saved" milestone (MECHANICS §8). */
const FIRST_SAVED_MILESTONE = 10000;
const GOALS_SET_MILESTONE = 3;

// ---------- 1. automatic deductions ----------

function automaticDeductions(ctx: Ctx, log: MonthLog): void {
  const pay = (amount: number) => payAuto(ctx, amount);

  const loans = collectLoanPayments(ctx, pay);
  log.emis += loans.due;
  log.missedPayments += loans.missed;

  log.missedPayments += collectRdInstalments(ctx, pay).missed;

  const sip = ctx.s.sip;
  if (sip?.active && sip.monthly > 0) {
    if (pay(sip.monthly)) addToHolding(ctx, 'mf', sip.monthly);
    else {
      sip.pausedMonths += 1;
      note(ctx, K.sipSkipped, { amount: sip.monthly });
    }
  }

  if (ctx.s.insurance.health && !pay(economy.insurance.healthPremiumPerMonth)) {
    ctx.s.insurance.health = false;
    log.missedPayments += 1;
    note(ctx, K.insuranceLapsed);
  }

  const lateFees: number[] = [];
  for (const charge of ctx.s.recurring) {
    if (pay(charge.perMonth)) {
      charge.monthsLeft -= 1;
    } else {
      log.missedPayments += 1;
      const isFee = charge.labelKey === K.lateFeeCharge;
      ctx.fx.push({ kind: 'missedPayment', labelKey: charge.labelKey, fee: isFee ? 0 : economy.shortfall.lateFee });
      changeScore(ctx, economy.shortfall.creditDelta);
      // The late fee is collected next month; a missed fee does not grow another fee.
      if (!isFee) lateFees.push(economy.shortfall.lateFee);
    }
  }
  ctx.s.recurring = ctx.s.recurring.filter((c) => c.monthsLeft > 0);
  for (const fee of lateFees) {
    ctx.s.recurring.push({ id: nextId('r', ctx.s.recurring), labelKey: K.lateFeeCharge, perMonth: fee, monthsLeft: 1 });
  }
}

// ---------- 2. the player's plan ----------

function applyPlan(ctx: Ctx, plan: MonthPlan): void {
  for (const wantId of plan.buyWants ?? []) buyWant(ctx, wantId);
  for (const [goalId, rupees] of Object.entries(plan.earmark ?? {})) earmark(ctx, goalId, rupees);

  const to = plan.toBuckets ?? {};
  if (amountOf(to.savings)) moveCash(ctx, 'wallet', 'savings', to.savings!);
  if (amountOf(to.emergency)) moveCash(ctx, 'wallet', 'emergency', to.emergency!);
  // Market buckets in a plan: gold means regulated paper gold (the lower-cost form); use BUY_GOLD for jewellery.
  if (amountOf(to.gold)) buyGold(ctx, to.gold!, 'etf');
  if (amountOf(to.mf)) buyHolding(ctx, 'mf', to.mf!);
  if (amountOf(to.shares)) buyHolding(ctx, 'shares', to.shares!);

  if (plan.startRd) startRd(ctx, plan.startRd.instalment, plan.startRd.months);
  if (plan.openFd) openFd(ctx, plan.openFd.principal, plan.openFd.months);
  if (plan.sip !== undefined) setSip(ctx, plan.sip);

  if (plan.buyInsurance && !ctx.s.insurance.health) {
    if (!isUnlocked(ctx.s, 'insurance')) note(ctx, K.notUnlocked, { bucket: 'insurance' });
    else if (freeWallet(ctx.s) < economy.insurance.healthPremiumPerMonth) {
      note(ctx, K.cannotAfford, { amount: economy.insurance.healthPremiumPerMonth });
    } else {
      take(ctx, 'wallet', economy.insurance.healthPremiumPerMonth);
      ctx.s.insurance.health = true;
      addFlag(ctx, 'insured');
    }
  }
}

/** Start, change, pause or stop the SIP. A new SIP invests its first instalment straight away. */
export function setSip(ctx: Ctx, sip: NonNullable<MonthPlan['sip']>): void {
  if (sip === 'stop') {
    ctx.s.sip = null;
    return;
  }
  if (sip === 'pause') {
    if (ctx.s.sip) ctx.s.sip.active = false;
    return;
  }
  const step = economy.sip.multipleOf;
  const monthly = Math.floor(amountOf(sip.monthly) / step) * step;
  if (monthly <= 0) return;
  if (!isUnlocked(ctx.s, 'mf')) {
    note(ctx, K.notUnlocked, { bucket: 'mf' });
    return;
  }
  if (ctx.s.sip) {
    ctx.s.sip = { ...ctx.s.sip, monthly, active: true };
    return;
  }
  ctx.s.sip = { monthly, active: true, startedMonth: ctx.s.month, pausedMonths: 0 };
  buyHolding(ctx, 'mf', monthly);
}

// ---------- 3. accruals ----------

function savingsRatePa(s: GameState): number {
  if (s.savingsAccount === 'A') return economy.rates.accountAPa;
  if (s.savingsAccount === 'B') return economy.rates.accountBPa;
  return economy.rates.savingsPa;
}

function accrueInterest(ctx: Ctx): void {
  const { s } = ctx;
  credit(ctx, 'savings', savingsMonthInterest(s.buckets.savings, savingsRatePa(s)));
  credit(ctx, 'emergency', savingsMonthInterest(s.buckets.emergency));
  // Account B (Level 2 event): a fee each quarter the balance is under its minimum.
  const b = economy.accountB;
  if (s.savingsAccount === 'B' && s.month % 3 === 0 && s.buckets.savings < b.minimumBalance) {
    payChain(ctx, b.feePerQuarter, 'savings');
    note(ctx, K.accountFee, { amount: b.feePerQuarter });
  }
}

function depreciate(ctx: Ctx): void {
  for (const p of ctx.s.possessions) p.value *= monthlyDepreciationFactor(economy.depreciationPa[p.category]);
}

/** Apply one delayed effect (from an event's `later`). */
export function applyDelayed(ctx: Ctx, d: DelayedEffect): void {
  if (d.money !== undefined && d.money < 0) payChain(ctx, -d.money, d.from ?? 'wallet');
  if (d.money !== undefined && d.money > 0) credit(ctx, 'wallet', d.money);
  if (d.joy) changeJoy(ctx, d.joy);
  if (d.credit) {
    // A delayed hit to the score (a co-signed loan going bad) means a bureau now knows the player.
    ensureProfile(ctx);
    changeScore(ctx, d.credit);
  }
  for (const flag of d.flags ?? []) addFlag(ctx, flag);
  if (d.noteKey) note(ctx, d.noteKey);
  if (d.eventId) queueEvent(ctx, d.eventId);
}

function applyDueDelayed(ctx: Ctx): void {
  const due = ctx.s.delayed.filter((d) => d.dueMonth <= ctx.s.month);
  ctx.s.delayed = ctx.s.delayed.filter((d) => d.dueMonth > ctx.s.month);
  for (const d of due) applyDelayed(ctx, d);
}

// ---------- 5. events and milestones ----------

export function queueEvent(ctx: Ctx, eventId: string): void {
  if (ctx.s.events[eventId] || ctx.s.pendingEvents.includes(eventId)) return;
  ctx.s.pendingEvents.push(eventId);
  ctx.fx.push({ kind: 'eventQueued', eventId });
}

/** Milestones that depend only on the state (ids from MECHANICS §8). */
export function checkMilestones(ctx: Ctx): void {
  const { s } = ctx;
  if (Object.keys(s.progress).length >= 1) addMilestone(ctx, 'firstStep');
  if (savedPool(s) >= FIRST_SAVED_MILESTONE) addMilestone(ctx, 'first10kSaved');
  if (s.goals.length >= GOALS_SET_MILESTONE) addMilestone(ctx, 'goalsSet3');
  if (monthsCovered(s) >= economy.health.emergencyMonths.low) addMilestone(ctx, 'safetyNet1');
  if (monthsCovered(s) >= economy.health.emergencyMonths.high) addMilestone(ctx, 'safetyNet3');
  if (investmentTypes(s) >= economy.health.diversification.high) addMilestone(ctx, 'diversified');
  if (s.flags.includes('keeps_records')) addMilestone(ctx, 'recordsKeeper');
  if (s.flags.includes('stayed_calm')) addMilestone(ctx, 'stayedCalm');
  if (Object.keys(s.progress).length >= economy.clock.totalSubSections) addMilestone(ctx, 'finisher');
}

// ---------- the close ----------

export function closeMonth(ctx: Ctx, plan: MonthPlan): void {
  const { s } = ctx;
  const closing = s.month;
  // What had been saved by the end of last month = the sum of every earlier month's change.
  const savedBefore = s.history.reduce((a, m) => a + m.saved, 0);
  const log: MonthLog = { month: closing, income: s.monthMoney, saved: 0, emis: 0, missedPayments: 0 };

  automaticDeductions(ctx, log);
  applyPlan(ctx, plan);

  accrueInterest(ctx);
  matureDeposits(ctx);
  depreciate(ctx);
  stepMarket(ctx);
  applyDueDelayed(ctx);
  checkGoals(ctx);

  log.saved = savedPool(s) - savedBefore;
  s.history.push(log);
  s.month = closing + 1;
  s.awaitingPlan = false;
  s.creditApplicationsThisMonth = 0;

  if (s.lastCompletedSubSection) {
    for (const event of ctx.reg.eventsAfter(s.lastCompletedSubSection)) queueEvent(ctx, event.id);
  }
  checkMilestones(ctx);
}
