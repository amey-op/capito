/**
 * Helpers shared by the engine tests. Not imported by the app.
 */
import { lifeEvent, type LifeEvent } from '@/core/content-schema';
import type { Action, EngineAPI, GameState, MonthPlan, UnlockId } from '@/core/types';
import { createEngine } from './index';
import type { EventRegistry } from './util';

/** A registry made from plain event objects (validated with the real schema). */
export function registryOf(raw: unknown[] = []): EventRegistry & { events: LifeEvent[] } {
  const events = raw.map((e) => lifeEvent.parse(e));
  return {
    events,
    eventById: (id) => events.find((e) => e.id === id),
    eventsAfter: (sub) => events.filter((e) => e.after === sub),
  };
}

export interface Game {
  engine: EngineAPI;
  state: GameState;
  /** Dispatch one action, keep the new state, return the effects. */
  do(action: Action): ReturnType<EngineAPI['reduce']>['effects'];
  /** Complete a sub-section (default: all 3 right → ₹5,000). */
  lesson(id: string, correct?: number, unlocks?: UnlockId[]): Game;
  /** Run Plan the Month, which closes the month. */
  plan(plan?: MonthPlan): Game;
  /** Complete `count` more sub-sections with empty plans. */
  months(count: number, correct?: number): Game;
}

export function newGame(raw: unknown[] = []): Game {
  const engine = createEngine(registryOf(raw));
  let n = 0;
  const game: Game = {
    engine,
    state: engine.newGame(),
    do(action) {
      const { state, effects } = engine.reduce(game.state, action);
      game.state = state;
      return effects;
    },
    lesson(id, correct = 3, unlocks = []) {
      game.do({ type: 'COMPLETE_SUBSECTION', subSectionId: id, quizCorrect: correct, unlocks });
      return game;
    },
    plan(plan = {}) {
      game.do({ type: 'PLAN_MONTH', plan });
      return game;
    },
    months(count, correct = 3) {
      for (let i = 0; i < count; i++) game.lesson(`x${++n}`, correct).plan();
      return game;
    },
  };
  return game;
}
