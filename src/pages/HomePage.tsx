import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { eventById, lessonById, lessons } from '@/content';
import { levels } from '@/content/curriculum';
import { formatINR } from '@/core/format';
import { useGameStore } from '@/core/store';
import { lessonStates, levelState, nextStep, type LessonState } from '@/features/home/progress';
import '@/features/home/home.css';

export function HomePage() {
  const { t } = useTranslation();
  const game = useGameStore((s) => s.game);
  const states = lessonStates(lessons, game.progress);
  const next = nextStep(game, lessons, (id) => eventById.has(id));
  const doneCount = lessons.filter((l) => states.get(l.id) === 'done').length;

  const cont = (() => {
    switch (next.kind) {
      case 'plan':
        return { to: '/portfolio', label: t('ui.home.next.plan', { month: game.month }) };
      case 'event':
        return { to: `/event/${next.eventId}`, label: t('ui.home.next.event', { title: t(eventById.get(next.eventId)!.titleKey) }) };
      case 'lesson': {
        const title = t(lessonById.get(next.lessonId)!.titleKey);
        return { to: `/lesson/${next.lessonId}`, label: t(next.first ? 'ui.home.next.start' : 'ui.home.next.lesson', { title }) };
      }
      case 'finished':
        return { to: '/portfolio', label: t('ui.home.next.finished') };
    }
  })();

  return (
    <div className="stack home">
      <section className="card panel-blue stack home-hero" aria-labelledby="page-title">
        <div>
          <span className="eyebrow e-blue">{t('ui.month', { month: game.month })}</span>
          <h1 id="page-title">{t('ui.home.title')}</h1>
          <p className="home-sub">{t('ui.app.tagline')}</p>
        </div>
        <dl className="home-stats">
          <div className="card-sm">
            <dt className="muted">{t('ui.home.stat.month')}</dt>
            <dd className="num">{game.month}</dd>
          </div>
          <div className="card-sm">
            <dt className="muted">{t('ui.wallet')}</dt>
            <dd className="num">{formatINR(game.buckets.wallet)}</dd>
          </div>
          <div className="card-sm">
            <dt className="muted">{t('ui.home.stat.lessons')}</dt>
            <dd className="num">{t('ui.home.stat.lessonsValue', { done: doneCount, total: lessons.length })}</dd>
          </div>
        </dl>
        <div className="row">
          <Link className="btn btn-primary home-continue" to={cont.to}>
            {cont.label}
          </Link>
          <Link className="btn btn-secondary" to="/portfolio">
            {t('ui.nav.portfolio')}
          </Link>
          <Link className="btn btn-secondary" to="/tools">
            {t('ui.nav.tools')}
          </Link>
        </div>
      </section>

      {game.milestones.length > 0 && (
        <section className="stack" aria-labelledby="home-ms">
          <h2 id="home-ms">{t('ui.home.milestones')}</h2>
          <ul className="row home-milestones" role="list">
            {game.milestones.map((id) => (
              <li key={id} className="card-sm">
                {t(`portfolio.milestone.${id}`, { defaultValue: id })}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="stack" aria-labelledby="home-map">
        <h2 id="home-map">{t('ui.home.map')}</h2>
        <ol className="home-levels" role="list">
          {levels.map((n) => {
            const mine = lessons.filter((l) => l.level === n);
            if (mine.length === 0) return null;
            const st = levelState(mine, states);
            return (
              <li key={n} className={`card home-level is-${st}`}>
                <div className="row home-level-head">
                  <span className="eyebrow">{t('ui.home.level', { level: n })}</span>
                  <StatePill state={st} />
                </div>
                <h3>{t(`ui.level.${n}.title`)}</h3>
                <p className="muted">{t(`ui.level.${n}.tagline`)}</p>
                <ul className="home-lessons" role="list">
                  {mine.map((l) => {
                    const ls = states.get(l.id)!;
                    const label = (
                      <>
                        <span className="home-lesson-id num">{l.id}</span>
                        <span className="home-lesson-title">{t(l.titleKey)}</span>
                        <StatePill state={ls} small />
                      </>
                    );
                    return (
                      <li key={l.id}>
                        {ls === 'locked' ? (
                          <span className="home-lesson is-locked" aria-disabled="true">
                            {label}
                          </span>
                        ) : (
                          <Link className={`home-lesson is-${ls}`} to={`/lesson/${l.id}`}>
                            {label}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

function StatePill({ state, small }: { state: LessonState; small?: boolean }) {
  const { t } = useTranslation();
  return <span className={`home-pill is-${state}${small ? ' is-small' : ''}`}>{t(`ui.home.state.${state}`)}</span>;
}
