# Rupee Quest: Game Mechanics & Consequence Engine (v1)

> New file. This is the rulebook the portfolio / simulation engine is built from. Curriculum is in CONTENT.md; product/tech/split is in PLAN.md.
> Every number is a **config value** in `economy.config.ts` (tunable in minutes). All figures are **practice values**, labelled as such on screen.
> **[DECIDE]** = needs your answer. **[CALC]** = hand-computed, the engine recomputes and tests it. "Illustrative" = chosen for teaching, not a real-market claim.

---

## 0. The golden assumption (shown at the start and in the Portfolio footer)

> **"In Rupee Quest your needs (food, home, school fees, travel) are already taken care of, by your family or by you. The practice money you earn here is only for your wants and your savings."**

Consequences of this rule:
- **We never simulate needs.** There is no rent/food/fees to input or vary. Needs are *taught* (Level 1) but not *played*.
- **Your monthly practice money is "the wants + savings part".** This lines up with 50-30-20: if 50% is needs (already paid), the remaining 30:20 splits **60% wants / 40% savings**. That 60/40 is the game's default "pay yourself first" guide.
- **Emergency fund needs a reference number** because real "months of expenses" would need the needs we don't simulate. We use a fixed, visible **reference monthly need = ₹3,000** (config, shown as an assumption: "a typical top-up cost if family help isn't available"). 1 month = ₹3,000, 3 months = ₹9,000. **[DECIDE]** keep ₹3,000?

---

## 1. Money: how it comes in

| Rule | Value |
|---|---|
| Per sub-section (first completion) | **₹2,000** base |
| Quiz bonus | **₹1,000 per correct answer** (3 questions → ₹0–₹3,000) |
| Monthly practice money **M** | ₹2,000 + bonus = **₹2,000–₹5,000** (typical ₹4,000) |
| Retry | Pays only the **improvement** over your best bonus (no farming, no discouragement) |
| Starting balance | ₹0 |
| Replaying a finished sub-section | Allowed for review, pays nothing, does **not** advance time |
| Floor | Balances never go below ₹0 |

### 1.1 The month cycle (one sub-section = one game-month)
```
1. Gut-check choice (decision first; hypothetical, shows its consequence, doesn't touch your money)
2. Cards (5–8)  →  3. Mini-tool  →  4. Quiz  →  M lands in Wallet
5. PLAN THE MONTH screen:
     a) automatic deductions first (EMIs, RD instalment, SIP, insurance premium)
     b) you decide the rest: spend on a want · put toward a goal · save/invest · keep in Wallet
6. Month closes: interest, depreciation, market moves, credit-score updates, goal check
7. If this sub-section has a life event / scam alert → it fires now
```
**Shortfall rule:** if automatic deductions exceed M, they are paid from Wallet, then Savings; if still short the payment is **missed** → late fee ₹200 + credit score −40 (once a credit profile exists) + a "why this happened" note. Never a game-over.

### 1.2 Wants and goals (the player's own list)
- **Add a want any time:** name + price (+ optional target month + type: *item* or *experience*). It appears in **My Wants**.
- **Wants → goals:** any want can be promoted to a **goal** (amount + deadline in game-months). Level 1.2 asks for **3 starter goals**; more can be added whenever.
- **Save toward it** (earmarks money, shown as progress) or **buy it** (spends money).
  - *Item* wants (phone, bike, laptop, sneakers) become **Things I own** and **depreciate** (§3).
  - *Experience* wants (trip, party, concert) give **Joy** only.
- **Can't afford it?** The app offers *wait*, *save toward it*, or (once Level 4 is reached and the credit profile allows) *EMI*, each with its total cost shown.
- Goal deadlines are in **game-months**; hitting one on time → milestone + Joy; missing one → prompt to **extend the date** (no penalty beyond a note).

---

## 2. The clock

- **One sub-section completed = one game-month.** 29 sub-sections ≈ 29 months; the MUST set ≈ 22 months.
- Start label: "Month 1". We do not claim real calendar dates (festival events say "festival season", not a specific date).
- **Tenures offered in game:** FD **3 / 6 / 12** months · RD **6 / 12** months · EMI **3 / 6 / 9** months. The 12-month FD only makes sense if bought early enough; the app warns "this matures after the game ends" and disables options that can't finish.
- **Calculator "fast-forward" and "Predict" are previews:** they show what *would* happen under a scenario and **never change the real portfolio**.
- **After the finale:** an optional "5-year preview" under the three scenarios; still preview-only.

