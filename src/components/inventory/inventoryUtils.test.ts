import {
  buildInventoryCategoryTabs,
  buildInventoryRecentActivities,
  buildInventoryOutboundTransaction,
  buildInventoryStocktakeScope,
  buildInventoryStocktakeTransaction,
  buildInventoryStocktakeDifferences,
  buildInventoryScrapTransaction,
  buildInventoryReceiveEntry,
  buildInventoryReceiveEntryFromSearch,
  buildBatchInlineNewMaterialDraft,
  buildInventoryLedgerQuantityDisplay,
  buildInventoryMaterialUsageState,
  buildInventoryRiskItems,
  buildInventorySummaries,
  calculateInventoryBaseQuantity,
  createDefaultBatchNewMaterialForm,
  filterInventoryLedgers,
  filterInventorySummariesByMaterialStatus,
  formatNearestExpiryDate,
  formatInventoryQtyWithPackage,
  generateInventoryLotNo,
  getInventoryLotsForMaterial,
  getInventoryReceiveMaterialOptions,
  hasInventoryMaterialBusinessRecords,
  isInventoryDifferenceWithinTolerance,
  inventorySeedInboundOrders,
  inventorySeedLedgers,
  inventorySeedLots,
  inventorySeedMaterials,
  buildInventoryDifferenceResolution,
  buildFeedEstimatedAvailableDays,
  resolveInventoryToleranceDifferences,
  toggleInventoryMaterialStatus,
  updateInventoryMaterial,
  validateInventoryMaterialEdit,
  resolveInventoryReceivableUnits,
  resolveInventoryUnitFactor,
  resolveInventoryLastPurchaseInfo,
  validateBatchInlineNewMaterial,
  validateInventoryPackageConversions,
  INVENTORY_DEMO_REFERENCE_AT
} from "./inventoryData";
import { isBatchReceiveEntryReady } from "./BatchReceivePanel";

const summaries = buildInventorySummaries(inventorySeedMaterials, inventorySeedLots);
const summariesWithUsage = buildInventorySummaries(inventorySeedMaterials, inventorySeedLots, inventorySeedLedgers, {
  referenceAt: INVENTORY_DEMO_REFERENCE_AT
});

const florfenicol = summaries.find((item) => item.materialName === "氟苯尼考");
if (!florfenicol) {
  throw new Error("库存汇总应包含氟苯尼考物料");
}

if (florfenicol.currentStockBase !== 1850) {
  throw new Error("库存汇总应把批次库存与物料级负库存合并计算");
}

if (florfenicol.stockRisk !== "无风险") {
  throw new Error("移除安全库存后，正库存物料不应再被识别为低库存");
}

const florfenicolUsage = summariesWithUsage.find((item) => item.materialName === "氟苯尼考");
if (
  !florfenicolUsage ||
  florfenicolUsage.usageTrend.length !== 30 ||
  florfenicolUsage.stockTrend.length !== 30 ||
  florfenicolUsage.monthlyUsageBase !== 1240 ||
  florfenicolUsage.usageTrend.reduce((sum, value) => sum + value, 0) !== florfenicolUsage.monthlyUsageBase ||
  florfenicolUsage.stockTrend[florfenicolUsage.stockTrend.length - 1] !== florfenicolUsage.currentStockBase ||
  florfenicolUsage.stockTrend.every((value) => value === florfenicolUsage.currentStockBase)
) {
  throw new Error("库存汇总应根据流水生成近30天使用量趋势和库存结存趋势");
}

const electrolyteUsage = summariesWithUsage.find((item) => item.materialName === "电解多维");
if (
  !electrolyteUsage ||
  electrolyteUsage.usageTrend.length !== 30 ||
  electrolyteUsage.stockTrend.length !== 30 ||
  electrolyteUsage.monthlyUsageBase !== 0 ||
  electrolyteUsage.usageTrend.some((value) => value !== 0)
) {
  throw new Error("近30天无业务消耗的物料应生成30个0使用趋势点，并保留库存趋势点供 Sparkline 绘制");
}

const disinfectant = summaries.find((item) => item.materialName === "戊二醛消毒液");
if (!disinfectant || disinfectant.stockRisk !== "负库存") {
  throw new Error("库存风险应优先识别物料级负库存");
}

const expiredLot = inventorySeedLots.find((lot) => lot.status === "过期");
if (!expiredLot || expiredLot.materialId !== "mat-vaccine-prrs") {
  throw new Error("模拟数据应覆盖过期批次，支撑过期库存风险与报废处理场景");
}

const riskItems = buildInventoryRiskItems(inventorySeedMaterials, inventorySeedLots, summaries);
if (riskItems.length < 3) {
  throw new Error("库存首页应生成负库存、过期、临期等待处理风险");
}

if (riskItems[0].type !== "负库存" || riskItems[1].type !== "过期") {
  throw new Error("库存首页风险待办应优先展示负库存与过期批次");
}

const unsupportedRiskActions = ["核对消耗", "优先使用", "安排补货"];
if (riskItems.some((item) => item.actionText && unsupportedRiskActions.includes(item.actionText))) {
  throw new Error("库存首页风险待办不应展示系统不存在的核对消耗、优先使用、安排补货操作");
}

const riskActionMap = new Map(riskItems.map((item) => [item.type, item.actionText]));
if (
  riskActionMap.get("负库存") !== "发起盘点" ||
  riskActionMap.get("临期") !== "发起盘点" ||
  riskActionMap.get("过期") !== "报废"
) {
  throw new Error("库存风险默认主动作应固定为：负库存发起盘点、临期发起盘点、已过期报废");
}

if (riskItems.some((item) => String(item.type) === "低库存" || item.valueText.includes("安全"))) {
  throw new Error("移除安全库存后，库存风险不应再生成低库存或安全库存文案");
}

const expiringRisk = riskItems.find((item) => item.type === "临期" && item.materialId === "mat-drug-florfenicol");
if (expiringRisk?.valueText !== "850ml（46%）") {
  throw new Error("临期风险行应展示受影响数量及占当前库存比例");
}

const expiredRiskValue = riskItems.find((item) => item.type === "过期" && item.materialId === "mat-vaccine-prrs")?.valueText;
if (expiredRiskValue !== "120头份（67%）") {
  throw new Error("已过期风险行应展示过期数量及占比");
}

const toolSummary = summaries.find((item) => item.category === "工具");
if (!toolSummary || formatNearestExpiryDate(toolSummary) !== "—") {
  throw new Error("工具类物料不应展示伪造的最近到期日");
}

const recentActivities = buildInventoryRecentActivities(
  inventorySeedMaterials,
  inventorySeedLedgers
);
if (recentActivities[0].occurredAt < recentActivities[1].occurredAt) {
  throw new Error("库存首页最近动态应按发生时间倒序展示");
}

const lactationAvailableDays = buildFeedEstimatedAvailableDays(
  14000,
  "mat-feed-lactation",
  inventorySeedLedgers,
  { referenceAt: INVENTORY_DEMO_REFERENCE_AT }
);
if (lactationAvailableDays.days !== 2 || lactationAvailableDays.status !== "紧急") {
  throw new Error("哺乳母猪料应按近7天平均消耗计算预计可用天数并标记紧急");
}

const nurseryAvailableDays = buildFeedEstimatedAvailableDays(
  52000,
  "mat-feed-nursery",
  inventorySeedLedgers,
  { referenceAt: INVENTORY_DEMO_REFERENCE_AT }
);
if (nurseryAvailableDays.days !== 13 || nurseryAvailableDays.status !== "关注") {
  throw new Error("保育猪料预计可用天数应为13天并标记关注");
}

const gestationAvailableDays = buildFeedEstimatedAvailableDays(
  28000,
  "mat-feed-gestation",
  inventorySeedLedgers,
  { referenceAt: INVENTORY_DEMO_REFERENCE_AT }
);
if (gestationAvailableDays.days !== 28 || gestationAvailableDays.status !== "正常") {
  throw new Error("妊娠母猪料预计可用天数应为28天并标记正常");
}

const starterAvailableDays = buildFeedEstimatedAvailableDays(
  8000,
  "mat-feed-starter",
  inventorySeedLedgers,
  { referenceAt: INVENTORY_DEMO_REFERENCE_AT }
);
if (starterAvailableDays.displayText !== "—") {
  throw new Error("近7天无消耗记录时应显示 —");
}

const zeroFeedAvailableDays = buildFeedEstimatedAvailableDays(
  0,
  "mat-feed-lactation",
  inventorySeedLedgers,
  { referenceAt: INVENTORY_DEMO_REFERENCE_AT }
);
if (zeroFeedAvailableDays.displayText !== "0天" || zeroFeedAvailableDays.status !== "zero") {
  throw new Error("饲料库存为0时应显示0天");
}

const categoryTabs = buildInventoryCategoryTabs(summaries);
const expectedCategoryOrder = ["饲料", "药品", "消耗品", "工具", "其他"];
if (categoryTabs.map((tab) => tab.key).join(",") !== expectedCategoryOrder.join(",")) {
  throw new Error("库存列表分类 tab 应固定展示完整物料类型，并按饲料、药品、消耗品、工具、其他排序");
}

const categoryTabKeys = categoryTabs.map((tab) => String(tab.key));
if (categoryTabKeys.includes("精液")) {
  throw new Error("库存管理不应展示精液分类 tab，精液暂不纳入库存管理");
}

if (!categoryTabs.some((tab) => tab.key === "药品" && tab.count === 4)) {
  throw new Error("库存列表分类 tab 应统计药品物料数量");
}

if (!categoryTabs.some((tab) => tab.key === "饲料" && tab.count === 5)) {
  throw new Error("库存列表分类 tab 应统计饲料物料数量");
}

if (!categoryTabs.some((tab) => tab.key === "其他" && tab.count === 0)) {
  throw new Error("库存列表分类 tab 即使当前无物料，也应展示其他分类");
}

if (categoryTabs.some((tab) => ["物料管理", "批次明细", "库存流水", "预警中心", "过期库存处理"].includes(tab.label))) {
  throw new Error("库存列表 tab 不应再展示模块型标签，应只展示物料类型");
}

const disabledFlorfenicolMaterials = inventorySeedMaterials.map((material) =>
  material.id === "mat-drug-florfenicol" ? { ...material, status: "已停用" as const } : material
);
const disabledFlorfenicolSummaries = buildInventorySummaries(disabledFlorfenicolMaterials, inventorySeedLots);
const enabledOnlyTabs = buildInventoryCategoryTabs(disabledFlorfenicolSummaries, disabledFlorfenicolMaterials, "启用中");
if (!enabledOnlyTabs.some((tab) => tab.key === "药品" && tab.count === 3)) {
  throw new Error("分类 tab 默认应只统计启用中物料，停用物料不应干扰日常列表数量，并保留其他启用中药品");
}

const enabledOnlySummaries = filterInventorySummariesByMaterialStatus(
  disabledFlorfenicolSummaries,
  disabledFlorfenicolMaterials,
  "启用中"
);
const disabledOnlySummaries = filterInventorySummariesByMaterialStatus(
  disabledFlorfenicolSummaries,
  disabledFlorfenicolMaterials,
  "已停用"
);
if (
  enabledOnlySummaries.some((summary) => summary.materialId === "mat-drug-florfenicol") ||
  !disabledOnlySummaries.some((summary) => summary.materialId === "mat-drug-florfenicol")
) {
  throw new Error("物料状态筛选应支持默认只看启用中，并可切换查看已停用物料");
}

const receiveOptionsAfterDisable = getInventoryReceiveMaterialOptions(disabledFlorfenicolMaterials);
if (receiveOptionsAfterDisable.some((option) => option.materialId === "mat-drug-florfenicol")) {
  throw new Error("采购入库选择已有物料时默认不应展示已停用物料");
}

const florfenicolUsageState = buildInventoryMaterialUsageState(
  "mat-drug-florfenicol",
  inventorySeedMaterials,
  inventorySeedLots,
  inventorySeedLedgers
);
if (!hasInventoryMaterialBusinessRecords(florfenicolUsageState) || florfenicolUsageState.batchCount !== 2) {
  throw new Error("已有批次或流水的物料应被识别为已有业务记录");
}

if (florfenicolUsageState.canEditBaseUnit) {
  throw new Error("已有库存或历史记录的物料不允许修改核算单位");
}

const duplicateEditMessage = validateInventoryMaterialEdit({
  materialId: "mat-drug-florfenicol",
  materials: [
    ...inventorySeedMaterials,
    {
      ...inventorySeedMaterials[0],
      id: "mat-duplicate",
      materialCode: "MAT-009999"
    }
  ],
  materialName: inventorySeedMaterials[0].materialName,
  brand: inventorySeedMaterials[0].brand,
  category: inventorySeedMaterials[0].category,
  baseUnit: inventorySeedMaterials[0].baseUnit,
  note: inventorySeedMaterials[0].note,
  canEditBaseUnit: false
});
if (duplicateEditMessage !== "已存在相同物料，请勿重复创建或修改。") {
  throw new Error("编辑物料时应按物料名称、品牌、分类、核算单位阻止重复");
}

const editedFlorfenicol = updateInventoryMaterial(inventorySeedMaterials, {
  materialId: "mat-drug-florfenicol",
  materialName: "氟苯尼考注射液",
  brand: "A品牌",
  category: "药品",
  baseUnit: "ml",
  note: "更新后的备注"
}).find((material) => material.id === "mat-drug-florfenicol");
if (
  !editedFlorfenicol ||
  editedFlorfenicol.materialName !== "氟苯尼考注射液" ||
  editedFlorfenicol.note !== "更新后的备注"
) {
  throw new Error("编辑物料应更新展示信息和备注，并保持物料 ID 不变");
}

