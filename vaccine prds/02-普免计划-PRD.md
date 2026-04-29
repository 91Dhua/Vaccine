# 普免计划 PRD（最新实现）

## 1. Stakeholders, Context & Objectives

- **Roles**
  - `免疫管理员`：维护普免计划与重复规则。
  - `调度服务`：按日期规则展开任务。
  - `后端规则引擎`：统一执行豁免强制规则。
- **Goals**
  - 前端保留日期与疫苗配置能力，豁免规则由后端接管。
  - 重复规则与手动日期互斥且可预览。

## 2. Process Visualization

- **Business Flow**
  1. 配置目标群、接种字段（接种方式->疫苗->品牌->剂量）。
  2. 设置首次日期与重复策略（预设+参数）。
  3. 配置免疫复核并预览提交。
- **System Flow**
  - `scheduleRepeatEnabled=false` 仅保存手动日期。
  - `scheduleRepeatEnabled=true` 保存 recurrence。
  - `exemptions` 前端固定空；后端按硬编码规则判定。

## 3. Detailed Specifications

### 3.1 Logic Matrix


| Module | Frontend Interaction/UI Logic | Backend Processing/Calculation |
| ------ | ----------------------------- | ------------------------------ |
| 日期配置   | 手动日期与重复模式切换，展示规则摘要/年度预览       | recurrence 展开并持久化              |
| 疫苗联动   | 品牌回填接种方式/剂量/单位，可手改            | 保存最终值                          |
| 免疫复核   | 目标抗体只读；采样字段按新布局展示             | 保存复核快照                         |
| 豁免规则   | Console 不展示                   | 后端统一规则                         |
| 列表     | 展示计划主字段、效果追踪、启停               | 返回快照与锁状态                       |


### 3.2 Data Dictionary


| Field Name                            | Type        | Required | Validation/Enums | Default |
| ------------------------------------- | ----------- | -------- | ---------------- | ------- |
| `scheduleRepeatEnabled`               | boolean     | Y        | -                | false   |
| `scheduleDates`                       | string[]    | 条件必填     | `MM-DD`          | []      |
| `scheduleRecurrence`                  | object|null | 条件必填     | 开启重复时必填          | null    |
| `vaccineId/vaccineBrand`              | string      | Y        | 非空               | -       |
| `vaccinationMethod/dosage/dosageUnit` | mixed       | Y        | 合法值              | 品牌联动    |
| `effectTracking`*                     | object      | N        | 开启时必填            | 关闭      |
| `exemptions`                          | object[]    | N        | 前端固定空            | `[]`    |


### 3.3 State Machine

- `DRAFT -> ACTIVE -> INACTIVE`
- 已下发/部分执行状态下禁用受限（同跟批计划）。

## 4. Edge Cases

- recurrence 展开失败需降级回手动日期并提示。
- 保存失败保留草稿，字段级报错。