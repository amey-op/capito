/**
 * Word Bank entries: only terms whose lesson exists, sorted by name, searchable by any layer.
 */
import type { Lesson, Term } from '@/core/content-schema';

export interface WordEntry {
  id: string;
  level: number;
  lessonId: string;
  core: boolean;
  name: string;
  simple: string;
  life?: string;
}

export function wordBank(
  terms: Term[],
  lessonById: Map<string, Lesson>,
  text: (key: string) => string | undefined,
): WordEntry[] {
  return terms
    .filter((term) => lessonById.has(term.introducedIn))
    .map((term) => ({
      id: term.id,
      level: lessonById.get(term.introducedIn)!.level,
      lessonId: term.introducedIn,
      core: term.core,
      name: text(`term.${term.id}.name`) ?? term.id,
      simple: text(`term.${term.id}.simple`) ?? '',
      life: term.core ? text(`term.${term.id}.life`) : undefined,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
}

/** Case-insensitive match on the name, the simple meaning or the example. */
export function searchWords(entries: WordEntry[], query: string): WordEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return entries;
  return entries.filter((e) => [e.name, e.simple, e.life ?? ''].some((s) => s.toLowerCase().includes(q)));
}
