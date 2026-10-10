import { useTranslation } from 'react-i18next';
import { merged } from '@/content/i18n';
import { formatINR, formatPct } from '@/core/format';
import type { GameState } from '@/core/types';
import { engine } from '@/engine';

const en = merged.resources.en ?? {};
const oneDecimal = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 });

function BeforeAfter({ label, before, after }: { label: string; before: string; after: string }) {
  const { t } = useTranslation();
  return (
    <div className="card-sm pf-compare">
      <span className="pf-label">{label}</span>
      <span className="pf-compare-row">
        <span>
          <span className="muted">{t('portfolio.summary.start')}</span> <span className="num">{before}</span>
        </span>
        <span aria-hidden="true">→</span>
        <span>
          <span className="muted">{t('portfolio.summary.now')}</span> <span className="num">{after}</span>
        </span>
      </span>
    </div>
  );
}

/**
 * End-of-game summary, shown on the portfolio once the final quiz is done: the quiz score,
 * where the student started and stands now, the milestones earned and a one-page money plan
 * built from their own numbers. It reports what happened; it does not grade or recommend.
 */
export function Summary({ game }: { game: GameState }) {
  const { t } = useTranslation();
  if (!game.finalQuiz) return null;

  const start = engine.newGame();
  const healthStart = engine.health(start);
  const health = engine.health(game);
  const milestones = game.milestones.filter((id) => `portfolio.milestone.${id}` in en);
  const goals = game.goals.filter((g) => g.status !== 'missed');
  const months = oneDecimal.format(health.emergency.value);

  return (
    <section className="card panel-green stack" aria-labelledby="pf-summary">
      <div>
        <span className="eyebrow e-green">{t('portfolio.summary.eyebrow')}</span>
        <h2 id="pf-summary">{t('portfolio.summary.title')}</h2>
      </div>

      <p>
        <strong>{t('portfolio.summary.quiz', { correct: game.finalQuiz.correct, total: game.finalQuiz.total })}</strong>{' '}
        {t('portfolio.summary.quizNote')}
      </p>

      <div className="stack">
        <h3>{t('portfolio.summary.beforeAfter')}</h3>
        <div className="pf-grid">
          <BeforeAfter label={t('portfolio.health.title')} before={String(healthStart.total)} after={String(health.total)} />
          <BeforeAfter label={t('portfolio.netWorth')} before={formatINR(engine.netWorth(start))} after={formatINR(engine.netWorth(game))} />
        </div>
      </div>

      <div className="stack">
        <h3>{t('portfolio.summary.milestones', { n: milestones.length })}</h3>
        {milestones.length === 0 ? (
          <p className="muted">{t('portfolio.summary.noMilestones')}</p>
        ) : (
          <ul className="pf-effects">
            {milestones.map((id) => (
              <li key={id} className="pf-effect is-up">
                {t(`portfolio.milestone.${id}`)}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card-sm stack">
        <h3>{t('portfolio.summary.plan')}</h3>
        <p className="muted">{t('portfolio.summary.planHint')}</p>
        <ul className="pf-plan">
          <li>
            <span className="pf-label">{t('portfolio.summary.plan.goals')}</span>
            <span>
              {goals.length === 0
                ? t('portfolio.summary.plan.noGoals')
                : goals.map((g) => t('portfolio.summary.plan.goal', { name: g.name, amount: formatINR(g.amount) })).join(' · ')}
            </span>
          </li>
          <li>
            <span className="pf-label">{t('portfolio.summary.plan.saving')}</span>
            <span>{t('portfolio.summary.plan.savingText', { rate: formatPct(health.savingsRate.value, 0) })}</span>
          </li>
          <li>
            <span className="pf-label">{t('portfolio.summary.plan.safety')}</span>
            <span>{t('portfolio.summary.plan.safetyText', { months, amount: formatINR(game.buckets.emergency) })}</span>
          </li>
          <li>
            <span className="pf-label">{t('portfolio.summary.plan.habit')}</span>
            <span>{t('portfolio.summary.plan.habitText')}</span>
          </li>
        </ul>
      </div>

      <div className="card-sm stack">
        <h3>{t('portfolio.summary.talk')}</h3>
        <ol className="pf-talk">
          {[1, 2, 3].map((n) => (
            <li key={n}>{t(`portfolio.summary.talk.q${n}`)}</li>
          ))}
        </ol>
      </div>

      <p className="muted">{t('portfolio.summary.note')}</p>
    </section>
  );
}
