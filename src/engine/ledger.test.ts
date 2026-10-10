import { describe, expect, it } from 'vitest';
import { merged } from '@/content/i18n';
import type { Action } from '@/core/types';
import { newGame } from './testkit';
import { ENGINE_KEYS } from './util';

describe('money in (MECHANICS §1)', () => {
  it('pays ₹2,000 to ₹5,000 by quiz score', () => {
    for (const [correct, pay] of [[0, 2000], [1, 3000], [2, 4000], [3, 5000]] as const) {
      expect(newGame().lesson('1.1', correct).state.buckets.wallet).toBe(pay);
    }
  });

  it('a retry pays only the improvement, never advances the month and never unlocks again', () => {
    const g = newGame().lesson('1.1', 1, ['myWants']);
    g.lesson('1.1', 3, ['savings']);
    expect(g.state.buckets.wallet).toBe(5000);
    expect(g.state.unlocked).not.toContain('savings');
    g.lesson('1.1', 0);
    expect(g.state.buckets.wallet).toBe(5000);
    expect(g.state.month).toBe(1);
    expect(g.state.progress['1.1']).toMatchObject({ firstAttemptCorrect: 1, bestCorrect: 3, attempts: 3 });
  });

  it('one sub-section is one month, even if Plan the Month was skipped', () => {
    const g = newGame().lesson('1.1').lesson('1.2');
    expect(g.state.month).toBe(2);
    expect(g.state.history).toHaveLength(1);
    expect(g.state.buckets.wallet).toBe(10000);
  });

  it('PLAN_MONTH does nothing unless a sub-section is waiting for its plan', () => {
    const g = newGame().plan();
    expect(g.state.month).toBe(1);
    g.lesson('1.1').plan().plan();
    expect(g.state.month).toBe(2);
  });

  it('the profile never changes money', () => {
    const g = newGame();
    g.do({ type: 'NEW_GAME', profile: { ageBand: '17-18', earns: 'earn', hasBankAccount: true } });
    expect(g.state.buckets.wallet).toBe(0);
    expect(g.lesson('1.1', 2).state.buckets.wallet).toBe(4000);
  });
});

describe('wants and goals (MECHANICS §1.2)', () => {
  it('an item want becomes a thing I own; an experience only raises Joy', () => {
    const g = newGame().lesson('1.1');
    g.do({ type: 'ADD_WANT', want: { name: 'Headphones', price: 1500, kind: 'item', category: 'other' } });
    g.do({ type: 'ADD_WANT', want: { name: 'Movie', price: 300, kind: 'experience' } });
    const joy = g.state.joy;
    g.plan({ buyWants: ['w1', 'w2'] });
    expect(g.state.buckets.wallet).toBe(5000 - 1800);
    expect(g.state.wants.map((w) => w.status)).toEqual(['bought', 'bought']);
    expect(g.state.possessions).toHaveLength(1);
    expect(g.state.possessions[0]).toMatchObject({ name: 'Headphones', cost: 1500 });
    expect(g.state.joy).toBe(joy + 2);
    expect(g.state.unlocked).toContain('possessions');
  });

  it('a want that costs more than the wallet is not bought', () => {
    const g = newGame().lesson('1.1', 0);
    g.do({ type: 'ADD_WANT', want: { name: 'Bike', price: 9000, kind: 'item', category: 'bike' } });
    g.plan({ buyWants: ['w1'] });
    expect(g.state.buckets.wallet).toBe(2000);
    expect(g.state.wants[0]!.status).toBe('open');
  });

  it('earmarked money stays in the wallet but cannot be spent on something else', () => {
    const g = newGame().lesson('1.1');
    g.do({ type: 'ADD_WANT', want: { name: 'Laptop bag', price: 3000, kind: 'item' } });
    g.do({ type: 'ADD_WANT', want: { name: 'Shoes', price: 4500, kind: 'item', category: 'sneakers' } });
    g.do({ type: 'PROMOTE_GOAL', wantId: 'w1', amount: 3000, deadlineMonth: 6 });
    g.plan({ earmark: { g1: 3000 } });
    expect(g.state.buckets.wallet).toBe(5000);
    expect(g.state.goals[0]).toMatchObject({ saved: 3000, status: 'met' });
    // Next month the wallet holds ₹7,000, but ₹3,000 is promised to the bag: only ₹4,000 is free.
    g.lesson('1.2', 0).plan({ buyWants: ['w2'] });
    expect(g.state.buckets.wallet).toBe(7000);
    expect(g.state.wants[1]!.status).toBe('open');
  });

  it('buying a goal uses its earmark', () => {
    const g = newGame().lesson('1.1');
    g.do({ type: 'ADD_WANT', want: { name: 'Laptop bag', price: 3000, kind: 'item' } });
    g.do({ type: 'PROMOTE_GOAL', wantId: 'w1', amount: 3000, deadlineMonth: 6 });
    g.plan({ earmark: { g1: 3000 } });
    g.lesson('1.2', 0).plan({ buyWants: ['w1'] });
    expect(g.state.buckets.wallet).toBe(4000);
    expect(g.state.goals[0]).toMatchObject({ saved: 0, status: 'met' });
  });

  it('a goal past its deadline is missed and can be extended', () => {
    const g = newGame().lesson('1.1');
    g.do({ type: 'ADD_GOAL', name: 'Trip', amount: 9000, deadlineMonth: 2 });
    g.plan({ earmark: { g1: 1000 } }).months(1);
    expect(g.state.goals[0]!.status).toBe('missed');
    g.do({ type: 'EXTEND_GOAL', goalId: 'g1', deadlineMonth: 8 });
    expect(g.state.goals[0]).toMatchObject({ status: 'active', deadlineMonth: 8, extendedTimes: 1 });
  });

  it('three goals earn the "goals set" milestone', () => {
    const g = newGame().lesson('1.1');
    for (const name of ['A', 'B', 'C']) g.do({ type: 'ADD_GOAL', name, amount: 1000, deadlineMonth: 9 });
    g.plan();
    expect(g.state.milestones).toEqual(expect.arrayContaining(['firstStep', 'goalsSet3']));
  });
});

