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

## PRD Documentation Format

When creating or updating PRDs for this project, follow the user's preferred mobile task PRD structure. Keep the document product-readable for frontend and backend developers, with clear business logic and implementation implications. Avoid over-indexing on visual styling unless the display logic affects product behavior.

Required PRD sections:

1. `背景`
   - Explain why this feature or change exists.
   - Describe the current business context, existing workflow, and problem being solved.
   - If this is a correction to a previous product direction, state the corrected understanding clearly.

2. `目标`
   - Describe what the feature must achieve from the user's perspective.
   - State what should happen after the user completes the workflow.
   - Include non-goals when they help avoid unnecessary frontend/backend work.

3. `对象`
   - Prioritize user-facing roles, especially `Console 用户` and `Mobile 用户`.
   - The `对象` section should primarily describe who is using the feature, in what scenario, and what decision or operation they are responsible for.
   - Avoid filling this section with business entities such as `批次`、`生产母猪`、`仔猪` unless the user explicitly asks for domain-object breakdown.
   - If business objects must be mentioned, place them inside the relevant feature explanation instead of making them the main focus of the `对象` section.

4. `价值`
   - Explain why the user cares about this feature, not only what the software can do.
   - The `价值` section should primarily speak to user roles and business outcomes, such as reducing missed work, improving batch stability, improving traceability, or making field decisions easier.
   - Do not frame `价值` around what the feature does for frontend or backend developers unless the user explicitly asks for an implementation-facing document.

5. `程序流程图`
   - Describe the system-side process using Mermaid when helpful.
   - Include data creation, status transitions, task generation, result callbacks, and downstream dependencies.
   - Make backend ownership explicit when a step requires data persistence, validation, calculation, or task linkage.

6. `操作流程图`
   - Describe the user-side operation path from entry point to completion.
   - Include Console and Mobile separately when both exist.
   - Identify each point where the user must make a decision.

7. `功能说明`
   - Describe features at fine-grained product detail.
   - Break down each module, button, entry point, jump path, list, status, tag, filter, modal, drawer, validation rule, and result state.
   - For each item, explain the frontend behavior, the backend/business dependency, and what changes after the user operates it.
   - Make button actions, page jumps, visibility conditions, blocking rules, confirmation logic, and downstream effects explicit.
   - For calculations or derived values, include formulas and numeric examples.
   - For lists and task pages, define cards/sections, sorting/filtering, empty states, and result persistence.
   - Do not add a `字段字典` section in PRDs or other product documents by default.
   - Do not invent backend field names just to complete a document; if a data concept must be explained, describe the business meaning and dependency in product language instead of key-by-key mapping.

8. `边际情况 / 异常情况`
   - Add this section whenever the workflow has possible edge cases.
   - Cover empty data, conflicting states, incomplete tasks, user overrides, permission limits, duplicate records, offline or failed submissions, and status rollback behavior.
   - State whether the system blocks, warns, allows submission with risk, or records an exception reason.

Standing PRD rule:

- Whenever code changes alter product logic, task state, data fields, validation, navigation, or display behavior, update the corresponding PRD in the same change.
- If frontend behavior implies backend data or workflow requirements that are not yet logically closed, pause and ask the user for the missing business decision before writing a final PRD.
- The user does not want to see `字段字典` in documentation. Treat field-name mapping tables as unnecessary unless the user explicitly asks for them.

Additional rule for overview PRDs:

- A `业务总览` or other top-level overview PRD should stay at the summary layer.
- It should focus on: `背景`、`目标`、`对象`、`价值`、`程序流程图`、`操作流程图`、`模块拆分`.
- It may additionally include a short `适用范围` or `上下游关系` section if that helps readers understand the overall system boundary.
- Do not place submodule-level details such as status dictionaries, derived-field formulas, field mappings, or detailed edge cases in the overview PRD; those belong in the child module PRDs.
