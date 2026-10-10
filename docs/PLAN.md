# Rupee Quest: Build Plan v3 (Vanguard Financial Literacy)

> Working title. v3 (2026-10-10): decisions from your review applied. Deadline ≈ 12 h from v1.
> Files: **PLAN.md** (this: product, tech, split, timeline) · **CONTENT.md** (curriculum, 29 sub-sections) · **MECHANICS.md** (money, clock, scoring, credit, consequence engine, event tables) · **LESSON_1.1.md** (template lesson).
> **[DECIDE]** = your answer needed · **[VERIFY]** = unconfirmed fact, kept off screen until checked.

---

## 0. Pitch

A mobile-first, offline-capable web app (PWA, also an APK) where Grade 11–12 students from underserved Hyderabad communities learn money skills by **growing their own virtual portfolio**. Each sub-section is **one game-month**: a gut-check choice, short hand-drawn cards, a mini-tool, a 3-question quiz that pays **practice money (₹2,000 + ₹1,000 per correct answer)**, then a **Plan the Month** step to spend on wants, save toward goals or invest. Levels unlock portfolio buckets in the order a sensible money life builds: track money → bank → safety net → borrowing → growth → investing → taxes → fraud-proofing. **Every choice in a life event has a visible good or bad consequence**, loan offers depend on the student's **credit score**, and students can **add their own wants** any time. English, Hindi, Telugu. NGOs get their own account: classes, anonymous student join, aggregate progress.

**Golden assumption (always on screen):** *needs are covered by family or by you; practice money is only for wants and savings.*
**Guardrail from the brief:** we educate, we never recommend; every projection is an assumption, not a promise.

---

## 1. Decisions so far

| Topic | Decision |
|---|---|
| Platform | Website first (React + Vite) → PWA → Capacitor APK last |
| Teaching shape | 9 levels → 29 sub-sections (23 MUST) → gut-check, cards, tool, quiz → practice money → Plan the Month |
| Money | ₹2,000 per sub-section + ₹1,000 per correct quiz answer; no separate income; needs not simulated |
| Time | 1 sub-section = 1 game-month; calculators and fast-forward are previews only |
| Consequences | Every event choice has a verdict (good / mixed / bad), money and meter effects, "what-if" previews, one "try again" |
| Credit | Score (start 650 on first credit action) sets loan rate and maximum |
| Wants | Student adds own wants any time; wants can become goals; items depreciate |
| Personas | Dropped. 3-tap Starting Profile kept (wording only, never money). **Placement check dropped** |
| Learning evidence | First-attempt quiz scores + 10-question final quiz (no baseline: "students scored X", never "improved") |
| Languages | English, Hindi, Telugu; **English term always shown beside translated text** |
| AI | No runtime LLM |
| NGO | Separate NGO account; **anonymous progress syncs to the server** (no personal data) |
| Team | Three people working in parallel lanes on separate branches, merged by pull request |
| Hosting / backend | **Vercel** (PR previews) + **Supabase** (auth + data) in **Phase 2**; Phase 1 is localStorage only |
| Phases | 0 foundation (Harness) → 1 content + simulator, English only → 2 auth, NGO, Hindi/Telugu, PWA/APK → 3 polish and pitch. Branches + PRs, Harness reviews, Amey merges |

---

## 2. Website vs "real app" (unchanged)

| Option | Build | Test | Offline | Notes |
|---|---|---|---|---|
| **Web app + PWA** (base) | Fast | Instant | Yes (service worker) | Add-to-Home-screen; no store |
| **+ Capacitor APK** | +1–2 h at end | Needs Android toolchain | Yes, **from first launch** | Same code |
| PWABuilder / TWA | Very fast | Needs HTTPS host | Only after first online launch (first offline launch shows a browser error page) | Weaker for us |
| React Native / Flutter | Slow | Slower | Yes | Rewrite; not for 12 h |

