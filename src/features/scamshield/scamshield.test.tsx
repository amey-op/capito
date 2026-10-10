// @vitest-environment jsdom
import '@/core/i18n';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { localeFiles, mergeLocaleFiles } from '@/content/i18n';
import { useGameStore } from '@/core/store';
import { CheckItTool } from './components/CheckItTool';
import { NowWhatTool } from './components/NowWhatTool';
import { DECK_SIZE, MIN_GENUINE, buildDeck, scenarios } from './deck';
import { ScamShieldPage } from './ScamShieldPage';

const en = mergeLocaleFiles(localeFiles).resources.en ?? {};
const untranslated = () => (document.body.textContent ?? '').match(/\bscamshield\.[A-Za-z0-9_.]+/g) ?? [];

beforeEach(() => useGameStore.getState().reset());
afterEach(cleanup);

/** A repeatable stand-in for Math.random. */
const seeded = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

describe('scenario data', () => {
  it('has a mix of scams and genuine messages', () => {
    expect(scenarios.length).toBeGreaterThanOrEqual(12);
    expect(scenarios.filter((s) => !s.isScam).length).toBeGreaterThanOrEqual(4);
  });

  it('scams list their warning signs and where to report; genuine messages list none', () => {
    for (const s of scenarios) {
      expect(s.redFlags.length > 0).toBe(s.isScam);
      expect(`scamshield.scenario.${s.id}.report` in en).toBe(s.isScam);
    }
  });

  it('every text a scenario needs exists', () => {
    const keys = scenarios.flatMap((s) => [
      `scamshield.scenario.${s.id}.message`,
      `scamshield.scenario.${s.id}.tell`,
      `scamshield.channel.${s.channel}`,
      ...s.redFlags.map((f) => `scamshield.flag.${f}`),
    ]);
    expect(keys.filter((k) => !(k in en))).toEqual([]);
  });
});

describe('buildDeck', () => {
  it.each([1, 2, 3, 4, 5])('seed %d: ten different messages with genuine ones mixed in', (seed) => {
    const deck = buildDeck(scenarios, seeded(seed));
    expect(deck).toHaveLength(DECK_SIZE);
    expect(new Set(deck.map((s) => s.id)).size).toBe(DECK_SIZE);
    expect(deck.filter((s) => !s.isScam).length).toBeGreaterThanOrEqual(MIN_GENUINE);
  });
});

describe('Scam Shield round', () => {
  const deck = scenarios.slice(0, 2).concat(scenarios.filter((s) => !s.isScam).slice(0, 1));
  const open = () =>
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ScamShieldPage deck={deck} />
      </MemoryRouter>,
    );

  it('scores the round and sends one result to the game', () => {
    open();
    // Two scams, then one genuine message. Answer "Scam" every time: 2 right, 1 wrong.
    for (let i = 0; i < deck.length; i++) {
      fireEvent.click(screen.getByRole('button', { name: 'Scam' }));
      expect(screen.getByRole('status').textContent).toContain(i < 2 ? 'You read it right.' : 'Not this time.');
      expect(untranslated()).toEqual([]);
      fireEvent.click(screen.getByRole('button', { name: i < 2 ? 'Next message' : 'See my result' }));
    }
    expect(screen.getByText('2 / 3')).toBeTruthy();
    expect(useGameStore.getState().game.shield).toEqual({ seen: 3, correct: 2 });
    expect(untranslated()).toEqual([]);

    fireEvent.click(screen.getByRole('button', { name: 'Play another round' }));
    expect(screen.getByText('Message 1 of 3')).toBeTruthy();
    expect(useGameStore.getState().game.shield).toEqual({ seen: 3, correct: 2 });
  });

  it('a scam shows its warning signs and where to report; a genuine message does not', () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Looks fine' }));
    expect(screen.getByText('Warning signs in this message')).toBeTruthy();
    expect(screen.getByText(/Where to report it/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Next message' }));
    fireEvent.click(screen.getByRole('button', { name: 'Scam' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next message' }));
    fireEvent.click(screen.getByRole('button', { name: 'Looks fine' }));
    expect(screen.getByText('This one was genuine.')).toBeTruthy();
    expect(screen.queryByText(/Where to report it/)).toBeNull();
  });
});

describe('Check-it and Now what', () => {
  const answer = (pattern: string[]) => {
    render(<CheckItTool />);
    pattern.forEach((label, i) => fireEvent.click(screen.getAllByRole('button', { name: label })[i]!));
  };

  it('all yes: no warning signs, but still verify', () => {
    answer(['Yes', 'Yes', 'Yes', 'Yes', 'Yes']);
    expect(screen.getByRole('status').textContent).toContain('No warning signs in these five checks');
  });
  it('one no: slow down', () => {
    answer(['Yes', 'No', 'Yes', 'Yes', 'Yes']);
    expect(screen.getByRole('status').textContent).toContain('slow down');
  });
  it('two no: stop', () => {
    answer(['No', 'No', 'Yes', 'Yes', 'Yes']);
    expect(screen.getByRole('status').textContent).toContain('stop');
    expect(untranslated()).toEqual([]);
  });
  it('now what lists six steps in order', () => {
    render(<NowWhatTool />);
    expect(screen.getAllByRole('listitem')).toHaveLength(6);
    expect(screen.getByText('Call 1930')).toBeTruthy();
    expect(untranslated()).toEqual([]);
  });
});

describe('Scam Shield inside a lesson', () => {
  it('the tool id scamShield runs the same game without leaving the lesson', async () => {
    const { ToolEmbed } = await import('@/features/tools');
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ToolEmbed toolId="scamShield" />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { level: 2, name: 'Scam Shield' })).toBeTruthy();
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
    for (let i = 0; i < DECK_SIZE; i++) {
      fireEvent.click(screen.getByRole('button', { name: 'Scam' }));
      fireEvent.click(screen.getByRole('button', { name: i < DECK_SIZE - 1 ? 'Next message' : 'See my result' }));
    }
    expect(useGameStore.getState().game.shield.seen).toBe(DECK_SIZE);
    expect(screen.queryByRole('link', { name: 'Back to my portfolio' })).toBeNull();
    expect(untranslated()).toEqual([]);
  });

  it('lesson 8.1 has the game as its tool step', async () => {
    const { lessonById } = await import('@/content');
    const { lessonSteps } = await import('@/features/lessons');
    const lesson = lessonById.get('8.1')!;
    expect(lesson.tool).toEqual({ id: 'scamShield' });
    expect(lessonSteps(lesson)).toContain('tool');
  });
});
