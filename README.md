# Capito

A mobile-first financial-literacy game for Grade 11–12 students. Each lesson is one game-month: a gut-check choice, short cards, a calculator, a 3-question quiz that pays practice money, then Plan the Month and life events with consequences.

Practice money and pretend markets only. The app explains how things work; it does not give advice or recommend any product.

## Requirements

- Node.js 22 or newer (npm comes with it)
- Any modern browser; the app is built for phones (360 px wide) and laptops

## Setup

```bash
git clone https://github.com/IIIT-ECell/megathon26-team-illuminati.git
cd megathon26-team-illuminati
npm ci
```

## Run

```bash
npm run dev
```

Then open http://localhost:5173.

## Check and build

```bash
npm run check   # typecheck and all tests
npm run build   # typecheck and production build into dist/
npm run preview # serve the production build locally
```

Progress is saved in the browser (`localStorage`); there are no accounts and no environment variables are needed. `vercel.json` holds the single-page-app rewrite used for hosting.

### Windows note

If Windows blocks Rollup's native module ("blocked by Application Control policy"), use the WebAssembly build for your local install only:

```bash
npm pkg set overrides.rollup=npm:@rollup/wasm-node@^4
```

Then delete `node_modules` and `package-lock.json` and run `npm install`. Do not commit those two changed files.

## Project layout

- `src/core`: shared types, content schemas, game numbers (`economy.config.ts`) and money formulas (`finance.ts`)
- `src/engine`: the game simulation (months, buckets, credit score, life events)
- `src/features`: lesson player, portfolio, tools, Scam Shield, home, Word Bank
- `src/content`: lessons, events, glossary and English text as JSON
- `docs`: product plan, curriculum, game mechanics and the lesson template
- `deliverables`: milestone reports

## Built with

| Library | Use | Licence |
|---|---|---|
| [React](https://react.dev) and React DOM | user interface | MIT |
| [React Router](https://reactrouter.com) | pages and links | MIT |
| [Vite](https://vitejs.dev) and @vitejs/plugin-react | dev server and build | MIT |
| [TypeScript](https://www.typescriptlang.org) | types | Apache-2.0 |
| [Zustand](https://github.com/pmndrs/zustand) | game state, saved in the browser | MIT |
| [Zod](https://zod.dev) | content validation | MIT |
| [i18next](https://www.i18next.com) and react-i18next | all app text | MIT |
| [Recharts](https://recharts.org) | calculator charts | MIT |
| [Vitest](https://vitest.dev), [Testing Library](https://testing-library.com), [jsdom](https://github.com/jsdom/jsdom) | tests | MIT |
| [Fontsource](https://fontsource.org): Nunito, IBM Plex Mono | self-hosted fonts | fonts under SIL Open Font License 1.1 |

## Design assets

- The whiteboard visual style (dot grid, ink borders, offset shadows, marker colours) is adapted from an existing stylesheet that a team member owns. A copy is kept in `docs/design/enjeen-index.css` for reference.
- `docs/design/finvitals-calculator-reference.webp` is a screenshot of a third-party calculator, kept only as layout inspiration. No code, images or text from it are used in the app.
- Card illustrations are simple line drawings made for this project.
- The brief and reference decks in `resources/` belong to their authors and are included for context only.

## Licence

[MIT](LICENSE)
