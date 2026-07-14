export type InventoryCategory = "饲料" | "药品" | "消耗品" | "工具" | "其他";
/** 药品类目下的最终分类，仅一级 */
export type InventoryMedicineClass = "疫苗" | "兽药" | "保健品";

export const inventoryMedicineClassOptions: InventoryMedicineClass[] = ["疫苗", "兽药", "保健品"];

/** @deprecated 仅用于旧数据兼容读取，新建物料请使用 medicineClass */
export type InventoryMedicineSubtype = "疫苗兽药" | "保健品";
/** @deprecated 仅用于旧数据兼容读取，新建物料请使用 medicineClass */
export type InventoryMedicineKind = "疫苗" | "兽药";
export type InventoryLotStatus = "正常" | "临期" | "过期" | "已耗尽";
export type InventoryStockRisk = "无风险" | "负库存";
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
export type InventoryAlertType = "负库存提醒" | "临期提醒" | "过期提醒";
export type InventoryMaterialStatus = "启用中" | "已停用";
export type InventoryMaterialStatusFilter = "全部" | InventoryMaterialStatus;

export type InventoryMaterial = {
  id: string;
  materialCode?: string;
  materialName: string;
  materialNameEn?: string;
  category: InventoryCategory;
  /** 药品类目下的最终分类：疫苗 / 兽药 / 保健品 */
  medicineClass?: InventoryMedicineClass;
  /** @deprecated 请使用 medicineClass */
  medicineSubtype?: InventoryMedicineSubtype;
  /** @deprecated 请使用 medicineClass */
  medicineKind?: InventoryMedicineKind;
  brand: string;
  brandEn?: string;
  baseUnit: string;
  unitSystem: string[];
  packageConversions?: InventoryPackageConversion[];
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
  // 消耗品专属
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
  | "multiSelect";

export type InventoryMaterialFieldSpec = {
  key: keyof InventoryMaterial;
  label: string;
  type: InventoryMaterialFieldType;
  /** 在物料管理完整档案中是否必填 */
  required?: boolean;
  /** 在入库快建弹窗中是否必填（未设置则快建时选填） */
  requiredInQuick?: boolean;
  /** 在入库页面中是否必填（未设置则入库时选填） */
  requiredInBatchReceive?: boolean;
  options?: string[];
  placeholder?: string;
};

const inventoryMedicineVetDrugFieldSpecs: InventoryMaterialFieldSpec[] = [
  {
    key: "dosageForm",
    label: "剂型",
    type: "select",
    requiredInBatchReceive: true,
    options: ["注射液", "粉剂", "预混剂", "口服液", "片剂"]
  },
  {
    key: "usageMethod",
    label: "使用方式",
    type: "select",
    requiredInBatchReceive: true,
    options: ["注射", "拌料", "饮水", "外用"]
  },
  { key: "withdrawalPeriod", label: "休药期", type: "text", placeholder: "如 7天" }
];

const inventoryMedicineVaccineFieldSpecs: InventoryMaterialFieldSpec[] = [
  {
    key: "dosageForm",
    label: "剂型",
    type: "select",
    required: true,
    requiredInBatchReceive: true,
    options: ["活疫苗（冻干苗）", "油佐剂灭活疫苗", "水佐剂灭活疫苗"]
  },
  {
    key: "usageMethod",
    label: "使用方式",
    type: "select",
    requiredInQuick: true,
    requiredInBatchReceive: true,
    options: ["肌肉注射", "皮下注射", "滴鼻", "饮水", "喷雾"]
  },
  {
    key: "standardDosage",
    label: "单次剂量",
    type: "text",
    requiredInBatchReceive: true,
    placeholder: "如 2 ml/头"
  },
  {
    key: "immuneIntervalDays",
    label: "免疫间隔期(天)",
    type: "number",
    requiredInBatchReceive: true
  },
  {
    key: "vaccineType",
    label: "疫苗类型",
    type: "select",
    required: true,
    options: ["病毒性", "细菌性", "寄生虫", "活疫苗", "灭活疫苗"]
  },
  { key: "coldChain", label: "是否冷链", type: "select", options: ["是", "否"] },
  { key: "storageTemperature", label: "储存温度", type: "text", placeholder: "如 2-8℃" },
  { key: "durationOfImmunity", label: "免疫有效期", type: "text", placeholder: "如 6 个月" },
  { key: "withdrawalPeriod", label: "休药期", type: "text", placeholder: "如 0天" }
];

const inventoryMedicineHealthFieldSpecs: InventoryMaterialFieldSpec[] = [
  { key: "mainIngredient", label: "主要成分", type: "text" },
  {
    key: "usageMethod",
    label: "使用方式",
    type: "select",
    requiredInBatchReceive: true,
    options: ["拌料", "饮水", "注射", "外用"]
  }
];

export const inventoryCategoryFieldSpecs: Record<
  InventoryCategory,
  InventoryMaterialFieldSpec[]
> = {
  饲料: [
    {
      key: "feedForm",
      label: "形态",
      type: "select",
      options: ["颗粒", "粉料", "浓缩料"]
    }
  ],
  药品: [],
  消耗品: [
    { key: "activeIngredient", label: "有效成分", type: "text" },
    {
      key: "dilutionRatio",
      label: "稀释比例",
      type: "text",
      requiredInBatchReceive: true,
      placeholder: "如 1:200"
    },
    {
      key: "disinfectScenes",
      label: "适用场景",
      type: "multiSelect",
      options: ["空栏", "带猪", "器械", "车辆", "人员"]
    }
  ],
  工具: [],
  其他: []
};

export type MaterialProfileFieldContext = Pick<
  InventoryMaterial,
  "category" | "medicineClass" | "medicineSubtype" | "medicineKind"
>;

export function resolveMedicineClass(
  input: Pick<InventoryMaterial, "medicineClass" | "medicineSubtype" | "medicineKind">
): InventoryMedicineClass | undefined {
  if (input.medicineClass) return input.medicineClass;
  if (input.medicineSubtype === "保健品") return "保健品";
  if (input.medicineKind === "疫苗") return "疫苗";
  if (input.medicineKind === "兽药") return "兽药";
  return undefined;
}

export function getMaterialProfileFieldSpecs(
  input: InventoryCategory | MaterialProfileFieldContext,
  medicineClass?: InventoryMedicineClass
): InventoryMaterialFieldSpec[] {
  const category = typeof input === "string" ? input : input.category;
  const resolvedClass =
    typeof input === "string" ? medicineClass : resolveMedicineClass(input);

  if (category === "药品") {
    if (resolvedClass === "保健品") return inventoryMedicineHealthFieldSpecs;
    if (resolvedClass === "疫苗") return inventoryMedicineVaccineFieldSpecs;
    if (resolvedClass === "兽药") return inventoryMedicineVetDrugFieldSpecs;
    return [];
  }

  return inventoryCategoryFieldSpecs[category] || [];
}

export function formatMaterialCategoryLabel(
  material: Pick<InventoryMaterial, "category" | "medicineClass" | "medicineSubtype" | "medicineKind">
): string {
  if (material.category === "药品") {
    const medicineClass = resolveMedicineClass(material);
    if (medicineClass) return `药品 · ${medicineClass}`;
  }
  return material.category;
}

export function resolveMedicineBaseUnitRecommendations(medicineClass?: InventoryMedicineClass): string[] {
  if (medicineClass === "保健品") return ["g", "ml"];
  if (medicineClass === "疫苗") return ["头份", "ml"];
  return ["ml", "g"];
}

export function isMedicineStrictToleranceCategory(
  material: Pick<InventoryMaterial, "category" | "medicineClass" | "medicineSubtype" | "medicineKind">
): boolean {
  if (material.category !== "药品") return false;
  const medicineClass = resolveMedicineClass(material);
  return medicineClass === "疫苗" || medicineClass === "兽药";
}

export function isMaterialProfileIncomplete(material: InventoryMaterial): boolean {
  if (material.category === "药品" && !resolveMedicineClass(material)) return true;
  const specs = getMaterialProfileFieldSpecs(material);
  return specs.some((spec) => {
    if (!spec.required) return false;
    const raw = material[spec.key];
    if (raw == null || raw === "") return true;
    if (Array.isArray(raw)) return raw.length === 0;
    return false;
  });
}

export function isMaterialProfileBatchReceiveIncomplete(material: InventoryMaterial): boolean {
  if (material.category === "药品" && !resolveMedicineClass(material)) return true;
  const specs = getMaterialProfileFieldSpecs(material);
  return specs.some((spec) => {
    if (!spec.requiredInBatchReceive) return false;
    const raw = material[spec.key];
    if (raw == null || raw === "") return true;
    if (Array.isArray(raw)) return raw.length === 0;
    return false;
  });
}

export function isMaterialProfileQuickIncomplete(material: InventoryMaterial): boolean {
  if (material.category === "药品" && !resolveMedicineClass(material)) return true;
  const specs = getMaterialProfileFieldSpecs(material);
  return specs.some((spec) => {
    if (!spec.requiredInQuick) return false;
    const raw = material[spec.key];
    if (raw == null || raw === "") return true;
    if (Array.isArray(raw)) return raw.length === 0;
    return false;
  });
}

export function buildMaterialProfileFromForm(
  category: InventoryCategory,
  values: Record<string, unknown>,
  medicineClass?: InventoryMedicineClass
) {
  const specs = getMaterialProfileFieldSpecs(category, medicineClass);
  const profile: Record<string, unknown> = {};
  specs.forEach((spec) => {
    profile[String(spec.key)] = values[String(spec.key)];
  });
  return profile;
}

export type InventoryBatchPackageConversionDraft = {
  fromUnit?: string;
  quantity?: number;
  toUnit?: string;
};

export type InventoryBatchNewMaterialForm = {
  brand?: string;
  brandEn?: string;
  materialNameEn?: string;
  baseUnit?: string;
  packageConversions?: InventoryBatchPackageConversionDraft[];
  materialNote?: string;
  optionalExpanded?: boolean;
  [key: string]: unknown;
};

export function createDefaultBatchNewMaterialForm(category: InventoryCategory): InventoryBatchNewMaterialForm {
  const baseUnit = inventoryCategoryBaseUnitRecommendations[category]?.[0];
  const form: InventoryBatchNewMaterialForm = {
    baseUnit,
    packageConversions: createDefaultBatchPackageConversionDrafts(category, baseUnit),
    optionalExpanded: true
  };
  if (category === "药品") {
    form.medicineClass = "兽药";
  }
  return form;
}

export function createDefaultBatchPackageConversionDrafts(
  category: InventoryCategory,
  baseUnit?: string
): InventoryBatchPackageConversionDraft[] {
  if (category === "饲料") {
    return [{ fromUnit: "吨", quantity: undefined, toUnit: "L" }];
  }
  return [{ fromUnit: undefined, quantity: undefined, toUnit: baseUnit }];
}

export function normalizeBatchPackageConversions(
  baseUnit: string,
  drafts: InventoryBatchPackageConversionDraft[] = []
): InventoryPackageConversion[] {
  return drafts
    .map((draft, index) => ({
      fromUnit: draft.fromUnit?.trim() || "",
      quantity: Number(draft.quantity || 0),
      toUnit: draft.toUnit?.trim() || (index === 0 ? baseUnit : drafts[index - 1]?.fromUnit?.trim() || "")
    }))
    .filter((conversion) => conversion.fromUnit || conversion.quantity || conversion.toUnit);
}

function filterCompletePackageConversions(conversions: InventoryPackageConversion[]) {
  return conversions.filter((conversion) => conversion.fromUnit && conversion.toUnit && conversion.quantity > 0);
}

export function validateBatchUnitConversions(
  category: InventoryCategory,
  baseUnit: string,
  conversions: InventoryPackageConversion[]
): string | null {
  if (!baseUnit || conversions.length === 0) return "请至少填写一条单位换算规则。";

  const feedTonToLiter = conversions.find((conversion) => conversion.fromUnit === "吨" && conversion.toUnit === "L");
  if (category === "饲料" && (!feedTonToLiter || feedTonToLiter.quantity <= 0)) {
    return "饲料必须填写 1吨 = xxL 的单位换算。";
  }

  const seenUnits = new Set<string>();
  for (const conversion of conversions) {
    if (!conversion.fromUnit || !conversion.toUnit || !conversion.quantity) return "请完善单位换算规则。";
    if (conversion.quantity <= 0) return "单位换算数量必须大于 0。";
    if (conversion.fromUnit === conversion.toUnit) return "换算前后单位不能相同。";
    if (seenUnits.has(conversion.fromUnit)) return "换算起始单位不能重复。";
    seenUnits.add(conversion.fromUnit);
  }

  for (const conversion of conversions) {
    if (resolveInventoryUnitFactor(conversion.fromUnit, baseUnit, conversions) === null) {
      return "多级单位换算必须能最终换算到物料单位。";
    }
  }

  return null;
}

export function buildBatchInlineNewMaterialDraft(
  category: InventoryCategory,
  materialName: string,
  form: InventoryBatchNewMaterialForm
): InventoryMaterial | null {
  const keyword = materialName.trim();
  const brand = form.brand?.trim();
  const baseUnit = form.baseUnit?.trim();
  if (!keyword || !brand || !baseUnit) return null;

  const packageConversions = normalizeBatchPackageConversions(baseUnit, form.packageConversions || []);
  const completePackageConversions = filterCompletePackageConversions(packageConversions);
  const medicineClass = category === "药品" ? (form.medicineClass as InventoryMedicineClass | undefined) : undefined;
  const profile = buildMaterialProfileFromForm(category, form, medicineClass);
  const draft: InventoryMaterial = {
    id: `mat-draft-${keyword}`,
    materialName: keyword,
    materialNameEn: form.materialNameEn?.trim() || undefined,
    category,
    medicineClass,
    brand,
    brandEn: form.brandEn?.trim() || undefined,
    baseUnit,
    unitSystem: completePackageConversions.length
      ? buildInventoryUnitSystem(baseUnit, completePackageConversions)
      : [`1${baseUnit} = 1${baseUnit}`],
    packageConversions: completePackageConversions,
    status: "启用中",
    auxiliaryUnit: completePackageConversions.find((conversion) => conversion.fromUnit !== baseUnit)?.fromUnit || baseUnit,
    note: form.materialNote?.trim() || undefined,
    ...profile
  };
  draft.profileIncomplete = isMaterialProfileIncomplete(draft);
  return draft;
}

export function validateBatchInlineNewMaterial(
  category: InventoryCategory,
  materialName: string,
  form: InventoryBatchNewMaterialForm
): string | null {
  const keyword = materialName.trim();
  if (!keyword) return "请填写物料名称。";
  if (!form.brand?.trim()) return "请填写品牌名称(中文)。";
  if (!form.baseUnit?.trim()) return "当前分类缺少默认单位，请先确认物料分类。";
  const packageConversions = normalizeBatchPackageConversions(form.baseUnit, form.packageConversions || []);
  const conversionMessage = validateBatchUnitConversions(category, form.baseUnit, packageConversions);
  if (conversionMessage) return conversionMessage;
  const draft = buildBatchInlineNewMaterialDraft(category, keyword, form);
  if (!draft) return "请完善新建物料必填信息。";
  if (isMaterialProfileBatchReceiveIncomplete(draft)) {
    return "请补齐当前分类下的物料必填专属字段。";
  }
  return null;
}

export function getBatchReceiveOptionalFieldHint(
  category: InventoryCategory,
  medicineClass?: InventoryMedicineClass
): string {
  const optionalLabels = ["英文名称", "英文品牌"];
  const specs = getMaterialProfileFieldSpecs(category, medicineClass);
  specs.forEach((spec) => {
    if (!spec.requiredInBatchReceive) optionalLabels.push(spec.label);
  });
  optionalLabels.push("供应商电话", "备注");
  return optionalLabels.join("、");
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
  expiryDate?: string;
  inboundQty: number;
  inboundUnit: string;
  convertedQtyBase: number;
  remainingQtyBase: number;
  unitPrice: number;
  baseUnitCost: number;
  packageConversions?: InventoryPackageConversion[];
  supplier?: string;
  supplierPhone?: string;
  supplierBatchNo?: string;
  storageLocation?: string;
  note?: string;
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

export type InventoryInboundOrderType = "采购入库" | "盘盈入库";

export type InventoryInboundMaterial = {
  id: string;
  materialName: string;
  category: string;
  brand: string;
  quantity: number;
  unit: string;
  totalAmount: number;
  expiryDate: string;
  supplier: string;
  supplierPhone?: string;
};

export type InventoryInboundOrder = {
  id: string;
  orderNo: string;
  type: InventoryInboundOrderType;
  operator: string;
  inboundTime: string;
  remark?: string;
  details: InventoryInboundMaterial[];
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
  medicineClass?: InventoryMedicineClass;
  brand: string;
  currentStockBase: number;
  baseUnit: string;
  monthlyUsageBase: number;
  usageTrend: number[];
  stockTrend: number[];
  stockRisk: InventoryStockRisk;
  nearestExpiryDate: string;
  lotCount: number;
  materialStatus: InventoryMaterialStatus;
};

export type InventoryRiskType = "负库存" | "过期" | "临期";
export type InventoryStocktakeMode = "异常盘点" | "指定物料盘点" | "分类盘点";
export type InventoryStocktakeReason = "负库存" | "临期" | "已过期" | "手动添加" | "分类盘点";
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
  medicineClass?: InventoryMedicineClass;
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

export type InventoryCheckResult = "adjusted" | "unchanged" | "pending";

export type InventoryCheckDetail = {
  id: string;
  materialName: string;
  category: string;
  batchNo: string;
  systemStock: number;
  actualStock: number;
  unit: string;
  difference: number;
  result: InventoryCheckResult;
};

export type InventoryCheckRecord = {
  id: string;
  checkNo: string;
  checkTime: string;
  checker: string;
  totalItems: number;
  diffItems: number;
  adjustedItems: number;
  remark?: string;
  details: InventoryCheckDetail[];
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
    financeStatus: "无需确认"
  },
  {
    method: "入库数量更正",
    direction: "盘盈",
    label: "入库数量更正（金额不变）",
    scene: "实际收货数量大于录入数量，采购金额没错。补正入库数量并摊薄该批单价。",
    ledgerType: "入库更正",
    stockEffect: "增加",
    consumptionEffect: "不影响",
    financeStatus: "无需确认"
  },
  {
    method: "入库少录补金额",
    direction: "盘盈",
    label: "入库少录（需补金额）",
    scene: "实际收货数量与采购金额都少录。补录入库数量，金额口径留财务确认。",
    ledgerType: "入库更正",
    stockEffect: "增加",
    consumptionEffect: "不影响",
    financeStatus: "财务待确认"
  },
  {
    method: "供应商多送赠品",
    direction: "盘盈",
    label: "供应商多送 / 赠品",
    scene: "供应商多送不收费。按估值生成赠品批次，金额口径留财务确认。",
    ledgerType: "盘盈",
    stockEffect: "增加",
    consumptionEffect: "不影响",
    financeStatus: "财务待确认"
  },
  {
    method: "原因不明盘盈",
    direction: "盘盈",
    label: "原因不明，作为盘盈调整",
    scene: "查不清来源但实物确实多。生成盘盈调整批次，按估值入库，不计采购支出。",
    ledgerType: "盘盈",
    stockEffect: "增加",
    consumptionEffect: "不影响",
    financeStatus: "财务待确认"
  },
  {
    method: "漏记任务出库",
    direction: "盘亏",
    label: "漏记任务 / 出库",
    scene: "实物已用掉但系统漏扣。补录业务消耗，计入本月消耗。",
    ledgerType: "业务消耗",
    stockEffect: "减少",
    consumptionEffect: "增加",
    financeStatus: "无需确认"
  },
  {
    method: "入库多录",
    direction: "盘亏",
    label: "入库多录",
    scene: "入库数量录多了。更正入库数量，减少对应批次库存。",
    ledgerType: "入库更正",
    stockEffect: "减少",
    consumptionEffect: "不影响",
    financeStatus: "无需确认"
  },
  {
    method: "破损污染过期报废",
    direction: "盘亏",
    label: "破损 / 污染 / 过期，发起报废",
    scene: "实物不可用。走报废扣减对应批次，记报废损失。",
    ledgerType: "报废",
    stockEffect: "减少",
    consumptionEffect: "不影响",
    financeStatus: "无需确认"
  },
  {
    method: "原因不明盘亏",
    direction: "盘亏",
    label: "原因不明，作为盘亏调整",
    scene: "查不清原因。默认从最近到期批次扣减，记盘亏损失，不计入消耗。",
    ledgerType: "盘亏",
    stockEffect: "减少",
    consumptionEffect: "不影响",
    financeStatus: "财务待确认"
  }
];

export type InventoryDifferenceRecord = {
  id: string;
  stocktakeNo: string;
  materialId: string;
  materialName: string;
  brand: string;
  category: InventoryCategory;
  medicineClass?: InventoryMedicineClass;
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
  handlingOptionLabel?: string;
  handlingReason?: string;
  handlingReasonNote?: string;
  supplementAmount?: number;
  resultLedgerIds?: string[];
  createdAt: string;
  processedAt?: string;
  processedBy?: string;
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
  ledgers?: InventoryLedgerRow[];
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
  ledgers?: InventoryLedgerRow[];
  relatedLotNo?: string;
  supplementAmount?: number;
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
  photoNote?: string;
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
  expiryDate?: string;
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

export type InventoryLastPurchaseInfo = {
  occurredAt?: string;
  quantityBase: number;
  quantityText: string;
  lotNo?: string;
  supplier?: string;
  source: "ledger" | "lot" | "none";
};

type InventoryReceiveEntryCommonInput = {
  lotId: string;
  productionDate?: string;
  expiryDate?: string;
  unitPrice: number;
  inboundQuantity: number;
  inboundUnit: string;
  baseQuantity: number;
  packageConversions: InventoryPackageConversion[];
  supplier?: string;
  supplierPhone?: string;
  externalBatchNo?: string;
  storageLocation?: string;
  note?: string;
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
      note?: string;
    });

export type InventoryReceiveSearchInput = InventoryReceiveEntryCommonInput & {
  materials: InventoryMaterial[];
  materialText: string;
  selectedMaterialId?: string;
  category?: InventoryCategory;
  brand?: string;
  baseUnit?: string;
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
    category: "药品",
    medicineClass: "兽药",
    brand: "A品牌",
    brandEn: "Brand A",
    baseUnit: "ml",
    unitSystem: ["1ml = 1ml", "1瓶 = 100ml", "1盒 = 1000ml"],
    packageConversions: [
      { fromUnit: "瓶", quantity: 100, toUnit: "ml" },
      { fromUnit: "盒", quantity: 10, toUnit: "瓶" }
    ],
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
    category: "药品",
    medicineClass: "疫苗",
    brand: "百利",
    brandEn: "Boli",
    baseUnit: "头份",
    unitSystem: ["1头份 = 1头份", "1瓶 = 20头份", "1盒 = 200头份"],
    packageConversions: [
      { fromUnit: "瓶", quantity: 20, toUnit: "头份" },
      { fromUnit: "盒", quantity: 10, toUnit: "瓶" }
    ],
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
    id: "mat-drug-ceftiofur",
    materialCode: "MAT-000129",
    materialName: "头孢",
    materialNameEn: "Ceftiofur",
    category: "药品",
    medicineClass: "兽药",
    brand: "华牧",
    brandEn: "HuaMu",
    baseUnit: "ml",
    unitSystem: ["1ml = 1ml", "1瓶 = 100ml"],
    packageConversions: [{ fromUnit: "瓶", quantity: 100, toUnit: "ml" }],
    status: "启用中",
    auxiliaryUnit: "瓶",
    lastStocktakeAt: "2026-06-12",
    dosageForm: "注射液",
    usageMethod: "注射",
    withdrawalPeriod: "5天",
    note: "治疗任务常用抗生素"
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
    status: "启用中",
    auxiliaryUnit: "袋",
    lastStocktakeAt: "2026-06-18",
    feedForm: "颗粒",
    note: "妊娠阶段饲喂使用"
  },
  {
    id: "mat-feed-lactation",
    materialCode: "MAT-000129",
    materialName: "哺乳母猪料",
    materialNameEn: "Lactation Sow Feed",
    category: "饲料",
    brand: "牧丰",
    brandEn: "MuFeng",
    baseUnit: "kg",
    unitSystem: ["1kg = 1kg", "1袋 = 40kg"],
    packageConversions: [{ fromUnit: "袋", quantity: 40, toUnit: "kg" }],
    status: "启用中",
    auxiliaryUnit: "袋",
    lastStocktakeAt: "2026-07-01",
    feedForm: "颗粒",
    note: "哺乳期高营养配方"
  },
  {
    id: "mat-feed-nursery",
    materialCode: "MAT-000130",
    materialName: "保育猪料",
    materialNameEn: "Nursery Pig Feed",
    category: "饲料",
    brand: "牧丰",
    brandEn: "MuFeng",
    baseUnit: "kg",
    unitSystem: ["1kg = 1kg", "1袋 = 40kg"],
    packageConversions: [{ fromUnit: "袋", quantity: 40, toUnit: "kg" }],
    status: "启用中",
    auxiliaryUnit: "袋",
    lastStocktakeAt: "2026-07-02",
    feedForm: "颗粒",
    note: "保育阶段专用"
  },
  {
    id: "mat-feed-finisher",
    materialCode: "MAT-000131",
    materialName: "育肥猪料",
    materialNameEn: "Finisher Pig Feed",
    category: "饲料",
    brand: "牧丰",
    brandEn: "MuFeng",
    baseUnit: "kg",
    unitSystem: ["1kg = 1kg", "1袋 = 40kg"],
    packageConversions: [{ fromUnit: "袋", quantity: 40, toUnit: "kg" }],
    status: "启用中",
    auxiliaryUnit: "袋",
    lastStocktakeAt: "2026-07-03",
    feedForm: "颗粒",
    note: "育肥后期增重配方"
  },
  {
    id: "mat-feed-starter",
    materialCode: "MAT-000132",
    materialName: "教槽料",
    materialNameEn: "Starter Feed",
    category: "饲料",
    brand: "牧丰",
    brandEn: "MuFeng",
    baseUnit: "kg",
    unitSystem: ["1kg = 1kg", "1袋 = 20kg"],
    packageConversions: [{ fromUnit: "袋", quantity: 20, toUnit: "kg" }],
    status: "启用中",
    auxiliaryUnit: "袋",
    lastStocktakeAt: "2026-06-28",
    feedForm: "粉料",
    note: "新开教槽，近7天暂无饲喂记录"
  },
  {
    id: "mat-disinfectant-glutaraldehyde",
    materialCode: "MAT-000126",
    materialName: "戊二醛消毒液",
    materialNameEn: "Glutaraldehyde Disinfectant",
    category: "消耗品",
    brand: "康洁",
    brandEn: "KangJie",
    baseUnit: "L",
    unitSystem: ["1L = 1L", "1桶 = 20L"],
    packageConversions: [{ fromUnit: "桶", quantity: 20, toUnit: "L" }],
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
    category: "药品",
    medicineClass: "保健品",
    brand: "禾丰",
    brandEn: "HeFeng",
    baseUnit: "g",
    unitSystem: ["1g = 1g", "1袋 = 500g"],
    packageConversions: [{ fromUnit: "袋", quantity: 500, toUnit: "g" }],
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
    expiryDate: "2026-07-03",
    inboundQty: 2,
    inboundUnit: "盒",
    convertedQtyBase: 2000,
    remainingQtyBase: 850,
    unitPrice: 840,
    baseUnitCost: 0.42,
    supplier: "华牧供应",
    supplierPhone: "13800001111",
    storageLocation: "药房A柜",
    status: "临期"
  },
  {
    id: "lot-ceft-001",
    materialId: "mat-drug-ceftiofur",
    lotNo: "CF-202606-A",
    productionDate: "2026-06-01",
    expiryDate: "2026-11-01",
    inboundQty: 6,
    inboundUnit: "瓶",
    convertedQtyBase: 600,
    remainingQtyBase: 540,
    unitPrice: 660,
    baseUnitCost: 1.1,
    supplier: "华牧供应",
    supplierPhone: "13800007777",
    storageLocation: "药房A柜",
    status: "正常"
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
    storageLocation: "药房B柜",
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
    remainingQtyBase: 120,
    unitPrice: 1920,
    baseUnitCost: 4.8,
    supplier: "百利生物",
    supplierPhone: "13800002222",
    storageLocation: "疫苗冷库2层",
    status: "过期"
  },
  {
    id: "lot-prrs-002",
    materialId: "mat-vaccine-prrs",
    lotNo: "PRRS-202606-Y",
    productionDate: "2025-11-15",
    expiryDate: "2026-12-15",
    inboundQty: 60,
    inboundUnit: "头份",
    convertedQtyBase: 60,
    remainingQtyBase: 60,
    unitPrice: 300,
    baseUnitCost: 5,
    supplier: "百利生物",
    supplierPhone: "13800002222",
    storageLocation: "疫苗冷库2层",
    status: "正常"
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
    remainingQtyBase: 28000,
    unitPrice: 5120,
    baseUnitCost: 3.2,
    supplier: "牧丰饲料",
    supplierPhone: "13800003333",
    storageLocation: "饲料仓西侧",
    status: "正常"
  },
  {
    id: "lot-feed-002",
    materialId: "mat-feed-lactation",
    lotNo: "FD-LAC-202607",
    productionDate: "2026-06-20",
    expiryDate: "2026-12-20",
    inboundQty: 350,
    inboundUnit: "袋",
    convertedQtyBase: 14000,
    remainingQtyBase: 14000,
    unitPrice: 4480,
    baseUnitCost: 3.2,
    supplier: "牧丰饲料",
    storageLocation: "饲料仓A区",
    status: "正常"
  },
  {
    id: "lot-feed-003",
    materialId: "mat-feed-nursery",
    lotNo: "FD-NUR-202607",
    productionDate: "2026-06-18",
    expiryDate: "2026-12-18",
    inboundQty: 1300,
    inboundUnit: "袋",
    convertedQtyBase: 52000,
    remainingQtyBase: 52000,
    unitPrice: 16640,
    baseUnitCost: 3.2,
    supplier: "牧丰饲料",
    storageLocation: "饲料仓B区",
    status: "正常"
  },
  {
    id: "lot-feed-004",
    materialId: "mat-feed-finisher",
    lotNo: "FD-FIN-202607",
    productionDate: "2026-06-15",
    expiryDate: "2026-12-15",
    inboundQty: 750,
    inboundUnit: "袋",
    convertedQtyBase: 30000,
    remainingQtyBase: 30000,
    unitPrice: 9600,
    baseUnitCost: 3.2,
    supplier: "牧丰饲料",
    storageLocation: "饲料仓C区",
    status: "正常"
  },
  {
    id: "lot-feed-005",
    materialId: "mat-feed-starter",
    lotNo: "FD-STA-202607",
    productionDate: "2026-06-25",
    expiryDate: "2026-12-25",
    inboundQty: 400,
    inboundUnit: "袋",
    convertedQtyBase: 8000,
    remainingQtyBase: 8000,
    unitPrice: 2560,
    baseUnitCost: 3.2,
    supplier: "牧丰饲料",
    storageLocation: "饲料仓D区",
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
    storageLocation: "工具间1号架",
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
    storageLocation: "消毒间东侧",
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
    storageLocation: "保健品柜",
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
  },
  {
    id: "ledger-017",
    occurredAt: "2026-06-26 14:05",
    type: "业务消耗",
    source: "治疗任务 MT-20260626-E",
    materialId: "mat-drug-ceftiofur",
    lotNo: "CF-202606-A",
    quantityText: "-60ml",
    afterStockText: "540ml",
    operator: "系统"
  },
  {
    id: "ledger-018",
    occurredAt: "2026-06-28 08:30",
    type: "采购入库",
    source: "入库单 IN-20260628-01",
    materialId: "mat-feed-gestation",
    lotNo: "FD-202606-01",
    quantityText: "+1200kg",
    afterStockText: "2280kg",
    operator: "李静"
  },
  {
    id: "ledger-feed-lac-01",
    occurredAt: "2026-06-30 08:00",
    type: "业务消耗",
    source: "饲喂任务 FE-20260630-01",
    materialId: "mat-feed-lactation",
    lotNo: "FD-LAC-202607",
    quantityText: "-7000kg",
    afterStockText: "21000kg",
    operator: "系统"
  },
  {
    id: "ledger-feed-lac-02",
    occurredAt: "2026-07-01 08:00",
    type: "业务消耗",
    source: "饲喂任务 FE-20260701-02",
    materialId: "mat-feed-lactation",
    lotNo: "FD-LAC-202607",
    quantityText: "-7000kg",
    afterStockText: "14000kg",
    operator: "系统"
  },
  {
    id: "ledger-feed-lac-03",
    occurredAt: "2026-07-02 08:00",
    type: "业务消耗",
    source: "饲喂任务 FE-20260702-01",
    materialId: "mat-feed-lactation",
    lotNo: "FD-LAC-202607",
    quantityText: "-7000kg",
    afterStockText: "7000kg",
    operator: "系统"
  },
  {
    id: "ledger-feed-lac-04",
    occurredAt: "2026-07-03 08:00",
    type: "业务消耗",
    source: "饲喂任务 FE-20260703-01",
    materialId: "mat-feed-lactation",
    lotNo: "FD-LAC-202607",
    quantityText: "-7000kg",
    afterStockText: "0kg",
    operator: "系统"
  },
  {
    id: "ledger-feed-lac-05",
    occurredAt: "2026-07-04 08:00",
    type: "业务消耗",
    source: "饲喂任务 FE-20260704-01",
    materialId: "mat-feed-lactation",
    lotNo: "FD-LAC-202607",
    quantityText: "-7000kg",
    afterStockText: "0kg",
    operator: "系统"
  },
  {
    id: "ledger-feed-lac-06",
    occurredAt: "2026-07-05 08:00",
    type: "业务消耗",
    source: "饲喂任务 FE-20260705-02",
    materialId: "mat-feed-lactation",
    lotNo: "FD-LAC-202607",
    quantityText: "-7000kg",
    afterStockText: "0kg",
    operator: "系统"
  },
  {
    id: "ledger-feed-lac-07",
    occurredAt: "2026-07-06 08:00",
    type: "业务消耗",
    source: "饲喂任务 FE-20260706-01",
    materialId: "mat-feed-lactation",
    lotNo: "FD-LAC-202607",
    quantityText: "-7000kg",
    afterStockText: "14000kg",
    operator: "系统"
  },
  {
    id: "ledger-feed-nur-01",
    occurredAt: "2026-06-30 09:00",
    type: "业务消耗",
    source: "饲喂任务 FE-20260630-02",
    materialId: "mat-feed-nursery",
    lotNo: "FD-NUR-202607",
    quantityText: "-4000kg",
    afterStockText: "48000kg",
    operator: "系统"
  },
  {
    id: "ledger-feed-nur-02",
    occurredAt: "2026-07-01 09:00",
    type: "业务消耗",
    source: "饲喂任务 FE-20260701-03",
    materialId: "mat-feed-nursery",
    lotNo: "FD-NUR-202607",
    quantityText: "-4000kg",
    afterStockText: "44000kg",
    operator: "系统"
  },
  {
    id: "ledger-feed-nur-03",
    occurredAt: "2026-07-02 09:00",
    type: "业务消耗",
    source: "饲喂任务 FE-20260702-02",
    materialId: "mat-feed-nursery",
    lotNo: "FD-NUR-202607",
    quantityText: "-4000kg",
    afterStockText: "40000kg",
    operator: "系统"
  },
  {
    id: "ledger-feed-nur-04",
    occurredAt: "2026-07-03 09:00",
    type: "业务消耗",
    source: "饲喂任务 FE-20260703-02",
    materialId: "mat-feed-nursery",
    lotNo: "FD-NUR-202607",
    quantityText: "-4000kg",
    afterStockText: "36000kg",
    operator: "系统"
  },
  {
    id: "ledger-feed-nur-05",
    occurredAt: "2026-07-04 09:00",
    type: "业务消耗",
    source: "饲喂任务 FE-20260704-02",
    materialId: "mat-feed-nursery",
    lotNo: "FD-NUR-202607",
    quantityText: "-4000kg",
    afterStockText: "32000kg",
    operator: "系统"
  },
  {
    id: "ledger-feed-nur-06",
    occurredAt: "2026-07-05 09:00",
    type: "业务消耗",
    source: "饲喂任务 FE-20260705-03",
    materialId: "mat-feed-nursery",
    lotNo: "FD-NUR-202607",
    quantityText: "-4000kg",
    afterStockText: "28000kg",
    operator: "系统"
  },
  {
    id: "ledger-feed-nur-07",
    occurredAt: "2026-07-06 09:00",
    type: "业务消耗",
    source: "饲喂任务 FE-20260706-02",
    materialId: "mat-feed-nursery",
    lotNo: "FD-NUR-202607",
    quantityText: "-4000kg",
    afterStockText: "52000kg",
    operator: "系统"
  },
  {
    id: "ledger-feed-fin-01",
    occurredAt: "2026-06-30 10:00",
    type: "业务消耗",
    source: "饲喂任务 FE-20260630-03",
    materialId: "mat-feed-finisher",
    lotNo: "FD-FIN-202607",
    quantityText: "-6000kg",
    afterStockText: "24000kg",
    operator: "系统"
  },
  {
    id: "ledger-feed-fin-02",
    occurredAt: "2026-07-01 10:00",
    type: "业务消耗",
    source: "饲喂任务 FE-20260701-04",
    materialId: "mat-feed-finisher",
    lotNo: "FD-FIN-202607",
    quantityText: "-6000kg",
    afterStockText: "18000kg",
    operator: "系统"
  },
  {
    id: "ledger-feed-fin-03",
    occurredAt: "2026-07-02 10:00",
    type: "业务消耗",
    source: "饲喂任务 FE-20260702-03",
    materialId: "mat-feed-finisher",
    lotNo: "FD-FIN-202607",
    quantityText: "-6000kg",
    afterStockText: "12000kg",
    operator: "系统"
  },
  {
    id: "ledger-feed-fin-04",
    occurredAt: "2026-07-03 10:00",
    type: "业务消耗",
    source: "饲喂任务 FE-20260703-03",
    materialId: "mat-feed-finisher",
    lotNo: "FD-FIN-202607",
    quantityText: "-6000kg",
    afterStockText: "6000kg",
    operator: "系统"
  },
  {
    id: "ledger-feed-fin-05",
    occurredAt: "2026-07-04 10:00",
    type: "业务消耗",
    source: "饲喂任务 FE-20260704-03",
    materialId: "mat-feed-finisher",
    lotNo: "FD-FIN-202607",
    quantityText: "-6000kg",
    afterStockText: "0kg",
    operator: "系统"
  },
  {
    id: "ledger-feed-fin-06",
    occurredAt: "2026-07-05 10:00",
    type: "业务消耗",
    source: "饲喂任务 FE-20260705-04",
    materialId: "mat-feed-finisher",
    lotNo: "FD-FIN-202607",
    quantityText: "-6000kg",
    afterStockText: "0kg",
    operator: "系统"
  },
  {
    id: "ledger-feed-fin-07",
    occurredAt: "2026-07-06 10:00",
    type: "业务消耗",
    source: "饲喂任务 FE-20260706-03",
    materialId: "mat-feed-finisher",
    lotNo: "FD-FIN-202607",
    quantityText: "-6000kg",
    afterStockText: "30000kg",
    operator: "系统"
  },
  {
    id: "ledger-feed-ges-01",
    occurredAt: "2026-06-30 11:00",
    type: "业务消耗",
    source: "饲喂任务 FE-20260630-04",
    materialId: "mat-feed-gestation",
    lotNo: "FD-202606-01",
    quantityText: "-1000kg",
    afterStockText: "27000kg",
    operator: "系统"
  },
  {
    id: "ledger-feed-ges-02",
    occurredAt: "2026-07-01 11:00",
    type: "业务消耗",
    source: "饲喂任务 FE-20260701-05",
    materialId: "mat-feed-gestation",
    lotNo: "FD-202606-01",
    quantityText: "-1000kg",
    afterStockText: "26000kg",
    operator: "系统"
  },
  {
    id: "ledger-feed-ges-03",
    occurredAt: "2026-07-02 11:00",
    type: "业务消耗",
    source: "饲喂任务 FE-20260702-04",
    materialId: "mat-feed-gestation",
    lotNo: "FD-202606-01",
    quantityText: "-1000kg",
    afterStockText: "25000kg",
    operator: "系统"
  },
  {
    id: "ledger-feed-ges-04",
    occurredAt: "2026-07-03 11:00",
    type: "业务消耗",
    source: "饲喂任务 FE-20260703-04",
    materialId: "mat-feed-gestation",
    lotNo: "FD-202606-01",
    quantityText: "-1000kg",
    afterStockText: "24000kg",
    operator: "系统"
  },
  {
    id: "ledger-feed-ges-05",
    occurredAt: "2026-07-04 11:00",
    type: "业务消耗",
    source: "饲喂任务 FE-20260704-04",
    materialId: "mat-feed-gestation",
    lotNo: "FD-202606-01",
    quantityText: "-1000kg",
    afterStockText: "23000kg",
    operator: "系统"
  },
  {
    id: "ledger-feed-ges-06",
    occurredAt: "2026-07-05 11:00",
    type: "业务消耗",
    source: "饲喂任务 FE-20260705-05",
    materialId: "mat-feed-gestation",
    lotNo: "FD-202606-01",
    quantityText: "-1000kg",
    afterStockText: "22000kg",
    operator: "系统"
  },
  {
    id: "ledger-feed-ges-07",
    occurredAt: "2026-07-06 11:00",
    type: "业务消耗",
    source: "饲喂任务 FE-20260706-04",
    materialId: "mat-feed-gestation",
    lotNo: "FD-202606-01",
    quantityText: "-1000kg",
    afterStockText: "28000kg",
    operator: "系统"
  },
  {
    id: "ledger-drug-flor-20260626",
    occurredAt: "2026-06-26 14:30",
    type: "业务消耗",
    source: "治疗任务 MT-20260626-A",
    materialId: "mat-drug-florfenicol",
    lotNo: "FL-202606-B",
    quantityText: "-350ml",
    afterStockText: "1850ml",
    operator: "系统"
  },
  {
    id: "ledger-drug-flor-20260625",
    occurredAt: "2026-06-25 14:30",
    type: "业务消耗",
    source: "治疗任务 MT-20260625-A",
    materialId: "mat-drug-florfenicol",
    lotNo: "FL-202606-B",
    quantityText: "-350ml",
    afterStockText: "1850ml",
    operator: "系统"
  },
  {
    id: "ledger-drug-flor-20260628-adjust",
    occurredAt: "2026-06-28 09:20",
    type: "盘点调整",
    source: "盘点单 PD20260628001",
    materialId: "mat-drug-florfenicol",
    lotNo: "FL-202606-B",
    quantityText: "-20ml",
    afterStockText: "1830ml",
    operator: "王敏"
  },
  {
    id: "ledger-drug-flor-20260703-inbound",
    occurredAt: "2026-07-03 10:00",
    type: "采购入库",
    source: "入库单 IN-20260703-01",
    materialId: "mat-drug-florfenicol",
    lotNo: "FL-202606-B",
    quantityText: "+500ml",
    afterStockText: "2330ml",
    operator: "李静"
  },
  {
    id: "ledger-drug-flor-20260706",
    occurredAt: "2026-07-06 08:10",
    type: "业务消耗",
    source: "治疗任务 MT-20260706-B",
    materialId: "mat-drug-florfenicol",
    lotNo: "FL-202606-B",
    quantityText: "-350ml",
    afterStockText: "1850ml",
    operator: "系统"
  },
  {
    id: "ledger-drug-ceft-20260704",
    occurredAt: "2026-07-04 16:00",
    type: "业务消耗",
    source: "治疗任务 MT-20260704-C",
    materialId: "mat-drug-ceftiofur",
    lotNo: "CF-202606-A",
    quantityText: "-420ml",
    afterStockText: "540ml",
    operator: "系统"
  }
];

