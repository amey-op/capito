import { describe, expect, it } from 'vitest';
import { economy } from '@/core/economy.config';
import { roundRupees } from '@/core/finance';
import { newGame, registryOf, type Game } from './testkit';
import { K } from './util';

/** Text keys for a test event (the real ones live in events.json, N2b). */
const keys = (id: string, choice?: string) =>
  choice
    ? { labelKey: `event.${id}.${choice}.label`, outcomeKey: `event.${id}.${choice}.outcome`, whyKey: `event.${id}.${choice}.why` }
    : { titleKey: `event.${id}.title`, introKey: `event.${id}.intro` };
const event = (id: string, after: string, kind: 'life' | 'scamAlert', choices: Array<Record<string, unknown>>) => ({
  id,
  level: Number(id[1]),
  kind,
  after,
  ...keys(id),
  choices: choices.map((c) => ({ ...keys(id, String(c.id)), ...c })),
});

/** A cut-down set built from the MECHANICS §7 tables. */
const EVENTS = [
  // Level 2: ₹3,000 cash gift (uses `later`).
  event('e2_1', '2.1', 'life', [
    { id: 'drawer', verdict: 'bad', now: { money: 3000 }, later: [{ inMonths: 1, money: -800, noteKey: 'event.e2_1.drawer.later' }] },
    { id: 'bank', verdict: 'good', now: { money: 3000, to: 'savings' } },
    { id: 'spend', verdict: 'mixed', now: { joy: 3 } },
  ]),
  // Level 2: UPI scam alert (moves the shield).
  event('e2_2', '2.2', 'scamAlert', [
    { id: 'pin', verdict: 'bad', now: { money: -1500 }, shield: -1, flags: ['fell_for_upi'] },
    { id: 'ignore', verdict: 'good', shield: 1 },
    { id: 'ask', verdict: 'good', now: { joy: 1 }, shield: 1 },
  ]),
  // Level 3: phone screen breaks (uses `availableIf`, goal money, an informal loan).
  event('e3_1', '3.1', 'life', [
    { id: 'fund', verdict: 'good', now: { money: -2800, from: 'emergency' }, availableIf: { minBucket: { bucket: 'emergency', amount: 2800 } } },
    { id: 'goal', verdict: 'mixed', now: { money: -2800, goal: -2800, goalSlipMonths: 1 } },
    { id: 'lender', verdict: 'bad', now: { loan: { kind: 'informal', principal: 2800, months: 3 }, money: -2800 }, flags: ['informal_loan'] },
    { id: 'skip', verdict: 'mixed', now: { joy: -3 } },
  ]),
  // Level 3: illness (uses `recurring` for the premium and `insured`).
  event('e3_2', '3.2', 'life', [
    { id: 'insure', verdict: 'good', now: { insurance: 'buy' } },
    { id: 'skip', verdict: 'mixed' },
  ]),
  event('e3_3', '3.3', 'life', [
    { id: 'covered', verdict: 'good', now: { money: -500 }, availableIf: { insured: true } },
    { id: 'fund', verdict: 'mixed', now: { money: -3500, from: 'emergency' }, availableIf: { insured: false } },
    { id: 'plan', verdict: 'mixed', recurring: [{ months: 2, perMonth: 1750, labelKey: 'event.e3_3.plan.charge' }], availableIf: { insured: false } },
  ]),
  // Level 4: phone for ₹6,000 (a loan at the player's own credit offer, and a co-sign with a delayed hit).
  event('e4_1', '4.1', 'life', [
    { id: 'nocost', verdict: 'mixed', now: { loan: { kind: 'noCostEmi', principal: 6000, months: 6 }, possessions: [{ nameKey: 'event.e4_1.phone', cost: 6000, category: 'phone' }] } },
    { id: 'bank', verdict: 'mixed', now: { loan: { kind: 'bank', principal: 6000, months: 6 }, money: -6000, possessions: [{ nameKey: 'event.e4_1.phone', cost: 6000, category: 'phone' }] } },
    { id: 'wait', verdict: 'good' },
  ]),
  event('e4_2', '4.2', 'life', [
    { id: 'cosign', verdict: 'bad', later: [{ inMonths: 2, money: -850, credit: -30 }], credit: 0 },
    { id: 'decline', verdict: 'good', now: { money: -300, joy: 1 } },
  ]),
  // Level 6: crash and tip (start scripted episodes).
  event('e6_3', '6.3', 'life', [
    { id: 'sell', verdict: 'bad', now: { episode: 'crash', moves: [{ from: 'mf', to: 'wallet', amount: null }] } },
    { id: 'hold', verdict: 'good', now: { episode: 'crash' }, flags: ['stayed_calm'] },
  ]),
  event('e6_4', '6.4', 'scamAlert', [
    { id: 'buy', verdict: 'bad', now: { invest: { asset: 'tipStock', amount: 2000 }, episode: 'tipPump' } },
    { id: 'check', verdict: 'good', shield: 1 },
  ]),
  // Level 5: bonus into an FD (a move into a deposit).
  event('e5_1', '5.3', 'life', [
    { id: 'fd', verdict: 'good', now: { money: 6000, moves: [{ from: 'wallet', to: 'fd', amount: 6000 }] } },
    { id: 'spend', verdict: 'mixed', now: { joy: 3 } },
  ]),
];

