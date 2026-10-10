// @vitest-environment jsdom
import '@/core/i18n';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { routerFuture, routes } from './routes';

const open = (path: string) =>
  render(
    <RouterProvider
      router={createMemoryRouter(routes, { initialEntries: [path], future: routerFuture })}
      future={{ v7_startTransition: true }}
    />,
  );

afterEach(cleanup);

describe('app shell routes', () => {
  it.each([
    ['/', 'Home and level map', 'Team · work package A3'],
    ['/lesson/1.1', 'Income, expenses, needs and wants', 'Team · work package A1'],
    ['/scam-shield', 'Scam Shield', 'Team · work package R3'],
    ['/glossary', 'Word Bank', 'Team · work package A1'],
  ])('%s renders its placeholder with the owner', (path, title, owner) => {
    open(path);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(title);
    expect(screen.getByText(new RegExp(owner))).toBeTruthy();
    expect(screen.getByText(/needs \(food, home, school fees, travel\) are already taken care of/)).toBeTruthy();
  });

  // These routes now render their real pages.
  it.each([
    ['/portfolio', 'Your portfolio'],
    ['/event/e1_1', 'Life event'],
    ['/tool/emi?principal=6000', 'Tool'],
  ])('%s renders its page inside the shell', (path, title) => {
    open(path);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(title);
    expect(screen.getByText(/needs \(food, home, school fees, travel\) are already taken care of/)).toBeTruthy();
  });

  it('unknown paths show not found', () => {
    open('/nope');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Page not found');
  });
});
