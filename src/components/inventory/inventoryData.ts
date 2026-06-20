export type InventoryCategory = "饲料" | "兽药" | "保健品" | "疫苗" | "消毒用品" | "工具" | "精液" | "其他";
export type InventoryLotStatus = "正常" | "临期" | "过期" | "已耗尽";
export type InventoryStockRisk = "无风险" | "低库存" | "负库存";
export type InventoryLedgerType = "采购入库" | "业务消耗" | "盘盈" | "盘亏" | "过期报废";
export type InventoryLedgerDirection = "inbound" | "outbound";
export type InventoryAlertType = "负库存提醒" | "低库存提醒" | "临期提醒" | "过期提醒";
export type InventoryMaterialStatus = "启用中" | "已停用";
export type InventoryMaterialStatusFilter = "全部" | InventoryMaterialStatus;

export type InventoryMaterial = {
  id: string;
  materialCode?: string;
  materialName: string;
  category: InventoryCategory;
  brand: string;
  baseUnit: string;
  unitSystem: string[];
  safetyStockBase?: number;
  negativeStockBase?: number;
  status?: InventoryMaterialStatus;
  auxiliaryUnit?: string;
  lastStocktakeAt?: string;
  dosageForm?: string;
  usageMethod?: string;
  withdrawalPeriod?: string;
  vaccineType?: string;
  administrationRoute?: string;
  coldChain?: string;
  storageTemperature?: string;
  note?: string;
};

export type InventoryLot = {
  id: string;
  materialId: string;
  lotNo: string;
  productionDate?: string;
  expiryDate: string;
  inboundQty: number;
  inboundUnit: string;
  convertedQtyBase: number;
  remainingQtyBase: number;
  unitPrice: number;
  baseUnitCost: number;
  packageConversions?: InventoryPackageConversion[];
  supplier?: string;
  supplierPhone?: string;
  status: InventoryLotStatus;
};

export type InventoryLedgerRow = {
  id: string;
  occurredAt: string;
  type: InventoryLedgerType;
  source: string;
  materialId: string;
  lotNo?: string;
  quantityText: string;
  afterStockText: string;
  operator: string;
};

export type InventoryAlert = {
  id: string;
  type: InventoryAlertType;
  materialId: string;
  lotNo?: string;
  priority: "高" | "中";
  message: string;
};

export type InventorySummary = {
  materialId: string;
  materialName: string;
  category: InventoryCategory;
  brand: string;
  currentStockBase: number;
  baseUnit: string;
  safetyStockBase?: number;
  stockRisk: InventoryStockRisk;
  nearestExpiryDate: string;
  lotCount: number;
  materialStatus: InventoryMaterialStatus;
};

export type InventoryRiskType = "负库存" | "过期" | "临期" | "低库存";

export type InventoryRiskItem = {
  id: string;
  type: InventoryRiskType;
  materialId: string;
  materialName: string;
  brand: string;
  lotNo?: string;
  valueText: string;
  actionText: string;
  targetTab: "summary" | "lots" | "alerts" | "expired";
  priority: number;
};

export type InventoryRecentActivity = InventoryLedgerRow & {
  materialLabel: string;
};

export type InventoryLedgerQuery = {
  ledgers: InventoryLedgerRow[];
  materials: InventoryMaterial[];
  direction: InventoryLedgerDirection;
  keyword?: string;
  dateRange?: [string, string] | null;
  outboundTypes?: InventoryLedgerType[];
};

type InventoryReceiveEntryCommonInput = {
  lotId: string;
  expiryDate: string;
  unitPrice: number;
  inboundQuantity: number;
  inboundUnit: string;
  baseQuantity: number;
  packageConversions: InventoryPackageConversion[];
  supplier?: string;
  supplierPhone?: string;
  receiveDate: string;
  sequence: number;
};

export type InventoryReceiveEntryInput =
  | (InventoryReceiveEntryCommonInput & {
      mode: "existing";
      material: InventoryMaterial;
    })
  | (InventoryReceiveEntryCommonInput & {
      mode: "new";
      materialId: string;
      materialName: string;
      category: InventoryCategory;
      brand: string;
      baseUnit: string;
      safetyStockBase?: number;
      note?: string;
    });

