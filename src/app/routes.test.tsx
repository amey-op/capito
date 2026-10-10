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
    ['/', 'Home and level map', "Amey · work package A3"],
    ['/lesson/1.1', 'Income, expenses, needs and wants', "Amey · work package A1"],
    ['/portfolio', 'Portfolio and Plan the Month', "Nipun · work package N3"],
    ['/event/e1_1', 'Life event', "Nipun · work package N3"],
    ['/tool/emi?principal=6000', 'Tool', "Aryan · work package R1"],
    ['/scam-shield', 'Scam Shield', "Aryan · work package R3"],
    ['/glossary', 'Word Bank', "Amey · work package A1"],
  ])('%s renders its placeholder with the owner', (path, title, owner) => {
    open(path);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(title);
    expect(screen.getByText(new RegExp(owner))).toBeTruthy();
    expect(screen.getByText(/needs \(food, home, school fees, travel\) are already taken care of/)).toBeTruthy();
  });

  it('unknown paths show not found', () => {
    open('/nope');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Page not found');
  });
});
