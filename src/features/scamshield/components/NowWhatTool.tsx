import { useTranslation } from 'react-i18next';
import '../scamshield.css';

const steps = [1, 2, 3, 4, 5, 6] as const;

/** What to do, in order, if money has already gone to a scammer. */
export function NowWhatTool() {
  const { t } = useTranslation();
  return (
    <section className="card stack" data-tool-id="nowWhat">
      <h2>{t('scamshield.nowWhat.title')}</h2>
      <p>{t('scamshield.nowWhat.intro')}</p>
      <ol className="ss-list">
        {steps.map((step) => (
          <li key={step} className="card-sm ss-step">
            <span className="ss-step-n" aria-hidden="true">
              {step}
            </span>
            <div>
              <strong>{t(`scamshield.nowWhat.step${step}`)}</strong>
              <p>{t(`scamshield.nowWhat.step${step}_desc`)}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
