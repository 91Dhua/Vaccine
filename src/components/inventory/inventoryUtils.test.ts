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
  buildInventoryLedgerQuantityDisplay,
  buildInventoryMaterialUsageState,
  buildInventoryRiskItems,
  buildInventorySummaries,
  calculateInventoryBaseQuantity,
  filterInventoryLedgers,
  filterInventorySummariesByMaterialStatus,
  formatNearestExpiryDate,
  generateInventoryLotNo,
  getInventoryLotsForMaterial,
  getInventoryReceiveMaterialOptions,
  hasInventoryMaterialBusinessRecords,
  isInventoryDifferenceWithinTolerance,
  inventorySeedLedgers,
  inventorySeedLots,
  inventorySeedMaterials,
  buildInventoryDifferenceResolution,
  resolveInventoryToleranceDifferences,
  toggleInventoryMaterialStatus,
  updateInventoryMaterial,
  validateInventoryMaterialEdit,
  resolveInventoryUnitFactor,
  validateInventoryPackageConversions
} from "./inventoryData";

const summaries = buildInventorySummaries(inventorySeedMaterials, inventorySeedLots);

const florfenicol = summaries.find((item) => item.materialName === "氟苯尼考");
if (!florfenicol) {
  throw new Error("库存汇总应包含氟苯尼考物料");
}

if (florfenicol.currentStockBase !== 1850) {
  throw new Error("库存汇总应把批次库存与物料级负库存合并计算");
}