type InventoryInboundMaterialSeed = {
  materialName: string;
  category: string;
  brand: string;
  code: string;
  unit: string;
  quantityBase: number;
  quantityStep: number;
};

const inventoryInboundMaterialPools: Array<{ materials: InventoryInboundMaterialSeed[] }> = [
  {
    materials: [
      { materialName: "妊娠母猪料", category: "饲料", brand: "牧丰", code: "FDGST", unit: "kg", quantityBase: 640, quantityStep: 40 },
      { materialName: "哺乳母猪料", category: "饲料", brand: "牧丰", code: "FDLAC", unit: "kg", quantityBase: 720, quantityStep: 40 },
      { materialName: "保育猪料", category: "饲料", brand: "牧丰", code: "FDNUR", unit: "kg", quantityBase: 800, quantityStep: 40 },
      { materialName: "育肥猪料", category: "饲料", brand: "牧丰", code: "FDFIN", unit: "kg", quantityBase: 960, quantityStep: 80 },
      { materialName: "教槽料", category: "饲料", brand: "牧丰", code: "FDSTA", unit: "kg", quantityBase: 360, quantityStep: 20 },
      { materialName: "后备母猪料", category: "饲料", brand: "牧丰", code: "FDGIL", unit: "kg", quantityBase: 520, quantityStep: 40 },
      { materialName: "哺乳浓缩料", category: "饲料", brand: "禾丰", code: "FDLCC", unit: "kg", quantityBase: 280, quantityStep: 20 },
      { materialName: "玉米粉", category: "饲料", brand: "本地粮商", code: "FDCOR", unit: "kg", quantityBase: 1200, quantityStep: 100 }
    ]
  },
  {
    materials: [
      { materialName: "氟苯尼考", category: "药品 · 兽药", brand: "A品牌", code: "FL", unit: "ml", quantityBase: 500, quantityStep: 50 },
      { materialName: "头孢", category: "药品 · 兽药", brand: "华牧", code: "CF", unit: "ml", quantityBase: 300, quantityStep: 30 },
      { materialName: "替米考星", category: "药品 · 兽药", brand: "牧康", code: "TM", unit: "ml", quantityBase: 450, quantityStep: 50 },
      { materialName: "伊维菌素", category: "药品 · 兽药", brand: "安牧", code: "YW", unit: "ml", quantityBase: 260, quantityStep: 20 },
      { materialName: "聚维酮碘", category: "消耗品", brand: "康洁", code: "JD", unit: "ml", quantityBase: 600, quantityStep: 60 },
      { materialName: "戊二醛消毒液", category: "消耗品", brand: "康洁", code: "XD", unit: "ml", quantityBase: 1000, quantityStep: 100 },
      { materialName: "阿莫西林口服液", category: "药品 · 兽药", brand: "华牧", code: "AM", unit: "ml", quantityBase: 360, quantityStep: 40 },
      { materialName: "硫酸新霉素", category: "药品 · 兽药", brand: "牧康", code: "NM", unit: "ml", quantityBase: 420, quantityStep: 40 }
    ]
  },
  {
    materials: [
      { materialName: "蓝耳二联疫苗", category: "药品 · 疫苗", brand: "百利", code: "PRRS", unit: "头份", quantityBase: 200, quantityStep: 20 },
      { materialName: "猪瘟疫苗", category: "药品 · 疫苗", brand: "百利", code: "CSF", unit: "头份", quantityBase: 180, quantityStep: 20 },
      { materialName: "伪狂犬疫苗", category: "药品 · 疫苗", brand: "安牧", code: "PRV", unit: "头份", quantityBase: 240, quantityStep: 20 },
      { materialName: "口蹄疫疫苗", category: "药品 · 疫苗", brand: "中牧", code: "FMD", unit: "头份", quantityBase: 300, quantityStep: 30 },
      { materialName: "圆环疫苗", category: "药品 · 疫苗", brand: "百利", code: "PCV", unit: "头份", quantityBase: 220, quantityStep: 20 },
      { materialName: "细小病毒疫苗", category: "药品 · 疫苗", brand: "华牧", code: "PPV", unit: "头份", quantityBase: 160, quantityStep: 20 },
      { materialName: "乙脑疫苗", category: "药品 · 疫苗", brand: "中牧", code: "JEV", unit: "头份", quantityBase: 180, quantityStep: 20 },
      { materialName: "支原体疫苗", category: "药品 · 疫苗", brand: "安牧", code: "MHP", unit: "头份", quantityBase: 260, quantityStep: 20 }
    ]
  },
  {
    materials: [
      { materialName: "连续注射器", category: "工具", brand: "牧安", code: "TLJQ", unit: "个", quantityBase: 12, quantityStep: 2 },
      { materialName: "采样管", category: "消耗品", brand: "牧安", code: "TLCY", unit: "个", quantityBase: 200, quantityStep: 20 },
      { materialName: "一次性针头", category: "消耗品", brand: "牧安", code: "TLZT", unit: "个", quantityBase: 500, quantityStep: 50 },
      { materialName: "耳标钳", category: "工具", brand: "牧安", code: "TLEQ", unit: "个", quantityBase: 8, quantityStep: 1 },
      { materialName: "耳标", category: "消耗品", brand: "牧安", code: "TLEB", unit: "个", quantityBase: 300, quantityStep: 30 },
      { materialName: "转猪板", category: "工具", brand: "牧安", code: "TLZB", unit: "个", quantityBase: 20, quantityStep: 2 },
      { materialName: "温湿度计", category: "工具", brand: "牧安", code: "TLWS", unit: "个", quantityBase: 10, quantityStep: 1 },
      { materialName: "料铲", category: "工具", brand: "牧安", code: "TLLC", unit: "个", quantityBase: 15, quantityStep: 2 }
    ]
  },
  {
    materials: [
      { materialName: "电解多维", category: "药品 · 保健品", brand: "禾丰", code: "BJDJ", unit: "g", quantityBase: 1200, quantityStep: 100 },
      { materialName: "葡萄糖粉", category: "药品 · 保健品", brand: "禾丰", code: "BJPT", unit: "g", quantityBase: 2000, quantityStep: 200 },
      { materialName: "维生素C", category: "药品 · 保健品", brand: "牧康", code: "BJVC", unit: "g", quantityBase: 900, quantityStep: 100 },
      { materialName: "酸化剂", category: "药品 · 保健品", brand: "康牧", code: "BJSH", unit: "g", quantityBase: 1500, quantityStep: 100 },
      { materialName: "益生菌", category: "药品 · 保健品", brand: "禾丰", code: "BJYS", unit: "g", quantityBase: 800, quantityStep: 80 },
      { materialName: "脱霉剂", category: "药品 · 保健品", brand: "康牧", code: "BJTM", unit: "g", quantityBase: 1800, quantityStep: 120 },
      { materialName: "复合酶", category: "药品 · 保健品", brand: "牧康", code: "BJFM", unit: "g", quantityBase: 760, quantityStep: 80 },
      { materialName: "乳清粉", category: "药品 · 保健品", brand: "禾丰", code: "BJRQ", unit: "g", quantityBase: 2400, quantityStep: 200 }
    ]
  }
];

