import { describe, expect, it } from 'vitest';
import type { Action } from '@/core/types';
import { engine } from './index';

/** Contract tests the real engine (N1) must keep passing. */
describe('engine contract (A0 stub)', () => {
  it('first completion pays ₹2,000 + ₹1,000 per correct and records progress', () => {
    const { state, effects } = engine.reduce(engine.newGame(), {
      type: 'COMPLETE_SUBSECTION',
      subSectionId: '1.1',
      quizCorrect: 2,
      unlocks: ['myWants'],
    });
    expect(state.buckets.wallet).toBe(4000);
    expect(state.monthMoney).toBe(4000);
    expect(state.lastCompletedSubSection).toBe('1.1');
    expect(state.progress['1.1']).toMatchObject({ firstAttemptCorrect: 2, bestCorrect: 2, attempts: 1 });
    expect(state.unlocked).toContain('myWants');
    expect(effects).toContainEqual({ kind: 'money', bucket: 'wallet', delta: 4000 });
  });

  it('retry pays only the improvement and keeps the first-attempt score', () => {
    let s = engine.newGame();
    const complete = (quizCorrect: number) =>
      (s = engine.reduce(s, { type: 'COMPLETE_SUBSECTION', subSectionId: '1.1', quizCorrect, unlocks: [] }).state);
    complete(1);
    complete(3);
    expect(s.buckets.wallet).toBe(3000 + 2000);
    complete(2);
    expect(s.buckets.wallet).toBe(5000);
    expect(s.progress['1.1']).toMatchObject({ firstAttemptCorrect: 1, bestCorrect: 3, attempts: 3 });
    expect(s.month).toBe(1);
  });

  it('SHIELD_RESULT accumulates scam-safety stats', () => {
    const s = engine.reduce(engine.newGame(), { type: 'SHIELD_RESULT', seen: 12, correct: 9 }).state;
    expect(s.shield).toEqual({ seen: 12, correct: 9 });
  });

  it('is deterministic: the same actions give the same state', () => {
    const actions: Action[] = [
      { type: 'COMPLETE_SUBSECTION', subSectionId: '1.1', quizCorrect: 3, unlocks: ['myWants'] },
      { type: 'ADD_WANT', want: { name: 'Headphones', price: 1500, kind: 'item', category: 'other' } },
    ];
    const run = () => actions.reduce((s, a) => engine.reduce(s, a).state, engine.newGame());
    expect(run()).toEqual(run());
  });
});
