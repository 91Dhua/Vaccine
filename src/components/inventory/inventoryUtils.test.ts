import {
  buildInventoryCategoryTabs,
  buildInventoryLedgerTabCounts,
  buildInventoryRecentActivities,
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
  inventorySeedLedgers,
  inventorySeedLots,
  inventorySeedMaterials,
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
  throw new Error("模拟数据应覆盖过期批次，支撑过期库存处理页面");
}

const riskItems = buildInventoryRiskItems(inventorySeedMaterials, inventorySeedLots, summaries);
if (riskItems.length < 4) {
  throw new Error("库存首页应生成负库存、过期、临期、低库存等待处理风险");
}

if (riskItems[0].type !== "负库存" || riskItems[1].type !== "过期") {
  throw new Error("库存首页风险待办应优先展示负库存与过期批次");
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
const expectedCategoryOrder = ["饲料", "兽药", "疫苗", "消毒用品", "保健品", "工具", "精液", "其他"];
if (categoryTabs.map((tab) => tab.key).join(",") !== expectedCategoryOrder.join(",")) {
  throw new Error("库存列表分类 tab 应固定展示完整物料类型，并按饲料、兽药、疫苗、消毒用品、保健品、工具、精液、其他排序");
}

if (!categoryTabs.some((tab) => tab.key === "兽药" && tab.count === 1)) {
  throw new Error("库存列表分类 tab 应统计该类型物料数量");
}

if (!categoryTabs.some((tab) => tab.key === "保健品" && tab.count === 0) || !categoryTabs.some((tab) => tab.key === "其他" && tab.count === 0)) {
  throw new Error("库存列表分类 tab 即使当前无物料，也应展示保健品与其他分类");
}

if (categoryTabs.some((tab) => ["物料管理", "批次明细", "库存流水", "预警中心", "过期库存处理"].includes(tab.label))) {
  throw new Error("库存列表 tab 不应再展示模块型标签，应只展示物料类型");
}

const disabledFlorfenicolMaterials = inventorySeedMaterials.map((material) =>
  material.id === "mat-drug-florfenicol" ? { ...material, status: "已停用" as const } : material
);
const disabledFlorfenicolSummaries = buildInventorySummaries(disabledFlorfenicolMaterials, inventorySeedLots);
const enabledOnlyTabs = buildInventoryCategoryTabs(disabledFlorfenicolSummaries, disabledFlorfenicolMaterials, "启用中");
if (!enabledOnlyTabs.some((tab) => tab.key === "兽药" && tab.count === 0)) {
  throw new Error("分类 tab 默认应只统计启用中物料，停用物料不应干扰日常列表数量");
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

const ledgerTabCounts = buildInventoryLedgerTabCounts(inventorySeedLedgers);
if (ledgerTabCounts.inbound !== 2 || ledgerTabCounts.outbound !== 4) {
  throw new Error("出/入库记录页应按入库与出库两个 tab 分类统计记录");
}

const ledgerQuantityDisplay = buildInventoryLedgerQuantityDisplay(inventorySeedLedgers[0]);
if (
  ledgerQuantityDisplay.changeText !== inventorySeedLedgers[0].quantityText ||
  ledgerQuantityDisplay.balanceText !== inventorySeedLedgers[0].afterStockText
) {
  throw new Error("出/入库记录页应把变化数量与结存数量合并为一个展示字段");
}

const inboundFlorfRecords = filterInventoryLedgers({
  ledgers: inventorySeedLedgers,
  materials: inventorySeedMaterials,
  direction: "inbound",
  keyword: "氟苯尼考",
  dateRange: ["2026-06-17", "2026-06-17"]
});
if (inboundFlorfRecords.length !== 1 || inboundFlorfRecords[0].type !== "采购入库") {
  throw new Error("入库 tab 应支持按日期范围与物料名称复合查询");
}

const sourceOnlyRecords = filterInventoryLedgers({
  ledgers: inventorySeedLedgers,
  materials: inventorySeedMaterials,
  direction: "outbound",
  keyword: "治疗任务"
});
if (sourceOnlyRecords.length !== 0) {
  throw new Error("出/入库记录页不展示来源业务列后，关键词搜索不应再按来源业务匹配");
}

const outboundLossRecords = filterInventoryLedgers({
  ledgers: inventorySeedLedgers,
  materials: inventorySeedMaterials,
  direction: "outbound",
  outboundTypes: ["盘亏"],
  keyword: "蓝耳"
});
if (outboundLossRecords.length !== 1 || outboundLossRecords[0].type !== "盘亏") {
  throw new Error("出库 tab 应支持按出库方式与物料名称复合查询");
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
  unitPrice: 52,
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
  receivedEntry.material.category !== "兽药" ||
  receivedEntry.material.brand !== "华牧" ||
  receivedEntry.material.baseUnit !== "ml" ||
  receivedEntry.material.auxiliaryUnit !== "瓶" ||
  !receivedEntry.material.unitSystem.includes("1瓶 = 100ml") ||
  receivedEntry.material.safetyStockBase !== 500 ||
  receivedEntry.material.note !== "新增治疗物料" ||
  newLotInDetail.inboundQty !== 20 ||
  newLotInDetail.inboundUnit !== "瓶" ||
  newLotInDetail.convertedQtyBase !== 2000 ||
  newLotInDetail.remainingQtyBase !== 2000 ||
  newLotInDetail.unitPrice !== 52 ||
  newLotInDetail.supplier !== "华牧供应" ||
  newLotInDetail.supplierPhone !== "13800000000" ||
  newLotInDetail.productionDate
) {
  throw new Error("采购入库新增物料时必须补齐列表与详情会展示的主数据，并保存批次信息");
}

const existingMaterialReceive = buildInventoryReceiveEntry({
  mode: "existing",
  material: inventorySeedMaterials[0],
  lotId: "lot-existing-florfenicol",
  expiryDate: "2027-01-31",
  unitPrice: 58,
  inboundQuantity: 2,
  inboundUnit: "箱",
  baseQuantity: 12000,
  packageConversions: [
    { fromUnit: "瓶", quantity: 100, toUnit: "ml" },
    { fromUnit: "箱", quantity: 60, toUnit: "瓶" }
  ],
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
  existingMaterialReceive.lot.convertedQtyBase !== 12000
) {
  throw new Error("采购入库应同时支持给已有物料新增系统批次");
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
