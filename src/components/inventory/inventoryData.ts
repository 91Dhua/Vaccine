export type InventoryCategory = "饲料" | "兽药" | "保健品" | "疫苗" | "消毒用品" | "工具" | "其他";
export type InventoryLotStatus = "正常" | "临期" | "过期" | "已耗尽";
export type InventoryStockRisk = "无风险" | "低库存" | "负库存";
export type InventoryLedgerType =
  | "采购入库"
  | "业务消耗"
  | "消耗冲销"
  | "入库更正"
  | "盘盈"
  | "盘亏"
  | "报废"
  | "盘点调整";
export type InventoryLedgerDirection = "inbound" | "outbound";
export type InventoryAlertType = "负库存提醒" | "低库存提醒" | "临期提醒" | "过期提醒";
export type InventoryMaterialStatus = "启用中" | "已停用";
export type InventoryMaterialStatusFilter = "全部" | InventoryMaterialStatus;

export type InventoryFeedStage = {
  phase: string;
  startDay?: number;
  endDay?: number;
};

export type InventoryMaterial = {
  id: string;
  materialCode?: string;
  materialName: string;
  materialNameEn?: string;
  category: InventoryCategory;
  brand: string;
  brandEn?: string;
  baseUnit: string;
  unitSystem: string[];
  packageConversions?: InventoryPackageConversion[];
  safetyStockBase?: number;
  negativeStockBase?: number;
  status?: InventoryMaterialStatus;
  auxiliaryUnit?: string;
  lastStocktakeAt?: string;
  /** 档案专属字段未填齐时标记，提示去物料管理补全 */
  profileIncomplete?: boolean;
  // 兽药 / 疫苗 共用
  dosageForm?: string;
  usageMethod?: string;
  withdrawalPeriod?: string;
  // 疫苗专属
  vaccineType?: string;
  administrationRoute?: string;
  coldChain?: string;
  storageTemperature?: string;
  standardDosage?: string;
  durationOfImmunity?: string;
  immuneIntervalDays?: number;
  // 饲料专属
  feedForm?: string;
  applicablePigTypes?: string[];
  applicableStages?: InventoryFeedStage[];
  // 消毒用品专属
  activeIngredient?: string;
  dilutionRatio?: string;
  disinfectScenes?: string[];
  // 保健品专属（使用方式复用 usageMethod）
  mainIngredient?: string;
  note?: string;
};

/** 分类专属字段元数据：物料管理新增/编辑与入库快建共用同一套字段定义 */
export type InventoryMaterialFieldType =
  | "text"
  | "number"
  | "select"
  | "multiSelect"
  | "feedStages";

export type InventoryMaterialFieldSpec = {
  key: keyof InventoryMaterial;
  label: string;
  type: InventoryMaterialFieldType;
  /** 在物料管理完整档案中是否必填 */
  required?: boolean;
  /** 在入库快建弹窗中是否必填（未设置则快建时选填） */
  requiredInQuick?: boolean;
  options?: string[];
  placeholder?: string;
};

export const inventoryProductionPhaseOptions = [
  "妊娠期",
  "泌乳期",
  "空怀期",
  "发情期",
  "后备期"
];

export const inventoryPigTypeOptions = [
  "生产母猪",
  "生产公猪",
  "仔猪",
  "育肥猪",
  "后备母猪"
];

export const inventoryCategoryFieldSpecs: Record<
  InventoryCategory,
  InventoryMaterialFieldSpec[]
> = {
  兽药: [
    {
      key: "dosageForm",
      label: "剂型",
      type: "select",
      options: ["注射液", "粉剂", "预混剂", "口服液", "片剂"]
    },
    {
      key: "usageMethod",
      label: "使用方式",
      type: "select",
      options: ["注射", "拌料", "饮水", "外用"]
    },
    { key: "withdrawalPeriod", label: "休药期", type: "text", placeholder: "如 7天" }
  ],
  疫苗: [
    {
      key: "vaccineType",
      label: "疫苗类型",
      type: "select",
      required: true,
      options: ["病毒性", "细菌性", "寄生虫", "活疫苗", "灭活疫苗"]
    },
    {
      key: "administrationRoute",
      label: "接种方式",
      type: "select",
      required: true,
      requiredInQuick: true,
      options: ["肌肉注射", "皮下注射", "滴鼻", "饮水", "喷雾"]
    },
    {
      key: "dosageForm",
      label: "剂型",
      type: "select",
      required: true,
      options: ["活疫苗（冻干苗）", "油佐剂灭活疫苗", "水佐剂灭活疫苗"]
    },
    { key: "coldChain", label: "是否冷链", type: "select", options: ["是", "否"] },
    { key: "storageTemperature", label: "储存温度", type: "text", placeholder: "如 2-8℃" },
    { key: "standardDosage", label: "单次剂量", type: "text", placeholder: "如 2 ml/头" },
    { key: "durationOfImmunity", label: "免疫有效期", type: "text", placeholder: "如 6 个月" },
    { key: "withdrawalPeriod", label: "休药期", type: "text", placeholder: "如 0天" },
    { key: "immuneIntervalDays", label: "免疫间隔期(天)", type: "number" }
  ],
  饲料: [
    {
      key: "feedForm",
      label: "形态",
      type: "select",
      options: ["颗粒", "粉料", "浓缩料"]
    },
    {
      key: "applicablePigTypes",
      label: "适用猪只",
      type: "multiSelect",
      required: true,
      requiredInQuick: true,
      options: inventoryPigTypeOptions
    },
    {
      key: "applicableStages",
      label: "适用阶段",
      type: "feedStages",
      required: true,
      requiredInQuick: true
    }
  ],
  消毒用品: [
    { key: "activeIngredient", label: "有效成分", type: "text" },
    { key: "dilutionRatio", label: "稀释比例", type: "text", placeholder: "如 1:200" },
    {
      key: "disinfectScenes",
      label: "适用场景",
      type: "multiSelect",
      options: ["空栏", "带猪", "器械", "车辆", "人员"]
    }
  ],
  保健品: [
    { key: "mainIngredient", label: "主要成分", type: "text" },
    {
      key: "usageMethod",
      label: "使用方式",
      type: "select",
      options: ["拌料", "饮水", "注射", "外用"]
    }
  ],
  工具: [],
  其他: []
};

export function formatFeedStage(stage: InventoryFeedStage) {
  const range =
    stage.startDay != null && stage.endDay != null
      ? `${stage.startDay}-${stage.endDay}天`
      : stage.startDay != null
        ? `${stage.startDay}天起`
        : stage.endDay != null
          ? `至${stage.endDay}天`
          : "";
  return range ? `${stage.phase} ${range}` : stage.phase;
}

export function isMaterialProfileIncomplete(material: InventoryMaterial): boolean {
  const specs = inventoryCategoryFieldSpecs[material.category] || [];
  return specs.some((spec) => {
    if (!spec.required) return false;
    const raw = material[spec.key];
    if (raw == null || raw === "") return true;
    if (spec.type === "feedStages") {
      if (!Array.isArray(raw) || raw.length === 0) return true;
      return !(raw as InventoryFeedStage[]).some(
        (stage) =>
          Boolean(stage.phase) &&
          typeof stage.startDay === "number" &&
          typeof stage.endDay === "number"
      );
    }
    if (Array.isArray(raw)) return raw.length === 0;
    return false;
  });
}

