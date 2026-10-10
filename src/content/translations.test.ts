/**
 * Hindi and Telugu checks. A translation file mirrors an English file of the same name and may
 * leave keys out (they fall back to English), but it must never invent keys, drop placeholders,
 * change a rupee amount or number, or hold an empty string.
 */
import { describe, expect, it } from 'vitest';
import { langOf, localeFiles } from './i18n';

const fileName = (path: string) => path.split('/').pop()!;

const english = new Map(
  Object.entries(localeFiles)
    .filter(([path]) => langOf(path) === 'en')
    .map(([path, messages]) => [fileName(path), messages]),
);

const translations = Object.entries(localeFiles).filter(([path]) => ['hi', 'te'].includes(langOf(path)));

/** `{{month}}`, `{{ count }}` … as a sorted list (duplicates kept). */
const placeholders = (s: string): string[] =>
  [...s.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map((m) => m[1]!).sort();

/** Western-digit numbers outside placeholders: 2,000 · 14.5 · 1930 (a trailing full stop is not part of it). */
const numbers = (s: string): string[] =>
  [...s.replace(/\{\{[^}]*\}\}/g, ' ').matchAll(/\d+(?:[.,]\d+)*/g)].map((m) => m[0]);

describe('Hindi and Telugu translations', () => {
  it('there are translation files for both languages', () => {
    const langs = new Set(translations.map(([path]) => langOf(path)));
    expect([...langs].sort()).toEqual(['hi', 'te']);
  });

  it('each file has the same name as an English file, and only holds keys from it', () => {
    const bad: string[] = [];
    for (const [path, messages] of translations) {
      const en = english.get(fileName(path));
      if (!en) {
        bad.push(`${path}: no English file with this name`);
        continue;
      }
      for (const key of Object.keys(messages)) if (!(key in en)) bad.push(`${path}: ${key}`);
    }
    expect(bad).toEqual([]);
  });

  it('no empty values', () => {
    const bad = translations.flatMap(([path, messages]) =>
      Object.entries(messages)
        .filter(([, v]) => typeof v !== 'string' || v.trim() === '')
        .map(([k]) => `${path}: ${k}`),
    );
    expect(bad).toEqual([]);
  });

  it('placeholders match English exactly', () => {
    const bad: string[] = [];
    for (const [path, messages] of translations) {
      const en = english.get(fileName(path)) ?? {};
      for (const [key, value] of Object.entries(messages)) {
        const want = placeholders(en[key] ?? '');
        const got = placeholders(value);
        if (want.join() !== got.join()) bad.push(`${path}: ${key} wants {${want}} got {${got}}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('every rupee amount and number in English appears in the translation', () => {
    const bad: string[] = [];
    for (const [path, messages] of translations) {
      const en = english.get(fileName(path)) ?? {};
      for (const [key, value] of Object.entries(messages)) {
        const got = new Set(numbers(value));
        const missing = numbers(en[key] ?? '').filter((n) => !got.has(n));
        if (missing.length > 0) bad.push(`${path}: ${key} is missing ${missing.join(', ')}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('the rupee sign is kept wherever English uses it', () => {
    const bad: string[] = [];
    for (const [path, messages] of translations) {
      const en = english.get(fileName(path)) ?? {};
      for (const [key, value] of Object.entries(messages)) {
        const count = (s: string) => s.split('₹').length - 1;
        if (count(value) < count(en[key] ?? '')) bad.push(`${path}: ${key}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('the number helpers read placeholders and amounts the way the checks expect', () => {
    expect(placeholders('{{a}} and {{ b }}')).toEqual(['a', 'b']);
    expect(numbers('₹2,000. Then {{count}} and 14.5% in 1930.')).toEqual(['2,000', '14.5', '1930']);
  });
});
