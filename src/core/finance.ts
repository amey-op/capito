/**
 * Every money formula in the app. Pure functions, no rounding inside (round only for display
 * with `roundRupees` or format.ts). Rates are in percent per year unless the name says otherwise.
 * CONTRACT FILE: change only through a `contract-change` PR. Tests: finance.test.ts.
 */
import { economy } from './economy.config';

// ---------- helpers ----------

/** Monthly rate as a fraction: 12% p.a. → 0.01. */
export const monthlyRate = (ratePa: number): number => ratePa / 100 / 12;

/** Round to whole rupees (half away from zero). Use only at display or ledger boundaries. */
export const roundRupees = (amount: number): number => Math.sign(amount) * Math.round(Math.abs(amount));

/** Clamp a number into [min, max]. */
export const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

/** Apply a list of % steps in order: 100 with [10, -10] → 99. */
export const applyPctSteps = (value: number, stepsPct: readonly number[]): number =>
  stepsPct.reduce((v, pct) => v * (1 + pct / 100), value);

const finiteOr0 = (n: number): number => (Number.isFinite(n) ? n : 0);

// ---------- saving and investing ----------

/**
 * SIP future value with payments at the START of each month (matches the Finvitals check):
 * FV = P × ((1+i)^n − 1) / i × (1+i). With 0% it is simply P × n.
 */
export function sipFutureValue(monthly: number, ratePa: number, months: number): number {
  if (months <= 0 || monthly <= 0) return 0;
  const i = monthlyRate(ratePa);
  if (i === 0) return monthly * months;
  return monthly * ((Math.pow(1 + i, months) - 1) / i) * (1 + i);
}

export interface SipPoint {
  year: number;
  invested: number;
  value: number;
}

/** Year-by-year SIP series (year 0 … years) for charts. */
export function sipSeries(monthly: number, ratePa: number, years: number): SipPoint[] {
  const points: SipPoint[] = [];
  for (let y = 0; y <= Math.max(0, Math.floor(years)); y++) {
    points.push({ year: y, invested: monthly * 12 * y, value: sipFutureValue(monthly, ratePa, 12 * y) });
  }
  return points;
}

/** SIP totals: invested, returns (gain) and final value. */
export function sipTotals(monthly: number, ratePa: number, months: number) {
  const value = sipFutureValue(monthly, ratePa, months);
  const invested = Math.max(0, monthly) * Math.max(0, months);
  return { invested, returns: value - invested, value };
}

/** Lump sum compounded once a year: P × (1 + r)^years. */
export function lumpsumFutureValue(principal: number, ratePa: number, years: number): number {
  if (principal <= 0) return 0;
  return principal * Math.pow(1 + ratePa / 100, Math.max(0, years));
}

/** Simple interest total amount after `years`: P × (1 + r × t). */
export function simpleInterestTotal(principal: number, ratePa: number, years: number): number {
  return principal * (1 + (ratePa / 100) * Math.max(0, years));
}

/** Monthly SIP needed to reach `target` in `months` (start-of-month payments). */
export function goalSipMonthly(target: number, ratePa: number, months: number): number {
  if (target <= 0 || months <= 0) return 0;
  return target / sipFutureValue(1, ratePa, months);
}

/** Monthly saving with no returns: target ÷ months (₹3,000 in 6 months → ₹500). */
export function goalSavingMonthly(target: number, months: number): number {
  if (target <= 0 || months <= 0) return 0;
  return target / months;
}

// ---------- deposits (game rules: simple interest, see MECHANICS §3) ----------

/** FD maturity with simple interest for the tenure: ₹6,000 × 6 months at 6.5% → ₹6,195. */
export function fdMaturity(principal: number, ratePa: number, months: number): number {
  if (principal <= 0) return 0;
  return principal * (1 + (ratePa / 100) * (Math.max(0, months) / 12));
}

/** FD broken early: principal plus interest only at the early-closure rate for the months held. */
export function fdEarlyBreak(
  principal: number,
  monthsHeld: number,
  earlyRatePa: number = economy.rates.earlyClosurePa,
): number {
  return fdMaturity(principal, earlyRatePa, monthsHeld);
}

