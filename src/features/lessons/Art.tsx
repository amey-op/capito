/**
 * Hand-drawn card art. Lessons name an `art` id (e.g. "wallet-in-out", "snowball-downhill");
 * each id is drawn with the closest of a small set of marker doodles, picked by keyword.
 * Strokes draw themselves (.draw in theme.css) unless the user prefers reduced motion.
 */
import type { ReactElement } from 'react';

type Doodle = () => ReactElement;

const ink = { fill: 'none', stroke: 'currentColor', strokeWidth: 5, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

const doodles: Record<string, Doodle> = {
  wallet: () => (
    <>
      <rect x="22" y="40" width="96" height="62" rx="10" {...ink} />
      <path d="M22 54 h96 M92 70 h26 v18 h-26 a9 9 0 0 1 0 -18" {...ink} />
      <path d="M40 30 l46 -12 l6 22" {...ink} />
    </>
  ),
  coins: () => (
    <>
      <ellipse cx="70" cy="96" rx="34" ry="10" {...ink} />
      <path d="M36 96 v-14 M104 96 v-14" {...ink} />
      <ellipse cx="70" cy="82" rx="34" ry="10" {...ink} />
      <ellipse cx="70" cy="58" rx="24" ry="8" {...ink} />
      <path d="M46 58 v-14 M94 58 v-14" {...ink} />
      <ellipse cx="70" cy="44" rx="24" ry="8" {...ink} />
    </>
  ),
  up: () => (
    <>
      <path d="M18 104 h104 M18 104 v-84" {...ink} />
      <path d="M26 92 l24 -18 l18 10 l40 -44" {...ink} />
      <path d="M92 38 h18 v18" {...ink} />
    </>
  ),
  down: () => (
    <>
      <path d="M18 104 h104 M18 104 v-84" {...ink} />
      <path d="M26 34 l26 22 l18 -8 l38 40" {...ink} />
      <path d="M90 90 h20 v-18" {...ink} />
    </>
  ),
  calendar: () => (
    <>
      <rect x="24" y="30" width="92" height="76" rx="10" {...ink} />
      <path d="M24 50 h92 M46 20 v20 M94 20 v20" {...ink} />
      <path d="M42 66 h10 M66 66 h10 M90 66 h10 M42 86 h10 M66 86 h10" {...ink} />
    </>
  ),
  shield: () => (
    <>
      <path d="M70 18 l40 14 v28 c0 26 -18 42 -40 52 c-22 -10 -40 -26 -40 -52 v-28 z" {...ink} />
      <path d="M52 64 l12 12 l24 -26" {...ink} />
    </>
  ),
  lock: () => (
    <>
      <rect x="32" y="56" width="76" height="52" rx="10" {...ink} />
      <path d="M48 56 v-14 a22 22 0 0 1 44 0 v14 M70 76 v12" {...ink} />
    </>
  ),
  card: () => (
    <>
      <rect x="16" y="34" width="108" height="68" rx="10" {...ink} />
      <path d="M16 54 h108 M32 84 h28 M72 84 h12" {...ink} />
    </>
  ),
  scale: () => (
    <>
      <path d="M70 22 v82 M44 104 h52 M28 40 h84" {...ink} />
      <path d="M28 40 l-14 30 h28 z M112 40 l-14 30 h28 z" {...ink} />
    </>
  ),
  clock: () => (
    <>
      <circle cx="70" cy="64" r="44" {...ink} />
      <path d="M70 36 v28 l20 14" {...ink} />
    </>
  ),
  magnifier: () => (
    <>
      <circle cx="58" cy="54" r="30" {...ink} />
      <path d="M80 76 l30 30" {...ink} />
      <path d="M46 54 l8 8 l14 -16" {...ink} />
    </>
  ),
  warning: () => (
    <>
      <path d="M70 18 l52 90 h-104 z" {...ink} />
      <path d="M70 50 v28 M70 92 v2" {...ink} />
    </>
  ),
  pie: () => (
    <>
      <circle cx="70" cy="64" r="44" {...ink} />
      <path d="M70 64 v-44 M70 64 l38 22" {...ink} />
    </>
  ),
  house: () => (
    <>
      <path d="M22 60 l48 -38 l48 38 M34 52 v54 h72 v-54" {...ink} />
      <path d="M60 106 v-28 h20 v28" {...ink} />
    </>
  ),
  phone: () => (
    <>
      <rect x="44" y="16" width="52" height="96" rx="10" {...ink} />
      <path d="M62 28 h16 M66 98 h8" {...ink} />
    </>
  ),
  tag: () => (
    <>
      <path d="M22 62 l40 -40 h44 v44 l-40 40 z" {...ink} />
      <circle cx="88" cy="40" r="6" {...ink} />
    </>
  ),
  gauge: () => (
    <>
      <path d="M20 96 a50 50 0 0 1 100 0" {...ink} />
      <path d="M70 96 l26 -30 M36 96 h4 M100 96 h4" {...ink} />
    </>
  ),
  basket: () => (
    <>
      <path d="M22 54 h96 l-12 50 h-72 z M44 54 l16 -30 M96 54 l-16 -30" {...ink} />
      <path d="M50 70 v20 M70 70 v20 M90 70 v20" {...ink} />
    </>
  ),
  people: () => (
    <>
      <circle cx="46" cy="44" r="14" {...ink} />
      <circle cx="94" cy="44" r="14" {...ink} />
      <path d="M20 104 a26 26 0 0 1 52 0 M68 104 a26 26 0 0 1 52 0" {...ink} />
    </>
  ),
  spark: () => (
    <>
      <path d="M70 18 v24 M70 86 v24 M24 64 h24 M92 64 h24 M38 32 l16 16 M86 80 l16 16 M102 32 l-16 16 M54 80 l-16 16" {...ink} />
    </>
  ),
};

/** Keyword → doodle, first match wins. */
const rules: Array<[RegExp, keyof typeof doodles]> = [
  [/wallet|purse/, 'wallet'],
  [/warning|megaphone|shadow|contacts/, 'warning'],
  [/lock|locker|key/, 'lock'],
  [/shield|stamp|badge|regulator|bank-stamp/, 'shield'],
  [/calendar|month|blocks/, 'calendar'],
  [/clock|hourglass|time|old-ticket/, 'clock'],
  [/magnifier|check|record/, 'magnifier'],
  [/down|dip|melt|fading|minus|miss|downhill/, 'down'],
  [/up|ramp|grow|snowball|rising|steps|line|zigzag|runner|road|arrows/, 'up'],
  [/card|ceiling|bill/, 'card'],
  [/scale|see-saw|two-|own-or-lend/, 'scale'],
  [/pie|slice/, 'pie'],
  [/house|post-office|doors/, 'house'],
  [/phone|app/, 'phone'],
  [/tag|price|cart/, 'tag'],
  [/gauge|dial|score|percent|seventy/, 'gauge'],
  [/basket|hands|crowd/, 'basket'],
  [/hand|people/, 'people'],
  [/coin|gold|tower|rice|paper|ring|unit|drip/, 'coins'],
];

export function doodleFor(art: string): keyof typeof doodles {
  return rules.find(([re]) => re.test(art))?.[1] ?? 'spark';
}

export function Art({ id }: { id?: string }) {
  if (!id) return null;
  const Draw = doodles[doodleFor(id)]!;
  return (
    <svg className="lp-art draw" viewBox="0 0 140 124" role="presentation" aria-hidden="true" data-art={id}>
      <Draw />
    </svg>
  );
}
