/**
 * Read-only views of the state: net worth, months covered and the Money Health Score
 * (MECHANICS §3 and §4). Rounded here, at the boundary; the ledger keeps full precision.
 */
import { economy } from '@/core/economy.config';
import { monthsCovered as coveredFor, roundRupees } from '@/core/finance';
import type { GameState, HealthBreakdown, HealthInput, MonthLog } from '@/core/types';
import { totalOwed } from './credit';
import { earmarked } from './ledger';
import { K } from './util';

const h = economy.health;
const round1 = (n: number): number => Math.round(n * 10) / 10;

/** Net worth = every bucket + things I own − what is owed. */
export function netWorth(s: GameState): number {
  const buckets = Object.values(s.buckets).reduce((a, b) => a + b, 0);
  const things = s.possessions.reduce((a, p) => a + p.value, 0);
  return roundRupees(buckets + things - totalOwed(s));
}

export const monthsCovered = (s: GameState): number => coveredFor(s.buckets.emergency);

/**
 * Everything that counts as "saved or invested": savings, emergency fund, deposits, money put
 * into market holdings, and goal earmarks. A month's `saved` in the log is the change in this pool.
 */
export function savedPool(s: GameState): number {
  const invested = Object.values(s.holdings).reduce((a, x) => a + x.invested, 0);
  return s.buckets.savings + s.buckets.emergency + s.buckets.rd + s.buckets.fd + invested + earmarked(s);
}

/** Closed months used for the 3-month averages. */
const recentLogs = (s: GameState): MonthLog[] => s.history.slice(-h.averageOverMonths);

const averageShare = (logs: MonthLog[], part: (m: MonthLog) => number): number => {
  const usable = logs.filter((m) => m.income > 0);
  if (usable.length === 0) return 0;
  return (usable.reduce((a, m) => a + part(m) / m.income, 0) / usable.length) * 100;
};

/** Higher is better: 0 below `low`, 20 from `high` up, 10 in between. */
const bandUp = (value: number, low: number, high: number): HealthInput['points'] =>
  value >= high ? h.pointsPerInput : value >= low ? h.midPoints : 0;

/** How many kinds of investment each hold at least 10% of all investments. */
export function investmentTypes(s: GameState): number {
  const kinds = [s.buckets.savings + s.buckets.rd + s.buckets.fd, s.buckets.gold, s.buckets.mf, s.buckets.shares];
  const total = kinds.reduce((a, b) => a + b, 0);
  if (total <= 0) return 0;
  return kinds.filter((k) => (k / total) * 100 >= h.diversification.minShareOfInvestmentsPct).length;
}

export function health(s: GameState): HealthBreakdown {
  const logs = recentLogs(s);

  const savingsPct = averageShare(logs, (m) => Math.max(0, m.saved));
  const savingsRate: HealthInput = { points: bandUp(savingsPct, h.savingsRatePct.low, h.savingsRatePct.high), value: round1(savingsPct) };

  const months = monthsCovered(s);
  const emergency: HealthInput = { points: bandUp(months, h.emergencyMonths.low, h.emergencyMonths.high), value: round1(months) };

  const types = investmentTypes(s);
  const diversification: HealthInput = { points: bandUp(types, h.diversification.low, h.diversification.high), value: types };

  const debtPct = averageShare(logs, (m) => m.emis);
  const debtLoad: HealthInput = {
    points: debtPct > h.debtLoadPct.high ? 0 : debtPct >= h.debtLoadPct.low ? h.midPoints : h.pointsPerInput,
    value: round1(debtPct),
  };

  const scamPct = s.shield.seen > 0 ? (s.shield.correct / s.shield.seen) * 100 : 0;
  const scamSafety: HealthInput = {
    points: s.shield.seen === 0 ? h.scamSafetyPct.beforeAnyAlert : bandUp(scamPct, h.scamSafetyPct.low, h.scamSafetyPct.high),
    value: round1(scamPct),
  };

  const total = savingsRate.points + emergency.points + diversification.points + debtLoad.points + scamSafety.points;
  return { total, savingsRate, emergency, diversification, debtLoad, scamSafety, ...nextMove(s, { savingsRate, emergency, diversification, debtLoad, scamSafety }) };
}

/** The one-line "next best move": the weakest input, safety net first. */
function nextMove(
  s: GameState,
  inputs: Record<'savingsRate' | 'emergency' | 'diversification' | 'debtLoad' | 'scamSafety', HealthInput>,
): Pick<HealthBreakdown, 'nextMoveKey' | 'nextMoveParams'> {
  const order = ['emergency', 'savingsRate', 'debtLoad', 'scamSafety', 'diversification'] as const;
  const lowest = Math.min(...order.map((k) => inputs[k].points));
  if (lowest >= h.pointsPerInput) return { nextMoveKey: K.healthNextAllGood };
  const weakest = order.find((k) => inputs[k].points === lowest)!;
  switch (weakest) {
    case 'emergency': {
      const targetMonths = inputs.emergency.points === 0 ? h.emergencyMonths.low : h.emergencyMonths.high;
      const amount = roundRupees(Math.max(0, targetMonths * economy.referenceMonthlyNeed - s.buckets.emergency));
      return { nextMoveKey: K.healthNextEmergency, nextMoveParams: { amount, months: targetMonths } };
    }
    case 'savingsRate': {
      const target = inputs.savingsRate.points === 0 ? h.savingsRatePct.low : h.savingsRatePct.high;
      return { nextMoveKey: K.healthNextSavingsRate, nextMoveParams: { target } };
    }
    case 'debtLoad':
      return { nextMoveKey: K.healthNextDebtLoad, nextMoveParams: { target: h.debtLoadPct.low } };
    case 'scamSafety':
      return { nextMoveKey: K.healthNextScamSafety, nextMoveParams: { target: h.scamSafetyPct.high } };
    case 'diversification':
      return { nextMoveKey: K.healthNextDiversification, nextMoveParams: { target: h.diversification.high } };
  }
}