const disabledMaterial = toggleInventoryMaterialStatus(inventorySeedMaterials, "mat-drug-florfenicol", "已停用")
  .find((material) => material.id === "mat-drug-florfenicol");
const enabledMaterial = toggleInventoryMaterialStatus(disabledFlorfenicolMaterials, "mat-drug-florfenicol", "启用中")
  .find((material) => material.id === "mat-drug-florfenicol");
if (disabledMaterial?.status !== "已停用" || enabledMaterial?.status !== "启用中") {
  throw new Error("物料应支持停用和重新启用，且不删除历史数据");
}

const florfenicolLots = getInventoryLotsForMaterial(inventorySeedLots, florfenicol.materialId);
if (florfenicolLots.length !== 2 || florfenicolLots[0].lotNo !== "FL-202606-A") {
  throw new Error("物料详情应能按物料展示该物料的全部批次信息，并按风险和到期日排序");
}

const florfenicolMaterial = inventorySeedMaterials.find((item) => item.id === florfenicol.materialId);
if (!florfenicolMaterial?.materialCode || florfenicolMaterial.status !== "启用中" || !florfenicolMaterial.lastStocktakeAt) {
  throw new Error("物料详情页需要物料编码、启用状态和最近盘点时间支撑基础信息与风险展示");
}

const sortedLotsWithUsedUp = getInventoryLotsForMaterial(
  [
    ...inventorySeedLots,
    {
      ...florfenicolLots[0],
      id: "lot-flor-used-up",
      lotNo: "FL-202601-Z",
      expiryDate: "2026-01-01",
      remainingQtyBase: 0,
      status: "已耗尽" as const
    }
  ],
  florfenicol.materialId
);
if (sortedLotsWithUsedUp[sortedLotsWithUsedUp.length - 1]?.lotNo !== "FL-202601-Z") {
  throw new Error("物料详情批次排序应把已用完批次放在最后");
}

const allLedgerRecords = filterInventoryLedgers({
  ledgers: inventorySeedLedgers,
  materials: inventorySeedMaterials
});
if (allLedgerRecords.length !== inventorySeedLedgers.length) {
  throw new Error("库存流水页应作为整体列表展示所有库存变化，不应再按入库和出库 tab 拆分");
}

const ledgerQuantityDisplay = buildInventoryLedgerQuantityDisplay(inventorySeedLedgers[0]);
if (
  ledgerQuantityDisplay.changeText !== inventorySeedLedgers[0].quantityText ||
  ledgerQuantityDisplay.balanceText !== inventorySeedLedgers[0].afterStockText ||
  ledgerQuantityDisplay.directionText !== "库存上升"
) {
  throw new Error("库存流水页应把变化数量、结存数量和库存上升/下降结果合并展示");
}

const outboundQuantityDisplay = buildInventoryLedgerQuantityDisplay(inventorySeedLedgers[1]);
if (outboundQuantityDisplay.directionText !== "库存下降") {
  throw new Error("库存流水页应在列表中明确展示库存下降结果");
}

const inboundFlorfRecords = filterInventoryLedgers({
  ledgers: inventorySeedLedgers,
  materials: inventorySeedMaterials,
  keyword: "氟苯尼考",
  dateRange: ["2026-06-17", "2026-06-17"]
});
if (
  inboundFlorfRecords.length !== 2 ||
  !inboundFlorfRecords.some((record) => record.type === "采购入库") ||
  !inboundFlorfRecords.some((record) => record.type === "业务消耗")
) {
  throw new Error("库存流水整体列表应支持按日期范围与物料名称复合查询，并同时展示上升和下降流水");
}

const gestationMaterial = inventorySeedMaterials.find((item) => item.id === "mat-feed-gestation");
if (!gestationMaterial) {
  throw new Error("模拟数据应包含妊娠母猪料");
}
const gestationLastPurchase = resolveInventoryLastPurchaseInfo(
  gestationMaterial,
  inventorySeedLots,
  inventorySeedLedgers
);
if (
  gestationLastPurchase.source !== "ledger" ||
  gestationLastPurchase.occurredAt !== "2026-06-28 08:30" ||
  gestationLastPurchase.quantityBase !== 1200 ||
  gestationLastPurchase.quantityText !== "1200kg"
) {
  throw new Error("采购单编辑页应优先用最近采购入库流水展示上次入库时间和数量");
}

const prrsMaterial = inventorySeedMaterials.find((item) => item.id === "mat-vaccine-prrs");
if (!prrsMaterial) {
  throw new Error("模拟数据应包含蓝耳二联疫苗");
}
const prrsLastPurchase = resolveInventoryLastPurchaseInfo(
  prrsMaterial,
  inventorySeedLots,
  inventorySeedLedgers
);
if (
  prrsLastPurchase.source !== "lot" ||
  prrsLastPurchase.occurredAt !== undefined ||
  prrsLastPurchase.quantityBase !== 400 ||
  prrsLastPurchase.quantityText !== "400头份"
) {
  throw new Error("没有采购入库流水时，采购单编辑页应以批次数量兜底展示上次入库数量");
}

const sourceOnlyRecords = filterInventoryLedgers({
  ledgers: inventorySeedLedgers,
  materials: inventorySeedMaterials,
  keyword: "治疗任务"
});
if (sourceOnlyRecords.length !== 0) {
  throw new Error("库存流水页不展示来源业务列后，关键词搜索不应再按来源业务匹配");
}

const outboundLossRecords = filterInventoryLedgers({
  ledgers: inventorySeedLedgers,
  materials: inventorySeedMaterials,
  ledgerTypes: ["盘亏"],
  keyword: "蓝耳"
});
if (outboundLossRecords.length !== 1 || outboundLossRecords[0].type !== "盘亏") {
  throw new Error("库存流水整体列表应支持按流水类型与物料名称复合查询");
}

if (generateInventoryLotNo("2026-06-19", 1) !== "RK-20260619-001") {
  throw new Error("采购入库批次号应由系统按入库日期自动生成");
}

const receivedEntry = buildInventoryReceiveEntry({
  mode: "new",
  materialId: "mat-receive-amoxicillin",
  lotId: "lot-receive-amoxicillin",
  materialName: "阿莫西林",
  category: "药品",
  brand: "华牧",
  baseUnit: "ml",
  packageConversions: [{ fromUnit: "瓶", quantity: 100, toUnit: "ml" }],
  inboundQuantity: 20,
  inboundUnit: "瓶",
  baseQuantity: 2000,
  note: "新增治疗物料",
  expiryDate: "2026-12-31",
  unitPrice: 1040,
  supplier: "华牧供应",
  supplierPhone: "13800000000",
  receiveDate: "2026-06-19",
  sequence: 1
});
const lotsAfterReceive = getInventoryLotsForMaterial(
  [...inventorySeedLots, receivedEntry.lot],
  receivedEntry.material.id
);
const newLotInDetail = lotsAfterReceive.find((lot) => lot.lotNo === "RK-20260619-001");
if (
  !newLotInDetail ||
  receivedEntry.material.materialName !== "阿莫西林" ||
  receivedEntry.material.category !== "药品" ||
  receivedEntry.material.brand !== "华牧" ||
  receivedEntry.material.baseUnit !== "ml" ||
  receivedEntry.material.auxiliaryUnit !== "瓶" ||
  receivedEntry.material.packageConversions?.length !== 1 ||
  !receivedEntry.material.unitSystem.includes("1瓶 = 100ml") ||
  receivedEntry.material.note !== "新增治疗物料" ||
  newLotInDetail.inboundQty !== 20 ||
  newLotInDetail.inboundUnit !== "瓶" ||
  newLotInDetail.convertedQtyBase !== 2000 ||
  newLotInDetail.remainingQtyBase !== 2000 ||
  newLotInDetail.unitPrice !== 1040 ||
  newLotInDetail.baseUnitCost !== 0.52 ||
  newLotInDetail.supplier !== "华牧供应" ||
  newLotInDetail.supplierPhone !== "13800000000" ||
  newLotInDetail.productionDate
) {
  throw new Error("采购入库新增物料时必须补齐列表与详情会展示的主数据，并保存批次信息");
}

if (calculateInventoryBaseQuantity(2, "盒", inventorySeedMaterials[0].baseUnit, inventorySeedMaterials[0].packageConversions || []) !== 2000) {
  throw new Error("采购入库应使用物料主数据中的包装规格自动换算入库数量");
}

const existingMaterialReceive = buildInventoryReceiveEntry({
  mode: "existing",
  material: inventorySeedMaterials[0],
  lotId: "lot-existing-florfenicol",
  expiryDate: "2027-01-31",
  unitPrice: 1160,
  inboundQuantity: 2,
  inboundUnit: "盒",
  baseQuantity: 2000,
  packageConversions: inventorySeedMaterials[0].packageConversions || [],
  supplier: "华牧供应",
  supplierPhone: "13800000001",
  receiveDate: "2026-06-19",
  sequence: 2
});
if (
  existingMaterialReceive.material.id !== inventorySeedMaterials[0].id ||
  existingMaterialReceive.material.category !== "药品" ||
  existingMaterialReceive.lot.materialId !== inventorySeedMaterials[0].id ||
  existingMaterialReceive.lot.lotNo !== "RK-20260619-002" ||
  existingMaterialReceive.lot.inboundUnit !== "盒" ||
  existingMaterialReceive.lot.convertedQtyBase !== 2000 ||
  existingMaterialReceive.lot.baseUnitCost !== 0.58 ||
  existingMaterialReceive.lot.packageConversions?.length !== 2
) {
  throw new Error("采购入库应使用已有物料的包装规格新增系统批次");
}

const baseUnitOnlyReceive = buildInventoryReceiveEntry({
  mode: "new",
  materialId: "mat-receive-direct-ml",
  lotId: "lot-receive-direct-ml",
  materialName: "直接核算入库物料",
  category: "药品",
  brand: "华牧",
  baseUnit: "ml",
  packageConversions: [],
  inboundQuantity: 500,
  inboundUnit: "ml",
  baseQuantity: 500,
  expiryDate: "2026-12-31",
  unitPrice: 52,
  supplier: "华牧供应",
  supplierPhone: "13800000004",
  receiveDate: "2026-06-19",
  sequence: 5
});
if (
  baseUnitOnlyReceive.material.baseUnit !== "ml" ||
  baseUnitOnlyReceive.material.auxiliaryUnit !== undefined ||
  baseUnitOnlyReceive.lot.inboundUnit !== "ml" ||
  baseUnitOnlyReceive.lot.convertedQtyBase !== 500 ||
  (baseUnitOnlyReceive.lot.packageConversions || []).length !== 0
) {
  throw new Error("采购入库不展示包装规格时，应允许直接按核算单位记录入库数量");
}

let missingSupplierBlocked = false;
try {
  buildInventoryReceiveEntry({
    mode: "existing",
    material: inventorySeedMaterials[0],
    lotId: "lot-missing-supplier",
    expiryDate: "2027-01-31",
    unitPrice: 1160,
    inboundQuantity: 2,
    inboundUnit: "盒",
    baseQuantity: 2000,
    packageConversions: inventorySeedMaterials[0].packageConversions || [],
    supplier: "",
    receiveDate: "2026-06-19",
    sequence: 6
  });
} catch (error) {
  missingSupplierBlocked = error instanceof Error && error.message === "供应商必填。";
}
if (!missingSupplierBlocked) {
  throw new Error("采购入库必须校验供应商必填，供应商电话保持选填");
}

const batchReceiveEntryWithoutSupplier = {
  id: "batch-ready-without-supplier",
  materialKeyword: "氟苯尼考",
  materialId: "mat-drug-florfenicol",
  category: "药品" as const,
  optionalExpanded: false,
  draft: {
    inboundQuantity: 2,
    inboundUnit: "盒",
    unitPrice: 1160,
    expiryDate: "2027-01-31"
  }
};
if (isBatchReceiveEntryReady(batchReceiveEntryWithoutSupplier, inventorySeedMaterials)) {
  throw new Error("入库明细缺少供应商时不应进入可提交状态");
}
if (
  !isBatchReceiveEntryReady(
    {
      ...batchReceiveEntryWithoutSupplier,
      draft: {
        ...batchReceiveEntryWithoutSupplier.draft,
        supplier: "华牧供应"
      }
    },
    inventorySeedMaterials
  )
) {
  throw new Error("供应商必填、供应商电话选填时，补齐供应商后入库明细应可提交");
}

const multiLevelConversions = [
  { fromUnit: "瓶", quantity: 100, toUnit: "ml" },
  { fromUnit: "箱", quantity: 60, toUnit: "瓶" }
];
if (
  resolveInventoryUnitFactor("箱", "ml", multiLevelConversions) !== 6000 ||
  calculateInventoryBaseQuantity(2, "箱", "ml", multiLevelConversions) !== 12000
) {
  throw new Error("多级包装规格应能换算为核算单位数量");
}

const receivableUnits = resolveInventoryReceivableUnits("吨", [
  { fromUnit: "袋", quantity: 20, toUnit: "吨" },
  { fromUnit: "箱", quantity: 10, toUnit: "袋" }
]);
if (receivableUnits.join(",") !== "吨,袋,箱") {
  throw new Error("入库单位选项应包含核算单位和全部可换算包装单位");
}

