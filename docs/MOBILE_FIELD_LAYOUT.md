# 现场 Mobile 布局与 UI 规范

本文档描述 **Vaccine Codex 现场端（Mobile）** 的固定信息架构、视觉语言与实现约定。**后续新增任何 Mobile 现场模块（生产、转舍、巡检等）应遵循同一套布局与 UI 形态**，仅在业务数据与表单字段上扩展。

---

## 1. 设计原则

- **选址优先**：首屏最上方完成 **车间 / 房间** 选址，再展示当前范围内的全部任务。
- **任务聚合首页**：首页列表为 **跨业务类型的任务卡片**（接种、生产、转舍等），用 **Tag 颜色 + 类型标签** 区分。
- **车间 → 房间分流**：当选址为 **车间** 时，需要落到具体栏位执行的任务（如接种）点击后通过 **底部 Drawer** 选择房间，再进入 **猪只/执行对象列表**；选址为 **房间** 时 **省略 Drawer**，直接进入列表。
- **猪只级列表**：列表卡片必须突出 **栏位号、猪只号（耳标）**，次要行为展示任务摘要（名称、计划时间、状态等）。
- **硅谷风移动端**：窄屏容器（`max-width: 420px` 居中）、大圆角卡片、轻阴影、`Plus Jakarta Sans` + 系统中文栈；触控区偏大（按钮 `size="large"`、列表项整块可点）。
- **与 Console 同源**：数据与状态与 Console 共享；现场只做执行与闭环，不在此重复配置复杂规则。

---

## 2. 信息架构（页面层级）

推荐屏幕状态机（可与接种模块一致或类比）：

| 层级 | 说明 |
|------|------|
| **Hub（任务首页）** | 顶部选址 + Tab（如「全部任务」「补打清单」）+ 任务卡片列表 |
| **PigList（对象列表）** | 某任务类型在 **当前房间** 下的明细列表（猪只行） |
| **Detail（详情）** | 单头猪/单条任务的完整信息与操作入口 |
| **Execute（表单）** | 执行记录、强校验后的提交 |
| **History（历史）** | 时间线式执行/异常日志 |

**返回栈**：详情需记录来源（`hub` | `pigList`），返回文案分别为「返回任务首页」「返回猪只列表」。

---

## 3. 首屏（Hub）布局结构（自上而下）

1. **页头**  
   - 主标题：现场任务类应用使用 **「现场任务」** 或业务总称。  
   - 副标题：一句话说明「先选车间/房间，再处理任务」。

2. **选址区 `.mv-scope-panel`**  
   - **Segmented**：`车间` | `房间`（`block`，浅灰轨道）。  
   - **Select 全宽**：车间模式下选车间；房间模式下选房间（选项文案建议：`房间名（所属车间）`，支持搜索）。

3. **二级 Tab（chip 形态）**  
   - 使用 **`.mv-chip` / `.mv-chip--on`**，与接种模块「全部任务 / 补打清单」一致。  
   - 新模块可增加等价 Tab（如「待我处理」「已完成」），但 **视觉与交互保持一致**。

4. **当前上下文一行**  
   - 使用 `.mv-hub-context`，展示：当前是车间还是房间 + 当前名称。

5. **分区标题**  
   - 使用 `.mv-section-title`（小写、字间距、灰色），如「任务」。

6. **任务卡片列表 `.mv-home-task-list`**  
   - 每条为 **`.mv-home-task-card`**，整块 `button` 可点，`hover` 微抬起。  
   - **接种类** 可加修饰 **`.mv-home-task-card--vaccine`**（浅绿渐变底 + 绿边框）。  
   - 卡片内：**Ant Tag（类型）** + **`.mv-home-task-title`** + **`.mv-home-task-sub`**；需要时 **`.mv-home-task-hint`**（如「点击进入房间选择」）。

---

## 4. 车间 → 房间：底部 Drawer

- 使用 **Ant Design `Drawer` `placement="bottom"`**，标题 **「选择进入房间」**。  
- 内容：每个房间一行 **大按钮**，文案包含 **待处理数 / 总头数**。  
- 样式容器：**`.mv-room-drawer`**（底部留白充足）。  
- 选中房间后：关闭 Drawer，进入 **PigList**，并带上 `batchId` / `roomId`（或新业务等价维度）。

---

## 5. 猪只列表（PigList）

- 顶栏：**返回任务首页**（清空列表上下文）。  
- 标题区：说明 **房间名** + **列表语义**（如「批次内本间全部头只」）。  
- **主操作**：**本间完成** 类按钮全宽、`large`（与接种逻辑一致时可复用）。  
- **筛选**：第二行 **`.mv-chip-row`**（全部 / 待执行 / 执行中 / 已完成 / 异常等）。  
- **列表项 `.mv-task-card` + `.mv-pig-row-card`**：  
  - **第一行**：左侧 **`.mv-pig-row-ids`** — **`.mv-stall-pill` 栏位** + **`.mv-ear-pill` 猪只号**；右侧 **状态 Tag**。  
  - **第二行**：任务主名称（如计划名）。  
  - **第三行**：`.mv-task-meta`（疫苗、单位、计划时间等，用 `·` 分隔）。  
  - 豁免等：**`.mv-hint` + Badge**。  
