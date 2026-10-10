import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { eventById, lessonById } from '@/content';
import { formatPct } from '@/core/format';
import { useGameStore } from '@/core/store';
import {
  completionByLevel,
  learnerFromGame,
  learnerRows,
  lowestLessons,
  quizByLevel,
  scamSafety,
  summaryTiles,
  weakSpots,
  WEAK_MIN_SEEN,
  type WeakSpot,
} from './aggregate';
import { DEMO_CLASS, demoClass } from './demoClass';
import { LearnersTable } from './LearnersTable';
import { LevelChart } from './LevelChart';

const TOP_WEAK = 5;
const updatedDate = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(
  new Date(`${DEMO_CLASS.updated}T00:00:00Z`),
);

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-sm ngo-tile">
      <span className="ngo-tile-label">{label}</span>
      <span className="num ngo-tile-value">{value}</span>
    </div>
  );
}

function WeakSpotCard({ spot }: { spot: WeakSpot }) {
  const { t } = useTranslation();
  const event = eventById.get(spot.eventId);
  const choice = event?.choices.find((c) => c.id === spot.badChoiceId);
  if (!event || !choice) return null;
  return (
    <li className="card-sm stack ngo-weak">
      <div className="row ngo-weak-head">
        <span className={`ngo-kind ${spot.kind === 'scamAlert' ? 'is-scam' : 'is-life'}`}>{t(`ngo.weak.kind.${spot.kind}`)}</span>
        <h3>{t(event.titleKey)}</h3>
      </div>
      <p>
        <b>{t('ngo.weak.line', { pct: spot.pct, choice: t(choice.labelKey) })}</b>{' '}
        <span className="muted">({t('ngo.weak.seen', { bad: spot.bad, seen: spot.seen })})</span>
      </p>
      <div className="ngo-meter" aria-hidden="true">
        <span style={{ width: `${spot.pct}%` }} />
      </div>
      <p className="ngo-hint">
        <b>{t('ngo.weak.hint')}:</b> {t(choice.whyKey)}
      </p>
    </li>
  );
}