const convertedStockText = formatInventoryQtyWithPackage(20300, {
  baseUnit: "kg",
  auxiliaryUnit: "袋",
  packageConversions: [{ fromUnit: "袋", quantity: 1000, toUnit: "kg" }]
});
if (convertedStockText !== "20.3袋（20300kg）") {
  throw new Error("当前库存字段应优先展示换算后的单位，并在括号内保留核算单位库存");
}

if (validateInventoryPackageConversions("ml", []) !== "请完善包装规格后再提交入库。") {
  throw new Error("缺少包装规格时应阻止采购入库提交");
}

const feedNewMaterialForm = {
  ...createDefaultBatchNewMaterialForm("饲料"),
  brand: "正大",
  packageConversions: [
    { fromUnit: "吨", quantity: 787, toUnit: "L" },
    { fromUnit: "袋", quantity: 10, toUnit: "吨" }
  ]
};
const feedNewMaterialDraft = buildBatchInlineNewMaterialDraft("饲料", "测试饲料", feedNewMaterialForm);
if (
  feedNewMaterialForm.baseUnit !== "吨" ||
  validateBatchInlineNewMaterial("饲料", "测试饲料", feedNewMaterialForm) !== null ||
  !feedNewMaterialDraft ||
  feedNewMaterialDraft.auxiliaryUnit !== "袋" ||
  !feedNewMaterialDraft.unitSystem.includes("1吨 = 787L") ||
  !feedNewMaterialDraft.unitSystem.includes("1袋 = 10吨") ||
  calculateInventoryBaseQuantity(2, "袋", feedNewMaterialDraft.baseUnit, feedNewMaterialDraft.packageConversions || []) !== 20 ||
  calculateInventoryBaseQuantity(787, "L", feedNewMaterialDraft.baseUnit, feedNewMaterialDraft.packageConversions || []) !== 1
) {
  throw new Error("入库新建饲料物料必须保存多级单位换算，并支持袋、吨、L 双向换算的饲料机口径");
}

const feedMissingLiterForm = {
  ...createDefaultBatchNewMaterialForm("饲料"),
  brand: "正大",
  packageConversions: [{ fromUnit: "袋", quantity: 10, toUnit: "吨" }]
};
if (
  validateBatchInlineNewMaterial("饲料", "缺升换算饲料", feedMissingLiterForm) !==
  "饲料必须填写 1吨 = xxL 的单位换算。"
) {
  throw new Error("饲料入库新建物料时必须强制填写 1吨 = xxL 的换算规则");
}

const medicineMissingConversionForm = {
  ...createDefaultBatchNewMaterialForm("药品"),
  brand: "华牧",
  medicineClass: "兽药",
  dosageForm: "粉剂",
  usageMethod: "饮水",
  packageConversions: []
};
if (
  validateBatchInlineNewMaterial("药品", "缺单位换算兽药", medicineMissingConversionForm) !==
  "请至少填写一条单位换算规则。"
) {
  throw new Error("入库新建物料时单位换算应为通用必填项");
}

const receiveFromExistingSearch = buildInventoryReceiveEntryFromSearch({
  materials: inventorySeedMaterials,
  selectedMaterialId: inventorySeedMaterials[0].id,
  materialText: "氟苯尼考",
  lotId: "lot-search-existing",
  newMaterialId: "mat-should-not-create",
  expiryDate: "2027-02-28",
  unitPrice: 66,
  inboundQuantity: 20,
  inboundUnit: "瓶",
  baseQuantity: 2000,
  packageConversions: [{ fromUnit: "瓶", quantity: 100, toUnit: "ml" }],
  supplier: "华牧供应",
  supplierPhone: "13800000002",
  receiveDate: "2026-06-19",
  sequence: 3
});
if (
  receiveFromExistingSearch.material.id !== inventorySeedMaterials[0].id ||
  receiveFromExistingSearch.lot.materialId !== inventorySeedMaterials[0].id
) {
  throw new Error("采购入库搜索选中已有物料时，应在已有物料下新增批次");
}

const receiveFromNewSearch = buildInventoryReceiveEntryFromSearch({
  materials: inventorySeedMaterials,
  materialText: "替米考星",
  category: "药品",
  brand: "新牧",
  baseUnit: "ml",
  note: "新增兽药",
  inboundQuantity: 10,
  inboundUnit: "瓶",
  baseQuantity: 1000,
  packageConversions: [{ fromUnit: "瓶", quantity: 100, toUnit: "ml" }],
  lotId: "lot-search-new",
  newMaterialId: "mat-search-new",
  expiryDate: "2027-03-31",
  unitPrice: 88,
  supplier: "新牧供应",
  supplierPhone: "13800000003",
  receiveDate: "2026-06-19",
  sequence: 4
});
if (
  receiveFromNewSearch.material.id !== "mat-search-new" ||
  receiveFromNewSearch.material.materialName !== "替米考星" ||
  receiveFromNewSearch.material.category !== "药品" ||
  receiveFromNewSearch.material.brand !== "新牧" ||
  receiveFromNewSearch.material.baseUnit !== "ml" ||
  receiveFromNewSearch.material.auxiliaryUnit !== "瓶" ||
  !receiveFromNewSearch.material.unitSystem.includes("1瓶 = 100ml") ||
  receiveFromNewSearch.lot.convertedQtyBase !== 1000 ||
  receiveFromNewSearch.material.note !== "新增兽药"
) {
  throw new Error("采购入库搜索不到物料时，应直接按用户输入新增物料并补齐结构化主数据和批次数量");
}

const outboundTransaction = buildInventoryOutboundTransaction({
  materials: inventorySeedMaterials,
  lots: inventorySeedLots,
  materialId: "mat-drug-florfenicol",
  outboundQuantity: 900,
  purpose: "治疗任务领用",
  remark: "测试出库",
  operator: "赵库管",
  outboundDate: "2026-06-24",
  ledgerIdPrefix: "ledger-outbound-test"
});
const firstFlorfenicolLotAfterOutbound = outboundTransaction.lots.find((lot) => lot.id === "lot-flor-001");
const secondFlorfenicolLotAfterOutbound = outboundTransaction.lots.find((lot) => lot.id === "lot-flor-002");
if (
  firstFlorfenicolLotAfterOutbound?.remainingQtyBase !== 0 ||
  firstFlorfenicolLotAfterOutbound.status !== "已耗尽" ||
  secondFlorfenicolLotAfterOutbound?.remainingQtyBase !== 950 ||
  outboundTransaction.ledgers.length !== 2 ||
  outboundTransaction.ledgers[0].lotNo !== "FL-202606-A" ||
  outboundTransaction.ledgers[0].operator !== "赵库管" ||
  outboundTransaction.ledgers[0].occurredAt !== "2026-06-24 10:00" ||
  outboundTransaction.ledgers[0].source !== "治疗任务领用" ||
  outboundTransaction.ledgers[0].remark !== "测试出库"
) {
  throw new Error("手工出库应按 FEFO 自动补齐批次、领用人和出库日期，并生成业务消耗流水");
}

const negativeOutboundTransaction = buildInventoryOutboundTransaction({
  materials: inventorySeedMaterials,
  lots: inventorySeedLots,
  materialId: "mat-tool-needle",
  outboundQuantity: 20,
  purpose: "工具领用",
  operator: "赵库管",
  outboundDate: "2026-06-24",
  ledgerIdPrefix: "ledger-negative-outbound-test"
});
const needleMaterialAfterNegativeOutbound = negativeOutboundTransaction.materials.find((item) => item.id === "mat-tool-needle");
if (
  needleMaterialAfterNegativeOutbound?.negativeStockBase !== 8 ||
  negativeOutboundTransaction.ledgers.length !== 2 ||
  negativeOutboundTransaction.ledgers[1].lotNo ||
  negativeOutboundTransaction.ledgers[1].afterStockText !== "-8个"
) {
  throw new Error("手工出库库存不足时应扣完可用批次，并把不足数量记录为物料级负库存流水");
}

const expiredOutboundTransaction = buildInventoryOutboundTransaction({
  materials: inventorySeedMaterials,
  lots: inventorySeedLots,
  materialId: "mat-vaccine-prrs",
  outboundQuantity: 100,
  purpose: "过期库存核对领用",
  operator: "赵库管",
  outboundDate: "2026-06-24",
  ledgerIdPrefix: "ledger-expired-outbound-test"
});
const expiredLotAfterOutbound = expiredOutboundTransaction.lots.find((lot) => lot.id === "lot-prrs-001");
const expiredOutboundMaterial = expiredOutboundTransaction.materials.find((item) => item.id === "mat-vaccine-prrs");
if (
  expiredLotAfterOutbound?.remainingQtyBase !== 20 ||
  expiredOutboundTransaction.ledgers.length !== 1 ||
  expiredOutboundTransaction.ledgers[0].lotNo !== "PRRS-202512-X" ||
  expiredOutboundTransaction.ledgers[0].afterStockText !== "80头份" ||
  expiredOutboundMaterial?.negativeStockBase
) {
  throw new Error("过期批次未报废前应默认可继续使用，出库应按 FEFO 扣减过期批次而不是生成负库存");
}

const abnormalStocktakeScope = buildInventoryStocktakeScope({
  mode: "异常盘点",
  materials: inventorySeedMaterials,
  lots: inventorySeedLots,
  summaries
});
if (
  abnormalStocktakeScope.length < 3 ||
  !abnormalStocktakeScope.some((item) => item.materialName === "戊二醛消毒液" && item.reason === "负库存" && item.bookQtyBase === -12) ||
  !abnormalStocktakeScope.some((item) => item.materialName === "氟苯尼考") ||
  !abnormalStocktakeScope.some((item) => item.materialName === "蓝耳二联疫苗" && item.reason === "已过期")
) {
  throw new Error("异常盘点应默认带出负库存、临期和已过期物料");
}

if (abnormalStocktakeScope.some((item) => item.lotId || item.lotNo)) {
  throw new Error("盘点范围应只盘点物料总数，不应带出具体批次");
}

const florfenicolStocktakeRow = abnormalStocktakeScope.find((item) => item.materialName === "氟苯尼考");
if (!florfenicolStocktakeRow || florfenicolStocktakeRow.bookQtyBase <= 0) {
  throw new Error("异常盘点应带出氟苯尼考等异常物料的账面库存");
}

const targetedStocktakeScope = buildInventoryStocktakeScope({
  mode: "指定物料盘点",
  materials: inventorySeedMaterials,
  lots: inventorySeedLots,
  summaries,
  targetMaterialId: "mat-disinfectant-glutaraldehyde"
});
if (targetedStocktakeScope.length !== 1 || targetedStocktakeScope[0].materialName !== "戊二醛消毒液") {
  throw new Error("从风险物料行发起盘点时，应只带入该物料");
}

const selectableStocktakeScope = buildInventoryStocktakeScope({
  mode: "指定物料盘点",
  materials: inventorySeedMaterials,
  lots: inventorySeedLots,
  summaries
});
const selectableStocktakeCategories = new Set(selectableStocktakeScope.map((row) => row.category));
if (
  selectableStocktakeScope.length < inventorySeedMaterials.length ||
  !selectableStocktakeScope.some((row) => row.materialName === "妊娠母猪料" && row.category === "饲料") ||
  !selectableStocktakeScope.some((row) => row.materialName === "氟苯尼考" && row.category === "药品") ||
  selectableStocktakeCategories.size < 4
) {
  throw new Error("指定物料盘点范围页应平铺全部物料候选，并展示可筛选的物料类别");
}

const stocktakeTransaction = buildInventoryStocktakeTransaction({
  materials: inventorySeedMaterials,
  lots: inventorySeedLots,
  scopeRows: [
    ...abnormalStocktakeScope,
    ...buildInventoryStocktakeScope({
      mode: "指定物料盘点",
      materials: inventorySeedMaterials,
      lots: inventorySeedLots,
      summaries,
      targetMaterialId: "mat-tool-needle"
    })
  ],
  actualQuantities: {
    "stocktake-material-mat-disinfectant-glutaraldehyde": 0,
    "stocktake-material-mat-drug-florfenicol": 1750,
    "stocktake-material-mat-vaccine-prrs": 180,
    "stocktake-material-mat-tool-needle": 15
  },
  operator: "张三",
  stocktakeNo: "PD20260624001",
  occurredAt: "2026-06-24 10:45",
  ledgerIdPrefix: "ledger-stocktake-test"
});
const disinfectantAfterStocktake = stocktakeTransaction.materials.find((item) => item.id === "mat-disinfectant-glutaraldehyde");
const florfenicolLotAfterStocktake = stocktakeTransaction.lots.find((item) => item.id === "lot-flor-001");
const expiredLotAfterStocktake = stocktakeTransaction.lots.find((item) => item.id === "lot-prrs-001");
const stocktakeGainLot = stocktakeTransaction.lots.find((item) => item.materialId === "mat-tool-needle" && item.lotNo === "盘盈调整批次");
const disinfectantStocktakeLedger = stocktakeTransaction.ledgers.find((ledger) => ledger.materialId === "mat-disinfectant-glutaraldehyde");
if (
  disinfectantAfterStocktake?.negativeStockBase !== 0 ||
  florfenicolLotAfterStocktake?.remainingQtyBase !== 750 ||
  expiredLotAfterStocktake?.remainingQtyBase !== 120 ||
  stocktakeGainLot?.remainingQtyBase !== 3 ||
  stocktakeGainLot.expiryDate !== "" ||
  stocktakeGainLot.supplier !== undefined ||
  stocktakeGainLot.stocktakeAdjustmentType !== "盘盈库存" ||
  stocktakeTransaction.ledgers.length !== 3 ||
  !stocktakeTransaction.ledgers.every((ledger) => ledger.type === "盘点调整" && ledger.source === "盘点单 PD20260624001") ||
  disinfectantStocktakeLedger?.quantityText !== "+12L" ||
  disinfectantStocktakeLedger.afterStockText !== "0L" ||
  stocktakeTransaction.summary.adjustmentCount !== 3
) {
  throw new Error("盘点确认后应按物料总数生成调整：盘亏按 FEFO 扣批次，盘盈生成盘盈调整批次");
}

