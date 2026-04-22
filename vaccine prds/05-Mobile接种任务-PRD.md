# Mobile 接种任务 PRD（最新实现）

## 1. Stakeholders, Context & Objectives
- **Navigation Context**
  - Mobile 接种任务必须放在全局 `Mobile` 模式下展示。
  - Mobile 模式不使用侧边栏管理业务功能；右侧固定进入任务首页，通过首页任务卡点击进入接种任务。
  - 右侧使用线框屏幕预览，不展示具体机型外观。Mobile 模式侧边栏仅保留 Console/Mobile 切换，不展示业务菜单。
  - Console 模式不展示 Mobile 接种入口。
- **Roles**
  - `现场接种员`：按栏位批量选择猪只并执行。
  - `后端规则引擎`：返回豁免命中结果。
- **Goals**
  - 列表按栏位分组，支持同栏位多猪批量操作。
  - 仅保留批量主流程（接种 / 移出接种列表）。

## 2. Process Visualization
- **Business Flow**
  1. Mobile 首页展示状态栏、Section Selector、总览/单元 Tab、概览统计和任务卡。
  2. Hub 任务卡整卡点击进入（总览模式先选单元）。
  3. 进入任务页后按栏位分组查看猪只，支持组内全选与多选。
  4. 底部批量栏执行：
     - `接种`（直接执行，无确认）；
     - `移出接种列表`（二次确认）。
- **System Flow**
  - 任务卡标题同行右侧显示 `已下发 X 天`（由 `dispatchedAt` 计算）。
  - 后端返回 `exemptionHit`，前端展示标识与状态色，不做规则判定。

## 3. Detailed Specifications
### 3.1 Logic Matrix
| Module | Frontend Interaction/UI Logic | Backend Processing/Calculation |
|---|---|---|
| 首页任务卡 | 接种卡标题固定展示“接种任务”，标题同行右侧展示下发状态，摘要承载批次/疫苗信息，进度和进入提示分区展示；不额外展示“接种任务”类型标签，不得隐藏核心信息 | `dispatchedAt -> 天数`，`done/total -> progress` |
| 疫苗任务页 | 二级页面展示 Apple 风格状态栏、返回/本间完成操作、免疫任务/任务详情 Tab；单元进度、目标列表、任务详情均使用大圆角轻阴影卡片，搜索/筛选/视图切换同一行，底部操作使用轻量绿色主按钮 | `unit.done/unit.total -> unitPct`，按猪只状态聚合 `pending/completed/skipped/deferred` |
| 房间抽屉 | 车间分组 + 全部单元分布视图 | 返回 roomPending 聚合 |
| Mobile 首页非接种入口 | 首页新增“断奶检查”任务入口卡，展示生产线/批次、天数状态、已检查/需检查进度；不展示按钮，点击卡片打开选择房间底部抽屉后进入检查执行页；执行页按“顶部返回/居中标题、胶囊 Tab、单元进度卡、搜索筛选工具栏、按栏位分组列表卡”的结构展示 | 后端后续需返回任务类型、批次、状态天数、已检查数、目标数、数量单位（断奶检查=栏） |
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
  - 所有弹层仍需挂载在 Mobile 线框屏幕容器内。
  - 批量操作需防重入。
  - Mobile 页面字号、行间距、触控高度与配色需遵循 `docs/MOBILE_FIELD_LAYOUT.md`；接种页以绿色主行动、白底次行动、深色导航/文字和低饱和浅底为当前基准；避免大面积黑色按钮。
- **Error Handling**
  - 批量失败时保留当前选择并提示失败原因。  