export function generateInventoryMaterialCode(materials: InventoryMaterial[]): string {
  const maxCode = materials.reduce((max, material) => {
    const match = /^MAT-(\d+)$/.exec(material.materialCode || "");
    if (!match) return max;
    return Math.max(max, Number(match[1]));
  }, 0);
  return `MAT-${String(maxCode + 1).padStart(6, "0")}`;
}

export function formatInventoryMaterialFieldValue(
  material: InventoryMaterial,
  spec: InventoryMaterialFieldSpec
): string {
  const raw = material[spec.key];
  if (raw == null || raw === "") return "";
  if (spec.type === "feedStages" && Array.isArray(raw)) {
    return (raw as InventoryFeedStage[]).map(formatFeedStage).join("；");
  }
  if (Array.isArray(raw)) {
    return (raw as string[]).join("、");
  }
  return String(raw);
}

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
  stocktakeAdjustmentType?: "盘盈库存";
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
  remark?: string;
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
export type InventoryStocktakeMode = "异常盘点" | "指定物料盘点" | "分类盘点" | "全部盘点";
export type InventoryStocktakeReason = "负库存" | "低库存" | "临期" | "已过期" | "手动添加" | "分类盘点" | "全部盘点";
export type InventoryStocktakeRowStatus = "异常" | "可盘点";
export type InventoryStocktakeTaskStatus = "待盘点" | "盘点中" | "待确认" | "已完成" | "已取消";
export type InventoryStocktakeAdjustmentReason =
  | "漏记入库"
  | "漏记出库"
  | "重复出库"
  | "单位换算错误"
  | "批次录错"
  | "实际损耗"
  | "破损/污染"
  | "历史库存错误"
  | "其他";

export type InventoryStocktakeScopeRow = {
  id: string;
  materialId: string;
  lotId?: string;
  materialName: string;
  brand: string;
  category: InventoryCategory;
  lotNo?: string;
  bookQtyBase: number;
  baseUnit: string;
  reason: InventoryStocktakeReason;
  status: InventoryStocktakeRowStatus;
};

export type InventoryStocktakeScopeInput = {
  mode: InventoryStocktakeMode;
  materials: InventoryMaterial[];
  lots: InventoryLot[];
  summaries: InventorySummary[];
  targetMaterialId?: string;
  category?: InventoryCategory;
};

export type InventoryStocktakeTransactionInput = {
  materials: InventoryMaterial[];
  lots: InventoryLot[];
  scopeRows: InventoryStocktakeScopeRow[];
  actualQuantities: Record<string, number | undefined>;
  operator: string;
  stocktakeNo: string;
  occurredAt: string;
  ledgerIdPrefix: string;
};

export type InventoryStocktakeTransaction = {
  materials: InventoryMaterial[];
  lots: InventoryLot[];
  ledgers: InventoryLedgerRow[];
  summary: {
    materialCount: number;
    noDifferenceCount: number;
    gainCount: number;
    lossCount: number;
    adjustmentCount: number;
  };
};

export type InventoryDifferenceDirection = "盘盈" | "盘亏";
export type InventoryDifferenceStatus = "待处理" | "已处理" | "已取消";
export type InventoryDifferenceFinanceStatus = "无需确认" | "财务待确认";
export type InventoryDifferenceMethod =
  | "任务出库多扣"
  | "入库数量更正"
  | "入库少录补金额"
  | "供应商多送赠品"
  | "原因不明盘盈"
  | "漏记任务出库"
  | "入库多录"
  | "破损污染过期报废"
  | "原因不明盘亏";

export type InventoryDifferenceMethodMeta = {
  method: InventoryDifferenceMethod;
  direction: InventoryDifferenceDirection;
  label: string;
  scene: string;
  ledgerType: InventoryLedgerType;
  stockEffect: "增加" | "减少";
  consumptionEffect: "冲减" | "增加" | "不影响";
  financeStatus: InventoryDifferenceFinanceStatus;
  needsRelatedLot: boolean;
};

export const inventoryDifferenceMethodMetas: InventoryDifferenceMethodMeta[] = [
  {
    method: "任务出库多扣",
    direction: "盘盈",
    label: "任务/出库多扣",
    scene: "系统扣减多于实际用量，实物比账面多。还回原批次并冲减业务消耗。",
    ledgerType: "消耗冲销",
    stockEffect: "增加",
    consumptionEffect: "冲减",
    financeStatus: "无需确认",
    needsRelatedLot: true
  },
  {
    method: "入库数量更正",
    direction: "盘盈",
    label: "入库数量更正（金额不变）",
    scene: "实际收货数量大于录入数量，采购金额没错。补正入库数量并摊薄该批单价。",
    ledgerType: "入库更正",
    stockEffect: "增加",
    consumptionEffect: "不影响",
    financeStatus: "无需确认",
    needsRelatedLot: true
  },
  {
    method: "入库少录补金额",
    direction: "盘盈",
    label: "入库少录（需补金额）",
    scene: "实际收货数量与采购金额都少录。补录入库数量，金额口径留财务确认。",
    ledgerType: "入库更正",
    stockEffect: "增加",
    consumptionEffect: "不影响",
    financeStatus: "财务待确认",
    needsRelatedLot: false
  },
  {
    method: "供应商多送赠品",
    direction: "盘盈",
    label: "供应商多送 / 赠品",
    scene: "供应商多送不收费。按估值生成赠品批次，金额口径留财务确认。",
    ledgerType: "盘盈",
    stockEffect: "增加",
    consumptionEffect: "不影响",
    financeStatus: "财务待确认",
    needsRelatedLot: false
  },
  {
    method: "原因不明盘盈",
    direction: "盘盈",
    label: "原因不明，作为盘盈调整",
    scene: "查不清来源但实物确实多。生成盘盈调整批次，按估值入库，不计采购支出。",
    ledgerType: "盘盈",
    stockEffect: "增加",
    consumptionEffect: "不影响",
    financeStatus: "财务待确认",
    needsRelatedLot: false
  },
  {
    method: "漏记任务出库",
    direction: "盘亏",
    label: "漏记任务 / 出库",
    scene: "实物已用掉但系统漏扣。补录业务消耗，计入本月消耗。",
    ledgerType: "业务消耗",
    stockEffect: "减少",
    consumptionEffect: "增加",
    financeStatus: "无需确认",
    needsRelatedLot: false
  },
  {
    method: "入库多录",
    direction: "盘亏",
    label: "入库多录",
    scene: "入库数量录多了。更正入库数量，减少对应批次库存。",
    ledgerType: "入库更正",
    stockEffect: "减少",
    consumptionEffect: "不影响",
    financeStatus: "无需确认",
    needsRelatedLot: true
  },
  {
    method: "破损污染过期报废",
    direction: "盘亏",
    label: "破损 / 污染 / 过期，发起报废",
    scene: "实物不可用。走报废扣减对应批次，记报废损失。",
    ledgerType: "报废",
    stockEffect: "减少",
    consumptionEffect: "不影响",
    financeStatus: "无需确认",
    needsRelatedLot: true
  },
  {
    method: "原因不明盘亏",
    direction: "盘亏",
    label: "原因不明，作为盘亏调整",
    scene: "查不清原因。默认从最近到期批次扣减，记盘亏损失，不计入消耗。",
    ledgerType: "盘亏",
    stockEffect: "减少",
    consumptionEffect: "不影响",
    financeStatus: "财务待确认",
    needsRelatedLot: false
  }
];