const expiredLossStocktakeTransaction = buildInventoryStocktakeTransaction({
  materials: inventorySeedMaterials,
  lots: inventorySeedLots,
  scopeRows: [
    {
      id: "stocktake-material-mat-vaccine-prrs",
      materialId: "mat-vaccine-prrs",
      materialName: "蓝耳二联疫苗",
      brand: "百利",
      category: "药品",
      medicineClass: "疫苗",
      bookQtyBase: 180,
      baseUnit: "头份",
      reason: "已过期",
      status: "可盘点"
    }
  ],
  actualQuantities: {
    "stocktake-material-mat-vaccine-prrs": 100
  },
  operator: "张三",
  stocktakeNo: "PD20260624003",
  occurredAt: "2026-06-24 13:00",
  ledgerIdPrefix: "ledger-stocktake-expired-loss"
});
const expiredLotAfterStocktakeLoss = expiredLossStocktakeTransaction.lots.find((lot) => lot.id === "lot-prrs-001");
if (
  expiredLotAfterStocktakeLoss?.remainingQtyBase !== 40 ||
  expiredLossStocktakeTransaction.ledgers.length !== 1 ||
  expiredLossStocktakeTransaction.ledgers[0].afterStockText !== "100头份"
) {
  throw new Error("过期批次未报废前应默认可继续使用，盘亏应按 FEFO 扣减过期批次");
}

const noReasonStocktakeTransaction = buildInventoryStocktakeTransaction({
  materials: inventorySeedMaterials,
  lots: inventorySeedLots,
  scopeRows: [
    {
      id: "stocktake-material-no-reason",
      materialId: "mat-drug-florfenicol",
      materialName: "氟苯尼考",
      brand: "A品牌",
      category: "药品",
      medicineClass: "兽药",
      bookQtyBase: 1850,
      baseUnit: "ml",
      reason: "临期",
      status: "可盘点"
    }
  ],
  actualQuantities: {
    "stocktake-material-no-reason": 1900
  },
  operator: "张三",
  stocktakeNo: "PD20260624002",
  occurredAt: "2026-06-24 12:00",
  ledgerIdPrefix: "ledger-stocktake-no-reason"
});
if (
  noReasonStocktakeTransaction.ledgers.length !== 1 ||
  noReasonStocktakeTransaction.ledgers[0].quantityText !== "+50ml" ||
  noReasonStocktakeTransaction.ledgers[0].remark
) {
  throw new Error("盘点只记录现场实数和库存差异，不应要求或保存差异原因");
}

const toleranceDifferences = buildInventoryStocktakeDifferences({
  scopeRows: [
    {
      id: "stocktake-material-tolerance-florfenicol",
      materialId: "mat-drug-florfenicol",
      materialName: "氟苯尼考",
      brand: "A品牌",
      category: "药品",
      medicineClass: "兽药",
      bookQtyBase: 1850,
      baseUnit: "ml",
      reason: "临期",
      status: "可盘点"
    }
  ],
  actualQuantities: {
    "stocktake-material-tolerance-florfenicol": 1852
  },
  operator: "张三",
  stocktakeNo: "PD20260624004",
  occurredAt: "2026-06-24 14:00",
  idPrefix: "diff-tolerance-test"
});
const toleranceResolution = resolveInventoryToleranceDifferences({
  differences: toleranceDifferences,
  materials: inventorySeedMaterials,
  lots: inventorySeedLots,
  ledgers: inventorySeedLedgers,
  operator: "系统",
  occurredAt: "2026-06-24 14:00",
  ledgerIdPrefix: "ledger-tolerance-test"
});
if (
  toleranceDifferences.length !== 1 ||
  !isInventoryDifferenceWithinTolerance(toleranceDifferences[0]) ||
  toleranceResolution.pendingDifferences.length !== 0 ||
  toleranceResolution.processedDifferences[0]?.method !== "任务出库多扣" ||
  toleranceResolution.ledgers[0]?.type !== "消耗冲销" ||
  toleranceResolution.ledgers[0]?.quantityText !== "+2ml" ||
  toleranceResolution.ledgers[0]?.lotNo !== "FL-202606-B"
) {
  throw new Error("兽药 2ml 盘盈应按最近使用批次自动回补，不需要用户选择批次");
}
const toleranceResolutionWithoutConsumptionLedger = resolveInventoryToleranceDifferences({
  differences: toleranceDifferences,
  materials: inventorySeedMaterials,
  lots: inventorySeedLots,
  operator: "系统",
  occurredAt: "2026-06-24 14:00",
  ledgerIdPrefix: "ledger-tolerance-missing-lot-test"
});
if (
  toleranceResolutionWithoutConsumptionLedger.pendingDifferences.length !== 1 ||
  toleranceResolutionWithoutConsumptionLedger.processedDifferences.length !== 0 ||
  toleranceResolutionWithoutConsumptionLedger.ledgers.length !== 0
) {
  throw new Error("容差内小盘盈找不到最近使用批次时，应进入盘点差异处理而不是自动新建盘盈批次");
}

const manualGainResolution = buildInventoryDifferenceResolution({
  record: { ...toleranceDifferences[0], diffBase: 50, actualQtyBase: 1900 },
  method: "任务出库多扣",
  materials: inventorySeedMaterials,
  lots: inventorySeedLots,
  ledgers: inventorySeedLedgers,
  operator: "当前用户",
  occurredAt: "2026-06-24 15:00",
  ledgerIdPrefix: "ledger-manual-gain-test"
});
if (
  manualGainResolution.ledgers[0]?.lotNo !== "FL-202606-B" ||
  !manualGainResolution.ledgers[0]?.remark?.includes("系统落批次 FL-202606-B")
) {
  throw new Error("人工处理盘盈时，应由系统按最近使用批次回补，不应要求用户选择批次");
}

const manualLossResolution = buildInventoryDifferenceResolution({
  record: {
    ...toleranceDifferences[0],
    diffBase: -5,
    actualQtyBase: 1845,
    direction: "盘亏"
  },
  method: "漏记任务出库",
  materials: inventorySeedMaterials,
  lots: inventorySeedLots,
  ledgers: inventorySeedLedgers,
  operator: "当前用户",
  occurredAt: "2026-06-24 15:05",
  ledgerIdPrefix: "ledger-manual-loss-test"
});
if (manualLossResolution.ledgers[0]?.lotNo !== "FL-202606-A") {
  throw new Error("人工处理盘亏时，应由系统按 FEFO 自动扣减批次");
}

const manualSupplementInboundResolution = buildInventoryDifferenceResolution({
  record: { ...toleranceDifferences[0], diffBase: 50, actualQtyBase: 1900 },
  method: "入库少录补金额",
  materials: inventorySeedMaterials,
  lots: inventorySeedLots,
  ledgers: inventorySeedLedgers,
  supplementAmount: 25,
  operator: "当前用户",
  occurredAt: "2026-06-24 15:10",
  ledgerIdPrefix: "ledger-manual-supplement-inbound-test"
});
if (
  manualSupplementInboundResolution.ledgers[0]?.lotNo !== "FL-202606-B" ||
  manualSupplementInboundResolution.lots.some((lot) => lot.lotNo === "补录入库批次")
) {
  throw new Error("补录入库数量和金额也应由系统补到既有批次，不应新增补录入库批次");
}

const scrapTransaction = buildInventoryScrapTransaction({
  materials: inventorySeedMaterials,
  lots: inventorySeedLots,
  lotId: "lot-prrs-001",
  scrapQuantity: 120,
  reason: "过期/变质",
  handlingMethod: "无害化处理",
  photoNote: "photo-prrs-001.jpg",
  operator: "李静",
  occurredAt: "2026-06-24 11:20",
  ledgerId: "ledger-scrap-test"
});
const lotAfterScrap = scrapTransaction.lots.find((lot) => lot.id === "lot-prrs-001");
if (
  lotAfterScrap?.remainingQtyBase !== 0 ||
  lotAfterScrap.status !== "已耗尽" ||
  scrapTransaction.ledger.type !== "报废" ||
  scrapTransaction.ledger.quantityText !== "-120头份" ||
  scrapTransaction.ledger.afterStockText !== "0头份" ||
  scrapTransaction.ledger.remark !== "报废原因：过期/变质；处理方式：无害化处理；照片留档：photo-prrs-001.jpg"
) {
  throw new Error("过期报废确认后应扣减批次库存、关闭过期风险，并生成流水类型为报废的库存流水");
}

const { readFileSync } = await Function("specifier", "return import(specifier)")("node:fs");
const appSource = readFileSync(new URL("../../App.tsx", import.meta.url), "utf8");
const consoleInventorySource = readFileSync(new URL("./ConsoleInventoryPage.tsx", import.meta.url), "utf8");
const mobileInventorySource = readFileSync(new URL("./MobileInventoryToolsPage.tsx", import.meta.url), "utf8");
const inventoryDataSource = readFileSync(new URL("./inventoryData.ts", import.meta.url), "utf8");
const sparklineSource = readFileSync(new URL("./Sparkline.tsx", import.meta.url), "utf8");
const batchReceivePanelSource = readFileSync(new URL("./BatchReceivePanel.tsx", import.meta.url), "utf8");
const batchReceiveInlineNewMaterialSource = readFileSync(new URL("./BatchReceiveInlineNewMaterial.tsx", import.meta.url), "utf8");
const batchReceiveNewMaterialModalSource = readFileSync(new URL("./BatchReceiveNewMaterialModal.tsx", import.meta.url), "utf8");
const materialProfileFieldsSource = readFileSync(new URL("./MaterialProfileFields.tsx", import.meta.url), "utf8");
const inventoryStyleSource = readFileSync(new URL("../../styles.css", import.meta.url), "utf8");

if (
  consoleInventorySource.includes("确认删除物料") ||
  consoleInventorySource.includes("物料已删除") ||
  consoleInventorySource.includes("deleteMaterial") ||
  consoleInventorySource.includes("删除物料")
) {
  throw new Error("库存物料不开放删除入口，应通过停用/启用保留历史数据");
}

if (
  consoleInventorySource.includes("inventory-dashboard-summary") ||
  consoleInventorySource.includes("inventory-overview-summary")
) {
  throw new Error("库存首页上方不应继续保留库存概览摘要卡片，应直接展示库存风险");
}

const materialDetailBaseInfoSource = consoleInventorySource.slice(
  consoleInventorySource.indexOf("const baseInfoItems"),
  consoleInventorySource.indexOf("const selectedMaterialStatus")
);
if (
  !materialDetailBaseInfoSource.includes('label: "物料名称(中文)"') ||
  !materialDetailBaseInfoSource.includes('label: "物料名称(英文)"') ||
  !materialDetailBaseInfoSource.includes('label: "品牌名称(中文)"') ||
  !materialDetailBaseInfoSource.includes('label: "品牌名称(英文)"') ||
  !materialDetailBaseInfoSource.includes('label: "物料类型"') ||
  !materialDetailBaseInfoSource.includes('label: "核算单位"') ||
  !materialDetailBaseInfoSource.includes('label: "单位换算"') ||
  !materialDetailBaseInfoSource.includes("formatMaterialUnitConversions(selectedMaterial)") ||
  !consoleInventorySource.includes("function formatMaterialUnitConversions")
) {
  throw new Error("物料详情基础信息必须逐项展示添加物料时采集的通用档案字段和单位换算");
}

const financeAnalyticsSource = consoleInventorySource.slice(
  consoleInventorySource.indexOf("const renderFinanceAnalyticsCards"),
  consoleInventorySource.indexOf("const renderInventoryRiskCard")
);
const inventoryHomeSource = consoleInventorySource.slice(
  consoleInventorySource.lastIndexOf('return (\n    <div className="inventory-console-page">')
);
const inventorySummaryColumnsSource = consoleInventorySource.slice(
  consoleInventorySource.indexOf("const summaryColumns"),
  consoleInventorySource.indexOf("const materialLotColumns")
);
const feedAvailableDaysRenderSource = consoleInventorySource.slice(
  consoleInventorySource.indexOf("function renderFeedEstimatedAvailableDaysText"),
  consoleInventorySource.indexOf("function resolveInventoryStockHealth")
);

if (
  !inventorySummaryColumnsSource.includes('title: "物料名称"') ||
  inventorySummaryColumnsSource.includes('title: "品牌"')
) {
  throw new Error("库存首页物料列表不应展示独立品牌列，品牌只保留在物料名称下方");
}

if (inventorySummaryColumnsSource.includes("openEditMaterial(row.materialId)")) {
  throw new Error("库存首页物料列表操作列不应展示编辑按钮；编辑入口保留在物料详情页");
}

