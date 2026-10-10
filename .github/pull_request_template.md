## What and why
<!-- One work package per PR (e.g. N1a, A2-level1). What does this PR add or change? -->

**WP:** <!-- e.g. A1 / N1a / R1 -->

## Files outside my lane
<!-- List any file outside your folders (docs/WORKFLOW.md §3) and why. "None" if none.
     Contract files (src/core/*) change only in a separate `contract-change` PR. -->

## Definition of done (docs/WORKFLOW.md §5)
- [ ] `npm run check` (typecheck + tests) and `npm run build` pass locally; CI green
- [ ] Logic has unit tests; no hard-coded results; numbers from `economy.config.ts`, formulas from `finance.ts`
- [ ] All text is i18n keys; content checks pass (schema, keys exist, no duplicate keys, terms exist, ids unique)
- [ ] Guardrails: no product/fund/broker/app names; neutral wording; "not advice" banner on investing; "assumption, not a promise" on projections; needs assumed covered
- [ ] UI follows the whiteboard theme; works at 360 px; tap targets ≥ 44 px; no horizontal scroll; reduced motion respected
- [ ] `verified:false` facts are flagged and not displayed as fact
- [ ] No personal data, secrets, `.env`, analytics or trackers
- [ ] Engine code is deterministic (no `Math.random` / `Date.now`)
- [ ] My commits are under my own git identity

## How to test
<!-- Steps, routes to open, screenshots for UI (360 px). -->

## Questions / contract-change requests
<!-- Anything the reviewer must decide. -->
