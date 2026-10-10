import { ToolDef, ConfigToolId } from '../../core/tools';
import * as finance from '../../core/finance';
import { economy } from '../../core/economy.config';

export const toolRegistry: Record<ConfigToolId, ToolDef> = {
  leakFinder: {
    id: 'leakFinder',
    titleKey: 'tools.leakFinder.title',
    hasReturns: false,
    inputs: [
      { id: 'perDay', labelKey: 'tools.leakFinder.perDay', unit: 'inr', min: 0, max: 1000, step: 10, default: 40 },
      { id: 'daysPerYear', labelKey: 'tools.leakFinder.daysPerYear', unit: 'days', min: 1, max: 365, step: 1, default: 365 },
    ],
    compute: (values) => {
      const perYear = finance.leakPerYear(values.perDay, values.daysPerYear);
      return {
        results: [{ id: 'perYear', labelKey: 'tools.leakFinder.perYear', value: perYear, unit: 'inr', tone: 'bad' }],
        shocker: { perYear, bags: Math.floor(perYear / 3000) },
      };
    },
  },
  goalPlanner: {
    id: 'goalPlanner',
    titleKey: 'tools.goalPlanner.title',
    hasReturns: false,
    inputs: [
      { id: 'target', labelKey: 'tools.goalPlanner.target', unit: 'inr', min: 0, max: 100000, step: 100, default: 3000 },
      { id: 'months', labelKey: 'tools.goalPlanner.months', unit: 'months', min: 1, max: 60, step: 1, default: 6 },
      { id: 'delayMonths', labelKey: 'tools.goalPlanner.delayMonths', unit: 'months', min: 0, max: 59, step: 1, default: 0 },
    ],
    compute: (values) => {
      const { target, months, delayMonths } = values;
      const delayed = Math.max(1, months - delayMonths);
      const monthly = finance.goalSavingMonthly(target, months);
      const monthlyIfLate = finance.goalSavingMonthly(target, delayed);
      return {
        results: [
          { id: 'monthly', labelKey: 'tools.goalPlanner.monthly', value: monthly, unit: 'inr', tone: 'good' },
          { id: 'monthlyIfLate', labelKey: 'tools.goalPlanner.monthlyIfLate', value: monthlyIfLate, unit: 'inr', tone: 'mixed' },
        ],
        shocker: { monthlyIfLate, extra: monthlyIfLate - monthly },
      };
    },
  },
  depreciation: {
    id: 'depreciation',
    titleKey: 'tools.depreciation.title',
    hasReturns: false,
    inputs: [
      { id: 'cost', labelKey: 'tools.depreciation.cost', unit: 'inr', min: 0, max: 100000, step: 500, default: 6000 },
      { id: 'yearlyLossPct', labelKey: 'tools.depreciation.yearlyLossPct', unit: 'pct', min: 0, max: 100, step: 1, default: 30 },
      { id: 'months', labelKey: 'tools.depreciation.months', unit: 'months', min: 0, max: 60, step: 1, default: 6 },
    ],
    compute: (values) => {
      const val = finance.depreciatedValue(values.cost, values.yearlyLossPct, values.months);
      const lost = values.cost - val;
      return {
        results: [
          { id: 'valueNow', labelKey: 'tools.depreciation.valueNow', value: val, unit: 'inr', tone: 'mixed' },
          { id: 'lostAmount', labelKey: 'tools.depreciation.lostAmount', value: lost, unit: 'inr', tone: 'bad' },
        ],
        shocker: { lost, cost: values.cost },
      };
    },
  },
  emi: {
    id: 'emi',
    titleKey: 'tools.emi.title',
    hasReturns: false,
    inputs: [
      { id: 'principal', labelKey: 'tools.emi.principal', unit: 'inr', min: 0, max: 100000, step: 500, default: 6000 },
      { id: 'ratePct', labelKey: 'tools.emi.ratePct', unit: 'pct', min: 0, max: 50, step: 1, default: 18 },
      { id: 'months', labelKey: 'tools.emi.months', unit: 'months', min: 1, max: 60, step: 1, default: 6 },
      { id: 'cashPrice', labelKey: 'tools.emi.cashPrice', unit: 'inr', min: 0, max: 100000, step: 500, default: 0 },
    ],
    compute: (values) => {
      const { principal, ratePct, months, cashPrice } = values;
      const cp = cashPrice > 0 ? cashPrice : undefined;
      const res = finance.loanTotals(principal, ratePct, months, cp);
      const results = [
        { id: 'emi', labelKey: 'tools.emi.emi', value: res.emi, unit: 'inr' as const, tone: 'neutral' as const },
        { id: 'totalPaid', labelKey: 'tools.emi.totalPaid', value: res.totalPaid, unit: 'inr' as const, tone: 'bad' as const },
        { id: 'extraCost', labelKey: 'tools.emi.extraCost', value: res.extra, unit: 'inr' as const, tone: 'bad' as const },
      ];
      if (cp !== undefined) {
        results.push({ id: 'extraVsCash', labelKey: 'tools.emi.extraVsCash', value: res.extraVsCash!, unit: 'inr' as const, tone: 'bad' as const });
      }
      return {
        results,
        shocker: { extra: res.extra },
      };
    },
  },
  inflation: {
    id: 'inflation',
    titleKey: 'tools.inflation.title',
    hasReturns: false,
    inputs: [
      { id: 'amount', labelKey: 'tools.inflation.amount', unit: 'inr', min: 0, max: 10000000, step: 10000, default: 1000000 },
      { id: 'inflationPct', labelKey: 'tools.inflation.inflationPct', unit: 'pct', min: 0, max: 20, step: 1, default: 7 },
      { id: 'years', labelKey: 'tools.inflation.years', unit: 'years', min: 1, max: 50, step: 1, default: 10 },
    ],
    compute: (values) => {
      const { amount, inflationPct, years } = values;
      const power = finance.purchasingPower(amount, inflationPct, years);
      const lostPct = ((amount - power) / amount) * 100;
      const r70 = finance.ruleOf70(inflationPct);
      return {
        results: [
          { id: 'buyingPower', labelKey: 'tools.inflation.buyingPower', value: power, unit: 'inr', tone: 'bad' },
          { id: 'lostPct', labelKey: 'tools.inflation.lostPct', value: lostPct, unit: 'pct', tone: 'bad' },
          { id: 'ruleOf70', labelKey: 'tools.inflation.ruleOf70', value: r70, unit: 'years', tone: 'neutral' },
        ],
        shocker: { power },
      };
    },
  },
  timeMachine: {
    id: 'timeMachine',
    titleKey: 'tools.timeMachine.title',
    hasReturns: true,
    inputs: [
      { id: 'monthly', labelKey: 'tools.timeMachine.monthly', unit: 'inr', min: 0, max: 50000, step: 500, default: 500 },
      { id: 'ratePct', labelKey: 'tools.timeMachine.ratePct', unit: 'pct', min: 0, max: 20, step: 1, default: 10 },
      { id: 'years', labelKey: 'tools.timeMachine.years', unit: 'years', min: 1, max: 40, step: 1, default: 20 },
      { id: 'delayYears', labelKey: 'tools.timeMachine.delayYears', unit: 'years', min: 1, max: 30, step: 1, default: 2 },
    ],
    compute: (values) => {
      const { monthly, ratePct, years, delayYears } = values;
      const startNow = finance.sipFutureValue(monthly, ratePct, years * 12);
      const delayedYears = Math.max(0, years - delayYears);
      const startLater = finance.sipFutureValue(monthly, ratePct, delayedYears * 12);
      const gap = startNow - startLater;
      const series = [];
      for (let y = 0; y <= years; y++) {
        series.push({
          x: y,
          startNow: finance.sipFutureValue(monthly, ratePct, y * 12),
          startLater: y >= delayYears ? finance.sipFutureValue(monthly, ratePct, (y - delayYears) * 12) : 0,
        });
      }
      return {
        results: [
          { id: 'startNow', labelKey: 'tools.timeMachine.startNow', value: startNow, unit: 'inr', tone: 'good' },
          { id: 'startLater', labelKey: 'tools.timeMachine.startLater', value: startLater, unit: 'inr', tone: 'mixed' },
          { id: 'gap', labelKey: 'tools.timeMachine.gap', value: gap, unit: 'inr', tone: 'bad' },
        ],
        series,
        shocker: { gap, delayYears },
      };
    },
  },
  fd: {
    id: 'fd',
    titleKey: 'tools.fd.title',
    hasReturns: true,
    inputs: [
      { id: 'principal', labelKey: 'tools.fd.principal', unit: 'inr', min: 0, max: 100000, step: 500, default: 6000 },
      { id: 'ratePct', labelKey: 'tools.fd.ratePct', unit: 'pct', min: 0, max: 15, step: 0.5, default: 6.5 },
      { id: 'months', labelKey: 'tools.fd.months', unit: 'months', min: 1, max: 60, step: 1, default: 6 },
      { id: 'inflationPct', labelKey: 'tools.fd.inflationPct', unit: 'pct', min: 0, max: 15, step: 0.5, default: 0 },
    ],
    compute: (values) => {
      const { principal, ratePct, months, inflationPct } = values;
      const maturity = finance.fdMaturity(principal, ratePct, months);
      const interest = maturity - principal;
      const realRate = finance.realReturnPct(ratePct, inflationPct);
      return {
        results: [
          { id: 'maturity', labelKey: 'tools.fd.maturity', value: maturity, unit: 'inr', tone: 'good' },
          { id: 'interest', labelKey: 'tools.fd.interest', value: interest, unit: 'inr', tone: 'good' },
          { id: 'realRate', labelKey: 'tools.fd.realRate', value: realRate, unit: 'pct', tone: realRate > 0 ? 'good' : 'bad' },
        ],
        shocker: { interest },
      };
    },
  },
  rd: {
    id: 'rd',
    titleKey: 'tools.rd.title',
    hasReturns: true,
    inputs: [
      { id: 'instalment', labelKey: 'tools.rd.instalment', unit: 'inr', min: 0, max: 50000, step: 100, default: 500 },
      { id: 'ratePct', labelKey: 'tools.rd.ratePct', unit: 'pct', min: 0, max: 15, step: 0.5, default: 6.5 },
      { id: 'months', labelKey: 'tools.rd.months', unit: 'months', min: 1, max: 60, step: 1, default: 6 },
    ],
    compute: (values) => {
      const { instalment, ratePct, months } = values;
      const maturity = finance.rdMaturity(instalment, ratePct, months);
      const invested = instalment * months;
      const interest = maturity - invested;
      return {
        results: [
          { id: 'maturity', labelKey: 'tools.rd.maturity', value: maturity, unit: 'inr', tone: 'good' },
          { id: 'invested', labelKey: 'tools.rd.invested', value: invested, unit: 'inr', tone: 'neutral' },
          { id: 'interest', labelKey: 'tools.rd.interest', value: interest, unit: 'inr', tone: 'good' },
        ],
        shocker: { maturity },
      };
    },
  },
  sip: {
    id: 'sip',
    titleKey: 'tools.sip.title',
    hasReturns: true,
    inputs: [
      { id: 'monthly', labelKey: 'tools.sip.monthly', unit: 'inr', min: 0, max: 50000, step: 500, default: 10000 },
      { id: 'ratePct', labelKey: 'tools.sip.ratePct', unit: 'pct', min: 0, max: 30, step: 1, default: 10 },
      { id: 'years', labelKey: 'tools.sip.years', unit: 'years', min: 1, max: 40, step: 1, default: 15 },
    ],
    compute: (values) => {
      const { monthly, ratePct, years } = values;
      const res = finance.sipTotals(monthly, ratePct, years * 12);
      const rawSeries = finance.sipSeries(monthly, ratePct, years);
      const series = rawSeries.map(p => ({ x: p.year, invested: p.invested, value: p.value }));
      return {
        results: [
          { id: 'invested', labelKey: 'tools.sip.invested', value: res.invested, unit: 'inr', tone: 'neutral' },
          { id: 'returns', labelKey: 'tools.sip.returns', value: res.returns, unit: 'inr', tone: 'good' },
          { id: 'total', labelKey: 'tools.sip.total', value: res.value, unit: 'inr', tone: 'good' },
        ],
        series,
        shocker: { total: res.value },
      };
    },
  },
  lumpsum: {
    id: 'lumpsum',
    titleKey: 'tools.lumpsum.title',
    hasReturns: true,
    inputs: [
      { id: 'principal', labelKey: 'tools.lumpsum.principal', unit: 'inr', min: 0, max: 10000000, step: 1000, default: 100000 },
      { id: 'ratePct', labelKey: 'tools.lumpsum.ratePct', unit: 'pct', min: 0, max: 30, step: 1, default: 12 },
      { id: 'years', labelKey: 'tools.lumpsum.years', unit: 'years', min: 1, max: 40, step: 1, default: 10 },
    ],
    compute: (values) => {
      const { principal, ratePct, years } = values;
      const finalValue = finance.lumpsumFutureValue(principal, ratePct, years);
      const r72 = finance.ruleOf72(ratePct);
      return {
        results: [
          { id: 'finalValue', labelKey: 'tools.lumpsum.finalValue', value: finalValue, unit: 'inr', tone: 'good' },
          { id: 'ruleOf72', labelKey: 'tools.lumpsum.ruleOf72', value: r72, unit: 'years', tone: 'neutral' },
        ],
        shocker: { r72 },
      };
    },
  },
  goalSip: {
    id: 'goalSip',
    titleKey: 'tools.goalSip.title',
    hasReturns: true,
    inputs: [
      { id: 'target', labelKey: 'tools.goalSip.target', unit: 'inr', min: 0, max: 10000000, step: 10000, default: 1000000 },
      { id: 'ratePct', labelKey: 'tools.goalSip.ratePct', unit: 'pct', min: 0, max: 30, step: 1, default: 12 },
      { id: 'years', labelKey: 'tools.goalSip.years', unit: 'years', min: 1, max: 40, step: 1, default: 10 },
    ],
    compute: (values) => {
      const { target, ratePct, years } = values;
      const months = years * 12;
      const sipNeeded = finance.goalSipMonthly(target, ratePct, months);
      const noReturns = finance.goalSavingMonthly(target, months);
      return {
        results: [
          { id: 'sipNeeded', labelKey: 'tools.goalSip.sipNeeded', value: sipNeeded, unit: 'inr', tone: 'good' },
          { id: 'noReturns', labelKey: 'tools.goalSip.noReturns', value: noReturns, unit: 'inr', tone: 'neutral' },
        ],
        shocker: { diff: noReturns - sipNeeded },
      };
    },
  },
  feeLens: {
    id: 'feeLens',
    titleKey: 'tools.feeLens.title',
    hasReturns: true,
    inputs: [
      { id: 'monthly', labelKey: 'tools.feeLens.monthly', unit: 'inr', min: 0, max: 50000, step: 500, default: 5000 },
      { id: 'ratePct', labelKey: 'tools.feeLens.ratePct', unit: 'pct', min: 0, max: 30, step: 0.5, default: 12 },
      { id: 'feeGapPct', labelKey: 'tools.feeLens.feeGapPct', unit: 'pct', min: 0, max: 5, step: 0.1, default: 1 },
      { id: 'years', labelKey: 'tools.feeLens.years', unit: 'years', min: 1, max: 40, step: 1, default: 20 },
    ],
    compute: (values) => {
      const { monthly, ratePct, feeGapPct, years } = values;
      const corpusA = finance.sipFutureValue(monthly, ratePct, years * 12);
      const corpusB = finance.sipFutureValue(monthly, Math.max(0, ratePct - feeGapPct), years * 12);
      const gap = corpusA - corpusB;
      const series = [];
      for(let y=0; y<=years; y++) {
        series.push({
          x: y,
          corpusA: finance.sipFutureValue(monthly, ratePct, y * 12),
          corpusB: finance.sipFutureValue(monthly, Math.max(0, ratePct - feeGapPct), y * 12),
        });
      }
      return {
        results: [
          { id: 'corpusA', labelKey: 'tools.feeLens.corpusA', value: corpusA, unit: 'inr', tone: 'good' },
          { id: 'corpusB', labelKey: 'tools.feeLens.corpusB', value: corpusB, unit: 'inr', tone: 'mixed' },
          { id: 'gap', labelKey: 'tools.feeLens.gap', value: gap, unit: 'inr', tone: 'bad' },
        ],
        series,
        shocker: { gap },
      };
    },
  },
  goldCompare: {
    id: 'goldCompare',
    titleKey: 'tools.goldCompare.title',
    hasReturns: false,
    inputs: [
      { id: 'amount', labelKey: 'tools.goldCompare.amount', unit: 'inr', min: 0, max: 100000, step: 1000, default: 3000 },
      { id: 'makingChargePct', labelKey: 'tools.goldCompare.makingChargePct', unit: 'pct', min: 0, max: 30, step: 1, default: 8 },
      { id: 'etfCostPct', labelKey: 'tools.goldCompare.etfCostPct', unit: 'pct', min: 0, max: 5, step: 0.1, default: 0.5 },
    ],
    compute: (values) => {
      const { amount, makingChargePct, etfCostPct } = values;
      const physical = finance.valueAfterCost(amount, makingChargePct);
      const etf = finance.valueAfterCost(amount, etfCostPct);
      const diff = etf - physical;
      return {
        results: [
          { id: 'physical', labelKey: 'tools.goldCompare.physical', value: physical, unit: 'inr', tone: 'mixed' },
          { id: 'etf', labelKey: 'tools.goldCompare.etf', value: etf, unit: 'inr', tone: 'good' },
          { id: 'difference', labelKey: 'tools.goldCompare.difference', value: diff, unit: 'inr', tone: 'bad' },
        ],
        shocker: { diff },
      };
    },
  },
  slab: {
    id: 'slab',
    titleKey: 'tools.slab.title',
    hasReturns: false,
    approximate: true,
    inputs: [
      { id: 'income', labelKey: 'tools.slab.income', unit: 'inr', min: 0, max: 5000000, step: 10000, default: 600000 },
      { id: 'standardDeduction', labelKey: 'tools.slab.standardDeduction', unit: 'inr', min: 0, max: 100000, step: 1000, default: economy.taxSlabs.standardDeductionSalaried },
    ],
    compute: (values) => {
      const { income, standardDeduction } = values;
      const taxable = Math.max(0, income - standardDeduction);
      const tax = finance.slabTax(taxable, economy.taxSlabs.slabs, economy.taxSlabs.rebateUpTo);
      const effectiveRate = income > 0 ? (tax / income) * 100 : 0;
      return {
        results: [
          { id: 'taxable', labelKey: 'tools.slab.taxable', value: taxable, unit: 'inr', tone: 'neutral' },
          { id: 'tax', labelKey: 'tools.slab.tax', value: tax, unit: 'inr', tone: 'bad' },
          { id: 'effectiveRate', labelKey: 'tools.slab.effectiveRate', value: effectiveRate, unit: 'pct', tone: 'neutral' },
        ],
        shocker: { tax },
      };
    },
  },
  takeHome: {
    id: 'takeHome',
    titleKey: 'tools.takeHome.title',
    hasReturns: false,
    approximate: true,
    inputs: [
      { id: 'grossMonthly', labelKey: 'tools.takeHome.grossMonthly', unit: 'inr', min: 0, max: 500000, step: 1000, default: 30000 },
      { id: 'retirementPct', labelKey: 'tools.takeHome.retirementPct', unit: 'pct', min: 0, max: 30, step: 1, default: 12 },
      { id: 'taxMonthly', labelKey: 'tools.takeHome.taxMonthly', unit: 'inr', min: 0, max: 100000, step: 500, default: 0 },
    ],
    compute: (values) => {
      const { grossMonthly, retirementPct, taxMonthly } = values;
      const inHand = finance.takeHome(grossMonthly, retirementPct, taxMonthly);
      const deductions = grossMonthly - inHand;
      return {
        results: [
          { id: 'inHand', labelKey: 'tools.takeHome.inHand', value: inHand, unit: 'inr', tone: 'good' },
          { id: 'deductions', labelKey: 'tools.takeHome.deductions', value: deductions, unit: 'inr', tone: 'bad' },
        ],
        shocker: { inHand },
      };
    },
  },
};