export type InventoryReceiveSearchInput = InventoryReceiveEntryCommonInput & {
  materials: InventoryMaterial[];
  materialText: string;
  selectedMaterialId?: string;
  category?: InventoryCategory;
  brand?: string;
  baseUnit?: string;
  safetyStockBase?: number;
  note?: string;
  newMaterialId: string;
};

export type InventoryPackageConversion = {
  fromUnit: string;
  quantity: number;
  toUnit: string;
};

export type InventoryReceiveEntry = {
  material: InventoryMaterial;
  lot: InventoryLot;
};

export type InventoryCategoryTab = {
  key: InventoryCategory;
  label: InventoryCategory;
  count: number;
};

export type InventoryReceiveMaterialOption = {
  label: string;
  value: string;
  materialId: string;
};

export type InventoryMaterialUsageState = {
  currentStock: number;
  batchCount: number;
  ledgerCount: number;
  inboundCount: number;
  consumptionCount: number;
  stocktakeCount: number;
  taskReferenceCount: number;
  unfinishedTaskReferenceCount: number;
  canEditBaseUnit: boolean;
};

export type InventoryMaterialEditInput = {
  materialId: string;
  materials: InventoryMaterial[];
  materialName: string;
  brand: string;
  category: InventoryCategory;
  baseUnit: string;
  safetyStockBase?: number;
  note?: string;
  canEditBaseUnit: boolean;
};

export type InventoryMaterialUpdateInput = Omit<InventoryMaterialEditInput, "materials" | "canEditBaseUnit">;

export const inventorySeedMaterials: InventoryMaterial[] = [
  {
    id: "mat-drug-florfenicol",
    materialCode: "MAT-000123",
    materialName: "氟苯尼考",
    category: "兽药",
    brand: "A品牌",
    baseUnit: "ml",
    unitSystem: ["1ml = 1ml", "1瓶 = 100ml", "1盒 = 1000ml"],
    safetyStockBase: 2000,
    status: "启用中",
    auxiliaryUnit: "瓶",
    lastStocktakeAt: "2026-06-10",
    dosageForm: "注射液",
    usageMethod: "注射",
    withdrawalPeriod: "7天",
    note: "用于治疗相关任务"
  },
  {
    id: "mat-vaccine-prrs",
    materialCode: "MAT-000124",
    materialName: "蓝耳二联疫苗",
    category: "疫苗",
    brand: "百利",
    baseUnit: "头份",
    unitSystem: ["1头份 = 1头份", "1瓶 = 20头份", "1盒 = 200头份"],
    safetyStockBase: 300,
    status: "启用中",
    auxiliaryUnit: "瓶",
    lastStocktakeAt: "2026-05-01",
    vaccineType: "活疫苗",
    administrationRoute: "肌肉注射",
    coldChain: "是",
    storageTemperature: "2-8℃",
    note: "蓝耳相关免疫任务使用"
  },
  {
    id: "mat-feed-gestation",
    materialCode: "MAT-000125",
    materialName: "妊娠母猪料",
    category: "饲料",
    brand: "牧丰",
    baseUnit: "kg",
    unitSystem: ["1kg = 1kg", "1袋 = 40kg"],
    safetyStockBase: 600,
    status: "启用中",
    auxiliaryUnit: "袋",
    lastStocktakeAt: "2026-06-18",
    note: "妊娠阶段饲喂使用"
  },
  {
    id: "mat-disinfectant-glutaraldehyde",
    materialCode: "MAT-000126",
    materialName: "戊二醛消毒液",
    category: "消毒用品",
    brand: "康洁",
    baseUnit: "L",
    unitSystem: ["1L = 1L", "1桶 = 20L"],
    safetyStockBase: 80,
    negativeStockBase: 12,
    status: "启用中",
    auxiliaryUnit: "桶",
    lastStocktakeAt: "2026-04-15",
    note: "用于栏舍消毒任务"
  },
  {
    id: "mat-tool-needle",
    materialCode: "MAT-000127",
    materialName: "连续注射器",
    category: "工具",
    brand: "牧安",
    baseUnit: "个",
    unitSystem: ["1个 = 1个"],
    safetyStockBase: 8,
    status: "启用中",
    auxiliaryUnit: "个",
    lastStocktakeAt: "2026-06-18",
    note: "治疗和免疫任务通用工具"
  }
];