if (
  !inventorySummaryColumnsSource.includes('title: "库存趋势"') ||
  !inventorySummaryColumnsSource.includes('dataIndex: "stockTrend"') ||
  !inventorySummaryColumnsSource.includes('defaultSortOrder: "descend"') ||
  !inventorySummaryColumnsSource.includes("renderInventoryStockTrend(row)") ||
  !consoleInventorySource.includes("resolveInventoryUsageTrendKind") ||
  !consoleInventorySource.includes("resolveInventoryStockTrendKind") ||
  !consoleInventorySource.includes("inventoryUsageTrendColors") ||
  !consoleInventorySource.includes("inventoryStockTrendColors") ||
  !consoleInventorySource.includes('<Sparkline') ||
  !inventoryDataSource.includes("buildInventoryMonthlyUsage") ||
  !inventoryDataSource.includes("buildInventoryStockTrend") ||
  !sparklineSource.includes("tooltipStatsData") ||
  !inventoryStyleSource.includes(".inventory-usage-cell") ||
  !inventoryStyleSource.includes(".sparkline__line") ||
  !inventoryStyleSource.includes(".sparkline-tooltip-popover .ant-tooltip-inner") ||
  !inventoryStyleSource.includes("background: #ffffff") ||
  !sparklineSource.includes("export const Sparkline = memo") ||
  !sparklineSource.includes('overlayClassName="sparkline-tooltip-popover"') ||
  !sparklineSource.includes("<polyline") ||
  sparklineSource.includes("趋势：") ||
  sparklineSource.includes("canvas")
) {
  throw new Error("库存列表应展示库存趋势列，使用库存结存 Sparkline，Tooltip 保留近30天使用统计且不展示趋势字段");
}

if (
  !appSource.includes('key: "finance"') ||
  !appSource.includes('label: "财务"') ||
  !appSource.includes('key: "finance-analysis"') ||
  !appSource.includes('label: "财务分析"') ||
  !appSource.includes('activeModule={activeKey === "finance-analysis" ? "finance" : "inventory"}') ||
  !appSource.includes("financeBootstrapView")
) {
  throw new Error("Console 导航应新增财务板块，并通过财务分析菜单进入库存财务图表页");
}

if (
  !consoleInventorySource.includes('type ConsoleInventoryModule = "inventory" | "finance"') ||
  !consoleInventorySource.includes('if (inventoryView === "finance")') ||
  !consoleInventorySource.includes("finance-analysis-page") ||
  !financeAnalyticsSource.includes("库存金额占比") ||
  !financeAnalyticsSource.includes("库存消耗趋势") ||
  !financeAnalyticsSource.includes("本月消耗金额 Top 物料") ||
  !financeAnalyticsSource.includes("finance-analysis-grid") ||
  !financeAnalyticsSource.includes("<InventoryTrendChart") ||
  !consoleInventorySource.includes("inventory-trend-chart") ||
  !inventoryStyleSource.includes(".finance-analysis-grid")
) {
  throw new Error("库存金额占比、Top 物料、库存消耗趋势应迁移到财务分析页，并使用独立财务图表布局");
}

const financePageSource = consoleInventorySource.slice(
  consoleInventorySource.indexOf('if (inventoryView === "finance")'),
  consoleInventorySource.indexOf('if (inventoryView === "batch-receive")')
);

if (
  !financePageSource.includes('icon={<ExportOutlined />} onClick={openOutboundExecution}') ||
  !financePageSource.includes("出库") ||
  !financePageSource.includes(">盘点差异</Button>") ||
  !financePageSource.includes("inventory-difference-banner")
) {
  throw new Error("出库、盘点差异入口与待处理提示应迁移到财务分析页");
}

if (
  inventoryHomeSource.includes("onClick={openOutboundExecution}") ||
  inventoryHomeSource.includes(">盘点差异</Button>") ||
  inventoryHomeSource.includes("inventory-difference-banner")
) {
  throw new Error("库存首页不应展示出库、盘点差异按钮与待处理提示条");
}

if (
  !inventoryHomeSource.includes("renderInventoryRiskCard()") ||
  inventoryHomeSource.includes("库存金额占比") ||
  inventoryHomeSource.includes("库存消耗趋势") ||
  inventoryHomeSource.includes("本月消耗金额 Top 物料")
) {
  throw new Error("库存首页不应继续展示财务图表，只保留库存风险和库存列表");
}

if (
  !consoleInventorySource.includes("FeedStockTrendChart") ||
  !consoleInventorySource.includes("饲料库存余量趋势") ||
  !consoleInventorySource.includes("feedStockTrendPoints") ||
  !consoleInventorySource.includes("feedStockAvailableDays") ||
  !consoleInventorySource.includes("openFeedTrendLedgerDate") ||
  !consoleInventorySource.includes("setLedgerDateRange([date, date])") ||
  !consoleInventorySource.includes("data-feed-trend-date") ||
  !inventoryHomeSource.includes("inventory-home-health-grid") ||
  !inventoryHomeSource.includes("renderFeedStockTrendCard()") ||
  !inventoryHomeSource.includes("renderInventoryRiskCard()") ||
  !inventoryStyleSource.includes(".inventory-home-health-grid") ||
  !inventoryStyleSource.includes("grid-template-columns: minmax(0, 2fr) minmax(300px, 1fr)") ||
  !inventoryStyleSource.includes("align-items: start") ||
  !inventoryStyleSource.includes("max-height: 360px") ||
  !inventoryStyleSource.includes(".feed-stock-trend-chart__dot.is-drop") ||
  !inventoryStyleSource.includes(".feed-stock-trend-chart__hit-area") ||
  !inventoryStyleSource.includes(".feed-stock-trend-chart__cursor") ||
  !inventoryDataSource.includes('id: "ledger-018"') ||
  !inventoryDataSource.includes('id: "ledger-feed-ges-07"')
) {
  throw new Error("库存首页应新增饲料库存余量趋势，展示近30天EOD余量、异常点，并支持点击日期跳转库存流水筛选");
}

if (consoleInventorySource.includes("本月消耗趋势")) {
  throw new Error("消耗趋势图应统一命名为库存消耗趋势，不应再保留本月消耗趋势旧文案");
}

if (
  !consoleInventorySource.includes("inventoryAnalyticsTimeRangeOptions") ||
  !consoleInventorySource.includes('["近7天", "近30天", "本月", "上月", "自定义"]') ||
  !consoleInventorySource.includes("setAnalyticsTimeRange(item)")
) {
  throw new Error("库存消耗趋势应支持近7天、近30天、本月、上月、自定义时间范围筛选");
}

if (!consoleInventorySource.includes('useState<InventoryAnalyticsTimeRange>("本月")')) {
  throw new Error("库存消耗趋势时间范围默认应为本月");
}

if (
  !consoleInventorySource.includes("inventory-risk-row__side") ||
  !inventoryStyleSource.includes(".inventory-analytics-card--risk .inventory-risk-row__side")
) {
  throw new Error("库存风险卡片中的数值和操作按钮应收敛到同一行右侧区块，避免单条风险占用过高页面高度");
}

if (
  !consoleInventorySource.includes("inventoryAnalyticsCategoryFilterOptions") ||
  !consoleInventorySource.includes('setAnalyticsCategoryFilter(item)') ||
  !consoleInventorySource.includes('["全部", ...inventoryAmountChartCategories]') ||
  !consoleInventorySource.includes("setAnalyticsCategoryFilter(analyticsCategoryFilter === row.category ? \"全部\" : row.category)") ||
  !consoleInventorySource.includes('aria-pressed={analyticsCategoryFilter === row.category}') ||
  !inventoryStyleSource.includes(".inventory-analytics-share-row.is-active")
) {
  throw new Error("库存金额占比点击分类后，应联动库存消耗趋势和 Top 物料的分类筛选，并支持再次点击取消");
}

if (!consoleInventorySource.includes("inventory-risk-filter-tags")) {
  throw new Error("库存概览风险筛选标签应收敛到库存风险标题右侧");
}

if (consoleInventorySource.includes("查看全部风险")) {
  throw new Error("库存风险标题右侧不应继续展示查看全部风险按钮");
}

if (consoleInventorySource.includes("按负库存、过期、临期、低库存排序")) {
  throw new Error("库存风险标题旁不应展示排序说明文案");
}

const hiddenHomepageDescriptions = [
  "统一金额口径，方便场长快速看清库存资金占用",
  "主要花费在哪些物资上",
  "按风险优先级集中查看待处理物料",
  "按日查看消耗金额波动，比单个汇总数字更适合做经营判断"
];
if (hiddenHomepageDescriptions.some((description) => consoleInventorySource.includes(description))) {
  throw new Error("库存首页经营分析卡片标题下不应展示解释性描述文案");
}

const legacyRiskTitle = `风险物料${"TOP"}`;
const legacyActionHint = `今天优先处理${"的问题"}`;
if (consoleInventorySource.includes(legacyRiskTitle) || consoleInventorySource.includes(legacyActionHint)) {
  throw new Error("库存首页不应继续展示旧风险标题或旧待办说明文案");
}

if (consoleInventorySource.includes("inventory-overview-metrics")) {
  throw new Error("库存概览不应继续使用嵌套的库存核心指标卡片");
}

if (inventoryStyleSource.includes(".inventory-dashboard-section + .inventory-dashboard-section")) {
  throw new Error("库存概览不应继续使用三列硬分割线样式");
}

if (consoleInventorySource.includes("差异原因")) {
  throw new Error("盘点执行、确认和详情页不应再展示差异原因字段");
}

if (
  !consoleInventorySource.includes("inventory-detail-workspace") ||
  !consoleInventorySource.includes("库存概览") ||
  !consoleInventorySource.includes("库存趋势") ||
  !consoleInventorySource.includes("inventorySummaryItems") ||
  !consoleInventorySource.includes("MaterialStockTrendChart") ||
  !consoleInventorySource.includes("materialTrendRange") ||
  !consoleInventorySource.includes("selectedMaterialTrendPoints") ||
  !inventoryStyleSource.includes(".inventory-summary-strip") ||
  !inventoryStyleSource.includes(".material-stock-trend-chart")
) {
  throw new Error("物料详情页应改为连续 Workspace，并新增库存概览与库存趋势模块");
}

const materialDetailSource = consoleInventorySource.slice(
  consoleInventorySource.indexOf('if (inventoryView === "detail" && selectedSummary && selectedMaterial)'),
  consoleInventorySource.indexOf('if (inventoryView === "purchase-order-draft")')
);
if (
  materialDetailSource.includes("安全库存") ||
  materialDetailSource.includes("safetyStock={selectedSummary.safetyStockBase}") ||
  materialDetailSource.includes('label: "安全库存"')
) {
  throw new Error("物料详情页不应展示安全库存，也不应在详情趋势图中展示安全库存线");
}

if (
  consoleInventorySource.includes("usageRecordColumns") ||
  consoleInventorySource.includes("inventory-analysis-table") ||
  consoleInventorySource.includes("关联业务与消耗分析") ||
  consoleInventorySource.includes("selectedConsumptionBreakdown") ||
  consoleInventorySource.includes("selectedRecentConsumptionLedgers")
) {
  throw new Error("物料详情页详情 Tab 不应继续展示完整消耗分析模块，完整明细由库存流水 Tab 承载");
}

if (
  consoleInventorySource.includes("setOutboundOpen") ||
  consoleInventorySource.includes('title="出库"') ||
  consoleInventorySource.includes("outboundForm") ||
  consoleInventorySource.includes("selectedOutboundMaterial") ||
  !consoleInventorySource.includes('inventoryView === "outbound-execute"') ||
  !consoleInventorySource.includes('inventoryView === "outbound-confirm"') ||
  !consoleInventorySource.includes('inventoryView === "outbound-detail"') ||
  !consoleInventorySource.includes("<Title level={3}>出库</Title>") ||
  !consoleInventorySource.includes("<Title level={3}>出库清单</Title>") ||
  !consoleInventorySource.includes("<Title level={3}>出库单详情</Title>") ||
  !consoleInventorySource.includes("outboundScopeRows") ||
  !consoleInventorySource.includes("outboundSelectedRows") ||
  !consoleInventorySource.includes("outboundQuantities") ||
  !consoleInventorySource.includes("confirmOutboundOrder") ||
  !consoleInventorySource.includes("出库单已生成")
) {
  throw new Error("出库应从单物料弹窗升级为批量出库页、出库清单和出库单详情");
}

if (consoleInventorySource.includes("出库已完成，系统已补齐批次、领用人与出库日期")) {
  throw new Error("出库结果提示不应把系统补齐批次、领用人、出库日期等内部逻辑展示给用户");
}

if (!consoleInventorySource.includes('parseLedgerQuantity(row.quantityText) < 0 ? "物料级负库存" : "物料级调整"')) {
  throw new Error("库存流水无批次列应区分负库存流水和正向物料级调整，避免盘盈调整误显示为物料级负库存");
}

if (
  consoleInventorySource.includes("inventory-stocktake-addbar") ||
  consoleInventorySource.includes("添加物料") ||
  consoleInventorySource.includes("stocktakeAddMaterialId") ||
  consoleInventorySource.includes("手动搜索并选择需要盘点的物料")
) {
  throw new Error("指定物料盘点范围页不应再让用户逐个搜索添加物料");
}

