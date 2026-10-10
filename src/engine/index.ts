/**
 * The Rupee Quest engine (work packages N1 and N2a). docs/MECHANICS.md is the rulebook.
 *
 * Pure and deterministic: no React, no storage, no Math.random, no Date.now. `reduce` works on a
 * deep copy of the state, so the state passed in is never changed. Every number comes from
 * economy.config.ts and every formula from finance.ts.
 *
 *   ledger.ts      wallet, earmarks, payments, wants, goals
 *   deposits.ts    recurring and fixed deposits
 *   market.ts      story-calendar market, scripted episodes, buying and selling
 *   credit.ts      credit score, loan offers, loans
 *   monthClose.ts  the month close run by PLAN_MONTH
 *   events.ts      consequence engine: resolve, what-if, try again
 *   selectors.ts   net worth, months covered, Money Health Score
 */
import { eventById as contentEventById, eventsAfter as contentEventsAfter } from '@/content';
import { economy } from '@/core/economy.config';
import { clamp, quizPayout, retryBonus } from '@/core/finance';
import { initialGameState } from '@/core/state';
import type { Action, EngineAPI, GameState, ReduceResult } from '@/core/types';
import { applyLoan, ensureProfile, loanOffer } from './credit';
import { breakFd, closeRd } from './deposits';
import { availableChoices, resolveEvent, whatIf } from './events';
import { addGoal, addWant, credit, dropWant, extendGoal, moveCash, promoteGoal, updateWant } from './ledger';
import { buyGold, buyHolding, sellHolding } from './market';
import { checkMilestones, closeMonth } from './monthClose';
import { health, monthsCovered, netWorth } from './selectors';
import { copy, unlock, type Ctx, type EventRegistry } from './util';

/** Actions that leave the "try again" snapshot in place. Anything else makes it stale. */
const KEEPS_SNAPSHOT: ReadonlyArray<Action['type']> = ['RESOLVE_EVENT', 'DISMISS_EVENT'];

function completeSubSection(ctx: Ctx, action: Extract<Action, { type: 'COMPLETE_SUBSECTION' }>): void {
  const correct = clamp(Math.floor(Number(action.quizCorrect) || 0), 0, economy.money.quizQuestions);
  const prev = ctx.s.progress[action.subSectionId];
  if (prev) {
    // Retry: pays only the improvement, never advances the month, never re-unlocks.
    credit(ctx, 'wallet', retryBonus(prev.bestCorrect, correct));
    prev.bestCorrect = Math.max(prev.bestCorrect, correct);
    prev.attempts += 1;
    return;
  }
  // One sub-section is one game-month: if the last month was never planned, close it as it stands.
  if (ctx.s.awaitingPlan) closeMonth(ctx, {});
  const pay = quizPayout(correct);
  credit(ctx, 'wallet', pay);
  ctx.s.monthMoney = pay;
  ctx.s.awaitingPlan = true;
  ctx.s.lastCompletedSubSection = action.subSectionId;
  ctx.s.progress[action.subSectionId] = {
    firstAttemptCorrect: correct,
    bestCorrect: correct,
    attempts: 1,
    completedMonth: ctx.s.month,
  };
  for (const id of action.unlocks) unlock(ctx, id);
  checkMilestones(ctx);
}

function run(ctx: Ctx, action: Action): void {
  const { s } = ctx;
  switch (action.type) {
    case 'NEW_GAME':
      ctx.s = initialGameState(action.profile ?? null);
      return;
    case 'SET_PROFILE':
      s.profile = action.profile;
      return;
    case 'COMPLETE_SUBSECTION':
      return completeSubSection(ctx, action);

    case 'ADD_WANT':
      return addWant(ctx, action.want);
    case 'UPDATE_WANT':
      return updateWant(ctx, action.wantId, action.changes);
    case 'DROP_WANT':
      return dropWant(ctx, action.wantId);
    case 'PROMOTE_GOAL':
      return promoteGoal(ctx, action.wantId, action.amount, action.deadlineMonth);
    case 'ADD_GOAL':
      return addGoal(ctx, action.name, action.amount, action.deadlineMonth);
    case 'EXTEND_GOAL':
      return extendGoal(ctx, action.goalId, action.deadlineMonth);

    case 'PLAN_MONTH':
      if (s.awaitingPlan) closeMonth(ctx, action.plan ?? {});
      return;

    case 'MOVE_MONEY':
      moveCash(ctx, action.from, action.to, action.amount);
      return;
    case 'WITHDRAW':
      moveCash(ctx, action.from, 'wallet', action.amount);
      return;
    case 'BUY_GOLD':
      buyGold(ctx, action.amount, action.form);
      return;
    case 'INVEST':
      buyHolding(ctx, action.asset, action.amount);
      return;
    case 'SELL':
      sellHolding(ctx, action.asset, action.amount);
      return;
    case 'BREAK_FD':
      return breakFd(ctx, action.fdId);
    case 'CLOSE_RD':
      return closeRd(ctx, action.rdId);

    case 'CHECK_CREDIT_SCORE':
      ensureProfile(ctx);
      return;
    case 'APPLY_LOAN':
      applyLoan(ctx, action.terms);
      return;

    case 'RESOLVE_EVENT':
      return resolveEvent(ctx, action.eventId, action.choiceId, action.isRetry);
    case 'DISMISS_EVENT':
      s.pendingEvents = s.pendingEvents.filter((id) => id !== action.eventId);
      return;

    case 'SHIELD_RESULT': {
      const seen = Math.max(0, Math.floor(Number(action.seen) || 0));
      s.shield.seen += seen;
      s.shield.correct += clamp(Math.floor(Number(action.correct) || 0), 0, seen);
      ctx.fx.push({ kind: 'shield', seen: s.shield.seen, correct: s.shield.correct });
      return;
    }
    case 'FINAL_QUIZ_RESULT':
      s.finalQuiz = { correct: action.correct, total: action.total };
      return;
  }
}

/** Build an engine around an event registry (the app uses the content registry; tests pass their own). */
export function createEngine(reg: EventRegistry): EngineAPI {
  const reduce = (state: GameState, action: Action): ReduceResult => {
    const ctx: Ctx = { s: copy(state), fx: [], reg };
    if (ctx.s.retrySnapshot && !KEEPS_SNAPSHOT.includes(action.type)) ctx.s.retrySnapshot = null;
    run(ctx, action);
    return { state: ctx.s, effects: ctx.fx };
  };
  return {
    newGame: (profile) => initialGameState(profile ?? null),
    reduce,
    netWorth,
    health,
    monthsCovered,
    loanOffer,
    availableChoices,
    whatIf: (state, event) => whatIf(state, event, reg),
  };
}

export const engine: EngineAPI = createEngine({
  eventById: (id) => contentEventById.get(id),
  eventsAfter: contentEventsAfter,
});
