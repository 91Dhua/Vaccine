import type { ColumnsType } from "antd/es/table";
import {
  Alert,
  AutoComplete,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message
} from "antd";
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  InfoCircleOutlined,
  InboxOutlined,
  PlayCircleOutlined,
  ProfileOutlined,
  StopOutlined
} from "@ant-design/icons";
import { useMemo, useState } from "react";
import {
  buildInventoryCategoryTabs,
  buildInventoryLedgerTabCounts,
  buildInventoryLedgerQuantityDisplay,
  buildInventoryMaterialUsageState,
  buildInventoryReceiveEntryFromSearch,
  buildInventoryRiskItems,
  buildInventorySummaries,
  calculateInventoryBaseQuantity,
  filterInventorySummariesByMaterialStatus,
  filterInventoryLedgers,
  formatInventoryQty,
  formatNearestExpiryDate,
  generateInventoryLotNo,
  getInventoryLotsForMaterial,
  getInventoryMaterialLabel,
  getInventoryMaterialStatus,
  getInventoryReceiveMaterialOptions,
  hasInventoryMaterialBusinessRecords,
  inventoryCategoryBaseUnitRecommendations,
  inventoryCategoryOrder,
  inventorySeedLedgers,
  inventorySeedLots,
  inventorySeedMaterials,
  inventoryUnitOptions,
  receiveMaterialCategoryOptions,
  resolveInventoryUnitFactor,
  toggleInventoryMaterialStatus,
  updateInventoryMaterial,
  validateInventoryMaterialEdit,
  validateInventoryPackageConversions,
  type InventoryCategory,
  type InventoryCategoryTab,
  type InventoryLedgerDirection,
  type InventoryLedgerRow,
  type InventoryLedgerType,
  type InventoryLot,
  type InventoryMaterial,
  type InventoryMaterialStatus,
  type InventoryMaterialStatusFilter,
  type InventoryPackageConversion,
  type InventorySummary
} from "./inventoryData";

const { Text, Title } = Typography;
const STOCKTAKE_RISK_DAYS = 30;

type InventoryHomeRiskKind = "负库存" | "已过期" | "临期" | "低库存";
type InventoryListStockStatus = "正常" | "临期" | "低库存" | "负库存";

type InventoryMaterialEditFormValues = {
  materialCode: string;
  materialName: string;
  brand: string;
  category: InventoryCategory;
  baseUnit: string;
  safetyStockBase?: number;
  note?: string;
};

type InventoryHomeRiskRow = {
  id: string;
  type: InventoryHomeRiskKind;
  materialId: string;
  materialName: string;
  brand: string;
  valueText: string;
  detailText: string;
  actionText: string;
  priority: number;
};

const materialStatusFilterOptions: InventoryMaterialStatusFilter[] = ["全部", "启用中", "已停用"];
const materialEditCategoryOptions: InventoryCategory[] = ["饲料", "兽药", "保健品", "疫苗", "消毒用品", "精液", "工具", "其他"];

function statusColor(status: string) {
  if (status.includes("负库存") || status.includes("过期")) return "error";
  if (status.includes("低库存") || status.includes("临期")) return "warning";
  return "success";
}

function resolveListStockStatus(summary: InventorySummary, lots: InventoryLot[]): InventoryListStockStatus {
  if (summary.currentStockBase < 0) return "负库存";
  if (summary.stockRisk === "低库存") return "低库存";
  if (lots.some((lot) => lot.materialId === summary.materialId && lot.status === "临期" && lot.remainingQtyBase > 0)) {
    return "临期";
  }
  return "正常";
}

function formatInventoryDateTime(value?: string) {
  return value ? value.slice(0, 16) : "—";
}

function formatInventoryDate(value?: string) {
  return value ? value.slice(0, 10) : "—";
}

function resolveMaterialCode(material: InventoryMaterial) {
  return material.materialCode || `MAT-${material.id.slice(-6).toUpperCase()}`;
}

function resolveBusinessType(source: string) {
  if (source.includes("治疗")) return "治疗任务";
  if (source.includes("免疫")) return "免疫任务";
  if (source.includes("消毒")) return "消毒任务";
  if (source.includes("饲喂")) return "饲喂任务";
  if (source.includes("盘点")) return "库存盘点";
  if (source.includes("入库")) return "采购入库";
  return "其他业务";
}

function buildMaterialExtensionItems(material: InventoryMaterial) {
  if (material.category === "兽药") {
    return [
      { label: "剂型", value: material.dosageForm },
      { label: "使用方式", value: material.usageMethod },
      { label: "休药期", value: material.withdrawalPeriod }
    ];
  }

  if (material.category === "疫苗") {
    return [
      { label: "疫苗类型", value: material.vaccineType },
      { label: "接种方式", value: material.administrationRoute },
      { label: "是否冷链", value: material.coldChain },
      { label: "储存温度", value: material.storageTemperature }
    ];
  }

  return [];
}

function isLongUnstocked(lastStocktakeAt?: string) {
  if (!lastStocktakeAt) return false;
  const lastDate = new Date(lastStocktakeAt).getTime();
  const currentDate = new Date().getTime();
  return currentDate - lastDate > STOCKTAKE_RISK_DAYS * 24 * 60 * 60 * 1000;
}

function formatCurrency(value: number) {
  return `¥${Number.isInteger(value) ? value : value.toFixed(2)}`;
}

function parseLedgerQuantity(quantityText: string): number {
  const matched = quantityText.match(/[-+]?\d+(\.\d+)?/);
  return matched ? Number(matched[0]) : 0;
}

type ReceivePackageConversionDraft = {
  fromUnit?: string;
  quantity?: number;
};

function formatInventoryNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function normalizeReceivePackageConversions(
  baseUnit: string,
  drafts: ReceivePackageConversionDraft[] = []
): InventoryPackageConversion[] {
  return drafts
    .map((draft, index) => ({
      fromUnit: draft.fromUnit || "",
      quantity: Number(draft.quantity || 0),
      toUnit: index === 0 ? baseUnit : drafts[index - 1]?.fromUnit || ""
    }))
    .filter((conversion) => conversion.fromUnit || conversion.quantity || conversion.toUnit);
}

function buildDefaultPackageConversion(): ReceivePackageConversionDraft[] {
  return [{ fromUnit: undefined, quantity: undefined }];
}