if (
  consoleInventorySource.includes("rowSelection={stocktakeScopeRowSelection}") ||
  consoleInventorySource.includes("stocktakeScopeSelectedRowIds") ||
  consoleInventorySource.includes("stocktakeStartOpen") ||
  consoleInventorySource.includes("发起盘点弹窗") ||
  consoleInventorySource.includes("<Title level={3}>确认盘点范围</Title>") ||
  !consoleInventorySource.includes("<Title level={3}>库存盘点</Title>") ||
  !consoleInventorySource.includes("<Title level={3}>盘点清单</Title>") ||
  !consoleInventorySource.includes("stocktakeScopeCategory") ||
  !consoleInventorySource.includes('title: "名称"') ||
  !consoleInventorySource.includes('title: "分类"') ||
  !consoleInventorySource.includes('title: "品牌"') ||
  consoleInventorySource.includes('title: "规格"') ||
  consoleInventorySource.includes("resolveStocktakeMaterialSpec") ||
  !consoleInventorySource.includes('title: "当前库存"') ||
  !consoleInventorySource.includes('title: "盘点库存"') ||
  !consoleInventorySource.includes('title: "近30天使用"') ||
  !consoleInventorySource.includes('placeholder="不调整"') ||
  !consoleInventorySource.includes("stocktakeRiskMap") ||
  !consoleInventorySource.includes("stocktakeRiskFilter") ||
  !consoleInventorySource.includes('\"负库存\", \"临期\", \"已过期\"') ||
  !consoleInventorySource.includes("renderStocktakeCurrentStock(row)") ||
  !consoleInventorySource.includes("buildStocktakeRiskLines") ||
  !consoleInventorySource.includes("inventory-stocktake-current__risks") ||
  !consoleInventorySource.includes("renderStocktakeRecentChangesTooltip") ||
  !consoleInventorySource.includes("最近库存变化")
) {
  throw new Error("发起盘点应直接进入全量物料盘点页，并支持搜索、分类/异常筛选、排序、异常数量、近30天使用和盘点库存输入；盘点页不应展示规格字段");
}

const stocktakeNameColumnIndex = consoleInventorySource.indexOf('title: "名称"', consoleInventorySource.indexOf("stocktakeExecuteColumns"));
const stocktakeCategoryColumnIndex = consoleInventorySource.indexOf('title: "分类"', stocktakeNameColumnIndex);
const stocktakeBrandColumnIndex = consoleInventorySource.indexOf('title: "品牌"', stocktakeNameColumnIndex);
if (
  stocktakeNameColumnIndex === -1 ||
  stocktakeCategoryColumnIndex === -1 ||
  stocktakeBrandColumnIndex === -1 ||
  !(stocktakeNameColumnIndex < stocktakeCategoryColumnIndex && stocktakeCategoryColumnIndex < stocktakeBrandColumnIndex)
) {
  throw new Error("库存盘点页分类列应放在名称后、品牌前");
}

if (
  !consoleInventorySource.includes("function InventoryInboundDetail") ||
  consoleInventorySource.includes("InventoryInboundTimeline") ||
  consoleInventorySource.includes('className="inventory-inbound-log"') ||
  consoleInventorySource.includes('className="inventory-inbound-detail-section__title">操作记录') ||
  consoleInventorySource.includes('className="inventory-inbound-detail-section__title">基本信息') ||
  consoleInventorySource.includes('className="inventory-inbound-descriptions"') ||
  !consoleInventorySource.includes('className="inventory-inbound-remark"') ||
  !consoleInventorySource.includes('className="inventory-inbound-remark__text"') ||
  !consoleInventorySource.includes("resolveInventoryInboundTotalAmount(record)") ||
  !consoleInventorySource.includes('className="inventory-inbound-total"') ||
  !consoleInventorySource.includes('className="inventory-inbound-item-count"') ||
  !consoleInventorySource.includes('className="inventory-inbound-material-total"') ||
  !consoleInventorySource.includes("备注：${remark}") ||
  !inventoryStyleSource.includes(".inventory-inbound-remark__text") ||
  !inventoryStyleSource.includes("text-overflow: ellipsis") ||
  !inventoryStyleSource.includes(".inventory-inbound-total") ||
  !inventoryStyleSource.includes(".inventory-inbound-item-count") ||
  !inventoryStyleSource.includes(".inventory-inbound-material-total")
) {
  throw new Error("入库单 Header 应展示备注、入库总金额和物料项数，展开详情不应展示操作记录或基本信息模块，并需同步展示总金额");
}

const inboundOrderPageSource = consoleInventorySource.slice(
  consoleInventorySource.indexOf("function InventoryInboundHeader"),
  consoleInventorySource.indexOf("function formatMonthDay")
);
const inboundOrderTypeSource = inventoryDataSource.slice(
  inventoryDataSource.indexOf("export type InventoryInboundOrder"),
  inventoryDataSource.indexOf("export type InventoryAlert")
);
if (
  !inboundOrderPageSource.includes("inventory-inbound-material-count") ||
  inboundOrderPageSource.includes("warehouseFilter") ||
  inboundOrderPageSource.includes("warehouseOptions") ||
  inboundOrderPageSource.includes("onWarehouseFilterChange") ||
  inboundOrderPageSource.includes('Descriptions.Item label="仓库"') ||
  inboundOrderPageSource.includes("record.warehouse") ||
  inboundOrderPageSource.includes("record.totalQuantity") ||
  inboundOrderPageSource.includes("record.totalUnit") ||
  inboundOrderPageSource.includes("record.totalItems") ||
  inboundOrderPageSource.includes("inventory-inbound-summary") ||
  inboundOrderPageSource.includes("inventory-inbound-stat-grid") ||
  inboundOrderPageSource.includes("入库统计") ||
  inboundOrderPageSource.includes("新增批次") ||
  inboundOrderPageSource.includes("涉及仓库") ||
  inboundOrderTypeSource.includes("warehouse:") ||
  inboundOrderTypeSource.includes("totalQuantity:") ||
  inboundOrderTypeSource.includes("totalUnit:") ||
  inboundOrderTypeSource.includes("totalItems:")
) {
  throw new Error("入库单页面不应展示仓库、单据级汇总数量或入库统计；Header 和明细底部可展示物料项数与入库总金额");
}

const inboundOrderSeedSource = inventoryDataSource.slice(
  inventoryDataSource.indexOf("const inventoryInboundTypes"),
  inventoryDataSource.indexOf("export const inventorySeedCheckRecords")
);
if (
  inventoryDataSource.includes("InventoryInboundOrderStatus") ||
  inboundOrderTypeSource.includes("status:") ||
  inboundOrderTypeSource.includes("createTime:") ||
  inboundOrderTypeSource.includes("finishTime:") ||
  inboundOrderTypeSource.includes("logs:") ||
  inboundOrderTypeSource.includes("supplier: string;") ||
  inboundOrderPageSource.includes("InventoryInboundStatusTag") ||
  inboundOrderPageSource.includes("record.status") ||
  inboundOrderPageSource.includes("statusFilter") ||
  inboundOrderPageSource.includes('Descriptions.Item label="状态"') ||
  inboundOrderPageSource.includes('Descriptions.Item label="供应商"') ||
  inboundOrderPageSource.includes('Descriptions.Item label="创建时间"') ||
  inboundOrderPageSource.includes('Descriptions.Item label="完成时间"') ||
  inboundOrderPageSource.includes('title: "批次号"') ||
  inboundOrderPageSource.includes('title: "生产日期"') ||
  inboundOrderPageSource.includes('title: "有效期"') ||
  inboundOrderTypeSource.includes("batchNo:") ||
  inboundOrderTypeSource.includes("productionDate:") ||
  inboundOrderTypeSource.includes("expireDate:") ||
  !inboundOrderPageSource.includes('title: "总金额"') ||
  !inboundOrderPageSource.includes('title: "保质期至"') ||
  !inboundOrderPageSource.includes('title: "供应商"') ||
  !inboundOrderPageSource.includes('title: "供应商电话"') ||
  !inboundOrderPageSource.includes('className="inventory-inbound-time"') ||
  inboundOrderSeedSource.includes("退货入库") ||
  inboundOrderSeedSource.includes("调拨入库") ||
  inboundOrderSeedSource.includes("其它")
) {
  throw new Error("入库单应只展示采购入库/盘盈入库，不展示状态机；明细字段应对齐入库录入字段，不能展示未录入的批次号、生产日期或旧有效期列");
}

const inboundOrderTypes = new Set(inventorySeedInboundOrders.map((order) => order.type));
if (
  inboundOrderTypes.size !== 2 ||
  !inboundOrderTypes.has("采购入库") ||
  !inboundOrderTypes.has("盘盈入库") ||
  inventorySeedInboundOrders.some((order) =>
    "status" in order ||
    "supplier" in order ||
    "createTime" in order ||
    "finishTime" in order ||
    order.details.some((detail) =>
      "batchNo" in detail ||
      "productionDate" in detail ||
      "expireDate" in detail ||
      detail.totalAmount <= 0 ||
      !detail.expiryDate ||
      !detail.supplier
    )
  )
) {
  throw new Error("入库单 mock 数据应只保留已发生入库单据和用户录入/物料档案可解释字段");
}

const currentStockColumnBlocks = consoleInventorySource
  .split('title: "当前库存"')
  .slice(1)
  .map((block) => block.slice(0, 420));
if (
  currentStockColumnBlocks.length === 0 ||
  !consoleInventorySource.includes("formatInventoryQtyWithPackage") ||
  !consoleInventorySource.includes("renderInventoryStockHealth(row, feedAvailableDaysMap.get(row.materialId), materialMap.get(row.materialId))") ||
  !consoleInventorySource.includes("resolveInventorySummaryStockHealth") ||
  !consoleInventorySource.includes("inventory-stock-health__bar") ||
  !consoleInventorySource.includes("formatInventoryQty(row.bookQtyBase, row.baseUnit)") ||
  !inventoryDataSource.includes("export function formatInventoryQtyWithPackage") ||
  !inventoryStyleSource.includes(".inventory-stock-health__bar") ||
  !inventoryStyleSource.includes("width: 112px") ||
  !inventoryStyleSource.includes("height: 6px") ||
  !inventoryStyleSource.includes("background: #e5e7eb") ||
  !inventoryStyleSource.includes(".inventory-stock-health__fill") ||
  !inventoryStyleSource.includes("background: #ef4444")
) {
  throw new Error("当前库存列应展示线性 Health Bar 和换算后的库存数量，并在括号内保留核算单位库存");
}

if (
  consoleInventorySource.includes('["全部盘点", "盘点全部启用物料。"]') ||
  mobileInventorySource.includes('{ mode: "全部盘点"') ||
  inventoryDataSource.includes('"全部盘点"')
) {
  throw new Error("盘点方式不应再提供全部盘点；指定物料盘点全选即代表全部盘点");
}

if (
  consoleInventorySource.includes('title="采购入库"') ||
  consoleInventorySource.includes("setReceiveOpen") ||
  consoleInventorySource.includes("submitReceive") ||
  consoleInventorySource.includes("openReceiveForMaterial") ||
  consoleInventorySource.includes("新建物料「") ||
  consoleInventorySource.includes("重新支持采购入库和新任务选择")
) {
  throw new Error("库存首页不应保留旧单笔采购入库弹窗、后续快建流程或旧入口文案");
}

if (
  !consoleInventorySource.includes('inventoryView === "batch-receive"') ||
  !consoleInventorySource.includes("<Title level={3}>入库</Title>") ||
  !consoleInventorySource.includes("BatchReceivePanel") ||
  consoleInventorySource.includes("入库2") ||
  consoleInventorySource.includes("<Title level={3}>批量入库</Title>")
) {
  throw new Error("库存首页应只保留一个入库入口，并进入原批量入库页且统一命名为入库");
}

if (
  !consoleInventorySource.includes("selectedPurchaseMaterialIds") ||
  !consoleInventorySource.includes("rowSelection={{") ||
  !consoleInventorySource.includes("preserveSelectedRowKeys: true") ||
  !consoleInventorySource.includes("selectedPurchaseMaterialIds.length > 0") ||
  !consoleInventorySource.includes("生成采购单") ||
  !consoleInventorySource.includes("确认生成采购单") ||
  !consoleInventorySource.includes('inventoryView === "purchase-order-draft"') ||
  !consoleInventorySource.includes('inventoryView === "purchase-order-detail"') ||
  !consoleInventorySource.includes("buildPurchaseOrderExcelXml") ||
  !consoleInventorySource.includes("downloadPurchaseOrderExcel") ||
  !consoleInventorySource.includes("导出 Excel") ||
  !consoleInventorySource.includes("resolveInventoryLastPurchaseInfo") ||
  !consoleInventorySource.includes("已默认复用上次入库数量") ||
  !consoleInventorySource.includes('title: "当前库存余量"') ||
  !consoleInventorySource.includes('title: "预计可用天数"') ||
  !consoleInventorySource.includes("buildFeedEstimatedAvailableDays(currentStockBase, materialId") ||
  consoleInventorySource.includes("purchaseOrderOpen") ||
  !inventoryStyleSource.includes(".inventory-table-toolbar--with-actions") ||
  !inventoryStyleSource.includes(".inventory-purchase-order-table") ||
  !inventoryStyleSource.includes(".inventory-purchase-document")
) {
  throw new Error("库存首页物料列表应支持跨分类多选，并通过采购单编辑页生成可截图、可导出 Excel 的采购单据");
}

if (
  inventoryDataSource.includes('key: "applicableStages"') ||
  materialProfileFieldsSource.includes('name={[field.name, "pigType"]}') ||
  materialProfileFieldsSource.includes('name={[field.name, "phases"]}')
) {
  throw new Error("饲料物料档案不再维护适用猪只与阶段字段");
}

if (
  !consoleInventorySource.includes('if (analyticsCategoryFilter === "全部")') ||
  !consoleInventorySource.includes("isCategorySummary") ||
  !consoleInventorySource.includes("饲料消耗重量") ||
  consoleInventorySource.includes("消耗天数") ||
  !inventoryDataSource.includes('materialName: "头孢"')
) {
  throw new Error("财务分析 Top 物料应默认按物料类型汇总、分类筛选后按具体物料展示，并用饲料消耗重量替代消耗天数");
}

