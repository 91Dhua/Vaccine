# 疫苗管理 PRD（主数据中心）

## 1. Stakeholders, Context & Objectives

- **Roles**
  - `免疫管理员`：维护疫苗类目与品牌主数据。
  - `计划配置人员`：在普免/跟批计划中消费主数据。
  - `任务调度系统`：下发接种任务时固化品牌快照。
  - `Mobile 执行系统`：消费品牌快照进行现场提示（含免疫间隔期）。
- **Background**
  - 疫苗管理是全链路上游数据源，影响计划配置联动、任务字段补全、Mobile 风险提示。
- **Goals**
  - 主数据一次维护，多模块复用。
  - 品牌字段覆盖“接种方式/剂量/单位/免疫间隔期”等执行关键参数。
  - 历史计划与历史任务必须使用快照，不受后续主数据修改影响。

## 2. Process Visualization (The Logic Gates)

- **Business Flow**
  1. 创建疫苗类目：`中文名`、`英文名`、`目标抗体`。
  2. 在类目下新增品牌：品牌参数完整维护。
  3. 计划页选择疫苗后加载品牌列表；选择品牌触发自动填充。
  4. 任务下发时将品牌参数写入任务快照，Mobile 直接消费。
- **System Flow**
  - `GET /vaccine-categories`：返回类目与品牌。
  - `POST/PUT /vaccine-categories/:id/brands`：创建/修改品牌配置。
  - If 计划/任务引用品牌 -> 下游保存快照，不回查实时主数据。

## 3. Detailed Specifications (最新口径)

### 3.1 Logic Matrix


| Module    | Frontend Interaction/UI Logic              | Backend Processing/Calculation  |
| --------- | ------------------------------------------ | ------------------------------- |
| 疫苗类目列表    | 展示顺序：中文名、英文名、目标抗体（目标抗体列位于英文名右侧）；支持新增/编辑/删除 | 维护 `vaccineId` 唯一性；建议软删除        |
| 品牌展开表格    | 展示剂型、单次剂量、免疫有效期、休药期、免疫间隔期、接种途径、疫苗类型        | 返回品牌完整配置                        |
| 品牌新增/编辑弹窗 | 表单项完整；保存后即时刷新表格                            | 校验数值字段（>=0）与枚举字段合法              |
| 计划联动      | 计划页根据 `vaccineId` 查询 `brandNameCn` 列表      | 提供 `vaccineId -> brands[]` 快速查询 |
| 任务联动      | 任务创建时按 `vaccine + brand` 解析品牌参数            | 写入任务快照，避免后续主数据漂移                |
| 豁免规则关系    | Console 不再配置豁免规则                           | 后端按硬编码规则执行，主数据仍提供判定参考（如疫苗干扰期）   |


### 3.2 Data Dictionary


| Field Name                | Type            | Required | Validation/Enums           | Default Value |
| ------------------------- | --------------- | -------- | -------------------------- | ------------- |
| `VaccineCategory.id`      | string          | Y        | 唯一                         | 服务端生成         |
| `vaccineId`               | string          | Y        | 业务编码唯一                     | 服务端生成         |
| `nameCn`                  | string          | Y        | 1-50 字符                    | 无             |
| `nameEn`                  | string          | Y        | 1-100 字符                   | 无             |
| `targetAntibody`          | string          | Y        | 非空                         | 无             |
| `referenceType`           | enum            | N        | `日龄/生产状态`                  | null          |
| `statusType`              | string          | N        | referenceType=生产状态时可填      | null          |
| `minValue/maxValue`       | number          | N        | `min<=max`                 | null          |
| `Brand.id`                | string          | Y        | 唯一                         | 服务端生成         |
| `brandNameCn/brandNameEn` | string          | Y        | 非空                         | 无             |
| `dosageForm`              | enum            | N        | `活疫苗（冻干苗）/油佐剂灭活疫苗/水佐剂灭活疫苗` | null          |
| `standardDosage`          | string          | N        | 建议格式 `2 ml/头`              | null          |
| `durationOfImmunity`      | string          | N        | 说明型文本                      | null          |
| `withdrawalPeriodDays`    | number          | N        | >=0                        | null          |
| `immuneIntervalDays`      | number          | N        | >=0，整数                     | null          |
| `administrationRoutes`    | string[]        | N        | `IM/SC/滴鼻/饮水/喷雾`           | []            |
| `targetPathogen`          | enum            | N        | `病毒性/细菌性/寄生虫`              | null          |
| `updatedAt/updatedBy`     | datetime/string | Y        | 审计字段                       | 服务端写入         |


### 3.3 State Machine (Mandatory)

- **States**
  - `ACTIVE`：可被计划与任务引用。
  - `ARCHIVED`：不可新引用，仅供历史回溯。
- **Transition Rules**
  - `ACTIVE + 归档 = ARCHIVED`
  - `ARCHIVED + 恢复 = ACTIVE`
  - `ACTIVE + 删除` 必须等价为 `ARCHIVED`（不得物理删除已引用数据）。

### 3.4 UX Narrative

- As a user, I must configure brand once and let plans/tasks auto-fill execution fields.
- As a user, I shall still edit auto-filled fields later in计划或任务中。

## 4. Robustness & Edge Cases

- **Empty States**
  - 无类目：显示空态 + “添加疫苗”按钮。
  - 类目下无品牌：展开区域显示空态 + “添加品牌”按钮。
- **Constraints**
  - 被计划/任务引用的品牌不得硬删除。
  - `standardDosage` 解析失败时，下游自动填充仅填可识别字段，其余保持用户手输。
  - 母源抗体干扰等后端规则需要读取疫苗主数据参数时，必须有版本追踪。
- **Error Handling**
  - 保存失败不关闭弹窗，保留用户输入并标注错误字段。
  - 并发更新冲突返回版本错误，前端提示“数据已更新，请刷新重试”。