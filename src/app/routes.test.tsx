// @vitest-environment jsdom
import '@/core/i18n';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { routerFuture, routes } from './routes';

const open = (path: string) =>
  render(
    <RouterProvider
      router={createMemoryRouter(routes, { initialEntries: [path], future: routerFuture })}
      future={{ v7_startTransition: true }}
    />,
  );

beforeAll(() => {
  window.scrollTo = () => {}; // jsdom has no layout
});
afterEach(cleanup);

describe('app shell routes', () => {
  it('/glossary renders the Word Bank with search', () => {
    open('/glossary');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Word Bank');
    expect(screen.getByRole('searchbox')).toBeTruthy();
  });

  // These routes now render their real pages.
  it.each([
    ['/portfolio', 'Your portfolio'],
    ['/event/e1_1', 'Life event'],
    ['/tool/emi?principal=6000', 'Tool'],
    ['/tools', 'Tools'],
    ['/', 'Your money journey'],
    ['/lesson/1.1', 'Income, expenses, needs and wants'],
    ['/scam-shield', 'Scam Shield'],
  ])('%s renders its page inside the shell', (path, title) => {
    open(path);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(title);
    expect(screen.getByText(/needs \(food, home, school fees, travel\) are already taken care of/)).toBeTruthy();
  });

  it('unknown paths show not found', () => {
    open('/nope');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Page not found');
  });

  it('the top nav links to Tools, and /tools lists the calculators', () => {
    open('/tools');
    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(nav.querySelector('a[href="/tools"]')?.textContent).toBe('Tools');
    expect(document.querySelector('a[href="/tool/emi"]')).toBeTruthy();
    expect(document.querySelector('a[href="/tool/sip"]')).toBeTruthy();
  });

  it('home shows Continue to the first lesson, the level map and links to Portfolio and Tools', () => {
    open('/');
    const cont = screen.getByRole('link', { name: /^Start: Income, expenses, needs and wants/ });
    expect(cont.getAttribute('href')).toBe('/lesson/1.1');
    expect(screen.getByRole('heading', { name: 'Money basics' })).toBeTruthy();
    expect(document.querySelector('main a[href="/portfolio"]')).toBeTruthy();
    expect(document.querySelector('main a[href="/tools"]')).toBeTruthy();
    expect(screen.queryByText(/Coming soon|work package/)).toBeNull();
  });
});
