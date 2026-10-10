// @vitest-environment jsdom
import '@/core/i18n';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { configToolIds, staticToolIds } from '@/core/tools';
import { BadYearSimulator, mixPath } from './components/BadYearSimulator';
import { BudgetBuilder, surprises } from './components/BudgetBuilder';
import { UpiPractice, upiRounds } from './components/UpiPractice';
import { ToolEmbed } from './components/ToolEmbed';
import { toolRegistry } from './registry';

afterEach(cleanup);

/** A key that was never translated shows up as the key itself. */
const untranslated = () => (document.body.textContent ?? '').match(/\b(tools|ui|scamshield)\.[A-Za-z0-9_.]+/g) ?? [];
/** Rupee figures must come from formatINR: no decimals and Indian grouping. */
const rawRupees = () => {
  const texts: string[] = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) texts.push(walker.currentNode.textContent ?? '');
  return texts.join(' ').match(/₹\d+\.\d|₹\d{4,}/g) ?? [];
};

describe('config calculators', () => {
  it.each(configToolIds)('%s renders with every text translated and rupees formatted', (id) => {
    render(<ToolEmbed toolId={id} />);
    expect(screen.getByRole('heading', { level: 2 })).toBeTruthy();
    expect(untranslated()).toEqual([]);
    expect(rawRupees()).toEqual([]);
    const promise = screen.queryByText(/assumption, not a promise/);
    expect(Boolean(promise)).toBe(toolRegistry[id].hasReturns);
  });

  it('prefill sets the inputs and is clamped to the allowed range', () => {
    render(<ToolEmbed toolId="emi" prefill={{ principal: 6000, months: 999 }} />);
    expect((screen.getByLabelText('Loan amount', { selector: 'input[type=number]' }) as HTMLInputElement).value).toBe('6000');
    expect((screen.getByLabelText('Tenure', { selector: 'input[type=number]' }) as HTMLInputElement).value).toBe('60');
  });

  it('typing a new amount updates the results', () => {
    render(<ToolEmbed toolId="leakFinder" />);
    expect(screen.getByText('₹14,600')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Small spend each day', { selector: 'input[type=number]' }), { target: { value: '100' } });
    expect(screen.getByText('₹36,500')).toBeTruthy();
  });

  it('close button calls back', () => {
    let closed = 0;
    render(<ToolEmbed toolId="fd" onClose={() => closed++} />);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(closed).toBe(1);
  });
});

describe('other tools', () => {
  it.each(staticToolIds)('%s shows a themed card, not a broken screen', (id) => {
    render(<ToolEmbed toolId={id} />);
    expect(untranslated()).toEqual([]);
  });

  it('bad-year simulator: labelled as pretend, three markets, formatted rupees', () => {
    render(<BadYearSimulator />);
    expect(screen.getByText('Pretend market, not a prediction')).toBeTruthy();
    expect(screen.getByText(/assumptions, not a promise/)).toBeTruthy();
    expect(untranslated()).toEqual([]);
    expect(rawRupees()).toEqual([]);
  });

  it('mixPath: all in savings grows at the savings rate; an empty mix does not move', () => {
    const only = { savings: 100, fd: 0, gold: 0, mf: 0, shares: 0 };
    expect(mixPath(10000, only, 'steady')[1]).toBeCloseTo(10300, 5);
    expect(mixPath(10000, { ...only, savings: 0 }, 'crashYear')).toEqual([10000, 10000, 10000, 10000, 10000, 10000]);
    // The crash year hits shares hardest in year one.
    expect(mixPath(10000, { ...only, savings: 0, shares: 100 }, 'crashYear')[1]).toBeCloseTo(7500, 5);
  });
});

describe('budget builder', () => {
  it('starts on the default split and keeps wants + savings equal to the money', () => {
    render(<BudgetBuilder prefill={{ income: 5000 }} />);
    expect((screen.getByLabelText('Wants') as HTMLInputElement).value).toBe('3000');
    expect((screen.getByLabelText('Savings') as HTMLInputElement).value).toBe('2000');
    fireEvent.change(screen.getByLabelText('Wants'), { target: { value: '4500' } });
    expect((screen.getByLabelText('Savings') as HTMLInputElement).value).toBe('500');
    expect(screen.getByText('₹4,500')).toBeTruthy();
  });

  it('a surprise is covered or not depending on the savings side', () => {
    render(<BudgetBuilder prefill={{ income: 5000 }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Draw a surprise expense' }));
    // First surprise costs ₹1,200; savings are ₹2,000.
    expect(screen.getByText(/₹800 is still there afterwards/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Change my split' }));
    fireEvent.change(screen.getByLabelText('Savings'), { target: { value: '500' } });
    fireEvent.click(screen.getByRole('button', { name: 'Draw a surprise expense' }));
    expect(screen.getByText(/fall ₹700 short/)).toBeTruthy();
    expect(untranslated()).toEqual([]);
    expect(rawRupees()).toEqual([]);
  });

  it('every surprise has its text', () => {
    render(<BudgetBuilder />);
    fireEvent.click(screen.getByRole('button', { name: 'Draw a surprise expense' }));
    for (let i = 1; i < surprises.length; i++) {
      fireEvent.click(screen.getByRole('button', { name: 'Draw another' }));
      expect(untranslated()).toEqual([]);
    }
  });
});

describe('upi practice', () => {
  const play = (picks: Array<'pin' | 'decline'>) => {
    render(<UpiPractice />);
    picks.forEach((pick) => {
      const [pinButton, declineButton] = screen.getAllByRole('button');
      fireEvent.click(pick === 'pin' ? pinButton! : declineButton!);
      expect(untranslated()).toEqual([]);
      expect(rawRupees()).toEqual([]);
      fireEvent.click(screen.getByRole('button', { name: /Next screen|See my score/ }));
    });
  };

  it('the safe choices score full marks: a PIN only when you are the one paying', () => {
    play(upiRounds.map((r) => r.safe));
    expect(screen.getByText('You kept your money safe on 5 of 5 screens.')).toBeTruthy();
    expect(screen.getByText(/A UPI PIN only ever sends money/)).toBeTruthy();
  });

  it('entering the PIN everywhere is right only once', () => {
    play(upiRounds.map(() => 'pin'));
    expect(screen.getByText('You kept your money safe on 1 of 5 screens.')).toBeTruthy();
  });

  it('only the round where you chose to pay is safe with a PIN', () => {
    expect(upiRounds.filter((r) => r.safe === 'pin').map((r) => r.id)).toEqual(['canteen']);
  });
});
