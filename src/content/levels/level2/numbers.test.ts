/**
 * Every computed number quoted in the Level 2 lessons must match what finance.ts and
 * economy.config.ts produce. If a number in the config changes, these tests show which
 * sentences need rewriting.
 */
import { describe, expect, it } from 'vitest';
import { lessonsForLevel } from '@/content';
import { merged } from '@/content/i18n';
import { economy } from '@/core/economy.config';
import { savingsMonthInterest, simpleInterestTotal } from '@/core/finance';
import { formatINR, formatPct } from '@/core/format';

const en = merged.resources.en ?? {};
const { rates, accountB } = economy;

const AMOUNT = 3000;
const yearInterest = (ratePa: number) => simpleInterestTotal(AMOUNT, ratePa, 1) - AMOUNT;
const accA = formatINR(yearInterest(rates.accountAPa));
const accB = formatINR(yearInterest(rates.accountBPa));
const feeYear = formatINR(accountB.feePerQuarter * 4);

/** [i18n key, text it must contain] */
const checks: Array<[string, string]> = [
  ['lesson.2_1.c2.reveal.prompt', `${formatPct(rates.savingsPa)} a year`],
  ['lesson.2_1.c2.reveal.answer', formatINR(savingsMonthInterest(AMOUNT), 2)],
  ['lesson.2_1.effect', `${formatPct(rates.savingsPa)} a year`],
  ['term.interest.life', formatINR(savingsMonthInterest(AMOUNT), 2)],
  ['lesson.2_3.gut.prompt', `${formatPct(rates.accountAPa)} interest a year`],
  ['lesson.2_3.gut.prompt', `${formatPct(rates.accountBPa)} a year`],
  ['lesson.2_3.gut.prompt', `${formatINR(accountB.feePerQuarter)} every three months`],
  ['lesson.2_3.gut.prompt', `under ${formatINR(accountB.minimumBalance)}`],
  ['lesson.2_3.gut.a.result', accA],
  ['lesson.2_3.gut.b.result', accB],
  ['lesson.2_3.gut.b.result', feeYear],
  ['lesson.2_3.c5.text', accA],
  ['lesson.2_3.c5.text', accB],
  ['lesson.2_3.c5.text', feeYear],
  ['lesson.2_3.q3.prompt', accB],
  ['lesson.2_3.q3.prompt', feeYear],
];

describe('numbers quoted in Level 2 come from the formulas', () => {
  it.each(checks)('%s contains "%s"', (key, expected) => {
    expect(en[key], `missing text for ${key}`).toBeDefined();
    expect(en[key]).toContain(expected);
  });

  it('Account B really does leave ₹3,000 worse off than Account A', () => {
    expect(yearInterest(rates.accountBPa) - accountB.feePerQuarter * 4).toBeLessThan(yearInterest(rates.accountAPa));
    expect(AMOUNT).toBeLessThan(accountB.minimumBalance);
  });
});

describe('Level 2 lessons', () => {
  const mine = Object.entries(en).filter(([k]) => /^lesson\.2_/.test(k));

  it('all three sub-sections are present', () => {
    expect(lessonsForLevel(2).map((l) => l.id)).toEqual(['2.1', '2.2', '2.3']);
  });

  it('never uses recommending words', () => {
    const banned = /\b(best|better|first choice|you should (buy|invest|open))\b/i;
    expect(mine.filter(([, v]) => banned.test(v)).map(([k]) => k)).toEqual([]);
  });

  it('the deposit-insurance limit is not quoted while it is unverified', () => {
    expect(mine.filter(([, v]) => /5 lakh/.test(v)).map(([k]) => k)).toEqual([]);
    expect(lessonsForLevel(2)[0]!.facts).toContainEqual({ key: 'dicgc.limit_5_lakh', verified: false });
  });

  it('the PIN rule is stated in the lesson, the quiz and the Word Bank', () => {
    expect(en['lesson.2_2.c4.reveal.answer']).toContain('A PIN only ever sends money out');
    expect(en['lesson.2_2.q1.right']).toContain('A PIN only ever sends money');
    expect(en['term.upiPin.real']).toContain('never to receive');
  });
});