/**
 * RD maturity, simple monthly accrual: each instalment paid at the start of month k earns
 * interest for (n − k + 1) months. ₹500 × 6 at 6.5% ≈ ₹3,057.
 */
export function rdMaturity(instalment: number, ratePa: number, months: number): number {
  if (instalment <= 0 || months <= 0) return 0;
  const n = Math.floor(months);
  const monthsOfInterest = (n * (n + 1)) / 2;
  return instalment * n + instalment * monthlyRate(ratePa) * monthsOfInterest;
}

/** One month of savings-account interest: 3% p.a. → +0.25%. */
export const savingsMonthInterest = (balance: number, ratePa: number = economy.rates.savingsPa): number =>
  Math.max(0, balance) * monthlyRate(ratePa);

// ---------- borrowing ----------

/** Reducing-balance EMI: P × i × (1+i)^n / ((1+i)^n − 1). 0% → P ÷ n. */
export function emi(principal: number, ratePa: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  const i = monthlyRate(ratePa);
  if (i === 0) return principal / months;
  const f = Math.pow(1 + i, months);
  return (principal * i * f) / (f - 1);
}

/** EMI, total paid and the extra over the principal (optionally vs a cash price). */
export function loanTotals(principal: number, ratePa: number, months: number, cashPrice?: number) {
  const monthly = emi(principal, ratePa, months);
  const totalPaid = monthly * Math.max(0, months);
  return {
    emi: monthly,
    totalPaid,
    extra: totalPaid - principal,
    extraVsCash: cashPrice === undefined ? undefined : totalPaid - cashPrice,
  };
}

/**
 * Flat rate → effective yearly rate on the declining balance (solved by bisection).
 * "Flat 9% for a year" ≈ 16% a year.
 */
export function flatToEffectiveRate(flatPa: number, months: number): number {
  if (flatPa <= 0 || months <= 0) return 0;
  const principal = 1;
  const totalInterest = principal * (flatPa / 100) * (months / 12);
  const instalment = (principal + totalInterest) / months;
  let lo = 0;
  let hi = 5; // 500% a year is an upper bound for anything sane
  for (let k = 0; k < 200; k++) {
    const mid = (lo + hi) / 2;
    const e = emi(principal, mid * 100, months);
    if (e > instalment) hi = mid;
    else lo = mid;
  }
  return ((lo + hi) / 2) * 100;
}

/** Instant loan app: what you receive, what you repay, the cost and the cost as % of what you got. */
export function loanAppCost(amount: number = economy.credit.loanApp.maxAmount) {
  const app = economy.credit.loanApp;
  const received = amount * (1 - app.upfrontFeePct / 100);
  const repay = app.repay * (amount / app.maxAmount);
  const cost = repay - received;
  return { received, repay, cost, costPctOfReceived: (cost / received) * 100 };
}

// ---------- value over time ----------

/** Monthly depreciation factor = (1 − yearly loss)^(1/12). */
export const monthlyDepreciationFactor = (yearlyLossPct: number): number =>
  Math.pow(1 - clamp(yearlyLossPct, 0, 100) / 100, 1 / 12);

/** Value after `months`: ₹6,000 phone at 30%/yr after 6 months ≈ ₹5,020. */
export function depreciatedValue(cost: number, yearlyLossPct: number, months: number): number {
  if (cost <= 0) return 0;
  return cost * Math.pow(monthlyDepreciationFactor(yearlyLossPct), Math.max(0, months));
}

/** Today's buying power of `amount` after `years` of inflation: ₹10 L at 7% for 10 y ≈ ₹5.08 L. */
export function purchasingPower(amount: number, inflationPct: number, years: number): number {
  return amount / Math.pow(1 + inflationPct / 100, Math.max(0, years));
}

