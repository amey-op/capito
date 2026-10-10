/** The final quiz is our evidence of learning, so its answers and numbers are checked here. */
import { describe, expect, it } from 'vitest';
import { lessonById } from '@/content';
import { merged } from '@/content/i18n';
import { loanTotals, realReturnPct } from '@/core/finance';
import { formatINR } from '@/core/format';

const en = merged.resources.en ?? {};
const final = lessonById.get('9.1')!.finalQuiz!;
const text = (id: string, part: string) => en[`lesson.9_1.${id}.${part}`] ?? '';

describe('9.1 final quiz', () => {
  it('has ten questions of both kinds', () => {
    expect(final).toHaveLength(10);
    expect(final.filter((q) => q.type === 'single').length).toBeGreaterThanOrEqual(4);
    expect(final.filter((q) => q.type === 'trueFalse').length).toBeGreaterThanOrEqual(3);
  });

  it('cannot be passed by giving the same answer every time', () => {
    const tf = final.filter((q) => q.type === 'trueFalse').map((q) => q.correct);
    const single = final.filter((q) => q.type === 'single').map((q) => q.correct);
    expect(new Set(single).size).toBeGreaterThan(1);
    // Every true/false statement here is a common myth, so the feedback has to say why it is false.
    for (const q of final.filter((x) => x.type === 'trueFalse')) {
      expect(q.correct).toBe(false);
      expect(text(q.id, 'right')).toContain("it's false");
      expect(text(q.id, 'wrong')).toContain("It's false");
    }
    expect(tf.length + single.length).toBe(10);
  });

  it('every answer teaches: feedback is a full sentence, never "review level N"', () => {
    for (const q of final) {
      for (const part of ['right', 'wrong']) {
        expect(text(q.id, part).length, `${q.id}.${part}`).toBeGreaterThan(40);
        expect(text(q.id, part)).not.toMatch(/review level/i);
      }
    }
  });

  it('the loan question quotes the numbers the formulas give', () => {
    const loan = loanTotals(6000, 18, 6);
    expect(text('fq4', 'prompt')).toContain(formatINR(loan.emi));
    expect(text('fq4', 'prompt')).toContain(formatINR(loan.totalPaid));
    expect(text('fq4', 'o1')).toContain(formatINR(loan.extra));
    expect(final[3]!.correct).toBe(0);
  });

  it('the inflation question matches the real-return formula', () => {
    expect(realReturnPct(3, 6)).toBe(-3);
    expect(text('fq6', 'right')).toContain('−3%');
    expect(final[5]!.correct).toBe(1);
  });

  it('uses no recommending words', () => {
    const mine = Object.entries(en).filter(([k]) => k.startsWith('lesson.9_1.'));
    expect(mine.filter(([, v]) => /\b(best|better|you should (buy|invest))\b/i.test(v)).map(([k]) => k)).toEqual([]);
  });
});
