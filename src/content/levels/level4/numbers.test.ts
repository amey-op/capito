/**
 * Every computed number quoted in the Level 4–6 lessons and in the life events must match what
 * finance.ts and economy.config.ts produce ([CALC] rule, docs/WORKFLOW.md §5). If a number in the
 * config changes, these tests show which sentences need rewriting.
 */
import { describe, expect, it } from 'vitest';
import { merged } from '@/content/i18n';
import { economy } from '@/core/economy.config';
import {
  applyPctSteps,
  emi,
  fdEarlyBreak,
  fdMaturity,
  flatToEffectiveRate,
  futurePrice,
  loanAppCost,
  loanTotals,
  lumpsumFutureValue,
  purchasingPower,
  realReturnPct,
  ruleOf70,
  ruleOf72,
  savingsMonthInterest,
  simpleInterestTotal,
  sipFutureValue,
  valueAfterCost,
} from '@/core/finance';
import { formatINR, formatINRCompact } from '@/core/format';

const en = merged.resources.en ?? {};
const inr = formatINR;
const lakh = formatINRCompact;
const { rates, gold, credit, scenarios, market } = economy;

const savingsAfter = (amount: number, months: number) =>
  Array.from({ length: months }).reduce<number>((v) => v + savingsMonthInterest(v), amount);
const bumpyShares = (years: number) => applyPctSteps(1000, scenarios.bumpy.shares.slice(0, years));

