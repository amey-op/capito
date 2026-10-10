import { describe, expect, it } from 'vitest';
import i18n from '@/core/i18n';
import { lessonById, terms } from '@/content';
import { searchWords, wordBank } from './wordBank';

const text = (k: string) => (i18n.exists(k) ? i18n.t(k) : undefined);

describe('Word Bank', () => {
  const all = wordBank(terms, lessonById, text);

  it('lists only terms whose lesson exists, sorted by name', () => {
    expect(all.length).toBeGreaterThan(0);
    for (const e of all) expect(lessonById.has(e.lessonId)).toBe(true);
    const names = all.map((e) => e.name.toLowerCase());
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it('hides terms from lessons that are not written', () => {
    const fake = { id: 'ghostTerm', introducedIn: '2.9', core: true, verified: true };
    expect(wordBank([fake], lessonById, text)).toEqual([]);
  });

  it('every entry has a name and a simple meaning; core terms have a real-life example', () => {
    for (const e of all) {
      expect(e.name).not.toBe(e.id);
      expect(e.simple.length).toBeGreaterThan(0);
      if (e.core) expect(e.life?.length).toBeGreaterThan(0);
    }
  });

  it('search matches the name, the meaning or the example, ignoring case', () => {
    expect(searchWords(all, 'INCOME').map((e) => e.id)).toContain('income');
    expect(searchWords(all, 'diwali').map((e) => e.id)).toContain('income');
    expect(searchWords(all, '   ')).toHaveLength(all.length);
    expect(searchWords(all, 'zzzz-nothing')).toEqual([]);
  });
});