- **补打（Is_Retry）**：**`.mv-task-card--retry`** + 顶部 **`.mv-retry-banner`** 文案 **「补打 · Is_Retry」**；详情页顶部 **`.mv-retry-stripe`** 再次强调。

---

## 6. 详情（Detail）

- 顶栏：**`.mv-nav`** 内 `Button type="link"` 返回。  
- 豁免弱提示：**`Alert type="warning"` + `.mv-exempt-banner`**（黄底、圆角）。  
- 主信息卡：**`.mv-card.mv-hero`**  
  - 标题行：**栏位 + 猪只号**（`.mv-pig-id-lg`），右侧状态 Tag。  
  - **`.mv-kv-grid` 两列**：车间、房间、计划、疫苗、剂量、目标群、覆盖数、豁免命中、计划时间等（按业务删减）。  
- 异常面板：**`.mv-exception`**（浅橙渐变底）。  
- 底部操作：**`.mv-actions`** 纵向大按钮组（开始执行、正常完成、强制完成、查看历史等）。

---

## 7. 表单与历史

- 表单容器：**`.mv-form`**；表单项纵向，`DatePicker`/`InputNumber` 全宽。  
- 强制类操作：标题旁 **橙色 Tag** 标明「强制接种」等业务语义。  
- 历史：**`.mv-timeline` + `.mv-log-card`**，类型小标签 + 摘要 + 人/时间。

---

## 8. 全局容器与宿主

- 根节点：**`.mv-root`**（`max-width: 420px`，水平居中，底部 padding）。  
- Console 内容区内包裹：**`.mobile-vacc-host`**（flex 居中，与桌面表格并存）。  
- 全局字体与色板见 `src/styles.css` 顶部 `:root` 与 `body`。

---

## 9. CSS 类名索引（`src/styles.css`）

现场模块样式均以 **`mv-` 前缀** 命名，避免与 Console 混用。主要类名：

`mv-root` `mv-header` `mv-title` `mv-sub` `mv-chip-row` `mv-chip` `mv-chip--on` `mv-list` `mv-task-card` `mv-task-card--retry` `mv-retry-banner` `mv-retry-stripe` `mv-scope-panel` `mv-scope-select` `mv-hub-context` `mv-hub-section` `mv-section-title` `mv-home-task-list` `mv-home-task-card` `mv-home-task-card--vaccine` `mv-home-task-title` `mv-home-task-sub` `mv-home-task-hint` `mv-pig-row-card` `mv-pig-row-main` `mv-pig-row-ids` `mv-stall-pill` `mv-ear-pill` `mv-room-drawer` `mv-card` `mv-empty` `mv-nav` `mv-hero` `mv-kv-grid` `mv-exempt-banner` `mv-exception` `mv-actions` `mv-form` `mv-timeline` `mv-log-card`

新增模块时 **优先复用上述类**；确需新样式时继续 **`mv-` 前缀** 并补记到本文档「类名索引」。

---

## 10. 参考实现文件

| 用途 | 路径 |
|------|------|
| 页面与导航状态机 | `src/components/MobileVaccinationPage.tsx` |
| 车间/房间配置 | `src/mobileWorkshops.ts` |
| 首页接种卡片聚合 | `src/buildMobileHomeCards.ts` |
| 演示用非接种任务 | `src/mobileHomeFixtures.ts`、`src/mobileHomeTypes.ts` |
| 猪只栏位/耳标/车间元数据 | `src/pigMeta.ts` |
| 接种任务模型与工具 | `src/mobileVaccinationUtils.ts` |
| 样式 | `src/styles.css`（`mv-` 段） |
| 宿主 | `src/App.tsx`（`mobile-vacc-host`） |

---

## 11. 新模块落地检查清单

- [ ] 首屏是否包含 **车间/房间 Segmented + Select**，且筛选逻辑清晰。  
- [ ] 首页任务卡片是否 **类型 Tag + 标题 + 副标题** 与现有一致。  
- [ ] 车间维度是否需要 **底部 Drawer 选房间**；房间维度是否 **直达列表**。  
- [ ] 列表行是否包含 **栏位号 + 猪只号** pill，且语义与 `pigMeta` 一致。  
- [ ] 补打/特殊任务是否有 **retry 横幅/条** 与接种一致。  
- [ ] 是否使用 **`.mv-root` + `.mv-*`**，未破坏 Console 桌面布局。  
- [ ] 详情返回是否处理 **多层级返回栈**。

---

*文档版本：与当前仓库 Mobile 接种实现同步；变更布局时请同步更新本文档。*