export const inventorySeedLots: InventoryLot[] = [
  {
    id: "lot-flor-001",
    materialId: "mat-drug-florfenicol",
    lotNo: "FL-202606-A",
    productionDate: "2026-05-01",
    expiryDate: "2026-08-01",
    inboundQty: 2,
    inboundUnit: "盒",
    convertedQtyBase: 2000,
    remainingQtyBase: 850,
    unitPrice: 420,
    baseUnitCost: 0.42,
    supplier: "华牧供应",
    supplierPhone: "13800001111",
    status: "临期"
  },
  {
    id: "lot-flor-002",
    materialId: "mat-drug-florfenicol",
    lotNo: "FL-202606-B",
    productionDate: "2026-05-16",
    expiryDate: "2026-10-01",
    inboundQty: 10,
    inboundUnit: "瓶",
    convertedQtyBase: 1000,
    remainingQtyBase: 1000,
    unitPrice: 48,
    baseUnitCost: 0.48,
    supplier: "华牧供应",
    supplierPhone: "13800001111",
    status: "正常"
  },
  {
    id: "lot-prrs-001",
    materialId: "mat-vaccine-prrs",
    lotNo: "PRRS-202512-X",
    productionDate: "2025-12-01",
    expiryDate: "2026-06-01",
    inboundQty: 2,
    inboundUnit: "盒",
    convertedQtyBase: 400,
    remainingQtyBase: 180,
    unitPrice: 960,
    baseUnitCost: 4.8,
    supplier: "百利生物",
    supplierPhone: "13800002222",
    status: "过期"
  },
  {
    id: "lot-feed-001",
    materialId: "mat-feed-gestation",
    lotNo: "FD-202606-01",
    productionDate: "2026-06-05",
    expiryDate: "2026-12-05",
    inboundQty: 40,
    inboundUnit: "袋",
    convertedQtyBase: 1600,
    remainingQtyBase: 1320,
    unitPrice: 128,
    baseUnitCost: 3.2,
    supplier: "牧丰饲料",
    supplierPhone: "13800003333",
    status: "正常"
  },
  {
    id: "lot-tool-001",
    materialId: "mat-tool-needle",
    lotNo: "TL-202606-01",
    productionDate: "2026-06-01",
    expiryDate: "2099-12-31",
    inboundQty: 12,
    inboundUnit: "个",
    convertedQtyBase: 12,
    remainingQtyBase: 12,
    unitPrice: 86,
    baseUnitCost: 86,
    supplier: "牧安器械",
    supplierPhone: "13800004444",
    status: "正常"
  }
];

export const inventorySeedLedgers: InventoryLedgerRow[] = [
  {
    id: "ledger-001",
    occurredAt: "2026-06-17 09:12",
    type: "采购入库",
    source: "入库单 IN-20260617-01",
    materialId: "mat-drug-florfenicol",
    lotNo: "FL-202606-B",
    quantityText: "+1000ml",
    afterStockText: "1850ml",
    operator: "李静"
  },
  {
    id: "ledger-002",
    occurredAt: "2026-06-17 10:30",
    type: "业务消耗",
    source: "治疗任务 MT-20260617-A",
    materialId: "mat-drug-florfenicol",
    lotNo: "FL-202606-A",
    quantityText: "-150ml",
    afterStockText: "1850ml",
    operator: "系统"
  },
  {
    id: "ledger-003",
    occurredAt: "2026-06-17 11:20",
    type: "业务消耗",
    source: "消毒任务 DS-20260617-01",
    materialId: "mat-disinfectant-glutaraldehyde",
    quantityText: "-12L",
    afterStockText: "-12L",
    operator: "系统"
  },
  {
    id: "ledger-004",
    occurredAt: "2026-06-17 15:00",
    type: "盘亏",
    source: "盘点单 ST-20260617-01",
    materialId: "mat-vaccine-prrs",
    lotNo: "PRRS-202512-X",
    quantityText: "-20头份",
    afterStockText: "180头份",
    operator: "王敏"
  },
  {
    id: "ledger-005",
    occurredAt: "2026-06-18 08:40",
    type: "盘盈",
    source: "盘点单 ST-20260618-01",
    materialId: "mat-tool-needle",
    lotNo: "TL-202606-01",
    quantityText: "+2个",
    afterStockText: "12个",
    operator: "陈雨"
  },
  {
    id: "ledger-006",
    occurredAt: "2026-06-18 09:30",
    type: "过期报废",
    source: "过期处理单 EXP-20260618-01",
    materialId: "mat-vaccine-prrs",
    lotNo: "PRRS-202512-X",
    quantityText: "-180头份",
    afterStockText: "0头份",
    operator: "李静"
  }
];

