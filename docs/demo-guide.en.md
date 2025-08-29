# JsonTable Demo Guide (EN)

This guide explains how to use the demo app (./demo) to try and validate the JSON ↔ CSV/Table workflow.

## Quick Start
- Install: `npm install`
- Dev server: `npm run dev` → open `http://localhost:5173/demo/index.html`
- Build + preview: `npm run preview:demo` → `http://localhost:5179`

## UI Overview
- JSON Editor: Left textarea from `init(..., { initialJson })`.
- Header Panel: Right textarea; 1 line = 1 column. Height syncs to the JSON editor.
- Controls: Generate Header / Generate CSV / Upload CSV / Download CSV + options (List Strategy, Fixed K, Gap Mode).
- CSV Preview (Table): Renders header/rows; cells are editable via an overlay input.

## Main Controls
- Generate Header
  - Builds header via `Flatten.buildHeaderFromJson(json, { listStrategy, fixedListMax })`.
  - Adds +1 index per list group (e.g., if `items[0..N]` exist, also add `items[N+1]`).
  - Merges some roots from previous header for continuity.

- Generate CSV
  - Flattens current JSON with the header and renders the table.
  - Always keeps a trailing blank row for quick data entry.

- Upload CSV
  - Parses CSV using `Csv.parseCsvText` (papaparse-based).
  - First row becomes header; list groups receive +1 extra index.
  - Rows are normalized to header width and immediately reflected to JSON (unflatten).

- Download CSV
  - Generates CSV from current JSON and header/rows.
  - Options include BOM and CRLF for compatibility.

## Options
- List Strategy
  - `dynamic`: Create list columns for detected indices only (data-driven).
  - `fixed`: Always create a fixed number (`Fixed K`) of list columns.
- Fixed K
  - With `fixed`, sets max index K−1 (e.g., K=3 → `items[0..2]`).
- Gap Mode
  - `break`: Stop at the first empty index when unflattening (contiguous items only).
  - `sparse`: Preserve indices even with gaps (sparse arrays).

## Table Editing
- Start editing with click/Enter/F2 → an overlay input appears.
- Navigation: Arrow keys, Tab/Shift+Tab, Enter (next row). Active column is highlighted.
- On commit, JSON updates immediately; if the last row is filled, a new blank row is added.

## Header Editing
- Edit paths in the Header panel (1 line = 1 column). Blank lines get placeholders.
- Table header cells are also editable; changes reflect back to the panel.

## Path Rules (Brief)
- Examples: `items[0].id`, `user.name`, `stats.hp`.
- Arrays expand as `root[i].tail`. The demo adds +1 index per list group for easier insertion.

## Sample CSV
- See `demo/sample.csv` with quoting/comma examples.
- Use Upload CSV to load it and verify table ↔ JSON sync.

## Troubleshooting
- Last-row clipping: the demo applies min cell height / overlay alignment / scroll reserve; tweak CSS if your environment differs.
- Delimiter: papaparse auto-detects; you can override `sep` if needed.
- Width mismatch: rows are trimmed/padded to header length after upload.

## Public API (Brief)
- `Flatten.buildHeaderFromJson(json, { listStrategy, fixedListMax })`
- `Flatten.flattenToRow(object, header)` / `Flatten.unflattenFromRow(header, row, gapMode)`
- `Csv.toCsv(header, rows, { sep, bom, newline })`
- `Csv.parseCsvText(text, { sep, hasHeader, skipEmptyLines })`
- `init(container, options).getCsv(opts)`

## Notes / Roadmap
- Future: virtual scroll & worker parsing for large CSVs, multi-cell paste, column type formatters/parsers/validators UI.
