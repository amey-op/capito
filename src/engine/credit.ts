/**
 * Credit score, loan offers and loans (MECHANICS §5). Numbers from economy.credit, EMI from finance.emi.
 *
 * How each loan kind is repaid:
 *   bank / noCostEmi / coSigned  reducing-balance EMI every month
 *   loanApp                      one repayment next month; missing it is a default
 *   informal                     interest only each month, principal with the last payment
 * Who gets cash: bank, loanApp and informal loans pay the principal into the wallet. A noCostEmi or
 * coSigned loan pays nothing in (the shop, or the friend, got the money).
 */
import { economy } from '@/core/economy.config';
import { clamp, creditOffer, emi, loanAppCost, monthlyRate } from '@/core/finance';
import type { LoanTerms } from '@/core/content-schema';
import type { GameState, Loan, LoanOffer } from '@/core/types';
import { credit as creditBucket } from './ledger';
import { addMilestone, amountOf, EPS, K, nextId, note, unlock, type Ctx } from './util';

const cfg = economy.credit;
const BUREAU_KINDS: ReadonlyArray<Loan['kind']> = ['bank', 'noCostEmi', 'loanApp', 'coSigned'];

/** A score exists only after the first credit action; it then starts at economy.credit.start. */
export function ensureProfile(ctx: Ctx): number {
  if (ctx.s.creditScore === null) {
    ctx.s.creditScore = cfg.start;
    unlock(ctx, 'credit');
    ctx.fx.push({ kind: 'credit', delta: 0, score: cfg.start });
  }
  return ctx.s.creditScore;
}

/** Change the score if a profile exists (automatic consequences never create a profile). */
export function changeScore(ctx: Ctx, delta: number): void {
  if (ctx.s.creditScore === null || !delta) return;
  const before = ctx.s.creditScore;
  ctx.s.creditScore = clamp(before + delta, cfg.min, cfg.max);
  ctx.fx.push({ kind: 'credit', delta: ctx.s.creditScore - before, score: ctx.s.creditScore });
}

/** Practice money M used for affordability: the average of the last 3 closed months (else this month's). */
export function referenceMonthly(s: GameState): number {
  const recent = s.history.slice(-economy.health.averageOverMonths);
  if (recent.length === 0) return s.monthMoney;
  return recent.reduce((a, m) => a + m.income, 0) / recent.length;
}

const maxEmi = (s: GameState): number => referenceMonthly(s) * (cfg.maxEmiShareOfMonthlyPct / 100);
const longestTenure = (): number => Math.max(...economy.clock.emiTenuresMonths);

/**
 * The formal lender's offer for this player: rate and maximum from the score band, with the
 * maximum also limited so the EMI over the longest tenure stays within 50% of M.
 * null = banks decline (score under 600, or no EMI is affordable).
 */
export function loanOffer(s: GameState): LoanOffer | null {
  const score = s.creditScore ?? cfg.start;
  const band = creditOffer(score);
  if (!band) return null;
  const perRupee = emi(1, band.ratePa, longestTenure());
  const affordable = Math.floor(maxEmi(s) / perRupee / 100) * 100;
  const maxAmount = Math.min(band.maxAmount, affordable);
  if (maxAmount <= 0) return null;
  return {
    maxAmount,
    ratePa: band.ratePa,
    score,
    reasonKey: s.creditScore === null ? K.loanReasonNewToCredit : K.loanReasonBand,
  };
}

const activeBureauLoans = (s: GameState): number =>
  s.loans.filter((l) => l.status === 'active' && BUREAU_KINDS.includes(l.kind)).length;

function addLoan(ctx: Ctx, loan: Omit<Loan, 'id' | 'paidMonths' | 'missedMonths' | 'startedMonth' | 'status'>): Loan {
  const full: Loan = {
    ...loan,
    id: nextId('l', ctx.s.loans),
    paidMonths: 0,
    missedMonths: 0,
    startedMonth: ctx.s.month,
    status: 'active',
  };
  ctx.s.loans.push(full);
  unlock(ctx, 'liabilities');
  ctx.fx.push({ kind: 'loan', loanId: full.id, emi: Math.round(full.emi) });
  return full;
}

/**
 * Apply for credit (the APPLY_LOAN action and loans inside event choices).
 * Returns the loan, or null if the lender declined.
 */
