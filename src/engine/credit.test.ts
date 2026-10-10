import { describe, expect, it } from 'vitest';
import { economy } from '@/core/economy.config';
import { emi, loanAppCost, roundRupees } from '@/core/finance';
import type { GameState } from '@/core/types';
import { loanOffer } from './credit';
import { newGame, type Game } from './testkit';
import { K } from './util';

const cfg = economy.credit;
/** Two closed months at ₹5,000 each, so M (the 3-month average) is ₹5,000. Month 3 is open. */
const borrower = (): Game => newGame().lesson('a', 3, ['emergency']).plan().lesson('b').plan().lesson('c');
const withScore = (s: GameState, creditScore: number | null): GameState => ({ ...s, creditScore });

describe('credit profile (MECHANICS §5)', () => {
  it('no score exists until the first credit action; then it starts at 650', () => {
    const g = borrower();
    expect(g.state.creditScore).toBeNull();
    const fx = g.do({ type: 'CHECK_CREDIT_SCORE' });
    expect(g.state.creditScore).toBe(650);
    expect(g.state.unlocked).toContain('credit');
    expect(fx).toContainEqual({ kind: 'credit', delta: 0, score: 650 });
  });

  it('the score stays inside 300–900', () => {
    const g = borrower();
    g.state = withScore(g.state, 895);
    g.do({ type: 'APPLY_LOAN', terms: { kind: 'bank', principal: 3000, months: 3 } });
    g.plan();
    expect(g.state.creditScore).toBe(900);
  });
});

describe('loan offer = f(credit score)', () => {
  const s = borrower().state;
  it.each([
    [900, 10000, 14],
    [750, 10000, 14],
    [749, 8000, 18],
    [700, 8000, 18],
    [699, 6000, 22],
    [650, 6000, 22],
    [649, 3000, 26],
    [600, 3000, 26],
  ])('score %d → up to ₹%d at %d%%', (score, maxAmount, ratePa) => {
    expect(loanOffer(withScore(s, score))).toMatchObject({ maxAmount, ratePa, score });
  });

  it('under 600 the banks decline', () => {
    expect(loanOffer(withScore(s, 599))).toBeNull();
    expect(loanOffer(withScore(s, 300))).toBeNull();
  });

  it('someone new to credit is quoted at the starting score', () => {
    expect(loanOffer(s)).toMatchObject({ maxAmount: 6000, ratePa: 22, score: 650, reasonKey: K.loanReasonNewToCredit });
  });

  it('the maximum shrinks so the EMI stays within half of monthly practice money', () => {
    const lowIncome = newGame().lesson('a', 0).plan().lesson('b', 0).state;
    const offer = loanOffer(withScore(lowIncome, 760))!;
    expect(offer.maxAmount).toBeLessThan(10000);
    expect(emi(offer.maxAmount, offer.ratePa, 9)).toBeLessThanOrEqual(1000);
    expect(emi(offer.maxAmount + 100, offer.ratePa, 9)).toBeGreaterThan(1000);
  });
});

describe('EMIs reproduce the [CALC] figures', () => {
  it.each([
    [760, 1041],
    [700, 1053],
    [650, 1065],
  ])('₹6,000 over 6 months at score %d → EMI ₹%d', (score, expected) => {
    const g = borrower();
    g.state = withScore(g.state, score);
    const fx = g.do({ type: 'APPLY_LOAN', terms: { kind: 'bank', principal: 6000, months: 6 } });
    const loan = g.state.loans[0]!;
    expect(roundRupees(loan.emi)).toBe(expected);
    expect(fx).toContainEqual({ kind: 'loan', loanId: 'l1', emi: expected });
    expect(g.state.buckets.wallet).toBe(15000 + 6000);
    expect(g.state.unlocked).toContain('liabilities');
  });

  it('at 18% the six EMIs total ≈ ₹6,319, about ₹319 more than was borrowed', () => {
    const g = borrower();
    g.state = withScore(g.state, 700);
    g.do({ type: 'APPLY_LOAN', terms: { kind: 'bank', principal: 6000, months: 6 } });
    g.plan().months(5);
    const paid = g.state.history.reduce((a, m) => a + m.emis, 0);
    expect(roundRupees(paid)).toBe(6319);
    expect(g.state.loans[0]).toMatchObject({ status: 'paid', remaining: 0, paidMonths: 6, missedMonths: 0 });
  });
});

