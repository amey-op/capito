/**
 * Shared game contracts: state, actions, engine API, effects. docs/MECHANICS.md is the rulebook.
 * CONTRACT FILE: change only through a small `contract-change` PR approved by Amey.
 * The engine (src/engine, Nipun's lane) implements EngineAPI; the UI only dispatches Actions.
 */
import type { DepreciationCategory } from './economy.config';
import type { BucketId, LifeEvent, LoanTerms, Tone, UnlockId } from './content-schema';

export type { BucketId, UnlockId, Tone } from './content-schema';

// ---------- profile ----------

/** 3-tap Starting Profile: changes wording and the Level-2 variant only, never money. */
export interface StartingProfile {
  ageBand: '15-16' | '17-18' | '19+';
  earns: 'earn' | 'pocketMoney' | 'neither';
  hasBankAccount: boolean;
}

// ---------- wants, goals, possessions ----------

export interface Want {
  id: string;
  /** Player-typed text (the only free text in the game; never personal data). */
  name: string;
  price: number;
  kind: 'item' | 'experience';
  /** Item wants depreciate at this category's rate once bought. */
  category?: DepreciationCategory;
  targetMonth?: number;
  createdMonth: number;
  status: 'open' | 'goal' | 'bought' | 'dropped';
}

export interface Goal {
  id: string;
  wantId?: string;
  name: string;
  amount: number;
  /** Deadline in game-months. */
  deadlineMonth: number;
  saved: number;
  status: 'active' | 'met' | 'missed';
  extendedTimes: number;
}

export interface Possession {
  id: string;
  /** Free text from a want, or an i18n key from an event (`nameIsKey`). */
  name: string;
  nameIsKey?: boolean;
  cost: number;
  category: DepreciationCategory;
  boughtMonth: number;
  value: number;
}

// ---------- deposits, investments, loans ----------

export interface RecurringDeposit {
  id: string;
  instalment: number;
  ratePa: number;
  months: number;
  paidMonths: number;
  missedMonths: number;
  startedMonth: number;
  status: 'active' | 'matured' | 'closedEarly';
}

export interface FixedDeposit {
  id: string;
  principal: number;
  ratePa: number;
  months: number;
  startedMonth: number;
  status: 'active' | 'matured' | 'brokenEarly';
}

export interface Holding {
  /** Rupees put in (after costs). */
  invested: number;
  /** Current value (follows the index). */
  value: number;
}

export interface Holdings {
  goldPhysical: Holding;
  goldEtf: Holding;
  mf: Holding;
  shares: Holding;
  /** The WhatsApp "tip" stock in 6.4 (tracked separately so the pump episode hits only it). */
  tipStock: Holding;
}

export interface Sip {
  monthly: number;
  active: boolean;
  startedMonth: number;
  pausedMonths: number;
}

export interface Loan {
  id: string;
  kind: LoanTerms['kind'];
  principal: number;
  ratePa: number;
  months: number;
  emi: number;
  paidMonths: number;
  missedMonths: number;
  remaining: number;
  startedMonth: number;
  status: 'active' | 'paid' | 'defaulted';
}

/** Monthly deductions from an event's `recurring` (premiums, informal repayments…). */
export interface RecurringCharge {
  id: string;
  labelKey: string;
  perMonth: number;
  monthsLeft: number;
  sourceEventId?: string;
}

/** Delayed effects from an event's `later` (applied at month close when `dueMonth` arrives). */
export interface DelayedEffect {
  id: string;
  dueMonth: number;
  money?: number;
  from?: BucketId;
  joy?: number;
  credit?: number;
  eventId?: string;
  noteKey?: string;
  flags?: string[];
  sourceEventId?: string;
}

// ---------- market (story calendar, no randomness) ----------

export interface MarketState {
  /** Index levels, start at 100. */
  gold: number;
  mf: number;
  shares: number;
  tipStock: number;
  /** Months stepped so far (drives the fixed wiggle pattern). */
  step: number;
  /** Running scripted episodes and how many steps have been applied. */
  activeEpisodes: Array<{ id: 'crash' | 'tipPump' | 'goldDip'; step: number }>;
}

// ---------- progress and records ----------

