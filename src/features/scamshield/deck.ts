import scenariosData from './data/scenarios.json';

export type Channel = 'sms' | 'chat' | 'call' | 'social' | 'email';

export interface Scenario {
  id: string;
  channel: Channel;
  isScam: boolean;
  redFlags: string[];
}

export const scenarios = scenariosData as Scenario[];

export const DECK_SIZE = 10;
/** Every round mixes real messages in, so "everything is a scam" is never the winning answer. */
export const MIN_GENUINE = 3;

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** A round of messages: at least `MIN_GENUINE` genuine ones, the rest scams, in random order. */
export function buildDeck(all: readonly Scenario[] = scenarios, random: () => number = Math.random, size = DECK_SIZE): Scenario[] {
  const genuine = shuffle(all.filter((s) => !s.isScam), random);
  const scams = shuffle(all.filter((s) => s.isScam), random);
  const genuineCount = Math.min(genuine.length, Math.max(MIN_GENUINE, size - scams.length));
  const picked = [...genuine.slice(0, genuineCount), ...scams.slice(0, size - genuineCount)];
  return shuffle(picked, random);
}
