import { describe, expect, it } from 'vitest';
import { economy } from '@/core/economy.config';
import { fdMaturity, rdMaturity, roundRupees } from '@/core/finance';
import { newGame } from './testkit';
import { K } from './util';

const round = roundRupees;

describe('month close: order (MECHANICS §1.1)', () => {
  it('automatic deductions come before the plan', () => {
    const g = newGame().lesson('a', 3, ['rd']).plan({ startRd: { instalment: 1500, months: 6 } });
    g.do({ type: 'ADD_WANT', want: { name: 'Speaker', price: 4500, kind: 'item' } });
    g.lesson('b', 0);
    // Wallet ₹5,500. The ₹1,500 instalment goes first, leaving ₹4,000: not enough for the ₹4,500 speaker.
    const fx = g.do({ type: 'PLAN_MONTH', plan: { buyWants: ['w1'] } });
    expect(g.state.rds[0]!.paidMonths).toBe(2);
    expect(g.state.wants[0]!.status).toBe('open');
    expect(g.state.buckets.wallet).toBe(4000);
    expect(fx).toContainEqual({ kind: 'note', key: K.cannotAfford, params: { amount: 500 } });
  });

  it('interest comes after the plan, and the month counter moves last', () => {
    const g = newGame().lesson('a', 3, ['savings']).plan({ toBuckets: { savings: 4000 } });
    // 3% a year = 0.25% a month on the ₹4,000 that the plan just moved in.
    expect(g.state.buckets.savings).toBeCloseTo(4010, 6);
    expect(g.state.month).toBe(2);
    expect(g.state.awaitingPlan).toBe(false);
    expect(g.state.history).toEqual([{ month: 1, income: 5000, saved: expect.closeTo(4010, 6), emis: 0, missedPayments: 0 }]);
  });

  it('events are queued after the month closes for their sub-section', () => {
    const g = newGame([
      {
        id: 'e1_1',
        level: 1,
        kind: 'life',
        after: '1.4',
        titleKey: 'event.e1_1.title',
        introKey: 'event.e1_1.intro',
        choices: [
          { id: 'a', labelKey: 'event.e1_1.a.label', verdict: 'good', outcomeKey: 'event.e1_1.a.outcome', whyKey: 'event.e1_1.a.why' },
          { id: 'b', labelKey: 'event.e1_1.b.label', verdict: 'bad', outcomeKey: 'event.e1_1.b.outcome', whyKey: 'event.e1_1.b.why' },
        ],
      },
    ]);
    g.lesson('1.3').plan();
    expect(g.state.pendingEvents).toEqual([]);
    g.lesson('1.4');
    expect(g.state.pendingEvents).toEqual([]);
    const fx = g.do({ type: 'PLAN_MONTH', plan: {} });
    expect(g.state.pendingEvents).toEqual(['e1_1']);
    expect(fx).toContainEqual({ kind: 'eventQueued', eventId: 'e1_1' });
  });
});

describe('shortfall rule (MECHANICS §1.1)', () => {
  it('pays from the wallet first, then savings', () => {
    const g = newGame().lesson('a', 3, ['savings', 'rd']).plan({ startRd: { instalment: 3000, months: 6 }, toBuckets: { savings: 2000 } });
    g.do({ type: 'ADD_WANT', want: { name: 'Fest', price: 1000, kind: 'experience' } });
    g.lesson('b', 0);
    g.do({ type: 'MOVE_MONEY', from: 'wallet', to: 'savings', amount: 1000 });
    // Wallet ₹1,000, savings ₹3,005. The ₹3,000 instalment takes all of the wallet, then savings.
    g.plan();
    expect(g.state.rds[0]).toMatchObject({ paidMonths: 2, missedMonths: 0 });
    expect(g.state.buckets.wallet).toBe(0);
    expect(round(g.state.buckets.savings)).toBe(round((2000 * 1.0025 + 1000 - 2000) * 1.0025));
  });

  it('a missed RD instalment costs the ₹50 fee and is never a game-over', () => {
    const g = newGame().lesson('a', 3, ['rd', 'emergency']).plan({ startRd: { instalment: 3000, months: 6 }, toBuckets: { emergency: 2000 } });
    g.lesson('b', 0);
    const fx = g.do({ type: 'PLAN_MONTH', plan: {} });
    // Wallet ₹2,000 cannot cover ₹3,000, and the emergency fund is not touched automatically.
    expect(fx).toContainEqual({ kind: 'missedPayment', labelKey: K.missedRd, fee: economy.rd.missedInstalmentFee });
    expect(g.state.rds[0]).toMatchObject({ paidMonths: 1, missedMonths: 1, status: 'active' });
    expect(g.state.buckets.rd).toBe(3000 - 50);
    expect(g.state.buckets.wallet).toBe(2000);
    expect(g.state.history[1]!.missedPayments).toBe(1);
    expect(g.state.month).toBe(3);
  });

  it('a missed SIP is simply skipped', () => {
    const g = newGame().lesson('a', 3, ['mf', 'emergency']).plan({ sip: { monthly: 3000 }, toBuckets: { emergency: 2000 } });
    expect(g.state.holdings.mf.invested).toBe(3000);
    g.lesson('b', 0).plan();
    expect(g.state.holdings.mf.invested).toBe(3000);
    expect(g.state.sip).toMatchObject({ active: true, pausedMonths: 1 });
  });
});