**This laptop:** Node 24, npm 11, git ✅. Android Studio folder exists but **no Android SDK and no `java` on PATH** ⚠️ → open Android Studio once to install the SDK (bundles a JDK; guides say JDK 21, one says 17+). **APK is the last milestone**; the hosted PWA is the primary deliverable.
Sources: [Capacitor Android](https://capacitorjs.com/docs/android) · [Capgo guide](https://capgo.app/blog/android-setup-for-capacitor-apps/) (third-party) · [Chrome offline-first TWA](https://developer.chrome.com/docs/android/trusted-web-activity/offline-first) · [PWABuilder Android](https://blog.pwabuilder.com/docs/android-platform/)

---

## 3. Product design

### 3.1 Core loop (one game-month)
```
Gut-check choice (hypothetical) → 5–8 swipe cards → mini-tool → 3-question quiz → practice money lands
→ PLAN THE MONTH: automatic deductions (EMI, RD, SIP, premium) → you decide: wants / goals / savings / invest
→ Month closes: interest, depreciation, market, credit score, goals → (if due) LIFE EVENT with consequences
```
Details, formulas and numbers: **MECHANICS.md**. Curriculum: **CONTENT.md**.

### 3.2 Portfolio screen
- **Top:** Net worth · **Money Health Score** (5 inputs × 20 pts, MECHANICS §4) · **Joy meter** (optional) · credit score (after first credit action) · shield meter · month counter · Wallet balance.
- **Buckets** (unlock by level): Wallet · My Wants/Goals · Savings · Emergency fund · RD · FD · Gold · SIP/Mutual fund · Shares · Things I own (depreciating) · Liabilities.
- Each bucket: amount, Move money, **Predict** (opens the calculator pre-filled; preview only), "What is this?" (opens the lesson/Word Bank).
- **Add a want** button always visible; wants become goals; "Buy it" uses money or (after Level 4) EMI with total cost shown.

### 3.3 Consequence and event engine (MECHANICS §6–7)
Every life event, scam alert and gut-check is data (`Choice` with `now`, `later`, `recurring`, `credit`, `shield`, `flags`, `verdict`, `outcomeText`, `why`). Outcome card shows animated rupee changes, meters moved, verdict colour and the lesson in one line. **What-if** previews the other choices; **try again** once per event (first choice recorded for NGO stats). Events are **fixed and identical for every student**.

### 3.4 Credit-score-based loans (MECHANICS §5)
Score starts at 650 on first credit action; on-time EMI +10, missed −40 (+₹200 fee), second loan −15, default −30. Offers: 750+ ₹10,000 @14% · 700–749 ₹8,000 @18% · 650–699 ₹6,000 @22% · 600–649 ₹3,000 @26% · under 600 declined by banks · any score: instant loan app (≈44% a month, harassment risk). Offer screen always shows EMI, total paid, extra cost and "why this rate".

### 3.5 Theory cards ("sketch cards", Linelapse-inspired)
Linelapse's course page never rendered for us; it appears to be an AI whiteboard-explainer tool **[VERIFY]**. We reproduce the idea in-app: swipeable cards with hand-drawn SVG that draws itself (CSS stroke animation) + one short line + tap-to-reveal, drawn with [rough.js](https://roughjs.com/) or plain SVG. No video files (heavy, hard to translate ×3, hard to keep offline). **Word Bank:** three layers per core term (say it simply → see it in life → say the real word + optional maths). **[DECIDE]** a few exported Linelapse clips for hero lessons, or in-app cards only (default).

### 3.6 Tools (split to fit 12 h)
- **Bespoke builds (~5):** Budget Builder · Scam Shield + Check-it · UPI Practice · portfolio fast-forward / Bad-Year · event engine.
- **Config calculators (one generic component, formula + labels):** SIP · Lumpsum · Goal-SIP · EMI · FD · RD · inflation · compound · depreciation · slab · take-home · fee lens · gold compare · leak finder.
- **Static illustrated cards or cut:** Passbook Reader · Minimum-Due Trap · Price Mood Swings · Options Over Time · Score Simulator (simplified) · Months-Covered Meter (simple bar).
- Shared UI: slider + number box, result cards, chart, one-line "shocker", disclaimer footer. **Compute and unit-test everything; never hard-code results.** Verified maths list: CONTENT.md §6 and MECHANICS [CALC] tags.

### 3.7 Adapting without personas
**3-tap Starting Profile** (age band, earn/pocket-money/neither, own bank account yes/no): changes **wording and the Level-2 variant only**; **never money**, so class comparisons stay fair. No placement quiz.

### 3.8 Assessment and evidence
3-question quiz per sub-section (tap-right-answer, tap-sort, true/false, spot-the-red-flag); **concept mastery per term**; **10-question final quiz** (Level 9). **No baseline**, so we report scores, not improvement. Per-event first-choice stats show weak spots to the NGO.

### 3.9 Gamification
Practice money, Money Health Score, Joy meter, shield meter, milestone badges (MECHANICS §8), end-of-level Portfolio Review (before/after), final money plan + certificate card. No live leaderboards.

### 3.10 Languages
- `react-i18next`, **bundled** JSON for `en`, `hi`, `te` (works offline). Self-hosted `@fontsource/noto-sans-devanagari` and `@fontsource/noto-sans-telugu` so fonts are precached **[VERIFY with an offline test]**.
- **English term always beside the Hindi/Telugu text** (bank forms and apps use English words).
- Workflow: drafts, **a native speaker reviews**; fixed glossary first (CONTENT.md §5). No runtime machine translation (a 2025 study found models struggle with financial terms: [EMNLP 2025](https://preview.aclanthology.org/setup/2025.emnlp-main.1774)).
- `Intl.NumberFormat('en-IN')` for lakh/crore; Western digits in all three languages. **[DECIDE]** who reviews Hindi? Telugu? Else a "draft translation" label.

---

## 4. NGO account and privacy

**Flow:** NGO admin (email + password) creates a **Class** → **class code** (e.g. `HYD-7QX3`). Student: "Join class" → code → generated **nickname** + one-time **recovery code**. **No name, phone, email or location collected.** Shared phone: join again; recovery code continues on another device.

**What is stored (synced):** nickname, class code, recovery code hash, per-sub-section quiz scores and first-attempt flags, event first-choices, Money Health Score snapshot per month, milestones. **Not stored:** anything personal, device identifiers, analytics/ad trackers.

**NGO dashboard (aggregates only):** completion % per level, average quiz score per concept, **weak spots** (e.g. "62% fell for the task-job alert on first choice"), average Money Health, average months-covered, last active, CSV export. NGOs may privately map nickname → student in their own records.

**Privacy basis:** India's DPDP Act treats under-18s as children, requires verifiable parental consent and prohibits tracking/behavioural monitoring of children (per secondary sources; rule numbers differ between draft and final **[VERIFY]**). Whether the school exemption covers NGOs/vendors is unclear; the privacy slide says so plainly and tells NGOs to handle consent under their own advice. Sources: [MediaNama](https://www.medianama.com/2025/01/223-data-protection-rules-2025-children-data-india/) · [EY](https://www.ey.com/en_in/insights/cybersecurity/transforming-data-privacy-digital-personal-data-protection-rules-2025)

**Backend (decided): Supabase** in Phase 2. Anonymous student sign-in (`signInAnonymously`, JWT has an `is_anonymous` claim usable in RLS) with class code + nickname + recovery code; NGO email login; RLS so students touch only their own rows and NGOs only their classes; aggregates through views/RPC; enable invisible CAPTCHA; only the anon key in the client. **[VERIFY]** rate limits and free-plan quotas on Supabase docs ([anonymous sign-ins](https://supabase.com/docs/guides/auth/auth-anonymous)). Build a `DataAdapter` (`local`, `supabase`) so the demo always works offline. Batch writes (one per sub-section + one per event).

---

## 5. Technical architecture

**Stack:** React 18 + Vite + TypeScript (strict), React Router, Zustand (+persist), zod (content schemas), i18next/react-i18next, Recharts, Vitest. **Plain CSS** whiteboard theme (no Tailwind). PWA via `vite-plugin-pwa` in Phase 2 ([note](https://npmjs.com/package/vite-plugin-pwa): add `woff2, svg, png, json` to `globPatterns`).

```
src/
  app/            routes, layout, theme                                (Lane 1)
  core/           types, store, economy.config.ts, DataAdapter, i18n   (Lane 1)
  engine/         ledger, month-close, market, credit, health score,
                  consequence/event engine (what-if, try-again)        (Lane 1)
  features/
    portfolio/    portfolio screen, Plan the Month, My Wants/Goals     (Lane 1)
    home/         level map, milestones                                (Lane 1)
    lessons/      sketch-card player, gut-check, quiz, Word Bank       (Lane 2)
    scamshield/   swipe game, Check-it, now-what simulator             (Lane 2)
    tools/        config calculators + generic component + tests       (Lane 3)
    ngo/          NGO auth, classes, dashboard                         (Lane 3)
  content/
    levels/       one JSON per sub-section (see LESSON_1.1.md §7)      (Lane 2)
    events/       life events, scam alerts (MECHANICS §7 as data)      (Lane 2)
    glossary.json, i18n/{en,hi,te}.json                                (Lane 2; HI/TE hour 6+)
```
**Contracts first (hour 0–1):** shared TS types (`SubSection`, `Card`, `QuizItem`, `Term`, `Choice`, `LifeEvent`, `Bucket`, `PortfolioState`, `Scenario`, `ProgressEvent`, `DataAdapter`, tool registry `{id, inputs, compute(), explain()}`). `economy.config.ts` holds every number from MECHANICS.md.

**Design rules:** 360 px first; one decision per screen; ≥ 44 px tap targets; high contrast; icons + words; no horizontal scroll; first load < ~1.5 MB; works with data off.
**Look (decided 10 Oct):** the **whiteboard theme** (the team's existing design system) (dot grid, ink borders, hard offset shadows, marker colours, Nunito). Our own name/wordmark ("Rupee Quest"), **not** the EnJEEn wordmark, tagline or voice rules. Adjustments for us: (1) **Indic text:** `letter-spacing: 0` and `line-height ≥ 1.35` on Hindi/Telugu (negative tracking and 1.1 line-height break conjuncts/matras); Noto Sans Devanagari/Telugu at the same weights, self-hosted. (2) **Dense screens (portfolio, Plan the Month):** 2px borders and `3px 3px` shadows on small items; 3px/5px only on hero cards and buttons. (3) **Colour meaning:** green = good, yellow = mixed/caution, red = bad (event verdicts); blue = actions; purple = credit score and Joy (replaces "mentors"). (4) Tilts only on eyebrows and sticky notes; none on tables, numbers or quiz options; honour `prefers-reduced-motion`. (5) Self-host Nunito (and IBM Plex Mono for ₹ figures, after checking the ₹ glyph) so it works offline. (6) Drop dark mode unless time remains. Source of truth: `docs/design/enjeen-index.css` (copied from the EnJEEn landing page).

---

## 6. Work split (original sketch)

| Lane | Who | Owns | Deliverables |
|---|---|---|---|
| **1. Foundation + engine** | **Lane 1** | scaffold, design system, router, i18n wiring, store, economy config, DataAdapter, **ledger/month-close/credit/health/consequence engines with tests**, portfolio screen, Plan the Month, wants/goals, milestones, PWA, deploy, APK | Shell by hour 3; engine + portfolio playable by hour 6 |
| **2. Lessons, content, games** | **Lane 2** | lesson player (gut-check → cards → tool slot → quiz), Word Bank, **23 MUST lessons as JSON (EN)**, events and scam alerts as data, Scam Shield, Check-it, glossary | Player + Level 1 by hour 3; all MUST content by hour 6 |
| **3. Tools + NGO** | Lane 3 | generic config-calculator component + ~14 formulas with Vitest first, Budget Builder, UPI Practice, NGO login/class/dashboard | Calculators by hour 5; NGO by hour 8 |
| **Docs & pitch** | Lane 1 (last hours) | README, architecture slide, deck, demo script, privacy/Responsible-AI note | Deck by hour 11 |

Prompt for each agent: *"Read PLAN.md, CONTENT.md, MECHANICS.md and `src/core/types.ts`. You own only `<folders>`. Do not edit others. Build `<deliverables>`. Run `npm run dev` and `npm test` before saying done."*

---

## 7. Timeline (12 h)

| Hours | Milestone | Gate |
|---|---|---|
| **0–1** | Answer [DECIDE]s; scaffold, types, economy config, lane prompts | `npm run dev` shows empty shell |
| **1–4** | Parallel: shell + ledger/month-close / lesson player + Level 1–2 / config calculators + tests | Each lane demoable alone |
| **4–6** | Remaining MUST content, event engine, credit + health meters, NGO UI on local adapter | A student can finish Level 1 → month closes → event with consequences |
| **6** | **English content freeze**; merge | Full flow works end to end |
| **6–8** | Hindi/Telugu + review; NGO dashboard wired; Firebase (optional) | All 3 languages switch live |
| **8–9** | 360 px QA, airplane-mode test, perf, bug bash, engine playtests (2 full runs) | Works offline after first load; economy balanced |
| **9–10** | Deploy HTTPS URL (Vercel/Netlify/GitHub Pages), install-as-PWA, **APK attempt** | PWA installed on a real phone |
| **10–12** | Deck, demo script, README, privacy note, rehearsal, buffer | Submission-ready |

**Cut order if late:** Level 7 → 6.4 → simplify 4.3 → 3.3 → static cards for illustrative tools → Firebase (keep mock NGO) → APK.
**Never cut:** one full level loop (gut-check → cards → quiz → money → Plan the Month → event) · Net-worth, Emergency and SIP buckets · event engine with consequences · Scam Shield · SIP calculator with shocker · Hindi + Telugu on main screens · disclaimers · a working NGO progress view (even seeded).

---

## 8. Brief's seven success measures

| Measure | How we meet it |
|---|---|
| Simple | One idea per sub-section; plain words first, real term second |
| Relatable | Hyderabad examples; festival sale, phone EMI, UPI, tips, cash gigs; student's **own wants** |
| Persona-led | 3-tap Starting Profile (wording/variant), student-defined wants and goals (a partial cover; judges may still see it as thin) |
| Language-ready | EN/HI/TE, English term beside every translation, bundled fonts |
| Game-based | Practice money, portfolio, consequences, quizzes, milestones, mastery per concept |
| Intuitive UI | Big buttons, one decision per screen, minimal text |
| NGO-integrated | NGO account, class codes, anonymous join, aggregate dashboard |

Guardrails: educate don't recommend (neutral pros/cons wording; no product names); simulations are assumptions; privacy-conscious (no PII, tracking, ads, third-party analytics).

---

## 9. Demo story (3 min)
1. Month 1: gut-check (sneakers vs save vs split) → cards → quiz pays ₹ → add a want → Plan the Month.
2. Fast-forward to Level 4: **phone offer**: "no-cost EMI" vs bank loan vs wait. Credit score shifts the loan offer.
3. Event outcome card: verdict, rupees moved, "what if" previews, **try again**.
4. Level 6: SIP bucket → **crash** episode → hold vs sell → "Stayed calm" badge.
5. Level 8: task-job scam alert; 5-point check; "call 1930"; shield meter.
6. Switch to **Telugu** live (English terms beside).
7. NGO dashboard: weak spots and averages, **no student names**.
8. Airplane mode: still works.
Also prepare: limitations slide (assumption-based sims; translations reviewed by X; privacy rules unverified for NGOs; no field testing; no baseline) and next steps (pilot with ~1,500 students, teacher feedback loop, more languages).

---

## 10. Risks

| Risk | Mitigation |
|---|---|
| Scope: 23 MUST lessons + engine + NGO in 12 h | Lessons are data; tiers; cut order; contracts first; generic calculator component |
| Content accuracy (taxes, rates, rules change) | Tested formulas; dated config; `verified` flags (unverified facts hidden); no product names |
| Economy feels unbalanced | All numbers in one config; two full playtests by hour 8 |
| Engine bugs (interest, credit, shortfall) | Vitest on ledger, month-close, EMI/FD/RD/SIP, credit rules, scripted episodes |
| 3-agent merge conflicts | Folder ownership, branches, fixed merge points |
| No Android SDK/JDK on this PC | APK last; PWA primary; install SDK early in background |
| Hindi/Telugu quality | Native review; glossary first; "draft" label if unreviewed |
| Free-tier/wifi at demo | Mock/seeded mode always available; batched writes |
| Persona-led measure only partly covered | Starting Profile + own wants/goals; be upfront in the pitch |
| "Another quiz app" | Portfolio + consequences + credit + wants + scam events + NGO loop |

---

## 11. Differentiation
- **Zerodha Varsity Junior:** animated stories for ~8+ kids; passive; no quiz/tracking; no Telugu/Urdu. Don't copy its content (site bars reproduction). [Zerodha post](https://zerodha.com/z-connect/varsity/introducing-varsity-junior)
- **NCFE:** teacher-led, test-based, classes VIII–X. [Vikaspedia](https://www.vikaspedia.in/social-welfare/financial-inclusion/financial-literacy/financial-literacy-for-children)
- **Visa Practical Money Skills / Bankaroo:** US-centric or young kids; English only.
- **Our gap:** teen-level, Hyderabad examples, three languages, offline, a portfolio that changes because you learned and chose, consequences with credit scores, an NGO insight loop.
Devices: rural India ~90% of 14–18-year-olds can use a household smartphone, but personal ownership is lower (esp. girls) → assume shared family phones, low-end Android, short sessions, no device-tied login ([ASER 2023](https://asercentre.org/wp-content/uploads/2022/12/ASER-2023-press-release1_English_16-Jan.pdf), rural, not Hyderabad-specific).

---

## 12. Open questions
**Curriculum/mechanics:** see **CONTENT.md §7 (Open)**: Joy meter, ₹3,000 reference need, credit-score start/offers, event numbers, market numbers, 23 vs 22 MUST, who verifies.
**Decided 10 Oct:** backend = Supabase (Phase 2), hosting = Vercel, UI = whiteboard theme, Phase 1 English only, work in branches + PRs. **Still open platform/team items:**
1. **Backend:** Firebase (needs a free project) or mock-only?
2. **Hosting account** (Vercel / Netlify / GitHub Pages)?
3. **Branding:** own name/logo or Vanguard colours? Keep "Rupee Quest"?
4. **Linelapse:** in-app sketch cards (default) or a few exported clips?
5. **Hindi and Telugu reviewers?**
6. **Lane split OK?**
7. Can 2–3 Grade 11–12 students see a lesson before the demo?

---

## 13. Sources
Capacitor <https://capacitorjs.com/docs/android> · <https://capgo.app/blog/android-setup-for-capacitor-apps/> · TWA <https://developer.chrome.com/docs/android/trusted-web-activity/offline-first> · <https://blog.pwabuilder.com/docs/android-platform/> · vite-plugin-pwa <https://npmjs.com/package/vite-plugin-pwa> · Firebase <https://firebase.google.com/docs/auth/limits> · Varsity Junior <https://zerodha.com/varsity/junior/> · DPDP <https://www.medianama.com/2025/01/223-data-protection-rules-2025-children-data-india/> · ASER <https://asercentre.org/wp-content/uploads/2022/12/ASER-2023-press-release1_English_16-Jan.pdf> · EMNLP <https://preview.aclanthology.org/setup/2025.emnlp-main.1774> · Content sources: CONTENT.md §2 and §6 · Research notes: `research.md`