---

## 3. Portfolio: buckets and their rules

| Bucket | Unlocks | Rule (illustrative) |
|---|---|---|
| **Wallet** | L1 | No interest. Cash can "leak" (see L2 event). |
| **My Wants / Goals** | L1 | Earmarked money + progress bars. |
| **Savings account** | L2 | 3% p.a. → +0.25% per month. No lock. |
| **Emergency fund** | L3 | Same as savings account, tagged for shocks; feeds "months covered". |
| **RD (recurring deposit)** | L3 | Fixed monthly instalment for 6/12 months at 6.5% p.a. [CALC] ₹500 × 6 months ≈ ₹3,057 at maturity (simple monthly accrual). Missed instalment: ₹50 fee. Closing early: interest drops to the savings rate. |
| **FD** | L5 | Lump sum for 3/6/12 months at 6.5% p.a. [CALC] ₹6,000 for 6 months → ₹6,195. Early withdrawal: you get your principal back with interest only at the savings rate (3%). |
| **Gold** | L6.2 | Moves with the gold index. **Two ways in:** physical (8% making charge → ₹3,000 becomes ₹2,760 of value [CALC]) or regulated paper gold/ETF (0.5% cost → ₹2,985 [CALC]). |
| **SIP / Mutual fund** | L6.3 | Choose a monthly SIP (₹100-multiples) or a lump sum into an index-style fund. Moves with the MF index. |
| **Shares** | L6.4 | Single-company shares; **volatile**, with tips and "pump" events. Moves with a shares index plus scripted events. |
| **Things I own** | L1.4 / first purchase | Items bought from wants; value falls each month (phone/laptop 30%/yr, bike 15%/yr, clothes/sneakers 50%/yr). Monthly factor = (1 − yearly loss)^(1/12). [CALC] ₹6,000 phone at 30%/yr ≈ ₹5,020 after 6 months. |
| **Liabilities** | L4 | Loans/EMIs. Shown as negative in net worth. |

**Net worth = (Wallet + Savings + Emergency + RD + FD + Gold + MF + Shares + Things I own) − Liabilities.** Earmarked goal money counts as the bucket it came from.

### 3.1 Market moves in the real game (the "story calendar")
Fixed and identical for every student. Between scripted episodes, monthly drift (illustrative): **Gold +0.5%, MF +0.9%, Shares +1.0%**, each with a small fixed wiggle pattern stored in config (so no randomness; tests are exact).

Scripted **episodes** (fire inside Level 6 events, not on a calendar date):
| Episode | MF index | Shares index | Gold |
|---|---|---|---|
| **Crash (6.3)** | −10%, −10% (≈ −19%), then +3%/mo × 6 (≈ −3% vs start overall) | −12%, −13% (≈ −23%), then +4%/mo × 6 | +4%, +3% |
| **Tip pump (6.4)** | no change | the "tip" stock: +15% in week 1, then −40% (net ≈ −31%) | no change |
| **Gold dip (6.2)** | no change | no change | −5% then +2%/mo × 3 |

### 3.2 Preview scenarios (calculators and "Predict")
Five full **annual return arrays** each (5 years), same for everyone, labelled "pretend market, not a prediction":
| Bucket | *Steady* | *Bumpy* | *Crash year* |
|---|---|---|---|
| Savings | 3, 3, 3, 3, 3 | 3, 3, 3, 3, 3 | 3, 3, 3, 3, 3 |
| FD / small savings | 6.5 ×5 | 6.5 ×5 | 6.5 ×5 |
| Gold | 6, 6, 6, 6, 6 | 12, −5, 8, 4, 10 | 10, 3, 5, 5, 6 |
| MF / SIP | 11, 11, 11, 11, 11 | 18, −12, 14, 9, 10 | −20, 15, 12, 11, 11 |
| Shares | 11, 11, 11, 11, 11 | 22, −15, 12, 8, 12 | −25, 18, 14, 11, 11 |
| Inflation (for real return) | 6 ×5 | 6 ×5 | 6 ×5 |
**[DECIDE]** adjust any number; we keep them round and labelled.

