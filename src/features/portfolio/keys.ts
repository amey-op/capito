/**
 * Small lookups shared by the portfolio screens: bucket order, the lesson that explains each
 * bucket, and the "Predict" link (a tool page with the bucket's own numbers filled in).
 * No game rules live here; amounts and rates come from the state and economy.config.ts.
 */
import { economy } from '@/core/economy.config';
import type { BucketId, GameState, UnlockId } from '@/core/types';

export const BUCKET_ORDER: readonly BucketId[] = ['wallet', 'savings', 'emergency', 'rd', 'fd', 'gold', 'mf', 'shares'];
export const CASH: readonly BucketId[] = ['wallet', 'savings', 'emergency'];

/** Every bucket id is also the id of the unlock that opens it. */
export const isBucketOpen = (game: GameState, bucket: BucketId): boolean => game.unlocked.includes(bucket as UnlockId);

/** "What is this?" opens the lesson that introduced the bucket. */
export const BUCKET_LESSON: Record<BucketId, string> = {
  wallet: '1.1',
  savings: '2.1',
  emergency: '3.1',
  rd: '3.3',
  fd: '5.3',
  gold: '6.2',
  mf: '6.3',
  shares: '6.4',
};

const link = (tool: string, params: Record<string, number>): string => {
  const q = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(Math.round(v * 100) / 100)]));
  return `/tool/${tool}?${q.toString()}`;
};

/**
 * Predict link for a bucket, or null when there is nothing to predict. Market buckets pass no
 * rate: the student picks an assumed rate in the tool (we never claim a typical return).
 */
export function predictLink(game: GameState, bucket: BucketId): string | null {
  const amount = game.buckets[bucket];
  switch (bucket) {
    case 'wallet':
      return null;
    case 'savings':
      return link('lumpsum', { principal: amount, ratePct: economy.rates.savingsPa, years: 1 });
    case 'emergency':
      return link('monthsCovered', { amount });
    case 'rd': {
      const rd = game.rds.find((r) => r.status === 'active');
      return link('rd', { instalment: rd?.instalment ?? 500, ratePct: economy.rates.rdPa, months: rd?.months ?? 6 });
    }
    case 'fd': {
      const fd = game.fds.find((f) => f.status === 'active');
      return link('fd', { principal: fd?.principal ?? 6000, ratePct: economy.rates.fdPa, months: fd?.months ?? 6 });
    }
    case 'gold':
      return link('goldCompare', { amount: amount || 3000 });
    case 'mf':
      return link('sip', { monthly: game.sip?.monthly ?? 500, years: 5 });
    case 'shares':
      return link('lumpsum', { principal: amount || 1000, years: 5 });
  }
}

export const DEPRECIATION_CATEGORIES = Object.keys(economy.depreciationPa) as Array<keyof typeof economy.depreciationPa>;
