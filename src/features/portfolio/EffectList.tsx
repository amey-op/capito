import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { formatINR, formatINRDelta } from '@/core/format';
import type { Effect } from '@/core/types';

const MONEY_PARAMS = ['amount', 'emi', 'max'];
const signed = (n: number): string => (n > 0 ? `+${n}` : `${n}`.replace('-', '−'));

/** Translate an engine note or hint, showing rupee values (amount, emi, max) with Indian grouping. */
export function tWithMoney(t: TFunction, key: string, params?: Record<string, string | number>): string {
  const shown = Object.fromEntries(
    Object.entries(params ?? {}).map(([k, v]) => [k, MONEY_PARAMS.includes(k) && typeof v === 'number' ? formatINR(v) : v]),
  );
  return t(key, shown);
}

interface Line {
  text: string;
  tone: 'up' | 'down' | 'plain';
}

function describe(t: TFunction, e: Effect): Line | null {
  switch (e.kind) {
    case 'money':
      return { text: `${t(`portfolio.bucket.${e.bucket}`)} ${formatINRDelta(e.delta)}`, tone: e.delta > 0 ? 'up' : 'down' };
    case 'goal':
      return { text: t('portfolio.fx.goal', { amount: formatINRDelta(e.delta) }), tone: e.delta > 0 ? 'up' : 'down' };
    case 'joy':
      return { text: t('portfolio.fx.joy', { delta: signed(e.delta) }), tone: e.delta > 0 ? 'up' : 'down' };
    case 'credit':
      return e.delta === 0
        ? { text: t('portfolio.fx.creditStart', { score: e.score }), tone: 'plain' }
        : { text: t('portfolio.fx.credit', { delta: signed(e.delta), score: e.score }), tone: e.delta > 0 ? 'up' : 'down' };
    case 'shield':
      return { text: t('portfolio.fx.shield', { correct: e.correct, seen: e.seen }), tone: 'plain' };
    case 'unlock':
      return { text: t('portfolio.fx.unlock', { name: t(`portfolio.unlock.${e.id}`) }), tone: 'up' };
    case 'milestone':
      return { text: t('portfolio.fx.milestone', { name: t(`portfolio.milestone.${e.id}`) }), tone: 'up' };
    case 'possession':
      return { text: t('portfolio.fx.possession', { name: t(e.name), value: formatINR(e.value) }), tone: 'plain' };
    case 'loan':
      return { text: t('portfolio.fx.loan', { emi: formatINR(e.emi) }), tone: 'down' };
    case 'missedPayment':
      return { text: t('portfolio.fx.missed', { label: t(e.labelKey), fee: formatINR(e.fee) }), tone: 'down' };
    case 'note':
    case 'flag':
    case 'eventQueued':
      return null;
  }
}

/** What an action changed: rupee and meter chips, then the engine's notes in words. */
export function EffectList({ effects }: { effects: Effect[] }) {
  const { t } = useTranslation();
  const lines = effects.map((e) => describe(t, e)).filter((l): l is Line => l !== null);
  const notes = effects.filter((e): e is Extract<Effect, { kind: 'note' }> => e.kind === 'note');
  if (lines.length === 0 && notes.length === 0) return null;
  return (
    <div className="stack">
      {lines.length > 0 && (
        <ul className="pf-effects" aria-label={t('portfolio.fx.title')}>
          {lines.map((l, i) => (
            <li key={i} className={`pf-effect${l.tone === 'up' ? ' is-up' : l.tone === 'down' ? ' is-down' : ''}`}>
              {l.text}
            </li>
          ))}
        </ul>
      )}
      {notes.map((n, i) => (
        <p key={i} className="pf-note">
          {tWithMoney(t, n.key, n.params)}
        </p>
      ))}
    </div>
  );
}