---

## 4. Money Health Score (0–100), accepted formula

Five inputs, **20 points each**, three bands:

| Input | How measured | 0 pts | 10 pts | 20 pts |
|---|---|---|---|---|
| **Savings rate** | (money saved or invested) ÷ M, averaged over the last 3 months | under 5% | 5–19% | 20%+ |
| **Emergency fund** | Emergency-fund bucket ÷ ₹3,000 reference need | under 1 month | 1 to under 3 months | 3+ months |
| **Diversification** | number of investment types (Savings/FD/RD, Gold, MF, Shares) each holding at least 10% of investments | 0–1 | 2 | 3+ |
| **Debt load** | monthly EMIs ÷ M, averaged over last 3 months | over 40% | 15–40% | under 15% |
| **Scam safety** | alerts handled correctly ÷ alerts seen | under 50% | 50–79% | 80%+ (before any alert is seen: 10) |

Shown as 5 small bars plus a total, with a one-line **"Next best move"** hint (e.g. "Emergency fund: ₹1,200 more gets you to 1 month").

### 4.1 Joy meter (optional, recommended)  **[DECIDE]**
A second meter, **Joy** (0–100, starts at 50). Buying wants, parties and experiences raise it; skipping everything slowly lowers it. Why: teaches that wants are not "bad", they just need a plan, and it stops the game from rewarding pure hoarding. Money Health stays the "security" score; Joy is the "life" score. Recommend **yes**.

---

## 5. Credit score and loan offers

- **No score exists until the student first applies for or takes credit** (or checks it in 4.3). Then it starts at **650** ("new to credit"), range 300–900. Bands are illustrative; real bureaus differ **[VERIFY]**.
- **Score changes (illustrative):**

| Action | Change |
|---|---|
| On-time EMI | +10 (per month) |
| Missed EMI | −40 and ₹200 late fee |
| Taking a second loan while one is active | −15 |
| Applying for several loans in a month | −5 per extra application |
| Defaulting on a loan-app or a co-signed loan | −30 |
| Paying off a loan on schedule | +15 once |

- **Loan offer = f(credit score)**: both the **rate** and the **maximum amount** depend on the score. The lender also declines if the new EMI would exceed 50% of M.

| Score | Formal lender offer (illustrative) |
|---|---|
| 750+ | up to ₹10,000 at 14% p.a. |
| 700–749 | up to ₹8,000 at 18% |
| 650–699 | up to ₹6,000 at 22% |
| 600–649 | up to ₹3,000 at 26% |
| under 600 | declined by banks |
| *Any score* | Instant **loan app**: up to ₹3,000, 10% processing fee up front, repay ₹3,900 in 30 days = **₹1,200 on ₹2,700 in a month (≈ 44%)**, and contact-list harassment if late |

- **EMI formula** (reducing balance), with `i = rate/12`, `n` months: `EMI = P × i × (1+i)^n / ((1+i)^n − 1)`. [CALC] ₹6,000, 6 months: 14% → ₹1,041; 18% → ₹1,053 (total ≈ ₹6,319, ≈ ₹319 extra); 22% → ₹1,065.
- The offer screen always shows **EMI, total paid, extra cost** and "why this rate" (your score).

---

## 6. Consequence engine (how every choice has a result)

Every life event / scam alert / gut-check is data:

```ts
type Verdict = 'good' | 'mixed' | 'bad';
interface Choice {
  id: string;
  label: string;                         // what the student taps
  verdict: Verdict;                      // drives green / amber / red outcome card
  now:   { money?: number; goalProgress?: Record<string, number>; joy?: number;
           possessions?: { item: string; cost: number; yearlyLoss: number }[] };
  later?: { inMonths: number; money?: number; eventId?: string; note?: string }[];   // delayed effects
  recurring?: { months: number; perMonth: number; label: string }[];                  // EMI, premium, RD
  credit?: number;                        // score delta
  shield?: number;                        // scam-safety points
  flags?: string[];                       // e.g. 'impulse_buy', 'insured'
  outcomeText: string;                    // plain-words result
  why: string;                            // the lesson, one line
  termsToReinforce?: string[];            // Word Bank terms this tested
}
```