export type InventoryDifferenceRecord = {
  id: string;
  stocktakeNo: string;
  materialId: string;
  materialName: string;
  brand: string;
  category: InventoryCategory;
  baseUnit: string;
  snapshotQtyBase: number;
  bookQtyBase: number;
  actualQtyBase: number;
  diffBase: number;
  direction: InventoryDifferenceDirection;
  status: InventoryDifferenceStatus;
  financeStatus: InventoryDifferenceFinanceStatus;
  method?: InventoryDifferenceMethod;
  relatedLotNo?: string;
  resultLedgerIds?: string[];
  createdAt: string;
  processedAt?: string;
  operator: string;
};

export type InventoryStocktakeDifferenceInput = {
  scopeRows: InventoryStocktakeScopeRow[];
  actualQuantities: Record<string, number | undefined>;
  snapshotQuantities?: Record<string, number>;
  stocktakeNo: string;
  operator: string;
  occurredAt: string;
  idPrefix: string;
};

export type InventoryAutoDifferenceResolutionInput = {
  differences: InventoryDifferenceRecord[];
  materials: InventoryMaterial[];
  lots: InventoryLot[];
  operator: string;
  occurredAt: string;
  ledgerIdPrefix: string;
};

export type InventoryAutoDifferenceResolution = {
  pendingDifferences: InventoryDifferenceRecord[];
  processedDifferences: InventoryDifferenceRecord[];
  materials: InventoryMaterial[];
  lots: InventoryLot[];
  ledgers: InventoryLedgerRow[];
};

export type InventoryDifferenceResolutionInput = {
  record: InventoryDifferenceRecord;
  method: InventoryDifferenceMethod;
  materials: InventoryMaterial[];
  lots: InventoryLot[];
  relatedLotNo?: string;
  operator: string;
  occurredAt: string;
  ledgerIdPrefix: string;
};

export type InventoryDifferenceResolution = {
  materials: InventoryMaterial[];
  lots: InventoryLot[];
  ledgers: InventoryLedgerRow[];
  financeStatus: InventoryDifferenceFinanceStatus;
};

export type InventoryScrapTransactionInput = {
  materials: InventoryMaterial[];
  lots: InventoryLot[];
  lotId: string;
  scrapQuantity: number;
  reason: string;
  handlingMethod: string;
  operator: string;
  occurredAt: string;
  ledgerId: string;
};

export type InventoryScrapTransaction = {
  lots: InventoryLot[];
  ledger: InventoryLedgerRow;
};

export type InventoryRiskItem = {
  id: string;
  type: InventoryRiskType;
  materialId: string;
  materialName: string;
  brand: string;
  lotNo?: string;
  valueText: string;
  actionText?: string;
  targetTab: "summary" | "lots" | "alerts";
  priority: number;
};

export type InventoryRecentActivity = InventoryLedgerRow & {
  materialLabel: string;
};