const game = (): Game => newGame(EVENTS);
const resolve = (g: Game, eventId: string, choiceId: string, isRetry = false) =>
  g.do({ type: 'RESOLVE_EVENT', eventId, choiceId, isRetry });
const eventOf = (id: string) => registryOf(EVENTS).eventById(id)!;

describe('consequence engine: now, later, recurring (MECHANICS §6)', () => {
  it('`later`: cash kept in the drawer loses ₹800 at the next month close', () => {
    const g = game().lesson('2.1', 3, ['savings']).plan();
    expect(g.state.pendingEvents).toEqual(['e2_1']);
    const fx = resolve(g, 'e2_1', 'drawer');
    expect(fx).toContainEqual({ kind: 'money', bucket: 'wallet', delta: 3000 });
    expect(g.state.buckets.wallet).toBe(8000);
    expect(g.state.pendingEvents).toEqual([]);
    expect(g.state.delayed).toHaveLength(1);
    g.lesson('x', 0);
    const closeFx = g.do({ type: 'PLAN_MONTH', plan: {} });
    expect(g.state.buckets.wallet).toBe(8000 + 2000 - 800);
    expect(g.state.delayed).toEqual([]);
    expect(closeFx).toContainEqual({ kind: 'note', key: 'event.e2_1.drawer.later' });
  });

  it('money can land in a named bucket', () => {
    const g = game().lesson('2.1', 3, ['savings']).plan();
    resolve(g, 'e2_1', 'bank');
    expect(g.state.buckets).toMatchObject({ wallet: 5000, savings: 3000 });
  });

  it('`recurring`: a monthly charge runs for its months, then stops', () => {
    const g = game().lesson('3.3').plan();
    resolve(g, 'e3_3', 'plan');
    expect(g.state.recurring).toEqual([expect.objectContaining({ perMonth: 1750, monthsLeft: 2, sourceEventId: 'e3_3' })]);
    g.lesson('x', 0).plan();
    expect(g.state.buckets.wallet).toBe(5000 + 2000 - 1750);
    g.lesson('y', 0).plan();
    expect(g.state.recurring).toEqual([]);
    g.lesson('z', 0).plan();
    expect(g.state.buckets.wallet).toBe(5000 + 6000 - 3500);
  });

  it('a missed recurring charge adds a ₹200 late fee the next month', () => {
    const g = game().lesson('3.3', 3, ['emergency']).plan({ toBuckets: { emergency: 5000 } });
    resolve(g, 'e3_3', 'plan');
    g.lesson('x', 0);
    g.do({ type: 'MOVE_MONEY', from: 'wallet', to: 'emergency', amount: 1000 });
    const fx = g.do({ type: 'PLAN_MONTH', plan: {} });
    expect(fx).toContainEqual({ kind: 'missedPayment', labelKey: 'event.e3_3.plan.charge', fee: economy.shortfall.lateFee });
    expect(g.state.recurring.map((r) => [r.labelKey, r.perMonth, r.monthsLeft])).toEqual([
      ['event.e3_3.plan.charge', 1750, 2],
      [K.lateFeeCharge, 200, 1],
    ]);
    expect(g.state.month).toBe(3);
  });
});

