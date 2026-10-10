/**
 * The life events as shipped, played through the real engine. Numbers and verdicts follow
 * docs/MECHANICS.md §7. (The engine's own rules are tested in src/engine.)
 */
import { describe, expect, it } from 'vitest';
import { eventById, events } from '@/content';
import { economy } from '@/core/economy.config';
import { emi, loanAppCost, roundRupees, valueAfterCost } from '@/core/finance';
import type { GameState } from '@/core/types';
import { engine } from '@/engine';

/** A player well into the game: money in every bucket, one goal, one FD, a fund holding, M = ₹5,000. */
function player(over: Partial<GameState> = {}): GameState {
  const s = engine.newGame();
  return {
    ...s,
    month: 12,
    monthMoney: 5000,
    unlocked: ['wallet', 'myWants', 'goals', 'netWorth', 'possessions', 'savings', 'emergency', 'rd', 'insurance', 'liabilities', 'credit', 'fd', 'gold', 'mf', 'shares', 'shield'],
    buckets: { ...s.buckets, wallet: 20000, savings: 8000, emergency: 9000, fd: 6000, mf: 5000 },
    fds: [{ id: 'fd1', principal: 6000, ratePa: economy.rates.fdPa, months: 12, startedMonth: 9, status: 'active' }],
    holdings: { ...s.holdings, mf: { invested: 5000, value: 5000 } },
    sip: { monthly: 500, active: true, startedMonth: 8, pausedMonths: 0 },
    goals: [{ id: 'g1', name: 'Laptop bag', amount: 9000, deadlineMonth: 20, saved: 4000, status: 'active', extendedTimes: 0 }],
    history: [10, 11].map((month) => ({ month, income: 5000, saved: 1000, emis: 0, missedPayments: 0 })),
    ...over,
  };
}

const choose = (eventId: string, choiceId: string, before: GameState = player()) => {
  const { state, effects } = engine.reduce(before, { type: 'RESOLVE_EVENT', eventId, choiceId, isRetry: false });
  return { before, after: state, effects };
};
const delta = (r: { before: GameState; after: GameState }, bucket: keyof GameState['buckets']) =>
  roundRupees(r.after.buckets[bucket] - r.before.buckets[bucket]);
const closeMonths = (s: GameState, n: number): GameState => {
  let state = s;
  for (let i = 0; i < n; i++) {
    state = engine.reduce(state, { type: 'COMPLETE_SUBSECTION', subSectionId: `t${state.month}`, quizCorrect: 0, unlocks: [] }).state;
    state = engine.reduce(state, { type: 'PLAN_MONTH', plan: {} }).state;
  }
  return state;
};

describe('every event in MECHANICS §7 is present', () => {
  it('has the 25 events, in their levels, each firing after a lesson of that level', () => {
    expect(events.map((e) => e.id).sort()).toEqual(
      [
        'e1_1', 'e1_2', 'e1_3',
        'e2_1', 'e2_2', 'e2_3',
        'e3_1', 'e3_2', 'e3_3',
        'e4_1', 'e4_2', 'e4_3',
        'e5_1', 'e5_2', 'e5_3',
        'e6_1', 'e6_2', 'e6_3', 'e6_4', 'e6_5',
        'e7_1', 'e7_2',
        'e8_1', 'e8_2', 'e8_3',
      ].sort(),
    );
    for (const e of events) expect(e.after.startsWith(`${e.level}.`)).toBe(true);
  });

  it('every choice of every event can be played (when it is available) and is recorded', () => {
    for (const e of events) {
      for (const c of e.choices) {
        for (const state of [player(), player({ insurance: { health: true } })]) {
          if (!engine.availableChoices(state, e).some((x) => x.id === c.id)) continue;
          const { after } = choose(e.id, c.id, state);
          expect(after.events[e.id], `${e.id}.${c.id}`).toMatchObject({ firstChoiceId: c.id, retried: false });
          for (const v of Object.values(after.buckets)) expect(v).toBeGreaterThanOrEqual(0);
        }
      }
      // Whatever the player's situation, at least one choice is open.
      expect(engine.availableChoices(engine.newGame(), e).length, e.id).toBeGreaterThan(0);
    }
  });

  it('every scam alert has a choice that handles it correctly', () => {
    for (const e of events.filter((x) => x.kind === 'scamAlert')) {
      expect(e.choices.some((c) => (c.shield ?? 0) > 0), e.id).toBe(true);
      expect(e.choices.some((c) => (c.shield ?? 0) < 0), e.id).toBe(true);
    }
  });
});

