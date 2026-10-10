import { describe, it, expect } from 'vitest';
import scenarios from './data/scenarios.json';

describe('Scam Shield Scenarios', () => {
  it('has at least 12 scenarios with a mix of genuine and scam', () => {
    expect(scenarios.length).toBeGreaterThanOrEqual(12);
    
    const genuineCount = scenarios.filter(s => !s.isScam).length;
    expect(genuineCount).toBeGreaterThanOrEqual(4);
    
    const scamCount = scenarios.filter(s => s.isScam).length;
    expect(scamCount).toBeGreaterThan(0);
  });

  it('scam scenarios have red flags', () => {
    const scams = scenarios.filter(s => s.isScam);
    for (const scam of scams) {
      expect(scam.redFlags.length).toBeGreaterThan(0);
    }
  });

  it('genuine scenarios do not have red flags', () => {
    const genuines = scenarios.filter(s => !s.isScam);
    for (const genuine of genuines) {
      expect(genuine.redFlags.length).toBe(0);
    }
  });
});
