# Rupee Quest

A mobile-first financial-literacy game for Grade 11–12 students in Hyderabad (Megathon X, Vanguard India brief). Each lesson is one game-month: gut-check → cards → tool → quiz → practice money → Plan the Month → life events with consequences.

> **Golden assumption:** needs are covered by family or by you; practice money is only for wants and savings.
> **Guardrail:** we educate, never recommend. Every projection is an assumption, not a promise.

Design docs are in [`docs/`](docs/), starting with [`docs/PLAN.md`](docs/PLAN.md).

## Run it

Needs Node 22+.

```bash
npm ci          # install exactly what the lockfile says
npm run dev     # http://localhost:5173
npm run check   # typecheck + all tests (formulas, engine contract, content checks, routes)
npm run build   # typecheck + production build into dist/
```

Phase 1 stores the game in `localStorage` (`rupee-quest-state`); no accounts, no env vars. `.env.example` lists the Phase 2 Supabase placeholders. Never commit a real `.env`.

## Stack

React 18, Vite, TypeScript (strict), React Router 6, Zustand (+ persist), zod, i18next, Recharts, Vitest. Plain CSS whiteboard theme (no Tailwind). Fonts self-hosted with `@fontsource` so the app works offline. Hosting: Vercel (`vercel.json` has SPA rewrites).

## Code map (who owns what: docs/WORKFLOW.md §3)

```
src/
  core/                 CONTRACTS (Amey; change only via a `contract-change` PR)
    types.ts            GameState, Action, EngineAPI, Effect, HealthBreakdown, WhatIf, LoanOffer
    content-schema.ts   zod schemas for lessons, events, glossary terms (types inferred)
    economy.config.ts   every game number from docs/MECHANICS.md
    finance.ts          every formula (SIP, EMI, FD, RD, depreciation, inflation, slabs…) + tests
    tools.ts            ToolDef, tool ids, ToolEmbedProps, prefill parsing
    state.ts            initialGameState()
    store.ts            Zustand store: dispatch(action) → engine.reduce, persisted
    data-adapter.ts     DataAdapter interface + local adapter (Supabase in Phase 2)
    i18n.ts, format.ts  i18next setup; ₹ formatting with Indian grouping, lakh/crore
  engine/               Nipun (N1/N2). A0 ships a STUB that pays quiz money; replace it
  features/tools/       Aryan (R1). A0 ships a placeholder ToolEmbed
  pages/                route pages; placeholders say which WP replaces them
  app/                  Layout, routes, App
  styles/theme.css      whiteboard theme
  content/
    curriculum.ts       the 29 sub-sections (tier, owner)
    levels/levelN/*.json      one lesson per file (1.1 is the exemplar)
    events/levelN.json        life events and scam alerts (arrays)
    glossary/levelN.json      terms {id, introducedIn, core, verified}
    i18n/en/*.json            flat keys, one file per area: ui, levelN, glossary-levelN, events, tools, scamshield, portfolio
    index.ts, i18n.ts         glob loaders (validated with zod; duplicate keys detected)
    content.test.ts           the content checks every PR must pass
```

## Contract notes (read before building on A0)

- **Actions.** UI dispatches `Action`s only; the engine returns `{ state, effects }`. The A0 gaps are closed:
  - `SHIELD_RESULT {seen, correct}` for Scam Shield.
  - `GameState.lastCompletedSubSection`, with the rule that events fire after the month closes for the sub-section in their `after` field.
  - `GameState.retrySnapshot` for "try again once".
  - A `finalQuiz` (10 items) on lesson 9.1, plus a `FINAL_QUIZ_RESULT` action.
  - Per-level glossary and i18n files, loaded by glob.
  - `DataAdapter`.
  - `ToolEmbed({toolId, prefill})`.
- **Money.** `finance.quizPayout` gives ₹2,000 + ₹1,000 × correct. `finance.retryBonus` pays only the improvement on a retry.
- **Engine rules.** Deterministic: no `Math.random` and no `Date.now`. Round only at display (`roundRupees`, `formatINR`).
- **Text.** All text is an i18n key: `lesson.<id with _>.<part>`, `event.<eventId>.<part>`, `term.<id>.name|simple|life|real|maths`, `ui.*`, `tools.*`, `scamshield.*`, `portfolio.*`. The content test enforces which prefix lives in which file.
- **Unverified facts.** Facts marked `verified:false` (tax slabs, credit bands…) must be labelled approximate and not shown as fact.
- **Tool prefill.** Query params are shared by "Predict" links and lesson cards: `principal`, `ratePct`, `months`, `monthly`, `years`, `amount`, `target`, `instalment`, `cost`, `income`.

## Windows note

If Windows Smart App Control blocks native modules (`rollup…win32…node` "blocked by Application Control policy"), install locally with a rollup WASM override. Do **not** commit that override; CI runs on Linux.

```bash
npm pkg set overrides.rollup=npm:@rollup/wasm-node@^4
```

Then delete `node_modules` and `package-lock.json`, run `npm install`, and restore both files from git before committing. Keeping the repo **outside OneDrive** avoids `node_modules` sync problems.