export interface SubSectionProgress {
  /** First-attempt correct answers (learning evidence for the NGO). */
  firstAttemptCorrect: number;
  bestCorrect: number;
  attempts: number;
  completedMonth: number;
}

export interface EventRecord {
  /** First choice is the one recorded for NGO weak-spot stats. */
  firstChoiceId: string;
  finalChoiceId: string;
  retried: boolean;
  month: number;
}

/** One closed month, used for 3-month averages in the Health Score. */
export interface MonthLog {
  month: number;
  /** Practice money M that arrived this month. */
  income: number;
  /** Money moved to savings / emergency / deposits / investments this month. */
  saved: number;
  /** EMIs due this month. */
  emis: number;
  missedPayments: number;
}

export interface ShieldStats {
  seen: number;
  correct: number;
}

/** Snapshot to support "try again once" on events (MECHANICS §6). */
export interface RetrySnapshot {
  eventId: string;
  firstChoiceId: string;
  /** Full state before the first choice was applied (without its own snapshot). */
  before: Omit<GameState, 'retrySnapshot'>;
}

// ---------- the game state ----------

export interface GameState {
  schemaVersion: 1;
  /** economy.version this game was started with. */
  economyVersion: string;
  profile: StartingProfile | null;

  /** Game-month, starts at 1. One completed sub-section = one month. */
  month: number;
  /** Practice money M that landed this month (₹2,000–₹5,000). */
  monthMoney: number;
  /** A sub-section is completed and its Plan the Month has not run yet. */
  awaitingPlan: boolean;
  /** Events fire after the month closes for the sub-section in their `after` field. */
  lastCompletedSubSection: string | null;

  unlocked: UnlockId[];
  buckets: Record<BucketId, number>;
  /** Which account holds savings after the Level 2 choice (A: no minimum; B: minimum + fee). */
  savingsAccount: 'standard' | 'A' | 'B';
  holdings: Holdings;
  sip: Sip | null;
  rds: RecurringDeposit[];
  fds: FixedDeposit[];
  loans: Loan[];
  recurring: RecurringCharge[];
  delayed: DelayedEffect[];
  insurance: { health: boolean };
  market: MarketState;

  wants: Want[];
  goals: Goal[];
  possessions: Possession[];

  /** null until the first credit action (then economy.credit.start). */
  creditScore: number | null;
  /** Credit applications this month (extra ones cost points). */
  creditApplicationsThisMonth: number;
  joy: number;
  shield: ShieldStats;
  flags: string[];
  milestones: string[];

  progress: Record<string, SubSectionProgress>;
  events: Record<string, EventRecord>;
  /** Event ids waiting to be shown (queued at month close). */
  pendingEvents: string[];
  history: MonthLog[];
  finalQuiz: { correct: number; total: number } | null;

  retrySnapshot: RetrySnapshot | null;
}

// ---------- actions ----------

export interface NewWant {
  name: string;
  price: number;
  kind: Want['kind'];
  category?: DepreciationCategory;
  targetMonth?: number;
}

/** What the player decides on the Plan the Month screen (after automatic deductions). */
export interface MonthPlan {
  /** Want ids to buy now (wallet pays). */
  buyWants?: string[];
  /** Goal id → rupees to earmark. */
  earmark?: Record<string, number>;
  /** Move money from the wallet into buckets. */
  toBuckets?: Partial<Record<BucketId, number>>;
  startRd?: { instalment: number; months: number };
  openFd?: { principal: number; months: number };
  sip?: { monthly: number } | 'pause' | 'stop';
  buyInsurance?: boolean;
}

