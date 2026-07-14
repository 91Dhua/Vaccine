# 库存系统代码结构与流程说明

更新时间：2026-07-07

## 1. 当前代码入口

| 文件 | 当前职责 | 备注 |
|---|---|---|
| `src/components/inventory/inventoryData.ts` | 库存类型、分类枚举、物料档案字段配置、mock 数据、入库/出库/盘点/差异/报废/风险/流水工具函数 | 当前职责过重，是库存领域逻辑的实际中心 |
| `src/components/inventory/ConsoleInventoryPage.tsx` | Console 库存首页、入库、出库、库存流水、物料详情、盘点、盘点清单、盘点完成、盘点差异处理、报废抽屉 | 页面状态多，已依赖 `inventoryData.ts` 的领域函数 |
| `src/components/inventory/BatchReceivePanel.tsx` | Console 卡片式批量入库页面 | 复用入库快建和单位换算逻辑 |
| `src/components/inventory/BatchReceiveInlineNewMaterial.tsx` | 入库条目内新建物料的必填/选填档案表单 | 药品属性选择复用 `MaterialProfileFields` |
| `src/components/inventory/MaterialProfileFields.tsx` | 按一级分类、药品属性和药品种类渲染专属字段 | 物料管理和入库快建共用 |
| `src/components/inventory/MobileInventoryToolsPage.tsx` | Mobile 查库存、入库、盘点 | 复用同一套物料、入库、盘点工具函数 |
| `src/components/VaccineCatalogPage.tsx` | 设置中的物料管理 | 复用库存物料模型，不再维护独立药品模型 |
| `src/components/inventory/inventoryUtils.test.ts` | 库存领域回归断言 | 覆盖分类、入库、出库、盘点、差异、风险、财务图表源码约束 |

## 2. 当前分类模型

库存一级分类固定为：

- `饲料`
- `药品`
- `消耗品`
- `工具`
- `其他`

药品类必须继续使用细分属性：

| 字段 | 含义 | 取值 |
|---|---|---|
| `medicineSubtype` | 药品属性 | `疫苗兽药`、`保健品` |
| `medicineKind` | 疫苗兽药下的具体种类 | `疫苗`、`兽药` |

分类展示口径：

- 一级列表、tab、筛选、图表维度使用五个一级分类。
- 药品类在标签或详情中展示为 `药品 · 疫苗兽药` 或 `药品 · 保健品`。
- 当 `medicineSubtype = 疫苗兽药` 时，继续用 `medicineKind` 决定疫苗字段或兽药字段。

## 3. 核心流程

### 3.1 物料档案

```mermaid
flowchart TD
  A[选择一级分类] --> B{是否药品}
  B -->|否| C[按一级分类加载专属字段]
  B -->|是| D[选择药品属性]
  D -->|保健品| E[加载保健品字段]
  D -->|疫苗兽药| F[选择种类]
  F -->|疫苗| G[加载疫苗字段]
  F -->|兽药| H[加载兽药字段]
  C --> I[保存物料档案]
  E --> I
  G --> I
  H --> I
```

关键函数：

- `getMaterialProfileFieldSpecs`
- `isMaterialProfileIncomplete`
- `formatMaterialCategoryLabel`
- `resolveMedicineBaseUnitRecommendations`

### 3.2 入库

```mermaid
flowchart TD
  A[进入入库页] --> B[选择一级分类]
  B --> C[添加一个或多个入库条目]
  C --> D{是否匹配已有物料}
  D -->|已有| E[使用已有物料单位与包装]
  D -->|没有| F[条目内快速新建物料]
  F --> G[补齐品牌和当前分类必填专属字段]
  E --> H[填写数量/单位/到期日/总进货价/供应商]
  G --> H
  H --> I[换算为核算单位]
  I --> J[生成系统批次和采购入库流水]
```

关键函数：

- `createDefaultBatchNewMaterialForm`
- `buildBatchInlineNewMaterialDraft`
- `validateBatchInlineNewMaterial`
- `calculateInventoryBaseQuantity`
- `buildInventoryReceiveEntry`

### 3.3 出库与任务消耗

```mermaid
flowchart TD
  A[出库或业务任务用料] --> B[校验物料和数量]
  B --> C[按 FEFO 排序批次]
  C --> D[逐批次扣减]
  D --> E{批次是否足够}
  E -->|足够| F[生成业务消耗流水]
  E -->|不足| G[差额挂物料级负库存]
  G --> F
```

关键函数：

- `buildInventoryOutboundTransaction`
- `getInventoryLotsForMaterial`
- `formatInventoryQty`

### 3.4 盘点

```mermaid
flowchart TD
  A[点击发起盘点] --> B[库存盘点页展示全部物料]
  B --> C[搜索/分类筛选/异常筛选/排序]
  C --> D[只在有差异的物料填写盘点库存]
  D --> E[提交生成盘点清单]
  E --> F[用户确认变化物料]
  F --> G[生成盘点调整流水并更新库存]
```

关键函数：

- `buildInventoryStocktakeScope`
- `buildInventoryStocktakeTransaction`
- `buildInventoryStocktakeDifferences`

### 3.5 盘点差异处理

```mermaid
flowchart TD
  A[盘点差异] --> B{是否在容差内}
  B -->|是| C[系统自动处理]
  B -->|否| D[进入盘点差异处理]
  D --> E[查看近30天库存变动]
  E --> F[选择处理方式和原因]
  F --> G[系统自动落批次]
  G --> H[生成对应库存流水]
```

关键函数：

- `isInventoryDifferenceWithinTolerance`
- `resolveInventoryToleranceDifferences`
- `buildInventoryDifferenceResolution`

## 4. 当前结构问题

| 问题 | 影响 |
|---|---|
| `inventoryData.ts` 同时包含类型、mock、配置、交易函数和视图辅助函数 | 文件过大，改动容易互相影响，代码评审难定位 |
| Console 页面状态集中在单个 `ConsoleInventoryPage.tsx` | 页面分支多，后续新增库存能力容易继续膨胀 |
| 测试以脚本断言为主，覆盖面广但定位粒度粗 | 适合样机回归，不适合长期模块级单测 |
| 文档曾经历七类到五类口径迁移 | 历史修改日志保留旧口径，当前开发应只看最新 PRD 与本结构说明 |

## 5. 建议的后续拆分边界

优先保持外部 import 兼容，逐步从 `inventoryData.ts` 拆出：

| 建议文件 | 迁移内容 |
|---|---|
| `inventoryTypes.ts` | 所有 `Inventory*` 类型定义 |
| `inventoryCatalog.ts` | 分类、药品属性、专属字段、物料档案校验和展示 |
| `inventorySeedData.ts` | `inventorySeedMaterials`、`inventorySeedLots`、`inventorySeedLedgers`、`inventorySeedDifferences` |
| `inventoryTransactions.ts` | 入库、出库、盘点、差异处理、报废交易函数 |
| `inventoryAnalytics.ts` | 饲料预计可用天数、经营分析、风险项、流水筛选 |
| `inventoryData.ts` | 兼容导出入口，短期只 re-export 以上文件 |

拆分顺序建议：

1. 先拆类型和 mock 数据，不改业务逻辑。
2. 再拆物料档案配置和入库/盘点纯函数。
3. 最后拆 Console 页面，把入库、盘点、差异处理拆成子组件。
