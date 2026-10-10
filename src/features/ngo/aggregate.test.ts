import { describe, expect, it } from 'vitest';
import { curriculum } from '@/content/curriculum';
import { eventById, events } from '@/content';
import { engine } from '@/engine';
import {
  completionByLevel,
  csvField,
  learnerFromGame,
  learnerQuizPct,
  learnerRows,
  lowestLessons,
  quizByLevel,
  scamSafety,
  sortRows,
  summaryTiles,
  toCsv,
  weakSpots,
} from './aggregate';
import { DEMO_CLASS, demoClass, generateDemoClass, mulberry32, type Learner } from './demoClass';

const learner = (over: Partial<Learner>): Learner => ({
  id: 'x',
  nickname: 'Test Owl 01',
  completed: [],
  firstCorrect: {},
  firstChoices: {},
  shield: { seen: 0, correct: 0 },
  health: 50,
  monthsCovered: 1,
  daysAgo: 0,
  ...over,
});

describe('sample class', () => {
  it('is the same on every run (seeded, no Math.random or Date.now)', () => {
    expect(generateDemoClass()).toEqual(generateDemoClass());
    expect(generateDemoClass()).toEqual(demoClass);
    expect(mulberry32(28)()).toBe(mulberry32(28)());
    expect(generateDemoClass(29)).not.toEqual(demoClass);
  });

  it('has 31 learners with unique nicknames, real ids and values in range', () => {
    expect(demoClass).toHaveLength(DEMO_CLASS.size);
    expect(new Set(demoClass.map((l) => l.nickname)).size).toBe(demoClass.length);
    const order = curriculum.map((c) => c.id);
    for (const l of demoClass) {
      expect(l.nickname).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+ \d{2}$/);
      expect(l.completed).toEqual(order.slice(0, l.completed.length));
      for (const id of l.completed) expect(l.firstCorrect[id]).toBeGreaterThanOrEqual(0);
      for (const id of l.completed) expect(l.firstCorrect[id]).toBeLessThanOrEqual(3);
      for (const [eventId, choiceId] of Object.entries(l.firstChoices)) {
        const event = eventById.get(eventId)!;
        expect(l.completed).toContain(event.after);
        expect(event.choices.map((c) => c.id)).toContain(choiceId);
      }
      expect(l.shield.correct).toBeLessThanOrEqual(l.shield.seen);
      expect(l.health).toBeGreaterThanOrEqual(25);
      expect(l.health).toBeLessThanOrEqual(85);
      expect(l.monthsCovered).toBeGreaterThanOrEqual(0);
      expect(l.monthsCovered).toBeLessThanOrEqual(4);
      expect(l.daysAgo).toBeGreaterThanOrEqual(0);
      expect(l.daysAgo).toBeLessThanOrEqual(9);
    }
    expect(demoClass.filter((l) => l.completed.length === curriculum.length)).toHaveLength(2);
    expect(demoClass.filter((l) => l.completed.length <= 18).length).toBeGreaterThan(20);
  });

  it('scam alerts and easy-money offers are the top weak spots', () => {
    const top = weakSpots(demoClass).slice(0, 3);
    for (const s of top) expect(['e1_1', 'e4_3', 'e8_1', 'e5_3', 'e6_4', 'e8_3', 'e2_2', 'e8_2']).toContain(s.eventId);
  });
});