/** The NGO class dashboard. Every number comes from ./aggregate over the sample class plus this device. */
export function NgoDashboard() {
  const { t } = useTranslation();
  const game = useGameStore((s) => s.game);
  const deviceName = t('ngo.device.name');
  const learners = useMemo(() => [...demoClass, learnerFromGame(game, deviceName)], [game, deviceName]);
  const [showAllWeak, setShowAllWeak] = useState(false);

  const tiles = summaryTiles(learners);
  const completion = completionByLevel(learners);
  const quiz = quizByLevel(learners);
  const lowest = lowestLessons(learners);
  const weak = weakSpots(learners);
  const scam = scamSafety(learners);
  const rows = useMemo(() => learnerRows(learners), [learners]);
  const shownWeak = showAllWeak ? weak : weak.slice(0, TOP_WEAK);

  return (
    <div className="stack ngo-dash">
      <section className="card stack" aria-labelledby="page-title">
        <span className="eyebrow e-green ngo-eyebrow">{t('ngo.class.eyebrow')}</span>
        <h1 id="page-title">{t('ngo.class.name')}</h1>
        <div className="row ngo-class-meta">
          <span className="ngo-code num">{t('ngo.class.code', { code: DEMO_CLASS.code })}</span>
          <span>{t('ngo.class.learners', { count: tiles.learners })}</span>
          <span className="muted">{t('ngo.class.updated', { date: updatedDate })}</span>
        </div>
        <p className="muted">{t('ngo.header.sampleNote')}</p>
      </section>

      <section className="stack" aria-labelledby="ngo-tiles">
        <h2 id="ngo-tiles">{t('ngo.tiles.title')}</h2>
        <div className="ngo-tiles">
          <Tile label={t('ngo.tiles.active')} value={t('ngo.tiles.activeValue', { active: tiles.active7, total: tiles.learners })} />
          <Tile label={t('ngo.tiles.lessons')} value={t('ngo.tiles.lessonsValue', { avg: tiles.avgLessons, total: tiles.totalLessons })} />
          <Tile label={t('ngo.tiles.quiz')} value={formatPct(tiles.avgQuizPct, 0)} />
          <Tile label={t('ngo.tiles.health')} value={t('ngo.tiles.healthValue', { value: tiles.avgHealth })} />
          <Tile label={t('ngo.tiles.months')} value={t('ngo.tiles.monthsValue', { value: tiles.avgMonths })} />
        </div>
      </section>

      <div className="ngo-two">
        <section className="card stack" aria-labelledby="ngo-levels">
          <h2 id="ngo-levels">{t('ngo.levels.title')}</h2>
          <p className="muted">{t('ngo.levels.intro')}</p>
          <LevelChart data={completion} color="#16a34a" label={t('ngo.levels.chartLabel')} tick={(level) => t('ngo.levels.short', { level })} />
          <ul className="ngo-figures">
            {completion.map((c) => (
              <li key={c.level}>{t('ngo.levels.item', { level: c.level, pct: c.pct })}</li>
            ))}
          </ul>
        </section>

        <section className="card stack" aria-labelledby="ngo-quiz">
          <h2 id="ngo-quiz">{t('ngo.quiz.title')}</h2>
          <p className="muted">{t('ngo.quiz.intro')}</p>
          <LevelChart data={quiz} color="#2563eb" label={t('ngo.quiz.chartLabel')} tick={(level) => t('ngo.levels.short', { level })} />
          <ul className="ngo-figures">
            {quiz.map((q) =>
              q.pct === null ? (
                <li key={q.level} className="muted">
                  {t('ngo.quiz.none', { level: q.level })}
                </li>
              ) : (
                <li key={q.level}>{t('ngo.quiz.item', { level: q.level, pct: q.pct })}</li>
              ),
            )}
          </ul>
          <h3>{t('ngo.quiz.lowestTitle')}</h3>
          <ol className="stack ngo-lowest">
            {lowest.map((l) => {
              const lesson = lessonById.get(l.lessonId);
              return (
                <li key={l.lessonId}>
                  <b>
                    {l.lessonId} · {lesson ? t(lesson.titleKey) : l.lessonId}
                  </b>
                  <br />
                  <span className="muted">{t('ngo.quiz.lowestItem', { pct: l.pct, count: l.learners })}</span>
                </li>
              );
            })}
          </ol>
        </section>
      </div>

      <section className="stack" aria-labelledby="ngo-weak">
        <h2 id="ngo-weak">{t('ngo.weak.title')}</h2>
        <p className="muted">
          {t('ngo.weak.intro')} {t('ngo.weak.min', { count: WEAK_MIN_SEEN })}
        </p>
        <ol className="stack ngo-weak-list">
          {shownWeak.map((s) => (
            <WeakSpotCard key={s.eventId} spot={s} />
          ))}
        </ol>
        {weak.length > TOP_WEAK && (
          <div>
            <button type="button" className="btn btn-secondary" aria-expanded={showAllWeak} onClick={() => setShowAllWeak((v) => !v)}>
              {showAllWeak ? t('ngo.weak.less') : t('ngo.weak.more', { count: weak.length })}
            </button>
          </div>
        )}
      </section>

      <section className="card panel-red stack" aria-labelledby="ngo-scam">
        <h2 id="ngo-scam">{t('ngo.scam.title')}</h2>
        <p className="ngo-big">{t('ngo.scam.value', { pct: scam.pct })}</p>
        <p>{t('ngo.scam.detail', { correct: scam.correct, seen: scam.seen })}</p>
      </section>

      <section className="stack" aria-labelledby="ngo-table">
        <h2 id="ngo-table">{t('ngo.table.title')}</h2>
        <p className="muted">{t('ngo.table.intro')}</p>
        <p className="ngo-device-note">{t('ngo.device.note')}</p>
        <LearnersTable rows={rows} />
      </section>

      <section className="card panel-blue stack" aria-labelledby="ngo-privacy">
        <h2 id="ngo-privacy">{t('ngo.privacy.title')}</h2>
        <div className="ngo-two">
          <div className="stack">
            <h3>{t('ngo.privacy.seesTitle')}</h3>
            <ul className="ngo-list">
              {[1, 2, 3, 4].map((n) => (
                <li key={n}>{t(`ngo.privacy.sees${n}`)}</li>
              ))}
            </ul>
          </div>
          <div className="stack">
            <h3>{t('ngo.privacy.neverTitle')}</h3>
            <ul className="ngo-list is-never">
              {[1, 2, 3, 4, 5].map((n) => (
                <li key={n}>{t(`ngo.privacy.never${n}`)}</li>
              ))}
            </ul>
          </div>
        </div>
        <p>{t('ngo.privacy.full')}</p>
      </section>
    </div>
  );
}
