/**
 * Small shared helpers for the engine. Pure: no React, no storage, no Math.random, no Date.now.
 * The reducer works on a deep copy of the state (see index.ts), so helpers may mutate `ctx.s`.
 */
import { economy } from '@/core/economy.config';
import { clamp, roundRupees } from '@/core/finance';
import type { LifeEvent } from '@/core/content-schema';
import type { BucketId, Effect, GameState, UnlockId } from '@/core/types';

/** Where the engine looks events up. The app passes the content registry; tests pass their own. */
export interface EventRegistry {
  eventById(id: string): LifeEvent | undefined;
  eventsAfter(subSectionId: string): LifeEvent[];
}

/** Working context for one action: the draft state, the effects collected so far, and the events. */
export interface Ctx {
  s: GameState;
  fx: Effect[];
  reg: EventRegistry;
}

/** Tolerance for float comparisons on rupee amounts. */
export const EPS = 1e-6;

/** A usable positive amount, or 0 for anything else (NaN, negative, wrong type). */
export const amountOf = (n: unknown): number => (typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : 0);

/**
 * i18n keys the engine can emit (notes, labels, hints). They live in
 * src/content/i18n/en/portfolio.json; a test checks every one exists.
 */
export const K = {
  cannotAfford: 'portfolio.note.cannotAfford',
  notUnlocked: 'portfolio.note.notUnlocked',
  tenureNotOffered: 'portfolio.note.tenureNotOffered',
  maturesAfterGameEnds: 'portfolio.note.maturesAfterGameEnds',
  rdMatured: 'portfolio.note.rdMatured',
  rdClosedEarly: 'portfolio.note.rdClosedEarly',
  fdMatured: 'portfolio.note.fdMatured',
  fdBrokenEarly: 'portfolio.note.fdBrokenEarly',
  sipSkipped: 'portfolio.note.sipSkipped',
  insuranceLapsed: 'portfolio.note.insuranceLapsed',
  accountFee: 'portfolio.note.accountFee',
  loanDeclinedScore: 'portfolio.note.loanDeclinedScore',
  loanDeclinedEmi: 'portfolio.note.loanDeclinedEmi',
  loanPaidOff: 'portfolio.note.loanPaidOff',
  loanDefaulted: 'portfolio.note.loanDefaulted',
  shortfallWaived: 'portfolio.note.shortfallWaived',
  goalMet: 'portfolio.note.goalMet',
  goalMissed: 'portfolio.note.goalMissed',
  noActiveGoal: 'portfolio.note.noActiveGoal',
  missedEmi: 'portfolio.missed.emi',
  missedRd: 'portfolio.missed.rd',
  missedCharge: 'portfolio.missed.charge',
  lateFeeCharge: 'portfolio.charge.lateFee',
  healthNextEmergency: 'portfolio.health.next.emergency',
  healthNextSavingsRate: 'portfolio.health.next.savingsRate',
  healthNextDebtLoad: 'portfolio.health.next.debtLoad',
  healthNextScamSafety: 'portfolio.health.next.scamSafety',
  healthNextDiversification: 'portfolio.health.next.diversification',
  healthNextAllGood: 'portfolio.health.next.allGood',
  loanReasonNewToCredit: 'portfolio.loan.reason.newToCredit',
  loanReasonBand: 'portfolio.loan.reason.band',
} as const;

export const ENGINE_KEYS: string[] = Object.values(K);

export function note(ctx: Ctx, key: string, params?: Record<string, string | number>): void {
  ctx.fx.push(params ? { kind: 'note', key, params } : { kind: 'note', key });
}

/** Record a visible money change (whole rupees; the ledger itself keeps full precision). */
export function fxMoney(ctx: Ctx, bucket: BucketId, delta: number): void {
  const d = roundRupees(delta);
  if (d !== 0) ctx.fx.push({ kind: 'money', bucket, delta: d });
}

export const isUnlocked = (s: GameState, id: UnlockId): boolean => s.unlocked.includes(id);

export function unlock(ctx: Ctx, id: UnlockId): void {
  if (isUnlocked(ctx.s, id)) return;
  ctx.s.unlocked.push(id);
  ctx.fx.push({ kind: 'unlock', id });
}

export function addFlag(ctx: Ctx, id: string): void {
  if (ctx.s.flags.includes(id)) return;
  ctx.s.flags.push(id);
  ctx.fx.push({ kind: 'flag', id });
}

export function addMilestone(ctx: Ctx, id: string): void {
  if (ctx.s.milestones.includes(id)) return;
  ctx.s.milestones.push(id);
  ctx.fx.push({ kind: 'milestone', id });
}

export function changeJoy(ctx: Ctx, delta: number): void {
  if (!delta) return;
  const before = ctx.s.joy;
  ctx.s.joy = clamp(before + delta, economy.joy.min, economy.joy.max);
  if (ctx.s.joy !== before) ctx.fx.push({ kind: 'joy', delta: ctx.s.joy - before });
}

/** Next id like `w3` for a list whose ids are `<prefix><number>`. Never reuses an id. */
export function nextId(prefix: string, existing: Array<{ id: string }>): string {
  const max = existing.reduce((m, x) => {
    const n = Number(x.id.slice(prefix.length));
    return x.id.startsWith(prefix) && Number.isFinite(n) ? Math.max(m, n) : m;
  }, 0);
  return `${prefix}${max + 1}`;
}

/** Deep copy. The state is plain JSON data, so a structured clone is exact. */
export const copy = <T,>(value: T): T => structuredClone(value);
