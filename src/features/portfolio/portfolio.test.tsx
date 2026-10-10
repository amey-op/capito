// @vitest-environment jsdom
import '@/core/i18n';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { routerFuture, routes } from '@/app/routes';
import { merged } from '@/content/i18n';
import { bucketId, unlockId } from '@/core/content-schema';
import { economy } from '@/core/economy.config';
import { loanTotals } from '@/core/finance';
import { formatINR } from '@/core/format';
import { useGameStore } from '@/core/store';
import type { Action, GameState } from '@/core/types';
import { engine } from '@/engine';

const en = merged.resources.en ?? {};

const open = (path: string) =>
  render(
    <RouterProvider
      router={createMemoryRouter(routes, { initialEntries: [path], future: routerFuture })}
      future={{ v7_startTransition: true }}
    />,
  );
const play = (...actions: Action[]): GameState => actions.reduce((s, a) => engine.reduce(s, a).state, engine.newGame());
const start = (game: GameState) => useGameStore.setState({ game, lastEffects: [] });
const game = () => useGameStore.getState().game;
const lesson = (id: string, quizCorrect = 3, unlocks: GameState['unlocked'] = []): Action => ({
  type: 'COMPLETE_SUBSECTION',
  subSectionId: id,
  quizCorrect,
  unlocks,
});

beforeEach(() => start(engine.newGame()));
afterEach(cleanup);

describe('text keys', () => {
  const sources = import.meta.glob<string>(['./*.tsx', '../../pages/PortfolioPage.tsx', '../../pages/EventPage.tsx'], {
    eager: true,
    query: '?raw',
    import: 'default',
  });

  it('every key written in the portfolio screens exists in portfolio.json', () => {
    const used = new Set<string>();
    for (const [file, code] of Object.entries(sources)) {
      if (file.endsWith('.test.tsx')) continue;
      for (const m of code.matchAll(/'(portfolio\.[A-Za-z0-9_.]*[A-Za-z0-9_])'/g)) used.add(m[1]!);
    }
    expect(used.size).toBeGreaterThan(80);
    expect([...used].filter((k) => !(k in en))).toEqual([]);
  });

  it('every key built from an id exists (buckets, unlocks, verdicts, loan kinds, categories…)', () => {
    const families: Record<string, readonly string[]> = {
      'portfolio.bucket.': bucketId.options,
      'portfolio.unlock.': unlockId.options,
      'portfolio.verdict.': ['good', 'mixed', 'bad'],
      'portfolio.category.': Object.keys(economy.depreciationPa),
      'portfolio.loan.kind.': ['bank', 'noCostEmi', 'loanApp', 'informal', 'coSigned'],
      'portfolio.holding.': Object.keys(engine.newGame().holdings),
      'portfolio.goals.status.': ['active', 'met', 'missed'],
      'portfolio.wants.kind.': ['item', 'experience'],
      'portfolio.plan.to.': ['savings', 'emergency', 'gold', 'mf', 'shares'],
      'portfolio.milestone.': [
        'firstStep', 'first10kSaved', 'goalsSet3', 'safetyNet1', 'safetyNet3', 'firstRdMatured',
        'smartBorrower', 'debtFree', 'diversified', 'recordsKeeper', 'stayedCalm', 'finisher',
      ],
    };
    const missing = Object.entries(families).flatMap(([prefix, ids]) => ids.map((id) => prefix + id).filter((k) => !(k in en)));
    expect(missing).toEqual([]);
  });
});

