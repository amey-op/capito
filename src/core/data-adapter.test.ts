import { describe, expect, it } from 'vitest';
import { createLocalAdapter, type KeyValueStorage } from './data-adapter';
import { initialGameState } from './state';

const memory = (): KeyValueStorage => {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => {
      m.set(k, v);
    },
    removeItem: (k) => {
      m.delete(k);
    },
  };
};

describe('local DataAdapter', () => {
  it('round-trips state and queues progress', async () => {
    const a = createLocalAdapter(memory());
    expect(await a.loadState()).toBeNull();
    const s = initialGameState();
    await a.saveState(s);
    expect(await a.loadState()).toEqual(s);
    await a.recordProgress({ kind: 'subSectionCompleted', subSectionId: '1.1', firstAttemptCorrect: 3, month: 1 });
    expect(await a.pendingProgress()).toHaveLength(1);
    await a.clear();
    expect(await a.loadState()).toBeNull();
    expect(await a.pendingProgress()).toEqual([]);
  });
});
