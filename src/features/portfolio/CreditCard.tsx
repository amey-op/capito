import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { economy } from '@/core/economy.config';
import { formatINR, formatPct } from '@/core/format';
import type { GameState } from '@/core/types';

const { credit } = economy;
const signed = (n: number) => (n > 0 ? `+${n}` : `−${Math.abs(n)}`);

/** The offer band a score falls in, and the next band up (if any). Bands are listed highest first. */
export function creditBands(score: number) {
  const index = credit.offers.findIndex((o) => score >= o.minScore);
  const current = index === -1 ? null : credit.offers[index]!;
  const next = index === -1 ? credit.offers[credit.offers.length - 1]! : index > 0 ? credit.offers[index - 1]! : null;
  return { current, next };
}

/**
 * The credit-score card: the score on its 300–900 scale, what a bank in this game offers at
 * that score, the next band up, and what moves the score. Shown once a score exists.
 */
export function CreditCard({ game }: { game: GameState }) {
  const { t } = useTranslation();
  const score = game.creditScore;
  if (score === null) return null;
  const { current, next } = creditBands(score);
  const position = ((score - credit.min) / (credit.max - credit.min)) * 100;
  const moves: Array<[string, number]> = [
    ['onTimeEmi', credit.deltas.onTimeEmi],
    ['paidOff', credit.deltas.paidOffOnSchedule],
    ['missedEmi', credit.deltas.missedEmi],
    ['secondLoan', credit.deltas.secondLoanWhileActive],
  ];

  return (
    <section className="card panel-purple stack" aria-labelledby="pf-credit">
      <div className="pf-item">
        <h2 id="pf-credit">{t('portfolio.creditScore')}</h2>
        <span className="num pf-hero-number">{score}</span>
      </div>

      <div>
        <div className="pf-scale" role="img" aria-label={t('portfolio.credit.scale', { score, min: credit.min, max: credit.max })}>
          <span style={{ left: `${Math.min(100, Math.max(0, position))}%` }} />
        </div>
        <div className="pf-scale-ends num" aria-hidden="true">
          <span>{credit.min}</span>
          <span>{credit.max}</span>
        </div>
      </div>

      <p>
        {current
          ? t('portfolio.credit.band', { max: formatINR(current.maxAmount), rate: formatPct(current.ratePa) })
          : t('portfolio.credit.declined', { score: credit.declineBelow })}
      </p>
      {next && <p className="muted">{t('portfolio.credit.next', { score: next.minScore, max: formatINR(next.maxAmount), rate: formatPct(next.ratePa) })}</p>}

      <div className="stack">
        <span className="pf-label">{t('portfolio.credit.moves')}</span>
        <ul className="pf-effects">
          {moves.map(([key, delta]) => (
            <li key={key} className={`pf-effect ${delta > 0 ? 'is-up' : 'is-down'}`}>
              {t(`portfolio.credit.move.${key}`, { points: signed(delta) })}
            </li>
          ))}
        </ul>
      </div>

      <p className="muted">{t('portfolio.credit.note')}</p>
      <Link className="pf-link" to="/lesson/4.3">
        {t('portfolio.whatIsThis')}
      </Link>
    </section>
  );
}
