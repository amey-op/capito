import { describe, expect, it } from 'vitest';
import { formatINR, formatINRCompact, formatINRDelta, formatPct } from './format';

describe('format', () => {
  it('uses Indian grouping and the ₹ sign', () => {
    expect(formatINR(14600)).toBe('₹14,600');
    expect(formatINR(1234567)).toBe('₹12,34,567');
    expect(formatINR(1052.6)).toBe('₹1,053');
    expect(formatINR(-1500)).toBe('−₹1,500');
    expect(formatINR(3056.875, 2)).toBe('₹3,056.88');
  });
  it('signed deltas', () => {
    expect(formatINRDelta(600)).toBe('+₹600');
    expect(formatINRDelta(-1500)).toBe('−₹1,500');
    expect(formatINRDelta(0)).toBe('₹0');
  });
  it('lakh and crore', () => {
    expect(formatINRCompact(4178921)).toBe('₹41.79 lakh');
    expect(formatINRCompact(35000000)).toBe('₹3.5 crore');
    expect(formatINRCompact(99999)).toBe('₹99,999');
  });
  it('percent', () => {
    expect(formatPct(6.5)).toBe('6.5%');
    expect(formatPct(Number.NaN)).toBe('–');
  });
});
