import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { selectDispatch, useGameStore } from '@/core/store';
import { buildDeck, type Scenario } from './deck';
import './scamshield.css';

interface ScamShieldPageProps {
  /** Fixed deck for tests; a fresh shuffled round otherwise. */
  deck?: Scenario[];
  /** Inside a lesson or the tool page: no page heading and no links away from the lesson. */
  embedded?: boolean;
}

/** Scam Shield: read a message, call it a scam or fine, then see the tell-tale signs. */
export function ScamShieldPage({ deck: fixedDeck, embedded = false }: ScamShieldPageProps) {
  const { t } = useTranslation();
  const dispatch = useGameStore(selectDispatch);
  const shield = useGameStore((s) => s.game.shield);

  const [deck, setDeck] = useState<Scenario[]>(() => fixedDeck ?? buildDeck());
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [vote, setVote] = useState<boolean | null>(null);
  const [finished, setFinished] = useState(false);

  const scenario = deck[index];
  const title = (
    <div>
      <span className="eyebrow e-red">{t('scamshield.ui.eyebrow')}</span>
      {embedded ? <h2>{t('scamshield.ui.title')}</h2> : <h1>{t('scamshield.ui.title')}</h1>}
    </div>
  );
  const wrap = embedded ? 'card stack' : 'stack';
  const more = embedded ? null : (
    <section className="card-sm stack" aria-labelledby="ss-more">
      <h2 id="ss-more">{t('scamshield.ui.more')}</h2>
      <div className="row">
        <Link className="btn btn-secondary" to="/tool/checkIt">
          {t('scamshield.checkIt.title')}
        </Link>
        <Link className="btn btn-secondary" to="/tool/nowWhat">
          {t('scamshield.nowWhat.title')}
        </Link>
      </div>
    </section>
  );

  if (finished || !scenario) {
    const all = correct === deck.length;
    return (
      <div className={wrap} data-tool-id="scamShield">
        {title}
        <section className={`card stack ${all ? 'panel-green' : 'panel-yellow'}`} role="status">
          <span className="ss-label">{t('scamshield.ui.resultLabel')}</span>
          <strong className="num ss-score">{t('scamshield.ui.score', { correct, total: deck.length })}</strong>
          <p>{t(all ? 'scamshield.ui.resultAll' : 'scamshield.ui.resultSome')}</p>
          <p className="muted">{t('scamshield.ui.shieldTotal', { correct: shield.correct, seen: shield.seen })}</p>
        </section>
        <div className="row">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setDeck(fixedDeck ?? buildDeck());
              setIndex(0);
              setCorrect(0);
              setVote(null);
              setFinished(false);
            }}
          >
            {t('scamshield.ui.again')}
          </button>
          {!embedded && (
            <Link className="btn btn-secondary" to="/portfolio">
              {t('scamshield.ui.toPortfolio')}
            </Link>
          )}
        </div>
        {more}
      </div>
    );
  }

  const answered = vote !== null;
  const right = vote === scenario.isScam;
  const last = index === deck.length - 1;

  const choose = (votedScam: boolean) => {
    if (answered) return;
    setVote(votedScam);
    if (votedScam === scenario.isScam) setCorrect((c) => c + 1);
  };
  const next = () => {
    if (last) {
      // One result per finished round feeds the scam-safety part of the Money Health Score.
      dispatch({ type: 'SHIELD_RESULT', seen: deck.length, correct });
      setFinished(true);
      return;
    }
    setVote(null);
    setIndex((i) => i + 1);
  };

  return (
    <div className={wrap} data-tool-id="scamShield">
      {title}
      <p>{t('scamshield.ui.intro')}</p>

      <div className="ss-head">
        <span className="ss-label">{t('scamshield.ui.progress', { n: index + 1, total: deck.length })}</span>
        <span className="ss-label">{t('scamshield.ui.correctSoFar', { correct })}</span>
      </div>
      <div className="ss-progress" aria-hidden="true">
        <span style={{ width: `${((index + (answered ? 1 : 0)) / deck.length) * 100}%` }} />
      </div>

      <section className={`${embedded ? 'card-sm' : 'card'} stack`} aria-labelledby="ss-message">
        <div>
          <span className="eyebrow e-blue">{t(`scamshield.channel.${scenario.channel}`)}</span>
        </div>
        <p id="ss-message" className="ss-message">
          {t(`scamshield.scenario.${scenario.id}.message`)}
        </p>
      </section>

      {!answered ? (
        <div className="ss-choices">
          <button type="button" className="btn ss-scam" onClick={() => choose(true)}>
            {t('scamshield.ui.scam')}
          </button>
          <button type="button" className="btn ss-ok" onClick={() => choose(false)}>
            {t('scamshield.ui.safe')}
          </button>
        </div>
      ) : (
        <>
          <section className={`card stack ${right ? 'panel-green' : 'panel-red'}`} role="status">
            <h2>{t(right ? 'scamshield.ui.correct' : 'scamshield.ui.wrong')}</h2>
            <p>
              <strong>{t(scenario.isScam ? 'scamshield.ui.wasScam' : 'scamshield.ui.wasGenuine')}</strong>{' '}
              {t(`scamshield.scenario.${scenario.id}.tell`)}
            </p>
            {scenario.isScam && (
              <>
                <div className="stack">
                  <span className="ss-label">{t('scamshield.ui.why')}</span>
                  <ul className="ss-flags">
                    {scenario.redFlags.map((flag) => (
                      <li key={flag} className="ss-flag">
                        {t(`scamshield.flag.${flag}`)}
                      </li>
                    ))}
                  </ul>
                </div>
                <p>{t('scamshield.ui.reportTo', { target: t(`scamshield.scenario.${scenario.id}.report`) })}</p>
              </>
            )}
          </section>
          <button type="button" className="btn btn-primary btn-block" onClick={next}>
            {t(last ? 'scamshield.ui.finish' : 'scamshield.ui.next')}
          </button>
        </>
      )}

      {more}
    </div>
  );
}