export type Action =
  | { type: 'NEW_GAME'; profile?: StartingProfile | null }
  | { type: 'SET_PROFILE'; profile: StartingProfile }
  | { type: 'COMPLETE_SUBSECTION'; subSectionId: string; quizCorrect: number; unlocks: UnlockId[] }
  | { type: 'ADD_WANT'; want: NewWant }
  | { type: 'UPDATE_WANT'; wantId: string; changes: Partial<NewWant> }
  | { type: 'DROP_WANT'; wantId: string }
  | { type: 'PROMOTE_GOAL'; wantId: string; amount: number; deadlineMonth: number }
  | { type: 'ADD_GOAL'; name: string; amount: number; deadlineMonth: number }
  | { type: 'EXTEND_GOAL'; goalId: string; deadlineMonth: number }
  | { type: 'PLAN_MONTH'; plan: MonthPlan }
  | { type: 'MOVE_MONEY'; from: BucketId; to: BucketId; amount: number }
  | { type: 'WITHDRAW'; from: BucketId; amount: number }
  | { type: 'BUY_GOLD'; amount: number; form: 'physical' | 'etf' }
  | { type: 'INVEST'; asset: 'mf' | 'shares' | 'tipStock'; amount: number }
  | { type: 'SELL'; asset: keyof Holdings; amount: number | 'all' }
  | { type: 'BREAK_FD'; fdId: string }
  | { type: 'CLOSE_RD'; rdId: string }
  | { type: 'CHECK_CREDIT_SCORE' }
  | { type: 'APPLY_LOAN'; terms: LoanTerms }
  | { type: 'RESOLVE_EVENT'; eventId: string; choiceId: string; isRetry: boolean }
  /** Scam Shield / Check-it results (R3) feed the scam-safety input of the Health Score. */
  | { type: 'SHIELD_RESULT'; seen: number; correct: number }
  | { type: 'FINAL_QUIZ_RESULT'; correct: number; total: number }
  | { type: 'DISMISS_EVENT'; eventId: string };

export type ActionType = Action['type'];

// ---------- engine outputs ----------

/** Something visible changed; drives outcome-card animations. Text via i18n keys only. */
export type Effect =
  | { kind: 'money'; bucket: BucketId; delta: number }
  | { kind: 'goal'; goalId: string; delta: number }
  | { kind: 'joy'; delta: number }
  | { kind: 'credit'; delta: number; score: number }
  | { kind: 'shield'; seen: number; correct: number }
  | { kind: 'unlock'; id: UnlockId }
  | { kind: 'milestone'; id: string }
  | { kind: 'flag'; id: string }
  | { kind: 'possession'; name: string; value: number }
  | { kind: 'loan'; loanId: string; emi: number }
  | { kind: 'eventQueued'; eventId: string }
  | { kind: 'missedPayment'; labelKey: string; fee: number }
  | { kind: 'note'; key: string; params?: Record<string, string | number> };

export interface ReduceResult {
  state: GameState;
  effects: Effect[];
}

export interface HealthInput {
  points: 0 | 10 | 20;
  /** The measured value (%, months or count). */
  value: number;
}

export interface HealthBreakdown {
  total: number;
  savingsRate: HealthInput;
  emergency: HealthInput;
  diversification: HealthInput;
  debtLoad: HealthInput;
  scamSafety: HealthInput;
  /** "Next best move" hint (i18n key + params). */
  nextMoveKey: string;
  nextMoveParams?: Record<string, string | number>;
}

export interface LoanOffer {
  /** null = no formal offer (score under 600 or EMI cap). */
  maxAmount: number;
  ratePa: number;
  score: number;
  /** i18n key explaining "why this rate". */
  reasonKey: string;
}

/** Non-binding preview of a choice (MECHANICS §6 "What if…?"). */
export interface WhatIf {
  choiceId: string;
  verdict: Tone;
  available: boolean;
  effects: Effect[];
  netWorthDelta: number;
  joyDelta: number;
  creditDelta: number;
  shieldDelta: number;
}

/** Implemented in src/engine (N1/N2). Pure: no React, no storage, no Math.random, no Date.now. */
export interface EngineAPI {
  newGame(profile?: StartingProfile | null): GameState;
  reduce(state: GameState, action: Action): ReduceResult;
  netWorth(state: GameState): number;
  health(state: GameState): HealthBreakdown;
  monthsCovered(state: GameState): number;
  loanOffer(state: GameState): LoanOffer | null;
  /** Choices whose `availableIf` passes for this state. */
  availableChoices(state: GameState, event: LifeEvent): LifeEvent['choices'];
  /** Preview every choice without changing state. */
  whatIf(state: GameState, event: LifeEvent): WhatIf[];
}
