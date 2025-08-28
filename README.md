# JsonTable

Embeddable JSON ↔ Table widget. Toggle and edit data in JSON or a table (grid) view with dynamic list expansion (K), reversible transforms, and header‑indexed parsing.

- Name: JsonTable (UMD global: `JsonTable`)
- Purpose: JSON ↔ Table bidirectional editing with flatten/unflatten + dynamic K for lists
- Status: Proposal + initial scaffold

## Highlights
- Dynamic K list expansion from headers/data; GapMode: Break/Sparse
- Reversible transforms (flatten/unflatten) with enum mapping, formatters/parsers
- Header‑indexed read API for fast parsing; CSV export with dynamic headers

## Docs
See `docs/proposal.md` for the full proposal (architecture, API, CI/CD, next steps).

## Next Steps
- Scaffold Vite + TypeScript library (`src/`, `demo/`)
- Implement core modules: schema infer, flatten, unflatten, validators, exporters
- CI (lint/typecheck/test/build) and Pages demo deploy

## What are Vite and TypeScript?
- TypeScript (TS): JavaScript with types. It compiles to plain JavaScript but catches many errors early and improves tooling.
- Vite: a fast web build tool and dev server. It runs a local preview (`npm run dev`) and builds optimized bundles for production (`npm run build`).

You don’t need deep web knowledge to consume the widget. We’ll ship a single UMD file you can drop into any page and use via a global `JsonTable.init(...)` API.

