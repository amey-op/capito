import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { lessons } from '@/content';
import type { GameState } from '@/core/types';

/** The first lesson, in curriculum order, that this player has not finished yet. */
export const nextLesson = (game: GameState) => lessons.find((l) => !game.progress[l.id]);

/**
 * Shown once the month is closed and no life event is waiting: the way on to the next lesson,
 * so the loop lesson → plan → events → lesson never dead-ends on the portfolio.
 */
export function NextStep({ game }: { game: GameState }) {
  const { t } = useTranslation();
  const next = nextLesson(game);
  return (
    <section className="card panel-green stack" aria-labelledby="pf-next">
      <h2 id="pf-next">{t(next ? 'portfolio.next.title' : 'portfolio.next.allDone')}</h2>
      {next ? (
        <>
          <p>{t('portfolio.next.text', { id: next.id, title: t(next.titleKey) })}</p>
          <div>
            <Link className="btn btn-primary" to={`/lesson/${next.id}`}>
              {t('portfolio.next.cta', { id: next.id })}
            </Link>
          </div>
        </>
      ) : (
        <p>{t('portfolio.next.allDoneText')}</p>
      )}
    </section>
  );
}
