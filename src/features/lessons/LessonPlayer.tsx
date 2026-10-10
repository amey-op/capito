import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { Lesson } from '@/core/content-schema';
import { quizPayout, retryBonus } from '@/core/finance';
import { formatINR } from '@/core/format';
import { useGameStore } from '@/core/store';
import { ToolEmbed } from '@/features/tools';
import { Art } from './Art';
import { Interaction } from './interactions';
import { QuizRunner } from './QuizRunner';
import { TermText } from './TermText';
import './lessons.css';

type Step = 'gut' | 'cards' | 'tool' | 'quiz' | 'final' | 'result';

/** Steps this lesson has, in order. The tool step is skipped if a card already embeds the same tool. */
export function lessonSteps(lesson: Lesson): Step[] {
  const toolInCard = lesson.cards.some((c) => c.interaction?.type === 'tool' && c.interaction.toolId === lesson.tool?.id);
  return [
    'gut',
    'cards',
    ...(lesson.tool && !toolInCard ? (['tool'] as const) : []),
    'quiz',
    ...(lesson.finalQuiz ? (['final'] as const) : []),
    'result',
  ];
}

interface Outcome {
  correct: number;
  paid: number;
  firstTime: boolean;
  final?: number;
}

/**
 * One lesson = one game-month: gut-check → cards → tool → quiz → practice money → Plan the Month.
 * No game rules live here: the engine pays (₹2,000 + ₹1,000 per correct; retries pay only the
 * improvement) and the portfolio page opens Plan the Month while the month is waiting.
 */
export function LessonPlayer({ lesson }: { lesson: Lesson }) {
  const { t } = useTranslation();
  const steps = lessonSteps(lesson);
  const [step, setStep] = useState<Step>('gut');
  const [quizCorrect, setQuizCorrect] = useState(0);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const dispatch = useGameStore((s) => s.dispatch);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const go = (s: Step) => {
    setStep(s);
    window.scrollTo?.({ top: 0 });
  };
  const after = (s: Step) => go(steps[steps.indexOf(s) + 1]!);

  useEffect(() => headingRef.current?.focus(), [step]);

  const finish = (correct: number, final?: number) => {
    const prev = useGameStore.getState().game.progress[lesson.id];
    const paid = prev ? retryBonus(prev.bestCorrect, correct) : quizPayout(correct);
    dispatch({ type: 'COMPLETE_SUBSECTION', subSectionId: lesson.id, quizCorrect: correct, unlocks: lesson.portfolioEffect.unlocks });
    if (final !== undefined && lesson.finalQuiz) {
      dispatch({ type: 'FINAL_QUIZ_RESULT', correct: final, total: lesson.finalQuiz.length });
    }
    setOutcome({ correct, paid, firstTime: !prev, final });
    go('result');
  };

  const stepNumber = steps.indexOf(step) + 1;

  return (
    <article className="lp stack" aria-labelledby="lp-title">
      <header className="stack lp-head">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="eyebrow e-blue">{t('ui.lesson.eyebrow', { level: lesson.level, id: lesson.id })}</span>
          <span className="muted lp-stepcount">{t('ui.lesson.stepOf', { n: stepNumber, total: steps.length })}</span>
        </div>
        <h1 id="lp-title" ref={headingRef} tabIndex={-1}>
          {t(lesson.titleKey)}
        </h1>
        <div className="lp-progress" aria-hidden="true">
          <span style={{ width: `${(stepNumber / steps.length) * 100}%` }} />
        </div>
        {lesson.banner === 'notAdvice' && <p className="card-sm panel-yellow lp-banner">{t('ui.lesson.notAdvice')}</p>}
      </header>

      {step === 'gut' && <GutCheck lesson={lesson} onNext={() => after('gut')} />}
      {step === 'cards' && <CardDeck lesson={lesson} onDone={() => after('cards')} />}
      {step === 'tool' && lesson.tool && (
        <section className="stack">
          <h2>{t('ui.lesson.toolTitle')}</h2>
          <ToolEmbed toolId={lesson.tool.id} prefill={lesson.tool.prefill} />
          <div>
            <button type="button" className="btn btn-primary" onClick={() => after('tool')}>
              {t('ui.lesson.toQuiz')}
            </button>
          </div>
        </section>
      )}
      {step === 'quiz' && (
        <QuizRunner
          items={lesson.quiz}
          titleKey="ui.lesson.quizTitle"
          onDone={(c) => {
            setQuizCorrect(c);
            if (lesson.finalQuiz) go('final');
            else finish(c);
          }}
        />
      )}
      {step === 'final' && lesson.finalQuiz && (
        <QuizRunner items={lesson.finalQuiz} titleKey="ui.lesson.finalQuizTitle" onDone={(f) => finish(quizCorrect, f)} />
      )}
      {step === 'result' && outcome && <Result lesson={lesson} outcome={outcome} onRetry={() => go('quiz')} />}
    </article>
  );
}