export function ConsoleInventoryPage() {
  const [materials, setMaterials] = useState<InventoryMaterial[]>(inventorySeedMaterials);
  const [lots, setLots] = useState<InventoryLot[]>(inventorySeedLots);
  const [ledgers, setLedgers] = useState<InventoryLedgerRow[]>(inventorySeedLedgers);
  const [inventoryView, setInventoryView] = useState<"home" | "ledgers" | "detail">("home");
  const [activeCategory, setActiveCategory] = useState<InventoryCategory>(inventoryCategoryOrder[0]);
  const [summaryKeyword, setSummaryKeyword] = useState("");
  const [materialStatusFilter, setMaterialStatusFilter] = useState<InventoryMaterialStatusFilter>("启用中");
  const [activeLedgerDirection, setActiveLedgerDirection] = useState<InventoryLedgerDirection>("inbound");
  const [ledgerKeyword, setLedgerKeyword] = useState("");
  const [ledgerDateRange, setLedgerDateRange] = useState<[string, string] | null>(null);
  const [outboundTypes, setOutboundTypes] = useState<InventoryLedgerType[]>([]);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receiveMaterialText, setReceiveMaterialText] = useState("");
  const [receiveMaterialId, setReceiveMaterialId] = useState<string | undefined>();
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [activeHomeRiskType, setActiveHomeRiskType] = useState<InventoryHomeRiskKind | "全部">("全部");
  const [expiredActionLot, setExpiredActionLot] = useState<InventoryLot | null>(null);
  const [receiveForm] = Form.useForm();
  const [editMaterialForm] = Form.useForm<InventoryMaterialEditFormValues>();
  const receiveBaseUnitValue = Form.useWatch("baseUnit", receiveForm) as string | undefined;
  const receivePackageDrafts = (Form.useWatch("packageConversions", receiveForm) || []) as ReceivePackageConversionDraft[];
  const receiveInboundQuantity = Form.useWatch("inboundQuantity", receiveForm) as number | undefined;
  const receiveInboundUnit = Form.useWatch("inboundUnit", receiveForm) as string | undefined;

  const summaries = useMemo(() => buildInventorySummaries(materials, lots), [materials, lots]);
  const categoryTabs = useMemo(
    () => buildInventoryCategoryTabs(summaries, materialStatusFilter),
    [materialStatusFilter, summaries]
  );
  const riskItems = useMemo(
    () => buildInventoryRiskItems(materials, lots, summaries),
    [lots, materials, summaries]
  );
  const ledgerTabCounts = useMemo(() => buildInventoryLedgerTabCounts(ledgers), [ledgers]);
  const filteredLedgers = useMemo(
    () =>
      filterInventoryLedgers({
        ledgers,
        materials,
        direction: activeLedgerDirection,
        keyword: ledgerKeyword,
        dateRange: ledgerDateRange,
        outboundTypes
      }),
    [activeLedgerDirection, ledgerDateRange, ledgerKeyword, ledgers, materials, outboundTypes]
  );

  const filteredSummaries = useMemo(() => {
    const keyword = summaryKeyword.trim();
    return filterInventorySummariesByMaterialStatus(summaries, materials, materialStatusFilter).filter((item) => {
      const matchesCategory = item.category === activeCategory;
      if (!matchesCategory) return false;
      if (!keyword) return true;
      return `${item.materialName}${item.brand}`.includes(keyword);
    });
  }, [activeCategory, materialStatusFilter, materials, summaries, summaryKeyword]);

  const riskMaterialRows = useMemo<InventoryHomeRiskRow[]>(() => {
    return riskItems
      .map((item) => {
        const type: InventoryHomeRiskKind = item.type === "过期" ? "已过期" : item.type;
        return {
          id: item.id,
          type,
          materialId: item.materialId,
          materialName: item.materialName,
          brand: item.brand,
          valueText: item.valueText,
          detailText: item.lotNo ? `批次 ${item.lotNo}` : item.actionText,
          actionText: item.actionText,
          priority: item.priority
        };
      })
      .sort((a, b) => a.priority - b.priority || a.materialName.localeCompare(b.materialName, "zh-Hans-CN"));
  }, [riskItems]);

  const homeActionItems: Array<{ key: InventoryHomeRiskKind; label: string; count: number }> = [
    { key: "低库存", label: "低库存", count: riskMaterialRows.filter((item) => item.type === "低库存").length },
    { key: "临期", label: "临期库存", count: riskMaterialRows.filter((item) => item.type === "临期").length },
    { key: "负库存", label: "负库存", count: riskMaterialRows.filter((item) => item.type === "负库存").length }
  ];
  const filteredHomeRiskRows =
    activeHomeRiskType === "全部"
      ? riskMaterialRows.slice(0, 5)
      : riskMaterialRows.filter((item) => item.type === activeHomeRiskType);
  const lotByNo = useMemo(() => new Map(lots.map((lot) => [lot.lotNo, lot])), [lots]);
  const inventoryTotalValue = useMemo(
    () => lots.reduce((sum, lot) => sum + Math.max(lot.remainingQtyBase, 0) * lot.baseUnitCost, 0),
    [lots]
  );
  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentMonthConsumptionCost = useMemo(
    () =>
      ledgers
        .filter((ledger) => ledger.type === "业务消耗" && ledger.occurredAt.startsWith(currentMonth))
        .reduce((sum, ledger) => {
          const lot = ledger.lotNo ? lotByNo.get(ledger.lotNo) : undefined;
          return sum + Math.abs(parseLedgerQuantity(ledger.quantityText)) * (lot?.baseUnitCost || 0);
        }, 0),
    [currentMonth, ledgers, lotByNo]
  );

  const selectedSummary = selectedMaterialId
    ? summaries.find((item) => item.materialId === selectedMaterialId) || null
    : null;
  const selectedMaterial = selectedMaterialId
    ? materials.find((item) => item.id === selectedMaterialId) || null
    : null;
  const editingMaterial = editingMaterialId ? materials.find((item) => item.id === editingMaterialId) || null : null;
  const selectedMaterialLots = selectedMaterialId
    ? getInventoryLotsForMaterial(lots, selectedMaterialId)
    : [];
  const selectedMaterialLedgers = selectedMaterialId
    ? ledgers
        .filter((ledger) => ledger.materialId === selectedMaterialId)
        .slice()
        .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    : [];
  const selectedMaterialConsumptionLedgers = selectedMaterialLedgers.filter((ledger) => ledger.type === "业务消耗");
  const receiveDate = new Date().toISOString().slice(0, 10);
  const receiveSequence =
    lots.filter((lot) => lot.lotNo.startsWith(`RK-${receiveDate.replace(/-/g, "")}`)).length + 1;
  const receiveLotNo = generateInventoryLotNo(receiveDate, receiveSequence);
  const receiveMaterialKeyword = receiveMaterialText.trim();
  const activeReceiveMaterials = materials.filter((material) => getInventoryMaterialStatus(material) === "启用中");
  const receiveMaterialExists = Boolean(
    receiveMaterialId || activeReceiveMaterials.some((item) => item.materialName === receiveMaterialKeyword)
  );
  const selectedReceiveMaterial = receiveMaterialId
    ? activeReceiveMaterials.find((item) => item.id === receiveMaterialId) || null
    : activeReceiveMaterials.find((item) => item.materialName === receiveMaterialKeyword) || null;
  const receiveMaterialInfoVisible = Boolean(receiveMaterialKeyword);
  const effectiveReceiveBaseUnit = selectedReceiveMaterial?.baseUnit || receiveBaseUnitValue || "";
  const receivePackageConversions = useMemo(
    () => normalizeReceivePackageConversions(effectiveReceiveBaseUnit, receivePackageDrafts),
    [effectiveReceiveBaseUnit, receivePackageDrafts]
  );
  const receivePackageValidationMessage = effectiveReceiveBaseUnit
    ? validateInventoryPackageConversions(effectiveReceiveBaseUnit, receivePackageConversions)
    : "请先选择核算单位。";
  const receiveInboundBaseQuantity =
    receiveInboundQuantity && receiveInboundUnit && effectiveReceiveBaseUnit
      ? calculateInventoryBaseQuantity(
          receiveInboundQuantity,
          receiveInboundUnit,
          effectiveReceiveBaseUnit,
          receivePackageConversions
        )
      : null;
  const receiveInboundUnitOptions = Array.from(
    new Set([effectiveReceiveBaseUnit, ...receivePackageConversions.map((conversion) => conversion.fromUnit)].filter(Boolean))
  ).map((unit) => ({ label: unit, value: unit }));
  const receiveTopPackageConversion = receivePackageConversions[receivePackageConversions.length - 1];
  const receiveTopPackageFactor =
    receiveTopPackageConversion && effectiveReceiveBaseUnit
      ? resolveInventoryUnitFactor(receiveTopPackageConversion.fromUnit, effectiveReceiveBaseUnit, receivePackageConversions)
      : null;
  const receiveSystemConversionText =
    receiveTopPackageConversion && receiveTopPackageFactor !== null && receiveTopPackageConversion.fromUnit !== effectiveReceiveBaseUnit
      ? `系统换算：1${receiveTopPackageConversion.fromUnit} = ${formatInventoryNumber(receiveTopPackageFactor)}${effectiveReceiveBaseUnit}`
      : "";
  const receiveMaterialOptions = getInventoryReceiveMaterialOptions(materials);
  const selectedRiskMessages =
    selectedSummary && selectedMaterial
      ? [
          selectedSummary.currentStockBase < 0
            ? `负库存：当前库存 ${formatInventoryQty(selectedSummary.currentStockBase, selectedSummary.baseUnit)}，请核对消耗或补录入库。`
            : "",
          selectedSummary.safetyStockBase !== undefined &&
          selectedSummary.currentStockBase >= 0 &&
          selectedSummary.currentStockBase <= selectedSummary.safetyStockBase
            ? `低库存：当前库存 ${formatInventoryQty(selectedSummary.currentStockBase, selectedSummary.baseUnit)}，低于或等于安全库存 ${formatInventoryQty(selectedSummary.safetyStockBase, selectedSummary.baseUnit)}。`
            : "",
          ...selectedMaterialLots
            .filter((lot) => lot.status === "临期" && lot.remainingQtyBase > 0)
            .map((lot) => `临期批次：${lot.lotNo} 将于 ${lot.expiryDate} 到期，建议优先使用。`),
          ...selectedMaterialLots
            .filter((lot) => lot.status === "过期" && lot.remainingQtyBase > 0)
            .map((lot) => `过期库存：${lot.lotNo} 已过期，剩余 ${formatInventoryQty(lot.remainingQtyBase, selectedSummary.baseUnit)}。`),
          isLongUnstocked(selectedMaterial.lastStocktakeAt)
            ? `长期未盘点：最近盘点时间为 ${formatInventoryDate(selectedMaterial.lastStocktakeAt)}，已超过 ${STOCKTAKE_RISK_DAYS} 天。`
            : ""
        ].filter((message): message is string => Boolean(message))
      : [];
  const selectedConsumptionQty = selectedMaterialConsumptionLedgers.reduce(
    (sum, ledger) => sum + parseLedgerQuantity(ledger.quantityText),
    0
  );
  const selectedConsumptionQty7Days = selectedMaterialConsumptionLedgers
    .filter((ledger) => new Date().getTime() - new Date(ledger.occurredAt).getTime() <= 7 * 24 * 60 * 60 * 1000)
    .reduce((sum, ledger) => sum + parseLedgerQuantity(ledger.quantityText), 0);
  const selectedConsumptionCost = selectedMaterialConsumptionLedgers.reduce((sum, ledger) => {
    const lot = selectedMaterialLots.find((item) => item.lotNo === ledger.lotNo);
    return sum + parseLedgerQuantity(ledger.quantityText) * (lot?.baseUnitCost || 0);
  }, 0);
  const selectedConsumptionSources = Object.entries(
    selectedMaterialConsumptionLedgers.reduce<Record<string, { count: number; quantity: number }>>((groups, ledger) => {
      const sourceType = resolveBusinessType(ledger.source);
      const current = groups[sourceType] || { count: 0, quantity: 0 };
      groups[sourceType] = {
        count: current.count + 1,
        quantity: current.quantity + parseLedgerQuantity(ledger.quantityText)
      };
      return groups;
    }, {})
  );

  const openCategory = (category: InventoryCategory, keyword = "") => {
    setActiveCategory(category);
    setSummaryKeyword(keyword);
  };

  const openMaterialDetail = (materialId: string) => {
    setSelectedMaterialId(materialId);
    setInventoryView("detail");
  };

  const resolveMaterialUsageState = (materialId: string) =>
    buildInventoryMaterialUsageState(materialId, materials, lots, ledgers);

  const openEditMaterial = (materialId: string) => {
    const material = materials.find((item) => item.id === materialId);
    if (!material) return;
    setEditingMaterialId(materialId);
    editMaterialForm.setFieldsValue({
      materialCode: resolveMaterialCode(material),
      materialName: material.materialName,
      brand: material.brand,
      category: material.category,
      baseUnit: material.baseUnit,
      safetyStockBase: material.safetyStockBase,
      note: material.note
    });
  };

  const closeEditMaterial = () => {
    setEditingMaterialId(null);
    editMaterialForm.resetFields();
  };

  const saveMaterialEdit = (values: InventoryMaterialEditFormValues) => {
    if (!editingMaterial) return;
    const usageState = resolveMaterialUsageState(editingMaterial.id);
    const normalizedValues = {
      ...values,
      safetyStockBase: typeof values.safetyStockBase === "number" ? values.safetyStockBase : undefined,
      note: values.note?.trim() || undefined
    };
    const validationMessage = validateInventoryMaterialEdit({
      materialId: editingMaterial.id,
      materials,
      ...normalizedValues,
      canEditBaseUnit: usageState.canEditBaseUnit
    });
    if (validationMessage) {
      message.error(validationMessage);
      return;
    }

    const changedDisplayFields =
      editingMaterial.materialName !== normalizedValues.materialName.trim() ||
      editingMaterial.brand !== normalizedValues.brand.trim() ||
      editingMaterial.category !== normalizedValues.category;

    const applyUpdate = () => {
      setMaterials((prev) =>
        updateInventoryMaterial(prev, {
          materialId: editingMaterial.id,
          materialName: normalizedValues.materialName,
          brand: normalizedValues.brand,
          category: normalizedValues.category,
          baseUnit: usageState.canEditBaseUnit ? normalizedValues.baseUnit : editingMaterial.baseUnit,
          safetyStockBase: normalizedValues.safetyStockBase,
          note: normalizedValues.note
        })
      );
      setActiveCategory(normalizedValues.category);
      closeEditMaterial();
      message.success("物料信息已更新");
    };

    if (hasInventoryMaterialBusinessRecords(usageState) && changedDisplayFields) {
      Modal.confirm({
        title: "确认修改物料信息？",
        content: "当前物料已有库存或历史记录。修改后将影响后续展示和选择，但不会改变历史库存流水。请确认是否继续。",
        okText: "确认继续",
        cancelText: "取消",
        onOk: applyUpdate
      });
      return;
    }

    applyUpdate();
  };

  const submitEditMaterial = async () => {
    const values = await editMaterialForm.validateFields();
    saveMaterialEdit(values);
  };

  const toggleMaterialStatus = (materialId: string, nextStatus: InventoryMaterialStatus) => {
    const material = materials.find((item) => item.id === materialId);
    if (!material) return;
    const usageState = resolveMaterialUsageState(materialId);
    const isDisabling = nextStatus === "已停用";
    Modal.confirm({
      title: isDisabling
        ? usageState.currentStock !== 0
          ? "当前物料仍有库存，确认停用？"
          : "确认停用物料？"
        : "确认启用物料？",
      content: isDisabling
        ? usageState.currentStock !== 0
          ? "当前物料仍有库存。停用后，该物料将不再支持新任务选择和新增入库，但库存、批次和历史记录仍会保留。请确认是否停用。"
          : "停用后，该物料将不再支持新任务选择和新增入库，但历史记录仍会保留。请确认是否停用。"
        : "启用后，该物料将重新支持采购入库和新任务选择。请确认是否启用。",
      okText: isDisabling ? "确认停用" : "确认启用",
      cancelText: "取消",
      okButtonProps: isDisabling ? { danger: true } : undefined,
      onOk: () => {
        setMaterials((prev) => toggleInventoryMaterialStatus(prev, materialId, nextStatus));
        message.success(isDisabling ? "物料已停用" : "物料已启用");
      }
    });
  };

  const resetReceiveFormState = () => {
    receiveForm.resetFields();
    setReceiveMaterialText("");
    setReceiveMaterialId(undefined);
  };

  const applyReceiveBaseUnit = (baseUnit: string) => {
    receiveForm.setFieldsValue({
      baseUnit,
      packageConversions: buildDefaultPackageConversion(),
      inboundUnit: undefined,
      inboundQuantity: undefined
    });
  };

  const applyReceiveCategoryRecommendation = (category: InventoryCategory) => {
    const recommendedBaseUnit = inventoryCategoryBaseUnitRecommendations[category]?.[0];
    if (recommendedBaseUnit && !receiveForm.getFieldValue("baseUnit")) {
      applyReceiveBaseUnit(recommendedBaseUnit);
    }
  };

  const applyExistingReceiveMaterial = (material: InventoryMaterial) => {
    setReceiveMaterialId(material.id);
    receiveForm.setFieldsValue({
      brand: material.brand,
      category: material.category,
      baseUnit: material.baseUnit,
      packageConversions: buildDefaultPackageConversion(),
      inboundUnit: undefined,
      inboundQuantity: undefined
    });
  };

  const submitReceive = async () => {
    const values = await receiveForm.validateFields();
    const materialId = `mat-receive-${Date.now()}`;
    const baseUnit = selectedReceiveMaterial?.baseUnit || values.baseUnit;
    const packageConversions = normalizeReceivePackageConversions(baseUnit, values.packageConversions);
    const packageValidationMessage = validateInventoryPackageConversions(baseUnit, packageConversions);
    if (packageValidationMessage) {
      message.error(packageValidationMessage);
      return;
    }
    const baseQuantity = calculateInventoryBaseQuantity(
      values.inboundQuantity,
      values.inboundUnit,
      baseUnit,
      packageConversions
    );
    if (!baseQuantity) {
      message.error("请完善包装规格后再提交入库。");
      return;
    }
    const receivedEntry = buildInventoryReceiveEntryFromSearch({
      materials,
      selectedMaterialId: receiveMaterialId,
      materialText: values.materialName,
      category: values.category,
      brand: values.brand,
      baseUnit,
      safetyStockBase: values.safetyStockBase,
      note: values.note,
      newMaterialId: materialId,
      lotId: `lot-receive-${Date.now()}`,
      expiryDate: values.expiryDate,
      unitPrice: values.unitPrice,
      inboundQuantity: values.inboundQuantity,
      inboundUnit: values.inboundUnit,
      baseQuantity,
      packageConversions,
      supplier: values.supplier,
      supplierPhone: values.supplierPhone,
      receiveDate,
      sequence: receiveSequence
    });

    if (!materials.some((item) => item.id === receivedEntry.material.id)) {
      setMaterials((prev) => [...prev, receivedEntry.material]);
    }
    setLots((prev) => [...prev, receivedEntry.lot]);
    setLedgers((prev) => [
      {
        id: `ledger-receive-${Date.now()}`,
        occurredAt: `${receiveDate} 09:00`,
        type: "采购入库",
        source: `入库批次 ${receivedEntry.lot.lotNo}`,
        materialId: receivedEntry.material.id,
        lotNo: receivedEntry.lot.lotNo,
        quantityText: `+${formatInventoryQty(receivedEntry.lot.convertedQtyBase, receivedEntry.material.baseUnit)}`,
        afterStockText: formatInventoryQty(
          (summaries.find((summary) => summary.materialId === receivedEntry.material.id)?.currentStockBase || 0) +
            receivedEntry.lot.convertedQtyBase,
          receivedEntry.material.baseUnit
        ),
        operator: "当前用户"
      },
      ...prev
    ]);
    setActiveCategory(receivedEntry.material.category);
    setSummaryKeyword(receivedEntry.material.materialName);
    resetReceiveFormState();
    setReceiveOpen(false);
    message.success("已生成系统批次，并写入对应物料列表和批次明细");
  };

  const resolveExpiredAction = (mode: "全部报废" | "继续使用" | "部分处理") => {
    if (!expiredActionLot) return;
    if (mode === "全部报废") {
      setLots((prev) =>
        prev.map((lot) =>
          lot.id === expiredActionLot.id ? { ...lot, status: "已耗尽", remainingQtyBase: 0 } : lot
        )
      );
    }
    message.success(`演示：已记录${mode}处理原因，并生成过期库存处理记录`);
    setExpiredActionLot(null);
  };

  const summaryColumns: ColumnsType<InventorySummary> = [
    {
      title: "物料名称",
      dataIndex: "materialName",
      sorter: (a, b) => a.materialName.localeCompare(b.materialName, "zh-Hans-CN"),
      render: (_, row) => (
        <button
          type="button"
          className="inventory-material-link"
          onClick={() => openMaterialDetail(row.materialId)}
        >
          <strong>{row.materialName}</strong>
          <span>
            {row.brand}｜<Tag color={row.materialStatus === "已停用" ? "default" : "success"}>{row.materialStatus}</Tag>
          </span>
        </button>
      )
    },
    {
      title: "品牌",
      dataIndex: "brand",
      sorter: (a, b) => a.brand.localeCompare(b.brand, "zh-Hans-CN"),
      render: (value) => value || "—"
    },
    {
      title: "分类",
      dataIndex: "category",
      filters: inventoryCategoryOrder.map((value) => ({ text: value, value })),
      onFilter: (value, row) => row.category === value,
      sorter: (a, b) => a.category.localeCompare(b.category, "zh-Hans-CN")
    },
    {
      title: "当前库存",
      dataIndex: "currentStockBase",
      sorter: (a, b) => a.currentStockBase - b.currentStockBase,
      render: (_, row) => formatInventoryQty(row.currentStockBase, row.baseUnit)
    },
    {
      title: "最近到期日",
      dataIndex: "nearestExpiryDate",
      sorter: (a, b) =>
        new Date(String(a.nearestExpiryDate)).getTime() - new Date(String(b.nearestExpiryDate)).getTime(),
      render: (_, row) => formatNearestExpiryDate(row)
    },
    {
      title: "库存状态",
      dataIndex: "stockRisk",
      filters: ["正常", "临期", "低库存", "负库存"].map((value) => ({ text: value, value })),
      onFilter: (value, row) => resolveListStockStatus(row, lots) === value,
      sorter: (a, b) => resolveListStockStatus(a, lots).localeCompare(resolveListStockStatus(b, lots), "zh-Hans-CN"),
      render: (_, row) => {
        const status = resolveListStockStatus(row, lots);
        return <Tag color={statusColor(status)}>{status}</Tag>;
      }
    },
    {
      title: "操作",
      width: 148,
      render: (_, row) => (
        <Space size={2}>
          <Tooltip title="查看详情">
            <Button type="text" icon={<EyeOutlined />} onClick={() => openMaterialDetail(row.materialId)} />
          </Tooltip>
          <Tooltip title="编辑物料">
            <Button type="text" icon={<EditOutlined />} onClick={() => openEditMaterial(row.materialId)} />
          </Tooltip>
          {row.materialStatus === "已停用" ? (
            <Tooltip title="启用物料">
              <Button
                type="text"
                icon={<PlayCircleOutlined />}
                onClick={() => toggleMaterialStatus(row.materialId, "启用中")}
              />
            </Tooltip>
          ) : (
            <Tooltip title="停用物料">
              <Button
                type="text"
                danger
                icon={<StopOutlined />}
                onClick={() => toggleMaterialStatus(row.materialId, "已停用")}
              />
            </Tooltip>
          )}
        </Space>
      )
    }
  ];

  const materialLotColumns: ColumnsType<InventoryLot> = [
    { title: "批次号", dataIndex: "lotNo", sorter: (a, b) => a.lotNo.localeCompare(b.lotNo) },
    { title: "到期日期", dataIndex: "expiryDate", sorter: (a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime() },
    {
      title: "库存数量",
      dataIndex: "remainingQtyBase",
      sorter: (a, b) => a.remainingQtyBase - b.remainingQtyBase,
      render: (_, row) => {
        const unit = selectedMaterial?.baseUnit || "";
        const consumedQty = Math.max(row.convertedQtyBase - row.remainingQtyBase, 0);
        return (
          <span className="inventory-lot-quantity">
            <strong>{formatInventoryQty(row.remainingQtyBase, unit)}</strong>
            <Text type="secondary">
              入库 {formatInventoryQty(row.convertedQtyBase, unit)} / 已耗 {formatInventoryQty(consumedQty, unit)}
            </Text>
          </span>
        );
      }
    },
    {
      title: "进货价",
      dataIndex: "unitPrice",
      sorter: (a, b) => a.unitPrice - b.unitPrice,
      render: (value, row) => `${formatCurrency(value)}/${row.inboundUnit || selectedMaterial?.baseUnit || "单位"}`
    },
    { title: "供应商", dataIndex: "supplier", render: (value) => value || "—" },
    { title: "供应商电话", dataIndex: "supplierPhone", render: (value) => value || "—" },
    {
      title: "入库时间",
      dataIndex: "lotNo",
      sorter: (a, b) =>
        new Date(selectedMaterialLedgers.find((ledger) => ledger.lotNo === a.lotNo && ledger.type === "采购入库")?.occurredAt || "").getTime() -
        new Date(selectedMaterialLedgers.find((ledger) => ledger.lotNo === b.lotNo && ledger.type === "采购入库")?.occurredAt || "").getTime(),
      render: (_, row) => formatInventoryDateTime(selectedMaterialLedgers.find((ledger) => ledger.lotNo === row.lotNo && ledger.type === "采购入库")?.occurredAt)
    },
    {
      title: "批次状态",
      dataIndex: "status",
      filters: ["正常", "临期", "过期", "已耗尽"].map((value) => ({ text: value, value })),
      onFilter: (value, row) => row.status === value,
      render: (value) => <Tag color={statusColor(value)}>{value}</Tag>
    }
  ];

  const ledgerColumns: ColumnsType<InventoryLedgerRow> = [
    {
      title: "出/入库类型",
      dataIndex: "type",
      filters: ["采购入库", "业务消耗", "盘盈", "盘亏", "过期报废"].map((value) => ({ text: value, value })),
      onFilter: (value, row) => row.type === value,
      sorter: (a, b) => a.type.localeCompare(b.type, "zh-Hans-CN"),
      render: (value) => <Tag>{value}</Tag>
    },
    {
      title: "物料",
      dataIndex: "materialId",
      sorter: (a, b) =>
        getInventoryMaterialLabel(materials, a.materialId).localeCompare(
          getInventoryMaterialLabel(materials, b.materialId),
          "zh-Hans-CN"
        ),
      render: (value) => getInventoryMaterialLabel(materials, value)
    },
    { title: "批次", dataIndex: "lotNo", render: (value) => value || "物料级负库存" },
    {
      title: (
        <span className="inventory-table-title-with-help">
          数量变化 / 结存数量
          <Tooltip
            trigger="click"
            placement="topLeft"
            title="本次入库、出库或盘点完成后，该物料的剩余库存数量。"
          >
            <button
              type="button"
              className="inventory-field-help"
              aria-label="结存数量说明"
              onClick={(event) => event.stopPropagation()}
            >
              <InfoCircleOutlined />
            </button>
          </Tooltip>
        </span>
      ),
      dataIndex: "quantityText",
      sorter: (a, b) => parseLedgerQuantity(a.quantityText) - parseLedgerQuantity(b.quantityText),
      render: (_, row) => {
        const quantityDisplay = buildInventoryLedgerQuantityDisplay(row);
        return (
          <span className="inventory-ledger-quantity">
            <strong>{quantityDisplay.changeText}</strong>
            <Text type="secondary">结存 {quantityDisplay.balanceText}</Text>
          </span>
        );
      }
    },
    {
      title: "操作人/时间",
      dataIndex: "operator",
      sorter: (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
      render: (_, row) => (
        <span className="inventory-operator-time">
          <strong>{row.operator}</strong>
          <Text type="secondary">{formatInventoryDateTime(row.occurredAt)}</Text>
        </span>
      )
    }
  ];

  const materialLedgerColumns: ColumnsType<InventoryLedgerRow> = [
    {
      title: "事件类型",
      dataIndex: "type",
      filters: ["采购入库", "业务消耗", "盘盈", "盘亏", "过期报废"].map((value) => ({ text: value, value })),
      onFilter: (value, row) => row.type === value,
      render: (value) => <Tag>{value}</Tag>
    },
    { title: "来源业务", dataIndex: "source", sorter: (a, b) => a.source.localeCompare(b.source, "zh-Hans-CN") },
    {
      title: "关联单据/任务",
      dataIndex: "source",
      render: (value) => <Button type="link">{value.split(" ").at(-1) || value}</Button>
    },
    { title: "数量变化", dataIndex: "quantityText", sorter: (a, b) => parseLedgerQuantity(a.quantityText) - parseLedgerQuantity(b.quantityText) },
    { title: "扣减批次", dataIndex: "lotNo", render: (value) => value || "物料级负库存" },
    { title: "变动后库存", dataIndex: "afterStockText" },
    {
      title: "操作人/时间",
      dataIndex: "operator",
      sorter: (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
      render: (_, row) => (
        <span className="inventory-operator-time">
          <strong>{row.operator}</strong>
          <Text type="secondary">{formatInventoryDateTime(row.occurredAt)}</Text>
        </span>
      )
    },
    { title: "备注", render: () => "—" }
  ];

  const usageRecordColumns: ColumnsType<InventoryLedgerRow> = [
    { title: "任务类型", dataIndex: "source", render: (value) => resolveBusinessType(value) },
    { title: "任务名称", dataIndex: "source" },
    { title: "使用量", dataIndex: "quantityText" },
    { title: "提交人", dataIndex: "operator" },
    { title: "时间", dataIndex: "occurredAt", render: (value) => formatInventoryDateTime(value) }
  ];

  const ledgerTabItems = [
    {
      key: "inbound",
      label: `入库 ${ledgerTabCounts.inbound}`,
      children: (
        <Table
          rowKey="id"
          className="inventory-console-table"
          columns={ledgerColumns}
          dataSource={filteredLedgers}
          pagination={false}
        />
      )
    },
    {
      key: "outbound",
      label: `出库 ${ledgerTabCounts.outbound}`,
      children: (
        <Table
          rowKey="id"
          className="inventory-console-table"
          columns={ledgerColumns}
          dataSource={filteredLedgers}
          pagination={false}
        />
      )
    }
  ];

  const categoryTabItems = categoryTabs.map((tab: InventoryCategoryTab) => ({
    key: tab.key,
    label: `${tab.label} ${tab.count}`,
    children: (
      <>
        <div className="inventory-table-toolbar">
          <Input.Search
            allowClear
            placeholder={`搜索${tab.label}名称或品牌`}
            value={activeCategory === tab.key ? summaryKeyword : ""}
            onChange={(event) => setSummaryKeyword(event.target.value)}
          />
          <Select
            value={materialStatusFilter}
            onChange={(value) => setMaterialStatusFilter(value)}
            options={materialStatusFilterOptions.map((value) => ({ label: value, value }))}
          />
        </div>
        <Table
          rowKey="materialId"
          className="inventory-console-table"
          columns={summaryColumns}
          dataSource={filteredSummaries}
          pagination={false}
        />
      </>
    )
  }));

  const renderMaterialEditModal = () => {
    const usageState = editingMaterial ? resolveMaterialUsageState(editingMaterial.id) : null;
    return (
      <Modal
        title="编辑物料"
        open={Boolean(editingMaterial)}
        okText="保存"
        cancelText="取消"
        onOk={submitEditMaterial}
        onCancel={closeEditMaterial}
      >
        <Form layout="vertical" form={editMaterialForm}>
          <section className="inventory-receive-section">
            <strong>基础信息</strong>
            <Form.Item label="物料编码" name="materialCode">
              <Input disabled />
            </Form.Item>
            <Form.Item label="物料名称" name="materialName" rules={[{ required: true, message: "请输入物料名称" }]}>
              <Input placeholder="请输入物料名称" />
            </Form.Item>
            <Form.Item label="品牌" name="brand" rules={[{ required: true, message: "请输入品牌" }]}>
              <Input placeholder="请输入品牌" />
            </Form.Item>
            <Form.Item label="物料分类" name="category" rules={[{ required: true, message: "请选择物料分类" }]}>
              <Select options={materialEditCategoryOptions.map((value) => ({ label: value, value }))} />
            </Form.Item>
            <Form.Item
              label={
                <span className="inventory-form-label-with-help">
                  核算单位
                  <Tooltip
                    trigger="click"
                    placement="topLeft"
                    title={
                      usageState?.canEditBaseUnit
                        ? "系统用于库存统计和任务扣减的基础单位。"
                        : "当前物料已有库存或历史记录，核算单位不可修改。如需更换单位，请新建物料并停用当前物料。"
                    }
                  >
                    <button type="button" className="inventory-field-help" aria-label="核算单位编辑说明">
                      <InfoCircleOutlined />
                    </button>
                  </Tooltip>
                </span>
              }
              name="baseUnit"
              rules={[{ required: true, message: "请选择核算单位" }]}
            >
              <Select
                disabled={!usageState?.canEditBaseUnit}
                options={inventoryUnitOptions.map((value) => ({ label: value, value }))}
              />
            </Form.Item>
            {!usageState?.canEditBaseUnit ? <Text type="secondary">已有库存记录，不可修改</Text> : null}
          </section>

          <section className="inventory-receive-section">
            <strong>预警与备注</strong>
            <Form.Item
              label={
                <span className="inventory-form-label-with-help">
                  安全库存
                  <Tooltip
                    trigger="click"
                    placement="topLeft"
                    title="填写后，当前库存低于该数值时，系统会向 Console 用户发送库存不足提醒；不填写则不启用该物料的低库存提醒。"
                  >
                    <button type="button" className="inventory-field-help" aria-label="编辑安全库存说明">
                      <InfoCircleOutlined />
                    </button>
                  </Tooltip>
                </span>
              }
              name="safetyStockBase"
            >
              <InputNumber min={0} placeholder="请输入最低库存数量，单位同核算单位" style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item label="备注" name="note" rules={[{ max: 200, message: "备注不能超过 200 字" }]}>
              <Input.TextArea rows={3} showCount maxLength={200} placeholder="请输入业务补充说明" />
            </Form.Item>
          </section>
        </Form>
      </Modal>
    );
  };

  if (inventoryView === "detail" && selectedSummary && selectedMaterial) {
    const baseInfoItems = [
      { label: "物料编码", value: resolveMaterialCode(selectedMaterial) },
      { label: "物料名称", value: selectedMaterial.materialName },
      { label: "品牌", value: selectedMaterial.brand },
      { label: "分类", value: selectedMaterial.category },
      { label: "核算单位", value: selectedMaterial.baseUnit },
      {
        label: "安全库存",
        value:
          selectedMaterial.safetyStockBase !== undefined
            ? formatInventoryQty(selectedMaterial.safetyStockBase, selectedMaterial.baseUnit)
            : "未启用"
      },
      { label: "状态", value: getInventoryMaterialStatus(selectedMaterial) },
      { label: "备注", value: selectedMaterial.note || "—" },
      ...buildMaterialExtensionItems(selectedMaterial).map((item) => ({ label: item.label, value: item.value || "—" }))
    ];
    const selectedMaterialStatus = getInventoryMaterialStatus(selectedMaterial);

    return (
      <div className="inventory-console-page inventory-detail-page">
        <div className="inventory-console-header">
          <div>
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              className="inventory-back-button"
              onClick={() => {
                setInventoryView("home");
                setSelectedMaterialId(null);
              }}
            >
              返回库存管理
            </Button>
            <div className="inventory-detail-title-row">
              <Title level={3}>物料详情</Title>
              <Tag color={selectedMaterialStatus === "已停用" ? "default" : "success"}>{selectedMaterialStatus}</Tag>
            </div>
            <Text type="secondary">物料状态 · 批次库存 · 库存变化追溯</Text>
          </div>
          <Space>
            <Button icon={<EditOutlined />} onClick={() => openEditMaterial(selectedMaterial.id)}>
              编辑物料
            </Button>
            {selectedMaterialStatus === "已停用" ? (
              <Button icon={<PlayCircleOutlined />} onClick={() => toggleMaterialStatus(selectedMaterial.id, "启用中")}>
                启用
              </Button>
            ) : (
              <Button danger icon={<StopOutlined />} onClick={() => toggleMaterialStatus(selectedMaterial.id, "已停用")}>
                停用
              </Button>
            )}
          </Space>
        </div>

        <Card className="inventory-console-card" title="物料基础信息">
          <Descriptions
            column={{ xs: 1, sm: 2, lg: 3 }}
            size="small"
            items={baseInfoItems.map((item) => ({
              key: item.label,
              label: item.label,
              children: item.value
            }))}
          />
        </Card>

        {renderMaterialEditModal()}

        <Card className="inventory-console-card" title="批次库存">
          <Table
            rowKey="id"
            className="inventory-console-table"
            columns={materialLotColumns}
            dataSource={selectedMaterialLots}
            pagination={false}
            scroll={{ x: 980 }}
          />
        </Card>

        <Card className="inventory-console-card" title="库存风险">
          {selectedRiskMessages.length ? (
            <div className="inventory-detail-risk-list">
              <Alert
                showIcon
                type={selectedRiskMessages.some((message) => message.includes("负库存") || message.includes("过期库存")) ? "error" : "warning"}
                message={`该物料存在 ${selectedRiskMessages.length} 项风险`}
              />
              <ol>
                {selectedRiskMessages.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ol>
            </div>
          ) : (
            <Alert showIcon type="success" message="暂无库存风险" />
          )}
        </Card>

        <Card className="inventory-console-card" title="库存流水">
          <Table
            rowKey="id"
            className="inventory-console-table"
            columns={materialLedgerColumns}
            dataSource={selectedMaterialLedgers}
            pagination={false}
            scroll={{ x: 1180 }}
            expandable={{
              rowExpandable: (record) => record.type === "业务消耗",
              expandedRowRender: (record) => {
                const lot = selectedMaterialLots.find((item) => item.lotNo === record.lotNo);
                const quantity = parseLedgerQuantity(record.quantityText);
                const cost = quantity * (lot?.baseUnitCost || 0);
                return (
                  <div className="inventory-ledger-deduction">
                    <span>{record.lotNo || "物料级负库存"} 批次 {record.quantityText}</span>
                    <span>本次消耗成本：{formatCurrency(cost)}</span>
                  </div>
                );
              }
            }}
          />
        </Card>

        <Card className="inventory-console-card" title="关联业务与消耗分析">
          <div className="inventory-analysis-grid">
            <span>
              近7天消耗
              <strong>{formatInventoryQty(selectedConsumptionQty7Days, selectedSummary.baseUnit)}</strong>
            </span>
            <span>
              近30天消耗
              <strong>{formatInventoryQty(selectedConsumptionQty, selectedSummary.baseUnit)}</strong>
            </span>
            <span>
              本月消耗金额
              <strong>{formatCurrency(selectedConsumptionCost)}</strong>
            </span>
            <span>
              消耗任务数
              <strong>{selectedMaterialConsumptionLedgers.length} 次</strong>
            </span>
          </div>
          <div className="inventory-source-breakdown">
            <Text type="secondary">主要消耗来源</Text>
            <div>
              {selectedConsumptionSources.length ? (
                selectedConsumptionSources.map(([sourceType, item]) => (
                  <Tag key={sourceType}>
                    {sourceType} {item.count} 次，消耗 {formatInventoryQty(item.quantity, selectedSummary.baseUnit)}
                  </Tag>
                ))
              ) : (
                <Tag>暂无消耗记录</Tag>
              )}
            </div>
          </div>
          <Table
            rowKey="id"
            className="inventory-console-table inventory-analysis-table"
            columns={usageRecordColumns}
            dataSource={selectedMaterialConsumptionLedgers}
            pagination={false}
          />
        </Card>
      </div>
    );
  }

  if (inventoryView === "ledgers") {
    return (
      <div className="inventory-console-page">
        <div className="inventory-console-header">
          <div>
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              className="inventory-back-button"
              onClick={() => setInventoryView("home")}
            >
              返回库存管理
            </Button>
            <Title level={3}>出/入库记录</Title>
            <Text type="secondary">按入库、出库分类查询历史库存变化</Text>
          </div>
        </div>

        <Card className="inventory-console-card">
          <div className="inventory-ledger-filterbar">
            <DatePicker.RangePicker
              placeholder={["开始日期", "结束日期"]}
              onChange={(_, dateStrings) =>
                setLedgerDateRange(dateStrings[0] && dateStrings[1] ? [dateStrings[0], dateStrings[1]] : null)
              }
            />
            <Input.Search
              allowClear
              placeholder="搜索物料名称、品牌或批次"
              value={ledgerKeyword}
              onChange={(event) => setLedgerKeyword(event.target.value)}
            />
            {activeLedgerDirection === "outbound" ? (
              <Select
                mode="multiple"
                allowClear
                placeholder="出库方式"
                value={outboundTypes}
                onChange={(value) => setOutboundTypes(value)}
                options={["业务消耗", "盘亏", "过期报废"].map((value) => ({ label: value, value }))}
              />
            ) : null}
          </div>
          <Tabs
            activeKey={activeLedgerDirection}
            onChange={(key) => setActiveLedgerDirection(key as InventoryLedgerDirection)}
            items={ledgerTabItems}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="inventory-console-page">
      <div className="inventory-console-header">
        <div>
          <Title level={3}>库存管理</Title>
          <Text type="secondary">行动中心 · 库存健康 · 风险定位</Text>
        </div>
        <Space>
          <Button icon={<ProfileOutlined />} onClick={() => setInventoryView("ledgers")}>
            出/入库记录
          </Button>
          <Button type="primary" icon={<InboxOutlined />} onClick={() => setReceiveOpen(true)}>
            采购入库
          </Button>
        </Space>
      </div>

      <div className="inventory-dashboard-grid">
        <Card className="inventory-console-card inventory-action-center-card">
          <div className="inventory-section-head">
            <div>
              <strong>待处理事项</strong>
              <Text type="secondary">今天优先处理的问题</Text>
            </div>
          </div>
          <div className="inventory-action-grid">
            {homeActionItems.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`inventory-action-tile${activeHomeRiskType === item.key ? " is-active" : ""}`}
                onClick={() => setActiveHomeRiskType(item.key)}
              >
                <span>{item.label}</span>
                <strong>{item.count}</strong>
              </button>
            ))}
          </div>
        </Card>

        <Card className="inventory-console-card inventory-overview-card">
          <div className="inventory-section-head">
            <div>
              <strong>库存核心指标</strong>
              <Text type="secondary">当前库存整体健康状况</Text>
            </div>
          </div>
          <div className="inventory-overview-metrics">
            <span>
              库存物料数
              <strong>{materials.length} 种</strong>
            </span>
            <span>
              库存总价值
              <strong>{formatCurrency(inventoryTotalValue)}</strong>
            </span>
            <span>
              本月消耗金额
              <strong>{formatCurrency(currentMonthConsumptionCost)}</strong>
            </span>
          </div>
        </Card>

        <Card className="inventory-console-card inventory-risk-material-card">
          <div className="inventory-section-head">
            <div>
              <strong>风险物料TOP</strong>
              <Text type="secondary">
                {activeHomeRiskType === "全部" ? "按负库存、过期、临期、低库存排序" : `${activeHomeRiskType}列表`}
              </Text>
            </div>
            {activeHomeRiskType !== "全部" ? (
              <Button type="link" onClick={() => setActiveHomeRiskType("全部")}>
                查看全部风险
              </Button>
            ) : null}
          </div>
          <div className="inventory-risk-list">
            {filteredHomeRiskRows.length ? (
              filteredHomeRiskRows.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`inventory-risk-row inventory-risk-row--${item.type}`}
                onClick={() => openMaterialDetail(item.materialId)}
              >
                <span className="inventory-risk-row__type">{item.type}</span>
                <span className="inventory-risk-row__main">
                  <strong>{item.materialName}</strong>
                  <Text type="secondary">{item.brand} · {item.detailText}</Text>
                </span>
                <span className="inventory-risk-row__value">{item.valueText}</span>
                <span className="inventory-risk-row__action">{item.actionText}</span>
              </button>
              ))
            ) : (
              <div className="inventory-empty-panel">暂无待处理物料</div>
            )}
          </div>
        </Card>
      </div>

      <Card className="inventory-console-card">
        <Tabs
          className="inventory-category-tabs"
          activeKey={activeCategory}
          onChange={(key) => openCategory(key as InventoryCategory)}
          items={categoryTabItems}
        />
      </Card>

      {renderMaterialEditModal()}

      <Modal
        title="采购入库"
        open={receiveOpen}
        okText="提交入库"
        cancelText="取消"
        onOk={submitReceive}
        onCancel={() => {
          resetReceiveFormState();
          setReceiveOpen(false);
        }}
      >
        <Form layout="vertical" form={receiveForm}>
          <section className="inventory-receive-section">
            <strong>入库物料信息</strong>
            <Form.Item label="入库物料" name="materialName" rules={[{ required: true, message: "请搜索或输入入库物料" }]}>
              <AutoComplete
                options={receiveMaterialOptions}
                placeholder="搜索已有物料；未找到时直接输入新物料名称"
                filterOption={(inputValue, option) =>
                  String(option?.label || "").includes(inputValue) || String(option?.value || "").includes(inputValue)
                }
                onSelect={(_, option) => {
                  const material = activeReceiveMaterials.find((item) => item.id === option.materialId);
                  setReceiveMaterialText(String(option.value));
                  if (material) applyExistingReceiveMaterial(material);
                }}
                onChange={(value) => {
                  setReceiveMaterialText(value);
                  const matched = activeReceiveMaterials.find((item) => item.materialName === value.trim());
                  if (matched) {
                    applyExistingReceiveMaterial(matched);
                  } else {
                    setReceiveMaterialId(undefined);
                    receiveForm.setFieldsValue({
                      brand: undefined,
                      category: undefined,
                      baseUnit: undefined,
                      packageConversions: undefined,
                      inboundUnit: undefined,
                      inboundQuantity: undefined
                    });
                  }
                }}
              />
            </Form.Item>
            {receiveMaterialInfoVisible ? (
              <>
                <Form.Item label="品牌" name="brand" rules={[{ required: true, message: "请填写品牌" }]}>
                  <Input disabled={Boolean(selectedReceiveMaterial)} placeholder="请输入品牌，如 A品牌、百利" />
                </Form.Item>
                <Form.Item label="物料分类" name="category" rules={[{ required: true, message: "请选择物料分类" }]}>
                  <Select
                    disabled={Boolean(selectedReceiveMaterial)}
                    placeholder="请选择物料分类"
                    options={receiveMaterialCategoryOptions.map((value) => ({ label: value, value }))}
                    onChange={(value) => applyReceiveCategoryRecommendation(value)}
                  />
                </Form.Item>
                <Form.Item
                  label={
                    <span className="inventory-form-label-with-help">
                      核算单位
                      <Tooltip
                        trigger="click"
                        placement="topLeft"
                        title="系统用于库存统计和任务扣减的基础单位，如 ml、g、kg、头份、个。物料产生库存记录后不可修改。"
                      >
                        <button type="button" className="inventory-field-help" aria-label="核算单位说明">
                          <InfoCircleOutlined />
                        </button>
                      </Tooltip>
                    </span>
                  }
                  name="baseUnit"
                  rules={[{ required: true, message: "请选择核算单位" }]}
                >
                  <Select
                    disabled={Boolean(selectedReceiveMaterial)}
                    placeholder="请选择库存核算单位"
                    options={inventoryUnitOptions.map((value) => ({ label: value, value }))}
                    onChange={(value) => applyReceiveBaseUnit(value)}
                  />
                </Form.Item>
              </>
            ) : null}
          </section>

          {receiveMaterialInfoVisible ? (
            <section className="inventory-receive-section">
              <div className="inventory-receive-section-head">
                <strong>包装与数量</strong>
                <Text type="secondary">用于将包装数量换算为库存数量，系统会按核算单位记录库存。</Text>
              </div>
              <Form.List name="packageConversions">
                {(fields, { add, remove }) => (
                  <div className="inventory-package-spec">
                    <span className="inventory-package-spec__title">包装规格</span>
                    {fields.map((field, index) => {
                      const toUnit = index === 0 ? effectiveReceiveBaseUnit : receivePackageDrafts[index - 1]?.fromUnit || "下一级单位";
                      const { key, ...fieldProps } = field;
                      return (
                        <div className="inventory-package-row" key={key}>
                          <span>1</span>
                          <Form.Item
                            {...fieldProps}
                            name={[field.name, "fromUnit"]}
                          >
                            <Select
                              placeholder="包装单位"
                              options={inventoryUnitOptions.map((value) => ({ label: value, value }))}
                            />
                          </Form.Item>
                          <span>=</span>
                          <Form.Item
                            {...fieldProps}
                            name={[field.name, "quantity"]}
                          >
                            <InputNumber min={0.01} placeholder="数量" style={{ width: "100%" }} />
                          </Form.Item>
                          <span className="inventory-package-row__unit">{toUnit}</span>
                          {fields.length > 1 ? (
                            <Button type="text" onClick={() => remove(field.name)}>
                              删除
                            </Button>
                          ) : null}
                        </div>
                      );
                    })}
                    {receiveSystemConversionText ? <Text type="secondary">{receiveSystemConversionText}</Text> : null}
                    {receivePackageValidationMessage && receivePackageDrafts.length ? (
                      <Text type="secondary">{receivePackageValidationMessage}</Text>
                    ) : null}
                    <Button
                      type="link"
                      onClick={() => add({ fromUnit: undefined, quantity: undefined })}
                      disabled={!effectiveReceiveBaseUnit}
                    >
                      + 添加上级包装
                    </Button>
                  </div>
                )}
              </Form.List>

              <div className="inventory-receive-quantity-row">
                <Form.Item label="入库数量" name="inboundQuantity" rules={[{ required: true, message: "请输入入库数量" }]}>
                  <InputNumber min={0.01} placeholder="请输入入库数量" style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item label="单位" name="inboundUnit" rules={[{ required: true, message: "请选择入库单位" }]}>
                  <Select placeholder="请选择单位" options={receiveInboundUnitOptions} />
                </Form.Item>
              </div>

              <div className="inventory-receive-total">
                {receiveInboundBaseQuantity && !receivePackageValidationMessage ? (
                  <>
                    <strong>
                      本次入库总量：{formatInventoryNumber(receiveInboundBaseQuantity)} {effectiveReceiveBaseUnit}
                    </strong>
                    <Text type="secondary">
                      系统将按 {formatInventoryNumber(receiveInboundBaseQuantity)} {effectiveReceiveBaseUnit}
                      {" "}计入库存，后续任务消耗也将按 {effectiveReceiveBaseUnit} 扣减。
                    </Text>
                  </>
                ) : (
                  <Text type="secondary">请先完善包装规格，系统将自动计算入库总量。</Text>
                )}
              </div>
            </section>
          ) : null}

          {receiveMaterialInfoVisible ? (
            <section className="inventory-receive-section">
              <strong>预警与备注</strong>
              <Form.Item
                label={
                  <span className="inventory-form-label-with-help">
                    安全库存
                    <Tooltip
                      trigger="click"
                      placement="topLeft"
                      title="填写后，当前库存低于该数值时，系统会向 Console 用户发送库存不足提醒；不填写则不启用该物料的低库存提醒。"
                    >
                      <button type="button" className="inventory-field-help" aria-label="安全库存说明">
                        <InfoCircleOutlined />
                      </button>
                    </Tooltip>
                  </span>
                }
                name="safetyStockBase"
              >
                <InputNumber min={0} placeholder="请输入最低库存数量，单位同核算单位" style={{ width: "100%" }} />
              </Form.Item>
              <Form.Item label="备注" name="note">
                <Input placeholder="请输入业务补充说明" />
              </Form.Item>
            </section>
          ) : null}

          <section className="inventory-receive-section">
            <strong>批次与采购信息</strong>
            <Form.Item label="到期日期" name="expiryDate" rules={[{ required: true, message: "请填写到期日期" }]}>
              <Input placeholder="2026-12-31" />
            </Form.Item>
            <Form.Item label="进货价" name="unitPrice" rules={[{ required: true, message: "请填写进货价" }]}>
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item label="供应商" name="supplier" rules={[{ required: true, message: "请填写供应商" }]}>
              <Input placeholder="请输入供应商名称" />
            </Form.Item>
            <Form.Item label="供应商电话" name="supplierPhone" rules={[{ required: true, message: "请填写供应商电话" }]}>
              <Input placeholder="请输入供应商电话" />
            </Form.Item>
          </section>
        </Form>
      </Modal>

      <Modal
        title="过期库存处理"
        open={Boolean(expiredActionLot)}
        footer={null}
        onCancel={() => setExpiredActionLot(null)}
      >
        {expiredActionLot ? (
          <div className="inventory-expired-modal">
            <p>
              {getInventoryMaterialLabel(materials, expiredActionLot.materialId)} · 批次 {expiredActionLot.lotNo}
            </p>
            <Text type="secondary">请选择处理方式，系统会记录处理原因并更新批次状态。</Text>
            <Space direction="vertical" style={{ width: "100%", marginTop: 16 }}>
              <Button danger block icon={<DeleteOutlined />} onClick={() => resolveExpiredAction("全部报废")}>
                全部报废
              </Button>
              <Button block icon={<CheckCircleOutlined />} onClick={() => resolveExpiredAction("继续使用")}>
                继续使用
              </Button>
              <Button block onClick={() => resolveExpiredAction("部分处理")}>
                部分处理
              </Button>
            </Space>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
