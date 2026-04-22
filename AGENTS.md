# Repository Guidelines

## Project Structure & Module Organization
`src/` contains the Vite app entry points (`main.tsx`, `App.tsx`), shared utilities, mock data, and feature screens. Most UI lives in `src/components/`, with feature subfolders such as `src/components/culling/` and `src/components/replacement/`; keep related `.tsx`, `.css`, `types.ts`, and fixture files together. Use `docs/` for implementation notes, and keep product requirements in `prds/` or `vaccine prds/`. Treat `dist/` as generated build output, not source.

## Build, Test, and Development Commands
Run `npm install` once to install dependencies. Use `npm run dev` to start the local Vite server on port `5173`. Use `npm run build` to run TypeScript compilation (`tsc -b`) and produce a production bundle. Use `npm run preview` to serve the built app locally for final checks.

## Coding Style & Naming Conventions
This codebase uses React 18, TypeScript, and Ant Design with strict TypeScript settings enabled in `tsconfig.json`. Match the existing style: functional components, 2-space indentation, double quotes, and semicolons. Name React components and page files in PascalCase, utility modules in camelCase, and shared type files as `types.ts` or feature-specific `*Types.ts` only when needed. Keep feature logic close to the UI that uses it, and prefer small helper functions over deeply nested JSX branches.

## Testing Guidelines
There is no automated test runner configured yet. Until one is added, `npm run build` is the required validation step, and UI-heavy changes should also be verified manually in `npm run dev`. When adding tests, place them next to the feature they cover as `*.test.ts` or `*.test.tsx`, and focus first on scheduling logic, task flows, and data transformation helpers.

## Commit & Pull Request Guidelines
Recent commits use short, imperative summaries such as `Add culling and replacement workflows` and `Enhance Vaccine Catalog and Plan functionality...`. Follow that pattern: lead with the behavior change, keep the subject line concise, and avoid generic messages like `update files`. Pull requests should include a short problem statement, the main user-visible changes, manual verification steps, and screenshots or recordings for UI changes. Link the relevant PRD or issue when the change implements a documented workflow.

## Configuration Notes
Do not hand-edit generated artifacts in `dist/` or `tsconfig.tsbuildinfo`. If you change build behavior, document it in `README.md` or `docs/` and verify the production bundle still builds cleanly.