**Outcome card:** shows rupee changes animating on the portfolio, which meters moved (Health inputs, Joy, credit score), a **verdict colour**, and the **"why"** line.
**"What if…?"** After each choice, the student can preview what **each other choice would have done** (non-binding).
**Try again (once per event):** after the previews, the student may **choose again**. The **first choice is the one recorded** for the NGO's weak-spot stats; the second is stored as "retried". Money from the first choice is rolled back when they retry. This is the brief's "make choices, see consequences, try again".
**Events are fixed, not random:** same events, order and numbers for every student; only the choices differ. Easier to test, and class stats stay comparable.

---

## 7. Life events: choices and consequences

Scale rule: **all amounts are sized to M ≈ ₹2,000–₹5,000 a month.** Verdict colours: ✅ good · 🟧 mixed · 🟥 bad. "Joy" is used only if the Joy meter is adopted.

### Level 1 (month 4): Money Basics
| Event | Choice | Now | Later | Verdict | Why |
|---|---|---|---|---|---|
| **Festival sale** (cover + earbuds combo ₹1,500; cover alone ₹600) | Buy the combo | −₹1,500, Joy +3 | goal progress this month 0; flag `impulse_buy` | 🟥 | "A sale only saves money on things you already planned to buy." |
| | Buy cover only | −₹600, Joy +2 | – | 🟧 | A small want, planned. |
| | Skip; put ₹600 toward Goal 1 | goal +₹600 | – | ✅ | Wants can wait; goals move. |
| **Friend's birthday** (₹500 contribution) | Contribute ₹500 | −₹500, Joy +2 | – | 🟧 | Social wants are real. |
| | Give a ₹150 handmade gift | −₹150, Joy +1 | – | ✅ | Plan inside your limit. |
| | Skip it | Joy −1 | – | 🟧 | Money kept, friendship cost. |
| **Surprise ₹1,500 gift** | Spend all | −, Joy +3 | savings rate this month 0% | 🟥 | Spending first, saving never. |
| | **Split 60/40** (₹900 want / ₹600 save) | ₹600 saved | – | ✅ | Pay yourself first. |
| | Save all | ₹1,500 saved | Joy −1 | 🟧 | Healthy, but life needs some joy. |

### Level 2 (month ~7): Banking & Digital Money
| Event | Choice | Now | Later | Verdict | Why |
|---|---|---|---|---|---|
| **₹3,000 cash gift** | Keep it in the drawer | stays in Wallet | next month ₹800 "disappears" into small spends | 🟥 | Cash at hand gets spent and can be lost. |
| | Put in savings account | → Savings | +0.25% per month | ✅ | Safe, earns a little, traceable. |
| | Spend ₹3,000 on a want | −₹3,000, Joy +3 | – | 🟧 | Fun, but no growth. |
| **Scam Alert: "refund ₹500, enter UPI PIN to receive"** | Enter the PIN | −₹1,500 | shield −; flag `fell_for_upi` | 🟥 | A PIN is only for sending. |
| | Ignore it | – | shield +1 | ✅ | |
| | Ask an adult / call the bank | – | shield +1, Joy +1 | ✅ | Pause and verify. |
| **Two accounts to choose** (A: no minimum, 2.5% interest; B: ₹5,000 minimum, ₹150 fee a quarter if below, 3.5% interest) | Choose B | – | −₹150 next quarter | 🟥 | Read the fee line. |
| | Choose A | – | – | ✅ | |
| | "Read the terms first" (reveals fees) then choose | – | shield +0 | ✅ | |

### Level 3 (month ~10): Safety Net & Saving Habit
| Event | Choice | Now | Later | Verdict | Why |
|---|---|---|---|---|---|
| **Phone screen breaks (₹2,800)** | Pay from Emergency fund (needs ≥ ₹2,800) | −₹2,800 from fund | meter drops | ✅ | That's what the fund is for. |
| | Take it from your goal money | −₹2,800 from goals | goal deadline slips 1 month | 🟧 | Works, but your dream moves. |
| | Borrow from a moneylender (10% a month) | +₹2,800 | −₹280 per month until repaid, flag `informal_loan` | 🟥 | Informal money can cost the most. |
| | Don't repair | Joy −3 | – | 🟧 | You avoid cost, you lose use. |
| **Illness: tests and medicine ₹3,500** | With health insurance (if bought) | −₹500 | – | ✅ | Insurance absorbed the big part. |
| | No insurance, use fund | −₹3,500 from fund | – | 🟧 | Fund worked, but it's gone. |
| | No fund or insurance | forced choice: goals, moneylender, or delay treatment | – | 🟥 | A shock without a net. |
| **RD instalment clash** (a want appears the same month your ₹500 RD is due) | Pay RD, skip the want | −₹500 | – | ✅ | Habit beats impulse. |
| | Skip the RD instalment | – | −₹50 fee | 🟥 | Missing a deposit costs you. |