/** Future price of something that costs `amount` today: ₹15 samosa at 6% for 10 y ≈ ₹26.86. */
export function futurePrice(amount: number, inflationPct: number, years: number): number {
  return amount * Math.pow(1 + inflationPct / 100, Math.max(0, years));
}

/** Real return as taught in 5.1: return − inflation (percentage points). */
export const realReturnPct = (nominalPct: number, inflationPct: number): number => nominalPct - inflationPct;

/** Rule of 72: years to double. 8% → 9 years. */
export const ruleOf72 = (ratePct: number): number => (ratePct > 0 ? 72 / ratePct : Infinity);
/** Rule of 70: years for prices to double (or money to halve in value). */
export const ruleOf70 = (ratePct: number): number => (ratePct > 0 ? 70 / ratePct : Infinity);

// ---------- small spends, gold, tax ----------

/** Yearly cost of a small repeated spend: ₹40 × 365 = ₹14,600; ₹100 × 52 = ₹5,200. */
export const leakPerYear = (amount: number, timesPerYear = 365): number =>
  Math.max(0, amount) * Math.max(0, timesPerYear);

/** Value you hold after an upfront cost: ₹3,000 with 8% making → ₹2,760; with 0.5% → ₹2,985. */
export const valueAfterCost = (amount: number, costPct: number): number =>
  Math.max(0, amount) * (1 - clamp(costPct, 0, 100) / 100);

export interface Slab {
  upTo: number | null;
  ratePct: number;
}

/** Tax by slab on taxable income (the higher rate applies only to the part above each limit). */
export function slabTax(taxableIncome: number, slabs: readonly Slab[], rebateUpTo = 0): number {
  const income = Math.max(0, taxableIncome);
  if (income <= rebateUpTo) return 0;
  let tax = 0;
  let lower = 0;
  for (const s of slabs) {
    const upper = s.upTo ?? Infinity;
    if (income > lower) tax += (Math.min(income, upper) - lower) * (s.ratePct / 100);
    lower = upper;
    if (income <= upper) break;
  }
  return tax;
}

/** Tax with the dated config from economy.taxSlabs (verified:false → label as approximate). */
export function slabTaxFromConfig(grossIncome: number, salaried = false): number {
  const cfg = economy.taxSlabs;
  const taxable = Math.max(0, grossIncome - (salaried ? cfg.standardDeductionSalaried : 0));
  return slabTax(taxable, cfg.slabs, cfg.rebateUpTo);
}

/** Approximate take-home: gross − retirement contribution − monthly tax. */
export function takeHome(grossMonthly: number, retirementPct: number, taxMonthly = 0): number {
  return Math.max(0, grossMonthly - grossMonthly * (retirementPct / 100) - taxMonthly);
}

// ---------- game money ----------

/** Practice money for a first completion: ₹2,000 + ₹1,000 × correct (0–3). */
export function quizPayout(correct: number): number {
  const c = clamp(Math.floor(finiteOr0(correct)), 0, economy.money.quizQuestions);
  return economy.money.basePerSubSection + economy.money.bonusPerCorrect * c;
}

/** Retry pays only the improvement in bonus over the best so far (never negative). */
export function retryBonus(bestCorrect: number, newCorrect: number): number {
  const q = economy.money.quizQuestions;
  const best = clamp(Math.floor(finiteOr0(bestCorrect)), 0, q);
  const next = clamp(Math.floor(finiteOr0(newCorrect)), 0, q);
  return Math.max(0, next - best) * economy.money.bonusPerCorrect;
}

/** The default 60/40 split of monthly practice money. */
export function defaultSplit(monthly: number) {
  const savings = monthly * (economy.split.savingsPct / 100);
  return { wants: monthly - savings, savings };
}

/** Emergency-fund months covered against the reference need. */
export const monthsCovered = (emergencyBalance: number): number =>
  Math.max(0, emergencyBalance) / economy.referenceMonthlyNeed;

/** Loan offer for a credit score (null = banks decline). */
export function creditOffer(score: number) {
  return economy.credit.offers.find((o) => score >= o.minScore) ?? null;
}
