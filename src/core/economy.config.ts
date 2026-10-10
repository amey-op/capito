/**
 * Every game number lives here (docs/MECHANICS.md). Practice values, labelled as such on screen.
 * CONTRACT FILE: change only through a small `contract-change` PR approved by Amey.
 * Percentages are written as percent (6.5 = 6.5%), money in whole rupees.
 */

export interface DatedFact {
  /** false = not checked on an official source; must not display in the final build. */
  verified: boolean;
  source?: string;
}

export const economy = {
  /** Bump when any number changes, so saved games can be migrated or reset. */
  version: '2026-10-10',

  // MECHANICS §1: money in
  money: {
    basePerSubSection: 2000,
    bonusPerCorrect: 1000,
    quizQuestions: 3,
    startingWallet: 0,
    floor: 0,
  },

  // MECHANICS §0: golden assumption, default "pay yourself first" split of practice money
  split: { wantsPct: 60, savingsPct: 40 },
  /** Reference monthly need used only by the emergency-fund meter (assumption, shown on screen). */
  referenceMonthlyNeed: 3000,

  // MECHANICS §1.1: shortfall rule
  shortfall: { lateFee: 200, creditDelta: -40 },

  // MECHANICS §2: the clock
  clock: {
    startMonth: 1,
    totalSubSections: 29,
    mustSubSections: 23,
    fdTenuresMonths: [3, 6, 12],
    rdTenuresMonths: [6, 12],
    emiTenuresMonths: [3, 6, 9],
  },

  // MECHANICS §3: buckets
  rates: {
    savingsPa: 3,
    /** Account A / B in the Level 2 "two accounts" event. */
    accountAPa: 2.5,
    accountBPa: 3.5,
    rdPa: 6.5,
    fdPa: 6.5,
    /** Early FD break / early RD closure: interest only at this rate. */
    earlyClosurePa: 3,
  },
  accountB: { minimumBalance: 5000, feePerQuarter: 150 },
  rd: { missedInstalmentFee: 50 },
  gold: { physicalMakingChargePct: 8, etfCostPct: 0.5 },
  sip: { multipleOf: 100 },
  /** Yearly loss % for "Things I own". Monthly factor = (1 − loss)^(1/12). */
  depreciationPa: {
    phone: 30,
    laptop: 30,
    bike: 15,
    clothes: 50,
    sneakers: 50,
    other: 20,
  },

  // MECHANICS §3.1: story-calendar market (no randomness; identical for every student)
  market: {
    /** Monthly drift % between episodes. */
    driftPctPerMonth: { gold: 0.5, mf: 0.9, shares: 1.0 },
    /** Fixed 12-month wiggle pattern (percentage points added to drift), each sums to 0. */
    wigglePct: {
      gold: [0.2, -0.1, 0.1, -0.3, 0.2, 0, -0.1, 0.2, -0.2, 0.1, 0, -0.1],
      mf: [0.3, -0.2, 0.1, -0.4, 0.2, 0, -0.1, 0.3, -0.3, 0.1, 0, 0],
      shares: [0.5, -0.4, 0.2, -0.6, 0.3, 0.1, -0.2, 0.4, -0.5, 0.2, 0, 0],
    },
    /** Scripted episodes: % change per month step, applied in order. */
    episodes: {
      crash: {
        firesIn: 'e6_3',
        mf: [-10, -10, 3, 3, 3, 3, 3, 3],
        shares: [-12, -13, 4, 4, 4, 4, 4, 4],
        gold: [4, 3],
      },
      tipPump: {
        firesIn: 'e6_4',
        /** The tip stock only: +15% in week 1, then −40% (net ≈ −31%). */
        tipStock: [15, -40],
      },
      goldDip: {
        firesIn: 'e6_2',
        gold: [-5, 2, 2, 2],
      },
    },
  },

  // MECHANICS §3.2: preview scenarios (5 annual returns, %), "pretend market, not a prediction"
  scenarios: {
    steady: {
      savings: [3, 3, 3, 3, 3],
      fd: [6.5, 6.5, 6.5, 6.5, 6.5],
      gold: [6, 6, 6, 6, 6],
      mf: [11, 11, 11, 11, 11],
      shares: [11, 11, 11, 11, 11],
      inflation: [6, 6, 6, 6, 6],
    },
    bumpy: {
      savings: [3, 3, 3, 3, 3],
      fd: [6.5, 6.5, 6.5, 6.5, 6.5],
      gold: [12, -5, 8, 4, 10],
      mf: [18, -12, 14, 9, 10],
      shares: [22, -15, 12, 8, 12],
      inflation: [6, 6, 6, 6, 6],
    },
    crashYear: {
      savings: [3, 3, 3, 3, 3],
      fd: [6.5, 6.5, 6.5, 6.5, 6.5],
      gold: [10, 3, 5, 5, 6],
      mf: [-20, 15, 12, 11, 11],
      shares: [-25, 18, 14, 11, 11],
      inflation: [6, 6, 6, 6, 6],
    },
  },

  // MECHANICS §4: Money Health Score (5 inputs × 20 points; bands give 0 / 10 / 20)
  health: {
    pointsPerInput: 20,
    midPoints: 10,
    averageOverMonths: 3,
    savingsRatePct: { low: 5, high: 20 },
    emergencyMonths: { low: 1, high: 3 },
    diversification: { minShareOfInvestmentsPct: 10, low: 2, high: 3 },
    /** Debt load: monthly EMIs ÷ M. 20 pts under `low`, 0 pts over `high`. */
    debtLoadPct: { low: 15, high: 40 },
    scamSafetyPct: { low: 50, high: 80, beforeAnyAlert: 10 },
  },

  // MECHANICS §4.1: Joy meter (adopted by default; flip `enabled` to hide it)
  joy: { enabled: true, start: 50, min: 0, max: 100 },

  // MECHANICS §5: credit score and loan offers (illustrative; real bureaus differ)
  credit: {
    start: 650,
    min: 300,
    max: 900,
    bands: { verified: false } satisfies DatedFact,
    deltas: {
      onTimeEmi: 10,
      missedEmi: -40,
      secondLoanWhileActive: -15,
      extraApplicationSameMonth: -5,
      default: -30,
      paidOffOnSchedule: 15,
    },
    lateFee: 200,
    /** Lender declines if the new EMI would exceed this share of M. */
    maxEmiShareOfMonthlyPct: 50,
    /** Highest band first. Below the last `minScore`, banks decline. */
    offers: [
      { minScore: 750, maxAmount: 10000, ratePa: 14 },
      { minScore: 700, maxAmount: 8000, ratePa: 18 },
      { minScore: 650, maxAmount: 6000, ratePa: 22 },
      { minScore: 600, maxAmount: 3000, ratePa: 26 },
    ],
    declineBelow: 600,
    loanApp: { maxAmount: 3000, upfrontFeePct: 10, repay: 3900, days: 30 },
    /** Informal moneylender in Level 3 events: % per month. */
    moneylenderPctPerMonth: 10,
  },

  // CONTENT 3.2: insurance portfolio effect
  insurance: { healthPremiumPerMonth: 150, illnessCoPay: 500 },

  // CONTENT 7.1: dated tax config. verified:false → tools must label "check incometax.gov.in".
  taxSlabs: {
    label: 'FY 2025-26 new-regime rates (check incometax.gov.in)',
    fy: '2025-26',
    regime: 'new',
    verified: false,
    source: 'https://cleartax.in/guide/income-tax-slabs',
    /** `upTo` is the upper limit of the slab (null = no limit), `ratePct` applies to the part inside it. */
    slabs: [
      { upTo: 400000, ratePct: 0 },
      { upTo: 800000, ratePct: 5 },
      { upTo: 1200000, ratePct: 10 },
      { upTo: 1600000, ratePct: 15 },
      { upTo: 2000000, ratePct: 20 },
      { upTo: 2400000, ratePct: 25 },
      { upTo: null, ratePct: 30 },
    ],
    /** Taxable income up to this pays no tax (rebate). Marginal relief is not modelled. */
    rebateUpTo: 1200000,
    standardDeductionSalaried: 75000,
  },

  // CONTENT 7.2: first paycheck (approximate)
  paycheck: { retirementPct: 12, verified: false },
} as const;

export type Economy = typeof economy;
export type ScenarioId = keyof Economy['scenarios'];
export type ScenarioAsset = keyof Economy['scenarios']['steady'];
export type EpisodeId = keyof Economy['market']['episodes'];
export type DepreciationCategory = keyof Economy['depreciationPa'];
export type MarketAsset = keyof Economy['market']['driftPctPerMonth'];
