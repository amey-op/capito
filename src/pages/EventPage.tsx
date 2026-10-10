import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { eventById } from '@/content';
import { useGameStore } from '@/core/store';
import { EventView } from '@/features/portfolio/EventView';
import '@/features/portfolio/portfolio.css';

/** A life event or scam alert: choices, outcome card, what-if previews and one try-again. */
export function EventPage() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const game = useGameStore((s) => s.game);
  const dispatch = useGameStore((s) => s.dispatch);
  const event = eventById.get(id);
  const known = event && (game.pendingEvents.includes(id) || game.events[id]);

  if (!event || !known) {
    return (
      <section className="stack" aria-labelledby="pf-event">
        <h1 id="pf-event">{t('portfolio.event.pageTitle')}</h1>
        <div className="card stack">
          <p>{t(event ? 'portfolio.event.notYet' : 'portfolio.event.unknown')}</p>
          <Link className="btn btn-secondary" to="/portfolio">
            {t('portfolio.event.done')}
          </Link>
        </div>
      </section>
    );
  }

  return <EventView key={id} game={game} event={event} dispatch={dispatch} />;
}
