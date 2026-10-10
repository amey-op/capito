/**
 * App store: holds GameState, routes every change through engine.reduce, persists to localStorage.
 * Components read state with selectors and call `dispatch`; no game logic lives here or in components.
 * CONTRACT FILE: change only through a `contract-change` PR.
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { engine } from '@/engine';
import { economy } from './economy.config';
import { STATE_STORAGE_KEY } from './data-adapter';
import type { Action, Effect, GameState } from './types';

export interface GameStore {
  game: GameState;
  /** Effects from the last action, for outcome-card animations. */
  lastEffects: Effect[];
  dispatch: (action: Action) => Effect[];
  reset: () => void;
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      game: engine.newGame(),
      lastEffects: [],
      dispatch: (action) => {
        const { state, effects } = engine.reduce(get().game, action);
        set({ game: state, lastEffects: effects });
        return effects;
      },
      reset: () => set({ game: engine.newGame(), lastEffects: [] }),
    }),
    {
      name: STATE_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ game: s.game }),
      // A save from another economy version starts fresh (numbers changed underneath it).
      merge: (persisted, current) => {
        const p = persisted as Partial<GameStore> | undefined;
        return p?.game?.economyVersion === economy.version ? { ...current, game: p.game } : current;
      },
    },
  ),
);

/** Selector helpers (keep components free of state shape details). */
export const selectGame = (s: GameStore) => s.game;
export const selectDispatch = (s: GameStore) => s.dispatch;
