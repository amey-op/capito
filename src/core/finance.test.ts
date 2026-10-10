import { describe, expect, it } from 'vitest';
import { economy } from './economy.config';
import * as f from './finance';

const near = (actual: number, expected: number, tol = 1) => expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tol);

describe('SIP (start-of-month payments)', () => {
  it('matches the Finvitals check: ₹10,000 × 15 y at 10% ≈ ₹41.79 lakh', () => {
    near(f.sipFutureValue(10000, 10, 180) / 1e5, 41.79, 0.01);
  });
  it('₹500 a month at 12%: 10 y ≈ ₹1.16 L, 20 y ≈ ₹5.0 L, 30 y ≈ ₹17.6 L', () => {
    near(f.sipFutureValue(500, 12, 120) / 1e5, 1.16, 0.01);
    near(f.sipFutureValue(500, 12, 240) / 1e5, 5.0, 0.01);
    near(f.sipFutureValue(500, 12, 360) / 1e5, 17.6, 0.05);
  });
  it('fee gap: ₹5,000 × 20 y at 12% vs 11% ≈ ₹49.96 L vs ₹43.67 L (gap ≈ ₹6.3 L)', () => {
    const a = f.sipFutureValue(5000, 12, 240);
    const b = f.sipFutureValue(5000, 11, 240);
    near(a / 1e5, 49.96, 0.01);
    near(b / 1e5, 43.67, 0.02);
    near((a - b) / 1e5, 6.3, 0.05);
  });
  it('same ₹10k: 30 y vs 20 y ≈ 3.5×; the false claim (₹10k×30 y vs ₹20k×20 y) is only ≈ 1.8×', () => {
    const thirty = f.sipFutureValue(10000, 12, 360);
    near(thirty / f.sipFutureValue(10000, 12, 240), 3.5, 0.05);
    near(thirty / 1e7, 3.5, 0.05); // ≈ ₹3.50 crore
    near(thirty / f.sipFutureValue(20000, 12, 240), 1.8, 0.05);
  });
  it('handles 0% and 0 months without NaN', () => {
    expect(f.sipFutureValue(500, 0, 12)).toBe(6000);
    expect(f.sipFutureValue(500, 12, 0)).toBe(0);
    expect(f.goalSipMonthly(1000, 0, 0)).toBe(0);
  });
  it('series and totals agree', () => {
    const s = f.sipSeries(500, 12, 10);
    expect(s).toHaveLength(11);
    near(s[10]!.value, f.sipFutureValue(500, 12, 120), 0.001);
    const t = f.sipTotals(500, 12, 120);
    expect(t.invested).toBe(60000);
    near(t.returns + t.invested, t.value, 0.001);
  });
  it('goal SIP inverts the SIP formula', () => {
    near(f.sipFutureValue(f.goalSipMonthly(100000, 12, 60), 12, 60), 100000, 0.01);
  });
});

describe('interest, inflation, rules of thumb', () => {
  it('₹1,000 at 10% for 20 y: simple ₹3,000, compound ≈ ₹6,727', () => {
    expect(f.simpleInterestTotal(1000, 10, 20)).toBe(3000);
    near(f.lumpsumFutureValue(1000, 10, 20), 6727, 1);
  });
  it('Rule of 72: 8% → 9 y, 6% → 12 y; Rule of 70', () => {
    expect(f.ruleOf72(8)).toBe(9);
    expect(f.ruleOf72(6)).toBe(12);
    expect(f.ruleOf70(7)).toBe(10);
    expect(f.ruleOf72(0)).toBe(Infinity);
  });
  it('inflation: ₹10 L at 7% for 10 y ≈ ₹5.08 L of buying power; samosa ₹15 → ≈ ₹26.86', () => {
    near(f.purchasingPower(1_000_000, 7, 10) / 1e5, 5.08, 0.01);
    near(f.futurePrice(15, 6, 10), 26.86, 0.01);
    expect(f.realReturnPct(6.5, 6)).toBeCloseTo(0.5);
  });
});

