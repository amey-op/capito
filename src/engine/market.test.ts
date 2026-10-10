import { describe, expect, it } from 'vitest';
import { economy } from '@/core/economy.config';
import { roundRupees } from '@/core/finance';
import { newGame, type Game } from './testkit';

const market = economy.market;
/** A game with the market buckets open and ₹10,000 in the wallet, in month 3. */
const investor = (): Game => newGame().lesson('a', 3, ['gold', 'mf', 'shares']).plan().lesson('b');
const startEpisode = (g: Game, id: 'crash' | 'tipPump' | 'goldDip') => {
  g.state = { ...g.state, market: { ...g.state.market, activeEpisodes: [{ id, step: 0 }] } };
};
const pct = (index: number, from: number) => (index / from - 1) * 100;

describe('gold: two ways in (MECHANICS §3)', () => {
  it('₹3,000 of jewellery is worth ₹2,760 after the 8% making charge', () => {
    const g = investor();
    g.do({ type: 'BUY_GOLD', amount: 3000, form: 'physical' });
    expect(g.state.holdings.goldPhysical.value).toBeCloseTo(2760, 6);
    expect(g.state.buckets.gold).toBeCloseTo(2760, 6);
    expect(g.state.buckets.wallet).toBe(7000);
  });

  it('₹3,000 of regulated paper gold is worth ₹2,985 after the 0.5% cost', () => {
    const g = investor();
    g.do({ type: 'BUY_GOLD', amount: 3000, form: 'etf' });
    expect(g.state.holdings.goldEtf.value).toBeCloseTo(2985, 6);
  });

  it('cannot be bought before its lesson unlocks it', () => {
    const g = newGame().lesson('a');
    g.do({ type: 'BUY_GOLD', amount: 1000, form: 'etf' });
    g.do({ type: 'INVEST', asset: 'mf', amount: 1000 });
    expect(g.state.buckets).toMatchObject({ wallet: 5000, gold: 0, mf: 0 });
  });
});

describe('story-calendar market (MECHANICS §3.1)', () => {
  it('moves by drift plus the fixed wiggle each month, the same every time', () => {
    const g = investor();
    g.do({ type: 'INVEST', asset: 'mf', amount: 1000 });
    const before = { ...g.state.market };
    g.plan();
    const step = before.step % 12;
    expect(pct(g.state.market.mf, before.mf)).toBeCloseTo(market.driftPctPerMonth.mf + market.wigglePct.mf[step]!, 9);
    expect(pct(g.state.market.gold, before.gold)).toBeCloseTo(market.driftPctPerMonth.gold + market.wigglePct.gold[step]!, 9);
    expect(pct(g.state.market.shares, before.shares)).toBeCloseTo(market.driftPctPerMonth.shares + market.wigglePct.shares[step]!, 9);
    expect(g.state.holdings.mf.value).toBeCloseTo(1000 * (g.state.market.mf / before.mf), 6);
  });

  it('over a full 12-month wiggle cycle the pattern adds nothing to the drift', () => {
    const g = investor().plan();
    const start = g.state.market.gold;
    g.months(12);
    const drift = Array.from({ length: 12 }, (_, i) => market.driftPctPerMonth.gold + market.wigglePct.gold[(g.state.market.step - 12 + i) % 12]!);
    expect(g.state.market.gold).toBeCloseTo(drift.reduce((v, p) => v * (1 + p / 100), start), 6);
    expect(market.wigglePct.gold.reduce<number>((a, b) => a + b, 0)).toBeCloseTo(0, 9);
  });
});

describe('scripted episodes reproduce the MECHANICS §3.1 table', () => {
  it('crash: MF −10%, −10% (≈ −19%), then +3% × 6 (≈ −3% overall)', () => {
    const g = investor();
    g.do({ type: 'INVEST', asset: 'mf', amount: 5000 });
    g.do({ type: 'INVEST', asset: 'shares', amount: 2000 });
    startEpisode(g, 'crash');
    const start = { ...g.state.market };
    g.plan().months(1);
    expect(pct(g.state.market.mf, start.mf)).toBeCloseTo(-19, 9);
    expect(Math.round(pct(g.state.market.shares, start.shares))).toBe(-23);
    expect(pct(g.state.market.gold, start.gold)).toBeCloseTo(7.12, 9);
    expect(roundRupees(g.state.holdings.mf.value)).toBe(4050);
    g.months(6);
    expect(Math.round(pct(g.state.market.mf, start.mf))).toBe(-3);
    expect(Math.round(pct(g.state.market.shares, start.shares))).toBe(-3);
    expect(g.state.market.activeEpisodes).toEqual([]);
    // After the episode the ordinary drift is back.
    const after = g.state.market.mf;
    g.months(1);
    expect(pct(g.state.market.mf, after)).toBeGreaterThan(0);
  });

  it('holding through the crash recovers; selling at the bottom locks the loss in', () => {
    const hold = investor();
    hold.do({ type: 'INVEST', asset: 'mf', amount: 5000 });
    startEpisode(hold, 'crash');
    hold.plan().months(1);
    const sell = newGame();
    sell.state = structuredClone(hold.state);
    const walletBefore = sell.state.buckets.wallet;
    sell.do({ type: 'SELL', asset: 'mf', amount: 'all' });
    expect(sell.state.buckets.mf).toBe(0);
    expect(sell.state.holdings.mf.invested).toBe(0);
    // Sold at the bottom: ₹5,000 came back as ₹4,050.
    expect(sell.state.buckets.wallet - walletBefore).toBeCloseTo(4050, 6);
    hold.months(6);
    expect(hold.state.holdings.mf.value).toBeGreaterThan(4800);
  });

  it('tip pump: the tip stock goes +15%, then −40% (net ≈ −31%); ordinary shares do not', () => {
    const g = investor();
    g.do({ type: 'INVEST', asset: 'tipStock', amount: 2000 });
    g.do({ type: 'INVEST', asset: 'shares', amount: 2000 });
    startEpisode(g, 'tipPump');
    g.plan();
    expect(g.state.holdings.tipStock.value).toBeCloseTo(2300, 6);
    g.months(1);
    expect(g.state.holdings.tipStock.value).toBeCloseTo(1380, 6);
    expect(Math.round(pct(g.state.holdings.tipStock.value, 2000))).toBe(-31);
    expect(g.state.holdings.shares.value).toBeGreaterThan(2000);
    expect(g.state.buckets.shares).toBeCloseTo(g.state.holdings.shares.value + g.state.holdings.tipStock.value, 6);
  });

  it('gold dip: −5%, then +2% a month for 3 months', () => {
    const g = investor();
    g.do({ type: 'BUY_GOLD', amount: 3000, form: 'etf' });
    startEpisode(g, 'goldDip');
    const start = g.state.market.gold;
    g.plan();
    expect(pct(g.state.market.gold, start)).toBeCloseTo(-5, 9);
    g.months(3);
    expect(g.state.market.gold).toBeCloseTo(start * 0.95 * 1.02 ** 3, 6);
  });
});

describe('selling', () => {
  it('sells part of a holding at today’s value and reduces what was invested in proportion', () => {
    const g = investor();
    g.do({ type: 'INVEST', asset: 'shares', amount: 4000 });
    g.do({ type: 'SELL', asset: 'shares', amount: 1000 });
    expect(g.state.holdings.shares).toEqual({ invested: 3000, value: 3000 });
    expect(g.state.buckets.wallet).toBe(10000 - 4000 + 1000);
  });
});
