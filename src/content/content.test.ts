/**
 * Content checks every PR must pass (docs/WORKFLOW.md §5). Add new lessons/events/terms as JSON
 * and these tests pick them up automatically.
 */
import { describe, expect, it } from 'vitest';
import { coreTermLayers, eventFile, glossaryFile, lesson as lessonSchema } from '@/core/content-schema';
import { economy } from '@/core/economy.config';
import { defaultSplit, depreciatedValue, goalSavingMonthly, leakPerYear, savingsMonthInterest } from '@/core/finance';
import { formatINR } from '@/core/format';
import { curriculum, curriculumById } from './curriculum';
import { localeFiles, mergeLocaleFiles } from './i18n';
import { events, lessons, rawEvents, rawGlossary, rawLessons, terms } from './index';

const en = mergeLocaleFiles(localeFiles).resources.en ?? {};

/** Collect every value under a key ending in `Key`, plus `options` arrays of quiz items. */
function collectKeys(node: unknown, out: string[] = []): string[] {
  if (Array.isArray(node)) node.forEach((n) => collectKeys(n, out));
  else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      if (k.endsWith('Key') && typeof v === 'string') out.push(v);
      else if (k === 'options' && Array.isArray(v)) v.forEach((o) => typeof o === 'string' && out.push(o));
      else collectKeys(v, out);
    }
  }
  return out;
}

/** Every string in a content file must be an id/key-like token: no sentences, no literal UI text. */
function literalStrings(node: unknown, path = '', out: string[] = []): string[] {
  if (typeof node === 'string') {
    if (!/^[A-Za-z0-9_.\-]+$/.test(node)) out.push(`${path} = "${node}"`);
  } else if (Array.isArray(node)) node.forEach((n, i) => literalStrings(n, `${path}[${i}]`, out));
  else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) if (k !== 'source') literalStrings(v, `${path}.${k}`, out);
  }
  return out;
}

const dupes = (ids: string[]) => ids.filter((id, i) => ids.indexOf(id) !== i);

describe('lessons', () => {
  it('at least the exemplar 1.1 exists', () => {
    expect(lessons.map((l) => l.id)).toContain('1.1');
  });

  for (const [path, data] of Object.entries(rawLessons)) {
    describe(path, () => {
      const parsed = lessonSchema.safeParse(data);
      it('matches the lesson schema (5–8 cards, exactly 3 quiz items, valid answers)', () => {
        expect(parsed.success ? [] : parsed.error.issues).toEqual([]);
      });
      if (!parsed.success) return;
      const l = parsed.data;

      it('file name, folder and curriculum entry agree', () => {
        expect(path).toBe(`./levels/level${l.level}/${l.id}.json`);
        expect(curriculumById.get(l.id)).toMatchObject({ level: l.level, tier: l.tier });
      });
      it('every key exists in the English files and follows lesson.<id>.*', () => {
        const keys = collectKeys(l);
        expect(keys.filter((k) => !(k in en))).toEqual([]);
        const prefix = `lesson.${l.id.replace('.', '_')}.`;
        expect(keys.filter((k) => !k.startsWith(prefix))).toEqual([]);
      });
      it('has no literal strings', () => {
        expect(literalStrings(data)).toEqual([]);
      });
      it('every referenced term exists in a glossary file', () => {
        const ids = new Set(terms.map((t) => t.id));
        const used = [
          ...l.terms,
          ...l.cards.flatMap((c) => c.terms ?? []),
          ...l.quiz.flatMap((q) => q.terms ?? []),
          ...(l.finalQuiz ?? []).flatMap((q) => q.terms ?? []),
        ];
        expect(used.filter((t) => !ids.has(t))).toEqual([]);
      });
      it('item ids are unique within the lesson', () => {
        expect(dupes(l.cards.map((c) => c.id))).toEqual([]);
        expect(dupes(l.quiz.map((q) => q.id))).toEqual([]);
        expect(dupes(l.gutCheck.choices.map((c) => c.id))).toEqual([]);
      });
      it('tap-sort items point at real categories', () => {
        for (const c of l.cards) {
          if (c.interaction?.type !== 'tapSort') continue;
          const cats = new Set(c.interaction.categories.map((x) => x.id));
          expect(c.interaction.items.filter((i) => !cats.has(i.category))).toEqual([]);
        }
      });
    });
  }

  it('lesson ids are unique', () => {
    expect(dupes(lessons.map((l) => l.id))).toEqual([]);
  });
});

describe('events', () => {
  for (const [path, data] of Object.entries(rawEvents)) {
    describe(path, () => {
      const parsed = eventFile.safeParse(data);
      it('matches the event schema', () => {
        expect(parsed.success ? [] : parsed.error.issues).toEqual([]);
      });
      if (!parsed.success) return;
      it('every key exists in the English files', () => {
        expect(collectKeys(parsed.data).filter((k) => !(k in en))).toEqual([]);
      });
      it('has no literal strings', () => {
        expect(literalStrings(data)).toEqual([]);
      });
      it('fires after a real sub-section of its own level; choice ids unique', () => {
        for (const e of parsed.data) {
          expect(curriculumById.get(e.after)?.level).toBe(e.level);
          expect(dupes(e.choices.map((c) => c.id))).toEqual([]);
        }
      });
    });
  }

  it('event ids are unique and follow-up events exist', () => {
    const ids = events.map((e) => e.id);
    expect(dupes(ids)).toEqual([]);
    const followUps = events.flatMap((e) => e.choices.flatMap((c) => (c.later ?? []).flatMap((l) => (l.eventId ? [l.eventId] : []))));
    expect(followUps.filter((id) => !ids.includes(id))).toEqual([]);
  });

  it('terms reinforced by events exist', () => {
    const ids = new Set(terms.map((t) => t.id));
    const used = events.flatMap((e) => e.choices.flatMap((c) => c.termsToReinforce ?? []));
    expect(used.filter((t) => !ids.has(t))).toEqual([]);
  });
});

