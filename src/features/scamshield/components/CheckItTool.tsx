import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../scamshield.css';

const questions = [1, 2, 3, 4, 5] as const;

/** The five-point check to run before any money leaves: more than one "no" means stop. */
export function CheckItTool() {
  const { t } = useTranslation();
  const [answers, setAnswers] = useState<Record<number, boolean | undefined>>({});

  const noCount = questions.filter((q) => answers[q] === false).length;
  const answeredAll = questions.every((q) => answers[q] !== undefined);
  const verdict = noCount > 1 ? 'Stop' : noCount === 1 ? 'Careful' : 'Safe';

  return (
    <section className="card stack" data-tool-id="checkIt">
      <h2>{t('scamshield.checkIt.title')}</h2>
      <p>{t('scamshield.checkIt.intro')}</p>

      <ul className="ss-list">
        {questions.map((q) => (
          <li key={q} className="card-sm ss-question">
            <p id={`ss-q${q}`}>{t(`scamshield.checkIt.q${q}`)}</p>
            <div className="ss-yesno" role="group" aria-labelledby={`ss-q${q}`}>
              <button
                type="button"
                className={`btn ${answers[q] === true ? 'ss-pick' : 'btn-secondary'}`}
                aria-pressed={answers[q] === true}
                onClick={() => setAnswers((prev) => ({ ...prev, [q]: true }))}
              >
                {t('scamshield.checkIt.yes')}
              </button>
              <button
                type="button"
                className={`btn ${answers[q] === false ? 'ss-pick' : 'btn-secondary'}`}
                aria-pressed={answers[q] === false}
                onClick={() => setAnswers((prev) => ({ ...prev, [q]: false }))}
              >
                {t('scamshield.checkIt.no')}
              </button>
            </div>
          </li>
        ))}
      </ul>

      {answeredAll ? (
        <div className={`card-sm stack ${verdict === 'Stop' ? 'verdict-bad' : verdict === 'Careful' ? 'verdict-mixed' : 'verdict-good'}`} role="status">
          <strong>{t(`scamshield.checkIt.verdict${verdict}`)}</strong>
          <div>
            <button type="button" className="btn btn-secondary" onClick={() => setAnswers({})}>
              {t('scamshield.checkIt.reset')}
            </button>
          </div>
        </div>
      ) : (
        <p className="muted">{t('scamshield.checkIt.pending')}</p>
      )}
    </section>
  );
}
