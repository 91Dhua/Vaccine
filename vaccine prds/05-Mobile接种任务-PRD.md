# Mobile 接种任务 PRD（最新实现）

## 1. Stakeholders, Context & Objectives
- **Roles**
  - `现场接种员`：按栏位批量选择猪只并执行。
  - `后端规则引擎`：返回豁免命中结果。
- **Goals**
  - 列表按栏位分组，支持同栏位多猪批量操作。
  - 仅保留批量主流程（接种 / 移出接种列表）。

## 2. Process Visualization
- **Business Flow**
  1. Hub 任务卡整卡点击进入（车间模式先选单元）。
  2. 进入任务页后按栏位分组查看猪只，支持组内全选与多选。
  3. 底部批量栏执行：
     - `接种`（直接执行，无确认）；
     - `移出接种列表`（二次确认）。
- **System Flow**
  - 任务卡右上角显示 `已下发：X天`（由 `dispatchedAt` 计算）。
  - 后端返回 `exemptionHit`，前端展示标识与状态色，不做规则判定。

## 3. Detailed Specifications
### 3.1 Logic Matrix
| Module | Frontend Interaction/UI Logic | Backend Processing/Calculation |
|---|---|---|
| 首页任务卡 | 展示 `已下发：xx天` 亮色角标 | `dispatchedAt -> 天数` |
| 房间抽屉 | 车间分组 + 全部单元分布视图 | 返回 roomPending 聚合 |
| 目标列表 | 按 `stallNo` 分组；耳标第一行，第二行“猪只类型｜任务状态｜日龄”；右侧复选框同列 | 返回 `stallNo/dayAge/status` |
| 批量接种 | 点击即批量完成（无确认） | 批量状态更新 completed |
| 批量移出 | 有确认弹窗 | 删除选中猪只任务 |
| 状态颜色 | 待接种/已接种/已跳过/已暂缓/延期使用不同颜色 | 返回状态即可 |
| 单元进度卡 | 信息不减前提下紧凑化，图标chip展示品牌/剂型/接种方式/剂量 | 返回任务快照字段 |

### 3.2 Data Dictionary
| Field Name | Type | Required | Validation/Enums | Default |
|---|---|---|---|---|
| `dispatchedAt` | string | Y | 来源任务创建时间 | - |
| `dispatchedDays` | number | N | >=0 | 计算值 |
| `stallNo` | string | Y | 分组键 | - |
| `dayAge` | number | N | >=0 | null |
| `status` | enum | Y | `pending/in_progress/completed/skipped/suspended` | `pending` |
| `exemptionHit` | boolean | Y | 风险标记 | false |

### 3.3 State Machine
- `PENDING -> COMPLETED`（单头或批量接种）
- `PENDING -> REMOVED`（移出接种列表）
- `PENDING -> SKIPPED/SUSPENDED`（历史兼容状态保留）

### 3.4 Interval Warning Copy
- `{耳标号} 距离上次接种“{上次疫苗名}”（{上次接种日期}）未满{免疫间隔天数}天...`

## 4. Edge Cases
- **Empty**：无匹配猪只显示空态。
- **Constraints**
  - 所有弹层仍需挂载在手机模拟容器内。
  - 批量操作需防重入。
- **Error Handling**
  - 批量失败时保留当前选择并提示失败原因。  
