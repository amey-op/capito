// @vitest-environment jsdom
import '@/core/i18n';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { routerFuture, routes } from '@/app/routes';
import { lessonById } from '@/content';
import type { Lesson } from '@/core/content-schema';
import { useGameStore } from '@/core/store';
import { doodleFor } from './Art';
import { lessonSteps } from './LessonPlayer';

const open = (path: string) =>
  render(
    <RouterProvider
      router={createMemoryRouter(routes, { initialEntries: [path], future: routerFuture })}
      future={{ v7_startTransition: true }}
    />,
  );

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));
const game = () => useGameStore.getState().game;

/** Answer every question in the quiz on screen; `right` decides per question index. */
function answerQuiz(items: Lesson['quiz'], right: (i: number) => boolean, en: (k: string) => string) {
  items.forEach((q, i) => {
    let label: string;
    if (q.type === 'single') {
      const idx = right(i) ? q.correct : (q.correct + 1) % q.options.length;
      label = en(q.options[idx]!);
    } else {
      label = (right(i) ? q.correct : !q.correct) ? 'True' : 'False';
    }
    fireEvent.click(screen.getByRole('button', { name: label }));
    click(i + 1 < items.length ? 'Next' : 'See my result');
  });
}

let en: (k: string) => string;

beforeEach(async () => {
  window.scrollTo = () => {}; // jsdom has no layout
  useGameStore.getState().reset();
  const i18n = (await import('@/core/i18n')).default;
  en = (k) => i18n.t(k);
});
afterEach(cleanup);

describe('lesson player', () => {
  const lesson = lessonById.get('1.1')!;

  it('plays 1.1 end to end: gut-check → cards → quiz → ₹5,000 → link to Plan the Month', () => {
    open('/lesson/1.1');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Income, expenses, needs and wants');

    // Gut-check shows its result without touching money
    click('Split: ₹1,200 save, ₹800 spend');
    expect(screen.getByText(/Nice balance/)).toBeTruthy();
    expect(game().buckets.wallet).toBe(0);
    click("Let's learn");

    // Cards: a highlighted term opens its Word Bank card; tap-sort gives instant feedback
    click('Next'); // card 1 → 2
    const incomeButtons = () => screen.getAllByRole('button', { name: 'Income' });
    fireEvent.click(incomeButtons().find((b) => b.className.includes('lp-term'))!);
    expect(screen.getByText('Money that comes to you.')).toBeTruthy();
    fireEvent.click(incomeButtons().find((b) => b.className.includes('lp-small'))!);
    expect(screen.getByText("Yes, that's right.")).toBeTruthy();
    for (let i = 2; i < lesson.cards.length; i++) click('Next');
    click('On to the quiz');

    // Quiz: all right pays ₹2,000 + 3 × ₹1,000
    answerQuiz(lesson.quiz, () => true, en);
    expect(screen.getByText('You got 3 of 3 right')).toBeTruthy();
    expect(document.querySelector('.lp-pay')?.textContent).toBe('₹5,000');
    expect(game().buckets.wallet).toBe(5000);
    expect(game().awaitingPlan).toBe(true);
    expect(game().progress['1.1']).toMatchObject({ firstAttemptCorrect: 3 });

    // Plan the Month lives on the portfolio page while the month is waiting
    expect(screen.getByRole('link', { name: 'Plan the month' }).getAttribute('href')).toBe('/portfolio');
  });

  it('a wrong answer shows teaching feedback, and a retry pays only the improvement', () => {
    open('/lesson/1.1');
    click('Buy the sneakers');
    click("Let's learn");
    for (let i = 1; i < lesson.cards.length; i++) click('Next');
    click('On to the quiz');
    answerQuiz(lesson.quiz, (i) => i === 0, en); // 1 of 3
    expect(game().buckets.wallet).toBe(3000);

    click('Try the quiz again');
    // first question wrong on purpose, to see the teaching feedback
    const q1 = lesson.quiz[0]!;
    if (q1.type !== 'single') throw new Error('expected single');
    fireEvent.click(screen.getByRole('button', { name: en(q1.options[0]!) }));
    expect(screen.getByText(en(q1.feedbackWrongKey))).toBeTruthy();
    click('Next');
    answerQuiz(lesson.quiz.slice(1), () => true, en); // 2 of 3 → +₹1,000 only
    expect(game().buckets.wallet).toBe(4000);
    expect(game().progress['1.1']).toMatchObject({ firstAttemptCorrect: 1, bestCorrect: 2, attempts: 2 });
    expect(game().month).toBe(1);
    // the month from the first attempt is still waiting, so Plan the Month is offered
    expect(screen.getByRole('link', { name: 'Plan the month' })).toBeTruthy();
  });

  it('9.1 runs the 10-question final quiz after the lesson quiz and records it', () => {
    const l91 = lessonById.get('9.1')!;
    expect(lessonSteps(l91)).toContain('final');
    open('/lesson/9.1');
    fireEvent.click(screen.getAllByRole('button').find((b) => b.className.includes('lp-option'))!);
    click("Let's learn");
    for (let i = 1; i < l91.cards.length; i++) click('Next');
    click('On to the quiz');
    answerQuiz(l91.quiz, () => true, en);
    expect(screen.getByText(/Final quiz · Question 1 of 10/)).toBeTruthy();
    answerQuiz(l91.finalQuiz!, (i) => i < 7, en);
    expect(game().finalQuiz).toEqual({ correct: 7, total: 10 });
    expect(screen.getByText('Final quiz: 7 of 10 right.')).toBeTruthy();
  });

  it('unknown lessons say so', () => {
    open('/lesson/0.0');
    expect(screen.getByText('This lesson is not written yet.')).toBeTruthy();
  });

  it('every lesson builds a valid step list and every art id gets a doodle', () => {
    for (const l of lessonById.values()) {
      const steps = lessonSteps(l);
      expect(steps[0]).toBe('gut');
      expect(steps.at(-1)).toBe('result');
      for (const c of l.cards) if (c.art) expect(doodleFor(c.art)).toBeTruthy();
    }
  });
});
