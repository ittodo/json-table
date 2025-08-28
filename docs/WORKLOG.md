# Worklog / Progress (JsonTable)

Date: 2025-08-28

Summary
- Initialized standalone repo for JsonTable (embeddable JSON ↔ Table widget).
- Scaffolded Vite + TypeScript library (UMD global: `JsonTable`).
- Implemented core utilities: schema scan, dynamic header build, flatten/unflatten, CSV exporter, simple validators.
- Added unit tests (Vitest, jsdom) and GitHub Actions CI + Pages workflows.
- Created demo page with header/CSV generation UI; added local preview script.

Repository
- Path (local): D:\\rust\\json-table
- Remote: git@github.com:ittodo/json-table.git
- Branch: main

Scaffolding
- Vite library mode (UMD/ES output): `vite.config.ts`
- TypeScript configs: `tsconfig*.json`
- Package scripts:
  - `dev`: Vite dev server (open /demo/index.html)
  - `build`: library build → `dist/`
  - `build:demo`: demo build → `dist-demo/`
  - `preview`: Vite preview (default dist; for library)
  - `preview:demo`: build demo and serve `dist-demo/` via `node scripts/serve-demo.mjs`

Core Modules (src/core)
- `schema.ts`
  - `scanSchema(json)`: prototype header with [0] placeholders + listMaxes per root
  - `buildHeader(proto, listMaxes)`: expand [0] → [0..K-1]
  - `parsePath(col)`: tokenize `root[i].tail`
- `flatten.ts`
  - `buildDynamicHeaderFromJson(json)`: convenience to scan + build
  - `flattenToRow(obj, header)`: values → strings (invariant)
  - `unflattenFromRow(header, row, gap)`: reconstruct JSON; robust `setAt` implementation
- `export.ts`
  - `toCsv(header, rows, opts)`: CSV compose with escaping and newline
- `validate.ts`
  - `required`, `oneOf` (stubs for future validators)

Demo (demo/)
- `index.html`: toolbar (Generate Header / Generate CSV), output panels
- `main.ts`: uses `JsonTable.init`, `Flatten.buildDynamicHeaderFromJson`, `Flatten.flattenToRow`, `Csv.toCsv`
- Local preview:
  - `npm run preview:demo` → builds demo then serves at `http://localhost:5179`

Tests
- `src/index.test.ts`: `init` API basic mounting
- `src/core/flatten.test.ts`: header build → flatten → unflatten roundtrip
- Command: `npm test`

CI / Pages
- `.github/workflows/ci.yml`: lint → typecheck → test → build → build:demo; uploads `demo` and `coverage` artifacts.
- `.github/workflows/pages.yml`: deploy `dist-demo` to GitHub Pages (enable Pages: Settings → Pages → Source: Actions)
- README badges: CI status, Demo link (https://ittodo.github.io/json-table/)

Issues Resolved
- npm ci failure: added `package-lock.json` and aligned eslint (^8.57.0) with typescript-eslint@7.
- Vitest path resolution: fixed import path in `flatten.test.ts` to `../index`.
- Unflatten bug: `setAt` now handles key/index segments safely (no writing into primitives).
- Demo build PostCSS discovery errors: provided empty PostCSS config and explicit `css.postcss` in Vite; added `demo/postcss.config.cjs`.
- Vite preview path: added `preview:demo` script with a small static server for `dist-demo`.

How to Run Locally
1) `npm install`
2) Dev server: `npm run dev` → open http://localhost:5173/demo/index.html
3) Demo build + preview: `npm run preview:demo` → open http://localhost:5179
4) Library build: `npm run build` → files in `dist/`

Next Steps
- Demo: add GapMode toggle (Break/Sparse), fixed-K option, CSV download button.
- Core: formatters/parsers hooks, enum mapping support, more validators.
- Docs: expand README with API and examples.
- CI: add release workflow (npm publish) and automate Pages config.

Notes
- GitHub Pages requires enabling in repo Settings → Pages → Source = GitHub Actions.
- The demo uses a minimal static server for consistent local preview across environments.