if (florfenicol.stockRisk !== "低库存") {
  throw new Error("库存风险应识别低库存物料");
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
if (riskItems.length < 4) {
  throw new Error("库存首页应生成负库存、过期、临期、低库存等待处理风险");
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
  riskActionMap.get("低库存") !== undefined ||
  riskActionMap.get("临期") !== "发起盘点" ||
  riskActionMap.get("过期") !== "报废"
) {
  throw new Error("库存风险默认主动作应固定为：负库存发起盘点、低库存无行内按钮、临期发起盘点、已过期报废");
}

const lowStockRisk = riskItems.find((item) => item.type === "低库存");
if (!lowStockRisk || lowStockRisk.valueText.includes("安全")) {
  throw new Error("低库存风险行应只展示剩余库存，不展示安全库存配额");
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

const categoryTabs = buildInventoryCategoryTabs(summaries);
const expectedCategoryOrder = ["饲料", "兽药", "疫苗", "消毒用品", "保健品", "工具", "其他"];
if (categoryTabs.map((tab) => tab.key).join(",") !== expectedCategoryOrder.join(",")) {
  throw new Error("库存列表分类 tab 应固定展示完整物料类型，并按饲料、兽药、疫苗、消毒用品、保健品、工具、其他排序");
}

const categoryTabKeys = categoryTabs.map((tab) => String(tab.key));
if (categoryTabKeys.includes("精液")) {
  throw new Error("库存管理不应展示精液分类 tab，精液暂不纳入库存管理");
}

if (!categoryTabs.some((tab) => tab.key === "兽药" && tab.count === 2)) {
  throw new Error("库存列表分类 tab 应统计该类型物料数量");
}

if (!categoryTabs.some((tab) => tab.key === "保健品" && tab.count === 1)) {
  throw new Error("库存列表分类 tab 应统计保健品物料数量");
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
if (!enabledOnlyTabs.some((tab) => tab.key === "兽药" && tab.count === 1)) {
  throw new Error("分类 tab 默认应只统计启用中物料，停用物料不应干扰日常列表数量，并保留其他启用中兽药");
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
  safetyStockBase: inventorySeedMaterials[0].safetyStockBase,
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
  category: "兽药",
  baseUnit: "ml",
  safetyStockBase: 500,
  note: "更新后的备注"
}).find((material) => material.id === "mat-drug-florfenicol");
if (
  !editedFlorfenicol ||
  editedFlorfenicol.materialName !== "氟苯尼考注射液" ||
  editedFlorfenicol.safetyStockBase !== 500 ||
  editedFlorfenicol.note !== "更新后的备注"
) {
  throw new Error("编辑物料应更新展示信息、预警配置和备注，并保持物料 ID 不变");
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
  category: "兽药",
  brand: "华牧",
  baseUnit: "ml",
  packageConversions: [{ fromUnit: "瓶", quantity: 100, toUnit: "ml" }],
  inboundQuantity: 20,
  inboundUnit: "瓶",
  baseQuantity: 2000,
  safetyStockBase: 500,
  note: "新增治疗物料",
  expiryDate: "2026-12-31",
  unitPrice: 1040,
  supplier: "华牧供应",
  supplierPhone: "13800000000",
  storageLocation: "药房A柜",
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
  receivedEntry.material.category !== "兽药" ||
  receivedEntry.material.brand !== "华牧" ||
  receivedEntry.material.baseUnit !== "ml" ||
  receivedEntry.material.auxiliaryUnit !== "瓶" ||
  receivedEntry.material.packageConversions?.length !== 1 ||
  !receivedEntry.material.unitSystem.includes("1瓶 = 100ml") ||
  receivedEntry.material.safetyStockBase !== 500 ||
  receivedEntry.material.note !== "新增治疗物料" ||
  newLotInDetail.inboundQty !== 20 ||
  newLotInDetail.inboundUnit !== "瓶" ||
  newLotInDetail.convertedQtyBase !== 2000 ||
  newLotInDetail.remainingQtyBase !== 2000 ||
  newLotInDetail.unitPrice !== 1040 ||
  newLotInDetail.baseUnitCost !== 0.52 ||
  newLotInDetail.supplier !== "华牧供应" ||
  newLotInDetail.supplierPhone !== "13800000000" ||
  newLotInDetail.storageLocation !== "药房A柜" ||
  newLotInDetail.productionDate
) {
  throw new Error("采购入库新增物料时必须补齐列表与详情会展示的主数据，并保存批次信息和存放位置");
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
  existingMaterialReceive.material.category !== "兽药" ||
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
  category: "兽药",
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

if (validateInventoryPackageConversions("ml", []) !== "请完善包装规格后再提交入库。") {
  throw new Error("缺少包装规格时应阻止采购入库提交");
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
  category: "兽药",
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
  receiveFromNewSearch.material.category !== "兽药" ||
  receiveFromNewSearch.material.brand !== "新牧" ||
  receiveFromNewSearch.material.baseUnit !== "ml" ||
  receiveFromNewSearch.material.auxiliaryUnit !== "瓶" ||
  !receiveFromNewSearch.material.unitSystem.includes("1瓶 = 100ml") ||
  receiveFromNewSearch.material.safetyStockBase !== undefined ||
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
  expiredLotAfterOutbound?.remainingQtyBase !== 80 ||
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
  throw new Error("异常盘点应默认带出负库存、低库存、临期和已过期物料");
}

if (abnormalStocktakeScope.some((item) => item.lotId || item.lotNo)) {
  throw new Error("盘点范围应只盘点物料总数，不应带出具体批次");
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
  !selectableStocktakeScope.some((row) => row.materialName === "氟苯尼考" && row.category === "兽药") ||
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
  expiredLotAfterStocktake?.remainingQtyBase !== 180 ||
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
      category: "疫苗",
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
  expiredLotAfterStocktakeLoss?.remainingQtyBase !== 100 ||
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
      category: "兽药",
      bookQtyBase: 1850,
      baseUnit: "ml",
      reason: "低库存",
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
      category: "兽药",
      bookQtyBase: 1850,
      baseUnit: "ml",
      reason: "低库存",
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
  scrapQuantity: 180,
  reason: "超过有效期",
  handlingMethod: "无害化处理",
  operator: "李静",
  occurredAt: "2026-06-24 11:20",
  ledgerId: "ledger-scrap-test"
});
const lotAfterScrap = scrapTransaction.lots.find((lot) => lot.id === "lot-prrs-001");
if (
  lotAfterScrap?.remainingQtyBase !== 0 ||
  lotAfterScrap.status !== "已耗尽" ||
  scrapTransaction.ledger.type !== "报废" ||
  scrapTransaction.ledger.quantityText !== "-180头份" ||
  scrapTransaction.ledger.afterStockText !== "0头份" ||
  scrapTransaction.ledger.remark !== "报废原因：超过有效期；处理方式：无害化处理"
) {
  throw new Error("过期报废确认后应扣减批次库存、关闭过期风险，并生成流水类型为报废的库存流水");
}

const { readFileSync } = await Function("specifier", "return import(specifier)")("node:fs");
const appSource = readFileSync(new URL("../../App.tsx", import.meta.url), "utf8");
const consoleInventorySource = readFileSync(new URL("./ConsoleInventoryPage.tsx", import.meta.url), "utf8");
const inventoryDataSource = readFileSync(new URL("./inventoryData.ts", import.meta.url), "utf8");
const batchReceivePanelSource = readFileSync(new URL("./BatchReceivePanel.tsx", import.meta.url), "utf8");
const batchReceiveInlineNewMaterialSource = readFileSync(new URL("./BatchReceiveInlineNewMaterial.tsx", import.meta.url), "utf8");
const materialProfileFieldsSource = readFileSync(new URL("./MaterialProfileFields.tsx", import.meta.url), "utf8");
const inventoryStyleSource = readFileSync(new URL("../../styles.css", import.meta.url), "utf8");

if (
  consoleInventorySource.includes("inventory-dashboard-summary") ||
  consoleInventorySource.includes("库存概览")
) {
  throw new Error("库存首页上方不应继续保留库存概览摘要卡片，应改为图表与风险并排展示");
}

if (
  !consoleInventorySource.includes("库存金额占比") ||
  !consoleInventorySource.includes("库存消耗趋势") ||
  !consoleInventorySource.includes("本月消耗金额 Top 物料") ||
  !consoleInventorySource.includes("inventory-analytics-grid") ||
  !consoleInventorySource.includes("inventory-trend-chart") ||
  !consoleInventorySource.includes("inventory-analytics-card--risk")
) {
  throw new Error("库存首页上方应改为金额占比、Top 物料、库存风险并排，趋势图单独成行");
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
  !inventoryStyleSource.includes(".inventory-detail-tabs .ant-tabs-tabpane:not(.ant-tabs-tabpane-hidden)") ||
  !inventoryStyleSource.includes("gap: 18px;")
) {
  throw new Error("物料详情页各模块卡片之间应有稳定间距，避免模块贴在一起");
}

if (!consoleInventorySource.includes("<Text type=\"secondary\">消耗记录</Text>")) {
  throw new Error("物料详情页关联业务与消耗分析中，消耗来源标题应改为消耗记录");
}

if (
  consoleInventorySource.includes("主要消耗来源") ||
  consoleInventorySource.includes("selectedConsumptionSources.map") ||
  consoleInventorySource.includes("消耗 {formatInventoryQty(item.quantity")
) {
  throw new Error("物料详情页关联业务与消耗分析不应再展示主要消耗来源汇总标签");
}

if (
  !consoleInventorySource.includes("Math.abs(selectedConsumptionQty") ||
  !consoleInventorySource.includes("Math.abs(selectedConsumptionCost")
) {
  throw new Error("物料详情消耗统计卡片应按用户视角展示正数消耗数量和金额");
}

if (!consoleInventorySource.includes('message.success("出库成功")')) {
  throw new Error("出库成功 toast 只应展示用户结果文案：出库成功");
}

if (consoleInventorySource.includes("出库已完成，系统已补齐批次、领用人与出库日期")) {
  throw new Error("出库 toast 不应把系统补齐批次、领用人、出库日期等内部逻辑展示给用户");
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
  !consoleInventorySource.includes("rowSelection={stocktakeScopeRowSelection}") ||
  !consoleInventorySource.includes("stocktakeScopeSelectedRowIds") ||
  !consoleInventorySource.includes("stocktakeScopeCategory")
) {
  throw new Error("指定物料盘点范围页应通过复选框和物料类别筛选选择盘点目标");
}

if (
  !consoleInventorySource.includes("自动选择当前负库存、低库存、临期、过期等风险物料，适合快速修复库存异常。")
) {
  throw new Error("发起盘点弹窗异常盘点说明应说明适合快速修复库存异常");
}

if (
  !consoleInventorySource.includes("receiveMaterialSpecLine") ||
  !consoleInventorySource.includes("本次入库：") ||
  !consoleInventorySource.includes("receiveIncreasePreview")
) {
  throw new Error("采购入库选择物料后应展示规格说明，并在入库数量旁提示本次将增加多少库存");
}

if (
  !consoleInventorySource.includes('material.category === "饲料"') ||
  !consoleInventorySource.includes("formatInventoryQty(summary.currentStockBase, material.baseUnit)")
) {
  throw new Error("采购入库规格行应仅对饲料展示约包装数，兽药等物料按库存单位展示当前库存");
}

if (
  !consoleInventorySource.includes("饲料类需填写适用猪只与适用阶段") ||
  !inventoryDataSource.includes('key: "applicableStages"') ||
  !inventoryDataSource.includes("requiredInBatchReceive: true") ||
  !inventoryDataSource.includes("requiredInQuick: true") ||
  !materialProfileFieldsSource.includes("initialValue={[{}]}") ||
  !materialProfileFieldsSource.includes('name={[field.name, "pigType"]}') ||
  !materialProfileFieldsSource.includes('name={[field.name, "phases"]}') ||
  materialProfileFieldsSource.includes("请输入起始天") ||
  materialProfileFieldsSource.includes("请输入结束天")
) {
  throw new Error("采购入库快建饲料时，应以一行适用猪只 + 多选阶段填写，不再要求生产状态天数区间");
}

if (
  !consoleInventorySource.includes('if (analyticsCategoryFilter === "全部")') ||
  !consoleInventorySource.includes("isCategorySummary") ||
  !consoleInventorySource.includes("饲料消耗重量") ||
  consoleInventorySource.includes("消耗天数") ||
  !inventoryDataSource.includes('materialName: "头孢"')
) {
  throw new Error("库存首页 Top 物料应默认按物料类型汇总、分类筛选后按具体物料展示，并用饲料消耗重量替代消耗天数");
}

if (
  !consoleInventorySource.includes("resolveRiskAdviceText") ||
  !consoleInventorySource.includes("formatRelativeExpiryDate") ||
  !consoleInventorySource.includes("inventory-risk-row__title") ||
  !inventoryStyleSource.includes(".inventory-risk-row__title span") ||
  !inventoryDataSource.includes('expiryDate: "2026-07-03"')
) {
  throw new Error("库存风险行应把品牌弱化到物料名旁，展示建议动作影响，并用相对日期弱化临期具体日期");
}

if (consoleInventorySource.includes('label="供应商电话" name="supplierPhone" rules={')) {
  throw new Error("采购入库供应商电话应为选填，不应配置必填校验");
}

const receiveModalSourceStart = consoleInventorySource.indexOf('title="采购入库"');
const receiveModalSourceEnd = consoleInventorySource.indexOf("{renderExpiredActionModal()}", receiveModalSourceStart);
const receiveModalSource =
  receiveModalSourceStart >= 0 && receiveModalSourceEnd > receiveModalSourceStart
    ? consoleInventorySource.slice(receiveModalSourceStart, receiveModalSourceEnd)
    : "";
const receiveMaterialSectionIndex = receiveModalSource.indexOf("入库物料信息");
const receivePurchaseSectionIndex = receiveModalSource.indexOf("<strong>采购信息</strong>");
const receivePackageSectionIndex = receiveModalSource.indexOf("<strong>规格与包装</strong>");
if (
  !receiveModalSource ||
  receiveMaterialSectionIndex === -1 ||
  receivePurchaseSectionIndex === -1 ||
  receivePackageSectionIndex === -1 ||
  !(receiveMaterialSectionIndex < receivePurchaseSectionIndex && receivePurchaseSectionIndex < receivePackageSectionIndex)
) {
  throw new Error("采购入库弹窗模块顺序应为入库物料信息、采购信息、规格与包装");
}

if (
  receiveModalSource.includes("<strong>预警与备注</strong>") ||
  receiveModalSource.includes("<strong>批次与采购信息</strong>") ||
  receiveModalSource.includes('label="安全库存"') ||
  receiveModalSource.includes("核算单位说明") ||
  receiveModalSource.includes("请选择库存核算单位")
) {
  throw new Error("采购入库弹窗不应继续在批次流程中提供安全库存输入或核算单位、预警与备注旧模块");
}

if (
  receiveModalSource.indexOf('label="备注" name="note"') === -1 ||
  receiveModalSource.indexOf('label="备注" name="note"') < receivePurchaseSectionIndex ||
  receiveModalSource.indexOf('label="备注" name="note"') > receivePackageSectionIndex
) {
  throw new Error("采购入库备注字段应移动到采购信息模块内");
}

if (
  !receiveModalSource.includes('label="存放位置" name="storageLocation"') ||
  !consoleInventorySource.includes('inventoryView === "batch-receive"') ||
  !consoleInventorySource.includes("入库2") ||
  !consoleInventorySource.includes("BatchReceivePanel") ||
  !batchReceivePanelSource.includes("采购信息") ||
  !batchReceivePanelSource.includes("inventory-batch-entry-grid--6") ||
  !batchReceiveInlineNewMaterialSource.includes("inventory-batch-new-material")
) {
  throw new Error("采购入库和入库2批量入库都应提供存放位置自由输入，入库2应内联展示新建物料字段");
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
  !consoleInventorySource.includes("openExpiredScrapModal(row)")
) {
  throw new Error("物料详情批次列表应保留过期批次的报废入口");
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
  consoleInventorySource.includes("stocktake-task") ||
  consoleInventorySource.includes("创建盘点任务") ||
  !consoleInventorySource.includes("beginStocktakeExecution")
) {
  throw new Error("确认盘点范围后应直接进入盘点操作，不应创建盘点任务");
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
  !consoleInventorySource.includes("buildInventoryStocktakeDifferences") ||
  !consoleInventorySource.includes("buildInventoryDifferenceResolution")
) {
  throw new Error("盘点应改为提交生成待处理差异、在盘点差异处理页逐条处理的闭环");
}

if (consoleInventorySource.includes("确认并调整库存")) {
  throw new Error("提交盘点不应再直接确认并调整库存，应生成待处理差异");
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
  appSource.includes('key: "inventory-ledgers"') ||
  !consoleInventorySource.includes('setInventoryView("ledgers")') ||
  !consoleInventorySource.includes("库存流水")
) {
  throw new Error("库存流水应改为库存管理首页按钮入口，不应再保留侧边栏子导航");
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
