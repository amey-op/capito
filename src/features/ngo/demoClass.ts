/**
 * Sample class for the NGO demo: 31 learners generated from a seeded PRNG, so the dashboard
 * shows the same numbers on every run and in tests (no Math.random, no Date.now).
 * Ids come from the real curriculum and events, so titles stay correct if content changes.
 */
import { curriculum } from '@/content/curriculum';
import { events } from '@/content';
import type { LifeEvent } from '@/core/content-schema';

/** One learner as an NGO would see them: a nickname and anonymous progress, nothing personal. */
export interface Learner {
  id: string;
  nickname: string;
  /** The current browser's own game, shown as one extra row. */
  isDevice?: boolean;
  /** Completed lesson ids, in curriculum order. */
  completed: string[];
  /** Lesson id → first-attempt correct answers (0–3). */
  firstCorrect: Record<string, number>;
  /** Event id → the first choice made. */
  firstChoices: Record<string, string>;
  shield: { seen: number; correct: number };
  /** Money Health Score, 0–100. */
  health: number;
  /** Safety net in months. */
  monthsCovered: number;
  /** Days before the demo date the learner was last active (0 = today). */
  daysAgo: number;
}

export const DEMO_CLASS = {
  code: 'HYD-7QX3',
  /** Fixed "last updated" date for the demo (ISO, read as UTC). */
  updated: '2026-10-11',
  size: 31,
  seed: 28,
} as const;

/** mulberry32: a tiny seeded PRNG returning floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const adjectives = ['Blue', 'Swift', 'Quiet', 'Bright', 'Green', 'Brave', 'Lucky', 'Calm', 'Golden', 'Silver', 'Red', 'Clever', 'Sunny', 'Little', 'Bold', 'Happy'];
const nouns = ['Kite', 'Tiger', 'Lotus', 'Comet', 'River', 'Parrot', 'Mango', 'Falcon', 'Pebble', 'Rocket', 'Peacock', 'Banyan', 'Otter', 'Lantern', 'Cricket', 'Dolphin'];

/** Events where taking the bait is tempting: scam alerts and "easy money" offers. */
const tempting = new Set(['e1_1', 'e4_3', 'e8_1', 'e5_3', 'e6_4', 'e8_3', 'e2_2', 'e8_2']);

const pick = <T,>(rng: () => number, list: readonly T[]): T => list[Math.floor(rng() * list.length)]!;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** How many lessons each learner has finished: mostly levels 1–5, a few further, two finished. */
function lessonCount(rng: () => number, index: number, total: number): number {
  if (index < 2) return total;
  if (index < 6) return 18 + Math.floor(rng() * 9); // into levels 6–8
  return 2 + Math.floor(rng() * 16); // through levels 1–5 (5.3 is the 18th lesson)
}

function firstChoice(rng: () => number, event: LifeEvent, skill: number): string {
  const bad = event.choices.filter((c) => c.verdict === 'bad');
  const rest = event.choices.filter((c) => c.verdict !== 'bad');
  const pBad = (tempting.has(event.id) ? 0.7 : 0.25) * (1 - 0.45 * skill);
  if (bad.length > 0 && rng() < pBad) return pick(rng, bad).id;
  return pick(rng, rest.length > 0 ? rest : event.choices).id;
}

export function generateDemoClass(seed: number = DEMO_CLASS.seed, size: number = DEMO_CLASS.size): Learner[] {
  const rng = mulberry32(seed);
  const order = curriculum.map((c) => c.id);
  // Some lessons are harder than others, so the "lowest lessons" list means something.
  const difficulty = new Map(order.map((id) => [id, rng() * 0.35]));
  const usedNames = new Set<string>();
  const learners: Learner[] = [];

  for (let i = 0; i < size; i++) {
    let nickname = '';
    do {
      const digits = String(Math.floor(rng() * 100)).padStart(2, '0');
      nickname = `${pick(rng, adjectives)} ${pick(rng, nouns)} ${digits}`;
    } while (usedNames.has(nickname));
    usedNames.add(nickname);

    const count = lessonCount(rng, i, order.length);
    const completed = order.slice(0, count);
    const progress = count / order.length;
    const skill = clamp(0.25 + rng() * 0.6 + progress * 0.2, 0, 1);

    const firstCorrect: Record<string, number> = {};
    for (const id of completed) {
      const p = clamp(0.45 + skill * 0.45 - (difficulty.get(id) ?? 0), 0.05, 0.95);
      let correct = 0;
      for (let q = 0; q < 3; q++) if (rng() < p) correct++;
      firstCorrect[id] = correct;
    }

    const done = new Set(completed);
    const firstChoices: Record<string, string> = {};
    let scamSeen = 0;
    let scamCorrect = 0;
    for (const event of events) {
      if (!done.has(event.after)) continue;
      const choiceId = firstChoice(rng, event, skill);
      firstChoices[event.id] = choiceId;
      if (event.kind === 'scamAlert') {
        scamSeen++;
        if (event.choices.find((c) => c.id === choiceId)?.verdict !== 'bad') scamCorrect++;
      }
    }
    // Scam Shield practice messages on top of the in-story alerts.
    const practice = Math.floor(rng() * 7);
    let practiceCorrect = 0;
    for (let q = 0; q < practice; q++) if (rng() < 0.5 + skill * 0.4) practiceCorrect++;

    learners.push({
      id: `s${String(i + 1).padStart(2, '0')}`,
      nickname,
      completed,
      firstCorrect,
      firstChoices,
      shield: { seen: scamSeen + practice, correct: scamCorrect + practiceCorrect },
      health: Math.round(clamp(25 + progress * 40 + rng() * 22, 25, 85)),
      monthsCovered: Math.round(clamp(progress * 3.5 + rng() * 1.5 - 0.3, 0, 4) * 10) / 10,
      daysAgo: Math.floor(rng() * 10),
    });
  }
  return learners;
}

/** The sample class, generated once. */
export const demoClass: Learner[] = generateDemoClass();
