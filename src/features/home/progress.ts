/**
 * Home page progress: which lessons are done, open or locked, and what "Continue" does next.
 * Levels unlock in order. Only lessons that are written count; a level with none is not shown.
 */
import type { Lesson } from '@/core/content-schema';
import type { GameState } from '@/core/types';

export type LessonState = 'done' | 'open' | 'locked';

/** Done once completed; the first unfinished lesson in order is open; everything after it is locked. */
export function lessonStates(lessons: Lesson[], progress: GameState['progress']): Map<string, LessonState> {
  const out = new Map<string, LessonState>();
  let openGiven = false;
  for (const l of lessons) {
    if (progress[l.id]) out.set(l.id, 'done');
    else if (!openGiven) {
      out.set(l.id, 'open');
      openGiven = true;
    } else out.set(l.id, 'locked');
  }
  return out;
}

export function levelState(levelLessons: Lesson[], states: Map<string, LessonState>): LessonState {
  const s = levelLessons.map((l) => states.get(l.id));
  if (s.length > 0 && s.every((x) => x === 'done')) return 'done';
  if (s.some((x) => x === 'open' || x === 'done')) return 'open';
  return 'locked';
}

export type NextStep =
  | { kind: 'plan' }
  | { kind: 'event'; eventId: string }
  | { kind: 'lesson'; lessonId: string; first: boolean }
  | { kind: 'finished' };

/** What the Continue button does: plan the waiting month, then any waiting event, then the next lesson. */
export function nextStep(game: GameState, lessons: Lesson[], eventExists: (id: string) => boolean): NextStep {
  if (game.awaitingPlan) return { kind: 'plan' };
  const event = game.pendingEvents.find(eventExists);
  if (event) return { kind: 'event', eventId: event };
  const states = lessonStates(lessons, game.progress);
  const open = lessons.find((l) => states.get(l.id) === 'open');
  if (open) return { kind: 'lesson', lessonId: open.id, first: Object.keys(game.progress).length === 0 };
  return { kind: 'finished' };
}