describe('PortfolioPage', () => {
  it('a new game shows net worth, the health score and only the wallet', () => {
    open('/portfolio');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Your portfolio');
    expect(screen.getByText('Net worth')).toBeTruthy();
    expect(screen.getByLabelText('30 out of 100')).toBeTruthy();
    expect(screen.getByText(/7 more open as you finish later lessons/)).toBeTruthy();
    expect(screen.queryByText('Savings account')).toBeNull();
    expect(screen.getByText(/practice money, not real money/)).toBeTruthy();
  });

  it('a want can be added at any time and turned into a goal', () => {
    start(play(lesson('1.1'), { type: 'PLAN_MONTH', plan: {} }));
    open('/portfolio');
    fireEvent.change(screen.getByLabelText('What is it?'), { target: { value: 'Headphones' } });
    fireEvent.change(screen.getByLabelText('Price'), { target: { value: '1500' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add to My Wants' }));
    expect(game().wants).toMatchObject([{ name: 'Headphones', price: 1500, kind: 'item', status: 'open' }]);

    fireEvent.click(screen.getByRole('button', { name: 'Make it a goal' }));
    expect(screen.getByText('That is about ₹250 a month.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Set the goal' }));
    expect(game().goals).toMatchObject([{ name: 'Headphones', amount: 1500, deadlineMonth: 8, status: 'active' }]);
  });

  it('money moves into an unlocked bucket and back', () => {
    start(play(lesson('2.1', 3, ['savings']), { type: 'PLAN_MONTH', plan: {} }));
    open('/portfolio');
    fireEvent.click(screen.getByRole('button', { name: 'Move money' }));
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '2000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Move in from Wallet' }));
    expect(game().buckets).toMatchObject({ wallet: 3000, savings: 2000 });
  });

  it('shows the bank offer with the EMI, the total and the extra cost before borrowing', () => {
    start(play(lesson('4.1', 3, ['liabilities']), { type: 'PLAN_MONTH', plan: {} }, lesson('4.2'), { type: 'PLAN_MONTH', plan: {} }));
    open('/portfolio');
    expect(screen.getByText('Up to ₹6,000 at 22% a year, for a credit score of 650.')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Amount to borrow'), { target: { value: '6000' } });
    const cost = loanTotals(6000, 22, 6);
    expect(
      screen.getByText(
        `EMI ${formatINR(cost.emi)} a month. You would repay ${formatINR(cost.totalPaid)} in all, which is ${formatINR(cost.extra)} more than you borrow.`,
      ),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Take this loan' }));
    expect(game().loans).toMatchObject([{ kind: 'bank', principal: 6000, months: 6 }]);
    expect(game().creditScore).toBe(650);
  });
});

describe('Plan the Month', () => {
  const afterLesson = () =>
    play(
      lesson('1.3', 3, ['savings', 'rd']),
      { type: 'PLAN_MONTH', plan: { startRd: { instalment: 500, months: 6 } } },
      { type: 'ADD_WANT', want: { name: 'Movie', price: 300, kind: 'experience' } },
      lesson('1.4', 2),
    );

  it('lists automatic deductions first, previews the result, and closes the month', () => {
    start(afterLesson());
    open('/portfolio');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Plan the Month');
    expect(screen.getByText(/needs \(food, home, school fees, travel\) are already covered/)).toBeTruthy();
    expect(screen.getByText(/60% for wants and 40% for savings: ₹2,400 and ₹1,600/)).toBeTruthy();
    const auto = screen.getByRole('heading', { name: 'Going out automatically' }).parentElement!;
    expect(within(auto).getByText('Recurring-deposit instalment')).toBeTruthy();
    expect(within(auto).getByText('−₹500')).toBeTruthy();

    fireEvent.click(screen.getByLabelText(/Movie/));
    fireEvent.change(screen.getByLabelText('Into Savings account'), { target: { value: '2000' } });
    // Wallet ₹8,500 − ₹500 instalment − ₹300 movie − ₹2,000 to savings.
    const preview = screen.getByRole('heading', { name: 'After this month closes' }).parentElement!;
    expect(within(preview).getByText('₹5,700')).toBeTruthy();
    expect(game().month).toBe(2);

    fireEvent.click(screen.getByRole('button', { name: 'Close month 2' }));
    expect(game().month).toBe(3);
    expect(game().buckets.wallet).toBe(5700);
    expect(game().rds[0]!.paidMonths).toBe(2);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Your portfolio');
    expect(screen.getByText('Month 2 closed')).toBeTruthy();
    // The Level 1 events fire after the month closes for 1.4.
    expect(screen.getByRole('link', { name: 'Festival sale' }).getAttribute('href')).toBe('/event/e1_1');
    expect(game().pendingEvents).toEqual(['e1_1', 'e1_2', 'e1_3']);
  });

  it('the preview warns when something cannot be done, before the month is closed', () => {
    start(afterLesson());
    open('/portfolio');
    fireEvent.change(screen.getByLabelText('Into Savings account'), { target: { value: '99999' } });
    const preview = screen.getByRole('heading', { name: 'After this month closes' }).parentElement!;
    // Asking for more than the wallet holds moves everything that is free, never more.
    expect(within(preview).getByText('₹0')).toBeTruthy();
    expect(game().awaitingPlan).toBe(true);
  });
});

describe('EventPage', () => {
  const atEvent = () => play(lesson('1.4'), { type: 'PLAN_MONTH', plan: {} });

  it('choice → outcome card with verdict and why → what-if → try again once', () => {
    start(atEvent());
    open('/event/e1_1');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Festival sale');
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual([
      'Buy the combo for ₹1,500',
      'Buy only the cover for ₹600',
      'Skip the sale and put ₹600 toward your goal',
    ]);

    fireEvent.click(screen.getByRole('button', { name: 'Buy the combo for ₹1,500' }));
    const outcome = screen.getByRole('status');
    expect(outcome.className).toContain('panel-red');
    expect(within(outcome).getByText('Wallet −₹1,500')).toBeTruthy();
    expect(within(outcome).getByText('Joy +3')).toBeTruthy();
    expect(within(outcome).getByText('Costly')).toBeTruthy();
    expect(within(outcome).getByText(/A sale only saves money on things you already planned to buy\./)).toBeTruthy();
    expect(game().buckets.wallet).toBe(3500);

    expect(screen.getByRole('heading', { name: 'What if you had chosen differently?' })).toBeTruthy();
    expect(screen.getByText(/net worth −₹600 on the day/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Buy only the cover for ₹600' }));
    expect(game().buckets.wallet).toBe(4400);
    expect(game().events.e1_1).toMatchObject({ firstChoiceId: 'combo', finalChoiceId: 'cover', retried: true });
    expect(screen.getByRole('status').className).toContain('panel-yellow');
    expect(screen.queryByRole('heading', { name: 'Try again' })).toBeNull();
    expect(screen.getByText('You changed your answer for this event.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Next event' }).getAttribute('href')).toBe('/event/e1_2');
  });

  it('only offers choices the player can take', () => {
    start(play(lesson('3.1', 3, ['emergency']), { type: 'PLAN_MONTH', plan: { toBuckets: { emergency: 1000 } } }));
    open('/event/e3_1');
    expect(screen.queryByRole('button', { name: 'Pay from your emergency fund' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Leave it cracked' })).toBeTruthy();
  });

  it('an event that has not come up, or does not exist, says so', () => {
    open('/event/e8_3');
    expect(screen.getByText('This event has not come up for you yet.')).toBeTruthy();
    cleanup();
    open('/event/e9_9');
    expect(screen.getByText('There is no such event.')).toBeTruthy();
  });
});

describe('portfolio page for a new player', () => {
  it('points to the lessons until the first practice money is earned', () => {
    start(engine.newGame());
    open('/portfolio');
    expect(screen.getByText('Your practice money starts with a lesson')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Go to the lessons' }).getAttribute('href')).toBe('/');
    expect(screen.getByRole('link', { name: 'Budget Builder' }).getAttribute('href')).toBe('/tool/budgetBuilder');
  });

  it('the start card goes away once a lesson has paid out', () => {
    start(play(lesson('1.1')));
    open('/portfolio');
    expect(screen.queryByText('Your practice money starts with a lesson')).toBeNull();
  });
});