describe('score changes', () => {
  it('+10 for each on-time EMI and +15 once for finishing on schedule', () => {
    const g = borrower();
    g.do({ type: 'APPLY_LOAN', terms: { kind: 'bank', principal: 3000, months: 3 } });
    g.plan();
    expect(g.state.creditScore).toBe(660);
    g.months(1);
    expect(g.state.creditScore).toBe(670);
    g.months(1);
    expect(g.state.creditScore).toBe(680 + cfg.deltas.paidOffOnSchedule);
    expect(g.state.milestones).toEqual(expect.arrayContaining(['smartBorrower', 'debtFree']));
    expect(g.engine.netWorth(g.state)).toBe(roundRupees(Object.values(g.state.buckets).reduce((a, b) => a + b, 0)));
  });

  it('a missed EMI costs ₹200 and 40 points, and the loan carries on', () => {
    const g = borrower();
    g.do({ type: 'APPLY_LOAN', terms: { kind: 'bank', principal: 6000, months: 3 } });
    const due = g.state.loans[0]!.emi;
    g.do({ type: 'MOVE_MONEY', from: 'wallet', to: 'emergency', amount: 99999 });
    const fx = g.do({ type: 'PLAN_MONTH', plan: {} });
    expect(fx).toContainEqual({ kind: 'missedPayment', labelKey: K.missedEmi, fee: 200 });
    expect(g.state.creditScore).toBe(650 + cfg.deltas.missedEmi);
    expect(g.state.loans[0]).toMatchObject({ status: 'active', missedMonths: 1, paidMonths: 0, remaining: 6200 });
    expect(g.state.history.at(-1)).toMatchObject({ missedPayments: 1, emis: expect.closeTo(due, 6) });
    // Money for the next EMI is there, so it is paid; no schedule bonus after a miss.
    g.months(4);
    expect(g.state.loans[0]!.status).toBe('paid');
    expect(g.state.creditScore).toBe(610 + 4 * cfg.deltas.onTimeEmi);
    expect(g.state.milestones).not.toContain('smartBorrower');
  });

  it('−15 for a second loan while one is active, −5 for each extra application in a month', () => {
    const g = borrower();
    g.do({ type: 'APPLY_LOAN', terms: { kind: 'bank', principal: 2000, months: 9 } });
    expect(g.state.creditScore).toBe(650);
    g.do({ type: 'APPLY_LOAN', terms: { kind: 'bank', principal: 2000, months: 9 } });
    expect(g.state.creditScore).toBe(650 + cfg.deltas.extraApplicationSameMonth + cfg.deltas.secondLoanWhileActive);
    expect(g.state.loans).toHaveLength(2);
  });

  it('the lender declines when the EMI would be more than half of M', () => {
    const g = borrower();
    const fx = g.do({ type: 'APPLY_LOAN', terms: { kind: 'bank', principal: 6000, months: 2, ratePa: 22 } });
    expect(g.state.loans).toHaveLength(0);
    expect(fx.some((e) => e.kind === 'note' && e.key === K.loanDeclinedEmi)).toBe(true);
    expect(g.state.buckets.wallet).toBe(15000);
  });

  it('a score under 600 gets no bank loan', () => {
    const g = borrower();
    g.state = withScore(g.state, 580);
    const fx = g.do({ type: 'APPLY_LOAN', terms: { kind: 'bank', principal: 2000, months: 6 } });
    expect(g.state.loans).toHaveLength(0);
    expect(fx).toContainEqual({ kind: 'note', key: K.loanDeclinedScore, params: { score: 580 } });
  });
});

describe('other lenders', () => {
  it('"no-cost EMI" pays no cash in and charges price ÷ months', () => {
    const g = borrower();
    g.do({ type: 'APPLY_LOAN', terms: { kind: 'noCostEmi', principal: 6000, months: 6 } });
    expect(g.state.buckets.wallet).toBe(15000);
    expect(g.state.loans[0]).toMatchObject({ emi: 1000, remaining: 6000 });
    g.plan();
    expect(g.state.buckets.wallet).toBe(14000);
    expect(g.state.loans[0]!.remaining).toBe(5000);
  });

  it('loan app: get ₹2,700, repay ₹3,900 next month (≈ 44%)', () => {
    const g = borrower();
    g.do({ type: 'APPLY_LOAN', terms: { kind: 'loanApp', principal: 3000, months: 1 } });
    expect(g.state.buckets.wallet).toBe(15000 + 2700);
    expect(Math.round(loanAppCost(3000).costPctOfReceived)).toBe(44);
    expect(g.engine.netWorth(g.state)).toBe(15000 + 2700 - 3900);
    g.plan();
    expect(g.state.buckets.wallet).toBe(15000 + 2700 - 3900);
    expect(g.state.loans[0]!.status).toBe('paid');
  });

  it('loan app not repaid: default, −30, and the debt stays on the books', () => {
    const g = borrower();
    g.do({ type: 'APPLY_LOAN', terms: { kind: 'loanApp', principal: 3000, months: 1 } });
    g.do({ type: 'MOVE_MONEY', from: 'wallet', to: 'emergency', amount: 99999 });
    g.plan();
    expect(g.state.loans[0]).toMatchObject({ status: 'defaulted', remaining: 3900 });
    expect(g.state.creditScore).toBe(650 + cfg.deltas.default);
    g.months(2);
    expect(g.state.loans[0]!.status).toBe('defaulted');
    expect(g.state.creditScore).toBe(620);
  });

  it('moneylender at 10% a month: interest every month, principal at the end, no credit profile', () => {
    const g = borrower();
    g.do({ type: 'APPLY_LOAN', terms: { kind: 'informal', principal: 2800, months: 3 } });
    expect(g.state.creditScore).toBeNull();
    expect(g.state.loans[0]!.emi).toBeCloseTo(280, 6);
    const wallet = g.state.buckets.wallet;
    g.plan();
    expect(g.state.buckets.wallet).toBeCloseTo(wallet - 280, 6);
    g.months(2);
    expect(g.state.loans[0]!.status).toBe('paid');
    // Three interest payments and the principal: ₹840 extra on ₹2,800 in three months.
    expect(g.state.history.slice(-3).reduce((a, m) => a + m.emis, 0)).toBeCloseTo(2800 + 840, 6);
  });
});