describe('deposits', () => {
  it('FD ₹6,000 × 6 months at 6.5% → ₹6,195', () => {
    expect(f.roundRupees(f.fdMaturity(6000, 6.5, 6))).toBe(6195);
    expect(f.fdMaturity(6000, economy.rates.fdPa, 6)).toBeCloseTo(6195, 6);
  });
  it('FD broken early earns only the early-closure rate', () => {
    expect(f.fdEarlyBreak(6000, 2)).toBeCloseTo(6000 * (1 + 0.03 * (2 / 12)), 6);
  });
  it('RD ₹500 × 6 at 6.5% ≈ ₹3,057', () => {
    expect(f.roundRupees(f.rdMaturity(500, 6.5, 6))).toBe(3057);
  });
  it('savings account: 3% p.a. → +0.25% a month', () => {
    expect(f.savingsMonthInterest(1000)).toBeCloseTo(2.5, 6);
  });
});

describe('borrowing', () => {
  it('EMI ₹6,000 × 6 months: 14% → ₹1,041, 18% → ₹1,053, 22% → ₹1,065', () => {
    expect(f.roundRupees(f.emi(6000, 14, 6))).toBe(1041);
    expect(f.roundRupees(f.emi(6000, 18, 6))).toBe(1053);
    expect(f.roundRupees(f.emi(6000, 22, 6))).toBe(1065);
  });
  it('loan totals at 18%: total ≈ ₹6,319, extra ≈ ₹319', () => {
    const t = f.loanTotals(6000, 18, 6, 5500);
    expect(f.roundRupees(t.totalPaid)).toBe(6319);
    expect(f.roundRupees(t.extra)).toBe(319);
    expect(f.roundRupees(t.extraVsCash!)).toBe(819);
  });
  it('0% EMI is principal ÷ months; bad inputs give 0', () => {
    expect(f.emi(6000, 0, 6)).toBe(1000);
    expect(f.emi(0, 18, 6)).toBe(0);
    expect(f.emi(6000, 18, 0)).toBe(0);
  });
  it('flat 9% for a year ≈ 16% effective', () => {
    const eff = f.flatToEffectiveRate(9, 12);
    expect(eff).toBeGreaterThan(15.5);
    expect(eff).toBeLessThan(16.8);
  });
  it('loan app: ₹2,700 received, ₹3,900 repaid, ₹1,200 cost ≈ 44%', () => {
    const c = f.loanAppCost();
    expect(c.received).toBe(2700);
    expect(c.repay).toBe(3900);
    expect(c.cost).toBe(1200);
    near(c.costPctOfReceived, 44, 0.5);
  });
  it('credit offers follow the table', () => {
    expect(f.creditOffer(760)).toMatchObject({ maxAmount: 10000, ratePa: 14 });
    expect(f.creditOffer(749)).toMatchObject({ maxAmount: 8000, ratePa: 18 });
    expect(f.creditOffer(650)).toMatchObject({ maxAmount: 6000, ratePa: 22 });
    expect(f.creditOffer(600)).toMatchObject({ maxAmount: 3000, ratePa: 26 });
    expect(f.creditOffer(599)).toBeNull();
  });
});

