/**
 * The 29 sub-sections (docs/CONTENT.md §3–4): id, level, tier and owner lane.
 * The home level map and the content test use this list; a lesson file must match its entry.
 */
export type Owner = 'amey' | 'nipun' | 'aryan';

export interface CurriculumEntry {
  id: string;
  level: number;
  tier: 'must' | 'should';
  owner: Owner;
}

const entry = (id: string, tier: 'must' | 'should', owner: Owner): CurriculumEntry => ({
  id,
  level: Number(id.split('.')[0]),
  tier,
  owner,
});

export const curriculum: CurriculumEntry[] = [
  entry('1.1', 'must', 'amey'),
  entry('1.2', 'must', 'amey'),
  entry('1.3', 'must', 'amey'),
  entry('1.4', 'must', 'amey'),
  entry('2.1', 'must', 'amey'),
  entry('2.2', 'must', 'amey'),
  entry('2.3', 'should', 'amey'),
  entry('3.1', 'must', 'amey'),
  entry('3.2', 'should', 'amey'),
  entry('3.3', 'must', 'amey'),
  entry('4.1', 'must', 'nipun'),
  entry('4.2', 'must', 'nipun'),
  entry('4.3', 'must', 'nipun'),
  entry('4.4', 'should', 'nipun'),
  entry('5.1', 'must', 'nipun'),
  entry('5.2', 'must', 'nipun'),
  entry('5.3', 'must', 'nipun'),
  entry('6.1', 'must', 'nipun'),
  entry('6.2', 'must', 'nipun'),
  entry('6.3', 'must', 'nipun'),
  entry('6.4', 'must', 'nipun'),
  entry('6.5', 'should', 'nipun'),
  entry('7.1', 'must', 'aryan'),
  entry('7.2', 'should', 'aryan'),
  entry('7.3', 'should', 'aryan'),
  entry('8.1', 'must', 'aryan'),
  entry('8.2', 'must', 'aryan'),
  entry('8.3', 'must', 'aryan'),
  entry('9.1', 'must', 'aryan'),
];

export const curriculumById = new Map(curriculum.map((c) => [c.id, c]));
export const levels = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
