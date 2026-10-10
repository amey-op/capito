/**
 * The story-calendar market (MECHANICS §3.1): fixed monthly drift plus a fixed wiggle pattern,
 * overridden by scripted episodes. No randomness, identical for every student.
 * Also buying and selling gold, mutual fund units and shares.
 */
import { economy, type EpisodeId } from '@/core/economy.config';
import { applyPctSteps, valueAfterCost } from '@/core/finance';
import type { GameState, Holdings } from '@/core/types';
import { credit, freeWallet, take } from './ledger';
import { amountOf, EPS, isUnlocked, K, note, type Ctx } from './util';

type Index = 'gold' | 'mf' | 'shares' | 'tipStock';
const INDEXES: readonly Index[] = ['gold', 'mf', 'shares', 'tipStock'];
/** Which index each holding follows. */
const FOLLOWS: Record<keyof Holdings, Index> = {
  goldPhysical: 'gold',
  goldEtf: 'gold',
  mf: 'mf',
  shares: 'shares',
  tipStock: 'tipStock',
};

/** Keep the gold / mf / shares bucket totals equal to the holdings behind them. */
export function syncMarketBuckets(s: GameState): void {
  s.buckets.gold = s.holdings.goldPhysical.value + s.holdings.goldEtf.value;
  s.buckets.mf = s.holdings.mf.value;
  s.buckets.shares = s.holdings.shares.value + s.holdings.tipStock.value;
}

const episodeSteps = (id: EpisodeId, index: Index): readonly number[] => {
  const steps = (economy.market.episodes[id] as Record<string, unknown>)[index];
  return Array.isArray(steps) ? (steps as number[]) : [];
};
const episodeLength = (id: EpisodeId): number => Math.max(...INDEXES.map((i) => episodeSteps(id, i).length));

/** The % moves each index makes this month (episodes override drift; the tip stock follows shares). */
export function monthMoves(s: GameState): Record<Index, number[]> {
  const moves: Record<Index, number[]> = { gold: [], mf: [], shares: [], tipStock: [] };
  for (const ep of s.market.activeEpisodes) {
    for (const index of INDEXES) {
      const pct = episodeSteps(ep.id, index)[ep.step];
      if (pct !== undefined) moves[index].push(pct);
    }
  }
  const { driftPctPerMonth, wigglePct } = economy.market;
  for (const index of ['gold', 'mf', 'shares'] as const) {
    if (moves[index].length > 0) continue;
    const wiggle = wigglePct[index];
    moves[index].push(driftPctPerMonth[index] + (wiggle[s.market.step % wiggle.length] ?? 0));
  }
  if (moves.tipStock.length === 0) moves.tipStock = [...moves.shares];
  return moves;
}

/** Month close: move every index one step and re-value the holdings. */
export function stepMarket(ctx: Ctx): void {
  const { s } = ctx;
  const moves = monthMoves(s);
  const before = { gold: s.buckets.gold, mf: s.buckets.mf, shares: s.buckets.shares };
  for (const index of INDEXES) s.market[index] = applyPctSteps(s.market[index], moves[index]);
  for (const key of Object.keys(s.holdings) as Array<keyof Holdings>) {
    s.holdings[key].value = applyPctSteps(s.holdings[key].value, moves[FOLLOWS[key]]);
  }
  s.market.activeEpisodes = s.market.activeEpisodes
    .map((ep) => ({ ...ep, step: ep.step + 1 }))
    .filter((ep) => ep.step < episodeLength(ep.id));
  s.market.step += 1;
  syncMarketBuckets(s);
  for (const bucket of ['gold', 'mf', 'shares'] as const) {
    const delta = Math.round(s.buckets[bucket] - before[bucket]);
    if (delta !== 0) ctx.fx.push({ kind: 'money', bucket, delta });
  }
}

/** Start a scripted episode; it plays out over the following month closes. */
export function startEpisode(ctx: Ctx, id: EpisodeId): void {
  if (ctx.s.market.activeEpisodes.some((e) => e.id === id)) return;
  ctx.s.market.activeEpisodes.push({ id, step: 0 });
}

const unlockFor = (asset: keyof Holdings) => (FOLLOWS[asset] === 'gold' ? 'gold' : asset === 'mf' ? 'mf' : 'shares');

/**
 * Buy into a holding with wallet money. `costPct` is lost up front (gold making charge / ETF cost).
 * Returns the rupees spent (0 if it could not be bought).
 */
export function buyHolding(ctx: Ctx, asset: keyof Holdings, requested: number, costPct = 0): number {
  const amount = amountOf(requested);
  if (amount <= 0) return 0;
  const need = unlockFor(asset);
  if (!isUnlocked(ctx.s, need)) {
    note(ctx, K.notUnlocked, { bucket: need });
    return 0;
  }
  if (freeWallet(ctx.s) + EPS < amount) {
    note(ctx, K.cannotAfford, { amount: Math.round(amount - freeWallet(ctx.s)) });
    return 0;
  }
  take(ctx, 'wallet', amount);
  addToHolding(ctx, asset, valueAfterCost(amount, costPct));
  return amount;
}

/** Add value to a holding (money already taken elsewhere, e.g. a SIP instalment). */
export function addToHolding(ctx: Ctx, asset: keyof Holdings, value: number): void {
  ctx.s.holdings[asset].invested += value;
  ctx.s.holdings[asset].value += value;
  syncMarketBuckets(ctx.s);
  ctx.fx.push({ kind: 'money', bucket: unlockFor(asset), delta: Math.round(value) });
}

export const buyGold = (ctx: Ctx, amount: number, form: 'physical' | 'etf'): number =>
  form === 'physical'
    ? buyHolding(ctx, 'goldPhysical', amount, economy.gold.physicalMakingChargePct)
    : buyHolding(ctx, 'goldEtf', amount, economy.gold.etfCostPct);

/** Sell part or all of a holding at its current value; proceeds go to the wallet. */
export function sellHolding(ctx: Ctx, asset: keyof Holdings, requested: number | 'all'): number {
  const h = ctx.s.holdings[asset];
  const amount = requested === 'all' ? h.value : Math.min(amountOf(requested), h.value);
  if (amount <= 0) return 0;
  const share = amount / h.value;
  h.invested -= h.invested * share;
  h.value -= amount;
  if (h.value < EPS) {
    h.value = 0;
    h.invested = 0;
  }
  syncMarketBuckets(ctx.s);
  ctx.fx.push({ kind: 'money', bucket: unlockFor(asset), delta: -Math.round(amount) });
  credit(ctx, 'wallet', amount);
  return amount;
}