export const inventorySeedAlerts: InventoryAlert[] = [
  {
    id: "alert-001",
    type: "负库存提醒",
    materialId: "mat-disinfectant-glutaraldehyde",
    priority: "高",
    message: "当前库存为 -12L，请核对消耗或补录入库。"
  },
  {
    id: "alert-002",
    type: "低库存提醒",
    materialId: "mat-drug-florfenicol",
    priority: "中",
    message: "当前库存 1850ml，低于安全库存 2000ml。"
  },
  {
    id: "alert-003",
    type: "过期提醒",
    materialId: "mat-vaccine-prrs",
    lotNo: "PRRS-202512-X",
    priority: "高",
    message: "批次 PRRS-202512-X 已过期，需处理。"
  }
];

export function formatInventoryQty(value: number, unit: string): string {
  if (!unit || unit === "—") return value === 0 ? "—" : String(value);
  return `${Number.isInteger(value) ? value : value.toFixed(1)}${unit}`;
}

export function formatNearestExpiryDate(summary: InventorySummary): string {
  return summary.category === "工具" ? "—" : summary.nearestExpiryDate;
}

export function generateInventoryLotNo(receiveDate: string, sequence: number): string {
  const dateText = receiveDate.replace(/-/g, "");
  return `RK-${dateText}-${String(sequence).padStart(3, "0")}`;
}

export const inventoryUnitOptions = ["ml", "g", "kg", "吨", "头份", "份", "瓶", "袋", "盒", "箱", "桶", "支", "个"];

export const receiveMaterialCategoryOptions: InventoryCategory[] = ["饲料", "兽药", "保健品", "疫苗", "消毒用品", "精液", "其他"];

export const inventoryCategoryBaseUnitRecommendations: Record<InventoryCategory, string[]> = {
  饲料: ["kg"],
  兽药: ["ml", "g"],
  保健品: ["g", "ml"],
  疫苗: ["头份", "ml"],
  消毒用品: ["ml", "g", "kg"],
  工具: ["个"],
  精液: ["份"],
  其他: ["个"]
};

export function getInventoryMaterialStatus(material: InventoryMaterial): InventoryMaterialStatus {
  return material.status === "已停用" ? "已停用" : "启用中";
}

export function isInventoryMaterialEnabled(material: InventoryMaterial): boolean {
  return getInventoryMaterialStatus(material) === "启用中";
}

export function getInventoryReceiveMaterialOptions(materials: InventoryMaterial[]): InventoryReceiveMaterialOption[] {
  return materials
    .filter(isInventoryMaterialEnabled)
    .map((item) => ({
      label: `${item.materialName}${item.brand !== "—" ? ` ${item.brand}` : ""} · ${item.category}`,
      value: item.materialName,
      materialId: item.id
    }));
}

export function buildInventoryMaterialUsageState(
  materialId: string,
  materials: InventoryMaterial[],
  lots: InventoryLot[],
  ledgers: InventoryLedgerRow[]
): InventoryMaterialUsageState {
  const material = materials.find((item) => item.id === materialId);
  const materialLots = lots.filter((lot) => lot.materialId === materialId);
  const materialLedgers = ledgers.filter((ledger) => ledger.materialId === materialId);
  const currentStock =
    materialLots.reduce((sum, lot) => sum + lot.remainingQtyBase, 0) - (material?.negativeStockBase || 0);
  const inboundCount = materialLedgers.filter((ledger) => ledger.type === "采购入库" || ledger.type === "盘盈").length;
  const consumptionCount = materialLedgers.filter((ledger) => ledger.type === "业务消耗").length;
  const stocktakeCount = materialLedgers.filter((ledger) => ledger.type === "盘盈" || ledger.type === "盘亏").length;
  const taskReferenceCount = consumptionCount;
  const unfinishedTaskReferenceCount = 0;
  const businessRecords =
    materialLots.length > 0 ||
    materialLedgers.length > 0 ||
    inboundCount > 0 ||
    consumptionCount > 0 ||
    stocktakeCount > 0 ||
    taskReferenceCount > 0 ||
    unfinishedTaskReferenceCount > 0 ||
    currentStock !== 0;

  return {
    currentStock,
    batchCount: materialLots.length,
    ledgerCount: materialLedgers.length,
    inboundCount,
    consumptionCount,
    stocktakeCount,
    taskReferenceCount,
    unfinishedTaskReferenceCount,
    canEditBaseUnit: !businessRecords
  };
}