describe('aggregation', () => {
  const a = learner({ id: 'a', completed: ['1.1', '1.2', '1.3', '1.4'], firstCorrect: { '1.1': 3, '1.2': 3, '1.3': 0, '1.4': 2 }, daysAgo: 1 });
  const b = learner({ id: 'b', completed: ['1.1', '1.2'], firstCorrect: { '1.1': 1, '1.2': 2 }, health: 70, monthsCovered: 3, daysAgo: 8 });

  it('summary tiles', () => {
    expect(summaryTiles([a, b])).toEqual({
      learners: 2,
      active7: 1,
      avgLessons: 3,
      totalLessons: 29,
      avgQuizPct: 61.1, // 11 of 18
      avgHealth: 60,
      avgMonths: 2,
    });
  });

  it('completion % per level counts only learners who finished every lesson of it', () => {
    const byLevel = completionByLevel([a, b]);
    expect(byLevel).toHaveLength(9);
    expect(byLevel[0]).toEqual({ level: 1, pct: 50 });
    expect(byLevel[1]).toEqual({ level: 2, pct: 0 });
  });

  it('quiz % per level and the lowest lessons', () => {
    expect(quizByLevel([a, b])[0]).toEqual({ level: 1, pct: 61, answered: 6 });
    expect(quizByLevel([a, b])[1]).toEqual({ level: 2, pct: null, answered: 0 });
    expect(lowestLessons([a, b], 2, 1)).toEqual([
      { lessonId: '1.3', pct: 0, learners: 1 },
      { lessonId: '1.1', pct: 67, learners: 2 },
    ]);
    expect(lowestLessons([a, b], 3, 3)).toEqual([]);
    expect(learnerQuizPct(learner({}))).toBeNull();
  });

  it('weak spots rank events by the share of bad first choices', () => {
    const list = events.filter((e) => ['e1_1', 'e1_3', 'e1_2'].includes(e.id));
    const ls = [
      learner({ firstChoices: { e1_1: 'combo', e1_3: 'spend', e1_2: 'skip' } }),
      learner({ firstChoices: { e1_1: 'combo', e1_3: 'save', e1_2: 'skip' } }),
      learner({ firstChoices: { e1_1: 'skip' } }),
    ];
    const spots = weakSpots(ls, list, 1);
    expect(weakSpots(ls, list, 3).map((s) => s.eventId)).toEqual(['e1_1']);
    // e1_2 has no bad choice, so it never shows.
    expect(spots.map((s) => [s.eventId, s.badChoiceId, s.bad, s.seen, s.pct])).toEqual([
      ['e1_1', 'combo', 2, 3, 67],
      ['e1_3', 'spend', 1, 2, 50],
    ]);
  });

  it('scam safety pools every learner', () => {
    expect(scamSafety([learner({ shield: { seen: 4, correct: 3 } }), learner({ shield: { seen: 6, correct: 2 } })])).toEqual({
      seen: 10,
      correct: 5,
      pct: 50,
    });
  });

  it('rows sort by any column, both ways, with missing scores last', () => {
    const c = learner({ id: 'c', nickname: 'Able Ant 03' });
    const rows = learnerRows([a, b, c]);
    expect(sortRows(rows, 'lessons', 'desc').map((r) => r.id)).toEqual(['a', 'b', 'c']);
    expect(sortRows(rows, 'nickname', 'asc').map((r) => r.id)).toEqual(['c', 'a', 'b']);
    expect(sortRows(rows, 'quizPct', 'asc').map((r) => r.id)).toEqual(['b', 'a', 'c']);
    expect(sortRows(rows, 'quizPct', 'desc').map((r) => r.id)).toEqual(['a', 'b', 'c']);
    expect(sortRows(rows, 'daysAgo', 'asc').map((r) => r.id)).toEqual(['c', 'a', 'b']);
  });

  it('CSV quotes fields with commas, quotes or line breaks', () => {
    expect(csvField('plain')).toBe('plain');
    expect(csvField('a,b')).toBe('"a,b"');
    expect(csvField('say "hi"')).toBe('"say ""hi"""');
    expect(csvField(null)).toBe('');
    const csv = toCsv(['Nickname', 'Lessons', 'Quiz %', 'Health', 'Months', 'Days, ago'], learnerRows([learner({ nickname: 'This device (you)' })]));
    expect(csv).toBe('Nickname,Lessons,Quiz %,Health,Months,"Days, ago"\r\nThis device (you),0,,50,1,0\r\n');
  });
});

describe('this device as one learner', () => {
  it('a fresh game is a learner with nothing done', () => {
    const me = learnerFromGame(engine.newGame(), 'This device (you)');
    expect(me).toMatchObject({ id: 'device', isDevice: true, completed: [], daysAgo: 0 });
  });

  it('finished lessons and event choices show up and move the class numbers', () => {
    const game = engine.newGame();
    game.progress['1.1'] = { firstAttemptCorrect: 3, bestCorrect: 3, attempts: 1, completedMonth: 1 };
    game.events['e1_1'] = { firstChoiceId: 'combo', finalChoiceId: 'skip', retried: true, month: 2 };
    const me = learnerFromGame(game, 'Me');
    expect(me.completed).toEqual(['1.1']);
    expect(me.firstCorrect).toEqual({ '1.1': 3 });
    expect(me.firstChoices).toEqual({ e1_1: 'combo' });
    const fresh = learnerFromGame(engine.newGame(), 'Me');
    const spot = (ls: Learner[]) => weakSpots(ls).find((s) => s.eventId === 'e1_1')!;
    expect(spot([...demoClass, me]).bad).toBe(spot([...demoClass, fresh]).bad + 1);
    expect(learnerRows([me])[0]).toMatchObject({ lessons: 1, quizPct: 100, isDevice: true });
  });
});
