/**
 * ENGINE STUB from A0. Nipun replaces this in N1/N2 (src/engine is Nipun's lane).
 * It does just enough for the shell and the lesson player to run before N1 merges:
 * NEW_GAME, SET_PROFILE, COMPLETE_SUBSECTION (payout + improvement-only retries), ADD_WANT,
 * SHIELD_RESULT and FINAL_QUIZ_RESULT. Every other action returns the state unchanged.
 * Rules for the real engine: pure, deterministic (no Math.random / Date.now), no React, no storage.
 */
import { economy } from '@/core/economy.config';
import { monthsCovered as coveredFor, quizPayout, retryBonus } from '@/core/finance';
import { initialGameState } from '@/core/state';
import type { Action, Effect, EngineAPI, GameState, HealthBreakdown, ReduceResult } from '@/core/types';

function reduce(state: GameState, action: Action): ReduceResult {
  switch (action.type) {
    case 'NEW_GAME':
      return { state: initialGameState(action.profile ?? null), effects: [] };

    case 'SET_PROFILE':
      return { state: { ...state, profile: action.profile }, effects: [] };

    case 'COMPLETE_SUBSECTION': {
      const prev = state.progress[action.subSectionId];
      const correct = Math.max(0, Math.min(economy.money.quizQuestions, Math.floor(action.quizCorrect)));
      if (prev) {
        // Retry: pays only the improvement, never advances the month, never re-unlocks.
        const bonus = retryBonus(prev.bestCorrect, correct);
        return {
          state: {
            ...state,
            buckets: { ...state.buckets, wallet: state.buckets.wallet + bonus },
            progress: {
              ...state.progress,
              [action.subSectionId]: { ...prev, bestCorrect: Math.max(prev.bestCorrect, correct), attempts: prev.attempts + 1 },
            },
          },
          effects: bonus > 0 ? [{ kind: 'money', bucket: 'wallet', delta: bonus }] : [],
        };
      }
      const pay = quizPayout(correct);
      const newUnlocks = action.unlocks.filter((u) => !state.unlocked.includes(u));
      const effects: Effect[] = [
        { kind: 'money', bucket: 'wallet', delta: pay },
        ...newUnlocks.map((id): Effect => ({ kind: 'unlock', id })),
      ];
      return {
        state: {
          ...state,
          monthMoney: pay,
          awaitingPlan: true,
          lastCompletedSubSection: action.subSectionId,
          unlocked: [...state.unlocked, ...newUnlocks],
          buckets: { ...state.buckets, wallet: state.buckets.wallet + pay },
          progress: {
            ...state.progress,
            [action.subSectionId]: { firstAttemptCorrect: correct, bestCorrect: correct, attempts: 1, completedMonth: state.month },
          },
        },
        effects,
      };
    }

    case 'ADD_WANT': {
      const id = `w${state.wants.length + 1}`;
      return {
        state: { ...state, wants: [...state.wants, { ...action.want, id, createdMonth: state.month, status: 'open' }] },
        effects: [],
      };
    }

    case 'SHIELD_RESULT': {
      const shield = { seen: state.shield.seen + action.seen, correct: state.shield.correct + action.correct };
      return { state: { ...state, shield }, effects: [{ kind: 'shield', ...shield }] };
    }

    case 'FINAL_QUIZ_RESULT':
      return { state: { ...state, finalQuiz: { correct: action.correct, total: action.total } }, effects: [] };

    default:
      return { state, effects: [] };
  }
}

const stubHealth = (state: GameState): HealthBreakdown => ({
  total: 0,
  savingsRate: { points: 0, value: 0 },
  emergency: { points: 0, value: coveredFor(state.buckets.emergency) },
  diversification: { points: 0, value: 0 },
  debtLoad: { points: 20, value: 0 },
  scamSafety: { points: 10, value: 0 },
  nextMoveKey: 'ui.health.nextMoveStub',
});

export const engine: EngineAPI = {
  newGame: (profile) => initialGameState(profile ?? null),
  reduce,
  netWorth: (state) => Object.values(state.buckets).reduce((a, b) => a + b, 0),
  health: stubHealth,
  monthsCovered: (state) => coveredFor(state.buckets.emergency),
  loanOffer: () => null,
  availableChoices: (_state, event) => event.choices,
  whatIf: () => [],
};