export function hasInventoryMaterialBusinessRecords(state: InventoryMaterialUsageState): boolean {
  return !state.canEditBaseUnit;
}

export function validateInventoryMaterialEdit(input: InventoryMaterialEditInput): string | null {
  const materialName = input.materialName.trim();
  const brand = input.brand.trim();
  const note = input.note?.trim() || "";

  if (!materialName) return "物料名称必填。";
  if (!brand) return "品牌必填。";
  if (!inventoryCategoryOrder.includes(input.category)) return "物料分类必须来自固定枚举。";
  if (!input.baseUnit) return "核算单位必填。";
  if (!inventoryUnitOptions.includes(input.baseUnit)) return "核算单位必须来自单位字典。";
  if (input.safetyStockBase !== undefined && input.safetyStockBase < 0) return "安全库存必须大于等于 0。";
  if (note.length > 200) return "备注不能超过 200 字。";

  const currentMaterial = input.materials.find((material) => material.id === input.materialId);
  if (currentMaterial && !input.canEditBaseUnit && currentMaterial.baseUnit !== input.baseUnit) {
    return "当前物料已有库存或历史记录，核算单位不可修改。如需更换单位，请新建物料并停用当前物料。";
  }

  const duplicated = input.materials.some(
    (material) =>
      material.id !== input.materialId &&
      material.materialName === materialName &&
      material.brand === brand &&
      material.category === input.category &&
      material.baseUnit === input.baseUnit
  );
  if (duplicated) return "已存在相同物料，请勿重复创建或修改。";

  return null;
}

export function updateInventoryMaterial(
  materials: InventoryMaterial[],
  input: InventoryMaterialUpdateInput
): InventoryMaterial[] {
  return materials.map((material) =>
    material.id === input.materialId
      ? {
          ...material,
          materialName: input.materialName.trim(),
          brand: input.brand.trim(),
          category: input.category,
          baseUnit: input.baseUnit,
          safetyStockBase: input.safetyStockBase,
          note: input.note?.trim()
        }
      : material
  );
}

export function toggleInventoryMaterialStatus(
  materials: InventoryMaterial[],
  materialId: string,
  status: InventoryMaterialStatus
): InventoryMaterial[] {
  return materials.map((material) => (material.id === materialId ? { ...material, status } : material));
}

export function buildInventoryUnitSystem(baseUnit: string, conversions: InventoryPackageConversion[]): string[] {
  const conversionTexts = conversions.map((conversion) => `1${conversion.fromUnit} = ${conversion.quantity}${conversion.toUnit}`);
  return [`1${baseUnit} = 1${baseUnit}`, ...conversionTexts];
}

export function resolveInventoryUnitFactor(
  unit: string,
  baseUnit: string,
  conversions: InventoryPackageConversion[]
): number | null {
  if (!unit || !baseUnit) return null;
  if (unit === baseUnit) return 1;

  const conversionMap = new Map(conversions.map((conversion) => [conversion.fromUnit, conversion]));
  const visited = new Set<string>();

  const walk = (currentUnit: string): number | null => {
    if (currentUnit === baseUnit) return 1;
    if (visited.has(currentUnit)) return null;
    visited.add(currentUnit);

    const conversion = conversionMap.get(currentUnit);
    if (!conversion || conversion.quantity <= 0 || conversion.fromUnit === conversion.toUnit) return null;

    const nextFactor = walk(conversion.toUnit);
    return nextFactor === null ? null : conversion.quantity * nextFactor;
  };

  return walk(unit);
}

