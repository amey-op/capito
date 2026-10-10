/**
 * The 29 sub-sections (docs/CONTENT.md §3–4): id, level and tier.
 * The home level map and the content test use this list; a lesson file must match its entry.
 */
export interface CurriculumEntry {
  id: string;
  level: number;
  tier: 'must' | 'should';
}

const entry = (id: string, tier: 'must' | 'should'): CurriculumEntry => ({
  id,
  level: Number(id.split('.')[0]),
  tier,
});

export const curriculum: CurriculumEntry[] = [
  entry('1.1', 'must'),
  entry('1.2', 'must'),
  entry('1.3', 'must'),
  entry('1.4', 'must'),
  entry('2.1', 'must'),
  entry('2.2', 'must'),
  entry('2.3', 'should'),
  entry('3.1', 'must'),
  entry('3.2', 'should'),
  entry('3.3', 'must'),
  entry('4.1', 'must'),
  entry('4.2', 'must'),
  entry('4.3', 'must'),
  entry('4.4', 'should'),
  entry('5.1', 'must'),
  entry('5.2', 'must'),
  entry('5.3', 'must'),
  entry('6.1', 'must'),
  entry('6.2', 'must'),
  entry('6.3', 'must'),
  entry('6.4', 'must'),
  entry('6.5', 'should'),
  entry('7.1', 'must'),
  entry('7.2', 'should'),
  entry('7.3', 'should'),
  entry('8.1', 'must'),
  entry('8.2', 'must'),
  entry('8.3', 'must'),
  entry('9.1', 'must'),
];

export const curriculumById = new Map(curriculum.map((c) => [c.id, c]));
export const levels = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