describe('Level 1', () => {
  it('festival sale: combo −₹1,500 (bad), cover −₹600 (mixed), skip puts ₹600 toward the goal (good)', () => {
    const combo = choose('e1_1', 'combo');
    expect(delta(combo, 'wallet')).toBe(-1500);
    expect(combo.after.joy - combo.before.joy).toBe(3);
    expect(combo.after.flags).toContain('impulse_buy');
    expect(delta(choose('e1_1', 'cover'), 'wallet')).toBe(-600);
    const skip = choose('e1_1', 'skip');
    expect(delta(skip, 'wallet')).toBe(0);
    expect(skip.after.goals[0]!.saved).toBe(4600);
    expect(eventById.get('e1_1')!.choices.map((c) => c.verdict)).toEqual(['bad', 'mixed', 'good']);
  });

  it('birthday: ₹500, ₹150, or skip', () => {
    expect(delta(choose('e1_2', 'contribute'), 'wallet')).toBe(-500);
    expect(delta(choose('e1_2', 'handmade'), 'wallet')).toBe(-150);
    const skip = choose('e1_2', 'skip');
    expect(delta(skip, 'wallet')).toBe(0);
    expect(skip.after.joy - skip.before.joy).toBe(-1);
  });

  it('surprise ₹1,500: spending all saves nothing; the split saves ₹600; saving all saves ₹1,500', () => {
    const spend = choose('e1_3', 'spend');
    expect(delta(spend, 'wallet')).toBe(0);
    const split = choose('e1_3', 'split');
    expect(delta(split, 'wallet')).toBe(600);
    expect(split.after.goals[0]!.saved).toBe(4600);
    const save = choose('e1_3', 'save');
    expect(delta(save, 'wallet')).toBe(1500);
    expect(save.after.goals[0]!.saved).toBe(5500);
  });
});

describe('Level 2', () => {
  it('cash in the drawer: ₹800 disappears at the next month close', () => {
    const r = choose('e2_1', 'drawer');
    expect(delta(r, 'wallet')).toBe(3000);
    const next = closeMonths(r.after, 1);
    // +₹2,000 practice money, −₹500 SIP, −₹800 gone from the drawer.
    expect(roundRupees(next.buckets.wallet - r.after.buckets.wallet)).toBe(2000 - 500 - 800);
  });

  it('cash into the bank lands in savings', () => {
    const r = choose('e2_1', 'bank');
    expect(delta(r, 'savings')).toBe(3000);
    expect(delta(r, 'wallet')).toBe(0);
  });

  it('UPI scam: entering the PIN loses ₹1,500 and counts against scam safety', () => {
    const pin = choose('e2_2', 'pin');
    expect(delta(pin, 'wallet')).toBe(-1500);
    expect(pin.after.shield).toEqual({ seen: 1, correct: 0 });
    expect(pin.after.flags).toContain('fell_for_upi');
    expect(choose('e2_2', 'ignore').after.shield).toEqual({ seen: 1, correct: 1 });
    expect(choose('e2_2', 'ask').after.shield).toEqual({ seen: 1, correct: 1 });
  });

  it('two accounts: the choice sets the account the savings sit in', () => {
    expect(choose('e2_3', 'b').after.savingsAccount).toBe('B');
    expect(choose('e2_3', 'a').after.savingsAccount).toBe('A');
    expect(choose('e2_3', 'read').after.savingsAccount).toBe('A');
  });
});

