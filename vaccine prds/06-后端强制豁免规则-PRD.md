# 后端强制豁免规则 PRD

## 1. Stakeholders, Context & Objectives
- **Roles**
  - `后端规则引擎`：按固定规则实时判定豁免命中。
  - `Console 计划配置用户`：不再配置豁免规则，仅配置计划主信息。
  - `Mobile 执行人员`：接收命中提示，并决定是否接种。
- **Background**
  - 现有前端可配置豁免规则导致规则口径不统一，场区间执行差异大。
- **Goals**
  - 豁免规则必须由后端统一写死并版本化管理。
  - Console 不展示豁免规则配置入口与详情。
  - Mobile 继续提示命中状态，接种决策仍由现场执行人确认。

## 2. Process Visualization (The Logic Gates)
- **Business Flow**
  1. 用户在 Console 创建/编辑普免或跟批计划，不再配置豁免规则。
  2. 后端在任务下发与执行阶段按固定规则判定每头猪是否命中豁免。
  3. Mobile 列表显示命中标识，抽屉显示命中提示文案。
  4. 现场人员可选择继续接种或移出/其他操作（按当前业务流）。
- **System Flow**
  - `计划保存`：前端提交 `exemptions=[]` 或忽略该字段。
  - `任务生成`：后端对每头猪执行规则计算，输出 `exemptionHit` 与命中文案。
  - `Mobile 查询`：返回命中结果与规则标签，前端仅渲染，不做规则判断。
  - `执行提交`：若命中豁免但仍接种，后端记录“人工覆盖执行”日志。

## 3. Detailed Specifications (Deep Granularity)
### 3.1 Logic Matrix
| Module | Frontend Interaction/UI Logic | Backend Processing/Calculation |
|---|---|---|
| Console 计划页 | 不展示“豁免规则”表单项 | 忽略前端豁免配置，统一使用后端规则 |
| Console 列表/预览 | 不展示“豁免规则”列与预览字段 | 可内部存储 `exclusion=后端强制规则` |
| 任务下发 | 前端仅传计划与猪只范围 | 后端逐头计算命中与原因 |
| Mobile 列表 | 命中显示风险标识（红色感叹号） | 返回 `exemptionHit` 布尔值 |
| Mobile 抽屉 | 显示命中提示文案，执行是否继续由用户决定 | 返回命中规则标签与时间窗口信息 |

### 3.2 Data Dictionary
| Field Name | Type | Required | Validation/Enums | Default Value |
|---|---|---|---|---|
| `exemptions` (计划请求) | array | N | 前端固定空数组 | `[]` |
| `exclusion` (计划展示快照) | string | N | 常量文案 | `后端强制规则` |
| `exemptionHit` | boolean | Y | `true/false` | `false` |
| `exemptionTagLabel` | string | N | 命中时返回说明 | `null` |
| `exemptionRuleCode` | string | N | 固定规则编码 | `null` |
| `ruleVersion` | string | Y | 规则版本号 | 当前生效版本 |
| `evaluatedAt` | datetime | Y | 判定时间 | 服务端生成 |

### 3.3 Fixed Rule Set (Backend Mandatory)
后端必须强制内置以下规则（命中任一即 `exemptionHit=true`）：

1. 转群/转舍/合群后 `0-5` 天内  
2. 入场后（外购/转入）`0-7` 天内  
3. 分娩前 `5` 天内  
4. 分娩后 `5` 天内  
5. 配种前 `3` 天内  
6. 配种后 `7` 天内  
7. 当前处于疾病状态（发病/异常状态期间）  
8. 距离上一次疫苗接种不足 `7` 天  
9. 断奶后 `0-5` 天内  
10. 去势/断尾/剪牙等操作后 `0-3` 天内  
11. 运输后 `0-3` 天内  
12. 换料后 `0-3` 天内  
13. 出生后 `0-3` 天内  
14. 母源抗体干扰阶段（常见 `21-35` 日龄，具体以疫苗配置为准）  
15. 围产期整体窗口：分娩前后 `7` 天内  

### 3.4 State Machine (Mandatory)
- **States**
  - `ELIGIBLE`：未命中任何豁免规则。
  - `EXEMPT_HIT`：命中至少一条豁免规则。
  - `OVERRIDDEN_AND_VACCINATED`：命中后仍被人工确认接种。
- **Transition Rules**
  - `ELIGIBLE + 规则命中 = EXEMPT_HIT`
  - `EXEMPT_HIT + 现场确认仍接种 = OVERRIDDEN_AND_VACCINATED`
  - `EXEMPT_HIT + 不执行接种 = EXEMPT_HIT`（维持待处理或移出）

### 3.5 UX Narrative
- As a user, I shall not configure exemption rules in Console anymore.
- As a user, I must still see clear exemption warnings in Mobile before deciding.

## 4. Robustness & Edge Cases
- **Empty States**
  - 猪只缺少关键事件时间时，该条规则判定为“无法计算”，系统继续评估其他规则。
- **Constraints**
  - 后端规则集必须支持版本号与生效时间，确保历史任务可追溯。
  - 同一头猪多规则命中时，返回主规则 + 命中规则列表（建议）。
- **Error Handling**
  - 规则引擎异常时，任务返回需降级：`exemptionHit=false` 并记录告警日志，不阻断任务下发。
  - 时间字段脏数据时，需记录 `rule_eval_error`，不可静默吞错。