describe('availableIf', () => {
  it('"pay from the emergency fund" needs the money to be there', () => {
    const g = game().lesson('3.1', 3, ['emergency']).plan({ toBuckets: { emergency: 2000 } });
    const ids = () => g.engine.availableChoices(g.state, eventOf('e3_1')).map((c) => c.id);
    expect(ids()).toEqual(['goal', 'lender', 'skip']);
    resolve(g, 'e3_1', 'fund');
    expect(g.state.events.e3_1).toBeUndefined();
    g.do({ type: 'MOVE_MONEY', from: 'wallet', to: 'emergency', amount: 1000 });
    expect(ids()).toEqual(['fund', 'goal', 'lender', 'skip']);
    resolve(g, 'e3_1', 'fund');
    expect(g.state.buckets.emergency).toBeCloseTo(3005 - 2800, 6);
  });

  it('insurance changes which illness choices exist', () => {
    const g = game().lesson('3.2').plan();
    const ids = () => g.engine.availableChoices(g.state, eventOf('e3_3')).map((c) => c.id);
    expect(ids()).toEqual(['fund', 'plan']);
    resolve(g, 'e3_2', 'insure');
    expect(g.state.flags).toContain('insured');
    expect(ids()).toEqual(['covered']);
    // The premium is now an automatic deduction.
    g.lesson('x', 0).plan();
    expect(g.state.buckets.wallet).toBe(7000 - economy.insurance.healthPremiumPerMonth);
  });
});

describe('loans inside events use the player’s credit offer', () => {
  const ready = () => game().lesson('a').plan().lesson('4.1').plan();

  it('bank loan at the score’s rate: ₹6,000 at 22% for a new borrower, and the phone is paid from it', () => {
    const g = ready();
    const wallet = g.state.buckets.wallet;
    resolve(g, 'e4_1', 'bank');
    expect(g.state.creditScore).toBe(650);
    expect(g.state.loans[0]).toMatchObject({ kind: 'bank', principal: 6000, ratePa: 22 });
    expect(roundRupees(g.state.loans[0]!.emi)).toBe(1065);
    expect(g.state.buckets.wallet).toBe(wallet);
    expect(g.state.possessions[0]).toMatchObject({ name: 'event.e4_1.phone', nameIsKey: true, cost: 6000 });
  });

  it('a better score gets a cheaper loan for the same event', () => {
    const g = ready();
    g.state = { ...g.state, creditScore: 705 };
    resolve(g, 'e4_1', 'bank');
    expect(g.state.loans[0]!.ratePa).toBe(18);
    expect(roundRupees(g.state.loans[0]!.emi)).toBe(1053);
  });

  it('"no-cost EMI": six payments of ₹1,000, each on-time one +10', () => {
    const g = ready();
    resolve(g, 'e4_1', 'nocost');
    g.months(6);
    expect(g.state.loans[0]).toMatchObject({ status: 'paid', paidMonths: 6 });
    expect(g.state.creditScore).toBe(650 + 60 + 15);
  });

  it('co-signing: nothing now, −₹850 and −30 two months later', () => {
    const g = game().lesson('a').plan().lesson('4.2').plan();
    resolve(g, 'e4_2', 'cosign');
    expect(g.state.creditScore).toBeNull();
    const wallet = g.state.buckets.wallet;
    g.months(1, 0);
    expect(g.state.buckets.wallet).toBe(wallet + 2000);
    g.months(1, 0);
    expect(g.state.buckets.wallet).toBe(wallet + 4000 - 850);
    expect(g.state.creditScore).toBe(620);
  });
});

describe('flags that switch something in the state', () => {
  const picks = [
    event('e2_3', '2.2', 'life', [
      { id: 'a', verdict: 'good', flags: ['account_a'] },
      { id: 'b', verdict: 'bad', flags: ['account_b'] },
    ]),
    event('e6_5', '6.5', 'life', [
      { id: 'pause', verdict: 'mixed', flags: ['sip_paused'] },
      { id: 'hold', verdict: 'good' },
    ]),
  ];

  it('choosing account B changes the savings rate and brings its fee rule', () => {
    const g = newGame(picks).lesson('2.2', 3, ['savings']).plan();
    resolve(g, 'e2_3', 'b');
    expect(g.state.savingsAccount).toBe('B');
    g.lesson('x').plan({ toBuckets: { savings: 4000 } });
    expect(g.state.buckets.savings).toBeCloseTo(4000 * (1 + economy.rates.accountBPa / 1200), 6);
  });

  it('pausing the SIP stops the monthly deduction but keeps what is invested', () => {
    const g = newGame(picks).lesson('6.5', 3, ['mf']).plan({ sip: { monthly: 500 } });
    resolve(g, 'e6_5', 'pause');
    g.months(2);
    expect(g.state.sip).toMatchObject({ active: false, monthly: 500 });
    expect(g.state.holdings.mf.invested).toBe(500);
  });
});

