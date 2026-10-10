import { describe, expect, it } from 'vitest';
import { economy } from '@/core/economy.config';
import { initialGameState } from '@/core/state';
import type { GameState, MonthLog } from '@/core/types';
import { health, netWorth } from './selectors';
import { newGame } from './testkit';
import { K } from './util';

const base = (): GameState => initialGameState();
const log = (over: Partial<MonthLog>): MonthLog => ({ month: 1, income: 4000, saved: 0, emis: 0, missedPayments: 0, ...over });
const withLogs = (...logs: Array<Partial<MonthLog>>): GameState => ({ ...base(), history: logs.map(log) });
const withBuckets = (buckets: Partial<GameState['buckets']>): GameState => ({ ...base(), buckets: { ...base().buckets, ...buckets } });

describe('Money Health Score (MECHANICS §4): bands at each boundary', () => {
  it('a new game scores 30: no debt (20) and no alerts seen yet (10)', () => {
    const h = health(base());
    expect(h).toMatchObject({
      total: 30,
      savingsRate: { points: 0, value: 0 },
      emergency: { points: 0, value: 0 },
      diversification: { points: 0, value: 0 },
      debtLoad: { points: 20, value: 0 },
      scamSafety: { points: 10, value: 0 },
    });
  });

  it.each([
    [4.9, 0],
    [5, 10],
    [19.9, 10],
    [20, 20],
    [60, 20],
  ])('savings rate %d%% → %d points', (pct, points) => {
    expect(health(withLogs({ saved: (4000 * pct) / 100 })).savingsRate.points).toBe(points);
  });

  it('savings rate is the average of the last 3 closed months; a month of dipping in counts as 0', () => {
    const s = withLogs({ saved: 4000 }, { saved: 400 }, { saved: -900 }, { saved: 800 });
    // Last three: 10%, 0%, 20% → 10%.
    expect(health(s).savingsRate).toEqual({ points: 10, value: 10 });
  });

  it.each([
    [2999, 0],
    [3000, 10],
    [8999, 10],
    [9000, 20],
  ])('emergency fund ₹%d → %d points', (emergency, points) => {
    expect(health(withBuckets({ emergency })).emergency.points).toBe(points);
  });

  it.each([
    [{ savings: 1000 }, 1, 0],
    [{ savings: 1000, gold: 1000 }, 2, 10],
    [{ fd: 1000, gold: 1000, mf: 1000 }, 3, 20],
    [{ rd: 1000, gold: 1000, mf: 1000, shares: 1000 }, 4, 20],
    // Under a tenth of the total does not count as a kind.
    [{ savings: 9100, gold: 900 }, 1, 0],
    [{ savings: 9000, gold: 1000 }, 2, 10],
    // Savings, RD and FD are one kind together; the emergency fund is not an investment.
    [{ savings: 1000, rd: 1000, fd: 1000, emergency: 5000 }, 1, 0],
  ])('diversification %j → %d kind(s), %d points', (buckets, kinds, points) => {
    expect(health(withBuckets(buckets)).diversification).toEqual({ points, value: kinds });
  });

  it.each([
    [14.9, 20],
    [15, 10],
    [40, 10],
    [40.1, 0],
  ])('debt load %d%% of M → %d points', (pct, points) => {
    expect(health(withLogs({ emis: (4000 * pct) / 100 })).debtLoad.points).toBe(points);
  });

  it.each([
    [0, 0, 10],
    [10, 4, 0],
    [10, 5, 10],
    [10, 7, 10],
    [10, 8, 20],
    [1, 1, 20],
  ])('scam safety: %d seen, %d handled correctly → %d points', (seen, correct, points) => {
    expect(health({ ...base(), shield: { seen, correct } }).scamSafety.points).toBe(points);
  });

  it('a full score is 100', () => {
    const s: GameState = {
      ...withBuckets({ emergency: 9000, savings: 3000, gold: 3000, mf: 3000 }),
      history: [log({ saved: 2000, emis: 100 })],
      shield: { seen: 5, correct: 5 },
    };
    expect(health(s)).toMatchObject({ total: 100, nextMoveKey: K.healthNextAllGood });
  });
});

describe('"next best move" hint', () => {
  it('starts with the safety net and says how many rupees are missing', () => {
    expect(health(withBuckets({ emergency: 1800 }))).toMatchObject({
      nextMoveKey: K.healthNextEmergency,
      nextMoveParams: { amount: 1200, months: 1 },
    });
  });

  it('moves to the next weakest input once the first is at full marks', () => {
    const s: GameState = { ...withBuckets({ emergency: 9000 }), history: [log({ saved: 100 })] };
    expect(health(s)).toMatchObject({ nextMoveKey: K.healthNextSavingsRate, nextMoveParams: { target: economy.health.savingsRatePct.low } });
  });
});

describe('net worth (MECHANICS §3)', () => {
  it('= every bucket + things I own − what is owed, in whole rupees', () => {
    const g = newGame().lesson('a', 3, ['savings', 'gold']).plan().lesson('b');
    g.do({ type: 'ADD_WANT', want: { name: 'Bike', price: 4000, kind: 'item', category: 'bike' } });
    g.do({ type: 'APPLY_LOAN', terms: { kind: 'bank', principal: 3000, months: 6 } });
    g.do({ type: 'BUY_GOLD', amount: 1000, form: 'physical' });
    g.plan({ buyWants: ['w1'], toBuckets: { savings: 2000 } });
    const s = g.state;
    const expected = Object.values(s.buckets).reduce((a, b) => a + b, 0) + s.possessions[0]!.value - s.loans[0]!.remaining;
    expect(netWorth(s)).toBe(Math.round(expected));
    expect(Number.isInteger(netWorth(s))).toBe(true);
  });

  it('the example from lesson 1.4: ₹60,000 of assets − ₹10,000 owed = ₹50,000', () => {
    const s: GameState = {
      ...withBuckets({ savings: 20000, gold: 40000 }),
      loans: [{ id: 'l1', kind: 'bank', principal: 10000, ratePa: 14, months: 9, emi: 1177, paidMonths: 0, missedMonths: 0, remaining: 10000, startedMonth: 1, status: 'active' }],
    };
    expect(netWorth(s)).toBe(50000);
  });
});
