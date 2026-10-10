import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatINR } from '@/core/format';
import '../tools.css';

/**
 * Practice screens, in two tabs like a payments app. `tab` is what the screen claims to be about;
 * `direction` is where the money would really go; `safe` is the choice that keeps the student's
 * money safe. The rule under all of them: a UPI PIN only ever sends money.
 */
export const upiRounds = [
  { id: 'canteen', tab: 'send', direction: 'out', amount: 120, safe: 'pin' },
  { id: 'otpCall', tab: 'send', direction: 'out', amount: 1500, safe: 'decline' },
  { id: 'friend', tab: 'receive', direction: 'in', amount: 200, safe: 'decline' },
  { id: 'refund', tab: 'receive', direction: 'out', amount: 500, safe: 'decline' },
  { id: 'prizeQr', tab: 'receive', direction: 'out', amount: 2000, safe: 'decline' },
] as const;

type Tab = 'send' | 'receive';
type Pick = 'pin' | 'decline';
type RoundId = (typeof upiRounds)[number]['id'];
const tabs: Tab[] = ['send', 'receive'];

/** Pretend payment screens: decide when a PIN belongs and when it is a trap. Nothing here is a real payment. */
export function UpiPractice() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('send');
  const [picks, setPicks] = useState<Partial<Record<RoundId, Pick>>>({});
  // The screen being shown stays up after an answer until the student moves on.
  const [shown, setShown] = useState<RoundId | null>(null);

  const inTab = (which: Tab) => upiRounds.filter((r) => r.tab === which);
  const left = (which: Tab) => inTab(which).filter((r) => !picks[r.id]).length;
  const correct = upiRounds.filter((r) => picks[r.id] === r.safe).length;
  const allDone = upiRounds.every((r) => picks[r.id]) && shown === null;

  const restart = () => {
    setPicks({});
    setShown(null);
    setTab('send');
  };

  const tabBar = (
    <div className="tl-tabs" role="tablist" aria-label={t('tools.upiPractice.title')}>
      {tabs.map((which) => (
        <button
          key={which}
          type="button"
          role="tab"
          aria-selected={tab === which}
          className={`btn tl-tab${tab === which ? ' is-on' : ''}`}
          onClick={() => {
            setTab(which);
            setShown(null);
          }}
        >
          {t(`tools.upiPractice.tab.${which}`)}
          <span className="num">{t('tools.upiPractice.tabLeft', { n: left(which) })}</span>
        </button>
      ))}
    </div>
  );

  if (allDone) {
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

  const round = upiRounds.find((r) => r.id === shown) ?? inTab(tab).find((r) => !picks[r.id]);

  if (!round) {
    // This tab is finished; the other one still has screens.
    const other: Tab = tab === 'send' ? 'receive' : 'send';
    return (
      <section className="card stack tl-tool" data-tool-id="upiPractice">
        <h2>{t('tools.upiPractice.title')}</h2>
        {tabBar}
        <p className="card-sm">{t(`tools.upiPractice.tabDone.${tab}`)}</p>
        <button type="button" className="btn btn-primary btn-block" onClick={() => setTab(other)}>
          {t(`tools.upiPractice.goTo.${other}`)}
        </button>
      </section>
    );
  }

  const picked = picks[round.id];
  const right = picked === round.safe;
  const choose = (pick: Pick) => {
    if (picked) return;
    setPicks((prev) => ({ ...prev, [round.id]: pick }));
    setShown(round.id);
  };

  return (
    <section className="card stack tl-tool" data-tool-id="upiPractice">
      <h2>{t('tools.upiPractice.title')}</h2>
      <p className="muted">{t('tools.upiPractice.pretend')}</p>
      {tabBar}

      <div className="card-sm stack tl-phone" role="tabpanel">
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
          <button type="button" className="btn btn-primary btn-block" onClick={() => setShown(null)}>
            {t(upiRounds.every((r) => picks[r.id]) ? 'tools.upiPractice.finish' : 'tools.upiPractice.next')}
          </button>
        </>
      )}
    </section>
  );
}
