/**
 * Pure aggregation for the NGO dashboard. Every number on /ngo comes from one of these functions.
 * Input: learners (sample class plus this device). Output: plain numbers and ids; text stays in i18n.
 */
import { curriculum, levels } from '@/content/curriculum';
import { events } from '@/content';
import type { LifeEvent } from '@/core/content-schema';
import type { GameState } from '@/core/types';
import { engine } from '@/engine';
import type { Learner } from './demoClass';

const QUESTIONS_PER_LESSON = 3;
const round1 = (n: number) => Math.round(n * 10) / 10;
const mean = (xs: number[]) => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);
const pct = (part: number, whole: number) => (whole === 0 ? 0 : (part / whole) * 100);

const curriculumOrder = new Map(curriculum.map((c, i) => [c.id, i]));
const lessonsInLevel = (level: number) => curriculum.filter((c) => c.level === level).map((c) => c.id);

/** First-attempt % for one learner across every lesson they finished, or null if none yet. */
export function learnerQuizPct(l: Learner): number | null {
  const scores = l.completed.map((id) => l.firstCorrect[id] ?? 0);
  if (scores.length === 0) return null;
  return round1(pct(scores.reduce((a, b) => a + b, 0), scores.length * QUESTIONS_PER_LESSON));
}

export interface SummaryTiles {
  learners: number;
  /** Active in the last 7 days. */
  active7: number;
  avgLessons: number;
  totalLessons: number;
  /** Pooled first-attempt quiz %, over every completed lesson. */
  avgQuizPct: number;
  avgHealth: number;
  avgMonths: number;
}

export function summaryTiles(learners: Learner[]): SummaryTiles {
  const answered = learners.flatMap((l) => l.completed.map((id) => l.firstCorrect[id] ?? 0));
  return {
    learners: learners.length,
    active7: learners.filter((l) => l.daysAgo < 7).length,
    avgLessons: round1(mean(learners.map((l) => l.completed.length))),
    totalLessons: curriculum.length,
    avgQuizPct: round1(pct(answered.reduce((a, b) => a + b, 0), answered.length * QUESTIONS_PER_LESSON)),
    avgHealth: Math.round(mean(learners.map((l) => l.health))),
    avgMonths: round1(mean(learners.map((l) => l.monthsCovered))),
  };
}

/** % of learners who finished every lesson of each level 1–9. */
export function completionByLevel(learners: Learner[]): Array<{ level: number; pct: number }> {
  return levels.map((level) => {
    const ids = lessonsInLevel(level);
    const finished = learners.filter((l) => ids.every((id) => l.completed.includes(id))).length;
    return { level, pct: Math.round(pct(finished, learners.length)) };
  });
}

/** Average first-attempt % per level; null for a level nobody has reached. */
export function quizByLevel(learners: Learner[]): Array<{ level: number; pct: number | null; answered: number }> {
  return levels.map((level) => {
    const ids = new Set(lessonsInLevel(level));
    const scores = learners.flatMap((l) => l.completed.filter((id) => ids.has(id)).map((id) => l.firstCorrect[id] ?? 0));
    return {
      level,
      pct: scores.length === 0 ? null : Math.round(pct(scores.reduce((a, b) => a + b, 0), scores.length * QUESTIONS_PER_LESSON)),
      answered: scores.length,
    };
  });
}

/** The `n` lessons with the lowest first-attempt %, among lessons at least `minLearners` finished. */
export function lowestLessons(learners: Learner[], n = 3, minLearners = 3): Array<{ lessonId: string; pct: number; learners: number }> {
  return curriculum
    .map((c) => {
      const scores = learners.filter((l) => l.completed.includes(c.id)).map((l) => l.firstCorrect[c.id] ?? 0);
      return {
        lessonId: c.id,
        pct: Math.round(pct(scores.reduce((a, b) => a + b, 0), scores.length * QUESTIONS_PER_LESSON)),
        learners: scores.length,
      };
    })
    .filter((x) => x.learners >= minLearners)
    .sort((a, b) => a.pct - b.pct || curriculumOrder.get(a.lessonId)! - curriculumOrder.get(b.lessonId)!)
    .slice(0, n);
}

/** Fewest learners an event needs before it counts as a weak spot. */
export const WEAK_MIN_SEEN = 5;

export interface WeakSpot {
  eventId: string;
  kind: LifeEvent['kind'];
  /** The bad choice most learners picked first. */
  badChoiceId: string;
  /** Learners who met the event. */
  seen: number;
  /** Learners whose first choice was a bad one. */
  bad: number;
  pct: number;
}

