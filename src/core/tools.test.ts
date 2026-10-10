import { describe, expect, it } from 'vitest';
import { allToolIds, configToolIds, isToolId, parsePrefill } from './tools';

describe('tools contract', () => {
  it('has the 15 config calculators and unique ids', () => {
    expect(configToolIds).toHaveLength(15);
    expect(new Set(allToolIds).size).toBe(allToolIds.length);
  });
  it('recognises tool ids', () => {
    expect(isToolId('emi')).toBe(true);
    expect(isToolId('scamShield')).toBe(true);
    expect(isToolId('nope')).toBe(false);
  });
  it('parses prefill query params and drops junk', () => {
    expect(parsePrefill('?principal=6000&ratePct=18&months=6&x=abc&y=')).toEqual({ principal: 6000, ratePct: 18, months: 6 });
  });
});
