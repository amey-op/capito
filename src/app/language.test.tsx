// @vitest-environment jsdom
import i18n, { LANGUAGE_KEY, setLanguage } from '@/core/i18n';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { merged } from '@/content/i18n';
import { routerFuture, routes } from './routes';

const open = (path: string) =>
  render(
    <RouterProvider
      router={createMemoryRouter(routes, { initialEntries: [path], future: routerFuture })}
      future={{ v7_startTransition: true }}
    />,
  );

const hi = merged.resources.hi ?? {};
const te = merged.resources.te ?? {};
const en = merged.resources.en ?? {};

beforeAll(() => {
  window.scrollTo = () => {}; // jsdom has no layout
});
afterEach(async () => {
  cleanup();
  await act(() => setLanguage('en'));
  localStorage.clear();
});

describe('language switch', () => {
  it('starts in English with the switcher in the header and no draft note', () => {
    open('/');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(en['ui.home.title']);
    const select = screen.getByRole('combobox', { name: en['ui.lang.label'] }) as HTMLSelectElement;
    expect(select.value).toBe('en');
    expect([...select.options].map((o) => o.value)).toEqual(['en', 'hi', 'te']);
    expect(screen.queryByText(en['ui.lang.draft']!)).toBeNull();
  });

  it('switching to Hindi changes the home heading, html lang, the saved choice and shows the draft note', async () => {
    open('/');
    await act(() => setLanguage('hi'));
    expect(hi['ui.home.title']).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(hi['ui.home.title']);
    expect(document.documentElement.lang).toBe('hi');
    expect(localStorage.getItem(LANGUAGE_KEY)).toBe('hi');
    expect(screen.getByRole('note').textContent).toBe(hi['ui.lang.draft']);
  });

  it('Telugu works the same way', async () => {
    open('/');
    await act(() => setLanguage('te'));
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(te['ui.home.title']);
    expect(document.documentElement.lang).toBe('te');
  });

  it('a key with no translation falls back to English', async () => {
    const missing = Object.keys(en).find((k) => !(k in hi) && !en[k]!.includes('{{'));
    expect(missing).toBeTruthy();
    await act(() => setLanguage('hi'));
    expect(i18n.t(missing!)).toBe(en[missing!]);
  });
});