if (
  !consoleInventorySource.includes("resolveRiskAdviceText") ||
  !consoleInventorySource.includes("inventory-risk-row__title") ||
  !consoleInventorySource.includes("item.valueText") ||
  consoleInventorySource.includes("item.impactText") ||
  !inventoryDataSource.includes("formatInventoryRiskQuantityDisplay") ||
  !inventoryStyleSource.includes(".inventory-risk-row__title span") ||
  inventoryStyleSource.includes(".inventory-risk-row__value small") ||
  !inventoryDataSource.includes('expiryDate: "2026-07-03"')
) {
  throw new Error("库存风险行应把品牌弱化到物料名旁，并以数量（占比）简洁展示风险规模");
}

if (
  batchReceivePanelSource.includes("存放位置") ||
  batchReceivePanelSource.includes("storageLocation") ||
  batchReceivePanelSource.includes("defaultWarehouseOptions") ||
  batchReceivePanelSource.includes("请选择入库仓库") ||
  batchReceivePanelSource.includes("规格与包装") ||
  batchReceivePanelSource.includes("BatchReceivePackageField") ||
  batchReceiveInlineNewMaterialSource.includes('label="核算单位"') ||
  batchReceiveInlineNewMaterialSource.includes("请选择核算单位")
) {
  throw new Error("入库页不应再要求用户填写位置、规格与包装或物料信息核算单位");
}

if (
  !batchReceiveInlineNewMaterialSource.includes("单位换算") ||
  !batchReceiveInlineNewMaterialSource.includes("增加换算规则") ||
  !batchReceiveInlineNewMaterialSource.includes("BatchReceiveUnitConversionFields") ||
  !batchReceiveInlineNewMaterialSource.includes("packageConversions") ||
  !inventoryDataSource.includes("validateBatchUnitConversions") ||
  !inventoryDataSource.includes("饲料必须填写 1吨 = xxL 的单位换算。") ||
  !inventoryDataSource.includes('饲料: ["吨", "kg", "L"]') ||
  !inventoryStyleSource.includes("inventory-batch-unit-conversion")
) {
  throw new Error("入库新建物料必须提供必填单位换算，饲料必须强制维护 1吨 = xxL");
}

if (
  !batchReceiveInlineNewMaterialSource.includes('label="物料名称(英文)"') ||
  !batchReceiveInlineNewMaterialSource.includes('label="品牌名称(英文)"') ||
  batchReceiveInlineNewMaterialSource.includes('label="物料名称(英文)"\n        rules=') ||
  batchReceiveInlineNewMaterialSource.includes('label="品牌名称(英文)"\n        rules=') ||
  inventoryDataSource.includes("请填写物料名称(英文)") ||
  inventoryDataSource.includes("请填写品牌名称(英文)")
) {
  throw new Error("入库新建物料时，物料名称英文和品牌名称英文应为选填");
}

const newMaterialOptionalFieldsIndex = batchReceiveNewMaterialModalSource.indexOf("<BatchReceiveInlineNewMaterialOptional");
const newMaterialToggleIndex = batchReceiveNewMaterialModalSource.indexOf("inventory-batch-new-material-modal__toggle");
const mobileOptionalFieldsIndex = mobileInventorySource.indexOf("<BatchReceiveInlineNewMaterialOptional");
const mobileOptionalToggleIndex = mobileInventorySource.indexOf('className="mv-inventory-link-toggle"', mobileOptionalFieldsIndex);
if (
  !batchReceiveNewMaterialModalSource.includes("useState(true)") ||
  !batchReceiveNewMaterialModalSource.includes("setOptionalExpanded(true)") ||
  !inventoryDataSource.includes("optionalExpanded: true") ||
  newMaterialOptionalFieldsIndex === -1 ||
  newMaterialToggleIndex === -1 ||
  newMaterialOptionalFieldsIndex > newMaterialToggleIndex ||
  mobileOptionalFieldsIndex === -1 ||
  mobileOptionalToggleIndex === -1 ||
  mobileOptionalFieldsIndex > mobileOptionalToggleIndex ||
  !mobileInventorySource.includes("optionalExpanded: trimmed ? (!matched && !entry.newMaterialForm ? true : entry.optionalExpanded) : false")
) {
  throw new Error("入库新建物料选填信息应默认展开，收起/展开按钮应放在选填字段下方");
}

if (
  !batchReceivePanelSource.includes("添加物料") ||
  !batchReceivePanelSource.includes("inventory-batch-workspace") ||
  !batchReceivePanelSource.includes("inventory-batch-add-material") ||
  batchReceivePanelSource.includes("inventory-batch-new-material-panel") ||
  !batchReceivePanelSource.includes("<BatchReceiveNewMaterialModal") ||
  !batchReceivePanelSource.includes("提交{readyCount") ||
  !batchReceivePanelSource.includes("确认入库（{resolvedLines.length}）") ||
  !batchReceivePanelSource.includes("入库单预览") ||
  !batchReceivePanelSource.includes("已恢复上次未提交草稿") ||
  !batchReceivePanelSource.includes("入库明细") ||
  !batchReceivePanelSource.includes('title: "供应商"') ||
  !batchReceivePanelSource.includes('title: "供应商电话"') ||
  !batchReceivePanelSource.includes('title: "单价"') ||
  !batchReceivePanelSource.includes("formatReceiveUnitPrice") ||
  !batchReceivePanelSource.includes("入库日期 {header.receiveDate || \"—\"}") ||
  !batchReceivePanelSource.includes("resolveInventoryReceivableUnits") ||
  !batchReceivePanelSource.includes("<Select") ||
  !batchReceivePanelSource.includes("options={receivableUnitOptions}") ||
  !batchReceivePanelSource.includes("当前物料缺少入库单位，请先完善物料档案。") ||
  !batchReceivePanelSource.includes("请填写供应商。") ||
  !consoleInventorySource.includes("supplier: draft.supplier") ||
  !consoleInventorySource.includes("draft.supplierPhone ? `供应商电话：${draft.supplierPhone}` : \"\"") ||
  consoleInventorySource.includes("请改用默认单位") ||
  mobileInventorySource.includes("请改用默认单位") ||
  batchReceivePanelSource.includes("inventory-batch-unit-readonly") ||
  batchReceivePanelSource.includes("<ReadonlyField") ||
  batchReceivePanelSource.includes("label=\"采购单号\"") ||
  batchReceivePanelSource.includes("label=\"备注\"") ||
  batchReceivePanelSource.includes("总数量") ||
  batchReceivePanelSource.includes("totalQuantityByUnit") ||
  !batchReceiveInlineNewMaterialSource.includes("inventory-batch-new-material")
) {
  throw new Error("入库页应以单一工作台承载搜索选料、入库明细和提交预览；新建物料必须保持弹窗形式，预览需展示单价，混合单位时底部不展示总数量");
}

const batchReceiveSearchIndex = batchReceivePanelSource.indexOf("添加物料");
const batchReceiveLinesIndex = batchReceivePanelSource.indexOf("入库明细（");
const batchReceiveSearchRowStart = batchReceivePanelSource.indexOf('<div className="inventory-batch-search-row">');
const batchReceiveSearchRowEnd = batchReceivePanelSource.indexOf("{newMaterialOpen", batchReceiveSearchRowStart);
const batchReceiveSearchRowSource =
  batchReceiveSearchRowStart >= 0 && batchReceiveSearchRowEnd > batchReceiveSearchRowStart
    ? batchReceivePanelSource.slice(batchReceiveSearchRowStart, batchReceiveSearchRowEnd)
    : "";
if (
  batchReceiveSearchIndex === -1 ||
  batchReceiveLinesIndex === -1 ||
  !batchReceivePanelSource.includes("新建物料：{searchKeyword.trim()}") ||
  batchReceiveSearchRowSource.includes('<Button icon={<PlusOutlined />} onClick={handleOpenNewMaterial}>') ||
  batchReceiveSearchIndex > batchReceiveLinesIndex ||
  batchReceivePanelSource.includes("inventory-batch-entry-new-material") ||
  batchReceivePanelSource.includes("保存并用于本次入库") ||
  batchReceivePanelSource.includes("inventory-batch-receive-tabs") ||
  batchReceivePanelSource.includes("请选择物料分类，再搜索或输入物料名称；如库内不存在，可直接新增。") ||
  !inventoryStyleSource.includes("inventory-batch-sticky-footer") ||
  !inventoryStyleSource.includes("position: sticky") ||
  !inventoryStyleSource.includes("inventory-batch-quantity-input") ||
  inventoryStyleSource.includes(".inventory-batch-unit-readonly")
) {
  throw new Error("入库页应先展示添加物料，再展示入库明细；新建物料入口只保留搜索下拉空状态，并使用 sticky footer 和数量重点输入样式");
}

if (
  appSource.includes('label: "过期/报废处理"') ||
  appSource.includes('"inventory-scrap-records"') ||
  consoleInventorySource.includes("<Title level={3}>过期/报废处理</Title>")
) {
  throw new Error("过期/报废处理不应继续保留独立导航或独立页面");
}

if (
  !consoleInventorySource.includes('actionText: resolveRiskPrimaryAction(item.type)') ||
  !consoleInventorySource.includes("resolveRiskAuxiliaryAction(item.type)")
) {
  throw new Error("库存风险区应按风险类型固定主动作和辅助动作");
}

if (
  consoleInventorySource.includes("恢复使用") ||
  consoleInventorySource.includes("restoreExpiredLot") ||
  consoleInventorySource.includes('if (actionText === "恢复使用")')
) {
  throw new Error("过期批次不再自动冻结，库存首页和物料详情不应展示恢复使用动作");
}

if (
  !consoleInventorySource.includes('title: "操作"') ||
  !consoleInventorySource.includes("openExpiredScrapModal(row)") ||
  !consoleInventorySource.includes("openLotEditModal(row)") ||
  consoleInventorySource.indexOf("{renderExpiredActionModal()}", consoleInventorySource.indexOf('inventoryView === "detail"')) === -1 ||
  !consoleInventorySource.includes('title="修改批次信息"') ||
  !consoleInventorySource.includes('label="到期日"') ||
  !consoleInventorySource.includes('label="供应商批次号"') ||
  !consoleInventorySource.includes('label="备注"') ||
  consoleInventorySource.includes('title: "存放位置"') ||
  consoleInventorySource.includes('label="存放位置"') ||
  consoleInventorySource.includes('name="remainingQtyBase"') ||
  consoleInventorySource.includes('name="unitPrice"') ||
  !consoleInventorySource.includes("库存数量与总进货价必须通过单据流程调整")
) {
  throw new Error("物料详情批次列表应提供受限编辑入口，且禁止直接修改库存数量和总进货价");
}

if (
  !consoleInventorySource.includes('okButtonProps={{ danger: true }}') ||
  !consoleInventorySource.includes("请确认该批次确需报废") ||
  !consoleInventorySource.includes('label="报废数量"') ||
  !consoleInventorySource.includes("expiredActionLot.remainingQtyBase") ||
  !consoleInventorySource.includes('label="报废原因"') ||
  !consoleInventorySource.includes("过期/变质") ||
  !consoleInventorySource.includes("受潮/发霉") ||
  !consoleInventorySource.includes("外包装破损/漏包") ||
  !consoleInventorySource.includes("日常损耗/误差修正") ||
  !consoleInventorySource.includes('label="拍照上传"') ||
  !inventoryDataSource.includes("photoNote?: string") ||
  !inventoryDataSource.includes("照片留档")
) {
  throw new Error("批次报废必须二次确认，支持部分报废、原因归类和拍照留档");
}

if (
  inventoryDataSource.includes('"过期报废"') ||
  consoleInventorySource.includes('"过期报废"')
) {
  throw new Error("已处理报废应合并到库存流水中，流水类型统一为报废，不再使用过期报废");
}

if (consoleInventorySource.includes('title: "追溯说明"')) {
  throw new Error("库存流水页面不应展示追溯说明字段");
}

const ledgerMaterialColumnIndex = consoleInventorySource.indexOf('title: "物料"');
const ledgerCategoryColumnIndex = consoleInventorySource.indexOf('title: "分类"', ledgerMaterialColumnIndex);
const ledgerLotColumnIndex = consoleInventorySource.indexOf('title: "批次"', ledgerMaterialColumnIndex);
if (
  ledgerMaterialColumnIndex === -1 ||
  ledgerCategoryColumnIndex === -1 ||
  ledgerLotColumnIndex === -1 ||
  !(ledgerMaterialColumnIndex < ledgerCategoryColumnIndex && ledgerCategoryColumnIndex < ledgerLotColumnIndex)
) {
  throw new Error("库存流水页面应在物料与批次之间展示分类字段");
}

if (
  consoleInventorySource.includes('title: "流水类型"') ||
  consoleInventorySource.includes('title: "操作人/时间"') ||
  !consoleInventorySource.includes('title: "时间"') ||
  !consoleInventorySource.includes("inventory-ledger-type-tag") ||
  !consoleInventorySource.includes("formatInventoryDate(value)")
) {
  throw new Error("库存流水页应删除独立流水类型列，将类型标签合并到库存变化下方，并把操作人/时间改为日期精度的时间列");
}

if (
  consoleInventorySource.includes("stocktake-task") ||
  consoleInventorySource.includes("创建盘点任务") ||
  consoleInventorySource.includes("beginStocktakeExecution")
) {
  throw new Error("发起盘点后应直接进入库存盘点页，不应创建盘点任务或确认范围中间页");
}

