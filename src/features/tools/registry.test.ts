import { describe, it, expect } from 'vitest';
import { toolRegistry } from './registry';

describe('Tool Registry', () => {
  it('leakFinder logic is correct', () => {
    const out = toolRegistry.leakFinder.compute({ perDay: 40, daysPerYear: 365 });
    expect(out.results[0].value).toBe(14600);
    expect(out.shocker?.perYear).toBe('₹14,600');
  });

  it('depreciation computes lost amount', () => {
    const out = toolRegistry.depreciation.compute({ cost: 6000, yearlyLossPct: 30, months: 6 });
    // Value now ≈ 5020, lost ≈ 980
    expect(Math.round(out.results[0].value)).toBe(5020);
    expect(Math.round(out.results[1].value)).toBe(980);
  });

  it('emi calculator computes totals', () => {
    const out = toolRegistry.emi.compute({ principal: 6000, ratePct: 18, months: 6, cashPrice: 0 });
    const emiRes = out.results.find(r => r.id === 'emi')?.value || 0;
    const total = out.results.find(r => r.id === 'totalPaid')?.value || 0;
    const extra = out.results.find(r => r.id === 'extraCost')?.value || 0;
    expect(Math.round(emiRes)).toBe(1053);
    expect(Math.round(total)).toBe(6319);
    expect(Math.round(extra)).toBe(319);
  });

  it('sip calculator: payments at the start of each month', () => {
    // ₹10,000 x 15y @ 10% ≈ ₹41.79 L
    const out = toolRegistry.sip.compute({ monthly: 10000, ratePct: 10, years: 15 });
    const total = out.results.find(r => r.id === 'total')?.value || 0;
    expect(total).toBeGreaterThan(4179000);
    expect(total).toBeLessThan(4180000); // 41,79,243 is exact depending on start/end month formula
  });

  it('clamps and avoids NaN on edge cases', () => {
    const outSip = toolRegistry.sip.compute({ monthly: 10000, ratePct: 0, years: 15 });
    expect(outSip.results.find(r => r.id === 'total')?.value).toBe(10000 * 15 * 12);

    const outEmi = toolRegistry.emi.compute({ principal: 6000, ratePct: 0, months: 6 });
    expect(outEmi.results.find(r => r.id === 'emi')?.value).toBe(1000);
  });
});
