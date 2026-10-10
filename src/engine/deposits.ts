/**
 * Recurring and fixed deposits (MECHANICS §2 tenures, §3 bucket rules). Formulas come from finance.ts.
 *
 * Bucket values while a deposit runs:
 *   rd = instalments paid − missed-instalment fees      fd = principal
 * Interest is paid out at maturity (or at the early-closure rate if closed early).
 */
import { economy } from '@/core/economy.config';
import { fdEarlyBreak, fdMaturity, rdMaturity } from '@/core/finance';
import type { FixedDeposit, GameState, RecurringDeposit } from '@/core/types';
import { credit, freeWallet, payoutBucket, take } from './ledger';
import { addMilestone, amountOf, EPS, isUnlocked, K, nextId, note, type Ctx } from './util';

const rdFees = (rd: RecurringDeposit): number => rd.missedMonths * economy.rd.missedInstalmentFee;
const rdHeld = (rd: RecurringDeposit): number => Math.max(0, rd.instalment * rd.paidMonths - rdFees(rd));

/** Keep the rd / fd bucket totals equal to the deposits behind them. */
export function syncDepositBuckets(s: GameState): void {
  s.buckets.rd = s.rds.filter((r) => r.status === 'active').reduce((a, r) => a + rdHeld(r), 0);
  s.buckets.fd = s.fds.filter((f) => f.status === 'active').reduce((a, f) => a + f.principal, 0);
}

/** A deposit must finish before the game does (MECHANICS §2: "this matures after the game ends"). */
const finishesInGame = (s: GameState, months: number): boolean =>
  s.month + months - 1 <= economy.clock.totalSubSections;

function tenureOk(ctx: Ctx, months: number, offered: readonly number[]): boolean {
  if (!offered.includes(months)) {
    note(ctx, K.tenureNotOffered, { months });
    return false;
  }
  if (!finishesInGame(ctx.s, months)) {
    note(ctx, K.maturesAfterGameEnds, { months });
    return false;
  }
  return true;
}

/** Start an RD: the first instalment is paid now, the rest are automatic deductions. */
export function startRd(ctx: Ctx, instalment: number, months: number): number {
  const amount = amountOf(instalment);
  if (amount <= 0) return 0;
  if (!isUnlocked(ctx.s, 'rd')) {
    note(ctx, K.notUnlocked, { bucket: 'rd' });
    return 0;
  }
  if (!tenureOk(ctx, months, economy.clock.rdTenuresMonths)) return 0;
  if (freeWallet(ctx.s) + EPS < amount) {
    note(ctx, K.cannotAfford, { amount: Math.round(amount - freeWallet(ctx.s)) });
    return 0;
  }
  take(ctx, 'wallet', amount);
  ctx.s.rds.push({
    id: nextId('rd', ctx.s.rds),
    instalment: amount,
    ratePa: economy.rates.rdPa,
    months,
    paidMonths: 1,
    missedMonths: 0,
    startedMonth: ctx.s.month,
    status: 'active',
  });
  syncDepositBuckets(ctx.s);
  ctx.fx.push({ kind: 'money', bucket: 'rd', delta: Math.round(amount) });
  return amount;
}

export function openFd(ctx: Ctx, principal: number, months: number): number {
  const amount = amountOf(principal);
  if (amount <= 0) return 0;
  if (!isUnlocked(ctx.s, 'fd')) {
    note(ctx, K.notUnlocked, { bucket: 'fd' });
    return 0;
  }
  if (!tenureOk(ctx, months, economy.clock.fdTenuresMonths)) return 0;
  if (freeWallet(ctx.s) + EPS < amount) {
    note(ctx, K.cannotAfford, { amount: Math.round(amount - freeWallet(ctx.s)) });
    return 0;
  }
  take(ctx, 'wallet', amount);
  ctx.s.fds.push({
    id: nextId('fd', ctx.s.fds),
    principal: amount,
    ratePa: economy.rates.fdPa,
    months,
    startedMonth: ctx.s.month,
    status: 'active',
  });
  syncDepositBuckets(ctx.s);
  ctx.fx.push({ kind: 'money', bucket: 'fd', delta: Math.round(amount) });
  return amount;
}