export function validateInventoryPackageConversions(
  baseUnit: string,
  conversions: InventoryPackageConversion[]
): string | null {
  if (!baseUnit || conversions.length === 0) return "请完善包装规格后再提交入库。";

  const seenUnits = new Set<string>();
  for (const conversion of conversions) {
    if (!conversion.fromUnit || !conversion.toUnit || !conversion.quantity) return "请完善包装规格后再提交入库。";
    if (conversion.quantity <= 0) return "包装规格中的数量必须大于 0。";
    if (conversion.fromUnit === conversion.toUnit) return "包装单位不能和右侧单位相同。";
    if (seenUnits.has(conversion.fromUnit)) return "包装单位不能重复。";
    seenUnits.add(conversion.fromUnit);
  }

  for (const conversion of conversions) {
    if (resolveInventoryUnitFactor(conversion.fromUnit, baseUnit, conversions) === null) {
      return "多级包装必须能最终换算到核算单位。";
    }
  }

  return null;
}

export function calculateInventoryBaseQuantity(
  quantity: number,
  unit: string,
  baseUnit: string,
  conversions: InventoryPackageConversion[]
): number | null {
  if (!quantity || quantity <= 0) return null;
  const factor = resolveInventoryUnitFactor(unit, baseUnit, conversions);
  return factor === null ? null : quantity * factor;
}

export function buildInventoryReceiveEntry(input: InventoryReceiveEntryInput): InventoryReceiveEntry {
  const packageValidationMessage = validateInventoryPackageConversions(
    input.mode === "existing" ? input.material.baseUnit : input.baseUnit,
    input.packageConversions
  );
  if (packageValidationMessage) {
    throw new Error(packageValidationMessage);
  }
  if (input.inboundQuantity <= 0 || input.baseQuantity <= 0) {
    throw new Error("入库数量必须大于 0");
  }

  const material: InventoryMaterial =
    input.mode === "existing"
      ? input.material
      : {
          id: input.materialId,
          materialName: input.materialName,
          category: input.category,
          brand: input.brand,
          baseUnit: input.baseUnit,
          unitSystem: buildInventoryUnitSystem(input.baseUnit, input.packageConversions),
          safetyStockBase: input.safetyStockBase,
          status: "启用中",
          auxiliaryUnit: input.packageConversions[0]?.fromUnit,
          note: input.note
        };

  const lot: InventoryLot = {
    id: input.lotId,
    materialId: material.id,
    lotNo: generateInventoryLotNo(input.receiveDate, input.sequence),
    expiryDate: input.expiryDate,
    inboundQty: input.inboundQuantity,
    inboundUnit: input.inboundUnit,
    convertedQtyBase: input.baseQuantity,
    remainingQtyBase: input.baseQuantity,
    unitPrice: input.unitPrice,
    baseUnitCost: input.baseQuantity > 0 ? (input.unitPrice * input.inboundQuantity) / input.baseQuantity : input.unitPrice,
    packageConversions: input.packageConversions,
    supplier: input.supplier,
    supplierPhone: input.supplierPhone,
    status: "正常"
  };

  return { material, lot };
}

export function buildInventoryReceiveEntryFromSearch(input: InventoryReceiveSearchInput): InventoryReceiveEntry {
  const existingMaterial = input.selectedMaterialId
    ? input.materials.find((item) => item.id === input.selectedMaterialId)
    : input.materials.find((item) => item.materialName === input.materialText.trim() && isInventoryMaterialEnabled(item));

  if (existingMaterial && isInventoryMaterialEnabled(existingMaterial)) {
    return buildInventoryReceiveEntry({
      mode: "existing",
      material: existingMaterial,
      lotId: input.lotId,
      expiryDate: input.expiryDate,
      unitPrice: input.unitPrice,
      inboundQuantity: input.inboundQuantity,
      inboundUnit: input.inboundUnit,
      baseQuantity: input.baseQuantity,
      packageConversions: input.packageConversions,
      supplier: input.supplier,
      supplierPhone: input.supplierPhone,
      receiveDate: input.receiveDate,
      sequence: input.sequence
    });
  }

  if (!input.category) {
    throw new Error("新增物料入库必须选择物料分类");
  }
  if (!input.brand || !input.baseUnit) {
    throw new Error("新增物料入库必须填写品牌和核算单位");
  }

  return buildInventoryReceiveEntry({
    mode: "new",
    materialId: input.newMaterialId,
    materialName: input.materialText.trim(),
    category: input.category,
    brand: input.brand,
    baseUnit: input.baseUnit,
    safetyStockBase: input.safetyStockBase,
    note: input.note,
    lotId: input.lotId,
    expiryDate: input.expiryDate,
    unitPrice: input.unitPrice,
    inboundQuantity: input.inboundQuantity,
    inboundUnit: input.inboundUnit,
    baseQuantity: input.baseQuantity,
    packageConversions: input.packageConversions,
    supplier: input.supplier,
    supplierPhone: input.supplierPhone,
    receiveDate: input.receiveDate,
    sequence: input.sequence
  });
}