describe('deposits (MECHANICS §3) reproduce the [CALC] figures', () => {
  it('FD: ₹6,000 for 6 months at 6.5% → ₹6,195', () => {
    const g = newGame().lesson('a', 3, ['savings', 'fd']).plan();
    g.lesson('b').plan({ openFd: { principal: 6000, months: 6 } });
    expect(g.state.buckets.fd).toBe(6000);
    g.months(4);
    expect(g.state.fds[0]!.status).toBe('active');
    g.lesson('c', 0);
    const wallet = g.state.buckets.wallet;
    g.plan();
    expect(g.state.fds[0]!.status).toBe('matured');
    expect(g.state.buckets.fd).toBe(0);
    expect(round(g.state.buckets.savings)).toBe(6195);
    expect(g.state.buckets.savings).toBeCloseTo(fdMaturity(6000, economy.rates.fdPa, 6), 6);
    expect(g.state.buckets.wallet).toBe(wallet);
  });

  it('FD broken early: principal back with interest only at 3%', () => {
    const g = newGame().lesson('a', 3, ['savings', 'fd']).plan();
    g.lesson('b').plan({ openFd: { principal: 6000, months: 12 } });
    g.months(2);
    g.do({ type: 'BREAK_FD', fdId: 'fd1' });
    // Held for 3 month closes: 6,000 × 3% × 3/12 = ₹45.
    expect(g.state.buckets.savings).toBeCloseTo(6045, 6);
    expect(g.state.fds[0]!.status).toBe('brokenEarly');
    expect(g.state.buckets.fd).toBe(0);
  });

  it('RD: ₹500 × 6 months at 6.5% ≈ ₹3,057', () => {
    const g = newGame().lesson('a', 3, ['savings', 'rd']).plan({ startRd: { instalment: 500, months: 6 } });
    g.months(4);
    expect(g.state.rds[0]).toMatchObject({ paidMonths: 5, status: 'active' });
    expect(g.state.buckets.rd).toBe(2500);
    g.months(1);
    expect(g.state.rds[0]).toMatchObject({ paidMonths: 6, status: 'matured' });
    expect(g.state.buckets.rd).toBe(0);
    expect(round(g.state.buckets.savings)).toBe(3057);
    expect(g.state.buckets.savings).toBeCloseTo(rdMaturity(500, economy.rates.rdPa, 6), 6);
    expect(g.state.milestones).toContain('firstRdMatured');
  });

  it('RD closed early: interest drops to the savings rate', () => {
    const g = newGame().lesson('a', 3, ['savings', 'rd']).plan({ startRd: { instalment: 500, months: 12 } });
    g.months(2);
    g.do({ type: 'CLOSE_RD', rdId: 'rd1' });
    expect(g.state.buckets.savings).toBeCloseTo(rdMaturity(500, economy.rates.earlyClosurePa, 3), 6);
    expect(g.state.rds[0]!.status).toBe('closedEarly');
  });

  it('only offered tenures that finish inside the game can be opened', () => {
    const g = newGame().lesson('a', 3, ['fd', 'rd']);
    g.plan({ openFd: { principal: 1000, months: 5 }, startRd: { instalment: 500, months: 7 } });
    expect(g.state.fds).toHaveLength(0);
    expect(g.state.rds).toHaveLength(0);
    g.months(economy.clock.totalSubSections - 12);
    g.lesson('z');
    const fx = g.do({ type: 'PLAN_MONTH', plan: { openFd: { principal: 1000, months: 12 } } });
    expect(g.state.fds).toHaveLength(0);
    expect(fx).toContainEqual({ kind: 'note', key: K.maturesAfterGameEnds, params: { months: 12 } });
  });
});

describe('things I own lose value (MECHANICS §3)', () => {
  it('a ₹6,000 phone at 30% a year ≈ ₹5,020 after 6 months', () => {
    const g = newGame().lesson('a').plan().lesson('b');
    g.do({ type: 'ADD_WANT', want: { name: 'Phone', price: 6000, kind: 'item', category: 'phone' } });
    g.plan({ buyWants: ['w1'] }).months(5);
    expect(round(g.state.possessions[0]!.value)).toBe(5020);
    expect(g.engine.netWorth(g.state)).toBe(round(g.state.buckets.wallet + g.state.possessions[0]!.value));
  });
});

describe('savings accounts', () => {
  it('the emergency fund earns the savings rate', () => {
    const g = newGame().lesson('a', 3, ['emergency']).plan({ toBuckets: { emergency: 3000 } });
    expect(g.state.buckets.emergency).toBeCloseTo(3000 * 1.0025, 6);
    expect(g.engine.monthsCovered(g.state)).toBeCloseTo(1.0025, 6);
  });

  it('account B pays more but charges a fee each quarter under its minimum', () => {
    const g = newGame().lesson('a', 3, ['savings']);
    g.state = { ...g.state, savingsAccount: 'B' };
    g.plan({ toBuckets: { savings: 4000 } });
    expect(g.state.buckets.savings).toBeCloseTo(4000 * (1 + 3.5 / 1200), 6);
    g.months(1);
    const before = g.state.buckets.savings;
    g.months(1);
    expect(g.state.buckets.savings).toBeCloseTo(before * (1 + 3.5 / 1200) - economy.accountB.feePerQuarter, 6);
  });
});

describe('the month log feeds the Health Score', () => {
  it('saved = this month’s change in everything saved or invested', () => {
    const g = newGame().lesson('a', 3, ['savings', 'mf']);
    g.do({ type: 'ADD_GOAL', name: 'Bag', amount: 3000, deadlineMonth: 9 });
    g.plan({ toBuckets: { savings: 1000, mf: 1000 }, earmark: { g1: 500 } });
    expect(g.state.history[0]!.saved).toBeCloseTo(2500 + 2.5, 6);
    g.lesson('b', 0);
    g.do({ type: 'WITHDRAW', from: 'savings', amount: 600 });
    g.plan();
    expect(g.state.history[1]!.saved).toBeLessThan(0);
  });
});
