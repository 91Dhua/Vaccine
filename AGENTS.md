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
- Maintain strict display-source consistency: if the user does not fill or configure a value in the corresponding create/edit flow, do not surface that value later in the related preview, list, detail, or task-result views unless the user has explicitly asked for a derived/system-generated field.

Additional rule for overview PRDs:

- A `业务总览` or other top-level overview PRD should stay at the summary layer.
- It should focus on: `背景`、`目标`、`对象`、`价值`、`程序流程图`、`操作流程图`、`模块拆分`.
- It may additionally include a short `适用范围` or `上下游关系` section if that helps readers understand the overall system boundary.
- Do not place submodule-level details such as status dictionaries, derived-field formulas, field mappings, or detailed edge cases in the overview PRD; those belong in the child module PRDs.

## 列表表头规范

- 以后涉及列表表头时，默认检查哪些字段需要 `筛选`、哪些字段需要 `排序`，不要只做静态表头。
- `筛选` 适合用于枚举型、分类型、结果型字段，例如状态、类型、判定结果、目标抗体。
- `排序` 适合用于时间、数量、比例、编号、名称等字段。
- `filter` 与 `sort` 的 icon 统一放在字段标题右侧，保持所有列表交互位置一致。
- 做列表时要主动检查：当前表头是否缺少必要的筛选或排序能力，并在实现后自查交互是否一致。
- 表格操作列默认优先使用图标按钮，并用 Tooltip 解释含义；避免多个文字按钮挤在表格右侧影响阅读。

## 字段与状态机复用规范

- 新增或修改列表、详情页、弹窗、任务关联区前，必须先查找对应模块已有的类型定义、mock 数据、PRD 和页面表头，确认字段名和状态口径。
- 不允许为了页面完整度临时编造字段、状态、标签或同义名称；如果现有数据结构没有该字段，页面就不展示，除非用户明确要求新增。
- 同一业务含义必须复用同一字段名称和展示文案；例如已有模块叫 `任务ID`、`接种日期`、`任务状态`，关联页面也应沿用这些名称。
- 状态机必须优先复用业务源模块的状态枚举；例如疫苗任务状态统一使用 `待接种`、`进行中`、`已完成`，不要在计划、复核或详情模块中新增同义状态。
- 跨模块展示关联数据时，以被关联模块为字段和状态的唯一来源；计划详情中的疫苗任务列表应复用疫苗任务模块字段，而不是重新设计一套任务字段。
- 如果确实需要新增字段或状态，必须先说明新增原因、影响范围、与已有字段/状态的区别，并同步更新相关 PRD 后再实现。
- 完成改动后必须搜索旧名称、同义词和临时字段名，确认没有残留导致用户误以为是不同功能或不同状态。

## 模拟数据规则

- 以后只要新增页面、状态流转、关键交互或功能逻辑，都需要同步补充对应的模拟数据，方便用户直接在页面里验证流程。
- 模拟数据至少要覆盖当前功能涉及的主要状态、主要分支和关键异常场景，不能只放一条过于单薄的数据。
- 当用户明确提出“需要几条数据看逻辑”时，默认补充多条可操作样机数据，而不是只口头说明。
- 完成改动后，要自查当前页面是否已经有足够的 mock data 支撑用户验证。

## 命名一致性规范

- 同一个业务概念在全局尽量只使用一个名称；创建页、列表页、详情页、弹窗、导航、PRD 文案都要统一口径。
- 不要在一个地方叫 `免疫复核`、另一个地方叫 `效果追踪` 这类近义但不同名的表达，除非用户明确要求区分两个概念。
- 每次改功能时，要顺手检查相关页面和文档里是否存在旧名称残留，避免用户误以为是两个不同功能。