const inventoryInboundMaterialSeeds = inventoryInboundMaterialPools.flatMap((pool) => pool.materials);

const inventoryInboundTypes: InventoryInboundOrderType[] = ["采购入库", "盘盈入库"];
const inventoryInboundOperators = ["张三", "李静", "王敏", "陈雨", "赵磊", "刘洋"];
const inventoryInboundSuppliers = ["华牧供应", "牧丰饲料", "百利生物", "康洁供应", "牧安器械", "禾丰生物"];
const inventoryInboundRemarks = ["7月份采购", "补足安全库存", "盘点后补录", "供应商多送 / 赠品"];

function formatInventoryInboundDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatInventoryInboundDateTimeValue(date: Date) {
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${formatInventoryInboundDateValue(date)} ${hour}:${minute}`;
}

function buildInventoryInboundDate(dayOffset: number) {
  const date = new Date("2026-07-10T00:00:00");
  date.setDate(date.getDate() - dayOffset);
  return date;
}

function buildInventoryInboundDateTime(dayOffset: number, minutesFromStart: number) {
  const date = buildInventoryInboundDate(dayOffset);
  date.setMinutes(minutesFromStart);
  return formatInventoryInboundDateTimeValue(date);
}

function buildInventoryInboundOrder(index: number): InventoryInboundOrder {
  const orderDayOffset = index;
  const inboundMinutes = 8 * 60 + ((index * 73) % 520);
  const inboundTime = buildInventoryInboundDateTime(orderDayOffset, inboundMinutes);
  const itemCount = (index % 8) + 1;
  const orderDate = inboundTime.slice(0, 10).replace(/-/g, "");
  const orderNo = `RK${orderDate}${String(index + 1).padStart(4, "0")}`;
  const details = Array.from({ length: itemCount }, (_, detailIndex) => {
    const material = inventoryInboundMaterialSeeds[(index * 3 + detailIndex * 5) % inventoryInboundMaterialSeeds.length];
    const quantity = material.quantityBase + ((index + detailIndex) % 5) * material.quantityStep;
    const totalAmount = Number((quantity * (2.8 + ((index + detailIndex) % 7) * 0.65)).toFixed(2));
    const supplier = inventoryInboundSuppliers[(index + detailIndex + 1) % inventoryInboundSuppliers.length];
    const supplierPhone = (index + detailIndex) % 3 === 0 ? `1380000${String(7000 + index * 8 + detailIndex).slice(-4)}` : undefined;
    return {
      id: `${orderNo}-${detailIndex + 1}`,
      materialName: material.materialName,
      category: material.category,
      brand: material.brand,
      quantity,
      unit: material.unit,
      totalAmount,
      expiryDate: formatInventoryInboundDateValue(buildInventoryInboundDate(-120 - ((index + detailIndex) % 8) * 30)),
      supplier,
      supplierPhone
    };
  });
  const type = inventoryInboundTypes[index % inventoryInboundTypes.length];
  const operator = inventoryInboundOperators[index % inventoryInboundOperators.length];

  return {
    id: `inbound-${orderNo}`,
    orderNo,
    type,
    operator,
    inboundTime,
    remark: inventoryInboundRemarks[index % inventoryInboundRemarks.length],
    details
  };
}

export const inventorySeedInboundOrders: InventoryInboundOrder[] = Array.from({ length: 30 }, (_, index) =>
  buildInventoryInboundOrder(index)
);

export const inventorySeedCheckRecords: InventoryCheckRecord[] = [
  {
    id: "check-20260706001",
    checkNo: "PD20260706001",
    checkTime: "2026-07-06 14:30",
    checker: "张三",
    totalItems: 4,
    diffItems: 3,
    adjustedItems: 3,
    remark: "月度盘点",
    details: [
      {
        id: "check-20260706001-florfenicol",
        materialName: "氟苯尼考 A品牌",
        category: "药品 · 兽药",
        batchNo: "FL-202606-B",
        systemStock: 1852,
        actualStock: 1800,
        unit: "ml",
        difference: -52,
        result: "adjusted"
      },
      {
        id: "check-20260706001-prrs",
        materialName: "蓝耳二联疫苗 百利",
        category: "药品 · 疫苗",
        batchNo: "PRRS-202512-X",
        systemStock: 180,
        actualStock: 180,
        unit: "头份",
        difference: 0,
        result: "unchanged"
      },
      {
        id: "check-20260706001-finisher",
        materialName: "育肥猪料 牧丰",
        category: "饲料",
        batchNo: "FD-FIN-202607",
        systemStock: 3000,
        actualStock: 3010,
        unit: "kg",
        difference: 10,
        result: "adjusted"
      },
      {
        id: "check-20260706001-gestation",
        materialName: "妊娠母猪料 牧丰",
        category: "饲料",
        batchNo: "FD-202606-01",
        systemStock: 28000,
        actualStock: 27980,
        unit: "kg",
        difference: -20,
        result: "adjusted"
      }
    ]
  },
  {
    id: "check-20260703001",
    checkNo: "PD20260703001",
    checkTime: "2026-07-03 16:10",
    checker: "李静",
    totalItems: 3,
    diffItems: 0,
    adjustedItems: 0,
    remark: "药品抽查",
    details: [
      {
        id: "check-20260703001-florfenicol",
        materialName: "氟苯尼考 A品牌",
        category: "药品 · 兽药",
        batchNo: "FL-202606-B",
        systemStock: 1850,
        actualStock: 1850,
        unit: "ml",
        difference: 0,
        result: "unchanged"
      },
      {
        id: "check-20260703001-ceftiofur",
        materialName: "头孢 华牧",
        category: "药品 · 兽药",
        batchNo: "CF-202606-A",
        systemStock: 960,
        actualStock: 960,
        unit: "ml",
        difference: 0,
        result: "unchanged"
      },
      {
        id: "check-20260703001-prrs",
        materialName: "蓝耳二联疫苗 百利",
        category: "药品 · 疫苗",
        batchNo: "PRRS-202512-X",
        systemStock: 110,
        actualStock: 110,
        unit: "头份",
        difference: 0,
        result: "unchanged"
      }
    ]
  },
  {
    id: "check-20260626001",
    checkNo: "PD20260626001",
    checkTime: "2026-06-26 10:46",
    checker: "王敏",
    totalItems: 4,
    diffItems: 3,
    adjustedItems: 2,
    remark: "异常复核",
    details: [
      {
        id: "check-20260626001-disinfectant",
        materialName: "戊二醛消毒液 康洁",
        category: "消耗品",
        batchNo: "XD-202605-01",
        systemStock: 4,
        actualStock: 0,
        unit: "L",
        difference: -4,
        result: "pending"
      },
      {
        id: "check-20260626001-florfenicol",
        materialName: "氟苯尼考 A品牌",
        category: "药品 · 兽药",
        batchNo: "FL-202606-B",
        systemStock: 1850,
        actualStock: 1852,
        unit: "ml",
        difference: 2,
        result: "adjusted"
      },
      {
        id: "check-20260626001-gestation",
        materialName: "妊娠母猪料 牧丰",
        category: "饲料",
        batchNo: "FD-202606-01",
        systemStock: 28000,
        actualStock: 27960,
        unit: "kg",
        difference: -40,
        result: "adjusted"
      },
      {
        id: "check-20260626001-tool",
        materialName: "连续注射器 牧安",
        category: "工具",
        batchNo: "TL-202606-01",
        systemStock: 12,
        actualStock: 12,
        unit: "个",
        difference: 0,
        result: "unchanged"
      }
    ]
  },
  {
    id: "check-20260618001",
    checkNo: "PD20260618001",
    checkTime: "2026-06-18 09:40",
    checker: "陈雨",
    totalItems: 2,
    diffItems: 1,
    adjustedItems: 1,
    remark: "工具交接盘点",
    details: [
      {
        id: "check-20260618001-tool",
        materialName: "连续注射器 牧安",
        category: "工具",
        batchNo: "TL-202606-01",
        systemStock: 10,
        actualStock: 12,
        unit: "个",
        difference: 2,
        result: "adjusted"
      },
      {
        id: "check-20260618001-prrs",
        materialName: "蓝耳二联疫苗 百利",
        category: "药品 · 疫苗",
        batchNo: "PRRS-202512-X",
        systemStock: 180,
        actualStock: 180,
        unit: "头份",
        difference: 0,
        result: "unchanged"
      }
    ]
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
    category: "药品",
    medicineClass: "兽药",
    baseUnit: "ml",
    snapshotQtyBase: 1850,
    bookQtyBase: 1850,
    actualQtyBase: 1852,
    diffBase: 2,
    direction: "盘盈",
    status: "待处理",
    financeStatus: "无需确认",
    relatedLotNo: "FL-202606-B",
    createdAt: "2026-06-26 10:45",
    operator: "系统"
  },
  {
    id: "diff-20260626-001",
    stocktakeNo: "PD20260626001",
    materialId: "mat-drug-florfenicol",
    materialName: "氟苯尼考",
    brand: "A品牌",
    category: "药品",
    medicineClass: "兽药",
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

export const INVENTORY_DEMO_REFERENCE_AT = new Date("2026-07-06T23:59:59").getTime();

export type FeedEstimatedAvailableDaysStatus = "紧急" | "偏低" | "关注" | "正常" | "none" | "zero";

export type FeedEstimatedAvailableDaysResult = {
  displayText: string;
  sortValue: number | null;
  status: FeedEstimatedAvailableDaysStatus;
  tooltip: string;
  days: number | null;
};

export function parseInventoryLedgerQuantity(quantityText: string): number {
  const matched = quantityText.match(/[-+]?\d+(\.\d+)?/);
  return matched ? Number(matched[0]) : 0;
}

export function buildFeedAverageDailyConsumption(
  materialId: string,
  ledgers: InventoryLedgerRow[],
  options?: { windowDays?: number; referenceAt?: number }
): number {
  const windowDays = options?.windowDays ?? 7;
  const referenceAt = options?.referenceAt ?? INVENTORY_DEMO_REFERENCE_AT;
  const windowMs = windowDays * 24 * 60 * 60 * 1000;
  const startAt = referenceAt - windowMs;

  const totalConsumption = ledgers.reduce((sum, ledger) => {
    if (ledger.materialId !== materialId || ledger.type !== "业务消耗") return sum;
    const occurredAt = new Date(ledger.occurredAt).getTime();
    if (occurredAt < startAt || occurredAt > referenceAt) return sum;
    return sum + Math.abs(parseInventoryLedgerQuantity(ledger.quantityText));
  }, 0);

  return totalConsumption / windowDays;
}

export function resolveFeedEstimatedAvailableDaysStatus(days: number): FeedEstimatedAvailableDaysStatus {
  if (days <= 3) return "紧急";
  if (days <= 7) return "偏低";
  if (days <= 15) return "关注";
  return "正常";
}

export function buildFeedEstimatedAvailableDays(
  currentStockBase: number,
  materialId: string,
  ledgers: InventoryLedgerRow[],
  options?: { windowDays?: number; referenceAt?: number }
): FeedEstimatedAvailableDaysResult {
  const tooltipBase = "预计可用天数根据当前库存及近7天平均日消耗自动计算，仅供采购决策参考";

  if (currentStockBase < 0) {
    return {
      displayText: "—",
      sortValue: null,
      status: "none",
      tooltip: "库存异常，无法计算预计可用天数。",
      days: null
    };
  }

  if (currentStockBase === 0) {
    return {
      displayText: "0天",
      sortValue: 0,
      status: "zero",
      tooltip: tooltipBase,
      days: 0
    };
  }

  const dailyAverage = buildFeedAverageDailyConsumption(materialId, ledgers, options);
  if (dailyAverage <= 0) {
    return {
      displayText: "—",
      sortValue: null,
      status: "none",
      tooltip: "近7天暂无消耗数据，无法计算预计可用天数。",
      days: null
    };
  }

  const days = Math.floor(currentStockBase / dailyAverage);
  return {
    displayText: `${days}天`,
    sortValue: days,
    status: resolveFeedEstimatedAvailableDaysStatus(days),
    tooltip: tooltipBase,
    days
  };
}

function formatInventoryUsageDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildInventoryUsageWindow(referenceAt: number, windowDays: number) {
  const end = new Date(referenceAt);
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(end.getDate() - Math.max(windowDays - 1, 0));

  const dates: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    dates.push(formatInventoryUsageDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

export function buildInventoryMonthlyUsage(
  materialId: string,
  ledgers?: InventoryLedgerRow[],
  options?: { windowDays?: number; referenceAt?: number }
) {
  if (!ledgers) {
    return {
      monthlyUsageBase: 0,
      usageTrend: []
    };
  }

  const windowDays = options?.windowDays ?? 30;
  const referenceAt = options?.referenceAt ?? INVENTORY_DEMO_REFERENCE_AT;
  const dates = buildInventoryUsageWindow(referenceAt, windowDays);
  const dailyUsage = new Map(dates.map((date) => [date, 0]));
  const start = dates[0];
  const end = dates[dates.length - 1];

  ledgers.forEach((ledger) => {
    if (ledger.materialId !== materialId || ledger.type !== "业务消耗") return;
    const occurredDate = ledger.occurredAt.slice(0, 10);
    if (occurredDate < start || occurredDate > end) return;
    dailyUsage.set(
      occurredDate,
      (dailyUsage.get(occurredDate) || 0) + Math.abs(parseInventoryLedgerQuantity(ledger.quantityText))
    );
  });

  const usageTrend = dates.map((date) => dailyUsage.get(date) || 0);
  return {
    monthlyUsageBase: usageTrend.reduce((sum, value) => sum + value, 0),
    usageTrend
  };
}

function resolveInventoryLedgerStockDelta(ledger: InventoryLedgerRow) {
  const quantity = parseInventoryLedgerQuantity(ledger.quantityText);
  if (/[-+]/.test(ledger.quantityText)) return quantity;
  if (["采购入库", "消耗冲销", "入库更正", "盘盈"].includes(ledger.type)) return Math.abs(quantity);
  if (["业务消耗", "盘亏", "报废"].includes(ledger.type)) return -Math.abs(quantity);
  return quantity;
}

export function buildInventoryStockTrend(
  materialId: string,
  currentStockBase: number,
  ledgers?: InventoryLedgerRow[],
  options?: { windowDays?: number; referenceAt?: number }
) {
  const windowDays = options?.windowDays ?? 30;
  const referenceAt = options?.referenceAt ?? INVENTORY_DEMO_REFERENCE_AT;
  const dates = buildInventoryUsageWindow(referenceAt, windowDays);

  if (!ledgers) {
    return dates.map(() => currentStockBase);
  }

  const dailyStockDelta = new Map(dates.map((date) => [date, 0]));
  const start = dates[0];
  const end = dates[dates.length - 1];

  ledgers.forEach((ledger) => {
    if (ledger.materialId !== materialId) return;
    const occurredDate = ledger.occurredAt.slice(0, 10);
    if (occurredDate < start || occurredDate > end) return;
    dailyStockDelta.set(
      occurredDate,
      (dailyStockDelta.get(occurredDate) || 0) + resolveInventoryLedgerStockDelta(ledger)
    );
  });

  const endOfDayStock = new Map<string, number>();
  let stockCursor = currentStockBase;
  for (let index = dates.length - 1; index >= 0; index -= 1) {
    const date = dates[index];
    endOfDayStock.set(date, stockCursor);
    stockCursor -= dailyStockDelta.get(date) || 0;
  }

  return dates.map((date) => endOfDayStock.get(date) || 0);
}

export function formatInventoryQty(value: number, unit: string): string {
  if (!unit || unit === "—") return value === 0 ? "—" : String(value);
  return `${Number.isInteger(value) ? value : value.toFixed(1)}${unit}`;
}

function formatInventoryConvertedQty(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function formatInventoryQtyWithPackage(
  quantity: number,
  material?: Pick<InventoryMaterial, "baseUnit" | "auxiliaryUnit" | "packageConversions"> | null,
  preferredUnit?: string
): string {
  const baseUnit = material?.baseUnit || "";
  const baseText = formatInventoryQty(quantity, baseUnit);
  if (!material) return baseText;
  const conversions = material.packageConversions || [];
  const packageUnit = [preferredUnit, material.auxiliaryUnit, conversions[0]?.fromUnit].find((unit) => {
    if (!unit || unit === baseUnit) return false;
    return Boolean(calculateInventoryBaseQuantity(1, unit, baseUnit, conversions));
  });
  if (!packageUnit) return baseText;
  const factor = calculateInventoryBaseQuantity(1, packageUnit, baseUnit, conversions);
  if (!factor) return baseText;
  return `${formatInventoryConvertedQty(quantity / factor)}${packageUnit}（${baseText}）`;
}

export function formatNearestExpiryDate(summary: InventorySummary): string {
  return summary.category === "工具" ? "—" : summary.nearestExpiryDate;
}

export function generateInventoryLotNo(receiveDate: string, sequence: number): string {
  const dateText = receiveDate.replace(/-/g, "");
  return `RK-${dateText}-${String(sequence).padStart(3, "0")}`;
}

export const inventoryUnitOptions = ["ml", "g", "kg", "吨", "L", "头份", "份", "瓶", "袋", "盒", "箱", "桶", "支", "个"];

export const receiveMaterialCategoryOptions: InventoryCategory[] = ["饲料", "药品", "消耗品", "工具", "其他"];

export const inventoryCategoryBaseUnitRecommendations: Record<InventoryCategory, string[]> = {
  饲料: ["吨", "kg", "L"],
  药品: ["ml", "g", "头份"],
  消耗品: ["ml", "g", "kg", "L"],
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
      label: `${item.materialName}${item.brand !== "—" ? ` ${item.brand}` : ""} · ${formatMaterialCategoryLabel(item)}`,
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

  const conversionGraph = new Map<string, Array<{ unit: string; factor: number }>>();
  const addEdge = (fromUnit: string, toUnit: string, factor: number) => {
    const edges = conversionGraph.get(fromUnit) || [];
    edges.push({ unit: toUnit, factor });
    conversionGraph.set(fromUnit, edges);
  };

  conversions.forEach((conversion) => {
    if (!conversion.fromUnit || !conversion.toUnit || conversion.quantity <= 0 || conversion.fromUnit === conversion.toUnit) return;
    addEdge(conversion.fromUnit, conversion.toUnit, conversion.quantity);
    addEdge(conversion.toUnit, conversion.fromUnit, 1 / conversion.quantity);
  });
  const visited = new Set<string>();

  const walk = (currentUnit: string): number | null => {
    if (currentUnit === baseUnit) return 1;
    if (visited.has(currentUnit)) return null;
    visited.add(currentUnit);

    const edges = conversionGraph.get(currentUnit) || [];
    for (const edge of edges) {
      const nextFactor = walk(edge.unit);
      if (nextFactor !== null) return edge.factor * nextFactor;
    }
    return null;
  };

  return walk(unit);
}

export function resolveInventoryReceivableUnits(
  baseUnit: string,
  conversions: InventoryPackageConversion[] = []
): string[] {
  const orderedUnits = [baseUnit, ...conversions.flatMap((conversion) => [conversion.fromUnit, conversion.toUnit])]
    .map((unit) => unit?.trim())
    .filter((unit): unit is string => Boolean(unit));
  const uniqueUnits = Array.from(new Set(orderedUnits));
  return uniqueUnits.filter((unit) => unit === baseUnit || resolveInventoryUnitFactor(unit, baseUnit, conversions) !== null);
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
  const supplier = input.supplier?.trim();
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
  if (!supplier) {
    throw new Error("供应商必填。");
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
          status: "启用中",
          auxiliaryUnit: input.packageConversions[0]?.fromUnit,
          note: input.note
        };

  const lot: InventoryLot = {
    id: input.lotId,
    materialId: material.id,
    lotNo: generateInventoryLotNo(input.receiveDate, input.sequence),
    productionDate: input.productionDate,
    expiryDate: input.expiryDate,
    inboundQty: input.inboundQuantity,
    inboundUnit: input.inboundUnit,
    convertedQtyBase: input.baseQuantity,
    remainingQtyBase: input.baseQuantity,
    unitPrice: input.unitPrice,
    baseUnitCost: input.baseQuantity > 0 ? input.unitPrice / input.baseQuantity : input.unitPrice,
    packageConversions: input.packageConversions,
    supplier,
    supplierPhone: input.supplierPhone,
    supplierBatchNo: input.externalBatchNo,
    note: input.note,
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
  reason: InventoryStocktakeReason,
  lots: InventoryLot[]
): InventoryStocktakeScopeRow {
  return {
    id: `stocktake-material-${material.id}`,
    materialId: material.id,
    materialName: material.materialName,
    brand: material.brand,
    category: material.category,
    medicineClass: resolveMedicineClass(material),
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
    rows.push(buildInventoryStocktakeMaterialRow(material, summary, reason, input.lots));
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
        rows.push(buildInventoryStocktakeMaterialRow(material, summary, "负库存", input.lots));
      }
    }

    for (const lot of input.lots) {
      const material = materialMap.get(lot.materialId);
      if (!material || lot.remainingQtyBase <= 0) continue;
      const summary = summaryMap.get(lot.materialId);
      if (!summary) continue;
      if (lot.status === "过期") rows.push(buildInventoryStocktakeMaterialRow(material, summary, "已过期", input.lots));
      if (lot.status === "临期") rows.push(buildInventoryStocktakeMaterialRow(material, summary, "临期", input.lots));
    }

    return uniqueInventoryStocktakeRows(rows);
  }

  if (input.mode === "分类盘点" && input.category) {
    for (const material of input.materials.filter((item) => item.category === input.category)) {
      pushMaterialRows(material.id, "分类盘点");
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
      medicineClass: row.medicineClass,
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

function resolveInventoryToleranceLimit(
  row: Pick<InventoryDifferenceRecord, "category" | "medicineClass" | "bookQtyBase">
): number {
  if (row.category === "药品" && (row.medicineClass === "疫苗" || row.medicineClass === "兽药")) {
    return Math.max(Math.abs(row.bookQtyBase) * 0.02, 1);
  }
  if (row.category === "工具" || row.category === "其他") {
    return Math.max(Math.abs(row.bookQtyBase) * 0.05, 1);
  }
  return Math.abs(row.bookQtyBase) * 0.05;
}

export function isInventoryDifferenceWithinTolerance(
  difference: Pick<InventoryDifferenceRecord, "category" | "medicineClass" | "bookQtyBase" | "diffBase">
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

function parseInventoryLedgerBaseQuantity(quantityText: string): number {
  const normalized = quantityText.trim().replace(/,/g, "");
  const match = normalized.match(/[+-]?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function resolveRecentConsumptionLotNos(
  ledgers: InventoryLedgerRow[] = [],
  materialId: string
): string[] {
  const lotNos: string[] = [];
  ledgers
    .filter((ledger) => ledger.materialId === materialId && ledger.lotNo && ledger.type === "业务消耗")
    .slice()
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .forEach((ledger) => {
      if (ledger.lotNo && !lotNos.includes(ledger.lotNo)) {
        lotNos.push(ledger.lotNo);
      }
    });
  return lotNos;
}

function restoreInventoryQuantityToLots(
  lots: InventoryLot[],
  materialId: string,
  amount: number,
  ledgers: InventoryLedgerRow[] = [],
  preferLotNo?: string,
  fallbackToExistingLot = false
): { nextLots: InventoryLot[]; lotNo?: string; restoredQuantity: number } {
  let remaining = amount;
  let nextLots = lots.slice();
  const restoredLotNos: string[] = [];
  const orderedLotNos = [
    ...(preferLotNo ? [preferLotNo] : []),
    ...resolveRecentConsumptionLotNos(ledgers, materialId).filter((lotNo) => lotNo !== preferLotNo)
  ];

  for (const lotNo of orderedLotNos) {
    if (remaining <= 0) break;
    const lot = nextLots.find((item) => item.materialId === materialId && item.lotNo === lotNo);
    if (!lot) continue;
    const consumedQuantity = ledgers
      .filter((ledger) => ledger.materialId === materialId && ledger.lotNo === lotNo && ledger.type === "业务消耗")
      .reduce((sum, ledger) => sum + Math.abs(parseInventoryLedgerBaseQuantity(ledger.quantityText)), 0);
    const restoreCapacity = Math.max(lot.convertedQtyBase - lot.remainingQtyBase, consumedQuantity);
    if (restoreCapacity <= 0) continue;
    const restored = Math.min(restoreCapacity, remaining);
    remaining -= restored;
    restoredLotNos.push(lotNo);
    nextLots = nextLots.map((item) =>
      item.id === lot.id
        ? {
            ...item,
            remainingQtyBase: item.remainingQtyBase + restored,
            status: item.status === "已耗尽" && item.remainingQtyBase + restored > 0 ? "正常" : item.status
          }
        : item
    );
  }

  if (remaining > 0 && fallbackToExistingLot) {
    const fallbackLot = getInventoryLotsForMaterial(nextLots, materialId).find(
      (lot) => lot.status !== "已耗尽"
    );
    if (fallbackLot) {
      nextLots = nextLots.map((lot) => {
        if (lot.id !== fallbackLot.id) return lot;
        const nextConverted = lot.convertedQtyBase + remaining;
        const nextRemaining = lot.remainingQtyBase + remaining;
        return {
          ...lot,
          convertedQtyBase: nextConverted,
          remainingQtyBase: nextRemaining,
          baseUnitCost: nextConverted > 0 ? Number((lot.unitPrice / nextConverted).toFixed(4)) : lot.baseUnitCost,
          status: lot.status === "已耗尽" && nextRemaining > 0 ? "正常" : lot.status
        };
      });
      restoredLotNos.push(fallbackLot.lotNo);
      remaining = 0;
    }
  }

  return {
    nextLots,
    lotNo: restoredLotNos.join("、") || undefined,
    restoredQuantity: amount - remaining
  };
}

function addInventoryGainToSystemSelectedLot(
  lots: InventoryLot[],
  materialId: string,
  amount: number,
  ledgers: InventoryLedgerRow[] = [],
  supplementAmount = 0
): { nextLots: InventoryLot[]; lotNo?: string } {
  const recentLotNos = resolveRecentConsumptionLotNos(ledgers, materialId);
  const materialLots = getInventoryLotsForMaterial(lots, materialId).filter((lot) => lot.status !== "已耗尽");
  const orderedLots = [
    ...recentLotNos
      .map((lotNo) => materialLots.find((lot) => lot.lotNo === lotNo))
      .filter((lot): lot is InventoryLot => Boolean(lot)),
    ...materialLots.filter((lot) => !recentLotNos.includes(lot.lotNo))
  ];
  const target = orderedLots[0];
  if (!target) {
    throw new Error("未找到可补充的库存批次。");
  }

  const nextLots = lots.map((lot) => {
    if (lot.id !== target.id) return lot;
    const nextConverted = lot.convertedQtyBase + amount;
    const nextRemaining = lot.remainingQtyBase + amount;
    const nextUnitPrice = Number((lot.unitPrice + supplementAmount).toFixed(2));
    return {
      ...lot,
      convertedQtyBase: nextConverted,
      remainingQtyBase: nextRemaining,
      unitPrice: nextUnitPrice,
      baseUnitCost: nextConverted > 0 ? Number((nextUnitPrice / nextConverted).toFixed(4)) : lot.baseUnitCost,
      status: lot.status === "已耗尽" && nextRemaining > 0 ? "正常" : lot.status
    };
  });

  return { nextLots, lotNo: target.lotNo };
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
      if (input.method === "任务出库多扣") {
        const restoreResult = restoreInventoryQuantityToLots(
          nextLots,
          record.materialId,
          remainingGain,
          input.ledgers,
          input.relatedLotNo
        );
        if (restoreResult.restoredQuantity < remainingGain) {
          throw new Error(
            input.method === "任务出库多扣"
              ? "未找到可回补的最近使用批次。"
              : "未找到可更正的原入库批次。"
          );
        }
        nextLots = restoreResult.nextLots;
        usedLotNo = restoreResult.lotNo;
      } else if (input.method === "入库数量更正" || input.method === "入库少录补金额") {
        const gainResult = addInventoryGainToSystemSelectedLot(
          nextLots,
          record.materialId,
          remainingGain,
          input.ledgers,
          input.method === "入库少录补金额" ? input.supplementAmount || 0 : 0
        );
        nextLots = gainResult.nextLots;
        usedLotNo = gainResult.lotNo;
      }
    }
  } else {
    const result = deductInventoryQuantity(nextLots, record.materialId, amount);
    nextLots = result.nextLots;
    usedLotNo = result.lotNo;
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
    remark: `${meta.label}${usedLotNo ? `；系统落批次 ${usedLotNo}` : ""}`
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

    const method: InventoryDifferenceMethod = difference.direction === "盘盈" ? "任务出库多扣" : "原因不明盘亏";
    let resolution: InventoryDifferenceResolution;
    try {
      resolution = buildInventoryDifferenceResolution({
        record: difference,
        method,
        materials: nextMaterials,
        lots: nextLots,
        ledgers: input.ledgers,
        operator: input.operator,
        occurredAt: input.occurredAt,
        ledgerIdPrefix: `${input.ledgerIdPrefix}-${index + 1}`
      });
    } catch {
      pendingDifferences.push(difference);
      return;
    }

    nextMaterials = resolution.materials;
    nextLots = resolution.lots;
    ledgers.push(...resolution.ledgers);
    processedDifferences.push({
      ...difference,
      status: "已处理",
      method,
      financeStatus: resolution.financeStatus,
      resultLedgerIds: resolution.ledgers.map((ledger) => ledger.id),
      processedAt: input.occurredAt,
      processedBy: input.operator
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
      remark: [
        `报废原因：${reason}`,
        `处理方式：${handlingMethod}`,
        input.photoNote?.trim() ? `照片留档：${input.photoNote.trim()}` : ""
      ]
        .filter(Boolean)
        .join("；")
    }
  };
}

export function buildInventorySummaries(
  materials: InventoryMaterial[],
  lots: InventoryLot[],
  ledgers?: InventoryLedgerRow[],
  options?: { usageWindowDays?: number; referenceAt?: number }
): InventorySummary[] {
  return materials.map((material) => {
    const materialLots = lots.filter((lot) => lot.materialId === material.id);
    const lotStock = materialLots.reduce((sum, lot) => sum + lot.remainingQtyBase, 0);
    const currentStockBase = lotStock - (material.negativeStockBase || 0);
    const datedLots = materialLots
      .filter((lot) => lot.expiryDate && lot.remainingQtyBase > 0 && lot.status !== "已耗尽")
      .sort((a, b) => new Date(a.expiryDate || "9999-12-31").getTime() - new Date(b.expiryDate || "9999-12-31").getTime());
    const nearestExpiryDate = material.category === "工具" ? "—" : datedLots[0]?.expiryDate || "—";

    const stockRisk: InventoryStockRisk = currentStockBase < 0 ? "负库存" : "无风险";
    const monthlyUsage = buildInventoryMonthlyUsage(material.id, ledgers, {
      windowDays: options?.usageWindowDays ?? 30,
      referenceAt: options?.referenceAt ?? INVENTORY_DEMO_REFERENCE_AT
    });
    const stockTrend = buildInventoryStockTrend(material.id, currentStockBase, ledgers, {
      windowDays: options?.usageWindowDays ?? 30,
      referenceAt: options?.referenceAt ?? INVENTORY_DEMO_REFERENCE_AT
    });

    return {
      materialId: material.id,
      materialName: material.materialName,
      category: material.category,
      medicineClass: material.category === "药品" ? resolveMedicineClass(material) : undefined,
      brand: material.brand,
      currentStockBase,
      baseUnit: material.baseUnit,
      monthlyUsageBase: monthlyUsage.monthlyUsageBase,
      usageTrend: monthlyUsage.usageTrend,
      stockTrend,
      stockRisk,
      nearestExpiryDate,
      lotCount: materialLots.length,
      materialStatus: getInventoryMaterialStatus(material)
    };
  });
}

export const inventoryCategoryOrder: InventoryCategory[] = ["饲料", "药品", "消耗品", "工具", "其他"];

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
        new Date(a.expiryDate || "9999-12-31").getTime() - new Date(b.expiryDate || "9999-12-31").getTime()
    );
}

export function getInventoryMaterialLabel(materials: InventoryMaterial[], materialId: string): string {
  const material = materials.find((item) => item.id === materialId);
  return material ? `${material.materialName} ${material.brand}` : "—";
}

export function resolveInventoryLastPurchaseInfo(
  material: InventoryMaterial,
  lots: InventoryLot[],
  ledgers: InventoryLedgerRow[]
): InventoryLastPurchaseInfo {
  const latestPurchaseLedger = ledgers
    .filter((ledger) => ledger.materialId === material.id && ledger.type === "采购入库")
    .slice()
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())[0];

  if (latestPurchaseLedger) {
    const ledgerLot = latestPurchaseLedger.lotNo
      ? lots.find((lot) => lot.materialId === material.id && lot.lotNo === latestPurchaseLedger.lotNo)
      : undefined;
    const quantityBase = Math.abs(parseInventoryLedgerQuantity(latestPurchaseLedger.quantityText) || ledgerLot?.convertedQtyBase || 0);
    return {
      occurredAt: latestPurchaseLedger.occurredAt,
      quantityBase,
      quantityText: quantityBase > 0 ? formatInventoryQty(quantityBase, material.baseUnit) : latestPurchaseLedger.quantityText,
      lotNo: latestPurchaseLedger.lotNo,
      supplier: ledgerLot?.supplier,
      source: "ledger"
    };
  }

  const latestLot = lots
    .filter((lot) => lot.materialId === material.id)
    .slice()
    .sort(
      (a, b) =>
        new Date(b.productionDate || b.expiryDate || "1970-01-01").getTime() -
          new Date(a.productionDate || a.expiryDate || "1970-01-01").getTime() ||
        b.lotNo.localeCompare(a.lotNo)
    )[0];

  if (latestLot) {
    return {
      quantityBase: latestLot.convertedQtyBase,
      quantityText: formatInventoryQty(latestLot.convertedQtyBase, material.baseUnit),
      lotNo: latestLot.lotNo,
      supplier: latestLot.supplier,
      source: "lot"
    };
  }

  return {
    quantityBase: 0,
    quantityText: "—",
    source: "none"
  };
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

function formatInventoryRiskSharePercent(riskQuantity: number, totalQuantity: number): number | null {
  if (totalQuantity <= 0) return null;
  return Math.round((Math.max(riskQuantity, 0) / totalQuantity) * 100);
}

export function formatInventoryRiskQuantityDisplay(
  quantity: number,
  unit: string,
  totalQuantity?: number
): string {
  const quantityText = formatInventoryQty(quantity, unit);
  if (totalQuantity === undefined) return quantityText;
  const share = formatInventoryRiskSharePercent(quantity, totalQuantity);
  if (share === null) return quantityText;
  return `${quantityText}（${share}%）`;
}

export function buildInventoryRiskItems(
  materials: InventoryMaterial[],
  lots: InventoryLot[],
  summaries: InventorySummary[]
): InventoryRiskItem[] {
  const materialMap = new Map(materials.map((material) => [material.id, material]));
  const summaryMap = new Map(summaries.map((summary) => [summary.materialId, summary]));
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
      const summary = summaryMap.get(lot.materialId);
      items.push({
        id: `risk-expired-${lot.id}`,
        type: "过期",
        materialId: lot.materialId,
        materialName: material.materialName,
        brand: material.brand,
        lotNo: lot.lotNo,
        expiryDate: lot.expiryDate,
        valueText: summary
          ? formatInventoryRiskQuantityDisplay(lot.remainingQtyBase, material.baseUnit, summary.currentStockBase)
          : formatInventoryQty(lot.remainingQtyBase, material.baseUnit),
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
      const summary = summaryMap.get(lot.materialId);
      items.push({
        id: `risk-expiring-${lot.id}`,
        type: "临期",
        materialId: lot.materialId,
        materialName: material.materialName,
        brand: material.brand,
        lotNo: lot.lotNo,
        expiryDate: lot.expiryDate,
        valueText: summary
          ? formatInventoryRiskQuantityDisplay(lot.remainingQtyBase, material.baseUnit, summary.currentStockBase)
          : formatInventoryQty(lot.remainingQtyBase, material.baseUnit),
        actionText: "发起盘点",
        targetTab: "lots",
        priority: 3
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
