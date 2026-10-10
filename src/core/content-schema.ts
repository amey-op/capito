/**
 * Zod schemas for all content data (lessons, events, glossary terms). Types are inferred from them.
 * Shape reference: docs/LESSON_1.1.md §7 and docs/MECHANICS.md §6.
 * CONTRACT FILE: change only through a `contract-change` PR.
 *
 * Rules enforced here: every displayed string is an i18n key (fields ending in `Key`), never literal text.
 * Cross-file rules (keys exist, ids unique, terms exist) live in src/content/content.test.ts.
 */
import { z } from 'zod';
import { configToolIds, bespokeToolIds, staticToolIds } from './tools';

// ---------- primitives ----------

/** Flat i18n key: lowercase first segment, dot-separated, e.g. `lesson.1_1.gut.prompt`. */
export const i18nKey = z.string().regex(/^[a-z][a-zA-Z0-9]*(\.[a-zA-Z0-9_]+)+$/, 'must be a flat i18n key like lesson.1_1.title');
export const subSectionId = z.string().regex(/^[1-9]\.[1-9]$/, 'sub-section id like 1.1');
export const eventId = z.string().regex(/^e[1-9]_[0-9]+$/, 'event id like e1_1');
/** Term ids are camelCase and unique across all levels. */
export const termId = z.string().regex(/^[a-z][a-zA-Z0-9]*$/, 'term id must be camelCase');
export const flagId = z.string().regex(/^[a-z][a-z0-9_]*$/, 'flags are snake_case');
export const tone = z.enum(['good', 'mixed', 'bad']);
export const level = z.number().int().min(1).max(9);

export const bucketId = z.enum(['wallet', 'savings', 'emergency', 'rd', 'fd', 'gold', 'mf', 'shares']);
/** Everything a lesson or event can switch on. */
export const unlockId = z.enum([
  'wallet',
  'myWants',
  'goals',
  'netWorth',
  'possessions',
  'savings',
  'emergency',
  'rd',
  'insurance',
  'liabilities',
  'credit',
  'fd',
  'gold',
  'mf',
  'shares',
  'shield',
  'incomeTax',
]);

export const toolId = z.enum([...configToolIds, ...bespokeToolIds, ...staticToolIds]);
/** Prefill values for a tool (names agreed in WORKFLOW: principal, ratePct, months, monthly, years, amount, target…). */
export const toolPrefill = z.record(z.string(), z.number());

// ---------- lessons ----------

export const gutChoice = z.object({
  id: z.string().min(1),
  labelKey: i18nKey,
  resultKey: i18nKey,
  tone,
});

export const gutCheck = z.object({
  promptKey: i18nKey,
  choices: z.array(gutChoice).min(2).max(3),
  bridgeKey: i18nKey,
});

const tapSort = z.object({
  type: z.literal('tapSort'),
  promptKey: i18nKey,
  /** The two (or three) piles, e.g. need / want. */
  categories: z.array(z.object({ id: z.string().min(1), labelKey: i18nKey })).min(2).max(3),
  items: z.array(z.object({ id: z.string().min(1), labelKey: i18nKey, category: z.string().min(1) })).min(2).max(8),
  feedbackKey: i18nKey.optional(),
});

const reveal = z.object({
  type: z.literal('reveal'),
  promptKey: i18nKey,
  answerKey: i18nKey,
});

const toolInteraction = z.object({
  type: z.literal('tool'),
  toolId,
  prefill: toolPrefill.optional(),
});

export const cardInteraction = z.discriminatedUnion('type', [tapSort, reveal, toolInteraction]);

export const card = z.object({
  id: z.string().min(1),
  textKey: i18nKey,
  /** Hand-drawn SVG art id (rendered by the lesson player). */
  art: z.string().regex(/^[a-z0-9-]+$/).optional(),
  terms: z.array(termId).optional(),
  interaction: cardInteraction.optional(),
  footerKey: i18nKey.optional(),
});

const quizSingle = z.object({
  id: z.string().min(1),
  type: z.literal('single'),
  promptKey: i18nKey,
  options: z.array(i18nKey).min(2).max(5),
  /** Index into `options`. */
  correct: z.number().int().min(0),
  feedbackRightKey: i18nKey,
  feedbackWrongKey: i18nKey,
  terms: z.array(termId).optional(),
});

const quizTrueFalse = z.object({
  id: z.string().min(1),
  type: z.literal('trueFalse'),
  promptKey: i18nKey,
  correct: z.boolean(),
  feedbackRightKey: i18nKey,
  feedbackWrongKey: i18nKey,
  terms: z.array(termId).optional(),
});

export const quizItem = z.discriminatedUnion('type', [quizSingle, quizTrueFalse]);

export const fact = z.object({
  /** Short id for the fact (shown in review lists), e.g. `leak.per_year`, `dicgc.cover`. */
  key: z.string().min(1),
  verified: z.boolean(),
  source: z.string().url().optional(),
});

export const lesson = z
  .object({
    id: subSectionId,
    level,
    tier: z.enum(['must', 'should']),
    titleKey: i18nKey,
    /** Investing lessons carry the "not advice" banner. */
    banner: z.enum(['notAdvice']).optional(),
    gutCheck,
    cards: z.array(card).min(5).max(8),
    tool: z.object({ id: toolId, prefill: toolPrefill.optional() }).optional(),
    quiz: z.array(quizItem).length(3),
    /** Only 9.1: the 10-question final quiz (learning evidence; no baseline). */
    finalQuiz: z.array(quizItem).length(10).optional(),
    terms: z.array(termId),
    portfolioEffect: z.object({
      /** The one real decision this lesson adds to Plan the Month, in words. */
      decisionKey: i18nKey,
      unlocks: z.array(unlockId),
      monthAdvances: z.boolean(),
    }),
    facts: z.array(fact).default([]),
  })
  .superRefine((l, ctx) => {
    l.quiz.concat(l.finalQuiz ?? []).forEach((q, i) => {
      if (q.type === 'single' && q.correct >= q.options.length) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['quiz', i, 'correct'], message: 'correct is not a valid option index' });
      }
    });
    if (l.finalQuiz && l.id !== '9.1') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['finalQuiz'], message: 'finalQuiz is only for 9.1' });
    }
    if (!l.id.startsWith(`${l.level}.`)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['level'], message: 'level does not match id' });
    }
  });

