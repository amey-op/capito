# Capito

## Live demo

The app is deployed at **https://capito-rho.vercel.app** (start at https://capito-rho.vercel.app/start). Nothing needs to be installed to try it there.

## Requirements

- Node.js 22 or newer (npm comes with it)
- Any modern browser (phone or laptop)

## Setup

Unzip the code (or clone the repository), open a terminal in its folder, then install the dependencies:

```bash
npm install
```

## Run locally

```bash
npm run dev
```

Then open http://localhost:5173/start.

## Check and build

```bash
npm run check   # typecheck and all tests
npm run build   # typecheck and production build into dist/
npm run preview # serve the production build locally
```

No accounts, API keys or environment variables are needed. Progress is saved in the browser (`localStorage`). `vercel.json` holds the single-page-app rewrite used for hosting.

### Windows note

If Windows blocks Rollup's native module ("blocked by Application Control policy"), use the WebAssembly build for your local install only:

```bash
npm pkg set overrides.rollup=npm:@rollup/wasm-node@^4
```

Then delete `node_modules` and `package-lock.json` and run `npm install` again.

## Licence

[MIT](LICENSE). Third-party libraries keep their own licences (see `package.json`).