describe('value over time, small spends, gold', () => {
  it('₹6,000 phone at 30%/yr ≈ ₹5,020 after 6 months', () => {
    expect(f.roundRupees(f.depreciatedValue(6000, 30, 6))).toBe(5020);
    expect(f.depreciatedValue(6000, 30, 12)).toBeCloseTo(4200, 6);
  });
  it('leak finder: ₹40/day = ₹14,600; ₹100/week = ₹5,200; ₹0 = 0', () => {
    expect(f.leakPerYear(40)).toBe(14600);
    expect(f.leakPerYear(100, 52)).toBe(5200);
    expect(f.leakPerYear(0)).toBe(0);
  });
  it('gold: ₹3,000 physical (8%) → ₹2,760; ETF (0.5%) → ₹2,985', () => {
    expect(f.valueAfterCost(3000, economy.gold.physicalMakingChargePct)).toBeCloseTo(2760, 6);
    expect(f.valueAfterCost(3000, economy.gold.etfCostPct)).toBeCloseTo(2985, 6);
  });
  it('goal saving: ₹3,000 in 6 months = ₹500 a month', () => {
    expect(f.goalSavingMonthly(3000, 6)).toBe(500);
  });
  it('net worth example: ₹60,000 − ₹10,000 = ₹50,000 (sanity)', () => {
    expect(60000 - 10000).toBe(50000);
  });
});

describe('tax slabs (verified:false, dated config)', () => {
  const { slabs, rebateUpTo } = economy.taxSlabs;
  it('₹6,000 tuition income owes nothing', () => {
    expect(f.slabTax(6000, slabs, rebateUpTo)).toBe(0);
  });
  it('rebate makes taxable income up to ₹12 L tax-free', () => {
    expect(f.slabTax(1_200_000, slabs, rebateUpTo)).toBe(0);
    expect(f.slabTax(1_000_000, slabs, 0)).toBe(40000); // without the rebate: 20k + 20k
  });
  it('higher rate applies only to the part above each limit', () => {
    expect(f.slabTax(1_600_000, slabs, rebateUpTo)).toBe(120000); // 20k + 40k + 60k
    expect(f.slabTax(2_500_000, slabs, rebateUpTo)).toBe(330000); // …+80k+100k+30k
  });
  it('salaried standard deduction is applied before slabs', () => {
    expect(f.slabTaxFromConfig(1_275_000, true)).toBe(0);
  });
  it('config is flagged unverified', () => {
    expect(economy.taxSlabs.verified).toBe(false);
  });
  it('take-home (approximate)', () => {
    expect(f.takeHome(8000, 12)).toBe(7040);
  });
});

describe('game money', () => {
  it('payout: ₹2,000 + ₹1,000 per correct answer', () => {
    expect(f.quizPayout(0)).toBe(2000);
    expect(f.quizPayout(3)).toBe(5000);
    expect(f.quizPayout(9)).toBe(5000);
  });
  it('retry pays only the improvement', () => {
    expect(f.retryBonus(1, 3)).toBe(2000);
    expect(f.retryBonus(3, 2)).toBe(0);
    expect(f.retryBonus(2, 2)).toBe(0);
  });
  it('60/40 split: ₹4,000 → ₹2,400 wants, ₹1,600 savings', () => {
    expect(f.defaultSplit(4000)).toEqual({ wants: 2400, savings: 1600 });
  });
  it('months covered against the ₹3,000 reference need', () => {
    expect(f.monthsCovered(9000)).toBe(3);
  });
});

describe('market config (story calendar)', () => {
  it('each wiggle pattern sums to 0 so drift is exact over 12 months', () => {
    for (const pattern of Object.values(economy.market.wigglePct)) {
      expect(Math.abs(pattern.reduce((a: number, b: number) => a + b, 0))).toBeLessThan(1e-9);
      expect(pattern).toHaveLength(12);
    }
  });
  it('crash: MF ≈ −19% after 2 months and ≈ −3% overall; shares ≈ −23%', () => {
    const { mf, shares } = economy.market.episodes.crash;
    near(f.applyPctSteps(100, mf.slice(0, 2)), 81, 0.01);
    near(f.applyPctSteps(100, mf), 96.7, 0.1);
    near(f.applyPctSteps(100, shares.slice(0, 2)), 76.6, 0.1);
  });
  it('tip pump nets ≈ −31%', () => {
    near(f.applyPctSteps(100, economy.market.episodes.tipPump.tipStock), 69, 0.01);
  });
});
