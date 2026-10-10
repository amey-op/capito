import { describe, expect, it } from 'vitest';
import { lessons } from '@/content';
import { initialGameState } from '@/core/state';
import type { GameState } from '@/core/types';
import { lessonStates, levelState, nextStep } from './progress';

const done = (...ids: string[]): GameState['progress'] =>
  Object.fromEntries(ids.map((id) => [id, { firstAttemptCorrect: 3, bestCorrect: 3, attempts: 1, completedMonth: 1 }]));

describe('home progress', () => {
  const first = lessons[0]!;
  const second = lessons[1]!;

  it('new game: first lesson open, the rest locked', () => {
    const s = lessonStates(lessons, {});
    expect(s.get(first.id)).toBe('open');
    expect(s.get(second.id)).toBe('locked');
    expect([...s.values()].filter((v) => v === 'open')).toHaveLength(1);
  });

  it('after the first lesson the next one opens', () => {
    const s = lessonStates(lessons, done(first.id));
    expect(s.get(first.id)).toBe('done');
    expect(s.get(second.id)).toBe('open');
  });

  it('level state follows its lessons', () => {
    const s = lessonStates(lessons, done(first.id));
    const lvl = lessons.filter((l) => l.level === first.level);
    expect(levelState(lvl, s)).toBe(lvl.length === 1 ? 'done' : 'open');
    const last = lessons.filter((l) => l.level === lessons.at(-1)!.level);
    expect(levelState(last, s)).toBe('locked');
  });

  it('Continue: plan first, then events, then the next lesson, then finished', () => {
    const g = initialGameState();
    expect(nextStep(g, lessons, () => true)).toEqual({ kind: 'lesson', lessonId: first.id, first: true });
    expect(nextStep({ ...g, awaitingPlan: true }, lessons, () => true)).toEqual({ kind: 'plan' });
    expect(nextStep({ ...g, pendingEvents: ['e1_1'] }, lessons, () => true)).toEqual({ kind: 'event', eventId: 'e1_1' });
    expect(nextStep({ ...g, pendingEvents: ['gone'] }, lessons, () => false).kind).toBe('lesson');
    expect(nextStep({ ...g, progress: done(...lessons.map((l) => l.id)) }, lessons, () => true)).toEqual({ kind: 'finished' });
  });
});
