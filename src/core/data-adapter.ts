/**
 * Persistence boundary. Phase 1 uses `createLocalAdapter` only (the Zustand store persists GameState itself).
 * Phase 2 (A5) adds a Supabase adapter with the same interface: anonymous student + class code,
 * no personal data, batched writes (one per sub-section and one per event).
 * CONTRACT FILE: change only through a `contract-change` PR.
 */
import type { GameState } from './types';

/** Anonymous progress records an NGO may see in aggregate. Never names, phones, emails or devices. */
export type ProgressEvent =
  | { kind: 'subSectionCompleted'; subSectionId: string; firstAttemptCorrect: number; month: number }
  | { kind: 'eventChoice'; eventId: string; firstChoiceId: string; retried: boolean; month: number }
  | { kind: 'healthSnapshot'; month: number; total: number }
  | { kind: 'milestone'; id: string; month: number }
  | { kind: 'finalQuiz'; correct: number; total: number };

export interface DataAdapter {
  readonly kind: 'local' | 'supabase';
  loadState(): Promise<GameState | null>;
  saveState(state: GameState): Promise<void>;
  /** Queue an anonymous progress record (local: kept for a later sync). */
  recordProgress(event: ProgressEvent): Promise<void>;
  /** Records not yet synced. */
  pendingProgress(): Promise<ProgressEvent[]>;
  clear(): Promise<void>;
}

export const STATE_STORAGE_KEY = 'capito-state';
export const PROGRESS_STORAGE_KEY = 'capito-progress';
const SNAPSHOT_KEY = `${STATE_STORAGE_KEY}-snapshot`;

/** Minimal storage surface so tests can pass an in-memory map. */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function createLocalAdapter(storage: KeyValueStorage | undefined = globalThis.localStorage): DataAdapter {
  const read = <T,>(key: string, fallback: T): T => {
    try {
      const raw = storage?.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  };
  const write = (key: string, value: unknown) => {
    try {
      storage?.setItem(key, JSON.stringify(value));
    } catch {
      // Storage full or blocked: the game keeps running in memory.
    }
  };
  return {
    kind: 'local',
    loadState: async () => read<GameState | null>(SNAPSHOT_KEY, null),
    saveState: async (state) => write(SNAPSHOT_KEY, state),
    recordProgress: async (event) => write(PROGRESS_STORAGE_KEY, [...read<ProgressEvent[]>(PROGRESS_STORAGE_KEY, []), event]),
    pendingProgress: async () => read<ProgressEvent[]>(PROGRESS_STORAGE_KEY, []),
    clear: async () => {
      storage?.removeItem(SNAPSHOT_KEY);
      storage?.removeItem(PROGRESS_STORAGE_KEY);
    },
  };
}
