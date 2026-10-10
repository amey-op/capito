import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { economy } from '@/core/economy.config';
import { loanTotals } from '@/core/finance';
import { formatINR, formatPct } from '@/core/format';
import type { Action, GameState } from '@/core/types';
import { engine } from '@/engine';
import { dueThisMonth } from '@/engine/credit';
import { RupeeField, SelectField } from './fields';

type Dispatch = (action: Action) => unknown;

/** Things I own: items bought from wants or events, with what they are worth now. */
export function ThingsOwned({ game }: { game: GameState }) {
  const { t } = useTranslation();
  if (game.possessions.length === 0) return null;
  return (
    <section className="stack" aria-labelledby="pf-owned">
      <h2 id="pf-owned">{t('portfolio.owned.title')}</h2>
      <ul className="pf-list">
        {game.possessions.map((p) => (
          <li key={p.id} className="card-sm pf-item">
            <span>
              <strong>{p.nameIsKey ? t(p.name) : p.name}</strong>
              <span className="muted"> · {t('portfolio.owned.paid', { amount: formatINR(p.cost) })}</span>
            </span>
            <span className="num">{formatINR(p.value)}</span>
          </li>
        ))}
      </ul>
      <p className="muted">{t('portfolio.owned.hint')}</p>
    </section>
  );
}

/** The bank's offer for this player, with the EMI, total and extra cost before they decide. */
function LoanOffer({ game, dispatch }: { game: GameState; dispatch: Dispatch }) {
  const { t } = useTranslation();
  const offer = engine.loanOffer(game);
  const [amount, setAmount] = useState(0);
  const [months, setMonths] = useState<number>(economy.clock.emiTenuresMonths[1]);
  if (!offer) return <p className="pf-note">{t('portfolio.loan.noOffer')}</p>;
  const asked = Math.min(amount, offer.maxAmount);
  const totals = loanTotals(asked, offer.ratePa, months);
  return (
    <div className="card-sm pf-form">
      <h3>{t('portfolio.loan.offerTitle')}</h3>
      <p>{t('portfolio.loan.offer', { max: formatINR(offer.maxAmount), rate: formatPct(offer.ratePa), score: offer.score })}</p>
      <p className="muted">{t(offer.reasonKey)}</p>
      <div className="pf-fields">
        <RupeeField id="loan-amount" label={t('portfolio.loan.amount')} value={amount} onChange={setAmount} step={500} max={offer.maxAmount} />
        <SelectField
          id="loan-months"
          label={t('portfolio.loan.months')}
          value={months}
          onChange={setMonths}
          options={economy.clock.emiTenuresMonths.map((m) => ({ value: m as number, label: t('portfolio.goals.inMonths', { n: m }) }))}
        />
      </div>
      {asked > 0 && (
        <p className="pf-note">
          {t('portfolio.loan.cost', { emi: formatINR(totals.emi), total: formatINR(totals.totalPaid), extra: formatINR(totals.extra) })}
        </p>
      )}
      <button
        type="button"
        className="btn btn-secondary pf-btn"
        disabled={asked <= 0}
        onClick={() => {
          dispatch({ type: 'APPLY_LOAN', terms: { kind: 'bank', principal: asked, months } });
          setAmount(0);
        }}
      >
        {t('portfolio.loan.apply')}
      </button>
    </div>
  );
}

/** What I owe: loans, other monthly charges, the credit score check and the bank's offer. */
export function Liabilities({ game, dispatch }: { game: GameState; dispatch: Dispatch }) {
  const { t } = useTranslation();
  const canBorrow = game.unlocked.includes('liabilities');
  const loans = game.loans.filter((l) => l.status !== 'paid');
  if (!canBorrow && loans.length === 0 && game.recurring.length === 0) return null;
  return (
    <section className="stack" aria-labelledby="pf-owe">
      <h2 id="pf-owe">{t('portfolio.owe.title')}</h2>

      {loans.length === 0 && game.recurring.length === 0 && <p className="muted">{t('portfolio.owe.none')}</p>}

      <ul className="pf-list">
        {loans.map((l) => (
          <li key={l.id} className={`card-sm pf-item${l.status === 'defaulted' ? ' verdict-bad' : ''}`}>
            <span>
              <strong>{t(`portfolio.loan.kind.${l.kind}`)}</strong>
              <span className="muted">
                {' · '}
                {l.status === 'defaulted'
                  ? t('portfolio.loan.defaulted')
                  : t('portfolio.loan.nextPayment', { amount: formatINR(dueThisMonth(l)) })}
              </span>
            </span>
            <span className="num">{formatINR(-l.remaining)}</span>
          </li>
        ))}
        {game.recurring.map((c) => (
          <li key={c.id} className="card-sm pf-item">
            <span>
              <strong>{t(c.labelKey)}</strong>
              <span className="muted"> · {t('portfolio.owe.monthsLeft', { n: c.monthsLeft })}</span>
            </span>
            <span className="num">{t('portfolio.owe.perMonth', { amount: formatINR(c.perMonth) })}</span>
          </li>
        ))}
      </ul>

      {game.unlocked.includes('credit') && game.creditScore === null && (
        <div className="card-sm pf-form">
          <p>{t('portfolio.credit.none')}</p>
          <button type="button" className="btn btn-secondary pf-btn" onClick={() => dispatch({ type: 'CHECK_CREDIT_SCORE' })}>
            {t('portfolio.credit.check')}
          </button>
        </div>
      )}

      {canBorrow && <LoanOffer game={game} dispatch={dispatch} />}
      {canBorrow && (
        <Link className="pf-link" to="/lesson/4.1">
          {t('portfolio.whatIsThis')}
        </Link>
      )}
    </section>
  );
}
