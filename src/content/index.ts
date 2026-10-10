/**
 * Content registry: every lesson, event and glossary term, loaded by glob and validated with zod.
 *   lessons:  src/content/levels/level<N>/<id>.json   (one sub-section per file)
 *   events:   src/content/events/level<N>.json        (array of events)
 *   glossary: src/content/glossary/level<N>.json      (array of terms)
 * Invalid files throw at load time in dev and fail `npm test` (content.test.ts).
 */
import { eventFile, glossaryFile, lesson, type LifeEvent, type Lesson, type Term } from '@/core/content-schema';

export const rawLessons = import.meta.glob<unknown>('./levels/level*/*.json', { eager: true, import: 'default' });
export const rawEvents = import.meta.glob<unknown>('./events/*.json', { eager: true, import: 'default' });
export const rawGlossary = import.meta.glob<unknown>('./glossary/level*.json', { eager: true, import: 'default' });

const byLessonId = (a: Lesson, b: Lesson) => a.level - b.level || Number(a.id.split('.')[1]) - Number(b.id.split('.')[1]);

export const lessons: Lesson[] = Object.values(rawLessons)
  .map((data) => lesson.parse(data))
  .sort(byLessonId);
export const events: LifeEvent[] = Object.values(rawEvents).flatMap((data) => eventFile.parse(data));
export const terms: Term[] = Object.values(rawGlossary).flatMap((data) => glossaryFile.parse(data));

export const lessonById = new Map(lessons.map((l) => [l.id, l]));
export const eventById = new Map(events.map((e) => [e.id, e]));
export const termById = new Map(terms.map((t) => [t.id, t]));

export const lessonsForLevel = (level: number): Lesson[] => lessons.filter((l) => l.level === level);
/** Events that fire after the month closes for this sub-section. */
export const eventsAfter = (subSectionId: string): LifeEvent[] => events.filter((e) => e.after === subSectionId);

/** i18n key helper following the house convention: lesson.1_1.<part>. */
export const lessonKey = (id: string, part: string) => `lesson.${id.replace('.', '_')}.${part}`;
export const termKey = (id: string, layer: 'simple' | 'life' | 'real' | 'maths') => `term.${id}.${layer}`;