/** [i18n key, text it must contain] */
const checks: Array<[string, string]> = [
  // 4.1 Loans and EMIs
  ['lesson.4_1.c4.reveal.answer', inr(emi(6000, 18, 6))],
  ['lesson.4_1.c4.reveal.answer', inr(loanTotals(6000, 18, 6).totalPaid)],
  ['lesson.4_1.c4.reveal.answer', inr(loanTotals(6000, 18, 6).extra)],
  ['lesson.4_1.c5.reveal.answer', `${Math.round(flatToEffectiveRate(9, 12))}%`],
  ['lesson.4_1.gut.a.result', inr(6 * 1000 - 5500)],
  // 4.3 Credit score: the offer table, the starting score and the score changes
  ...credit.offers.map((o): [string, string] => ['lesson.4_3.c6.text', `${inr(o.maxAmount)} at ${o.ratePa}%`]),
  ['lesson.4_3.c6.text', `Under ${credit.declineBelow}`],
  ['lesson.4_3.c2.text', `${credit.min} to ${credit.max}`],
  ['lesson.4_3.c3.text', String(credit.start)],
  ['lesson.4_3.c4.reveal.answer', `${credit.deltas.onTimeEmi} points`],
  ['lesson.4_3.c4.reveal.answer', `${credit.deltas.paidOffOnSchedule} more`],
  ['lesson.4_3.c5.sort.feedback', `${-credit.deltas.missedEmi} points`],
  ['lesson.4_3.c5.sort.feedback', inr(credit.lateFee)],
  ['lesson.4_3.c7.text', inr(emi(6000, 14, 6))],
  ['lesson.4_3.c7.text', inr(emi(6000, 22, 6))],
  ['lesson.4_3.gut.b.result', `${inr(credit.offers[0].maxAmount)} at ${credit.offers[0].ratePa}%`],
  // 4.4 Informal borrowing
  ['lesson.4_4.c3.reveal.answer', `${credit.moneylenderPctPerMonth * 12}%`],
  ['lesson.4_4.c3.reveal.answer', inr((2800 * credit.moneylenderPctPerMonth) / 100)],
  // 5.1 Inflation
  ['lesson.5_1.gut.b.result', inr(futurePrice(15, 6, 10))],
  ['lesson.5_1.c3.reveal.answer', lakh(purchasingPower(1000000, 7, 10))],
  ['lesson.5_1.c4.reveal.answer', `${ruleOf70(7)} years`],
  ['lesson.5_1.c5.reveal.answer', `${realReturnPct(6.5, 6)}%`],
  // 5.2 Simple and compound interest
  ['lesson.5_2.gut.a.result', inr(sipFutureValue(500, 8, 120))],
  ['lesson.5_2.gut.b.result', inr(sipFutureValue(500, 8, 96))],
  ['lesson.5_2.gut.b.result', inr(sipFutureValue(500, 8, 120) - sipFutureValue(500, 8, 96))],
  ['lesson.5_2.c2.reveal.answer', inr(simpleInterestTotal(1000, 10, 20))],
  ['lesson.5_2.c3.reveal.answer', inr(lumpsumFutureValue(1000, 10, 20))],
  ['lesson.5_2.c4.reveal.answer', `72 ÷ 8 = ${ruleOf72(8)} years`],
  ['lesson.5_2.c4.reveal.answer', `72 ÷ 6 = ${ruleOf72(6)} years`],
  // 5.3 Fixed deposits
  ['lesson.5_3.gut.a.result', inr(fdMaturity(6000, rates.fdPa, 6))],
  ['lesson.5_3.gut.a.result', `${rates.fdPa}%`],
  ['lesson.5_3.gut.b.result', inr(savingsAfter(6000, 6))],
  ['lesson.5_3.c2.reveal.answer', inr(fdMaturity(6000, rates.fdPa, 6))],
  ['lesson.5_3.c3.reveal.answer', inr(fdEarlyBreak(6000, 3))],
  ['lesson.5_3.c6.text', `${realReturnPct(rates.fdPa, scenarios.steady.inflation[0])}%`],
  // 6.1 Risk
  ['lesson.6_1.gut.a.result', inr(applyPctSteps(6000, [scenarios.crashYear.shares[0]]))],
  // 6.2 Gold
  ['lesson.6_2.gut.a.result', inr(valueAfterCost(3000, gold.physicalMakingChargePct))],
  ['lesson.6_2.gut.b.result', inr(valueAfterCost(3000, gold.etfCostPct))],
  ['lesson.6_2.c5.reveal.answer', inr(valueAfterCost(3000, gold.physicalMakingChargePct))],
  ['lesson.6_2.c5.reveal.answer', inr(valueAfterCost(3000, gold.etfCostPct))],
  ['lesson.6_2.q3.o1', inr(valueAfterCost(3000, gold.physicalMakingChargePct))],
  // 6.3 Mutual funds and SIP
  ['lesson.6_3.c7.reveal.answer', lakh(sipFutureValue(500, 12, 120))],
  ['lesson.6_3.c7.reveal.answer', lakh(sipFutureValue(500, 12, 240))],
  ['lesson.6_3.c7.reveal.answer', lakh(sipFutureValue(500, 12, 360))],
  ['lesson.6_3.c6.reveal.answer', lakh(sipFutureValue(5000, 12, 240))],
  ['lesson.6_3.c6.reveal.answer', lakh(sipFutureValue(5000, 11, 240))],
  ['lesson.6_3.c6.reveal.answer', lakh(sipFutureValue(5000, 12, 240) - sipFutureValue(5000, 11, 240))],
  // 6.4 Shares
  ['lesson.6_4.gut.a.result', inr(applyPctSteps(2000, market.episodes.tipPump.tipStock))],
  // 6.5 Options over time
  ['lesson.6_5.c3.reveal.answer', `${inr(bumpyShares(1))}, then ${inr(bumpyShares(3))}, then ${inr(bumpyShares(5))}`],
  [
    'lesson.6_5.c4.reveal.answer',
    `${inr(lumpsumFutureValue(1000, rates.fdPa, 1))}, then ${inr(lumpsumFutureValue(1000, rates.fdPa, 3))}, then ${inr(lumpsumFutureValue(1000, rates.fdPa, 5))}`,
  ],

  // Life events (docs/MECHANICS.md §7)
  ['event.e2_3.intro', `${rates.accountAPa}%`],
  ['event.e2_3.intro', `${rates.accountBPa}%`],
  ['event.e2_3.intro', inr(economy.accountB.minimumBalance)],
  ['event.e2_3.intro', inr(economy.accountB.feePerQuarter)],
  ['event.e3_1.lender.outcome', `${credit.moneylenderPctPerMonth}% a month`],
  ['event.e3_1.lender.outcome', inr((2800 * credit.moneylenderPctPerMonth) / 100)],
  ['event.e3_2.lender.outcome', inr((3500 * credit.moneylenderPctPerMonth) / 100)],
  ['event.e3_2.insured.outcome', inr(economy.insurance.illnessCoPay)],
  ['event.e3_3.skip.outcome', inr(economy.rd.missedInstalmentFee)],
  ['event.e4_3.accept.outcome', inr(loanAppCost().received)],
  ['event.e4_3.accept.outcome', inr(loanAppCost().repay)],
  ['event.e4_3.accept.why', inr(loanAppCost().cost)],
  ['event.e4_3.accept.why', `${Math.round(loanAppCost().costPctOfReceived)}%`],
  ['event.e5_1.fd.outcome', inr(fdMaturity(6000, rates.fdPa, 6))],
  ['event.e6_2.jewellery.outcome', inr(valueAfterCost(3000, gold.physicalMakingChargePct))],
  ['event.e6_2.jewellery.outcome', `${gold.physicalMakingChargePct}%`],
  ['event.e6_2.etf.outcome', inr(valueAfterCost(3000, gold.etfCostPct))],
  ['event.e6_2.etf.outcome', `${gold.etfCostPct}%`],
  ['event.e6_4.buy.later', inr(applyPctSteps(2000, market.episodes.tipPump.tipStock))],
  ['event.e6_5.title', `${Math.round(100 - applyPctSteps(100, market.episodes.crash.mf.slice(0, 2)))}%`],
  ['event.e6_5.intro', `${Math.round(100 - applyPctSteps(100, market.episodes.crash.mf.slice(0, 2)))}%`],
];

describe('numbers quoted in Levels 4–6 and the life events come from the formulas', () => {
  it.each(checks)('%s contains "%s"', (key, expected) => {
    expect(en[key], `missing text for ${key}`).toBeDefined();
    expect(en[key]).toContain(expected);
  });
});

describe('guardrails in the Level 4–6 and event text', () => {
  const mine = Object.entries(en).filter(([k]) => /^(lesson\.[456]_|event\.|term\.)/.test(k));

  it('never uses recommending words (best, better, first choice, "you should buy")', () => {
    const banned = /\b(best|better|first choice|you should (buy|invest))\b/i;
    expect(mine.filter(([, v]) => banned.test(v)).map(([k]) => k)).toEqual([]);
  });

  it('every projection at an assumed rate says it is an assumption, not a promise', () => {
    const assumed = mine.filter(([, v]) => /assumed \d+%/.test(v));
    expect(assumed.length).toBeGreaterThan(0);
    expect(assumed.filter(([, v]) => !/assumption, not a promise/i.test(v)).map(([k]) => k)).toEqual([]);
  });
});