// ---------- events (MECHANICS §6) ----------

export const possession = z.object({
  nameKey: i18nKey,
  cost: z.number().nonnegative(),
  category: z.enum(['phone', 'laptop', 'bike', 'clothes', 'sneakers', 'other']),
});

export const loanTerms = z.object({
  kind: z.enum(['bank', 'noCostEmi', 'loanApp', 'informal', 'coSigned']),
  principal: z.number().positive(),
  months: z.number().int().positive(),
  /** Omit for 'bank' to use the rate from the player's credit offer. */
  ratePa: z.number().nonnegative().optional(),
  /** Informal lenders: % per month. */
  ratePctPerMonth: z.number().nonnegative().optional(),
});

export const nowEffect = z.object({
  /** Signed rupee change. Negative = paid from `from` (default wallet); positive = received into `to` (default wallet). */
  money: z.number().optional(),
  from: bucketId.optional(),
  to: bucketId.optional(),
  /** Move money between buckets (e.g. wallet → savings). Amount null = everything in `from`. */
  moves: z.array(z.object({ from: bucketId, to: bucketId, amount: z.number().positive().nullable() })).optional(),
  /** Rupees toward the first active goal (or taken from goals if negative). */
  goal: z.number().optional(),
  goalSlipMonths: z.number().int().nonnegative().optional(),
  joy: z.number().optional(),
  possessions: z.array(possession).optional(),
  loan: loanTerms.optional(),
  insurance: z.enum(['buy', 'cancel']).optional(),
  /** Starts a scripted market episode (MECHANICS §3.1). */
  episode: z.enum(['crash', 'tipPump', 'goldDip']).optional(),
  /** Invest into a market bucket now. */
  invest: z.object({ asset: z.enum(['gold', 'goldPhysical', 'mf', 'shares', 'tipStock']), amount: z.number().positive() }).optional(),
});

export const laterEffect = z.object({
  inMonths: z.number().int().positive(),
  money: z.number().optional(),
  from: bucketId.optional(),
  joy: z.number().optional(),
  credit: z.number().optional(),
  eventId: eventId.optional(),
  noteKey: i18nKey.optional(),
  flags: z.array(flagId).optional(),
});

export const recurringEffect = z.object({
  months: z.number().int().positive(),
  perMonth: z.number().positive(),
  labelKey: i18nKey,
});

export const availableIf = z.object({
  flag: flagId.optional(),
  notFlag: flagId.optional(),
  minBucket: z.object({ bucket: bucketId, amount: z.number().nonnegative() }).optional(),
  unlocked: unlockId.optional(),
  insured: z.boolean().optional(),
});

export const choice = z.object({
  id: z.string().min(1),
  labelKey: i18nKey,
  verdict: tone,
  now: nowEffect.default({}),
  later: z.array(laterEffect).optional(),
  recurring: z.array(recurringEffect).optional(),
  credit: z.number().optional(),
  /** Scam-safety: +1 handled correctly, −1 fell for it (feeds SHIELD stats). */
  shield: z.number().optional(),
  flags: z.array(flagId).optional(),
  availableIf: availableIf.optional(),
  outcomeKey: i18nKey,
  whyKey: i18nKey,
  termsToReinforce: z.array(termId).optional(),
});

export const lifeEvent = z.object({
  id: eventId,
  level,
  kind: z.enum(['life', 'scamAlert']),
  /** Fires after the month closes for this sub-section (state.lastCompletedSubSection). */
  after: subSectionId,
  titleKey: i18nKey,
  introKey: i18nKey,
  choices: z.array(choice).min(2).max(4),
});

/** Each events file is an array of events. */
export const eventFile = z.array(lifeEvent);

// ---------- glossary ----------

export const term = z.object({
  id: termId,
  introducedIn: subSectionId,
  /** Core = full three-layer Word Bank card and quizzed; mentioned = one line (`term.<id>.simple`). */
  core: z.boolean(),
  verified: z.boolean(),
  source: z.string().url().optional(),
  /** Core terms may have a `term.<id>.maths` key ("Curious? tap for the maths"). */
  hasMaths: z.boolean().optional(),
});

export const glossaryFile = z.array(term);

// ---------- inferred types ----------

export type Tone = z.infer<typeof tone>;
export type BucketId = z.infer<typeof bucketId>;
export type UnlockId = z.infer<typeof unlockId>;
export type GutCheck = z.infer<typeof gutCheck>;
export type Card = z.infer<typeof card>;
export type CardInteraction = z.infer<typeof cardInteraction>;
export type QuizItem = z.infer<typeof quizItem>;
export type Lesson = z.infer<typeof lesson>;
export type Fact = z.infer<typeof fact>;
export type Choice = z.infer<typeof choice>;
export type NowEffect = z.infer<typeof nowEffect>;
export type LaterEffect = z.infer<typeof laterEffect>;
export type RecurringEffect = z.infer<typeof recurringEffect>;
export type LoanTerms = z.infer<typeof loanTerms>;
export type LifeEvent = z.infer<typeof lifeEvent>;
export type Term = z.infer<typeof term>;

/** Text keys every core term must have. */
export const coreTermLayers = ['simple', 'life', 'real'] as const;
