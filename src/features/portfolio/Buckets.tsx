import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { formatINR } from '@/core/format';
import type { Action, BucketId, GameState, Holdings } from '@/core/types';
import { RupeeField } from './fields';
import { BUCKET_LESSON, BUCKET_ORDER, CASH, isBucketOpen, predictLink } from './keys';

type Dispatch = (action: Action) => unknown;

const HOLDINGS_IN: Partial<Record<BucketId, Array<keyof Holdings>>> = {
  gold: ['goldPhysical', 'goldEtf'],
  mf: ['mf'],
  shares: ['shares', 'tipStock'],
};

/** Move money between the wallet and a savings-type bucket. */
function MoveMoney({ game, bucket, dispatch }: { game: GameState; bucket: BucketId; dispatch: Dispatch }) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState(0);
  const move = (from: BucketId, to: BucketId) => {
    dispatch({ type: 'MOVE_MONEY', from, to, amount });
    setAmount(0);
  };
  return (
    <div className="pf-form">
      <RupeeField id={`move-${bucket}`} label={t('portfolio.move.amount')} value={amount} onChange={setAmount} />
      <div className="row">
        <button type="button" className="btn btn-secondary pf-btn" disabled={amount <= 0} onClick={() => move('wallet', bucket)}>
          {t('portfolio.move.in')}
        </button>
        <button
          type="button"
          className="btn btn-secondary pf-btn"
          disabled={amount <= 0 || game.buckets[bucket] <= 0}
          onClick={() => move(bucket, 'wallet')}
        >
          {t('portfolio.move.out')}
        </button>
      </div>
    </div>
  );
}

function BucketCard({ game, bucket, dispatch }: { game: GameState; bucket: BucketId; dispatch: Dispatch }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const predict = predictLink(game, bucket);
  const movable = CASH.includes(bucket) && bucket !== 'wallet';
  const holdings = (HOLDINGS_IN[bucket] ?? []).filter((h) => game.holdings[h].value > 0);

  return (
    <li className="card-sm pf-bucket">
      <span className="pf-label">{t(`portfolio.bucket.${bucket}`)}</span>
      <span className="num">{formatINR(game.buckets[bucket])}</span>

      {bucket === 'mf' && game.sip && (
        <span className="muted">
          {t(game.sip.active ? 'portfolio.sip.running' : 'portfolio.sip.paused', { amount: formatINR(game.sip.monthly) })}
        </span>
      )}

      {holdings.map((h) => (
        <div key={h} className="pf-item">
          <span>
            {t(`portfolio.holding.${h}`)} <span className="num">{formatINR(game.holdings[h].value)}</span>
          </span>
          <button type="button" className="btn btn-secondary pf-btn" onClick={() => dispatch({ type: 'SELL', asset: h, amount: 'all' })}>
            {t('portfolio.sellAll')}
          </button>
        </div>
      ))}

      {bucket === 'rd' &&
        game.rds
          .filter((r) => r.status === 'active')
          .map((r) => (
            <div key={r.id} className="pf-item">
              <span>{t('portfolio.rd.line', { amount: formatINR(r.instalment), paid: r.paidMonths, months: r.months })}</span>
              <button type="button" className="btn btn-secondary pf-btn" onClick={() => dispatch({ type: 'CLOSE_RD', rdId: r.id })}>
                {t('portfolio.rd.close')}
              </button>
            </div>
          ))}

      {bucket === 'fd' &&
        game.fds
          .filter((f) => f.status === 'active')
          .map((f) => (
            <div key={f.id} className="pf-item">
              <span>{t('portfolio.fd.line', { amount: formatINR(f.principal), month: f.startedMonth + f.months - 1 })}</span>
              <button type="button" className="btn btn-secondary pf-btn" onClick={() => dispatch({ type: 'BREAK_FD', fdId: f.id })}>
                {t('portfolio.fd.break')}
              </button>
            </div>
          ))}

      {movable && (
        <button type="button" className="btn btn-secondary pf-btn" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {t('portfolio.move.title')}
        </button>
      )}
      {movable && open && <MoveMoney game={game} bucket={bucket} dispatch={dispatch} />}

      <div className="row">
        {predict && (
          <Link className="pf-link" to={predict}>
            {t('portfolio.predict')}
          </Link>
        )}
        <Link className="pf-link" to={`/lesson/${BUCKET_LESSON[bucket]}`}>
          {t('portfolio.whatIsThis')}
        </Link>
      </div>
    </li>
  );
}

/** One card per unlocked bucket. */
export function Buckets({ game, dispatch }: { game: GameState; dispatch: Dispatch }) {
  const { t } = useTranslation();
  const open = BUCKET_ORDER.filter((b) => isBucketOpen(game, b));
  const locked = BUCKET_ORDER.length - open.length;
  return (
    <section className="stack" aria-labelledby="pf-buckets">
      <h2 id="pf-buckets">{t('portfolio.buckets.title')}</h2>
      <ul className="pf-grid pf-list">
        {open.map((b) => (
          <BucketCard key={b} game={game} bucket={b} dispatch={dispatch} />
        ))}
      </ul>
      {locked > 0 && <p className="muted">{t('portfolio.buckets.locked', { n: locked })}</p>}
    </section>
  );
}