function payOut(ctx: Ctx, from: 'rd' | 'fd', held: number, amount: number): void {
  syncDepositBuckets(ctx.s);
  ctx.fx.push({ kind: 'money', bucket: from, delta: -Math.round(held) });
  credit(ctx, payoutBucket(ctx.s), amount);
}

/** Months an FD has been held = month closes since it was opened. */
const fdMonthsHeld = (s: GameState, fd: FixedDeposit): number => Math.max(0, s.month - fd.startedMonth);

/** Break an FD early: principal back with interest only at the early-closure rate. */
export function breakFd(ctx: Ctx, fdId: string): void {
  const fd = ctx.s.fds.find((f) => f.id === fdId && f.status === 'active');
  if (!fd) return;
  const amount = fdEarlyBreak(fd.principal, fdMonthsHeld(ctx.s, fd));
  fd.status = 'brokenEarly';
  payOut(ctx, 'fd', fd.principal, amount);
  note(ctx, K.fdBrokenEarly, { amount: Math.round(amount) });
}

/** Close an RD early: instalments back with interest only at the early-closure rate. */
export function closeRd(ctx: Ctx, rdId: string): void {
  const rd = ctx.s.rds.find((r) => r.id === rdId && r.status === 'active');
  if (!rd) return;
  const held = rdHeld(rd);
  const amount = Math.max(0, rdMaturity(rd.instalment, economy.rates.earlyClosurePa, rd.paidMonths) - rdFees(rd));
  rd.status = 'closedEarly';
  payOut(ctx, 'rd', held, amount);
  note(ctx, K.rdClosedEarly, { amount: Math.round(amount) });
}

/** Month close, part 1: collect this month's RD instalments. Returns [paid, missedCount]. */
export function collectRdInstalments(ctx: Ctx, pay: (amount: number) => boolean): { paid: number; missed: number } {
  let paid = 0;
  let missed = 0;
  for (const rd of ctx.s.rds) {
    if (rd.status !== 'active' || rd.paidMonths + rd.missedMonths >= rd.months) continue;
    if (pay(rd.instalment)) {
      rd.paidMonths += 1;
      paid += rd.instalment;
    } else {
      rd.missedMonths += 1;
      missed += 1;
      ctx.fx.push({ kind: 'missedPayment', labelKey: K.missedRd, fee: economy.rd.missedInstalmentFee });
    }
  }
  syncDepositBuckets(ctx.s);
  if (paid > 0) ctx.fx.push({ kind: 'money', bucket: 'rd', delta: Math.round(paid) });
  return { paid, missed };
}

/** Month close, part 3: pay out deposits whose tenure has run. */
export function matureDeposits(ctx: Ctx): void {
  for (const rd of ctx.s.rds) {
    if (rd.status !== 'active' || rd.paidMonths + rd.missedMonths < rd.months) continue;
    const held = rdHeld(rd);
    const amount = Math.max(0, rdMaturity(rd.instalment, rd.ratePa, rd.paidMonths) - rdFees(rd));
    rd.status = 'matured';
    payOut(ctx, 'rd', held, amount);
    note(ctx, K.rdMatured, { amount: Math.round(amount) });
    addMilestone(ctx, 'firstRdMatured');
  }
  for (const fd of ctx.s.fds) {
    if (fd.status !== 'active' || ctx.s.month - fd.startedMonth + 1 < fd.months) continue;
    const amount = fdMaturity(fd.principal, fd.ratePa, fd.months);
    fd.status = 'matured';
    payOut(ctx, 'fd', fd.principal, amount);
    note(ctx, K.fdMatured, { amount: Math.round(amount) });
  }
}
