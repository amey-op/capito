/**
 * Every computed number quoted in the Level 3 lessons must match what finance.ts and
 * economy.config.ts produce. If a number in the config changes, these tests show which
 * sentences need rewriting.
 */
import { describe, expect, it } from 'vitest';
import { lessonsForLevel } from '@/content';
import { merged } from '@/content/i18n';
import { economy } from '@/core/economy.config';
import { monthsCovered, rdMaturity } from '@/core/finance';
import { formatINR, formatPct } from '@/core/format';

const en = merged.resources.en ?? {};
const { rates, insurance, credit, rd, referenceMonthlyNeed } = economy;

const REPAIR = 2800;
const INSTALMENT = 500;
const MONTHS = 6;
const maturity = rdMaturity(INSTALMENT, rates.rdPa, MONTHS);
const lenderMonth = formatINR((REPAIR * credit.moneylenderPctPerMonth) / 100);
const month = formatINR(referenceMonthlyNeed);

/** [i18n key, text it must contain] */
const checks: Array<[string, string]> = [
  ['lesson.3_1.gut.a.result', `${credit.moneylenderPctPerMonth}% a month`],
  ['lesson.3_1.gut.a.result', lenderMonth],
  ['lesson.3_1.c3.text', `one month is counted as ${month}`],
  ['lesson.3_1.c3.reveal.answer', `₹4,500 ÷ ${month}`],
  ['lesson.3_1.q3.prompt', `one month is counted as ${month}`],
  ['lesson.3_1.q3.right', `₹6,000 ÷ ${month} = 2 months`],
  ['lesson.3_2.c7.text', `${formatINR(insurance.healthPremiumPerMonth)} a month`],
  ['lesson.3_2.c7.text', formatINR(insurance.healthPremiumPerMonth * 12)],
  ['lesson.3_2.c7.text', `you pay ${formatINR(insurance.illnessCoPay)}`],
  ['lesson.3_2.effect', `${formatINR(insurance.healthPremiumPerMonth)} every month`],
  ['lesson.3_2.effect', `to ${formatINR(insurance.illnessCoPay)}`],
  ['lesson.3_3.gut.prompt', `${formatPct(rates.rdPa)} a year`],
  ['lesson.3_3.gut.a.result', formatINR(maturity)],
  ['lesson.3_3.c3.reveal.prompt', `${formatPct(rates.rdPa)} a year`],
  ['lesson.3_3.c3.reveal.answer', formatINR(maturity)],
  ['lesson.3_3.c3.reveal.answer', formatINR(maturity - INSTALMENT * MONTHS)],
  ['lesson.3_3.c5.text', `the fee is ${formatINR(rd.missedInstalmentFee)}`],
  ['term.recurringDeposit.life', formatINR(maturity)],
];

describe('numbers quoted in Level 3 come from the formulas', () => {
  it.each(checks)('%s contains "%s"', (key, expected) => {
    expect(en[key], `missing text for ${key}`).toBeDefined();
    expect(en[key]).toContain(expected);
  });

  it('the months-covered examples match the meter', () => {
    expect(monthsCovered(4500)).toBe(1.5);
    expect(monthsCovered(6000)).toBe(2);
  });

  it('the RD example uses a tenure the game offers, and its tool opens on the same numbers', () => {
    expect(economy.clock.rdTenuresMonths).toContain(MONTHS);
    const lesson = lessonsForLevel(3).find((l) => l.id === '3.3')!;
    expect(lesson.tool).toEqual({ id: 'rd', prefill: { instalment: INSTALMENT, ratePct: rates.rdPa, months: MONTHS } });
  });
});

describe('Level 3 lessons', () => {
  const mine = Object.entries(en).filter(([k]) => /^lesson\.3_/.test(k));

  it('all three sub-sections are present', () => {
    expect(lessonsForLevel(3).map((l) => l.id)).toEqual(['3.1', '3.2', '3.3']);
  });

  it('never uses recommending words', () => {
    const banned = /\b(best|better|first choice|you should (buy|invest|open))\b/i;
    expect(mine.filter(([, v]) => banned.test(v)).map(([k]) => k)).toEqual([]);
  });

  it('insurance plans are compared in neutral words', () => {
    expect(en['lesson.3_2.c5.text']).toBe(
      'Term plans pay only if the insured person dies. Endowment plans also pay a maturity amount, but usually cost more for the same cover.',
    );
  });

  it('the reference month is labelled as an assumption', () => {
    expect(en['lesson.3_1.c3.text']).toContain('assumption');
  });
});