describe('a declined loan stops the rest of the choice', () => {
  it('no bank loan, so no phone and no payment', () => {
    const g = game().lesson('a').plan().lesson('4.1').plan();
    g.state = { ...g.state, creditScore: 560 };
    const fx = resolve(g, 'e4_1', 'bank');
    expect(g.state.loans).toEqual([]);
    expect(g.state.possessions).toEqual([]);
    expect(g.state.buckets.wallet).toBe(10000);
    expect(fx).toContainEqual({ kind: 'note', key: K.loanDeclinedScore, params: { score: 560 } });
  });
});

describe('scam alerts move the shield', () => {
  it('falling for it costs money and counts against scam safety; handling it counts for', () => {
    const g = game().lesson('2.2').plan();
    const fx = resolve(g, 'e2_2', 'pin');
    expect(g.state.buckets.wallet).toBe(3500);
    expect(g.state.shield).toEqual({ seen: 1, correct: 0 });
    expect(g.state.flags).toContain('fell_for_upi');
    expect(fx).toContainEqual({ kind: 'shield', seen: 1, correct: 0 });
    expect(g.engine.health(g.state).scamSafety.points).toBe(0);

    const h = game().lesson('2.2').plan();
    resolve(h, 'e2_2', 'ask');
    expect(h.state.shield).toEqual({ seen: 1, correct: 1 });
    expect(h.engine.health(h.state).scamSafety.points).toBe(20);
  });

  it('a loss larger than everything the player has is cut off at ₹0', () => {
    const g = game().lesson('2.2', 0);
    g.do({ type: 'ADD_WANT', want: { name: 'Shoes', price: 1100, kind: 'item', category: 'sneakers' } });
    g.plan({ buyWants: ['w1'] });
    // ₹900 left in the wallet and nothing anywhere else; the scam asks for ₹1,500.
    const fx = resolve(g, 'e2_2', 'pin');
    expect(g.state.buckets.wallet).toBe(0);
    expect(fx).toContainEqual({ kind: 'note', key: K.shortfallWaived, params: { amount: 600 } });
  });
});

describe('events that reach into deposits and the market', () => {
  it('a bonus put "into an FD" opens a 6-month FD', () => {
    const g = game().lesson('5.3', 3, ['savings', 'fd']).plan();
    resolve(g, 'e5_1', 'fd');
    expect(g.state.fds[0]).toMatchObject({ principal: 6000, months: 6, status: 'active' });
    expect(g.state.buckets).toMatchObject({ wallet: 5000, fd: 6000 });
  });

  it('the crash event starts the episode; selling everything takes the money out first', () => {
    const g = game().lesson('6.3', 3, ['mf']).plan({ toBuckets: { mf: 4000 } });
    const held = g.state.holdings.mf.value;
    resolve(g, 'e6_3', 'sell');
    expect(g.state.market.activeEpisodes).toEqual([{ id: 'crash', step: 0 }]);
    expect(g.state.buckets.mf).toBe(0);
    expect(g.state.buckets.wallet).toBeCloseTo(1000 + held, 6);
  });

  it('holding through the crash earns the "stayed calm" milestone', () => {
    const g = game().lesson('6.3', 3, ['mf']).plan({ toBuckets: { mf: 4000 } });
    resolve(g, 'e6_3', 'hold');
    const before = g.state.holdings.mf.value;
    g.months(2);
    expect(g.state.holdings.mf.value).toBeCloseTo(before * 0.81, 6);
    expect(g.state.milestones).toContain('stayedCalm');
  });

  it('the stock tip: ₹2,000 becomes about ₹1,380', () => {
    const g = game().lesson('6.4', 3, ['shares']).plan();
    resolve(g, 'e6_4', 'buy');
    g.months(2);
    expect(g.state.holdings.tipStock.value).toBeCloseTo(1380, 6);
  });
});

