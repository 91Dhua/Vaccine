# 跟批免疫计划 PRD（最新实现）

## 1. Stakeholders, Context & Objectives

- **Roles**
  - `免疫管理员`：维护跟批计划（创建/编辑/启停）。
  - `调度服务`：按触发规则生成任务。
  - `后端规则引擎`：统一执行豁免硬编码规则（非前端配置）。
- **Goals**
  - 前端仅配置计划核心参数；豁免规则配置入口下线。
  - 计划配置字段与任务下发字段保持一致。

## 2. Process Visualization (The Logic Gates)

- **Business Flow**
  1. 配置计划名、生产线、目标猪群、触发规则。
  2. 配置疫苗链路：接种方式 -> 疫苗 -> 品牌 -> 剂量。
  3. 配置免疫复核并预览提交。
  4. 列表启停，受已下发/部分执行锁限制。
- **System Flow**
  - `vaccineBrand` 变化触发自动回填（接种方式/剂量/单位），允许手改。
  - 计划保存时前端不提交可配置豁免规则（固定 `exemptions=[]`）。
  - 后端按固定规则在任务层判定 `exemptionHit`。

## 3. Detailed Specifications

### 3.1 Logic Matrix


| Module | Frontend Interaction/UI Logic      | Backend Processing/Calculation |
| ------ | ---------------------------------- | ------------------------------ |
| 触发规则   | 支持多条 PRE_START/POST_END/STATUS/AGE | 结构化入库                          |
| 疫苗配置   | 品牌联动回填，可编辑覆盖                       | 保存最终提交值                        |
| 免疫复核   | 目标抗体只读；采样方式在样品容器左侧；三数值同一行          | 保存复核快照                         |
| 豁免规则   | Console 不展示配置项                     | 统一后端硬编码规则                      |
| 启停     | 有下发/进度时受限                          | 锁定校验                           |


### 3.2 Data Dictionary


| Field Name               | Type          | Required | Validation/Enums | Default |
| ------------------------ | ------------- | -------- | ---------------- | ------- |
| `dispatches`             | object[]      | Y        | >=1 条            | []      |
| `vaccineId/vaccineBrand` | string        | Y        | 非空               | -       |
| `vaccinationMethod`      | string        | Y        | 方式枚举             | 品牌联动    |
| `dosage/dosageUnit`      | number/string | Y        | >0               | 品牌联动    |
| `effectTracking`*        | object        | N        | 开启时必填            | 关闭      |
| `exemptions`             | object[]      | N        | 前端固定空数组          | `[]`    |


### 3.3 State Machine

- `DRAFT -> ACTIVE -> INACTIVE`
- `ACTIVE + 已下发锁 = ACTIVE`（禁用阻断）
- `ACTIVE + 部分执行 + 确认 = INACTIVE`

## 4. Edge Cases

- 选定疫苗无品牌时，品牌控件禁用并提示维护主数据。
- 保存失败保留草稿；并发冲突提示刷新。

