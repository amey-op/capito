/**
 * The starting GameState. Shared by the engine and the store so both agree on the shape.
 * CONTRACT FILE: change only through a `contract-change` PR.
 */
import { economy } from './economy.config';
import type { GameState, Holding, StartingProfile } from './types';

const emptyHolding = (): Holding => ({ invested: 0, value: 0 });

export function initialGameState(profile: StartingProfile | null = null): GameState {
  return {
    schemaVersion: 1,
    economyVersion: economy.version,
    profile,
    month: economy.clock.startMonth,
    monthMoney: 0,
    awaitingPlan: false,
    lastCompletedSubSection: null,
    unlocked: ['wallet'],
    buckets: { wallet: economy.money.startingWallet, savings: 0, emergency: 0, rd: 0, fd: 0, gold: 0, mf: 0, shares: 0 },
    savingsAccount: 'standard',
    holdings: {
      goldPhysical: emptyHolding(),
      goldEtf: emptyHolding(),
      mf: emptyHolding(),
      shares: emptyHolding(),
      tipStock: emptyHolding(),
    },
    sip: null,
    rds: [],
    fds: [],
    loans: [],
    recurring: [],
    delayed: [],
    insurance: { health: false },
    market: { gold: 100, mf: 100, shares: 100, tipStock: 100, step: 0, activeEpisodes: [] },
    wants: [],
    goals: [],
    possessions: [],
    creditScore: null,
    creditApplicationsThisMonth: 0,
    joy: economy.joy.start,
    shield: { seen: 0, correct: 0 },
    flags: [],
    milestones: [],
    progress: {},
    events: {},
    pendingEvents: [],
    history: [],
    finalQuiz: null,
    retrySnapshot: null,
  };
}