export function buildInventorySummaries(
  materials: InventoryMaterial[],
  lots: InventoryLot[]
): InventorySummary[] {
  return materials.map((material) => {
    const materialLots = lots.filter((lot) => lot.materialId === material.id);
    const lotStock = materialLots.reduce((sum, lot) => sum + lot.remainingQtyBase, 0);
    const currentStockBase = lotStock - (material.negativeStockBase || 0);
    const datedLots = materialLots
      .filter((lot) => lot.remainingQtyBase > 0 && lot.status !== "已耗尽")
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
    const nearestExpiryDate = material.category === "工具" ? "—" : datedLots[0]?.expiryDate || "—";

    const stockRisk: InventoryStockRisk =
      currentStockBase < 0
        ? "负库存"
        : material.safetyStockBase !== undefined && currentStockBase <= material.safetyStockBase
          ? "低库存"
          : "无风险";

    return {
      materialId: material.id,
      materialName: material.materialName,
      category: material.category,
      brand: material.brand,
      currentStockBase,
      baseUnit: material.baseUnit,
      safetyStockBase: material.safetyStockBase,
      stockRisk,
      nearestExpiryDate,
      lotCount: materialLots.length,
      materialStatus: getInventoryMaterialStatus(material)
    };
  });
}

export const inventoryCategoryOrder: InventoryCategory[] = ["饲料", "兽药", "疫苗", "消毒用品", "保健品", "工具", "精液", "其他"];

export function filterInventorySummariesByMaterialStatus(
  summaries: InventorySummary[],
  _materials: InventoryMaterial[] = [],
  statusFilter: InventoryMaterialStatusFilter = "启用中"
): InventorySummary[] {
  if (statusFilter === "全部") return summaries;
  return summaries.filter((summary) => summary.materialStatus === statusFilter);
}

export function buildInventoryCategoryTabs(
  summaries: InventorySummary[],
  materialsOrStatusFilter: InventoryMaterial[] | InventoryMaterialStatusFilter = "启用中",
  statusFilter?: InventoryMaterialStatusFilter
): InventoryCategoryTab[] {
  const resolvedStatusFilter =
    typeof materialsOrStatusFilter === "string" ? materialsOrStatusFilter : statusFilter || "启用中";
  const filteredSummaries = filterInventorySummariesByMaterialStatus(summaries, [], resolvedStatusFilter);
  return inventoryCategoryOrder.map((category) => ({
    key: category,
    label: category,
    count: filteredSummaries.filter((summary) => summary.category === category).length
  }));
}

export function getInventoryLotsForMaterial(lots: InventoryLot[], materialId: string): InventoryLot[] {
  const resolveLotSortRank = (lot: InventoryLot) => {
    if (lot.status === "过期") return 0;
    if (lot.status === "临期") return 1;
    if (lot.status === "已耗尽" || lot.remainingQtyBase <= 0) return 3;
    return 2;
  };

  return lots
    .filter((lot) => lot.materialId === materialId)
    .slice()
    .sort(
      (a, b) =>
        resolveLotSortRank(a) - resolveLotSortRank(b) ||
        new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
    );
}

export function getInventoryMaterialLabel(materials: InventoryMaterial[], materialId: string): string {
  const material = materials.find((item) => item.id === materialId);
  return material ? `${material.materialName} ${material.brand}` : "—";
}

export function getInventoryLedgerDirection(type: InventoryLedgerType): InventoryLedgerDirection {
  return type === "采购入库" || type === "盘盈" ? "inbound" : "outbound";
}

