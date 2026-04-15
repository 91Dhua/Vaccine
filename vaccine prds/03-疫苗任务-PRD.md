# 疫苗任务 PRD（最新实现）

## 1. Stakeholders, Context & Objectives
- **Roles**
  - `调度员`：创建任务与下发。
  - `执行端`：按猪只任务执行。
  - `任务服务`：生成任务ID并拆分猪只明细。
- **Goals**
  - 保持 Console -> Mobile 字段一致。
  - 补齐 Mobile 首页所需“已下发天数”数据基础。

## 2. Process Visualization
- **Business Flow**
  1. 选猪并配置疫苗信息。
  2. 预览提交（无任务名称、无处方备注）。
  3. 生成任务ID，展开猪只任务。
- **System Flow**
  - 任务ID：`VT-XXXX-YYYY`。
  - 快照字段：品牌、剂型、接种途径、剂量、免疫间隔期。
  - `createdAt` 透传到 Mobile 任务 `dispatchedAt` 用于“已下发：X天”。

## 3. Detailed Specifications
### 3.1 Logic Matrix
| Module | Frontend Interaction/UI Logic | Backend Processing/Calculation |
|---|---|---|
| 创建向导 | 字段对齐列表展示；`taskName` 删除 | 仅接收标准任务字段 |
| 任务列表 | 展示任务ID+核心接种字段 | 状态聚合返回 |
| Mobile 下发 | 子任务含 `taskId/batchId` 与快照字段 | 初始化 `pending` |

### 3.2 Data Dictionary
| Field Name | Type | Required | Validation/Enums | Default |
|---|---|---|---|---|
| `id` | string | Y | `VT-` 唯一 | 系统生成 |
| `createdAt` | datetime | Y | 非空 | 系统时间 |
| `dispatchedAt` (Mobile) | string | Y | 来源 `createdAt` | - |
| `vaccine/brand` | string | Y | 非空 | - |
| `dosageForm/administrationRoute` | string | N | 快照 | null |
| `immuneIntervalDays` | number | N | >=0 | null |

### 3.3 State Machine
- `NOT_STARTED -> IN_PROGRESS -> DONE`

## 4. Edge Cases
- 多次提交需幂等保护。
- 主任务与猪只明细保持事务一致。  
