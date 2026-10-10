import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { LifeEvent } from '@/core/content-schema';
import { formatINRDelta } from '@/core/format';
import type { Action, Effect, GameState, Tone, WhatIf } from '@/core/types';
import { engine } from '@/engine';
import { EffectList } from './EffectList';

interface EventViewProps {
  game: GameState;
  event: LifeEvent;
  dispatch: (action: Action) => Effect[];
}

const panel: Record<Tone, string> = { good: 'panel-green', mixed: 'panel-yellow', bad: 'panel-red' };

function WhatIfList({ event, previews, chosenId }: { event: LifeEvent; previews: WhatIf[]; chosenId: string }) {
  const { t } = useTranslation();
  const others = previews.filter((p) => p.choiceId !== chosenId && p.available);
  if (others.length === 0) return null;
  return (
    <div className="stack">
      <h2>{t('portfolio.event.whatIf')}</h2>
      <p className="muted">{t('portfolio.event.whatIfHint')}</p>
      <ul className="pf-list">
        {others.map((p) => {
          const choice = event.choices.find((c) => c.id === p.choiceId)!;
          return (
            <li key={p.choiceId} className={`card-sm stack verdict-${p.verdict}`}>
              <strong>{t(choice.labelKey)}</strong>
              <span>
                <span className={`pf-verdict-${p.verdict}`}>{t(`portfolio.verdict.${p.verdict}`)}</span>
                {' · '}
                {t('portfolio.event.netWorthChange', { amount: formatINRDelta(p.netWorthDelta) })}
              </span>
              <span>{t(choice.whyKey)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * One life event: intro and choices, then the outcome card (what moved, the verdict colour and the
 * one-line "why"), what-if previews of the other choices, and one chance to try again.
 */
export function EventView({ game, event, dispatch }: EventViewProps) {
  const { t } = useTranslation();
  // Chips for the choice just made. Reopening the event later shows its record without them.
  const [effects, setEffects] = useState<Effect[]>([]);
  const record = game.events[event.id];
  const snapshot = game.retrySnapshot?.eventId === event.id ? game.retrySnapshot : null;
  const choose = (choiceId: string, isRetry: boolean) =>
    setEffects(dispatch({ type: 'RESOLVE_EVENT', eventId: event.id, choiceId, isRetry }));
  const next = game.pendingEvents.find((id) => id !== event.id);

  const header = (
    <>
      <div>
        <span className={`eyebrow ${event.kind === 'scamAlert' ? 'e-red' : 'e-purple'}`}>
          {t(event.kind === 'scamAlert' ? 'portfolio.event.scamAlert' : 'portfolio.event.life')}
        </span>
      </div>
      <h1 id="pf-event">{t(event.titleKey)}</h1>
      <p>{t(event.introKey)}</p>
    </>
  );

  if (!record) {
    const available = engine.availableChoices(game, event);
    return (
      <section className="stack" aria-labelledby="pf-event">
        {header}
        <div className="pf-choices">
          {available.map((c) => (
            <button key={c.id} type="button" className="btn btn-secondary pf-choice" onClick={() => choose(c.id, false)}>
              {t(c.labelKey)}
            </button>
          ))}
        </div>
        <p className="muted">{t('portfolio.event.fixed')}</p>
      </section>
    );
  }

  const chosen = event.choices.find((c) => c.id === record.finalChoiceId)!;
  const before = snapshot ? ({ ...snapshot.before, retrySnapshot: null } as GameState) : null;
  const canRetry = before !== null && !record.retried;
  return (
    <section className="stack" aria-labelledby="pf-event">
      {header}

      <div className={`card stack ${panel[chosen.verdict]}`} role="status">
        <span className="pf-label">{t('portfolio.event.youChose')}</span>
        <strong>{t(chosen.labelKey)}</strong>
        <p>{t(chosen.outcomeKey)}</p>
        <EffectList effects={effects} />
        <p>
          <strong className={`pf-verdict-${chosen.verdict}`}>{t(`portfolio.verdict.${chosen.verdict}`)}</strong>
          {' · '}
          {t(chosen.whyKey)}
        </p>
      </div>

      {before && <WhatIfList event={event} previews={engine.whatIf(before, event)} chosenId={chosen.id} />}

      {canRetry && (
        <div className="card-sm stack">
          <h2>{t('portfolio.event.tryAgain')}</h2>
          <p className="muted">{t('portfolio.event.tryAgainHint')}</p>
          <div className="pf-choices">
            {engine
              .availableChoices(before, event)
              .filter((c) => c.id !== chosen.id)
              .map((c) => (
                <button key={c.id} type="button" className="btn btn-secondary pf-choice" onClick={() => choose(c.id, true)}>
                  {t(c.labelKey)}
                </button>
              ))}
          </div>
        </div>
      )}
      {record.retried && <p className="muted">{t('portfolio.event.retried')}</p>}

      <Link className="btn btn-primary btn-block" to={next ? `/event/${next}` : '/portfolio'}>
        {t(next ? 'portfolio.event.next' : 'portfolio.event.done')}
      </Link>
    </section>
  );
}
