import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatINR } from '@/core/format';
import '../tools.css';

/**
 * Practice screens. `direction` is where the money would really go; `safe` is the choice that
 * keeps the student's money safe. The rule under all of them: a UPI PIN only ever sends money.
 */
export const upiRounds = [
  { id: 'canteen', direction: 'out', amount: 120, safe: 'pin' },
  { id: 'refund', direction: 'out', amount: 500, safe: 'decline' },
  { id: 'friend', direction: 'in', amount: 200, safe: 'decline' },
  { id: 'prizeQr', direction: 'out', amount: 2000, safe: 'decline' },
  { id: 'otpCall', direction: 'out', amount: 1500, safe: 'decline' },
] as const;

type Pick = 'pin' | 'decline';

/** Pretend payment screens: decide when a PIN belongs and when it is a trap. Nothing here is a real payment. */
export function UpiPractice() {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<Pick | null>(null);
  const [correct, setCorrect] = useState(0);

  const done = index >= upiRounds.length;
  const restart = () => {
    setIndex(0);
    setPicked(null);
    setCorrect(0);
  };

  if (done) {
    return (
      <section className="card stack tl-tool" data-tool-id="upiPractice">
        <h2>{t('tools.upiPractice.title')}</h2>
        <div className={`card-sm stack ${correct === upiRounds.length ? 'verdict-good' : 'verdict-mixed'}`} role="status">
          <strong>{t('tools.upiPractice.score', { correct, total: upiRounds.length })}</strong>
          <p>{t('tools.upiPractice.rule')}</p>
        </div>
        <ul className="tl-rules">
          {['pin', 'receive', 'otp'].map((rule) => (
            <li key={rule} className="card-sm">
              {t(`tools.upiPractice.rule.${rule}`)}
            </li>
          ))}
        </ul>
        <button type="button" className="btn btn-secondary btn-block" onClick={restart}>
          {t('tools.upiPractice.again')}
        </button>
      </section>
    );
  }

  const round = upiRounds[index]!;
  const choose = (pick: Pick) => {
    if (picked) return;
    setPicked(pick);
    if (pick === round.safe) setCorrect((c) => c + 1);
  };
  const right = picked === round.safe;

  return (
    <section className="card stack tl-tool" data-tool-id="upiPractice">
      <div className="tl-head">
        <h2>{t('tools.upiPractice.title')}</h2>
        <span className="eyebrow e-blue">{t('tools.upiPractice.progress', { n: index + 1, total: upiRounds.length })}</span>
      </div>
      <p className="muted">{t('tools.upiPractice.pretend')}</p>

      <div className="card-sm stack tl-phone">
        <span className="tl-label">{t(`tools.upiPractice.${round.id}.from`)}</span>
        <span className="num tl-phone-amount">{formatINR(round.amount)}</span>
        <p>{t(`tools.upiPractice.${round.id}.screen`, { amount: formatINR(round.amount) })}</p>
      </div>

      {!picked ? (
        <div className="tl-choices">
          <button type="button" className="btn btn-secondary" onClick={() => choose('pin')}>
            {t(`tools.upiPractice.${round.id}.pin`)}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => choose('decline')}>
            {t(`tools.upiPractice.${round.id}.decline`)}
          </button>
        </div>
      ) : (
        <>
          <div className={`card-sm stack ${right ? 'verdict-good' : 'verdict-bad'}`} role="status">
            <strong>{t(right ? 'tools.upiPractice.right' : 'tools.upiPractice.wrong')}</strong>
            <p>{t(`tools.upiPractice.${round.id}.why`, { amount: formatINR(round.amount) })}</p>
            <p className="muted">
              {t(round.direction === 'out' ? 'tools.upiPractice.moneyOut' : 'tools.upiPractice.moneyIn', {
                amount: formatINR(round.amount),
              })}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={() => {
              setPicked(null);
              setIndex((i) => i + 1);
            }}
          >
            {t(index + 1 < upiRounds.length ? 'tools.upiPractice.next' : 'tools.upiPractice.finish')}
          </button>
        </>
      )}
    </section>
  );
}