### Level 4 (month ~14): Borrowing & Credit
| Event | Choice | Now | Later | Verdict | Why |
|---|---|---|---|---|---|
| **Phone for ₹6,000** (cash price ₹5,500 if you wait) | "No-cost EMI" 6 × ₹1,000 | phone appears in Things I own | −₹1,000 × 6; credit +10 each on time | 🟧 | You paid ₹500 more than cash (the lost discount). |
| | Bank loan at your score's rate (6 months) | phone; liability ₹6,000 | EMI ≈ ₹1,053 × 6 (at 18%); +10 each | 🟧 | Total ≈ ₹6,319, ≈ ₹319 extra. |
| | Wait and save 2–3 months, buy at ₹5,500 | – | phone later, no interest | ✅ | The cheapest option is patience. |
| **Friend asks you to co-sign ₹5,000 loan** | Co-sign | – | in 2 months friend misses: −₹850, credit −30 | 🟥 | You owe if they don't. |
| | Decline; give ₹300 of your own | −₹300, Joy +1 | – | ✅ | Help without the risk. |
| **Instant-loan app: ₹3,000 offered, ₹300 fee, asks for contacts** | Accept | +₹2,700 | next month −₹3,900 or default (credit −30, harassment, Joy −3) | 🟥 | ≈ 44% in a month. |
| | Decline; ask family or a bank | – | – | ✅ | |
| | Check lender in the RBI list, then decline | – | shield +1 | ✅ | Verify before you borrow. |

### Level 5 (month ~17): Growth I
| Event | Choice | Now | Later | Verdict | Why |
|---|---|---|---|---|---|
| **₹6,000 bonus** | Spend it | −₹6,000, Joy +3 | – | 🟧 | No growth. |
| | Savings account | → Savings | +0.25%/mo | 🟧 | Safe, lowest growth. |
| | 6-month FD | → FD | ₹6,195 at maturity | ✅ | Safe and higher, but locked. |
| | Split | as chosen | – | ✅ | |
| **Class-trip fee ₹3,000 in month +2** | Break the FD early | principal back, interest only at 3% | – | 🟧 | Early withdrawal costs interest. |
| | Use emergency fund | −₹3,000 | meter drops | ✅ | The fund exists for surprises. |
| | Skip the trip | Joy −2 | – | 🟧 | |
| **"Double your money in 2 years" offer** | Put ₹2,000 in | −₹2,000 | gone after 1 month (flag `fell_for_double`) | 🟥 | Higher return needs higher risk. |
| | Ignore | – | – | 🟧 | |
| | Ask "what's the risk? who regulates it?" | – | shield +1, unlocks the 5-point check | ✅ | |

### Level 6 (months ~18–22): Investing (one asset at a time)
| Event | Choice | Now | Later | Verdict | Why |
|---|---|---|---|---|---|
| **6.1 Pick a mix for ₹6,000** (previews 3 scenarios, non-binding) | All in shares / mixed (FD + gold + MF) / all in savings | previews only | – | ✅ (any, if you read the comparison) | Compare outcomes under *Steady*, *Bumpy*, *Crash*. |
| **6.2 Gold ₹3,000** | Physical jewellery (8% making) | value ₹2,760 | follows gold index; **gold dip** episode | 🟧 | Making charges bite immediately. |
| | Regulated gold ETF (0.5% cost) | value ₹2,985 | same index | ✅ | Lower cost, easy to sell. |
| | "Digital gold" app offer | – | flag `unregulated_gold`; shield +0 | 🟥 | Not regulated by SEBI **[VERIFY wording]**. |
| **6.3 Market crash (MF −19% over 2 months)** | Sell everything | locks the loss | – | 🟥 | Panic selling turns a dip into a loss. |
| | Hold and keep the SIP | – | buys more units cheaply; recovery over 6 months | ✅ | Rupee-cost averaging. |
| | Pause the SIP, hold | – | partial recovery | 🟧 | |
| **6.4 WhatsApp stock tip "doubles in a month"** | Put ₹2,000 | −₹2,000 into the tip stock | +15% then −40% (net ≈ −31%) | 🟥 | Tips are not research. |
| | Ignore | – | – | 🟧 | |
| | Check who sent it and whether they're registered (SEBI check) | – | shield +1 | ✅ | |