describe('Level 3', () => {
  it('phone repair ₹2,800: from the fund, from goal money, or from a moneylender', () => {
    const fund = choose('e3_1', 'fund');
    expect(delta(fund, 'emergency')).toBe(-2800);
    expect(delta(fund, 'wallet')).toBe(0);

    const goal = choose('e3_1', 'goal');
    expect(delta(goal, 'wallet')).toBe(-2800);
    expect(goal.after.goals[0]).toMatchObject({ saved: 1200, deadlineMonth: 21 });

    const lender = choose('e3_1', 'lender');
    expect(delta(lender, 'wallet')).toBe(0);
    expect(lender.after.loans[0]).toMatchObject({ kind: 'informal', principal: 2800, months: 3 });
    expect(lender.after.loans[0]!.emi).toBeCloseTo(280, 6);
    expect(lender.after.creditScore).toBeNull();
  });

  it('the fund choice is hidden when the fund cannot cover the repair', () => {
    const poor = player({ buckets: { ...player().buckets, emergency: 500 } });
    expect(engine.availableChoices(poor, eventById.get('e3_1')!).map((c) => c.id)).toEqual(['goal', 'lender', 'skip']);
  });

  it('illness ₹3,500: ₹500 with insurance, the full bill without', () => {
    const insured = player({ insurance: { health: true } });
    expect(engine.availableChoices(insured, eventById.get('e3_2')!).map((c) => c.id)).toEqual(['insured']);
    expect(delta(choose('e3_2', 'insured', insured), 'wallet')).toBe(-economy.insurance.illnessCoPay);
    expect(engine.availableChoices(player(), eventById.get('e3_2')!).map((c) => c.id)).toEqual(['fund', 'goal', 'lender']);
    expect(delta(choose('e3_2', 'fund'), 'emergency')).toBe(-3500);
  });

  it('skipping the instalment costs the want plus the ₹50 fee', () => {
    expect(delta(choose('e3_3', 'skip'), 'wallet')).toBe(-(500 + economy.rd.missedInstalmentFee));
    expect(delta(choose('e3_3', 'rd'), 'wallet')).toBe(0);
  });
});

describe('Level 4', () => {
  it('"no-cost" EMI: the phone now, 6 × ₹1,000', () => {
    const r = choose('e4_1', 'nocost');
    expect(delta(r, 'wallet')).toBe(0);
    expect(r.after.loans[0]).toMatchObject({ kind: 'noCostEmi', emi: 1000, months: 6 });
    expect(r.after.possessions[0]).toMatchObject({ cost: 6000, category: 'phone', nameIsKey: true });
    expect(engine.netWorth(r.after)).toBe(engine.netWorth(r.before));
  });

  it('bank loan: the rate comes from the credit score (22% when new to credit, 18% at 700)', () => {
    const fresh = choose('e4_1', 'bank');
    expect(roundRupees(fresh.after.loans[0]!.emi)).toBe(roundRupees(emi(6000, 22, 6)));
    const good = choose('e4_1', 'bank', player({ creditScore: 700 }));
    expect(roundRupees(good.after.loans[0]!.emi)).toBe(1053);
    expect(delta(good, 'wallet')).toBe(0);
  });

  it('co-signing: −₹850 and −30 two months later', () => {
    const r = choose('e4_2', 'cosign');
    expect(delta(r, 'wallet')).toBe(0);
    const later = closeMonths(r.after, 2);
    expect(later.creditScore).toBe(economy.credit.start - 30);
    expect(roundRupees(later.buckets.wallet - r.after.buckets.wallet)).toBe(2 * (2000 - 500) - 850);
    expect(delta(choose('e4_2', 'decline'), 'wallet')).toBe(-300);
  });

  it('loan app: ₹2,700 now, ₹3,900 next month', () => {
    const r = choose('e4_3', 'accept');
    expect(delta(r, 'wallet')).toBe(loanAppCost().received);
    expect(r.after.loans[0]).toMatchObject({ kind: 'loanApp', remaining: loanAppCost().repay });
    const next = closeMonths(r.after, 1);
    expect(roundRupees(next.buckets.wallet - r.after.buckets.wallet)).toBe(2000 - 500 - 3900);
    expect(choose('e4_3', 'check').after.shield).toEqual({ seen: 1, correct: 1 });
  });
});

describe('Level 5', () => {
  it('₹6,000 prize: savings, a 6-month FD, or a three-way split', () => {
    expect(delta(choose('e5_1', 'savings'), 'savings')).toBe(6000);
    const fd = choose('e5_1', 'fd');
    expect(delta(fd, 'fd')).toBe(6000);
    expect(delta(fd, 'wallet')).toBe(0);
    expect(fd.after.fds.at(-1)).toMatchObject({ principal: 6000, months: 6, status: 'active' });
    const split = choose('e5_1', 'split');
    expect([delta(split, 'fd'), delta(split, 'savings'), delta(split, 'wallet')]).toEqual([3000, 2000, 0]);
  });

  it('class trip ₹3,000: breaking the FD early gives interest only at the savings rate', () => {
    const r = choose('e5_2', 'breakfd');
    expect(r.after.fds[0]!.status).toBe('brokenEarly');
    expect(delta(r, 'fd')).toBe(-6000);
    // Held 3 months: ₹6,045 back into savings, then the ₹3,000 fee from the wallet.
    expect(delta(r, 'savings')).toBe(6045);
    expect(delta(r, 'wallet')).toBe(-3000);
    expect(delta(choose('e5_2', 'fund'), 'emergency')).toBe(-3000);
  });

  it('"double your money": ₹2,000 gone', () => {
    const r = choose('e5_3', 'invest');
    expect(delta(r, 'wallet')).toBe(-2000);
    expect(r.after.shield).toEqual({ seen: 1, correct: 0 });
    expect(choose('e5_3', 'ask').after.flags).toContain('knows_five_checks');
  });
});