describe('what if (preview only)', () => {
  it('previews every choice and leaves the state untouched', () => {
    const g = game().lesson('a').plan().lesson('4.1').plan();
    const before = structuredClone(g.state);
    const previews = g.engine.whatIf(g.state, eventOf('e4_1'));
    expect(g.state).toEqual(before);
    expect(previews.map((p) => [p.choiceId, p.verdict, p.available])).toEqual([
      ['nocost', 'mixed', true],
      ['bank', 'mixed', true],
      ['wait', 'good', true],
    ]);
    // Phone (+6,000) against a ₹6,000 loan: net worth is unchanged on the day, in both loan choices.
    expect(previews.map((p) => p.netWorthDelta)).toEqual([0, 0, 0]);
    expect(previews[1]!.effects).toContainEqual({ kind: 'loan', loanId: 'l1', emi: 1065 });
    expect(previews[2]!.effects).toEqual([]);
  });

  it('shows the money, joy and shield each choice would move', () => {
    const g = game().lesson('2.2').plan();
    const [pin, ignore, ask] = g.engine.whatIf(g.state, eventOf('e2_2'));
    expect(pin).toMatchObject({ netWorthDelta: -1500, shieldDelta: -1, joyDelta: 0 });
    expect(ignore).toMatchObject({ netWorthDelta: 0, shieldDelta: 1 });
    expect(ask).toMatchObject({ shieldDelta: 1, joyDelta: 1 });
  });

  it('marks unavailable choices and does not apply them', () => {
    const g = game().lesson('3.1').plan();
    const fund = g.engine.whatIf(g.state, eventOf('e3_1'))[0]!;
    expect(fund).toMatchObject({ choiceId: 'fund', available: false, netWorthDelta: 0, effects: [] });
  });
});

describe('try again, once (MECHANICS §6)', () => {
  it('rolls the first choice back, applies the second, and still records the first', () => {
    const g = game().lesson('2.2').plan();
    resolve(g, 'e2_2', 'pin');
    expect(g.state.events.e2_2).toEqual({ firstChoiceId: 'pin', finalChoiceId: 'pin', retried: false, month: 2 });
    expect(g.state.retrySnapshot).not.toBeNull();

    resolve(g, 'e2_2', 'ask', true);
    expect(g.state.buckets.wallet).toBe(5000);
    expect(g.state.shield).toEqual({ seen: 1, correct: 1 });
    expect(g.state.flags).not.toContain('fell_for_upi');
    expect(g.state.events.e2_2).toEqual({ firstChoiceId: 'pin', finalChoiceId: 'ask', retried: true, month: 2 });
    expect(g.state.retrySnapshot).toBeNull();
    expect(g.state.pendingEvents).toEqual([]);
  });

  it('only once per event, and an event cannot be answered twice without a retry', () => {
    const g = game().lesson('2.2').plan();
    resolve(g, 'e2_2', 'pin');
    resolve(g, 'e2_2', 'ask');
    expect(g.state.events.e2_2!.finalChoiceId).toBe('pin');
    resolve(g, 'e2_2', 'ask', true);
    resolve(g, 'e2_2', 'pin', true);
    expect(g.state.events.e2_2).toMatchObject({ firstChoiceId: 'pin', finalChoiceId: 'ask', retried: true });
    expect(g.state.buckets.wallet).toBe(5000);
  });

  it('the chance to retry ends once the player moves on', () => {
    const g = game().lesson('2.2').plan();
    resolve(g, 'e2_2', 'pin');
    g.lesson('x', 0);
    expect(g.state.retrySnapshot).toBeNull();
    resolve(g, 'e2_2', 'ask', true);
    expect(g.state.events.e2_2).toMatchObject({ finalChoiceId: 'pin', retried: false });
    expect(g.state.buckets.wallet).toBe(3500 + 2000);
  });

  it('a retry also undoes loans and delayed effects from the first choice', () => {
    const g = game().lesson('a').plan().lesson('4.1').plan();
    resolve(g, 'e4_1', 'nocost');
    expect(g.state.loans).toHaveLength(1);
    resolve(g, 'e4_1', 'wait', true);
    expect(g.state.loans).toEqual([]);
    expect(g.state.possessions).toEqual([]);
    expect(g.state.creditScore).toBeNull();
  });
});

describe('unknown ids are ignored', () => {
  it('does nothing for an event or choice that does not exist', () => {
    const g = game().lesson('2.2').plan();
    const before = structuredClone(g.state);
    resolve(g, 'e9_9', 'x');
    resolve(g, 'e2_2', 'nope');
    expect(g.state).toEqual(before);
    g.do({ type: 'DISMISS_EVENT', eventId: 'e2_2' });
    expect(g.state.pendingEvents).toEqual([]);
  });
});