### Level 7 (month ~24): Taxes & First Paycheck  *(first to cut if late)*
| Event | Choice | Now | Later | Verdict | Why |
|---|---|---|---|---|---|
| **First ₹8,000 stipend** (practice deductions shown: ₹960 retirement-savings deduction, ₹0 tax since below the limit **[VERIFY]**) | Read the pay slip and keep records | – | flag `keeps_records`, Joy +1 | ✅ | Know where money goes. |
| | Ignore it | – | – | 🟧 | |
| **Cash side-gig ₹2,500 a month** | Record it | – | flag `keeps_records` | ✅ | Proof of income helps later (loans, forms). |
| | Don't record | – | flag `no_records`; finale plan card notes it | 🟧 | |

### Level 8 (months ~25–27): Fraud-Proof  *(shield meter; money is on the line)*
| Event | Choice | Now | Later | Verdict | Why |
|---|---|---|---|---|---|
| **Task job: ₹50 per task, then "deposit ₹2,000 to unlock ₹5,000"** | Deposit | −₹2,000 | asks for more; flag `fell_for_task` | 🟥 | Early small payouts build false trust. |
| | Stop and report (1930 / cybercrime.gov.in) | – | shield +1 | ✅ | |
| | Run the 5-point check / ask an adult | – | shield +1, Joy +1 | ✅ | |
| **"Your KYC expires today" SMS link** | Click and enter details | −₹1,500 | flag `phished` | 🟥 | Banks don't ask for details by link. |
| | Delete / report | – | shield +1 | ✅ | |
| | Call the bank's official number | – | shield +1 | ✅ | |
| **Telegram tips group: ₹2,000 → ₹20,000 in a week** | Join and pay | −₹2,000 | flag `fell_for_tips` | 🟥 | Guaranteed returns don't exist. |
| | Ignore | – | – | 🟧 | |
| | Check registration (SEBI Check) | – | shield +1 | ✅ | |

### Scam Alerts earlier (Levels 2, 5, 6) are the same engine, so Scam-safety in the score reflects *all* of them.

---

## 8. Milestones (badges)
First ₹10,000 saved · Goals set (3) · 1-month safety net · 3-month safety net · First RD matured · Smart borrower (no missed EMI) · Debt-free · Beat inflation (real growth > 0) · Diversified (3+ types) · Stayed calm in a crash · Scam-proof (shield full) · Records keeper · Month-29 finisher (plan card).

---

## 9. Rules to settle once (so nobody asks later)
| Question | Rule |
|---|---|
| Unlock order | Levels unlock **in sequence**; finished ones can be replayed for review (pays nothing) |
| Time on replay | Replays don't advance months |
| Quiz retry | Improvement-only money; unlimited retries |
| Events | Fixed content and order, student choices only |
| Negative balance | Floor at ₹0; shortfall → missed-payment rules (§1.1) |
| Calculators / Predict | Preview only; never alter real state |
| "Try again" on events | Once per event; first choice recorded for NGO stats |
| Starting Profile (3 taps) | Changes **wording and the Level-2 variant only** (e.g., "open your first account" vs "use your account better"); **never changes money**, so class comparisons stay fair |
| Unverified facts | Each content fact has `verified: true/false`; unverified facts are **not displayed** in the final build |

---

## 10. What's sized for scope
Engine pieces (Lane 1): bucket ledger, month-close processor (interest, depreciation, market, credit, deductions), consequence/outcome engine with what-if + try-again, Health/Joy/credit meters, goals and wants list. Tests: ledger math, EMI/FD/RD/SIP formulas, credit rules, scripted episodes, shortfall handling. Content data (Lane 2): ~25 events from §7 + ~19–29 gut-check choices + Scam Alerts.