describe('Level 6', () => {
  it('the mix preview changes nothing', () => {
    for (const id of ['shares', 'mix', 'savings']) {
      const r = choose('e6_1', id);
      expect(r.after.buckets).toEqual(r.before.buckets);
    }
  });

  it('gold ₹3,000: ₹2,760 as jewellery, ₹2,985 as regulated paper gold, then the dip', () => {
    const coin = choose('e6_2', 'jewellery');
    expect(coin.after.holdings.goldPhysical.value).toBeCloseTo(valueAfterCost(3000, economy.gold.physicalMakingChargePct), 6);
    const etf = choose('e6_2', 'etf');
    expect(etf.after.holdings.goldEtf.value).toBeCloseTo(2985, 6);
    expect(etf.after.market.activeEpisodes).toEqual([{ id: 'goldDip', step: 0 }]);
    expect(closeMonths(etf.after, 1).holdings.goldEtf.value).toBeCloseTo(2985 * 0.95, 6);
    expect(choose('e6_2', 'app').after.buckets).toEqual(player().buckets);
  });

  it('the crash plays out over two months, then the decision arrives at −19%', () => {
    const start = choose('e6_3', 'plan');
    expect(start.after.market.activeEpisodes).toEqual([{ id: 'crash', step: 0 }]);
    const one = closeMonths(start.after, 1);
    expect(one.pendingEvents).not.toContain('e6_5');
    const two = closeMonths(one, 1);
    expect(two.pendingEvents).toContain('e6_5');
    expect(two.market.mf / start.after.market.mf).toBeCloseTo(0.81, 9);

    const sell = engine.reduce(two, { type: 'RESOLVE_EVENT', eventId: 'e6_5', choiceId: 'sell', isRetry: false }).state;
    expect(sell.buckets.mf).toBe(0);
    expect(sell.flags).toContain('panic_sold');
    const hold = engine.reduce(two, { type: 'RESOLVE_EVENT', eventId: 'e6_5', choiceId: 'hold', isRetry: false }).state;
    const pause = engine.reduce(two, { type: 'RESOLVE_EVENT', eventId: 'e6_5', choiceId: 'pause', isRetry: false }).state;
    expect(pause.sip).toMatchObject({ active: false });
    // Six months later the fund has mostly recovered; whoever kept the SIP holds the most.
    const [held, paused, sold] = [hold, pause, sell].map((s) => closeMonths(s, 6).buckets.mf);
    expect(held!).toBeGreaterThan(paused!);
    expect(paused!).toBeGreaterThan(sold!);
    expect(closeMonths(hold, 6).milestones).toContain('stayedCalm');
  });

  it('the stock tip: ₹2,000 becomes about ₹1,380', () => {
    const r = choose('e6_4', 'buy');
    expect(delta(r, 'wallet')).toBe(-2000);
    expect(roundRupees(closeMonths(r.after, 2).holdings.tipStock.value)).toBe(1380);
    expect(r.after.shield).toEqual({ seen: 1, correct: 0 });
  });
});

describe('Levels 7 and 8', () => {
  it('pay slip and side-gig records move no money, only flags', () => {
    const read = choose('e7_1', 'read');
    expect(read.after.buckets).toEqual(read.before.buckets);
    expect(read.after.flags).toContain('keeps_records');
    expect(choose('e7_2', 'skip').after.flags).toContain('no_records');
  });

  it('task job −₹2,000, fake KYC −₹1,500, tips group −₹2,000; the safe choices raise the shield', () => {
    expect(delta(choose('e8_1', 'deposit'), 'wallet')).toBe(-2000);
    expect(delta(choose('e8_2', 'click'), 'wallet')).toBe(-1500);
    expect(delta(choose('e8_3', 'join'), 'wallet')).toBe(-2000);
    for (const [e, c] of [['e8_1', 'report'], ['e8_1', 'check'], ['e8_2', 'delete'], ['e8_2', 'call'], ['e8_3', 'check']] as const) {
      expect(choose(e, c).after.shield).toEqual({ seen: 1, correct: 1 });
    }
  });
});