export function buildInventoryLedgerTabCounts(ledgers: InventoryLedgerRow[]): Record<InventoryLedgerDirection, number> {
  return ledgers.reduce(
    (counts, ledger) => {
      counts[getInventoryLedgerDirection(ledger.type)] += 1;
      return counts;
    },
    { inbound: 0, outbound: 0 }
  );
}

export function buildInventoryLedgerQuantityDisplay(ledger: InventoryLedgerRow) {
  return {
    changeText: ledger.quantityText,
    balanceText: ledger.afterStockText
  };
}

export function filterInventoryLedgers(query: InventoryLedgerQuery): InventoryLedgerRow[] {
  const keyword = query.keyword?.trim() || "";
  const materialMap = new Map(query.materials.map((material) => [material.id, material]));

  return query.ledgers
    .filter((ledger) => getInventoryLedgerDirection(ledger.type) === query.direction)
    .filter((ledger) => {
      if (!query.dateRange) return true;
      const ledgerDate = ledger.occurredAt.slice(0, 10);
      return ledgerDate >= query.dateRange[0] && ledgerDate <= query.dateRange[1];
    })
    .filter((ledger) => {
      if (query.direction !== "outbound" || !query.outboundTypes?.length) return true;
      return query.outboundTypes.includes(ledger.type);
    })
    .filter((ledger) => {
      if (!keyword) return true;
      const material = materialMap.get(ledger.materialId);
      return `${material?.materialName || ""}${material?.brand || ""}${ledger.lotNo || ""}`.includes(keyword);
    })
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
}

export function buildInventoryRiskItems(
  materials: InventoryMaterial[],
  lots: InventoryLot[],
  summaries: InventorySummary[]
): InventoryRiskItem[] {
  const materialMap = new Map(materials.map((material) => [material.id, material]));
  const items: InventoryRiskItem[] = [];

  for (const summary of summaries) {
    if (summary.currentStockBase < 0) {
      items.push({
        id: `risk-negative-${summary.materialId}`,
        type: "负库存",
        materialId: summary.materialId,
        materialName: summary.materialName,
        brand: summary.brand,
        valueText: formatInventoryQty(summary.currentStockBase, summary.baseUnit),
        actionText: "核对消耗",
        targetTab: "alerts",
        priority: 1
      });
    }
  }

  for (const lot of lots) {
    const material = materialMap.get(lot.materialId);
    if (!material) continue;
    if (lot.status === "过期") {
      items.push({
        id: `risk-expired-${lot.id}`,
        type: "过期",
        materialId: lot.materialId,
        materialName: material.materialName,
        brand: material.brand,
        lotNo: lot.lotNo,
        valueText: `${lot.lotNo} · ${formatInventoryQty(lot.remainingQtyBase, material.baseUnit)}`,
        actionText: "去处理",
        targetTab: "expired",
        priority: 2
      });
    }
  }

  for (const lot of lots) {
    const material = materialMap.get(lot.materialId);
    if (!material) continue;
    if (lot.status === "临期") {
      items.push({
        id: `risk-expiring-${lot.id}`,
        type: "临期",
        materialId: lot.materialId,
        materialName: material.materialName,
        brand: material.brand,
        lotNo: lot.lotNo,
        valueText: `${lot.expiryDate} 到期`,
        actionText: "优先使用",
        targetTab: "lots",
        priority: 3
      });
    }
  }

  for (const summary of summaries) {
    if (summary.stockRisk === "低库存" && summary.safetyStockBase !== undefined) {
      items.push({
        id: `risk-low-${summary.materialId}`,
        type: "低库存",
        materialId: summary.materialId,
        materialName: summary.materialName,
        brand: summary.brand,
        valueText: `${formatInventoryQty(summary.currentStockBase, summary.baseUnit)} / 安全 ${formatInventoryQty(summary.safetyStockBase, summary.baseUnit)}`,
        actionText: "安排补货",
        targetTab: "summary",
        priority: 4
      });
    }
  }

  return items.sort((a, b) => a.priority - b.priority || a.materialName.localeCompare(b.materialName, "zh-Hans-CN"));
}

export function buildInventoryRecentActivities(
  materials: InventoryMaterial[],
  ledgers: InventoryLedgerRow[]
): InventoryRecentActivity[] {
  return ledgers
    .map((ledger) => ({
      ...ledger,
      materialLabel: getInventoryMaterialLabel(materials, ledger.materialId)
    }))
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
}
