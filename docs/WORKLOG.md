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

---

Date: 2025-08-29

Summary
- Added fixed-K header support via `Flatten.buildHeaderFromJson(json, { listStrategy, fixedListMax })` while keeping `buildDynamicHeaderFromJson` for backward compatibility.
- Updated demo UI: list strategy toggle (dynamic/fixed), fixed K input, and CSV Download button.
- Wired demo to use the new header builder; CSV preview/download reflect chosen strategy.
- Implemented `getCsv` in public API (`init().getCsv`) using core flatten/export pipeline.
- Fixed BOM issues in `package.json` (and ensured PostCSS config loads cleanly) so tests run.

How to Run Locally
1) `npm install`
2) Dev server: `npm run dev` → http://localhost:5173/demo/index.html
3) Demo CSV download uses BOM + CRLF for broad compatibility.
4) Unit tests: `npm test` (now passing).

Next Steps
- Wire GapMode (break/sparse) into unflatten pathways and expose in demo.
- Add validators and enum mapping demos; surface formatters/parsers hooks.
- Expand README with examples including fixed-K and CSV download.
- Add release workflow and Pages automation.

---

Date: 2025-08-29 (Demo UX & CI)

Summary
- Header order: preserved JSON discovery order; fixed list expansion to index-first (items[0].id, items[0].name, ...).
- Demo CSV: rendered as HTML table; editable cells with JSON write‑back; always +1 blank row (auto-add on entry).
- Header editing: editable table headers and a textarea panel (line = column); supports adding new columns (placeholders).
- Navigation: Arrow Up/Down/Left/Right between cells; active column highlight; moved Header panel next to JSON; Bootstrap styling.
- Caret reliability: switched to a single overlay <input> editor for stable caret (Chrome/Windows); Enter/Tab/Arrows navigation.
- Scrolling/overlay: ensure target cell is visible; overlay sized to rect (border-box) with extra headroom to avoid clipping.
- CI/Pages: fixed YAML syntax; unified artifact path to demo/dist-demo; consolidated Pages workflow; successful deploy to https://ittodo.github.io/json-table/.

Next Steps
- Overlay polish: dynamic sizing (replace fixed +100px with smarter fit), IME/mobile, smooth scroll.
- Keyboard: add Shift+Enter/Shift+Tab/Home/End; optional oninput auto-add row.
- Data typing: parsers/formatters (number/bool/date), null/empty semantics; validators, enum mapping examples.
- Persistence: save/restore custom headers; JSON Schema support; grid integration for resize/copy/paste.
- CI/CD: coverage reporting, release workflow (tag→npm publish), Pages triggers for master if needed.

---

Date: 2025-08-29 (CSV Upload, Header Normalization, UX Polish)

Summary
- CSV Upload: added `papaparse` + `Csv.parseCsvText(text, { sep, hasHeader, skipEmptyLines })`; file input in demo to load CSV → header/rows/JSON 업데이트.
- Header normalization: generic subtree handling for any `.prop[<n>]` tails (no hardcoded keys). Ensures per-parent (e.g., `items`) ordering as: per-index base cols → union child tails, placed right after each `items[k]` block.
- +1 index expansion: uniform “+1” columns for each list root and immediate child lists (e.g., `items[*]`, `items[*].effects[*]`) so users can add next entries immediately.
- Schema scan fix: `scanSchema` now unions array tails across all elements (not only first) so heterogeneous arrays (e.g., effects vs materials) are included in prototype header.
- Overlay/editor fixes: precise overlay sizing to cell client box; removed bottom padding/margin; added min-height via `.cell-inner` to prevent last row clipping; ensured visible scrolling with reserve.
- Lint/CI: resolved unused/let→const issues; renamed helpers; build now green on Actions.
- Docs: demo guide in EN/KR; refreshed `demo/sample.json` with realistic fields (effects/materials); added `demo/sample.csv`.
- UI polish: vertical column separators in CSV preview for better legibility.

How to Use
1) Upload CSV: first row as header → union/normalize columns → last blank row auto-added → JSON sync via unflatten.
2) Generate Header/CSV: from JSON (dynamic/fixed K) → per-parent ordering normalized; +1 indices applied.
3) Download CSV: BOM + CRLF for compatibility.

Notes
- Normalization order matters: run +1 expansion first, then normalize subtrees so new indices receive child tails and are placed correctly.
- Generic subtree detection: any tail containing `.[name][index]` is considered a child list subtree.

Next Steps
- Optionally expose child subtree normalization keys or parent filters via UI (advanced usage).
- Add delimiter selector and "no header" toggle in demo.