function GutCheck({ lesson, onNext }: { lesson: Lesson; onNext: () => void }) {
  const { t } = useTranslation();
  const [pick, setPick] = useState<string | null>(null);
  const g = lesson.gutCheck;
  const chosen = g.choices.find((c) => c.id === pick);
  return (
    <section className="stack" aria-labelledby="lp-gut">
      <span className="muted">{t('ui.lesson.gutEyebrow')}</span>
      <h2 id="lp-gut">{t(g.promptKey)}</h2>
      <div className="stack lp-options" role="group" aria-labelledby="lp-gut">
        {g.choices.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`btn btn-secondary btn-block lp-option${pick === c.id ? ` verdict-${c.tone}` : ''}`}
            aria-pressed={pick === c.id}
            onClick={() => setPick(c.id)}
          >
            {t(c.labelKey)}
          </button>
        ))}
      </div>
      {chosen && (
        <>
          <div className={`card-sm verdict-${chosen.tone}`} role="status">
            <p>{t(chosen.resultKey)}</p>
            <p className="muted lp-small-text">{t('ui.lesson.gutNote')}</p>
          </div>
          <p>
            <strong>{t(g.bridgeKey)}</strong>
          </p>
          <div>
            <button type="button" className="btn btn-primary" onClick={onNext}>
              {t('ui.lesson.startCards')}
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function CardDeck({ lesson, onDone }: { lesson: Lesson; onDone: () => void }) {
  const { t } = useTranslation();
  const [i, setI] = useState(0);
  const startX = useRef<number | null>(null);
  const card = lesson.cards[i]!;
  const last = i === lesson.cards.length - 1;
  const next = () => (last ? onDone() : setI(i + 1));
  const prev = () => setI(Math.max(0, i - 1));

  return (
    <section
      className="stack"
      aria-roledescription={t('ui.lesson.deck')}
      onKeyDown={(e) => {
        if ((e.target as HTMLElement).closest('input, select, textarea')) return;
        if (e.key === 'ArrowRight') next();
        if (e.key === 'ArrowLeft') prev();
      }}
    >
      <div
        key={card.id}
        className="card lp-card"
        aria-label={t('ui.lesson.cardOf', { n: i + 1, total: lesson.cards.length })}
        onPointerDown={(e) => {
          if (e.pointerType !== 'mouse') startX.current = e.clientX;
        }}
        onPointerUp={(e) => {
          if (startX.current === null) return;
          const dx = e.clientX - startX.current;
          startX.current = null;
          if (dx < -60) next();
          if (dx > 60) prev();
        }}
      >
        <div className="lp-card-body">
          <Art id={card.art} />
          <div className="stack">
            <TermText text={t(card.textKey)} terms={card.terms} />
            {card.interaction && <Interaction def={card.interaction} />}
            {card.footerKey && <p className="muted">{t(card.footerKey)}</p>}
          </div>
        </div>
      </div>
      <div className="lp-dots" aria-hidden="true">
        {lesson.cards.map((c, n) => (
          <span key={c.id} className={n === i ? 'is-on' : n < i ? 'is-done' : ''} />
        ))}
      </div>
      <div className="row lp-nav">
        <button type="button" className="btn btn-secondary" onClick={prev} disabled={i === 0}>
          {t('ui.lesson.back')}
        </button>
        <span className="muted">{t('ui.lesson.cardOf', { n: i + 1, total: lesson.cards.length })}</span>
        <button type="button" className="btn btn-primary" onClick={next}>
          {last ? t('ui.lesson.cardsDone') : t('ui.lesson.next')}
        </button>
      </div>
    </section>
  );
}

function Result({ lesson, outcome, onRetry }: { lesson: Lesson; outcome: Outcome; onRetry: () => void }) {
  const { t } = useTranslation();
  const total = lesson.quiz.length;
  // The month this lesson opened is still waiting to be planned (also true after a quick retry).
  const planWaiting = useGameStore((s) => s.game.awaitingPlan && s.game.lastCompletedSubSection === lesson.id);
  return (
    <section className="stack" aria-labelledby="lp-result">
      <h2 id="lp-result">{t('ui.lesson.scored', { correct: outcome.correct, total })}</h2>
      {outcome.final !== undefined && lesson.finalQuiz && (
        <p className="card-sm panel-purple">{t('ui.lesson.finalScored', { correct: outcome.final, total: lesson.finalQuiz.length })}</p>
      )}
      <div className={`card ${outcome.paid > 0 ? 'panel-green' : 'panel-yellow'} stack`} role="status">
        <p className="lp-pay num">{formatINR(outcome.paid)}</p>
        <p>
          {outcome.firstTime
            ? t('ui.lesson.paidFirst', { base: formatINR(quizPayout(0)), bonus: formatINR(quizPayout(outcome.correct) - quizPayout(0)) })
            : outcome.paid > 0
              ? t('ui.lesson.paidRetry')
              : t('ui.lesson.paidNone')}
        </p>
      </div>
      {outcome.firstTime && (
        <div className="card-sm stack">
          <span className="eyebrow">{t('ui.lesson.effectEyebrow')}</span>
          <p>{t(lesson.portfolioEffect.decisionKey)}</p>
        </div>
      )}
      <div className="row">
        {planWaiting ? (
          <Link className="btn btn-primary" to="/portfolio">
            {t('ui.lesson.toPlan')}
          </Link>
        ) : (
          <Link className="btn btn-primary" to="/">
            {t('ui.back.home')}
          </Link>
        )}
        {outcome.correct < total && (
          <button type="button" className="btn btn-secondary" onClick={onRetry}>
            {t('ui.lesson.retry')}
          </button>
        )}
      </div>
      {outcome.correct < total && <p className="muted">{t('ui.lesson.retryNote')}</p>}
    </section>
  );
}
