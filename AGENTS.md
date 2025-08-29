# Repository Guidelines

## Project Structure & Module Organization
- `src/`: Library code. Entry `src/index.ts` (UMD global `JsonTable`); core modules in `src/core/` (`schema.ts`, `flatten.ts`, `export.ts`, `validate.ts`).
- Tests: colocated `*.test.ts` files (e.g., `src/core/flatten.test.ts`, `src/index.test.ts`).
- `demo/`: Sample app (`index.html`, `main.ts`). Built output lives in `demo/dist-demo/`.
- `scripts/`: Helpers (e.g., `scripts/serve-demo.mjs` static server for demo builds).
- `docs/`: Project notes (`WORKLOG.md`, `proposal.md`).

## Build, Test, and Development Commands
- `npm run dev`: Start Vite dev server; open `http://localhost:5173/demo/index.html`.
- `npm test`: Run unit tests with Vitest (jsdom environment).
- `npm run build`: Build library (ESM/UMD) to `dist/` and emit types.
- `npm run build:demo`: Build demo to `demo/dist-demo/` (GitHub Pages base configured).
- `npm run preview:demo`: Build demo and serve at `http://localhost:5179`.

## Coding Style & Naming Conventions
- Language: TypeScript. Indent 2 spaces. Current codebase uses no semicolons.
- Linting/Types: `eslint` + `@typescript-eslint`, and `tsc --noEmit` (`npm run lint`, `npm run typecheck`).
- Names: PascalCase for types/interfaces, camelCase for variables/functions, kebab-case for config files.

## Testing Guidelines
- Framework: Vitest with jsdom.
- Location/Pattern: colocated `*.test.ts` next to source (e.g., `src/core/flatten.test.ts`).
- What to test: header inference (dynamic/fixed), flatten/unflatten round-trips, CSV escaping.
- Run: `npm test`. Keep tests deterministic and fast.

## Commit & Pull Request Guidelines
- Commits: follow Conventional Commits (e.g., `feat(core): add fixed-K header`, `fix(demo): 404 on preview`).
- PRs: include description, linked issues, reproduction steps; attach screenshots/GIFs for demo/UI changes.
- CI: ensure `lint`, `typecheck`, `test`, and builds pass locally before opening a PR.

## Security & Configuration Tips
- Node 18+ recommended (Vite 5). Commit lockfile changes. Minimal PostCSS config is provided.
- Demo hosting: enable GitHub Pages via Actions; demo build output is `demo/dist-demo/`.

## Agent-Specific Instructions
- Make focused, minimal changes aligned with existing patterns.
- Update docs (`README`, `WORKLOG`) and demo when adding user-facing features.
- Validate with `npm test` and `npm run build:demo` before submitting.

