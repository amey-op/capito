import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { eventById } from '@/content';
import { useGameStore } from '@/core/store';
import type { Effect } from '@/core/types';
import { engine } from '@/engine';
import { Buckets } from '@/features/portfolio/Buckets';
import { CreditCard } from '@/features/portfolio/CreditCard';
import { EffectList } from '@/features/portfolio/EffectList';
import { Liabilities, ThingsOwned } from '@/features/portfolio/Liabilities';
import { NextStep } from '@/features/portfolio/NextStep';
import { PlanMonth } from '@/features/portfolio/PlanMonth';
import { Summary } from '@/features/portfolio/Summary';
import { TopCard } from '@/features/portfolio/TopCard';
import { WantsGoals } from '@/features/portfolio/WantsGoals';
import '@/features/portfolio/portfolio.css';

/**
 * The portfolio. Right after a lesson's quiz it opens on Plan the Month; once the month is
 * closed it shows what the month did, any life events waiting, and then the portfolio itself.
 */
export function PortfolioPage() {
  const { t } = useTranslation();
  const game = useGameStore((s) => s.game);
  const dispatch = useGameStore((s) => s.dispatch);
  const [closed, setClosed] = useState<{ month: number; effects: Effect[] } | null>(null);

  if (game.awaitingPlan) {
    return <PlanMonth game={game} dispatch={dispatch} onClosed={(effects) => setClosed({ month: game.month, effects })} />;
  }

  const pending = game.pendingEvents.filter((id) => eventById.has(id));
  // Nothing earned yet: point the student at the first lesson instead of an empty page.
  const isNewPlayer = Object.keys(game.progress).length === 0 && engine.netWorth(game) === 0;
  return (
    <div className="stack">
      <div>
        <span className="eyebrow">{t('portfolio.eyebrow')}</span>
        <h1 id="page-title">{t('portfolio.title')}</h1>
      </div>

      {closed && (
        <section className="card panel-blue stack" role="status">
          <h2>{t('portfolio.closed.title', { month: closed.month })}</h2>
          <EffectList effects={closed.effects} />
        </section>
      )}

      {pending.length > 0 && (
        <section className="card panel-yellow stack" aria-labelledby="pf-pending">
          <h2 id="pf-pending">{t('portfolio.pending.title')}</h2>
          <p>{t('portfolio.pending.hint')}</p>
          <ul className="pf-list">
            {pending.map((id) => (
              <li key={id}>
                <Link className="btn btn-secondary btn-block" to={`/event/${id}`}>
                  {t(eventById.get(id)!.titleKey)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Summary game={game} />

      {!isNewPlayer && pending.length === 0 && <NextStep game={game} />}

      {isNewPlayer && (
        <section className="card panel-blue stack" aria-labelledby="pf-start">
          <h2 id="pf-start">{t('portfolio.start.title')}</h2>
          <p>{t('portfolio.start.text')}</p>
          <div>
            <Link className="btn btn-primary" to="/">
              {t('portfolio.start.cta')}
            </Link>
          </div>
        </section>
      )}

      <TopCard game={game} />
      <CreditCard game={game} />
      <Buckets game={game} dispatch={dispatch} />
      <WantsGoals game={game} dispatch={dispatch} />
      <ThingsOwned game={game} />
      <Liabilities game={game} dispatch={dispatch} />

      <section className="card-sm stack" aria-labelledby="pf-practice">
        <h2 id="pf-practice">{t('portfolio.practice.title')}</h2>
        <div className="row">
          <Link className="btn btn-secondary pf-btn" to="/scam-shield">
            {t('portfolio.practice.scamShield')}
          </Link>
          <Link className="btn btn-secondary pf-btn" to="/tool/budgetBuilder">
            {t('portfolio.practice.budget')}
          </Link>
        </div>
      </section>

      <p className="muted">{t('portfolio.practiceMoney')}</p>
    </div>
  );
}
