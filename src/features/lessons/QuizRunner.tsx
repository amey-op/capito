import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { QuizItem } from '@/core/content-schema';

/** Index for single-choice, true/false as booleans. */
type Answer = number | boolean;

export const isCorrect = (q: QuizItem, a: Answer) => a === q.correct;

/**
 * Runs a list of quiz items one at a time. Each answer locks, shows teaching feedback
 * (right or wrong), then Next. Calls onDone with the number answered correctly.
 * Used for the 3-question lesson quiz and the 10-question final quiz.
 */
export function QuizRunner({
  items,
  titleKey,
  onDone,
}: {
  items: QuizItem[];
  titleKey: string;
  onDone: (correct: number) => void;
}) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [correct, setCorrect] = useState(0);
  const q = items[index]!;
  const answered = answer !== null;
  const right = answered && isCorrect(q, answer);

  const choose = (a: Answer) => {
    if (answered) return;
    setAnswer(a);
    if (isCorrect(q, a)) setCorrect((c) => c + 1);
  };
  const next = () => {
    if (index + 1 < items.length) {
      setIndex(index + 1);
      setAnswer(null);
    } else onDone(correct);
  };

  const options: Array<{ value: Answer; label: string }> =
    q.type === 'single'
      ? q.options.map((key, i) => ({ value: i, label: t(key) }))
      : [
          { value: true, label: t('ui.lesson.true') },
          { value: false, label: t('ui.lesson.false') },
        ];

  return (
    <section className="stack" aria-labelledby="lp-quiz-q">
      <p className="muted">
        {t(titleKey)} · {t('ui.lesson.questionOf', { n: index + 1, total: items.length })}
      </p>
      <h2 id="lp-quiz-q">{t(q.promptKey)}</h2>
      <div className="stack lp-options" role="group" aria-labelledby="lp-quiz-q">
        {options.map((o) => {
          const isPicked = answer === o.value;
          const isAnswer = q.correct === o.value;
          const state = !answered ? '' : isAnswer ? ' verdict-good' : isPicked ? ' verdict-bad' : '';
          return (
            <button
              key={String(o.value)}
              type="button"
              className={`btn btn-secondary btn-block lp-option${state}`}
              aria-pressed={isPicked}
              disabled={answered && !isPicked && !isAnswer}
              onClick={() => choose(o.value)}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {answered && (
        <div className={`card-sm ${right ? 'verdict-good' : 'verdict-bad'}`} role="status">
          <strong>{right ? t('ui.lesson.right') : t('ui.lesson.notQuite')}</strong> {t(right ? q.feedbackRightKey : q.feedbackWrongKey)}
        </div>
      )}
      {answered && (
        <div>
          <button type="button" className="btn btn-primary" onClick={next} autoFocus>
            {index + 1 < items.length ? t('ui.lesson.next') : t('ui.lesson.seeResult')}
          </button>
        </div>
      )}
    </section>
  );
}