if (
  consoleInventorySource.includes("系统已自动冻结") ||
  consoleInventorySource.includes("冻结后不可用于") ||
  !inventoryDataSource.includes("盘盈调整批次") ||
  !consoleInventorySource.includes("盘盈库存，出库优先消耗") ||
  !consoleInventorySource.includes("系统估算约")
) {
  throw new Error("物料详情批次库存不应展示过期自动冻结说明，并需保留盘盈调整批次提示");
}

if (
  !consoleInventorySource.includes("盘点差异处理") ||
  !consoleInventorySource.includes("difference-list") ||
  !consoleInventorySource.includes("buildInventoryStocktakeTransaction") ||
  !consoleInventorySource.includes("确认后系统会按盘点库存更新当前库存") ||
  !consoleInventorySource.includes('message.success("盘点已确认，新库存已生效")') ||
  !consoleInventorySource.includes("buildInventoryDifferenceResolution")
) {
  throw new Error("盘点应先生成盘点清单，确认后更新库存并生成盘点调整流水；历史差异处理页仍保留人工处理能力");
}

if (
  consoleInventorySource.includes("提交盘点后，容差内小差异会自动生成库存流水") ||
  consoleInventorySource.includes("剩余差异进入「盘点差异处理」")
) {
  throw new Error("发起盘点流程不应再提示提交后进入自动差异处理，应以盘点清单确认生效为准");
}

if (
  !inventoryDataSource.includes('"消耗冲销"') ||
  !inventoryDataSource.includes('"入库更正"') ||
  !inventoryDataSource.includes("inventoryDifferenceMethodMetas") ||
  !inventoryDataSource.includes("buildInventoryDifferenceResolution")
) {
  throw new Error("差异处理应新增消耗冲销/入库更正流水类型与差异处理方式映射");
}

if (
  !consoleInventorySource.includes("inventoryDifferenceHandlingOptions") ||
  !consoleInventorySource.includes("盘点差异分析 + 处理") ||
  !consoleInventorySource.includes("库存变动（近30天）") ||
  !consoleInventorySource.includes("recentDifferenceLedgers.slice(0, 5)") ||
  !consoleInventorySource.includes('openMaterialDetail(materialId, "ledger")') ||
  !consoleInventorySource.includes("2. 处理原因") ||
  !consoleInventorySource.includes("<strong>适用于：</strong>") ||
  !consoleInventorySource.includes("<strong>库存处理：</strong>") ||
  !consoleInventorySource.includes("<strong>账务处理：</strong>") ||
  !consoleInventorySource.includes('label: `待处理 ${pendingDifferences.length}`') ||
  !consoleInventorySource.includes('label: `已处理 ${processedDifferences.length}`') ||
  !consoleInventorySource.includes("const pendingDifferenceColumns") ||
  !consoleInventorySource.includes("const processedDifferenceColumns") ||
  !consoleInventorySource.includes('title: "盘点人/时间"') ||
  !consoleInventorySource.includes('title: "处理人/时间"') ||
  !consoleInventorySource.includes("canSubmitDifferenceResolution") ||
  !consoleInventorySource.includes("disabled={!canSubmitDifferenceResolution}") ||
  !consoleInventorySource.includes("处理方式：${handlingOption.uiLabel}") ||
  !consoleInventorySource.includes("原因：${handleReason}") ||
  !consoleInventorySource.includes("优先回补最近扣减的批次") ||
  !consoleInventorySource.includes("按库存先进先出的顺序扣减对应批次库存") ||
  !consoleInventorySource.includes("补到系统自动选中的既有批次，不让用户手选批次") ||
  !inventoryDataSource.includes("handlingReason?: string") ||
  consoleInventorySource.includes("Radio.Group") ||
  consoleInventorySource.includes("请选择差异来源") ||
  consoleInventorySource.includes("选择关联批次") ||
  consoleInventorySource.includes('uiLabel: "登记赠品 / 多送"') ||
  consoleInventorySource.includes('uiLabel: "盘盈调整"') ||
  consoleInventorySource.includes('uiLabel: "盘亏调整"') ||
  consoleInventorySource.includes('"relatedLot"')
) {
  throw new Error("盘点差异人工处理抽屉应收敛为 3 类盘盈和 3 类盘亏，批次由系统自动落点");
}

if (
  !consoleInventorySource.includes("renderFeedEstimatedAvailableDaysText") ||
  !consoleInventorySource.includes("feedAvailableDaysMap") ||
  !consoleInventorySource.includes('const estimatedAvailableDaysCategories: InventoryCategory[] = ["饲料"]') ||
  consoleInventorySource.includes('const estimatedAvailableDaysCategories: InventoryCategory[] = ["饲料", "药品"]') ||
  !consoleInventorySource.includes("shouldShowEstimatedAvailableDays(activeCategory)") ||
  consoleInventorySource.includes('defaultSortOrder: activeCategory === "饲料" ? "ascend" : undefined') ||
  !consoleInventorySource.includes("inventory-feed-available-days") ||
  !consoleInventorySource.includes("is-critical") ||
  !inventoryDataSource.includes("近7天暂无消耗数据，无法计算预计可用天数") ||
  !inventoryDataSource.includes("预计可用天数根据当前库存及近7天平均日消耗自动计算，仅供采购决策参考") ||
  feedAvailableDaysRenderSource.includes("Tooltip") ||
  consoleInventorySource.includes("inventory-feed-available-days-title") ||
  consoleInventorySource.includes("feedEstimatedAvailableDaysTooltip") ||
  consoleInventorySource.includes('aria-label="预计可用天数说明"') ||
  consoleInventorySource.includes("renderFeedAvailableDaysHealth") ||
  consoleInventorySource.includes("resolveFeedAvailableDaysHealth") ||
  consoleInventorySource.includes("预计可用：{result.displayText}") ||
  inventoryStyleSource.includes(".inventory-feed-health__bar") ||
  inventoryStyleSource.includes(".inventory-feed-available-days__dot") ||
  !inventoryStyleSource.includes(".inventory-feed-available-days.is-critical") ||
  !inventoryStyleSource.includes("color: #ef4444") ||
  !inventoryStyleSource.includes("color: #f97316") ||
  !inventoryStyleSource.includes("color: #f59e0b") ||
  !inventoryStyleSource.includes("color: #22c55e") ||
  !inventoryStyleSource.includes("color: #9ca3af")
) {
  throw new Error("预计可用天数列应仅在饲料 Tab 展示，并恢复为纯文本，仅通过文字颜色表达风险，不展示 Tooltip、健康条、圆点或百分比");
}

const drugSummary = summaries.find((item) => item.materialId === "mat-vaccine-prrs");
const vetDrugSummary = summaries.find((item) => item.materialId === "mat-drug-florfenicol");
if (drugSummary?.medicineClass !== "疫苗" || vetDrugSummary?.medicineClass !== "兽药") {
  throw new Error("库存汇总应携带药品二级分类");
}

if (
  !consoleInventorySource.includes('activeCategory === "药品"') ||
  !consoleInventorySource.includes('title: "药品分类"') ||
  !consoleInventorySource.includes("inventoryMedicineClassOptions") ||
  !consoleInventorySource.includes('className: "inventory-table-column-nowrap"') ||
  !inventoryStyleSource.includes(".inventory-table-column-nowrap")
) {
  throw new Error("药品 Tab 列表应展示疫苗/兽药/保健品二级分类列，并保持药品分类表头不换行");
}

if (
  mobileInventorySource.includes('type MobileInventoryFeature = "query" | "receive" | "stocktake" | "create"') ||
  mobileInventorySource.includes("PlusCircleOutlined") ||
  mobileInventorySource.includes('label: "新增物料"') ||
  !mobileInventorySource.includes('type MobileInventoryFeature = "query" | "receive" | "stocktake"') ||
  !inventoryStyleSource.includes(".mv-inventory-feature-grid")
) {
  throw new Error("Mobile 库存入口只保留查库存、入库、盘点，并应以紧凑方块形式展示");
}

if (
  !mobileInventorySource.includes("createEmptyBatchReceiveEntry") ||
  !mobileInventorySource.includes("isBatchReceiveEntryReady") ||
  !mobileInventorySource.includes("resolveBatchReceiveEntryMaterial") ||
  !mobileInventorySource.includes("buildInventoryReceiveEntryFromSearch") ||
  !mobileInventorySource.includes("BatchReceiveInlineNewMaterial") ||
  !mobileInventorySource.includes("resolveInventoryReceivableUnits") ||
  !mobileInventorySource.includes("options={receivableUnitOptions}") ||
  mobileInventorySource.includes("mv-inventory-unit-readonly") ||
  !mobileInventorySource.includes("确认入库")
) {
  throw new Error("Mobile 入库应复用 Console 入库的条目、快建物料和提交校验口径");
}

if (
  !mobileInventorySource.includes("buildInventoryStocktakeScope") ||
  !mobileInventorySource.includes("buildInventoryStocktakeDifferences") ||
  !mobileInventorySource.includes("resolveInventoryToleranceDifferences") ||
  !mobileInventorySource.includes("盘点差异确认") ||
  !mobileInventorySource.includes("盘点已提交，系统将按规则处理差异") ||
  mobileInventorySource.includes("差异原因")
) {
  throw new Error("Mobile 盘点应对齐 Console 范围选择、录入实数、差异确认和自动处理规则，不应让现场解释差异原因");
}

if (
  appSource.includes('key: "inventory-ledgers"') ||
  !consoleInventorySource.includes('setInventoryView("ledgers")') ||
  !consoleInventorySource.includes("库存记录")
) {
  throw new Error("库存记录应作为库存管理首页按钮入口，不应再保留侧边栏子导航");
}

if (
  appSource.includes("inventory-stocktake-records") ||
  appSource.includes('initialView="stocktake-records"') ||
  consoleInventorySource.includes('inventoryView === "stocktake-records"') ||
  consoleInventorySource.includes('setInventoryView("stocktake-records")') ||
  consoleInventorySource.includes("返回盘点记录")
) {
  throw new Error("盘点记录不应再保留独立导航、页面或跳转入口");
}

if (
  !consoleInventorySource.includes("<Title level={3}>库存记录</Title>") ||
  consoleInventorySource.includes("<Title level={3}>库存流水</Title>") ||
  !consoleInventorySource.includes('label: "库存流水"') ||
  !consoleInventorySource.includes('label: "盘点记录"') ||
  !consoleInventorySource.includes('label: "入库单"') ||
  consoleInventorySource.includes('inventoryView === "inbound-orders"') ||
  consoleInventorySource.includes('setInventoryView("inbound-orders")') ||
  consoleInventorySource.includes("入库单据")
) {
  throw new Error("库存记录页应使用库存流水、盘点记录、入库单三个 Tab，入库单不应保留独立按钮或页面");
}

const inventoryCheckHeaderSource = consoleInventorySource.slice(
  consoleInventorySource.indexOf("function InventoryCheckHeader"),
  consoleInventorySource.indexOf("function InventoryCheckDetailTable")
);
const inventoryCheckTableSource = consoleInventorySource.slice(
  consoleInventorySource.indexOf("function InventoryCheckTable"),
  consoleInventorySource.indexOf("function InventoryInboundHeader")
);

if (
  inventoryCheckHeaderSource.includes("盘点单号") ||
  inventoryCheckHeaderSource.includes("inventory-check-identity") ||
  inventoryCheckHeaderSource.indexOf("盘点物料") === -1 ||
  inventoryCheckHeaderSource.indexOf("存在差异") === -1 ||
  inventoryCheckHeaderSource.indexOf("库存调整") === -1 ||
  inventoryCheckHeaderSource.indexOf("盘点人/时间") === -1 ||
  !(
    inventoryCheckHeaderSource.indexOf("盘点物料") < inventoryCheckHeaderSource.indexOf("存在差异") &&
    inventoryCheckHeaderSource.indexOf("存在差异") < inventoryCheckHeaderSource.indexOf("库存调整") &&
    inventoryCheckHeaderSource.indexOf("库存调整") < inventoryCheckHeaderSource.indexOf("盘点人/时间")
  )
) {
  throw new Error("盘点记录主行不应展示盘点单号，并应按盘点物料、存在差异、库存调整、盘点人/时间排序");
}

if (
  !inventoryCheckTableSource.includes('placeholder="搜索物料名称"') ||
  inventoryCheckTableSource.includes("搜索盘点单号") ||
  inventoryCheckTableSource.includes("record.checkNo")
) {
  throw new Error("盘点记录搜索不应展示或匹配盘点单号");
}

const inventoryCheckDetailTableSource = consoleInventorySource.slice(
  consoleInventorySource.indexOf("function InventoryCheckDetailTable"),
  consoleInventorySource.indexOf("function InventoryLedgerTable")
);

if (
  inventoryCheckDetailTableSource.includes('title: "处理结果"') ||
  inventoryCheckDetailTableSource.includes('title: "批次"') ||
  inventoryCheckDetailTableSource.includes("InventoryAdjustmentTag") ||
  !inventoryCheckDetailTableSource.includes('title: "差异"') ||
  !inventoryCheckDetailTableSource.includes('aria-label="查看库存流水"')
) {
  throw new Error("盘点记录展开明细不应展示批次或处理结果字段，并应在差异列保留库存流水入口");
}

if (
  inventoryCheckDetailTableSource.includes("调整总量") ||
  consoleInventorySource.includes("formatInventoryCheckAdjustmentTotal")
) {
  throw new Error("盘点记录展开摘要不应展示调整总量，避免混合单位被误认为可合计");
}