export type InventoryLedgerQuery = {
  ledgers: InventoryLedgerRow[];
  materials: InventoryMaterial[];
  keyword?: string;
  dateRange?: [string, string] | null;
  ledgerTypes?: InventoryLedgerType[];
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

export type InventoryOutboundTransactionInput = {
  materials: InventoryMaterial[];
  lots: InventoryLot[];
  materialId: string;
  outboundQuantity: number;
  purpose: string;
  remark?: string;
  operator: string;
  outboundDate: string;
  ledgerIdPrefix: string;
};

export type InventoryOutboundTransaction = {
  materials: InventoryMaterial[];
  lots: InventoryLot[];
  ledgers: InventoryLedgerRow[];
};

export const inventorySeedMaterials: InventoryMaterial[] = [
  {
    id: "mat-drug-florfenicol",
    materialCode: "MAT-000123",
    materialName: "氟苯尼考",
    materialNameEn: "Florfenicol",
    category: "兽药",
    brand: "A品牌",
    brandEn: "Brand A",
    baseUnit: "ml",
    unitSystem: ["1ml = 1ml", "1瓶 = 100ml", "1盒 = 1000ml"],
    packageConversions: [
      { fromUnit: "瓶", quantity: 100, toUnit: "ml" },
      { fromUnit: "盒", quantity: 10, toUnit: "瓶" }
    ],
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
    materialNameEn: "PRRS Bivalent Vaccine",
    category: "疫苗",
    brand: "百利",
    brandEn: "Boli",
    baseUnit: "头份",
    unitSystem: ["1头份 = 1头份", "1瓶 = 20头份", "1盒 = 200头份"],
    packageConversions: [
      { fromUnit: "瓶", quantity: 20, toUnit: "头份" },
      { fromUnit: "盒", quantity: 10, toUnit: "瓶" }
    ],
    safetyStockBase: 300,
    status: "启用中",
    auxiliaryUnit: "瓶",
    lastStocktakeAt: "2026-05-01",
    vaccineType: "病毒性",
    administrationRoute: "肌肉注射",
    dosageForm: "活疫苗（冻干苗）",
    coldChain: "是",
    storageTemperature: "2-8℃",
    standardDosage: "1 头份/头",
    durationOfImmunity: "6 个月",
    withdrawalPeriod: "0天",
    immuneIntervalDays: 21,
    note: "蓝耳相关免疫任务使用"
  },
  {
    id: "mat-feed-gestation",
    materialCode: "MAT-000125",
    materialName: "妊娠母猪料",
    materialNameEn: "Gestation Sow Feed",
    category: "饲料",
    brand: "牧丰",
    brandEn: "MuFeng",
    baseUnit: "kg",
    unitSystem: ["1kg = 1kg", "1袋 = 40kg"],
    packageConversions: [{ fromUnit: "袋", quantity: 40, toUnit: "kg" }],
    safetyStockBase: 600,
    status: "启用中",
    auxiliaryUnit: "袋",
    lastStocktakeAt: "2026-06-18",
    feedForm: "颗粒",
    applicablePigTypes: ["生产母猪"],
    applicableStages: [{ phase: "妊娠期", startDay: 15, endDay: 36 }],
    note: "妊娠阶段饲喂使用"
  },
  {
    id: "mat-disinfectant-glutaraldehyde",
    materialCode: "MAT-000126",
    materialName: "戊二醛消毒液",
    materialNameEn: "Glutaraldehyde Disinfectant",
    category: "消毒用品",
    brand: "康洁",
    brandEn: "KangJie",
    baseUnit: "L",
    unitSystem: ["1L = 1L", "1桶 = 20L"],
    packageConversions: [{ fromUnit: "桶", quantity: 20, toUnit: "L" }],
    safetyStockBase: 80,
    negativeStockBase: 12,
    status: "启用中",
    auxiliaryUnit: "桶",
    lastStocktakeAt: "2026-04-15",
    activeIngredient: "戊二醛、癸甲溴铵",
    dilutionRatio: "1:200",
    disinfectScenes: ["空栏", "器械", "车辆"],
    note: "用于栏舍消毒任务"
  },
  {
    id: "mat-tool-needle",
    materialCode: "MAT-000127",
    materialName: "连续注射器",
    materialNameEn: "Continuous Syringe",
    category: "工具",
    brand: "牧安",
    brandEn: "MuAn",
    baseUnit: "个",
    unitSystem: ["1个 = 1个"],
    safetyStockBase: 8,
    status: "启用中",
    auxiliaryUnit: "个",
    lastStocktakeAt: "2026-06-18",
    note: "治疗和免疫任务通用工具"
  },
  {
    id: "mat-health-electrolyte",
    materialCode: "MAT-000128",
    materialName: "电解多维",
    materialNameEn: "Electrolyte Multivitamin",
    category: "保健品",
    brand: "禾丰",
    brandEn: "HeFeng",
    baseUnit: "g",
    unitSystem: ["1g = 1g", "1袋 = 500g"],
    packageConversions: [{ fromUnit: "袋", quantity: 500, toUnit: "g" }],
    safetyStockBase: 1000,
    status: "启用中",
    auxiliaryUnit: "袋",
    lastStocktakeAt: "2026-06-12",
    mainIngredient: "电解质、复合维生素",
    usageMethod: "饮水",
    note: "应激或高温阶段保健使用"
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
    unitPrice: 840,
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
    unitPrice: 480,
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
    unitPrice: 1920,
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
    unitPrice: 5120,
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
    unitPrice: 1032,
    baseUnitCost: 86,
    supplier: "牧安器械",
    supplierPhone: "13800004444",
    status: "正常"
  },
  {
    id: "lot-disinfectant-001",
    materialId: "mat-disinfectant-glutaraldehyde",
    lotNo: "XD-202605-01",
    productionDate: "2026-05-01",
    expiryDate: "2026-11-30",
    inboundQty: 5,
    inboundUnit: "桶",
    convertedQtyBase: 100,
    remainingQtyBase: 0,
    unitPrice: 260,
    baseUnitCost: 2.6,
    supplier: "康洁供应",
    supplierPhone: "13800005555",
    status: "已耗尽"
  },
  {
    id: "lot-health-001",
    materialId: "mat-health-electrolyte",
    lotNo: "BJ-202606-01",
    productionDate: "2026-06-01",
    expiryDate: "2027-06-01",
    inboundQty: 6,
    inboundUnit: "袋",
    convertedQtyBase: 3000,
    remainingQtyBase: 2400,
    unitPrice: 240,
    baseUnitCost: 0.08,
    supplier: "禾丰生物",
    supplierPhone: "13800006666",
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
    type: "报废",
    source: "报废 PRRS-202512-X",
    materialId: "mat-vaccine-prrs",
    lotNo: "PRRS-202512-X",
    quantityText: "-180头份",
    afterStockText: "0头份",
    operator: "李静"
  },
  {
    id: "ledger-007",
    occurredAt: "2026-06-19 08:10",
    type: "业务消耗",
    source: "饲喂任务 FE-20260619-01",
    materialId: "mat-feed-gestation",
    lotNo: "FD-202606-01",
    quantityText: "-40kg",
    afterStockText: "1280kg",
    operator: "系统"
  },
  {
    id: "ledger-008",
    occurredAt: "2026-06-19 14:20",
    type: "业务消耗",
    source: "治疗任务 MT-20260619-B",
    materialId: "mat-drug-florfenicol",
    lotNo: "FL-202606-B",
    quantityText: "-120ml",
    afterStockText: "1730ml",
    operator: "系统"
  },
  {
    id: "ledger-009",
    occurredAt: "2026-06-20 09:05",
    type: "业务消耗",
    source: "饲喂任务 FE-20260620-02",
    materialId: "mat-feed-gestation",
    lotNo: "FD-202606-01",
    quantityText: "-80kg",
    afterStockText: "1200kg",
    operator: "系统"
  },
  {
    id: "ledger-010",
    occurredAt: "2026-06-20 16:40",
    type: "业务消耗",
    source: "治疗任务 MT-20260620-C",
    materialId: "mat-drug-florfenicol",
    lotNo: "FL-202606-B",
    quantityText: "-90ml",
    afterStockText: "1640ml",
    operator: "系统"
  },
  {
    id: "ledger-011",
    occurredAt: "2026-06-21 10:10",
    type: "业务消耗",
    source: "消毒任务 DS-20260621-01",
    materialId: "mat-disinfectant-glutaraldehyde",
    lotNo: "XD-202605-01",
    quantityText: "-20L",
    afterStockText: "0L",
    operator: "系统"
  },
  {
    id: "ledger-012",
    occurredAt: "2026-06-22 11:45",
    type: "业务消耗",
    source: "免疫任务 VM-20260622-01",
    materialId: "mat-vaccine-prrs",
    lotNo: "PRRS-202512-X",
    quantityText: "-30头份",
    afterStockText: "150头份",
    operator: "系统"
  },
  {
    id: "ledger-013",
    occurredAt: "2026-06-23 08:30",
    type: "业务消耗",
    source: "饲喂任务 FE-20260623-03",
    materialId: "mat-feed-gestation",
    lotNo: "FD-202606-01",
    quantityText: "-120kg",
    afterStockText: "1080kg",
    operator: "系统"
  },
  {
    id: "ledger-014",
    occurredAt: "2026-06-24 13:20",
    type: "业务消耗",
    source: "治疗任务 MT-20260624-D",
    materialId: "mat-drug-florfenicol",
    lotNo: "FL-202606-B",
    quantityText: "-180ml",
    afterStockText: "1460ml",
    operator: "系统"
  },
  {
    id: "ledger-015",
    occurredAt: "2026-06-25 15:10",
    type: "业务消耗",
    source: "免疫任务 VM-20260625-02",
    materialId: "mat-vaccine-prrs",
    lotNo: "PRRS-202512-X",
    quantityText: "-40头份",
    afterStockText: "110头份",
    operator: "系统"
  },
  {
    id: "ledger-016",
    occurredAt: "2026-06-26 09:25",
    type: "业务消耗",
    source: "消毒任务 DS-20260626-02",
    materialId: "mat-disinfectant-glutaraldehyde",
    lotNo: "XD-202605-01",
    quantityText: "-16L",
    afterStockText: "-12L",
    operator: "系统"
  }
];

export const inventorySeedAlerts: InventoryAlert[] = [
  {
    id: "alert-001",
    type: "负库存提醒",
    materialId: "mat-disinfectant-glutaraldehyde",
    priority: "高",
    message: "当前库存为 -12L，请补录入库或修正库存流水。"
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

export const inventorySeedDifferences: InventoryDifferenceRecord[] = [
  {
    id: "diff-20260626-000",
    stocktakeNo: "PD20260626001",
    materialId: "mat-drug-florfenicol",
    materialName: "氟苯尼考",
    brand: "A品牌",
    category: "兽药",
    baseUnit: "ml",
    snapshotQtyBase: 1850,
    bookQtyBase: 1850,
    actualQtyBase: 1852,
    diffBase: 2,
    direction: "盘盈",
    status: "待处理",
    financeStatus: "无需确认",
    createdAt: "2026-06-26 10:45",
    operator: "系统"
  },
  {
    id: "diff-20260626-001",
    stocktakeNo: "PD20260626001",
    materialId: "mat-drug-florfenicol",
    materialName: "氟苯尼考",
    brand: "A品牌",
    category: "兽药",
    baseUnit: "ml",
    snapshotQtyBase: 1850,
    bookQtyBase: 1850,
    actualQtyBase: 1900,
    diffBase: 50,
    direction: "盘盈",
    status: "待处理",
    financeStatus: "无需确认",
    relatedLotNo: "FL-202606-B",
    createdAt: "2026-06-26 10:45",
    operator: "王兽医"
  },
  {
    id: "diff-20260626-002",
    stocktakeNo: "PD20260626001",
    materialId: "mat-feed-gestation",
    materialName: "妊娠母猪料",
    brand: "牧丰",
    category: "饲料",
    baseUnit: "kg",
    snapshotQtyBase: 1080,
    bookQtyBase: 1080,
    actualQtyBase: 1040,
    diffBase: -40,
    direction: "盘亏",
    status: "待处理",
    financeStatus: "无需确认",
    createdAt: "2026-06-26 10:45",
    operator: "王兽医"
  },
  {
    id: "diff-20260626-003",
    stocktakeNo: "PD20260626001",
    materialId: "mat-tool-needle",
    materialName: "连续注射器",
    brand: "牧安",
    category: "工具",
    baseUnit: "个",
    snapshotQtyBase: 60,
    bookQtyBase: 60,
    actualQtyBase: 62,
    diffBase: 2,
    direction: "盘盈",
    status: "待处理",
    financeStatus: "无需确认",
    createdAt: "2026-06-26 10:45",
    operator: "王兽医"
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

export const receiveMaterialCategoryOptions: InventoryCategory[] = ["饲料", "兽药", "保健品", "疫苗", "消毒用品", "其他"];

export const inventoryCategoryBaseUnitRecommendations: Record<InventoryCategory, string[]> = {
  饲料: ["kg"],
  兽药: ["ml", "g"],
  保健品: ["g", "ml"],
  疫苗: ["头份", "ml"],
  消毒用品: ["ml", "g", "kg"],
  工具: ["个"],
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
  const baseUnit = input.mode === "existing" ? input.material.baseUnit : input.baseUnit;
  const packageValidationMessage =
    input.packageConversions.length === 0 && input.inboundUnit === baseUnit
      ? null
      : validateInventoryPackageConversions(baseUnit, input.packageConversions);
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
          unitSystem: input.packageConversions.length
            ? buildInventoryUnitSystem(input.baseUnit, input.packageConversions)
            : [`1${input.baseUnit} = 1${input.baseUnit}`],
          packageConversions: input.packageConversions,
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
    baseUnitCost: input.baseQuantity > 0 ? input.unitPrice / input.baseQuantity : input.unitPrice,
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

export function buildInventoryOutboundTransaction(
  input: InventoryOutboundTransactionInput
): InventoryOutboundTransaction {
  const material = input.materials.find((item) => item.id === input.materialId);
  if (!material) {
    throw new Error("请选择出库物料。");
  }
  if (!input.outboundQuantity || input.outboundQuantity <= 0) {
    throw new Error("出库数量必须大于 0。");
  }
  if (!input.purpose.trim()) {
    throw new Error("请填写领用用途。");
  }

  const occurredAt = `${input.outboundDate} 10:00`;
  const currentNegativeStock = material.negativeStockBase || 0;
  let remainingToOutbound = input.outboundQuantity;
  let currentStock =
    input.lots
      .filter((lot) => lot.materialId === input.materialId)
      .reduce((sum, lot) => sum + lot.remainingQtyBase, 0) - currentNegativeStock;
  let nextLots = input.lots.slice();
  const ledgers: InventoryLedgerRow[] = [];

  const availableLots = getInventoryLotsForMaterial(input.lots, input.materialId).filter(
    (lot) => lot.remainingQtyBase > 0 && lot.status !== "已耗尽"
  );

  for (const lot of availableLots) {
    if (remainingToOutbound <= 0) break;
    const outboundFromLot = Math.min(lot.remainingQtyBase, remainingToOutbound);
    if (outboundFromLot <= 0) continue;

    remainingToOutbound -= outboundFromLot;
    currentStock -= outboundFromLot;
    nextLots = nextLots.map((item) =>
      item.id === lot.id
        ? {
            ...item,
            remainingQtyBase: item.remainingQtyBase - outboundFromLot,
            status: item.remainingQtyBase - outboundFromLot <= 0 ? "已耗尽" : item.status
          }
        : item
    );
    ledgers.push({
      id: `${input.ledgerIdPrefix}-${ledgers.length + 1}`,
      occurredAt,
      type: "业务消耗",
      source: input.purpose.trim(),
      materialId: input.materialId,
      lotNo: lot.lotNo,
      quantityText: `-${formatInventoryQty(outboundFromLot, material.baseUnit)}`,
      afterStockText: formatInventoryQty(currentStock, material.baseUnit),
      operator: input.operator,
      remark: input.remark?.trim() || undefined
    });
  }

  const shortageQuantity = remainingToOutbound;
  const nextMaterials =
    shortageQuantity > 0
      ? input.materials.map((item) =>
          item.id === input.materialId
            ? { ...item, negativeStockBase: (item.negativeStockBase || 0) + shortageQuantity }
            : item
        )
      : input.materials;

  if (shortageQuantity > 0) {
    currentStock -= shortageQuantity;
    ledgers.push({
      id: `${input.ledgerIdPrefix}-${ledgers.length + 1}`,
      occurredAt,
      type: "业务消耗",
      source: input.purpose.trim(),
      materialId: input.materialId,
      quantityText: `-${formatInventoryQty(shortageQuantity, material.baseUnit)}`,
      afterStockText: formatInventoryQty(currentStock, material.baseUnit),
      operator: input.operator,
      remark: input.remark?.trim() || undefined
    });
  }

  return {
    materials: nextMaterials,
    lots: nextLots,
    ledgers
  };
}

function buildInventoryStocktakeMaterialRow(
  material: InventoryMaterial,
  summary: InventorySummary,
  reason: InventoryStocktakeReason
): InventoryStocktakeScopeRow {
  return {
    id: `stocktake-material-${material.id}`,
    materialId: material.id,
    materialName: material.materialName,
    brand: material.brand,
    category: material.category,
    bookQtyBase: summary.currentStockBase,
    baseUnit: material.baseUnit,
    reason,
    status: reason === "负库存" ? "异常" : "可盘点"
  };
}

function uniqueInventoryStocktakeRows(rows: InventoryStocktakeScopeRow[]): InventoryStocktakeScopeRow[] {
  const rowMap = new Map<string, InventoryStocktakeScopeRow>();
  for (const row of rows) {
    rowMap.set(row.id, row);
  }
  return Array.from(rowMap.values()).sort(
    (a, b) =>
      inventoryCategoryOrder.indexOf(a.category) - inventoryCategoryOrder.indexOf(b.category) ||
      a.materialName.localeCompare(b.materialName, "zh-Hans-CN")
  );
}

export function buildInventoryStocktakeScope(input: InventoryStocktakeScopeInput): InventoryStocktakeScopeRow[] {
  const materialMap = new Map(input.materials.map((material) => [material.id, material]));
  const summaryMap = new Map(input.summaries.map((summary) => [summary.materialId, summary]));
  const rows: InventoryStocktakeScopeRow[] = [];

  const pushMaterialRows = (materialId: string, reason: InventoryStocktakeReason) => {
    const material = materialMap.get(materialId);
    const summary = summaryMap.get(materialId);
    if (!material || !summary) return;
    rows.push(buildInventoryStocktakeMaterialRow(material, summary, reason));
  };

  if (input.mode === "指定物料盘点") {
    const targetMaterialIds = input.targetMaterialId
      ? [input.targetMaterialId]
      : input.materials.map((material) => material.id);
    for (const materialId of targetMaterialIds) {
      pushMaterialRows(materialId, "手动添加");
    }
    return uniqueInventoryStocktakeRows(rows);
  }

  if (input.mode === "异常盘点") {
    for (const summary of input.summaries) {
      const material = materialMap.get(summary.materialId);
      if (!material) continue;
      if (summary.currentStockBase < 0) {
        rows.push(buildInventoryStocktakeMaterialRow(material, summary, "负库存"));
      } else if (summary.stockRisk === "低库存") {
        rows.push(buildInventoryStocktakeMaterialRow(material, summary, "低库存"));
      }
    }

    for (const lot of input.lots) {
      const material = materialMap.get(lot.materialId);
      if (!material || lot.remainingQtyBase <= 0) continue;
      const summary = summaryMap.get(lot.materialId);
      if (!summary) continue;
      if (lot.status === "过期") rows.push(buildInventoryStocktakeMaterialRow(material, summary, "已过期"));
      if (lot.status === "临期") rows.push(buildInventoryStocktakeMaterialRow(material, summary, "临期"));
    }

    return uniqueInventoryStocktakeRows(rows);
  }

  if (input.mode === "分类盘点" && input.category) {
    for (const material of input.materials.filter((item) => item.category === input.category)) {
      pushMaterialRows(material.id, "分类盘点");
    }
    return uniqueInventoryStocktakeRows(rows);
  }

  if (input.mode === "全部盘点") {
    for (const material of input.materials) {
      pushMaterialRows(material.id, "全部盘点");
    }
    return uniqueInventoryStocktakeRows(rows);
  }

  return uniqueInventoryStocktakeRows(rows);
}

function estimateInventoryAverageBaseUnitCost(lots: InventoryLot[], materialId: string) {
  const historicalLots = lots.filter(
    (lot) => lot.materialId === materialId && !lot.stocktakeAdjustmentType && lot.convertedQtyBase > 0 && lot.unitPrice > 0
  );
  const totalCost = historicalLots.reduce((sum, lot) => sum + lot.unitPrice, 0);
  const totalQuantity = historicalLots.reduce((sum, lot) => sum + lot.convertedQtyBase, 0);
  return totalQuantity > 0 ? totalCost / totalQuantity : 0;
}

export function buildInventoryStocktakeTransaction(
  input: InventoryStocktakeTransactionInput
): InventoryStocktakeTransaction {
  let nextMaterials = input.materials.slice();
  let nextLots = input.lots.slice();
  const ledgers: InventoryLedgerRow[] = [];
  let noDifferenceCount = 0;
  let gainCount = 0;
  let lossCount = 0;

  for (const row of input.scopeRows) {
    const actualQty = input.actualQuantities[row.id];
    if (actualQty === undefined || actualQty < 0) {
      throw new Error("请完整填写实际库存，且实际库存不能小于 0。");
    }

    const diff = actualQty - row.bookQtyBase;
    if (diff === 0) {
      noDifferenceCount += 1;
      continue;
    }

    if (diff > 0) gainCount += 1;
    if (diff < 0) lossCount += 1;

    const material = nextMaterials.find((item) => item.id === row.materialId);
    if (!material) continue;

    if (diff < 0) {
      let remainingLoss = Math.abs(diff);
      for (const lot of getInventoryLotsForMaterial(nextLots, row.materialId).filter(
        (item) => item.remainingQtyBase > 0 && item.status !== "已耗尽"
      )) {
        if (remainingLoss <= 0) break;
        const deductedQty = Math.min(lot.remainingQtyBase, remainingLoss);
        remainingLoss -= deductedQty;
        nextLots = nextLots.map((item) =>
          item.id === lot.id
            ? {
                ...item,
                remainingQtyBase: item.remainingQtyBase - deductedQty,
                status: item.remainingQtyBase - deductedQty <= 0 ? "已耗尽" : item.status
              }
            : item
        );
      }

      if (remainingLoss > 0) {
        nextMaterials = nextMaterials.map((item) =>
          item.id === row.materialId
            ? { ...item, negativeStockBase: (item.negativeStockBase || 0) + remainingLoss }
            : item
        );
      }
    } else {
      let remainingGain = diff;
      const negativeStockBase = material.negativeStockBase || 0;
      if (negativeStockBase > 0) {
        const negativeOffset = Math.min(negativeStockBase, remainingGain);
        remainingGain -= negativeOffset;
        nextMaterials = nextMaterials.map((item) =>
          item.id === row.materialId
            ? { ...item, negativeStockBase: Math.max((item.negativeStockBase || 0) - negativeOffset, 0) }
            : item
        );
      }

      if (remainingGain > 0) {
        const estimatedBaseUnitCost = estimateInventoryAverageBaseUnitCost(input.lots, row.materialId);
        nextLots = [
          ...nextLots,
          {
            id: `${input.ledgerIdPrefix}-gain-${row.materialId}-${ledgers.length + 1}`,
            materialId: row.materialId,
            lotNo: "盘盈调整批次",
            expiryDate: "",
            inboundQty: remainingGain,
            inboundUnit: row.baseUnit,
            convertedQtyBase: remainingGain,
            remainingQtyBase: remainingGain,
            unitPrice: Number((estimatedBaseUnitCost * remainingGain).toFixed(2)),
            baseUnitCost: estimatedBaseUnitCost,
            status: "正常",
            stocktakeAdjustmentType: "盘盈库存"
          }
        ];
      }
    }

    ledgers.push({
      id: `${input.ledgerIdPrefix}-${ledgers.length + 1}`,
      occurredAt: input.occurredAt,
      type: "盘点调整",
      source: `盘点单 ${input.stocktakeNo}`,
      materialId: row.materialId,
      lotNo: row.lotNo,
      quantityText: `${diff > 0 ? "+" : ""}${formatInventoryQty(diff, row.baseUnit)}`,
      afterStockText: formatInventoryQty(actualQty, row.baseUnit),
      operator: input.operator
    });
  }

  return {
    materials: nextMaterials,
    lots: nextLots,
    ledgers,
    summary: {
      materialCount: input.scopeRows.length,
      noDifferenceCount,
      gainCount,
      lossCount,
      adjustmentCount: ledgers.length
    }
  };
}

export function buildInventoryStocktakeDifferences(
  input: InventoryStocktakeDifferenceInput
): InventoryDifferenceRecord[] {
  const records: InventoryDifferenceRecord[] = [];
  input.scopeRows.forEach((row, index) => {
    const actualQty = input.actualQuantities[row.id];
    if (actualQty === undefined || actualQty < 0) return;
    const diff = actualQty - row.bookQtyBase;
    if (diff === 0) return;
    records.push({
      id: `${input.idPrefix}-${index + 1}`,
      stocktakeNo: input.stocktakeNo,
      materialId: row.materialId,
      materialName: row.materialName,
      brand: row.brand,
      category: row.category,
      baseUnit: row.baseUnit,
      snapshotQtyBase: input.snapshotQuantities?.[row.id] ?? row.bookQtyBase,
      bookQtyBase: row.bookQtyBase,
      actualQtyBase: actualQty,
      diffBase: diff,
      direction: diff > 0 ? "盘盈" : "盘亏",
      status: "待处理",
      financeStatus: "无需确认",
      createdAt: input.occurredAt,
      operator: input.operator
    });
  });
  return records;
}

function resolveInventoryToleranceLimit(row: Pick<InventoryDifferenceRecord, "category" | "bookQtyBase">): number {
  if (row.category === "兽药" || row.category === "疫苗") {
    return Math.max(Math.abs(row.bookQtyBase) * 0.02, 1);
  }
  if (row.category === "工具" || row.category === "其他") {
    return Math.max(Math.abs(row.bookQtyBase) * 0.05, 1);
  }
  return Math.abs(row.bookQtyBase) * 0.05;
}

export function isInventoryDifferenceWithinTolerance(
  difference: Pick<InventoryDifferenceRecord, "category" | "bookQtyBase" | "diffBase">
): boolean {
  return Math.abs(difference.diffBase) <= resolveInventoryToleranceLimit(difference);
}

function resolveMaterialStockBase(
  materials: InventoryMaterial[],
  lots: InventoryLot[],
  materialId: string
): number {
  const material = materials.find((item) => item.id === materialId);
  const lotStock = lots
    .filter((lot) => lot.materialId === materialId)
    .reduce((sum, lot) => sum + lot.remainingQtyBase, 0);
  return lotStock - (material?.negativeStockBase || 0);
}

function deductInventoryQuantity(
  lots: InventoryLot[],
  materialId: string,
  amount: number,
  preferLotNo?: string
): { nextLots: InventoryLot[]; overflow: number; lotNo?: string } {
  let remaining = amount;
  let nextLots = lots.slice();
  let lotNo: string | undefined;
  const candidates = getInventoryLotsForMaterial(nextLots, materialId).filter(
    (lot) => lot.remainingQtyBase > 0 && lot.status !== "已耗尽"
  );
  const ordered = preferLotNo
    ? [
        ...candidates.filter((lot) => lot.lotNo === preferLotNo),
        ...candidates.filter((lot) => lot.lotNo !== preferLotNo)
      ]
    : candidates;
  for (const lot of ordered) {
    if (remaining <= 0) break;
    const deducted = Math.min(lot.remainingQtyBase, remaining);
    remaining -= deducted;
    lotNo = lot.lotNo;
    nextLots = nextLots.map((item) =>
      item.id === lot.id
        ? {
            ...item,
            remainingQtyBase: item.remainingQtyBase - deducted,
            status: item.remainingQtyBase - deducted <= 0 ? "已耗尽" : item.status
          }
        : item
    );
  }
  return { nextLots, overflow: remaining, lotNo };
}

export function buildInventoryDifferenceResolution(
  input: InventoryDifferenceResolutionInput
): InventoryDifferenceResolution {
  const meta = inventoryDifferenceMethodMetas.find((item) => item.method === input.method);
  if (!meta) {
    throw new Error("未知的差异处理方式。");
  }
  const { record } = input;
  if (meta.direction !== record.direction) {
    throw new Error("处理方式与盘点结果不一致。");
  }
  if (meta.needsRelatedLot && !input.relatedLotNo) {
    throw new Error("请选择关联批次。");
  }

  let nextMaterials = input.materials.slice();
  let nextLots = input.lots.slice();
  const material = nextMaterials.find((item) => item.id === record.materialId);
  if (!material) {
    throw new Error("未找到差异对应的物料。");
  }

  const amount = Math.abs(record.diffBase);
  const baseUnit = record.baseUnit;
  let usedLotNo = input.relatedLotNo;

  if (record.direction === "盘盈") {
    let remainingGain = amount;
    const negativeStockBase = material.negativeStockBase || 0;
    if (negativeStockBase > 0) {
      const offset = Math.min(negativeStockBase, remainingGain);
      remainingGain -= offset;
      nextMaterials = nextMaterials.map((item) =>
        item.id === record.materialId
          ? { ...item, negativeStockBase: Math.max((item.negativeStockBase || 0) - offset, 0) }
          : item
      );
    }

    if (remainingGain > 0) {
      if (input.method === "供应商多送赠品" || input.method === "原因不明盘盈") {
        const estimatedBaseUnitCost = estimateInventoryAverageBaseUnitCost(input.lots, record.materialId);
        const isGain = input.method === "原因不明盘盈";
        const newLotNo = isGain ? "盘盈调整批次" : "赠品批次";
        nextLots = [
          ...nextLots,
          {
            id: `${input.ledgerIdPrefix}-lot`,
            materialId: record.materialId,
            lotNo: newLotNo,
            expiryDate: "",
            inboundQty: remainingGain,
            inboundUnit: baseUnit,
            convertedQtyBase: remainingGain,
            remainingQtyBase: remainingGain,
            unitPrice: Number((estimatedBaseUnitCost * remainingGain).toFixed(2)),
            baseUnitCost: estimatedBaseUnitCost,
            status: "正常",
            ...(isGain ? { stocktakeAdjustmentType: "盘盈库存" as const } : {})
          }
        ];
        usedLotNo = newLotNo;
      } else {
        const target = nextLots.find(
          (lot) => lot.materialId === record.materialId && lot.lotNo === input.relatedLotNo
        );
        if (target) {
          nextLots = nextLots.map((lot) => {
            if (lot.id !== target.id) return lot;
            const nextConverted = lot.convertedQtyBase + remainingGain;
            const nextRemaining = lot.remainingQtyBase + remainingGain;
            const nextBaseUnitCost =
              input.method === "入库数量更正" && nextConverted > 0
                ? Number((lot.unitPrice / nextConverted).toFixed(4))
                : lot.baseUnitCost;
            return {
              ...lot,
              convertedQtyBase: nextConverted,
              remainingQtyBase: nextRemaining,
              baseUnitCost: nextBaseUnitCost,
              status: lot.status === "已耗尽" && nextRemaining > 0 ? "正常" : lot.status
            };
          });
          usedLotNo = target.lotNo;
        } else {
          const estimatedBaseUnitCost = estimateInventoryAverageBaseUnitCost(input.lots, record.materialId);
          const newLotNo = "补录入库批次";
          nextLots = [
            ...nextLots,
            {
              id: `${input.ledgerIdPrefix}-lot`,
              materialId: record.materialId,
              lotNo: newLotNo,
              expiryDate: "",
              inboundQty: remainingGain,
              inboundUnit: baseUnit,
              convertedQtyBase: remainingGain,
              remainingQtyBase: remainingGain,
              unitPrice: Number((estimatedBaseUnitCost * remainingGain).toFixed(2)),
              baseUnitCost: estimatedBaseUnitCost,
              status: "正常"
            }
          ];
          usedLotNo = newLotNo;
        }
      }
    }
  } else {
    const result = deductInventoryQuantity(nextLots, record.materialId, amount, input.relatedLotNo);
    nextLots = result.nextLots;
    usedLotNo = result.lotNo || input.relatedLotNo;
    if (result.overflow > 0) {
      nextMaterials = nextMaterials.map((item) =>
        item.id === record.materialId
          ? { ...item, negativeStockBase: (item.negativeStockBase || 0) + result.overflow }
          : item
      );
    }
  }

  const afterStock = resolveMaterialStockBase(nextMaterials, nextLots, record.materialId);
  const sign = record.direction === "盘盈" ? "+" : "-";
  const ledger: InventoryLedgerRow = {
    id: `${input.ledgerIdPrefix}-ledger`,
    occurredAt: input.occurredAt,
    type: meta.ledgerType,
    source: `盘点差异处理 ${record.stocktakeNo}`,
    materialId: record.materialId,
    lotNo: usedLotNo,
    quantityText: `${sign}${formatInventoryQty(amount, baseUnit)}`,
    afterStockText: formatInventoryQty(afterStock, baseUnit),
    operator: input.operator,
    remark: `${meta.label}${input.relatedLotNo ? `；关联批次 ${input.relatedLotNo}` : ""}`
  };

  return {
    materials: nextMaterials,
    lots: nextLots,
    ledgers: [ledger],
    financeStatus: meta.financeStatus
  };
}

export function resolveInventoryToleranceDifferences(
  input: InventoryAutoDifferenceResolutionInput
): InventoryAutoDifferenceResolution {
  let nextMaterials = input.materials;
  let nextLots = input.lots;
  const pendingDifferences: InventoryDifferenceRecord[] = [];
  const processedDifferences: InventoryDifferenceRecord[] = [];
  const ledgers: InventoryLedgerRow[] = [];

  input.differences.forEach((difference, index) => {
    if (!isInventoryDifferenceWithinTolerance(difference)) {
      pendingDifferences.push(difference);
      return;
    }

    const method: InventoryDifferenceMethod = difference.direction === "盘盈" ? "原因不明盘盈" : "原因不明盘亏";
    const resolution = buildInventoryDifferenceResolution({
      record: difference,
      method,
      materials: nextMaterials,
      lots: nextLots,
      operator: input.operator,
      occurredAt: input.occurredAt,
      ledgerIdPrefix: `${input.ledgerIdPrefix}-${index + 1}`
    });

    nextMaterials = resolution.materials;
    nextLots = resolution.lots;
    ledgers.push(...resolution.ledgers);
    processedDifferences.push({
      ...difference,
      status: "已处理",
      method,
      financeStatus: resolution.financeStatus,
      resultLedgerIds: resolution.ledgers.map((ledger) => ledger.id),
      processedAt: input.occurredAt
    });
  });

  return {
    pendingDifferences,
    processedDifferences,
    materials: nextMaterials,
    lots: nextLots,
    ledgers
  };
}

export function buildInventoryScrapTransaction(input: InventoryScrapTransactionInput): InventoryScrapTransaction {
  const lot = input.lots.find((item) => item.id === input.lotId);
  if (!lot) {
    throw new Error("请选择需要报废的过期批次。");
  }

  const material = input.materials.find((item) => item.id === lot.materialId);
  if (!material) {
    throw new Error("未找到该批次对应的物料。");
  }

  if (lot.status !== "过期") {
    throw new Error("仅已过期批次可报废。");
  }

  if (input.scrapQuantity <= 0) {
    throw new Error("报废数量必须大于 0。");
  }

  if (input.scrapQuantity > lot.remainingQtyBase) {
    throw new Error("报废数量不能大于当前批次库存。");
  }

  const reason = input.reason.trim();
  const handlingMethod = input.handlingMethod.trim();
  if (!reason) {
    throw new Error("请填写报废原因。");
  }
  if (!handlingMethod) {
    throw new Error("请选择处理方式。");
  }

  const afterQty = lot.remainingQtyBase - input.scrapQuantity;
  const nextLots = input.lots.map((item) =>
    item.id === lot.id
      ? {
          ...item,
          remainingQtyBase: afterQty,
          status: afterQty <= 0 ? "已耗尽" as const : item.status
        }
      : item
  );

  return {
    lots: nextLots,
    ledger: {
      id: input.ledgerId,
      occurredAt: input.occurredAt,
      type: "报废",
      source: `报废 ${lot.lotNo}`,
      materialId: lot.materialId,
      lotNo: lot.lotNo,
      quantityText: `-${formatInventoryQty(input.scrapQuantity, material.baseUnit)}`,
      afterStockText: formatInventoryQty(afterQty, material.baseUnit),
      operator: input.operator,
      remark: `报废原因：${reason}；处理方式：${handlingMethod}`
    }
  };
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

export const inventoryCategoryOrder: InventoryCategory[] = ["饲料", "兽药", "疫苗", "消毒用品", "保健品", "工具", "其他"];

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
    if (lot.stocktakeAdjustmentType === "盘盈库存") return -1;
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
  const directionText =
    ledger.type === "盘点调整"
      ? ledger.quantityText.trim().startsWith("-")
        ? "库存下降"
        : "库存上升"
      : getInventoryLedgerDirection(ledger.type) === "inbound"
        ? "库存上升"
        : "库存下降";
  return {
    changeText: ledger.quantityText,
    balanceText: ledger.afterStockText,
    directionText
  };
}

export function filterInventoryLedgers(query: InventoryLedgerQuery): InventoryLedgerRow[] {
  const keyword = query.keyword?.trim() || "";
  const materialMap = new Map(query.materials.map((material) => [material.id, material]));

  return query.ledgers
    .filter((ledger) => {
      if (!query.dateRange) return true;
      const ledgerDate = ledger.occurredAt.slice(0, 10);
      return ledgerDate >= query.dateRange[0] && ledgerDate <= query.dateRange[1];
    })
    .filter((ledger) => {
      if (!query.ledgerTypes?.length) return true;
      return query.ledgerTypes.includes(ledger.type);
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
        actionText: "发起盘点",
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
        actionText: "报废",
        targetTab: "lots",
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
        actionText: "发起盘点",
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
        actionText: "入库",
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