describe('glossary', () => {
  for (const [path, data] of Object.entries(rawGlossary)) {
    it(`${path} matches the term schema and lives in its level file`, () => {
      const parsed = glossaryFile.safeParse(data);
      expect(parsed.success ? [] : parsed.error.issues).toEqual([]);
      if (!parsed.success) return;
      const level = Number(/level(\d)\.json$/.exec(path)?.[1]);
      expect(parsed.data.filter((t) => curriculumById.get(t.introducedIn)?.level !== level).map((t) => t.id)).toEqual([]);
    });
  }

  it('term ids are unique across all levels', () => {
    expect(dupes(terms.map((t) => t.id))).toEqual([]);
  });

  it('core terms have name + three layers; mentioned terms have name + one line', () => {
    const missing: string[] = [];
    for (const t of terms) {
      const layers = t.core ? ['name', ...coreTermLayers, ...(t.hasMaths ? ['maths'] : [])] : ['name', 'simple'];
      for (const layer of layers) if (!(`term.${t.id}.${layer}` in en)) missing.push(`term.${t.id}.${layer}`);
    }
    expect(missing).toEqual([]);
  });
});

describe('i18n files', () => {
  it('no key is defined in two files; all values are strings', () => {
    const m = mergeLocaleFiles(localeFiles);
    expect(m.duplicates).toEqual([]);
    expect(m.invalid).toEqual([]);
  });

  it('each file only holds keys for its area (prevents cross-lane edits)', () => {
    const rule = (file: string): RegExp | null => {
      const name = file.split('/').pop()!.replace('.json', '');
      const lvl = /^level(\d)$/.exec(name);
      if (lvl) return new RegExp(`^lesson\\.${lvl[1]}_\\d\\.`);
      if (/^glossary-level\d$/.test(name)) return /^term\./;
      const fixed: Record<string, RegExp> = {
        ui: /^ui\./,
        events: /^event\./,
        tools: /^tools\./,
        scamshield: /^scamshield\./,
        portfolio: /^portfolio\./,
        ngo: /^ngo\./,
      };
      return fixed[name] ?? null;
    };
    const bad: string[] = [];
    for (const [file, messages] of Object.entries(localeFiles)) {
      const r = rule(file);
      if (!r) {
        bad.push(`${file}: unknown file name`);
        continue;
      }
      for (const key of Object.keys(messages)) if (!r.test(key)) bad.push(`${file}: ${key}`);
    }
    expect(bad).toEqual([]);
  });

  it('detects duplicates (merge self-test)', () => {
    const m = mergeLocaleFiles({ './i18n/en/a.json': { 'ui.x': '1' }, './i18n/en/b.json': { 'ui.x': '2' } });
    expect(m.duplicates).toEqual([{ lang: 'en', key: 'ui.x', files: ['./i18n/en/a.json', './i18n/en/b.json'] }]);
  });
});

describe('numbers in text come from the formulas ([CALC])', () => {
  // Each entry: an i18n key whose text quotes a computed number, and the number it must contain.
  const checks: Array<[string, number]> = [
    ['lesson.1_1.c8.text', leakPerYear(40)],
    ['lesson.1_1.q2.o2', leakPerYear(40)],
    ['lesson.1_1.q2.right', leakPerYear(40)],
    // 1.2 monthly targets
    ['lesson.1_2.c4.text', goalSavingMonthly(3000, 6)],
    ['lesson.1_2.c5.text', goalSavingMonthly(3000, 3)],
    ['lesson.1_2.q2.o2', goalSavingMonthly(3000, 6)],
    ['lesson.1_2.gut.c.result', goalSavingMonthly(1200, 2)],
    // 1.3 the 60/40 split of ₹4,000 and three months of saving first
    ['lesson.1_3.c4.reveal.answer', defaultSplit(4000).wants],
    ['lesson.1_3.c4.reveal.answer', defaultSplit(4000).savings],
    ['lesson.1_3.q2.o2', defaultSplit(4000).savings],
    ['lesson.1_3.gut.b.result', defaultSplit(4000).wants],
    ['lesson.1_3.gut.b.result', defaultSplit(4000).savings * 3],
    ['lesson.1_3.gut.c.result', 4000 * 3],
    // 1.4 depreciation and a year of savings interest
    ['lesson.1_4.c5.text', depreciatedValue(6000, economy.depreciationPa.phone, 6)],
    ['lesson.1_4.gut.a.result', depreciatedValue(6000, economy.depreciationPa.phone, 12)],
    ['lesson.1_4.c4.text', 60000 - 10000],
    ['lesson.1_4.q2.o2', 20000 - 5000],
  ];
  it('1.4: "about ₹6,180" after a year of savings interest at 3%', () => {
    let balance = 6000;
    for (let m = 0; m < 12; m++) balance += savingsMonthInterest(balance);
    expect(Math.round(balance / 10) * 10).toBe(6180);
    expect(en['lesson.1_4.gut.b.result']).toContain(formatINR(6180));
  });

  it.each(checks)('%s quotes %d', (key, value) => {
    expect(en[key]).toContain(formatINR(value));
  });

  it('every lesson that ships has a curriculum slot; curriculum is 29 with 23 MUST', () => {
    expect(curriculum).toHaveLength(economy.clock.totalSubSections);
    expect(curriculum.filter((c) => c.tier === 'must')).toHaveLength(economy.clock.mustSubSections);
  });
});