export function applyLoan(ctx: Ctx, terms: LoanTerms): Loan | null {
  const principal = amountOf(terms.principal);
  const months = Math.floor(amountOf(terms.months));
  if (principal <= 0 || months <= 0) return null;

  if (terms.kind === 'informal') {
    // A moneylender does not report to a bureau: no profile, no score change.
    const pct = terms.ratePctPerMonth ?? cfg.moneylenderPctPerMonth;
    creditBucket(ctx, 'wallet', principal);
    return addLoan(ctx, {
      kind: 'informal',
      principal,
      ratePa: pct * 12,
      months,
      emi: principal * (pct / 100),
      remaining: principal,
    });
  }

  ensureProfile(ctx);
  ctx.s.creditApplicationsThisMonth += 1;
  if (ctx.s.creditApplicationsThisMonth > 1) changeScore(ctx, cfg.deltas.extraApplicationSameMonth);

  if (terms.kind === 'loanApp') {
    const amount = Math.min(principal, cfg.loanApp.maxAmount);
    const { received, repay } = loanAppCost(amount);
    if (activeBureauLoans(ctx.s) > 0) changeScore(ctx, cfg.deltas.secondLoanWhileActive);
    creditBucket(ctx, 'wallet', received);
    return addLoan(ctx, { kind: 'loanApp', principal: amount, ratePa: 0, months: 1, emi: repay, remaining: repay });
  }

  let amount = principal;
  let ratePa = terms.ratePa ?? 0;
  if (terms.kind === 'bank') {
    const offer = loanOffer(ctx.s);
    if (!offer) {
      note(ctx, K.loanDeclinedScore, { score: ctx.s.creditScore ?? cfg.start });
      return null;
    }
    amount = Math.min(principal, offer.maxAmount);
    ratePa = terms.ratePa ?? offer.ratePa;
  }
  const monthly = emi(amount, ratePa, months);
  if (monthly > maxEmi(ctx.s) + EPS) {
    note(ctx, K.loanDeclinedEmi, { emi: Math.round(monthly), max: Math.round(maxEmi(ctx.s)) });
    return null;
  }
  if (activeBureauLoans(ctx.s) > 0) changeScore(ctx, cfg.deltas.secondLoanWhileActive);
  if (terms.kind === 'bank') creditBucket(ctx, 'wallet', amount);
  return addLoan(ctx, { kind: terms.kind, principal: amount, ratePa, months, emi: monthly, remaining: amount });
}

/** What a loan asks for this month. */
export function dueThisMonth(loan: Loan): number {
  if (loan.kind === 'loanApp') return loan.remaining;
  if (loan.kind === 'informal') {
    const interest = loan.principal * monthlyRate(loan.ratePa);
    const isLast = loan.paidMonths + 1 >= loan.months;
    return interest + (isLast ? loan.remaining : 0);
  }
  return Math.min(loan.emi, loan.remaining * (1 + monthlyRate(loan.ratePa)));
}

/**
 * Month close, part 1: collect every active loan's payment.
 * Missed (MECHANICS §1.1, §5): ₹200 late fee added to what is owed and score −40; a missed
 * loan-app repayment is a default (score −30). Never a game-over.
 */
export function collectLoanPayments(ctx: Ctx, pay: (amount: number) => boolean): { due: number; missed: number } {
  let due = 0;
  let missed = 0;
  for (const loan of ctx.s.loans) {
    if (loan.status !== 'active') continue;
    const amount = dueThisMonth(loan);
    due += amount;
    if (pay(amount)) {
      if (loan.kind === 'informal') {
        if (loan.paidMonths + 1 >= loan.months) loan.remaining = 0;
      } else if (loan.kind === 'loanApp') {
        loan.remaining = 0;
      } else {
        loan.remaining = loan.remaining * (1 + monthlyRate(loan.ratePa)) - amount;
      }
      loan.paidMonths += 1;
      if (loan.kind !== 'informal') changeScore(ctx, cfg.deltas.onTimeEmi);
      if (loan.remaining < 0.005) {
        loan.remaining = 0;
        loan.status = 'paid';
        note(ctx, K.loanPaidOff, { loanId: loan.id });
        if (loan.missedMonths === 0 && loan.kind !== 'informal') {
          changeScore(ctx, cfg.deltas.paidOffOnSchedule);
          addMilestone(ctx, 'smartBorrower');
        }
        if (!ctx.s.loans.some((l) => l.status === 'active')) addMilestone(ctx, 'debtFree');
      }
    } else {
      missed += 1;
      loan.missedMonths += 1;
      ctx.fx.push({ kind: 'missedPayment', labelKey: K.missedEmi, fee: cfg.lateFee });
      if (loan.kind === 'loanApp') {
        loan.status = 'defaulted';
        changeScore(ctx, cfg.deltas.default);
        note(ctx, K.loanDefaulted, { loanId: loan.id });
      } else {
        loan.remaining += cfg.lateFee;
        if (loan.kind !== 'informal') changeScore(ctx, cfg.deltas.missedEmi);
      }
    }
  }
  return { due, missed };
}

/** What the player owes in total (shown as negative in net worth). */
export const totalOwed = (s: GameState): number =>
  s.loans.filter((l) => l.status === 'active' || l.status === 'defaulted').reduce((a, l) => a + l.remaining, 0);