describe('moving money', () => {
  it('moves between wallet, savings and emergency once they are unlocked', () => {
    const g = newGame().lesson('1.1', 3, ['savings']);
    g.do({ type: 'MOVE_MONEY', from: 'wallet', to: 'emergency', amount: 1000 });
    expect(g.state.buckets.emergency).toBe(0);
    g.do({ type: 'MOVE_MONEY', from: 'wallet', to: 'savings', amount: 9999 });
    expect(g.state.buckets).toMatchObject({ wallet: 0, savings: 5000 });
    g.do({ type: 'WITHDRAW', from: 'savings', amount: 1200 });
    expect(g.state.buckets).toMatchObject({ wallet: 1200, savings: 3800 });
  });

  it('never goes below ₹0 and ignores nonsense amounts', () => {
    const g = newGame().lesson('1.1', 0, ['savings']);
    for (const amount of [-50, Number.NaN, Number.POSITIVE_INFINITY, 0]) {
      g.do({ type: 'MOVE_MONEY', from: 'wallet', to: 'savings', amount });
    }
    expect(g.state.buckets).toMatchObject({ wallet: 2000, savings: 0 });
  });
});

describe('engine guarantees', () => {
  const actions: Action[] = [
    { type: 'COMPLETE_SUBSECTION', subSectionId: '1.1', quizCorrect: 3, unlocks: ['savings', 'rd', 'fd', 'gold', 'mf', 'shares'] },
    { type: 'ADD_WANT', want: { name: 'Phone', price: 2000, kind: 'item', category: 'phone' } },
    { type: 'PLAN_MONTH', plan: { buyWants: ['w1'], toBuckets: { savings: 1000 }, startRd: { instalment: 500, months: 6 } } },
    { type: 'COMPLETE_SUBSECTION', subSectionId: '1.2', quizCorrect: 2, unlocks: [] },
    { type: 'BUY_GOLD', amount: 1000, form: 'physical' },
    { type: 'INVEST', asset: 'mf', amount: 1000 },
    { type: 'APPLY_LOAN', terms: { kind: 'bank', principal: 3000, months: 6 } },
    { type: 'PLAN_MONTH', plan: { sip: { monthly: 300 } } },
    { type: 'COMPLETE_SUBSECTION', subSectionId: '1.3', quizCorrect: 1, unlocks: [] },
    { type: 'PLAN_MONTH', plan: {} },
  ];

  it('is deterministic: the same actions give the same state', () => {
    const run = () => {
      const g = newGame();
      actions.forEach((a) => g.do(a));
      return g.state;
    };
    expect(run()).toEqual(run());
  });

  it('never changes the state it was given', () => {
    const g = newGame();
    for (const a of actions) {
      const before = structuredClone(g.state);
      const given = g.state;
      g.do(a);
      expect(given).toEqual(before);
    }
  });

  it('keeps every balance at or above ₹0', () => {
    const g = newGame();
    for (const a of actions) {
      g.do(a);
      for (const v of Object.values(g.state.buckets)) expect(v).toBeGreaterThanOrEqual(0);
    }
  });

  it('every text key the engine can emit exists in portfolio.json', () => {
    const en = merged.resources.en ?? {};
    expect(ENGINE_KEYS.filter((k) => !(k in en))).toEqual([]);
  });
});