/**
 * Life events and scam alerts ranked by the share of learners whose first choice was the bad one.
 * Events met by fewer than `minSeen` learners are left out (one or two answers say little).
 */
export function weakSpots(learners: Learner[], eventList: LifeEvent[] = events, minSeen = WEAK_MIN_SEEN): WeakSpot[] {
  const spots: WeakSpot[] = [];
  eventList.forEach((event) => {
    const badIds = event.choices.filter((c) => c.verdict === 'bad').map((c) => c.id);
    if (badIds.length === 0) return;
    const firsts = learners.map((l) => l.firstChoices[event.id]).filter((c): c is string => c !== undefined);
    if (firsts.length === 0 || firsts.length < minSeen) return;
    const counts = badIds.map((id) => ({ id, n: firsts.filter((c) => c === id).length }));
    const bad = counts.reduce((a, c) => a + c.n, 0);
    const top = counts.reduce((a, c) => (c.n > a.n ? c : a));
    spots.push({ eventId: event.id, kind: event.kind, badChoiceId: top.id, seen: firsts.length, bad, pct: Math.round(pct(bad, firsts.length)) });
  });
  const order = new Map(eventList.map((e, i) => [e.id, i]));
  return spots.sort((a, b) => b.pct - a.pct || b.seen - a.seen || order.get(a.eventId)! - order.get(b.eventId)!);
}

/** Share of scam messages (in-story alerts and Scam Shield practice) judged correctly. */
export function scamSafety(learners: Learner[]): { seen: number; correct: number; pct: number } {
  const seen = learners.reduce((a, l) => a + l.shield.seen, 0);
  const correct = learners.reduce((a, l) => a + l.shield.correct, 0);
  return { seen, correct, pct: Math.round(pct(correct, seen)) };
}

export interface LearnerRow {
  id: string;
  nickname: string;
  isDevice: boolean;
  lessons: number;
  quizPct: number | null;
  health: number;
  months: number;
  daysAgo: number;
}

export type SortKey = 'nickname' | 'lessons' | 'quizPct' | 'health' | 'months' | 'daysAgo';

export function learnerRows(learners: Learner[]): LearnerRow[] {
  return learners.map((l) => ({
    id: l.id,
    nickname: l.nickname,
    isDevice: l.isDevice === true,
    lessons: l.completed.length,
    quizPct: learnerQuizPct(l),
    health: l.health,
    months: l.monthsCovered,
    daysAgo: l.daysAgo,
  }));
}

/** Stable sort by any column; learners without a quiz score go last either way. */
export function sortRows(rows: LearnerRow[], key: SortKey, dir: 'asc' | 'desc'): LearnerRow[] {
  const sign = dir === 'asc' ? 1 : -1;
  return rows
    .map((row, i) => ({ row, i }))
    .sort((a, b) => {
      const x = a.row[key];
      const y = b.row[key];
      if (x === null || y === null) return x === y ? a.i - b.i : x === null ? 1 : -1;
      const c = typeof x === 'string' ? x.localeCompare(y as string) : x - (y as number);
      return c !== 0 ? sign * c : a.i - b.i;
    })
    .map((x) => x.row);
}

/** Quote a CSV field if it holds a comma, quote or line break (RFC 4180). */
export const csvField = (value: string | number | null): string => {
  const s = value === null ? '' : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** The learners table as CSV. `header` comes from i18n, in column order of `learnerRows`. */
export function toCsv(header: string[], rows: LearnerRow[]): string {
  const lines = [header, ...rows.map((r) => [r.nickname, r.lessons, r.quizPct, r.health, r.months, r.daysAgo])];
  return lines.map((cells) => cells.map(csvField).join(',')).join('\r\n') + '\r\n';
}

/** This browser's own game, in the same shape as a sample learner. */
export function learnerFromGame(game: GameState, nickname: string): Learner {
  const completed = Object.keys(game.progress)
    .filter((id) => curriculumOrder.has(id))
    .sort((a, b) => curriculumOrder.get(a)! - curriculumOrder.get(b)!);
  return {
    id: 'device',
    nickname,
    isDevice: true,
    completed,
    firstCorrect: Object.fromEntries(completed.map((id) => [id, game.progress[id]!.firstAttemptCorrect])),
    firstChoices: Object.fromEntries(Object.entries(game.events).map(([id, r]) => [id, r.firstChoiceId])),
    shield: { ...game.shield },
    health: engine.health(game).total,
    monthsCovered: round1(engine.monthsCovered(game)),
    daysAgo: 0,
  };
}
