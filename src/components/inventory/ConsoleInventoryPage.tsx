import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import {
  Alert,
  AutoComplete,
  Button,
  Card,
  DatePicker,
  Badge,
  Descriptions,
  Drawer,
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
  ArrowDownOutlined,
  ArrowUpOutlined,
  CheckCircleOutlined,
  DownOutlined,
  EditOutlined,
  ExportOutlined,
  EyeOutlined,
  FileAddOutlined,
  HistoryOutlined,
  InfoCircleOutlined,
  InboxOutlined,
  PlayCircleOutlined,
  StopOutlined,
  UpOutlined
} from "@ant-design/icons";
import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import {
  buildInventoryCategoryTabs,
  buildInventoryLedgerQuantityDisplay,
  buildInventoryMaterialUsageState,
  buildInventoryOutboundTransaction,
  buildInventoryReceiveEntryFromSearch,
  buildInventoryRiskItems,
  buildInventoryScrapTransaction,
  buildInventorySummaries,
  buildInventoryStocktakeScope,
  buildBatchInlineNewMaterialDraft,
  buildFeedEstimatedAvailableDays,
  buildInventoryStocktakeTransaction,
  buildInventoryDifferenceResolution,
  resolveInventoryToleranceDifferences,
  inventoryDifferenceMethodMetas,
  inventorySeedInboundOrders,
  inventorySeedCheckRecords,
  inventorySeedDifferences,
  calculateInventoryBaseQuantity,
  filterInventorySummariesByMaterialStatus,
  filterInventoryLedgers,
  formatInventoryQty,
  formatInventoryQtyWithPackage,
  formatNearestExpiryDate,
  generateInventoryLotNo,
  getInventoryLotsForMaterial,
  getInventoryMaterialLabel,
  getInventoryMaterialStatus,
  hasInventoryMaterialBusinessRecords,
  formatInventoryMaterialFieldValue,
  formatMaterialCategoryLabel,
  getMaterialProfileFieldSpecs,
  isMaterialProfileIncomplete,
  inventoryCategoryOrder,
  inventoryMedicineClassOptions,
  inventorySeedLedgers,
  inventorySeedLots,
  inventorySeedMaterials,
  inventoryUnitOptions,
  INVENTORY_DEMO_REFERENCE_AT,
  parseInventoryLedgerQuantity,
  resolveInventoryLastPurchaseInfo,
  type FeedEstimatedAvailableDaysResult,
  type InventoryCheckDetail,
  type InventoryCheckRecord,
  type InventoryInboundMaterial,
  type InventoryInboundOrder,
  type InventoryInboundOrderType,
  toggleInventoryMaterialStatus,
  updateInventoryMaterial,
  validateInventoryMaterialEdit,
  resolveMedicineClass,
  type InventoryCategory,
  type InventoryCategoryTab,
  type InventoryLedgerRow,
  type InventoryLedgerType,
  type InventoryLot,
  type InventoryMaterial,
  type InventoryMaterialStatus,
  type InventoryMaterialStatusFilter,
  type InventoryPackageConversion,
  type InventoryRiskType,
  type InventoryStocktakeMode,
  type InventoryStocktakeScopeRow,
  type InventoryStocktakeTaskStatus,
  type InventoryStocktakeTransaction,
  type InventorySummary,
  type InventoryDifferenceRecord,
  type InventoryDifferenceMethod
} from "./inventoryData";
import { MaterialProfileFields } from "./MaterialProfileFields";
import {
  BatchReceivePanel,
  buildBatchReceiveEntryEffectiveDraft,
  createDefaultBatchReceiveHeader,
  isBatchReceiveEntryReady,
  isBatchReceiveEntrySubmitting,
  resolveBatchReceiveEntryMaterial,
  type InventoryBatchReceiveHeader,
  type InventoryBatchReceiveEntry
} from "./BatchReceivePanel";
import { Sparkline } from "./Sparkline";

const { Text, Title } = Typography;
const STOCKTAKE_RISK_DAYS = 30;
const inventoryUsageTrendColors = {
  stable: "#52C41A",
  rising: "#1677FF",
  spike: "#FA8C16",
  idle: "#BFBFBF",
  falling: "#52C41A"
} as const;
const inventoryStockTrendColors = {
  stable: "#52C41A",
  rising: "#1677FF",
  spike: "#FA8C16",
  idle: "#BFBFBF",
  falling: "#FA8C16"
} as const;

type InventoryUsageTrendKind = keyof typeof inventoryUsageTrendColors;
type InventoryStockTrendKind = keyof typeof inventoryStockTrendColors;

type InventoryHomeRiskKind = "负库存" | "已过期" | "临期";
type InventoryListStockStatus = "正常" | "临期" | "负库存";
type InventoryAnalyticsCategoryFilter = "全部" | InventoryCategory;
type InventoryAnalyticsTimeRange = "近7天" | "近30天" | "本月" | "上月" | "自定义";
type InventoryDifferenceTab = "pending" | "processed";

type InventoryValueShareRow = {
  category: InventoryCategory;
  amount: number;
  share: number;
  color: string;
};

type InventoryTrendPoint = {
  date: string;
  label: string;
  amount: number;
};

type FeedStockTrendPoint = {
  date: string;
  quantity: number;
  inboundQuantity: number;
  outboundQuantity: number;
  adjustmentQuantity: number;
  changeQuantity: number;
  anomaly?: "drop" | "increase";
};

type MaterialTrendRange = "7天" | "30天" | "90天";

type MaterialStockTrendPoint = {
  date: string;
  quantity: number;
  inboundQuantity: number;
  outboundQuantity: number;
  adjustmentQuantity: number;
  scrapQuantity: number;
  hasInbound: boolean;
  hasOutbound: boolean;
  hasAdjustment: boolean;
  hasScrap: boolean;
};

type MaterialStockStatusTone = "success" | "warning" | "danger";

type InventoryTopSpendRow = {
  id: string;
  materialName: string;
  category: InventoryCategory;
  amount: number;
  share: number;
  color: string;
  isCategorySummary?: boolean;
};

const inventoryAnalyticsTimeRangeOptions: InventoryAnalyticsTimeRange[] = ["近7天", "近30天", "本月", "上月", "自定义"];
const inventoryAmountChartCategories: InventoryCategory[] = inventoryCategoryOrder;
const inventoryAnalyticsCategoryFilterOptions: InventoryAnalyticsCategoryFilter[] = ["全部", ...inventoryAmountChartCategories];
const inventoryCategoryChartColors: Record<InventoryCategory, string> = {
  饲料: "#4F8CFF",
  药品: "#7B6DFF",
  消耗品: "#FF9B62",
  工具: "#8898B3",
  其他: "#C3CBD8"
};

const inventoryDifferenceHandlingOptions: InventoryDifferenceHandlingOption[] = [
  {
    key: "restore-consumption",
    uiLabel: "回补原消耗",
    method: "任务出库多扣",
    direction: "盘盈",
    appliesToText: "之前领用或出库数量记多了，需要冲回。",
    inventoryText: "优先回补最近扣减的批次，不足时继续回补更早批次。",
    accountingText: "冲减之前记录的消耗成本。",
    reasons: ["实际用量少于登记用量", "手工出库多扣", "重复扣减", "其他"],
    requiredSupplements: []
  },
  {
    key: "correct-inbound-quantity",
    uiLabel: "更正入库数量（金额不变）",
    method: "入库数量更正",
    direction: "盘盈",
    appliesToText: "实际入库数量更多，只需修正库存数量。",
    inventoryText: "补回对应批次库存；无法确定时补到最早可用批次。",
    accountingText: "只调整库存数量，不影响采购金额。",
    reasons: ["入库数量少录", "包装换算录小", "其他"],
    requiredSupplements: []
  },
  {
    key: "supplement-inbound-cost",
    uiLabel: "补录入库数量和金额",
    method: "入库少录补金额",
    direction: "盘盈",
    appliesToText: "有一批货未登记，需要补录入库。",
    inventoryText: "补到系统自动选中的既有批次，不让用户手选批次。",
    accountingText: "补记本次采购金额，形成完整入库记录。",
    reasons: ["到货未入库", "其他"],
    requiredSupplements: ["amount"]
  },
  {
    key: "record-business-consumption",
    uiLabel: "补记业务消耗 / 出库",
    method: "漏记任务出库",
    direction: "盘亏",
    appliesToText: "实物已经领用、使用或发出，只是之前没有登记。",
    inventoryText: "按库存先进先出的顺序扣减对应批次库存。",
    accountingText: "按实际领用记录成本，补齐本次业务消耗。",
    reasons: ["任务用料未提交", "手工领用未登记", "紧急领用后补录", "治疗 / 免疫 / 饲喂漏记", "其他"],
    requiredSupplements: []
  },
  {
    key: "correct-over-inbound",
    uiLabel: "更正入库多录",
    method: "入库多录",
    direction: "盘亏",
    appliesToText: "之前入库数量录多了，需要改回实际数量。",
    inventoryText: "按库存先进先出的顺序扣减对应批次库存。",
    accountingText: "修正库存数量，不补记历史领用记录。",
    reasons: ["入库数量多录", "包装换算录大", "重复入库", "批次合并录重", "其他"],
    requiredSupplements: []
  },
  {
    key: "scrap-loss",
    uiLabel: "报废 / 损耗处理",
    method: "破损污染过期报废",
    direction: "盘亏",
    appliesToText: "实物已经损坏、过期或无法继续使用。",
    inventoryText: "按库存先进先出的顺序扣减对应批次库存。",
    accountingText: "按损耗记录本次成本，作为报废或损耗处理。",
    reasons: ["破损", "污染", "过期", "变质", "保存异常", "其他"],
    requiredSupplements: []
  }
];

const initialToleranceResolution = resolveInventoryToleranceDifferences({
  differences: inventorySeedDifferences,
  materials: inventorySeedMaterials,
  lots: inventorySeedLots,
  ledgers: inventorySeedLedgers,
  operator: "系统",
  occurredAt: "2026-06-26 10:46",
  ledgerIdPrefix: "ledger-auto-tolerance-seed"
});

type InventoryMaterialEditFormValues = {
  materialCode: string;
  materialName: string;
  brand: string;
  category: InventoryCategory;
  baseUnit: string;
  note?: string;
};

type InventoryOutboundFormValues = {
  materialId: string;
  outboundQuantity: number;
  unit: string;
  purpose: string;
  remark?: string;
};

type InventoryOutboundScopeRow = {
  id: string;
  materialId: string;
  materialName: string;
  brand: string;
  category: InventoryCategory;
  baseUnit: string;
  currentStockBase: number;
  nearestExpiryDate: string;
  stockRisk: InventorySummary["stockRisk"];
  materialStatus: InventoryMaterialStatus;
};

type InventoryOutboundOrderLine = InventoryOutboundScopeRow & {
  outboundQuantity: number;
  afterStockBase: number;
  ledgerCount: number;
};

type InventoryOutboundOrderRecord = {
  no: string;
  createdAt: string;
  purpose: string;
  remark?: string;
  operator: string;
  lines: InventoryOutboundOrderLine[];
  ledgers: InventoryLedgerRow[];
};

type InventoryScrapFormValues = {
  scrapQuantity: number;
  reason: string;
  handlingMethod: string;
  photoNote?: string;
};

type InventoryLotEditFormValues = {
  expiryDate?: string;
  supplierBatchNo?: string;
  note?: string;
};

type InventoryHomeRiskRow = {
  id: string;
  type: InventoryHomeRiskKind;
  materialId: string;
  materialName: string;
  brand: string;
  lotNo?: string;
  valueText: string;
  dateText?: string;
  detailText: string;
  adviceText: string;
  actionText?: string;
  auxiliaryActionText?: string;
  priority: number;
};

type InventoryDifferenceSupplementRequirement = "amount" | "note";

type InventoryDifferenceHandlingOption = {
  key: string;
  uiLabel: string;
  method: InventoryDifferenceMethod;
  direction: InventoryDifferenceRecord["direction"];
  appliesToText: string;
  inventoryText: string;
  accountingText: string;
  reasons: string[];
  requiredSupplements: InventoryDifferenceSupplementRequirement[];
};

type InventoryStocktakeRecord = {
  no: string;
  name: string;
  mode: InventoryStocktakeMode;
  materialCount: number;
  differenceCount: number;
  status: InventoryStocktakeTaskStatus;
  reason: string;
  assignee: string;
  createdAt: string;
  completedAt?: string;
  scopeRows: InventoryStocktakeScopeRow[];
  actualQuantities: Record<string, number>;
  transaction?: InventoryStocktakeTransaction;
};

type InventoryPurchaseOrderLine = {
  materialId: string;
  materialName: string;
  brand: string;
  category: InventoryCategory;
  baseUnit: string;
  currentStockText: string;
  estimatedAvailableDays?: FeedEstimatedAvailableDaysResult;
  lastPurchaseAt?: string;
  lastPurchaseQtyText: string;
  lastPurchaseLotNo?: string;
  lastPurchaseSupplier?: string;
  lastPurchaseSource: "ledger" | "lot" | "none";
  quantityBase?: number;
};

type InventoryPurchaseOrderRecord = {
  no: string;
  createdAt: string;
  lines: Array<InventoryPurchaseOrderLine & { quantityBase: number }>;
};

export type ConsoleInventoryModule = "inventory" | "finance";
export type ConsoleFinanceBootstrapView = "finance" | "difference-list";

type ConsoleInventoryPageProps = {
  activeModule?: ConsoleInventoryModule;
  financeBootstrapView?: ConsoleFinanceBootstrapView | null;
  onFinanceBootstrapHandled?: () => void;
  onRequestFinance?: (view?: ConsoleFinanceBootstrapView) => void;
};

type InventoryStocktakeTaskFormValues = {
  name: string;
  reason: string;
  assignee: string;
  deadline?: string;
  showBookStock: boolean;
  remark?: string;
};

type StocktakeRiskStatus = "负库存" | "临期" | "已过期";

type MaterialDetailTabKey = "detail" | "ledger";
type InventoryLedgerPageTabKey = "ledger" | "checks" | "inbound";
type InventoryCheckDiffFilter = "全部" | "有差异" | "无差异";
type InventoryInboundTypeFilter = "全部" | InventoryInboundOrderType;
type StocktakeRiskLine = {
  status: StocktakeRiskStatus;
  tone: "negative" | "expired" | "expiring";
  quantityBase: number;
  text: string;
};

const materialStatusFilterOptions: InventoryMaterialStatusFilter[] = ["全部", "启用中", "已停用"];
const materialEditCategoryOptions: InventoryCategory[] = inventoryCategoryOrder;
const stocktakeReasonOptions = ["异常复核", "月度盘点", "临时抽查", "交接盘点", "库存修正", "其他"];
const inventoryScrapReasonOptions = ["过期/变质", "受潮/发霉", "外包装破损/漏包", "日常损耗/误差修正"];
const inventoryScrapHandlingMethodOptions = ["无害化处理", "退回供应商", "集中销毁", "交由第三方处理", "其他"];
const inventoryCheckDiffFilterOptions: InventoryCheckDiffFilter[] = ["全部", "有差异", "无差异"];
const inventoryInboundTypeOptions: InventoryInboundOrderType[] = ["采购入库", "盘盈入库"];
const inventoryInboundDefaultDateRange: [string, string] = [
  dayjs("2026-07-10").subtract(29, "day").format("YYYY-MM-DD"),
  dayjs("2026-07-10").format("YYYY-MM-DD")
];
const purchaseOrderExcelMimeType = "application/vnd.ms-excel;charset=utf-8";
const estimatedAvailableDaysCategories: InventoryCategory[] = ["饲料"];

function shouldShowEstimatedAvailableDays(category: InventoryCategory) {
  return estimatedAvailableDaysCategories.includes(category);
}

function statusColor(status: string) {
  if (status.includes("负库存") || status.includes("过期")) return "error";
  if (status.includes("临期")) return "warning";
  return "success";
}

function resolveListStockStatus(summary: InventorySummary, lots: InventoryLot[]): InventoryListStockStatus {
  if (summary.currentStockBase < 0) return "负库存";
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

function escapeSpreadsheetXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function resolvePurchaseOrderLastInboundText(row: InventoryPurchaseOrderLine) {
  if (row.lastPurchaseSource === "none") return "暂无入库记录";
  return [
    row.lastPurchaseAt ? formatInventoryDateTime(row.lastPurchaseAt) : "无入库时间",
    `上次入库 ${row.lastPurchaseQtyText}`,
    row.lastPurchaseSupplier,
    row.lastPurchaseLotNo
  ]
    .filter(Boolean)
    .join("｜");
}

function buildPurchaseOrderExcelXml(order: InventoryPurchaseOrderRecord) {
  const headers = [
    "序号",
    "物料",
    "品牌",
    "分类",
    "当前库存余量",
    "预计可用天数",
    "上次入库参考",
    "本次采购数量"
  ];
  const documentRows = [
    ["采购单号", order.no],
    ["生成时间", order.createdAt],
    ["物料种数", `${order.lines.length}种`],
    []
  ];
  const materialRows = order.lines.map((line, index) => [
    String(index + 1),
    line.materialName,
    line.brand || "—",
    line.category,
    line.currentStockText,
    line.estimatedAvailableDays?.displayText || "—",
    resolvePurchaseOrderLastInboundText(line),
    formatInventoryQty(line.quantityBase, line.baseUnit)
  ]);
  const buildRow = (cells: string[]) =>
    `<Row>${cells.map((cell) => `<Cell><Data ss:Type="String">${escapeSpreadsheetXml(cell)}</Data></Cell>`).join("")}</Row>`;

  return [
    "<?xml version=\"1.0\"?>",
    "<?mso-application progid=\"Excel.Sheet\"?>",
    "<Workbook xmlns=\"urn:schemas-microsoft-com:office:spreadsheet\"",
    " xmlns:o=\"urn:schemas-microsoft-com:office:office\"",
    " xmlns:x=\"urn:schemas-microsoft-com:office:excel\"",
    " xmlns:ss=\"urn:schemas-microsoft-com:office:spreadsheet\">",
    "<Worksheet ss:Name=\"采购单\">",
    "<Table>",
    ...documentRows.map(buildRow),
    buildRow(headers),
    ...materialRows.map(buildRow),
    "</Table>",
    "</Worksheet>",
    "</Workbook>"
  ].join("");
}

function downloadPurchaseOrderExcel(order: InventoryPurchaseOrderRecord) {
  const blob = new Blob([buildPurchaseOrderExcelXml(order)], { type: purchaseOrderExcelMimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${order.no}-采购单.xls`;
  link.click();
  URL.revokeObjectURL(url);
}

function formatInventoryShortDate(value?: string) {
  return value ? formatMonthDay(value.slice(0, 10)) : "—";
}

function resolveBusinessType(source: string) {
  if (source.includes("治疗")) return "治疗任务";
  if (source.includes("免疫")) return "免疫任务";
  if (source.includes("消毒")) return "消毒任务";
  if (source.includes("饲喂")) return "饲喂任务";
  if (source.includes("出库") || source.includes("领用")) return "手工出库";
  if (source.includes("盘点")) return "库存盘点";
  if (source.includes("入库")) return "采购入库";
  return "其他业务";
}

function resolveMaterialCode(material: InventoryMaterial) {
  return material.materialCode || `MAT-${material.id.slice(-6).toUpperCase()}`;
}

function buildMaterialExtensionItems(material: InventoryMaterial) {
  const specs = getMaterialProfileFieldSpecs(material);
  const items = specs.map((spec) => ({
    label: spec.label,
    value: formatInventoryMaterialFieldValue(material, spec)
  }));
  if (material.category === "药品") {
    const medicineClass = resolveMedicineClass(material);
    if (medicineClass) {
      items.unshift({
        label: "药品分类",
        value: medicineClass
      });
    }
  }
  return items;
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

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatFeedTrendQty(value: number) {
  const absValue = Math.abs(value);
  if (absValue >= 1000) {
    const tons = value / 1000;
    return `${Number.isInteger(tons) ? tons : tons.toFixed(1)}t`;
  }
  return `${Number.isInteger(value) ? value : value.toFixed(1)}kg`;
}

function formatSignedFeedTrendQty(value: number) {
  if (value === 0) return formatFeedTrendQty(0);
  return `${value > 0 ? "+" : "-"}${formatFeedTrendQty(Math.abs(value))}`;
}

function formatSignedInventoryQty(value: number, unit: string) {
  if (value === 0) return formatInventoryQty(0, unit);
  return `${value > 0 ? "+" : "-"}${formatInventoryQty(Math.abs(value), unit)}`;
}

function includesInventorySearchKeyword(source: string, keyword: string) {
  const normalizedKeyword = keyword.trim().toLowerCase();
  if (!normalizedKeyword) return true;
  return source.toLowerCase().includes(normalizedKeyword);
}

function isInventoryCheckDetailKeywordMatch(detail: InventoryCheckDetail, keyword: string) {
  if (!keyword.trim()) return false;
  return includesInventorySearchKeyword(detail.materialName, keyword);
}

function InventoryDifferenceTag({ diffItems }: { diffItems: number }) {
  return diffItems > 0 ? (
    <Tag color="orange" className="inventory-check-diff-tag">
      {diffItems} 项差异
    </Tag>
  ) : (
    <Tag color="success" className="inventory-check-diff-tag">
      无差异
    </Tag>
  );
}

function InventoryCheckDifferenceValue({ difference, unit }: { difference: number; unit: string }) {
  const tone = difference > 0 ? "gain" : difference < 0 ? "loss" : "none";
  return (
    <span className={`inventory-check-difference inventory-check-difference--${tone}`}>
      {formatSignedInventoryQty(difference, unit)}
      {difference > 0 ? <ArrowUpOutlined /> : null}
      {difference < 0 ? <ArrowDownOutlined /> : null}
    </span>
  );
}

function InventoryCheckHeader({
  record,
  expanded,
  onToggle
}: {
  record: InventoryCheckRecord;
  expanded: boolean;
  onToggle: (record: InventoryCheckRecord, event?: ReactMouseEvent<HTMLElement>) => void;
}) {
  return (
    <div className="inventory-check-header-row">
      <div className={`inventory-check-status inventory-check-status--${record.diffItems > 0 ? "warning" : "success"}`}>
        <span />
      </div>
      <div className="inventory-check-metrics">
        <span className="inventory-check-metric inventory-check-metric--primary">
          <Text type="secondary">盘点物料</Text>
          <strong>{record.totalItems} 项</strong>
        </span>
        <span className={`inventory-check-metric inventory-check-metric--${record.diffItems > 0 ? "warning" : "success"}`}>
          <Text type="secondary">存在差异</Text>
          <strong>{record.diffItems} 项</strong>
        </span>
        <span className="inventory-check-metric">
          <Text type="secondary">库存调整</Text>
          <strong>{record.adjustedItems} 项</strong>
        </span>
        <span className="inventory-check-metric">
          <Text type="secondary">盘点人/时间</Text>
          <strong>{record.checker}｜{formatInventoryDateTime(record.checkTime)}</strong>
        </span>
      </div>
      <div className="inventory-check-row-actions">
        <InventoryDifferenceTag diffItems={record.diffItems} />
        <Tooltip title={expanded ? "收起明细" : "展开明细"}>
          <Button
            type="text"
            size="small"
            icon={expanded ? <UpOutlined /> : <DownOutlined />}
            onClick={(event) => onToggle(record, event)}
          />
        </Tooltip>
      </div>
    </div>
  );
}

function InventoryCheckDetailTable({
  record,
  keyword,
  onViewLedger
}: {
  record: InventoryCheckRecord;
  keyword: string;
  onViewLedger: (record: InventoryCheckRecord, detail: InventoryCheckDetail) => void;
}) {
  const detailColumns: ColumnsType<InventoryCheckDetail> = [
    {
      title: "物料",
      dataIndex: "materialName",
      sorter: (a, b) => a.materialName.localeCompare(b.materialName, "zh-Hans-CN"),
      render: (value) => <span className="inventory-cell-strong">{value}</span>
    },
    {
      title: "分类",
      dataIndex: "category",
      filters: inventoryCategoryOrder.map((category) => ({ text: category, value: category })),
      onFilter: (value, row) => row.category.includes(String(value))
    },
    {
      title: "系统库存",
      dataIndex: "systemStock",
      sorter: (a, b) => a.systemStock - b.systemStock,
      render: (_, row) => formatInventoryQty(row.systemStock, row.unit)
    },
    {
      title: "实际库存",
      dataIndex: "actualStock",
      sorter: (a, b) => a.actualStock - b.actualStock,
      render: (_, row) => formatInventoryQty(row.actualStock, row.unit)
    },
    {
      title: "差异",
      dataIndex: "difference",
      sorter: (a, b) => a.difference - b.difference,
      render: (_, row) => (
        <span className="inventory-check-difference-cell">
          <InventoryCheckDifferenceValue difference={row.difference} unit={row.unit} />
          {row.difference !== 0 ? (
            <Tooltip title="查看库存流水">
              <Button
                type="text"
                size="small"
                icon={<HistoryOutlined />}
                aria-label="查看库存流水"
                onClick={(event) => {
                  event.stopPropagation();
                  onViewLedger(record, row);
                }}
              />
            </Tooltip>
          ) : null}
        </span>
      )
    }
  ];

  return (
    <div className="inventory-check-detail-panel">
      <div className="inventory-check-detail-summary">
        <span>
          共盘点 <strong>{record.totalItems}</strong> 项物料
        </span>
        <span>
          差异 <strong>{record.diffItems}</strong> 项
        </span>
        <span>
          已调整 <strong>{record.adjustedItems}</strong> 项
        </span>
      </div>
      <Table
        rowKey="id"
        size="small"
        className="inventory-console-table inventory-check-detail-table"
        columns={detailColumns}
        dataSource={record.details}
        pagination={false}
        rowClassName={(row) =>
          [
            row.difference !== 0 ? "inventory-check-detail-row--diff" : "",
            isInventoryCheckDetailKeywordMatch(row, keyword) ? "inventory-check-detail-row--search-hit" : ""
          ]
            .filter(Boolean)
            .join(" ")
        }
      />
    </div>
  );
}

function InventoryLedgerTable({
  dateRange,
  keyword,
  ledgerTypes,
  columns,
  dataSource,
  onDateRangeChange,
  onKeywordChange,
  onLedgerTypesChange
}: {
  dateRange: [string, string] | null;
  keyword: string;
  ledgerTypes: InventoryLedgerType[];
  columns: ColumnsType<InventoryLedgerRow>;
  dataSource: InventoryLedgerRow[];
  onDateRangeChange: (dateRange: [string, string] | null) => void;
  onKeywordChange: (keyword: string) => void;
  onLedgerTypesChange: (ledgerTypes: InventoryLedgerType[]) => void;
}) {
  return (
    <>
      <div className="inventory-ledger-filterbar">
        <DatePicker.RangePicker
          value={dateRange ? [dayjs(dateRange[0]), dayjs(dateRange[1])] : null}
          placeholder={["开始日期", "结束日期"]}
          onChange={(_, dateStrings) =>
            onDateRangeChange(dateStrings[0] && dateStrings[1] ? [dateStrings[0], dateStrings[1]] : null)
          }
        />
        <Input.Search
          allowClear
          placeholder="搜索物料名称、品牌或批次"
          value={keyword}
          onChange={(event) => onKeywordChange(event.target.value)}
        />
        <Select
          mode="multiple"
          allowClear
          placeholder="筛选类型"
          value={ledgerTypes}
          onChange={(value) => onLedgerTypesChange(value)}
          options={["采购入库", "业务消耗", "消耗冲销", "入库更正", "盘盈", "盘亏", "盘点调整", "报废"].map((value) => ({
            label: value,
            value
          }))}
        />
      </div>
      <Table
        rowKey="id"
        className="inventory-console-table"
        columns={columns}
        dataSource={dataSource}
        pagination={false}
      />
    </>
  );
}

function InventoryCheckTable({
  dateRange,
  keyword,
  checker,
  diffFilter,
  checkerOptions,
  dataSource,
  expandedRowKeys,
  focusedRecordId,
  onDateRangeChange,
  onKeywordChange,
  onCheckerChange,
  onDiffFilterChange,
  onExpandedRowKeysChange,
  onToggleRecord,
  onViewLedger
}: {
  dateRange: [string, string] | null;
  keyword: string;
  checker?: string;
  diffFilter: InventoryCheckDiffFilter;
  checkerOptions: Array<{ label: string; value: string }>;
  dataSource: InventoryCheckRecord[];
  expandedRowKeys: string[];
  focusedRecordId: string | null;
  onDateRangeChange: (dateRange: [string, string] | null) => void;
  onKeywordChange: (keyword: string) => void;
  onCheckerChange: (checker?: string) => void;
  onDiffFilterChange: (filter: InventoryCheckDiffFilter) => void;
  onExpandedRowKeysChange: (keys: string[]) => void;
  onToggleRecord: (record: InventoryCheckRecord, event?: ReactMouseEvent<HTMLElement>) => void;
  onViewLedger: (record: InventoryCheckRecord, detail: InventoryCheckDetail) => void;
}) {
  const columns: ColumnsType<InventoryCheckRecord> = [
    {
      key: "checkHeader",
      render: (_, record) => (
        <InventoryCheckHeader
          record={record}
          expanded={expandedRowKeys.includes(record.id)}
          onToggle={onToggleRecord}
        />
      )
    }
  ];

  return (
    <>
      <div className="inventory-ledger-filterbar inventory-check-filterbar">
        <DatePicker.RangePicker
          value={dateRange ? [dayjs(dateRange[0]), dayjs(dateRange[1])] : null}
          placeholder={["开始日期", "结束日期"]}
          onChange={(_, dateStrings) =>
            onDateRangeChange(dateStrings[0] && dateStrings[1] ? [dateStrings[0], dateStrings[1]] : null)
          }
        />
        <Input.Search
          allowClear
          placeholder="搜索物料名称"
          value={keyword}
          onChange={(event) => onKeywordChange(event.target.value)}
        />
        <Select
          allowClear
          placeholder="盘点人"
          value={checker}
          options={checkerOptions}
          onChange={(value) => onCheckerChange(value)}
        />
        <Select
          placeholder="是否存在差异"
          value={diffFilter}
          options={inventoryCheckDiffFilterOptions.map((value) => ({ label: value, value }))}
          onChange={(value) => onDiffFilterChange(value)}
        />
      </div>
      <Table
        rowKey="id"
        showHeader={false}
        className="inventory-console-table inventory-check-table"
        columns={columns}
        dataSource={dataSource}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条盘点记录`
        }}
        rowClassName={(record) => (record.id === focusedRecordId ? "inventory-check-row--focused" : "")}
        expandable={{
          expandedRowKeys,
          expandedRowRender: (record) =>
            expandedRowKeys.includes(record.id) ? (
              <InventoryCheckDetailTable record={record} keyword={keyword} onViewLedger={onViewLedger} />
            ) : null,
          expandRowByClick: true,
          expandIcon: () => null,
          columnWidth: 0,
          onExpandedRowsChange: (keys) => onExpandedRowKeysChange(keys.map((key) => String(key)))
        }}
      />
    </>
  );
}

function InventoryInboundHeader({
  record,
  expanded,
  onToggle
}: {
  record: InventoryInboundOrder;
  expanded: boolean;
  onToggle: (record: InventoryInboundOrder, event?: ReactMouseEvent<HTMLElement>) => void;
}) {
  const remark = record.remark?.trim();
  const totalAmount = resolveInventoryInboundTotalAmount(record);
  const itemCountText = `${record.details.length} 项物料`;

  return (
    <div className="inventory-inbound-header-row">
      <Tooltip title={expanded ? "收起明细" : "展开明细"}>
        <Button
          type="text"
          size="small"
          className="inventory-inbound-expand-button"
          icon={expanded ? <UpOutlined /> : <DownOutlined />}
          onClick={(event) => onToggle(record, event)}
        />
      </Tooltip>
      <div className="inventory-inbound-identity">
        <span>
          <strong>{record.orderNo}</strong>
        </span>
      </div>
      <div className="inventory-inbound-route">
        <Tag color="blue">{record.type}</Tag>
      </div>
      <div className="inventory-inbound-total">
        <span>入库总金额</span>
        <strong>{formatCurrency(totalAmount)}</strong>
      </div>
      <div className="inventory-inbound-item-count">{itemCountText}</div>
      <Tooltip title={remark ? `备注：${remark}` : "无备注"} placement="topLeft">
        <span className="inventory-inbound-remark" aria-label={`备注：${remark || "—"}`}>
          <span className="inventory-inbound-remark__label">备注：</span>
          <span className="inventory-inbound-remark__text">{remark || "—"}</span>
        </span>
      </Tooltip>
      <div className="inventory-inbound-time">
        <strong>{formatInventoryDate(record.inboundTime)}</strong>
        <span>{record.inboundTime.slice(11, 16)}</span>
      </div>
      <div className="inventory-inbound-operator">{record.operator}</div>
    </div>
  );
}

function resolveInventoryInboundTotalAmount(record: InventoryInboundOrder) {
  return record.details.reduce((sum, detail) => sum + detail.totalAmount, 0);
}

function InventoryInboundMaterialName({ value }: { value: string }) {
  return (
    <Tooltip title="预留：当前库存、最近一次入库、最近一次出库" placement="topLeft">
      <span className="inventory-inbound-material-name">{value}</span>
    </Tooltip>
  );
}

function InventoryInboundDetail({ record }: { record: InventoryInboundOrder }) {
  const materialColumns: ColumnsType<InventoryInboundMaterial> = [
    {
      title: "物料名称",
      dataIndex: "materialName",
      sorter: (a, b) => a.materialName.localeCompare(b.materialName, "zh-Hans-CN"),
      render: (value) => <InventoryInboundMaterialName value={value} />
    },
    {
      title: "分类",
      dataIndex: "category",
      filters: Array.from(new Set(record.details.map((detail) => detail.category))).map((category) => ({
        text: category,
        value: category
      })),
      onFilter: (value, row) => row.category === value
    },
    {
      title: "品牌",
      dataIndex: "brand",
      sorter: (a, b) => a.brand.localeCompare(b.brand, "zh-Hans-CN")
    },
    {
      title: "数量",
      dataIndex: "quantity",
      sorter: (a, b) => a.quantity - b.quantity,
      render: (value) => <span className="inventory-inbound-quantity">{value}</span>
    },
    {
      title: "单位",
      dataIndex: "unit"
    },
    {
      title: "总金额",
      dataIndex: "totalAmount",
      sorter: (a, b) => a.totalAmount - b.totalAmount,
      render: (value) => formatCurrency(value)
    },
    {
      title: "保质期至",
      dataIndex: "expiryDate",
      sorter: (a, b) => a.expiryDate.localeCompare(b.expiryDate)
    },
    {
      title: "供应商",
      dataIndex: "supplier"
    },
    {
      title: "供应商电话",
      dataIndex: "supplierPhone",
      render: (value) => value || "—"
    }
  ];

  return (
    <div className="inventory-inbound-detail-panel">
      <section className="inventory-inbound-detail-section">
        <div className="inventory-inbound-detail-section__title">入库物料</div>
        <Table
          rowKey="id"
          size="small"
          className="inventory-console-table inventory-inbound-material-table"
          columns={materialColumns}
          dataSource={record.details}
          pagination={false}
        />
        <div className="inventory-inbound-material-footer">
          <span className="inventory-inbound-material-count">共 {record.details.length} 项物料</span>
          <span className="inventory-inbound-material-total">
            入库总金额 <strong>{formatCurrency(resolveInventoryInboundTotalAmount(record))}</strong>
          </span>
        </div>
      </section>
    </div>
  );
}

function InventoryInboundOrderTable({
  dateRange,
  keyword,
  typeFilter,
  dataSource,
  expandedRowKeys,
  onDateRangeChange,
  onKeywordChange,
  onTypeFilterChange,
  onToggleRecord
}: {
  dateRange: [string, string] | null;
  keyword: string;
  typeFilter: InventoryInboundTypeFilter;
  dataSource: InventoryInboundOrder[];
  expandedRowKeys: string[];
  onDateRangeChange: (dateRange: [string, string] | null) => void;
  onKeywordChange: (keyword: string) => void;
  onTypeFilterChange: (type: InventoryInboundTypeFilter) => void;
  onToggleRecord: (record: InventoryInboundOrder, event?: ReactMouseEvent<HTMLElement>) => void;
}) {
  const columns: ColumnsType<InventoryInboundOrder> = [
    {
      key: "inboundHeader",
      render: (_, record) => (
        <InventoryInboundHeader
          record={record}
          expanded={expandedRowKeys.includes(record.id)}
          onToggle={onToggleRecord}
        />
      )
    }
  ];

  return (
    <>
      <div className="inventory-ledger-filterbar inventory-inbound-filterbar">
        <Input.Search
          allowClear
          placeholder="搜索入库单号、物料名称"
          value={keyword}
          onChange={(event) => onKeywordChange(event.target.value)}
        />
        <DatePicker.RangePicker
          value={dateRange ? [dayjs(dateRange[0]), dayjs(dateRange[1])] : null}
          placeholder={["开始时间", "结束时间"]}
          onChange={(_, dateStrings) =>
            onDateRangeChange(dateStrings[0] && dateStrings[1] ? [dateStrings[0], dateStrings[1]] : null)
          }
        />
        <Select
          value={typeFilter}
          options={[
            { label: "全部", value: "全部" },
            ...inventoryInboundTypeOptions.map((value) => ({ label: value, value }))
          ]}
          onChange={(value) => onTypeFilterChange(value)}
        />
      </div>
      <Table
        rowKey="id"
        showHeader={false}
        className="inventory-console-table inventory-inbound-table"
        columns={columns}
        dataSource={dataSource}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 张入库单`
        }}
        onRow={(record) => ({
          onClick: () => onToggleRecord(record)
        })}
        expandable={{
          expandedRowKeys,
          expandedRowRender: (record) =>
            expandedRowKeys.includes(record.id) ? <InventoryInboundDetail record={record} /> : null,
          expandIcon: () => null,
          columnWidth: 0
        }}
      />
    </>
  );
}

function formatMonthDay(value: string) {
  return value.slice(5).replace("-", "/");
}

function formatISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function enumerateDates(start: string, end: string) {
  const dates: string[] = [];
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate > endDate) {
    return dates;
  }
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    dates.push(formatISODate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function buildInventoryDonutGradient(rows: InventoryValueShareRow[]) {
  const visibleRows = rows.filter((row) => row.amount > 0);
  if (!visibleRows.length) {
    return "conic-gradient(#e2e8f0 0 100%)";
  }
  let cursor = 0;
  return `conic-gradient(${visibleRows
    .map((row) => {
      const start = cursor;
      cursor += row.share * 100;
      return `${row.color} ${start}% ${cursor}%`;
    })
    .join(", ")})`;
}

function buildSmoothLinePath(coords: { x: number; y: number }[]) {
  if (!coords.length) return "";
  if (coords.length === 1) return `M ${coords[0].x} ${coords[0].y}`;
  const smoothing = 0.16;
  const path = [`M ${coords[0].x} ${coords[0].y}`];
  for (let i = 0; i < coords.length - 1; i += 1) {
    const p0 = coords[i - 1] || coords[i];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[i + 2] || p2;
    const cp1x = p1.x + (p2.x - p0.x) * smoothing;
    const cp1y = p1.y + (p2.y - p0.y) * smoothing;
    const cp2x = p2.x - (p3.x - p1.x) * smoothing;
    const cp2y = p2.y - (p3.y - p1.y) * smoothing;
    path.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`);
  }
  return path.join(" ");
}

function buildNiceCeiling(maxValue: number) {
  if (maxValue <= 0) return 100;
  const rough = maxValue * 1.15;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rough)));
  const step = magnitude / 2;
  return Math.ceil(rough / step) * step;
}

function InventoryTrendChart({
  points,
  rangeLabel,
  categoryLabel
}: {
  points: InventoryTrendPoint[];
  rangeLabel: string;
  categoryLabel: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(680);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const update = () => setWidth(el.clientWidth || 680);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const height = 252;
  const padding = { top: 22, right: 18, bottom: 30, left: 52 };
  const innerW = Math.max(width - padding.left - padding.right, 10);
  const innerH = height - padding.top - padding.bottom;

  const maxAmount = Math.max(...points.map((point) => point.amount), 0);
  const niceMax = buildNiceCeiling(maxAmount);
  const hasData = maxAmount > 0 && points.length > 0;

  const coords = points.map((point, index) => {
    const x =
      points.length === 1
        ? padding.left + innerW / 2
        : padding.left + (index / (points.length - 1)) * innerW;
    const y = padding.top + innerH - (niceMax > 0 ? (point.amount / niceMax) * innerH : 0);
    return { x, y, point, index };
  });

  const linePath = buildSmoothLinePath(coords);
  const areaPath =
    coords.length && hasData
      ? `${linePath} L ${coords[coords.length - 1].x} ${padding.top + innerH} L ${coords[0].x} ${
          padding.top + innerH
        } Z`
      : "";

  const yTicks = 4;
  const gridLines = Array.from({ length: yTicks + 1 }, (_, row) => ({
    value: (niceMax / yTicks) * (yTicks - row),
    y: padding.top + (innerH / yTicks) * row
  }));

  const labelEvery = Math.max(1, Math.ceil(points.length / 7));
  const peakIndex = coords.length
    ? coords.reduce((best, current, index) => (current.point.amount > coords[best].point.amount ? index : best), 0)
    : 0;

  const handleMove = (event: ReactMouseEvent<SVGSVGElement>) => {
    if (!coords.length) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    let nearest = 0;
    let bestDistance = Infinity;
    coords.forEach((coord, index) => {
      const distance = Math.abs(coord.x - x);
      if (distance < bestDistance) {
        bestDistance = distance;
        nearest = index;
      }
    });
    setActiveIndex(nearest);
  };

  const active = activeIndex != null && activeIndex < coords.length ? coords[activeIndex] : null;

  return (
    <div className="inventory-trend-chart" ref={containerRef}>
      <svg
        className="inventory-trend-chart__svg"
        width={width}
        height={height}
        role="img"
        aria-label={`${categoryLabel}${rangeLabel}每日消耗金额`}
        onMouseMove={handleMove}
        onMouseLeave={() => setActiveIndex(null)}
      >
        <defs>
          <linearGradient id="inventoryTrendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B7BFF" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#3B7BFF" stopOpacity="0" />
          </linearGradient>
        </defs>
        {gridLines.map((grid, row) => (
          <g key={`grid-${row}`}>
            <line
              className="inventory-trend-chart__gridline"
              x1={padding.left}
              y1={grid.y}
              x2={width - padding.right}
              y2={grid.y}
            />
            <text
              className="inventory-trend-chart__ytick"
              x={padding.left - 10}
              y={grid.y + 3}
              textAnchor="end"
            >
              {formatCurrency(Math.round(grid.value))}
            </text>
          </g>
        ))}
        {areaPath ? <path className="inventory-trend-chart__area" d={areaPath} fill="url(#inventoryTrendFill)" /> : null}
        {hasData && linePath ? <path className="inventory-trend-chart__line" d={linePath} /> : null}
        {hasData
          ? coords.map((coord) =>
              coord.point.amount > 0 ? (
                <circle
                  key={coord.point.date}
                  className={`inventory-trend-chart__dot${coord.index === peakIndex ? " is-peak" : ""}`}
                  cx={coord.x}
                  cy={coord.y}
                  r={coord.index === peakIndex ? 3.4 : 2.2}
                />
              ) : null
            )
          : null}
        {coords.map((coord, index) =>
          index % labelEvery === 0 || index === coords.length - 1 ? (
            <text
              key={`xtick-${coord.point.date}`}
              className="inventory-trend-chart__xtick"
              x={coord.x}
              y={height - 10}
              textAnchor="middle"
            >
              {formatMonthDay(coord.point.date)}
            </text>
          ) : null
        )}
        {active ? (
          <g className="inventory-trend-chart__cursor">
            <line x1={active.x} y1={padding.top} x2={active.x} y2={padding.top + innerH} />
            <circle cx={active.x} cy={active.y} r={4.2} />
          </g>
        ) : null}
        {!hasData ? (
          <text className="inventory-trend-chart__empty" x={width / 2} y={padding.top + innerH / 2} textAnchor="middle">
            该时间段暂无消耗记录
          </text>
        ) : null}
      </svg>
      {active ? (
        <div
          className="inventory-trend-chart__tooltip"
          style={{
            left: Math.min(Math.max(active.x, 64), width - 64),
            top: Math.max(active.y - 16, 6)
          }}
        >
          <span className="inventory-trend-chart__tooltip-date">{formatMonthDay(active.point.date)}</span>
          <strong>{formatCurrency(active.point.amount)}</strong>
        </div>
      ) : null}
    </div>
  );
}

function FeedStockTrendChart({
  points,
  onPointClick
}: {
  points: FeedStockTrendPoint[];
  onPointClick: (date: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(680);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const update = () => setWidth(el.clientWidth || 680);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const height = 236;
  const padding = { top: 22, right: 18, bottom: 30, left: 54 };
  const innerW = Math.max(width - padding.left - padding.right, 10);
  const innerH = height - padding.top - padding.bottom;
  const maxQuantity = Math.max(...points.map((point) => point.quantity), 0);
  const niceMax = buildNiceCeiling(maxQuantity);
  const hasData = points.length > 0 && maxQuantity > 0;

  const coords = points.map((point, index) => {
    const x =
      points.length === 1
        ? padding.left + innerW / 2
        : padding.left + (index / (points.length - 1)) * innerW;
    const y = padding.top + innerH - (niceMax > 0 ? (point.quantity / niceMax) * innerH : 0);
    return { x, y, point, index };
  });

  const linePath = buildSmoothLinePath(coords);
  const areaPath =
    coords.length && hasData
      ? `${linePath} L ${coords[coords.length - 1].x} ${padding.top + innerH} L ${coords[0].x} ${
          padding.top + innerH
        } Z`
      : "";
  const yTicks = 4;
  const gridLines = Array.from({ length: yTicks + 1 }, (_, row) => ({
    value: (niceMax / yTicks) * (yTicks - row),
    y: padding.top + (innerH / yTicks) * row
  }));
  const labelEvery = Math.max(1, Math.ceil(points.length / 7));

  const handleMove = (event: ReactMouseEvent<SVGSVGElement>) => {
    if (!coords.length) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    let nearest = 0;
    let bestDistance = Infinity;
    coords.forEach((coord, index) => {
      const distance = Math.abs(coord.x - x);
      if (distance < bestDistance) {
        bestDistance = distance;
        nearest = index;
      }
    });
    setActiveIndex(nearest);
  };

  const active = activeIndex != null && activeIndex < coords.length ? coords[activeIndex] : null;

  return (
    <div className="feed-stock-trend-chart" ref={containerRef}>
      <svg
        className="feed-stock-trend-chart__svg"
        width={width}
        height={height}
        role="img"
        aria-label="近30天饲料库存余量趋势"
        onMouseMove={handleMove}
        onMouseLeave={() => setActiveIndex(null)}
      >
        <defs>
          <linearGradient id="feedStockTrendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#16a34a" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
          </linearGradient>
        </defs>
        {gridLines.map((grid, row) => (
          <g key={`feed-grid-${row}`}>
            <line
              className="feed-stock-trend-chart__gridline"
              x1={padding.left}
              y1={grid.y}
              x2={width - padding.right}
              y2={grid.y}
            />
            <text
              className="feed-stock-trend-chart__ytick"
              x={padding.left - 10}
              y={grid.y + 3}
              textAnchor="end"
            >
              {formatFeedTrendQty(grid.value)}
            </text>
          </g>
        ))}
        {areaPath ? <path className="feed-stock-trend-chart__area" d={areaPath} fill="url(#feedStockTrendFill)" /> : null}
        {hasData && linePath ? <path className="feed-stock-trend-chart__line" d={linePath} /> : null}
        {hasData
          ? coords.map((coord) => (
              <g key={coord.point.date} className="feed-stock-trend-chart__point">
                <circle
                  className={`feed-stock-trend-chart__dot${
                    coord.point.anomaly ? ` is-${coord.point.anomaly}` : ""
                  }`}
                  cx={coord.x}
                  cy={coord.y}
                  r={coord.point.anomaly ? 3.8 : 2.4}
                />
                <circle
                  className="feed-stock-trend-chart__hit-area"
                  data-feed-trend-date={coord.point.date}
                  cx={coord.x}
                  cy={coord.y}
                  r={9}
                  onClick={() => onPointClick(coord.point.date)}
                />
              </g>
            ))
          : null}
        {coords.map((coord, index) =>
          index % labelEvery === 0 || index === coords.length - 1 ? (
            <text
              key={`feed-xtick-${coord.point.date}`}
              className="feed-stock-trend-chart__xtick"
              x={coord.x}
              y={height - 10}
              textAnchor="middle"
            >
              {formatMonthDay(coord.point.date)}
            </text>
          ) : null
        )}
        {active ? (
          <g className="feed-stock-trend-chart__cursor">
            <line x1={active.x} y1={padding.top} x2={active.x} y2={padding.top + innerH} />
            <circle cx={active.x} cy={active.y} r={4.4} />
          </g>
        ) : null}
        {!hasData ? (
          <text className="feed-stock-trend-chart__empty" x={width / 2} y={padding.top + innerH / 2} textAnchor="middle">
            暂无库存数据
          </text>
        ) : null}
      </svg>
      {active ? (
        <div
          className="feed-stock-trend-chart__tooltip"
          style={{
            left: Math.min(Math.max(active.x, 118), width - 118),
            top: Math.max(active.y - 18, 8)
          }}
        >
          <strong>{active.point.date}</strong>
          <span>库存余量：{formatFeedTrendQty(active.point.quantity)}</span>
          <span>当日入库：{formatFeedTrendQty(active.point.inboundQuantity)}</span>
          <span>当日出库：{formatFeedTrendQty(active.point.outboundQuantity)}</span>
          <span>较昨日变化：{formatSignedFeedTrendQty(active.point.changeQuantity)}</span>
        </div>
      ) : null}
    </div>
  );
}

function MaterialStockTrendChart({
  points,
  unit
}: {
  points: MaterialStockTrendPoint[];
  unit: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(720);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const update = () => setWidth(el.clientWidth || 720);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const height = 260;
  const padding = { top: 26, right: 22, bottom: 34, left: 58 };
  const innerW = Math.max(width - padding.left - padding.right, 10);
  const innerH = height - padding.top - padding.bottom;
  const maxQuantity = Math.max(...points.map((point) => point.quantity), 0);
  const niceMax = buildNiceCeiling(maxQuantity);
  const hasData = points.length > 0 && maxQuantity > 0;
  const coords = points.map((point, index) => {
    const x =
      points.length === 1
        ? padding.left + innerW / 2
        : padding.left + (index / (points.length - 1)) * innerW;
    const y = padding.top + innerH - (niceMax > 0 ? (point.quantity / niceMax) * innerH : 0);
    return { x, y, point, index };
  });
  const linePath = buildSmoothLinePath(coords);
  const areaPath =
    coords.length && hasData
      ? `${linePath} L ${coords[coords.length - 1].x} ${padding.top + innerH} L ${coords[0].x} ${
          padding.top + innerH
        } Z`
      : "";
  const yTicks = 4;
  const gridLines = Array.from({ length: yTicks + 1 }, (_, row) => ({
    value: (niceMax / yTicks) * (yTicks - row),
    y: padding.top + (innerH / yTicks) * row
  }));
  const labelEvery = Math.max(1, Math.ceil(points.length / 7));

  const handleMove = (event: ReactMouseEvent<SVGSVGElement>) => {
    if (!coords.length) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    let nearest = 0;
    let bestDistance = Infinity;
    coords.forEach((coord, index) => {
      const distance = Math.abs(coord.x - x);
      if (distance < bestDistance) {
        bestDistance = distance;
        nearest = index;
      }
    });
    setActiveIndex(nearest);
  };

  const active = activeIndex != null && activeIndex < coords.length ? coords[activeIndex] : null;
  const markerOffset = (point: MaterialStockTrendPoint) => {
    const flags = [point.hasInbound, point.hasAdjustment, point.hasScrap, point.hasOutbound].filter(Boolean).length;
    return flags > 1 ? -((flags - 1) * 5) : 0;
  };

  return (
    <div className="material-stock-trend-chart" ref={containerRef}>
      <svg
        className="material-stock-trend-chart__svg"
        width={width}
        height={height}
        role="img"
        aria-label="物料库存趋势"
        onMouseMove={handleMove}
        onMouseLeave={() => setActiveIndex(null)}
      >
        <defs>
          <linearGradient id="materialStockTrendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
          </linearGradient>
        </defs>
        {gridLines.map((grid, row) => (
          <g key={`material-grid-${row}`}>
            <line
              className="material-stock-trend-chart__gridline"
              x1={padding.left}
              y1={grid.y}
              x2={width - padding.right}
              y2={grid.y}
            />
            <text
              className="material-stock-trend-chart__ytick"
              x={padding.left - 10}
              y={grid.y + 3}
              textAnchor="end"
            >
              {formatInventoryQty(grid.value, unit)}
            </text>
          </g>
        ))}
        {areaPath ? <path className="material-stock-trend-chart__area" d={areaPath} fill="url(#materialStockTrendFill)" /> : null}
        {hasData && linePath ? <path className="material-stock-trend-chart__line" d={linePath} /> : null}
        {hasData
          ? coords.map((coord) => {
              let offset = markerOffset(coord.point);
              const markers: JSX.Element[] = [];
              if (coord.point.hasInbound) {
                markers.push(
                  <circle
                    key="inbound"
                    className="material-stock-trend-chart__marker is-inbound"
                    cx={coord.x + offset}
                    cy={coord.y - 10}
                    r={3.2}
                  />
                );
                offset += 10;
              }
              if (coord.point.hasAdjustment) {
                markers.push(
                  <path
                    key="adjustment"
                    className="material-stock-trend-chart__marker is-adjustment"
                    d={`M ${coord.x + offset} ${coord.y - 14} L ${coord.x + offset + 4} ${coord.y - 7} L ${
                      coord.x + offset - 4
                    } ${coord.y - 7} Z`}
                  />
                );
                offset += 10;
              }
              if (coord.point.hasScrap) {
                markers.push(
                  <path
                    key="scrap"
                    className="material-stock-trend-chart__marker is-scrap"
                    d={`M ${coord.x + offset} ${coord.y - 6} L ${coord.x + offset + 4} ${coord.y - 13} L ${
                      coord.x + offset - 4
                    } ${coord.y - 13} Z`}
                  />
                );
                offset += 10;
              }
              if (coord.point.hasOutbound) {
                markers.push(
                  <rect
                    key="outbound"
                    className="material-stock-trend-chart__marker is-outbound"
                    x={coord.x + offset - 3}
                    y={coord.y - 13}
                    width={6}
                    height={6}
                    rx={1}
                  />
                );
              }
              return (
                <g key={`material-point-${coord.point.date}`} className="material-stock-trend-chart__point">
                  <circle className="material-stock-trend-chart__dot" cx={coord.x} cy={coord.y} r={2.4} />
                  {markers}
                </g>
              );
            })
          : null}
        {coords.map((coord, index) =>
          index % labelEvery === 0 || index === coords.length - 1 ? (
            <text
              key={`material-xtick-${coord.point.date}`}
              className="material-stock-trend-chart__xtick"
              x={coord.x}
              y={height - 10}
              textAnchor="middle"
            >
              {formatMonthDay(coord.point.date)}
            </text>
          ) : null
        )}
        {active ? (
          <g className="material-stock-trend-chart__cursor">
            <line x1={active.x} y1={padding.top} x2={active.x} y2={padding.top + innerH} />
            <circle cx={active.x} cy={active.y} r={4.2} />
          </g>
        ) : null}
        {!hasData ? (
          <text className="material-stock-trend-chart__empty" x={width / 2} y={padding.top + innerH / 2} textAnchor="middle">
            暂无库存趋势数据
          </text>
        ) : null}
      </svg>
      {active ? (
        <div
          className="material-stock-trend-chart__tooltip"
          style={{
            left: Math.min(Math.max(active.x, 116), width - 116),
            top: Math.max(active.y - 18, 8)
          }}
        >
          <strong>{active.point.date}</strong>
          <span>库存：{formatInventoryQty(active.point.quantity, unit)}</span>
          <span>入库：{formatInventoryQty(active.point.inboundQuantity, unit)}</span>
          <span>出库：{formatInventoryQty(active.point.outboundQuantity, unit)}</span>
          <span>盘点：{formatSignedInventoryQty(active.point.adjustmentQuantity, unit)}</span>
          {active.point.scrapQuantity > 0 ? <span>报废：{formatInventoryQty(active.point.scrapQuantity, unit)}</span> : null}
        </div>
      ) : null}
    </div>
  );
}

function InventoryDonutChart({
  rows,
  totalValue
}: {
  rows: InventoryValueShareRow[];
  totalValue: number;
}) {
  return (
    <div className="inventory-analytics-donut">
      <div
        className="inventory-analytics-donut__ring"
        style={{ backgroundImage: buildInventoryDonutGradient(rows) }}
        aria-hidden="true"
      />
      <div className="inventory-analytics-donut__center">
        <Text type="secondary">总库存金额</Text>
        <strong>{formatCurrency(totalValue)}</strong>
      </div>
    </div>
  );
}

function renderFeedEstimatedAvailableDaysText(result: FeedEstimatedAvailableDaysResult) {
  const statusClass =
    result.status === "zero" || result.status === "紧急"
      ? "is-critical"
      : result.status === "偏低"
        ? "is-low"
        : result.status === "关注"
          ? "is-watch"
          : result.status === "正常"
            ? "is-normal"
            : "is-empty";

  return (
    <span className={`inventory-feed-available-days ${statusClass}`}>
      <span>{result.displayText}</span>
    </span>
  );
}

function resolveInventoryStockHealth(result?: FeedEstimatedAvailableDaysResult) {
  if (!result) {
    return {
      filledPercent: 80,
      className: "is-normal"
    };
  }
  const days = result.days;
  if (days == null) {
    return {
      filledPercent: 0,
      className: "is-empty"
    };
  }
  if (days >= 30) {
    return {
      filledPercent: 100,
      className: "is-abundant"
    };
  }
  if (days >= 15) {
    return {
      filledPercent: 80,
      className: "is-normal"
    };
  }
  if (days >= 7) {
    return {
      filledPercent: 50,
      className: "is-watch"
    };
  }
  if (days >= 3) {
    return {
      filledPercent: 30,
      className: "is-low"
    };
  }
  return {
    filledPercent: 10,
    className: "is-critical"
  };
}

function resolveInventorySummaryStockHealth(row: InventorySummary, result?: FeedEstimatedAvailableDaysResult) {
  if (result) return resolveInventoryStockHealth(result);
  if (row.currentStockBase < 0) {
    return {
      filledPercent: 10,
      className: "is-critical"
    };
  }
  return {
    filledPercent: row.currentStockBase > 0 ? 80 : 10,
    className: row.currentStockBase > 0 ? "is-normal" : "is-critical"
  };
}

function renderInventoryStockHealth(
  row: InventorySummary,
  result?: FeedEstimatedAvailableDaysResult,
  material?: InventoryMaterial | null
) {
  const health = resolveInventorySummaryStockHealth(row, result);
  return (
    <div className={`inventory-stock-health ${health.className}`}>
      <span className="inventory-stock-health__bar" aria-hidden>
        <span className="inventory-stock-health__fill" style={{ width: `${health.filledPercent}%` }} />
      </span>
      <span className="inventory-stock-health__qty">
        {formatInventoryQtyWithPackage(row.currentStockBase, material || { baseUnit: row.baseUnit })}
      </span>
    </div>
  );
}

function resolveInventoryUsageTrendKind(values: number[], total: number): InventoryUsageTrendKind {
  if (!values.length || total <= 0 || values.every((value) => value === 0)) return "idle";

  const average = total / values.length;
  const sorted = [...values].sort((a, b) => b - a);
  const highest = sorted[0] || 0;
  const secondHighest = sorted[1] || 0;
  if (average > 0 && highest >= average * 2.4 && highest >= Math.max(secondHighest * 1.6, average + 1)) return "spike";

  const splitIndex = Math.floor(values.length / 2);
  const firstHalf = values.slice(0, splitIndex);
  const secondHalf = values.slice(splitIndex);
  const firstAverage = firstHalf.reduce((sum, value) => sum + value, 0) / Math.max(firstHalf.length, 1);
  const secondAverage = secondHalf.reduce((sum, value) => sum + value, 0) / Math.max(secondHalf.length, 1);

  if (firstAverage > 0 && secondAverage >= firstAverage * 1.35) return "rising";
  if (firstAverage > 0 && secondAverage <= firstAverage * 0.65) return "falling";
  return "stable";
}

function resolveInventoryUsageTrendMeta(values: number[], total: number) {
  const kind = resolveInventoryUsageTrendKind(values, total);
  return {
    kind,
    color: inventoryUsageTrendColors[kind]
  };
}

function resolveInventoryStockTrendKind(values: number[]): InventoryStockTrendKind {
  const normalized = values.filter((value) => Number.isFinite(value));
  if (!normalized.length || normalized.every((value) => value === 0)) return "idle";

  const first = normalized[0];
  const latest = normalized[normalized.length - 1];
  const average = normalized.reduce((sum, value) => sum + value, 0) / normalized.length;
  const range = Math.max(...normalized) - Math.min(...normalized);
  const threshold = Math.max(Math.abs(average) * 0.12, 1);
  const delta = latest - first;

  if (delta >= threshold) return "rising";
  if (delta <= -threshold) return "falling";
  if (average > 0 && range >= average * 0.35) return "spike";
  return "stable";
}

function resolveInventoryStockTrendMeta(values: number[]) {
  const kind = resolveInventoryStockTrendKind(values);
  return {
    kind,
    color: inventoryStockTrendColors[kind]
  };
}

function renderInventoryMonthlyUsage(row: InventorySummary) {
  const trendMeta = resolveInventoryUsageTrendMeta(row.usageTrend, row.monthlyUsageBase);
  const usageText = formatInventoryQty(row.monthlyUsageBase, row.baseUnit);

  return (
    <div className={`inventory-usage-cell inventory-usage-cell--${trendMeta.kind}`}>
      <Sparkline
        data={row.usageTrend}
        color={trendMeta.color}
        unit={row.baseUnit}
        total={row.monthlyUsageBase}
        valueText={usageText}
        valueFormatter={(value) => formatInventoryQty(value, row.baseUnit)}
        className="inventory-usage-cell__sparkline"
      />
      <span className="inventory-usage-cell__value">{usageText}</span>
    </div>
  );
}

function renderInventoryStockTrend(row: InventorySummary) {
  const trendMeta = resolveInventoryStockTrendMeta(row.stockTrend);
  const usageText = formatInventoryQty(row.monthlyUsageBase, row.baseUnit);

  return (
    <div className={`inventory-usage-cell inventory-usage-cell--${trendMeta.kind}`}>
      <Sparkline
        data={row.stockTrend}
        tooltipStatsData={row.usageTrend}
        color={trendMeta.color}
        unit={row.baseUnit}
        total={row.monthlyUsageBase}
        valueText={usageText}
        valueFormatter={(value) => formatInventoryQty(value, row.baseUnit)}
        className="inventory-usage-cell__sparkline"
        title="近30天使用"
      />
    </div>
  );
}

function buildStocktakeRiskLineText(status: StocktakeRiskStatus, quantityBase: number, totalBase: number, unit: string) {
  const quantityText = formatInventoryQty(quantityBase, unit);
  if (status === "负库存" || totalBase <= 0) return `${status}：${quantityText}`;
  const share = Math.round((quantityBase / totalBase) * 100);
  return `${status}：${quantityText}（${share}%）`;
}

function buildStocktakeRiskLines(row: InventoryStocktakeScopeRow, lots: InventoryLot[]): StocktakeRiskLine[] {
  const lines: StocktakeRiskLine[] = [];

  if (row.bookQtyBase < 0) {
    const quantityBase = Math.abs(row.bookQtyBase);
    lines.push({
      status: "负库存",
      tone: "negative",
      quantityBase,
      text: buildStocktakeRiskLineText("负库存", quantityBase, row.bookQtyBase, row.baseUnit)
    });
  }

  const expiredQuantityBase = lots
    .filter((lot) => lot.materialId === row.materialId && lot.status === "过期" && lot.remainingQtyBase > 0)
    .reduce((sum, lot) => sum + lot.remainingQtyBase, 0);
  if (expiredQuantityBase > 0) {
    lines.push({
      status: "已过期",
      tone: "expired",
      quantityBase: expiredQuantityBase,
      text: buildStocktakeRiskLineText("已过期", expiredQuantityBase, row.bookQtyBase, row.baseUnit)
    });
  }

  const expiringQuantityBase = lots
    .filter((lot) => lot.materialId === row.materialId && lot.status === "临期" && lot.remainingQtyBase > 0)
    .reduce((sum, lot) => sum + lot.remainingQtyBase, 0);
  if (expiringQuantityBase > 0) {
    lines.push({
      status: "临期",
      tone: "expiring",
      quantityBase: expiringQuantityBase,
      text: buildStocktakeRiskLineText("临期", expiringQuantityBase, row.bookQtyBase, row.baseUnit)
    });
  }

  return lines;
}

function renderStocktakeRecentChangesTooltip(recentLedgers: InventoryLedgerRow[]) {
  return (
    <div className="inventory-stocktake-change-tooltip">
      <strong>最近库存变化</strong>
      {recentLedgers.length ? (
        <div className="inventory-stocktake-change-tooltip__rows">
          {recentLedgers.map((ledger) => (
            <span key={ledger.id}>
              <span>{formatInventoryShortDate(ledger.occurredAt)}</span>
              <span>{ledger.type}</span>
              <b>{ledger.quantityText}</b>
            </span>
          ))}
        </div>
      ) : (
        <Text type="secondary">暂无库存变化</Text>
      )}
    </div>
  );
}

function resolveMaterialDetailStockStatus(
  summary: InventorySummary,
  lots: InventoryLot[]
): { label: string; tone: MaterialStockStatusTone } {
  if (summary.currentStockBase < 0) {
    return { label: "负库存", tone: "danger" };
  }
  if (lots.some((lot) => lot.status === "过期" && lot.remainingQtyBase > 0)) {
    return { label: "过期风险", tone: "danger" };
  }
  if (lots.some((lot) => lot.status === "临期" && lot.remainingQtyBase > 0)) {
    return { label: "临期风险", tone: "warning" };
  }
  return { label: "正常", tone: "success" };
}

function renderPurchaseOrderEstimatedAvailableDays(result?: FeedEstimatedAvailableDaysResult) {
  return result ? (
    <span className="inventory-purchase-days-text">{result.displayText}</span>
  ) : (
    <Text type="secondary">—</Text>
  );
}

function renderPurchaseOrderEstimatedAvailableDaysMeta(result?: FeedEstimatedAvailableDaysResult) {
  return result ? (
    <div className="inventory-cell-stack">
      <span>{result.displayText}</span>
      <Text type="secondary">预计可用</Text>
    </div>
  ) : (
    "—"
  );
}

function compareFeedEstimatedAvailableDays(
  left: FeedEstimatedAvailableDaysResult | undefined,
  right: FeedEstimatedAvailableDaysResult | undefined
) {
  const leftValue = left?.sortValue;
  const rightValue = right?.sortValue;
  if (leftValue == null && rightValue == null) return 0;
  if (leftValue == null) return 1;
  if (rightValue == null) return -1;
  return leftValue - rightValue;
}

function parseLedgerQuantity(quantityText: string): number {
  return parseInventoryLedgerQuantity(quantityText);
}

function formatInventoryNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatPackageConversionSummary(conversions: InventoryPackageConversion[]) {
  return conversions.map((conversion) => `1${conversion.fromUnit} = ${formatInventoryNumber(conversion.quantity)}${conversion.toUnit}`);
}

function formatMaterialUnitConversions(material: InventoryMaterial) {
  const conversions = formatPackageConversionSummary(material.packageConversions || []);
  return conversions.length ? conversions.join("；") : "—";
}

function formatPrimaryPackageSpec(material: InventoryMaterial, conversions: InventoryPackageConversion[]) {
  const packageUnit = material.auxiliaryUnit || conversions[0]?.fromUnit;
  if (!packageUnit || packageUnit === material.baseUnit) return `1${material.baseUnit}`;
  const factor = calculateInventoryBaseQuantity(1, packageUnit, material.baseUnit, conversions);
  return factor ? `${formatInventoryNumber(factor)}${material.baseUnit}/${packageUnit}` : `1${packageUnit}`;
}

function parseInventoryScrapRemark(remark?: string) {
  const reasonMatch = remark?.match(/报废原因：([^；]+)/);
  const handlingMatch = remark?.match(/处理方式：([^；]+)/);
  return {
    reasonText: reasonMatch?.[1] || "—",
    handlingMethodText: handlingMatch?.[1] || "—"
  };
}

function resolveRiskPrimaryAction(type: InventoryRiskType | InventoryHomeRiskKind) {
  if (type === "负库存") return "发起盘点";
  if (type === "临期") return "发起盘点";
  return "报废";
}

function resolveRiskAuxiliaryAction(_type: InventoryRiskType | InventoryHomeRiskKind) {
  return undefined;
}

function resolveRiskAdviceText(type: InventoryHomeRiskKind) {
  if (type === "负库存") return "账面库存出现负数异常。请立即发起盘点核对实物，修正后即可还原准确的库存数据。";
  if (type === "已过期") return "该批次物料已过有效期，存在安全隐患。建议及时发起报废，处理后将扣减该批次，防止一线误领误用。";
  if (type === "临期") return "物料逼近保质期终点。建议核查实物状态并优先安排出库，抢先消耗以避免资产浪费。";
  return "";
}

function resolveDifferenceHandlingLabel(method?: InventoryDifferenceMethod) {
  if (!method) return "";
  return inventoryDifferenceHandlingOptions.find((option) => option.method === method)?.uiLabel || method;
}

function buildDefaultStocktakeTaskValues(mode: InventoryStocktakeMode): InventoryStocktakeTaskFormValues {
  return {
    name: `${mode === "异常盘点" || mode === "指定物料盘点" ? "异常物料盘点" : mode}-${new Date().toISOString().slice(0, 10).replace(/-/g, "/")}`,
    reason: mode === "异常盘点" || mode === "指定物料盘点" ? "异常复核" : "月度盘点",
    assignee: "当前用户",
    deadline: `${new Date().toISOString().slice(0, 10)} 18:00`,
    showBookStock: true
  };
}

function createInitialStocktakeRecords(): InventoryStocktakeRecord[] {
  const seedSummaries = buildInventorySummaries(inventorySeedMaterials, inventorySeedLots);
  const abnormalRows = buildInventoryStocktakeScope({
    mode: "异常盘点",
    materials: inventorySeedMaterials,
    lots: inventorySeedLots,
    summaries: seedSummaries
  });
  const toolRows = buildInventoryStocktakeScope({
    mode: "指定物料盘点",
    materials: inventorySeedMaterials,
    lots: inventorySeedLots,
    summaries: seedSummaries,
    targetMaterialId: "mat-tool-needle"
  });
  const completedRows = [...abnormalRows, ...toolRows];
  const actualQuantities = completedRows.reduce<Record<string, number>>((values, row) => {
    values[row.id] =
      row.id === "stocktake-material-mat-disinfectant-glutaraldehyde"
        ? 0
        : row.id === "stocktake-material-mat-drug-florfenicol"
          ? 1750
          : row.id === "stocktake-material-mat-tool-needle"
            ? 15
            : row.bookQtyBase;
    return values;
  }, {});
  const transaction = buildInventoryStocktakeTransaction({
    materials: inventorySeedMaterials,
    lots: inventorySeedLots,
    scopeRows: completedRows,
    actualQuantities,
    operator: "张三",
    stocktakeNo: "PD20260624001",
    occurredAt: "2026-06-24 10:45",
    ledgerIdPrefix: "ledger-stocktake-seed"
  });

  return [
    {
      no: "PD20260624001",
      name: "异常物料盘点-2026/06/24",
      mode: "异常盘点",
      materialCount: completedRows.length,
      differenceCount: transaction.summary.adjustmentCount,
      status: "已完成",
      reason: "异常复核",
      assignee: "张三",
      createdAt: "2026-06-24 10:30",
      completedAt: "2026-06-24 10:45",
      scopeRows: completedRows,
      actualQuantities,
      transaction
    },
    {
      no: "PD20260620001",
      name: "药品月度盘点",
      mode: "分类盘点",
      materialCount: 18,
      differenceCount: 1,
      status: "待确认",
      reason: "月度盘点",
      assignee: "李四",
      createdAt: "2026-06-20 09:00",
      scopeRows: [],
      actualQuantities: {}
    },
    {
      no: "PD20260618001",
      name: "工具交接盘点",
      mode: "分类盘点",
      materialCount: 12,
      differenceCount: 2,
      status: "盘点中",
      reason: "交接盘点",
      assignee: "王五",
      createdAt: "2026-06-18 14:10",
      scopeRows: toolRows,
      actualQuantities: {}
    }
  ];
}

export function ConsoleInventoryPage({
  activeModule = "inventory",
  financeBootstrapView = null,
  onFinanceBootstrapHandled,
  onRequestFinance
}: ConsoleInventoryPageProps) {
  const [materials, setMaterials] = useState<InventoryMaterial[]>(initialToleranceResolution.materials);
  const [lots, setLots] = useState<InventoryLot[]>(initialToleranceResolution.lots);
  const [ledgers, setLedgers] = useState<InventoryLedgerRow[]>([
    ...initialToleranceResolution.ledgers,
    ...inventorySeedLedgers
  ]);
  const [inventoryView, setInventoryView] = useState<
    | "home"
    | "ledgers"
    | "detail"
    | "stocktake-execute"
    | "stocktake-confirm"
    | "stocktake-complete"
    | "stocktake-detail"
    | "difference-list"
    | "batch-receive"
    | "outbound-execute"
    | "outbound-confirm"
    | "outbound-detail"
    | "purchase-order-draft"
    | "purchase-order-detail"
    | "finance"
  >(activeModule === "finance" ? "finance" : "home");
  const [activeCategory, setActiveCategory] = useState<InventoryCategory>(inventoryCategoryOrder[0]);
  const [summaryKeyword, setSummaryKeyword] = useState("");
  const [materialStatusFilter, setMaterialStatusFilter] = useState<InventoryMaterialStatusFilter>("启用中");
  const [ledgerPageTab, setLedgerPageTab] = useState<InventoryLedgerPageTabKey>("ledger");
  const [ledgerKeyword, setLedgerKeyword] = useState("");
  const [ledgerDateRange, setLedgerDateRange] = useState<[string, string] | null>(null);
  const [ledgerTypes, setLedgerTypes] = useState<InventoryLedgerType[]>([]);
  const [checkKeyword, setCheckKeyword] = useState("");
  const [checkDateRange, setCheckDateRange] = useState<[string, string] | null>(null);
  const [checkChecker, setCheckChecker] = useState<string | undefined>(undefined);
  const [checkDiffFilter, setCheckDiffFilter] = useState<InventoryCheckDiffFilter>("全部");
  const [expandedCheckRowKeys, setExpandedCheckRowKeys] = useState<string[]>([]);
  const [focusedCheckRecordId, setFocusedCheckRecordId] = useState<string | null>(null);
  const [inboundKeyword, setInboundKeyword] = useState("");
  const [inboundDateRange, setInboundDateRange] = useState<[string, string] | null>(inventoryInboundDefaultDateRange);
  const [inboundTypeFilter, setInboundTypeFilter] = useState<InventoryInboundTypeFilter>("全部");
  const [expandedInboundRowKeys, setExpandedInboundRowKeys] = useState<string[]>([]);
  const [stocktakeMode, setStocktakeMode] = useState<InventoryStocktakeMode>("指定物料盘点");
  const [stocktakeScopeRows, setStocktakeScopeRows] = useState<InventoryStocktakeScopeRow[]>([]);
  const [stocktakeScopeKeyword, setStocktakeScopeKeyword] = useState("");
  const [stocktakeScopeCategory, setStocktakeScopeCategory] = useState<InventoryCategory | "全部">("全部");
  const [stocktakeRiskFilter, setStocktakeRiskFilter] = useState<StocktakeRiskStatus | "全部">("全部");
  const [stocktakeTaskValues, setStocktakeTaskValues] = useState<InventoryStocktakeTaskFormValues | null>(null);
  const [, setStocktakeSubmitted] = useState(false);
  const [stocktakeActuals, setStocktakeActuals] = useState<Record<string, number | undefined>>({});
  const [stocktakeCompleteResult, setStocktakeCompleteResult] = useState<InventoryStocktakeTransaction | null>(null);
  const [selectedStocktakeRecordNo, setSelectedStocktakeRecordNo] = useState<string | null>(null);
  const [stocktakeRecords, setStocktakeRecords] = useState<InventoryStocktakeRecord[]>(createInitialStocktakeRecords);
  const [differences, setDifferences] = useState<InventoryDifferenceRecord[]>([
    ...initialToleranceResolution.pendingDifferences,
    ...initialToleranceResolution.processedDifferences
  ]);
  const [differenceTab, setDifferenceTab] = useState<InventoryDifferenceTab>("pending");
  const [handlingDifferenceId, setHandlingDifferenceId] = useState<string | null>(null);
  const [handleOptionKey, setHandleOptionKey] = useState<string | null>(null);
  const [handleReason, setHandleReason] = useState<string | undefined>(undefined);
  const [handleReasonNote, setHandleReasonNote] = useState("");
  const [handleSupplementAmount, setHandleSupplementAmount] = useState<number | undefined>(undefined);
  const [outboundKeyword, setOutboundKeyword] = useState("");
  const [outboundCategory, setOutboundCategory] = useState<InventoryCategory | "全部">("全部");
  const [outboundQuantities, setOutboundQuantities] = useState<Record<string, number | undefined>>({});
  const [outboundPurpose, setOutboundPurpose] = useState("");
  const [outboundRemark, setOutboundRemark] = useState("");
  const [outboundOrders, setOutboundOrders] = useState<InventoryOutboundOrderRecord[]>([]);
  const [selectedOutboundOrderNo, setSelectedOutboundOrderNo] = useState<string | null>(null);
  const [batchReceiveHeader, setBatchReceiveHeader] = useState<InventoryBatchReceiveHeader>(() => createDefaultBatchReceiveHeader());
  const [batchReceiveEntries, setBatchReceiveEntries] = useState<InventoryBatchReceiveEntry[]>([]);
  const [selectedPurchaseMaterialIds, setSelectedPurchaseMaterialIds] = useState<string[]>([]);
  const [purchaseOrderQuantities, setPurchaseOrderQuantities] = useState<Record<string, number | undefined>>({});
  const [purchaseOrders, setPurchaseOrders] = useState<InventoryPurchaseOrderRecord[]>([]);
  const [selectedPurchaseOrderNo, setSelectedPurchaseOrderNo] = useState<string | null>(null);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const [materialDetailTab, setMaterialDetailTab] = useState<MaterialDetailTabKey>("detail");
  const [materialTrendRange, setMaterialTrendRange] = useState<MaterialTrendRange>("30天");
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [activeHomeRiskType, setActiveHomeRiskType] = useState<InventoryHomeRiskKind | "全部">("全部");
  const [analyticsCategoryFilter, setAnalyticsCategoryFilter] = useState<InventoryAnalyticsCategoryFilter>("全部");
  const [analyticsTimeRange, setAnalyticsTimeRange] = useState<InventoryAnalyticsTimeRange>("本月");
  const [analyticsCustomRange, setAnalyticsCustomRange] = useState<[string, string] | null>(null);
  const [expiredActionLot, setExpiredActionLot] = useState<InventoryLot | null>(null);
  const [editingLotId, setEditingLotId] = useState<string | null>(null);
  const [scrapForm] = Form.useForm<InventoryScrapFormValues>();
  const [lotEditForm] = Form.useForm<InventoryLotEditFormValues>();
  const [editMaterialForm] = Form.useForm<InventoryMaterialEditFormValues>();
  const editBaseUnitValue = Form.useWatch("baseUnit", editMaterialForm) as string | undefined;

  useEffect(() => {
    if (activeModule === "finance") {
      if (financeBootstrapView === "difference-list") {
        setInventoryView("difference-list");
        onFinanceBootstrapHandled?.();
        return;
      }
      setInventoryView((current) => (current === "difference-list" ? current : "finance"));
      return;
    }
    setInventoryView((current) => {
      if (current === "finance" || current === "difference-list") return "home";
      return current;
    });
  }, [activeModule, financeBootstrapView, onFinanceBootstrapHandled]);

  const summaries = useMemo(
    () => buildInventorySummaries(materials, lots, ledgers, { referenceAt: INVENTORY_DEMO_REFERENCE_AT }),
    [ledgers, lots, materials]
  );
  const summaryByMaterialId = useMemo(
    () => new Map(summaries.map((summary) => [summary.materialId, summary])),
    [summaries]
  );
  const recentLedgerMap = useMemo(() => {
    const map = new Map<string, InventoryLedgerRow[]>();
    ledgers.forEach((ledger) => {
      const materialLedgers = map.get(ledger.materialId) || [];
      materialLedgers.push(ledger);
      map.set(ledger.materialId, materialLedgers);
    });
    map.forEach((materialLedgers, materialId) => {
      map.set(
        materialId,
        materialLedgers
          .slice()
          .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
          .slice(0, 3)
      );
    });
    return map;
  }, [ledgers]);
  const categoryTabs = useMemo(
    () => buildInventoryCategoryTabs(summaries, materialStatusFilter),
    [materialStatusFilter, summaries]
  );
  const riskItems = useMemo(
    () => buildInventoryRiskItems(materials, lots, summaries),
    [lots, materials, summaries]
  );
  const filteredLedgers = useMemo(
    () =>
      filterInventoryLedgers({
        ledgers,
        materials,
        keyword: ledgerKeyword,
        dateRange: ledgerDateRange,
        ledgerTypes
      }),
    [ledgerDateRange, ledgerKeyword, ledgerTypes, ledgers, materials]
  );
  const inventoryCheckRecords = inventorySeedCheckRecords;
  const inventoryCheckCheckerOptions = useMemo(
    () =>
      Array.from(new Set(inventoryCheckRecords.map((record) => record.checker))).map((checker) => ({
        label: checker,
        value: checker
      })),
    [inventoryCheckRecords]
  );
  const filteredCheckRecords = useMemo(() => {
    const keyword = checkKeyword.trim();
    return inventoryCheckRecords
      .filter((record) => {
        if (!checkDateRange) return true;
        const checkDate = record.checkTime.slice(0, 10);
        return checkDate >= checkDateRange[0] && checkDate <= checkDateRange[1];
      })
      .filter((record) => !checkChecker || record.checker === checkChecker)
      .filter((record) => {
        if (checkDiffFilter === "有差异") return record.diffItems > 0;
        if (checkDiffFilter === "无差异") return record.diffItems === 0;
        return true;
      })
      .filter((record) => {
        if (!keyword) return true;
        return record.details.some((detail) => isInventoryCheckDetailKeywordMatch(detail, keyword));
      })
      .sort((a, b) => new Date(b.checkTime).getTime() - new Date(a.checkTime).getTime());
  }, [checkChecker, checkDateRange, checkDiffFilter, checkKeyword, inventoryCheckRecords]);
  const inventoryInboundOrders = inventorySeedInboundOrders;
  const filteredInboundOrders = useMemo(() => {
    const keyword = inboundKeyword.trim();
    return inventoryInboundOrders
      .filter((order) => {
        if (!inboundDateRange) return true;
        const inboundDate = order.inboundTime.slice(0, 10);
        return inboundDate >= inboundDateRange[0] && inboundDate <= inboundDateRange[1];
      })
      .filter((order) => inboundTypeFilter === "全部" || order.type === inboundTypeFilter)
      .filter((order) => {
        if (!keyword) return true;
        if (includesInventorySearchKeyword(order.orderNo, keyword)) return true;
        return order.details.some((detail) => includesInventorySearchKeyword(detail.materialName, keyword));
      })
      .sort((a, b) => b.inboundTime.localeCompare(a.inboundTime));
  }, [
    inboundDateRange,
    inboundKeyword,
    inboundTypeFilter,
    inventoryInboundOrders
  ]);
  const detailMatchedCheckRecordIds = useMemo(() => {
    const keyword = checkKeyword.trim();
    if (!keyword) return [];
    return filteredCheckRecords
      .filter((record) => record.details.some((detail) => isInventoryCheckDetailKeywordMatch(detail, keyword)))
      .map((record) => record.id);
  }, [checkKeyword, filteredCheckRecords]);

  useEffect(() => {
    if (ledgerPageTab !== "checks") return;
    if (!checkKeyword.trim()) {
      setFocusedCheckRecordId(null);
      return;
    }
    if (!detailMatchedCheckRecordIds.length) {
      setFocusedCheckRecordId(null);
      return;
    }

    setExpandedCheckRowKeys((current) => Array.from(new Set([...current, ...detailMatchedCheckRecordIds])));
    const firstMatchId = detailMatchedCheckRecordIds[0];
    setFocusedCheckRecordId(firstMatchId);
    window.setTimeout(() => {
      document.querySelector(`[data-row-key="${firstMatchId}"]`)?.scrollIntoView({ block: "center" });
    }, 0);
  }, [checkKeyword, detailMatchedCheckRecordIds, ledgerPageTab]);
  const feedMaterials = useMemo(() => materials.filter((material) => material.category === "饲料"), [materials]);
  const feedMaterialIds = useMemo(() => new Set(feedMaterials.map((material) => material.id)), [feedMaterials]);
  const feedCurrentStockBase = useMemo(
    () =>
      summaries
        .filter((summary) => summary.category === "饲料")
        .reduce((sum, summary) => sum + Math.max(summary.currentStockBase, 0), 0),
    [summaries]
  );
  const feedStockTrendPoints = useMemo<FeedStockTrendPoint[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(today.getDate() - 29);
    const dateList = enumerateDates(formatISODate(start), formatISODate(today));
    const ledgerDeltaByDate = ledgers.reduce(
      (map, ledger) => {
        if (!feedMaterialIds.has(ledger.materialId)) return map;
        const date = ledger.occurredAt.slice(0, 10);
        const quantity = Math.abs(parseLedgerQuantity(ledger.quantityText));
        const entry = map.get(date) || { inbound: 0, outbound: 0, adjustment: 0, net: 0 };
        if (ledger.type === "采购入库" || ledger.type === "入库更正" || ledger.type === "盘盈" || ledger.type === "消耗冲销") {
          entry.inbound += quantity;
          entry.net += quantity;
        } else if (ledger.type === "业务消耗" || ledger.type === "盘亏" || ledger.type === "报废") {
          entry.outbound += quantity;
          entry.net -= quantity;
        } else {
          entry.adjustment += parseLedgerQuantity(ledger.quantityText);
          entry.net += parseLedgerQuantity(ledger.quantityText);
        }
        map.set(date, entry);
        return map;
      },
      new Map<string, { inbound: number; outbound: number; adjustment: number; net: number }>()
    );
    const eodByDate = new Map<string, number>();
    let cursorStock = feedCurrentStockBase;
    for (let index = dateList.length - 1; index >= 0; index -= 1) {
      const date = dateList[index];
      eodByDate.set(date, cursorStock);
      cursorStock -= ledgerDeltaByDate.get(date)?.net || 0;
    }
    return dateList.map((date, index) => {
      const movement = ledgerDeltaByDate.get(date) || { inbound: 0, outbound: 0, adjustment: 0, net: 0 };
      const quantity = eodByDate.get(date) || 0;
      const previousQuantity = index === 0 ? quantity - movement.net : eodByDate.get(dateList[index - 1]) || quantity;
      const changeQuantity = quantity - previousQuantity;
      const previousPositive = previousQuantity > 0 ? previousQuantity : quantity > 0 ? quantity : 1;
      const changeRatio = Math.abs(changeQuantity) / previousPositive;
      return {
        date,
        quantity,
        inboundQuantity: movement.inbound,
        outboundQuantity: movement.outbound,
        adjustmentQuantity: movement.adjustment,
        changeQuantity,
        anomaly: changeRatio >= 0.3 ? (changeQuantity >= 0 ? "increase" : "drop") : undefined
      };
    });
  }, [feedCurrentStockBase, feedMaterialIds, ledgers]);
  const feedStockTrendLatest = feedStockTrendPoints[feedStockTrendPoints.length - 1] || null;
  const feedStockTrendPrevious = feedStockTrendPoints[feedStockTrendPoints.length - 2] || null;
  const feedStockYesterdayChange = feedStockTrendLatest && feedStockTrendPrevious
    ? feedStockTrendLatest.quantity - feedStockTrendPrevious.quantity
    : 0;
  const feedStockDailyOutboundAverage = useMemo(() => {
    const totalOutbound = feedStockTrendPoints.reduce((sum, point) => sum + point.outboundQuantity, 0);
    return totalOutbound / Math.max(feedStockTrendPoints.length, 1);
  }, [feedStockTrendPoints]);
  const feedStockAvailableDays =
    feedStockDailyOutboundAverage > 0 && feedStockTrendLatest
      ? Math.max(0, Math.floor(feedStockTrendLatest.quantity / feedStockDailyOutboundAverage))
      : null;
  const currentStocktakeNo = stocktakeTaskValues ? `PD${new Date().toISOString().slice(0, 10).replace(/-/g, "")}002` : "";
  const stocktakeRiskMap = useMemo(() => {
    const map = new Map<string, StocktakeRiskStatus[]>();
    riskItems.forEach((item) => {
      const status = item.type === "过期" ? "已过期" : item.type;
      const statuses = map.get(item.materialId) || [];
      if (!statuses.includes(status)) statuses.push(status);
      map.set(item.materialId, statuses);
    });
    return map;
  }, [riskItems]);
  const filteredStocktakeScopeRows = useMemo(() => {
    const keyword = stocktakeScopeKeyword.trim();
    return stocktakeScopeRows.filter((row) => {
      if (stocktakeScopeCategory !== "全部" && row.category !== stocktakeScopeCategory) return false;
      const riskStatuses = stocktakeRiskMap.get(row.materialId) || [];
      if (stocktakeRiskFilter !== "全部" && !riskStatuses.includes(stocktakeRiskFilter)) return false;
      if (!keyword) return true;
      return `${row.materialName}${row.brand}`.includes(keyword);
    });
  }, [stocktakeRiskFilter, stocktakeRiskMap, stocktakeScopeCategory, stocktakeScopeKeyword, stocktakeScopeRows]);
  const selectedStocktakeScopeRows = useMemo(() => {
    return stocktakeScopeRows;
  }, [stocktakeScopeRows]);
  const stocktakeDifferenceRows = selectedStocktakeScopeRows
    .map((row) => ({
      ...row,
      actualQty: stocktakeActuals[row.id],
      diff:
        typeof stocktakeActuals[row.id] === "number"
          ? Number(stocktakeActuals[row.id]) - row.bookQtyBase
          : undefined
    }))
    .filter((row) => row.diff !== undefined);
  const stocktakeChangedRows = stocktakeDifferenceRows.filter((row) => row.diff !== 0);
  const stocktakeDiffSummary = stocktakeChangedRows.reduce(
    (counts, row) => {
      if (row.diff === 0) counts.noDifferenceCount += 1;
      if (row.diff !== undefined && row.diff > 0) counts.gainCount += 1;
      if (row.diff !== undefined && row.diff < 0) counts.lossCount += 1;
      return counts;
    },
    { noDifferenceCount: 0, gainCount: 0, lossCount: 0 }
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

  const feedAvailableDaysMap = useMemo(() => {
    const map = new Map<string, FeedEstimatedAvailableDaysResult>();
    filteredSummaries.forEach((summary) => {
      if (!shouldShowEstimatedAvailableDays(summary.category)) return;
      map.set(
        summary.materialId,
        buildFeedEstimatedAvailableDays(summary.currentStockBase, summary.materialId, ledgers, {
          referenceAt: INVENTORY_DEMO_REFERENCE_AT
        })
      );
    });
    return map;
  }, [filteredSummaries, ledgers]);

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
          lotNo: item.lotNo,
          valueText: item.valueText,
          dateText: type === "临期" && item.expiryDate ? item.expiryDate : undefined,
          detailText: item.lotNo ? `批次 ${item.lotNo}` : "库存异常",
          adviceText: resolveRiskAdviceText(type),
          actionText: resolveRiskPrimaryAction(item.type),
          auxiliaryActionText: resolveRiskAuxiliaryAction(item.type),
          priority: item.priority
        };
      })
      .sort((a, b) => a.priority - b.priority || a.materialName.localeCompare(b.materialName, "zh-Hans-CN"));
  }, [riskItems]);

  const homeActionItems: Array<{ key: InventoryHomeRiskKind; label: string; count: number }> = [
    { key: "已过期", label: "已过期", count: riskMaterialRows.filter((item) => item.type === "已过期").length },
    { key: "临期", label: "临期库存", count: riskMaterialRows.filter((item) => item.type === "临期").length },
    { key: "负库存", label: "负库存", count: riskMaterialRows.filter((item) => item.type === "负库存").length }
  ];
  const filteredHomeRiskRows =
    activeHomeRiskType === "全部"
      ? riskMaterialRows.slice(0, 5)
      : riskMaterialRows.filter((item) => item.type === activeHomeRiskType);
  const materialMap = useMemo(() => new Map(materials.map((material) => [material.id, material])), [materials]);
  const summaryMap = useMemo(() => new Map(summaries.map((summary) => [summary.materialId, summary])), [summaries]);
  const selectedPurchaseOrderRows = useMemo<InventoryPurchaseOrderLine[]>(() => {
    return selectedPurchaseMaterialIds.reduce<InventoryPurchaseOrderLine[]>((rows, materialId) => {
      const material = materialMap.get(materialId);
      if (!material || getInventoryMaterialStatus(material) === "已停用") return rows;
      const summary = summaryMap.get(materialId);
      const currentStockBase = summary?.currentStockBase ?? 0;
      const lastPurchaseInfo = resolveInventoryLastPurchaseInfo(material, lots, ledgers);
      rows.push({
        materialId,
        materialName: material.materialName,
        brand: material.brand,
        category: material.category,
        baseUnit: material.baseUnit,
        currentStockText: formatInventoryQty(currentStockBase, material.baseUnit),
        estimatedAvailableDays:
          summary && shouldShowEstimatedAvailableDays(summary.category)
            ? buildFeedEstimatedAvailableDays(currentStockBase, materialId, ledgers, {
                referenceAt: INVENTORY_DEMO_REFERENCE_AT
              })
            : undefined,
        lastPurchaseAt: lastPurchaseInfo.occurredAt,
        lastPurchaseQtyText: lastPurchaseInfo.quantityText,
        lastPurchaseLotNo: lastPurchaseInfo.lotNo,
        lastPurchaseSupplier: lastPurchaseInfo.supplier,
        lastPurchaseSource: lastPurchaseInfo.source,
        quantityBase:
          purchaseOrderQuantities[materialId] !== undefined
            ? purchaseOrderQuantities[materialId]
            : lastPurchaseInfo.quantityBase || undefined
      });
      return rows;
    }, []);
  }, [ledgers, lots, materialMap, purchaseOrderQuantities, selectedPurchaseMaterialIds, summaryMap]);
  const selectedPurchaseOrder = useMemo(
    () => purchaseOrders.find((order) => order.no === selectedPurchaseOrderNo) || null,
    [purchaseOrders, selectedPurchaseOrderNo]
  );
  const lotByNo = useMemo(() => new Map(lots.map((lot) => [lot.lotNo, lot])), [lots]);
  const materialAverageCostMap = useMemo(() => {
    return materials.reduce((map, material) => {
      const materialLots = lots.filter((lot) => lot.materialId === material.id && lot.convertedQtyBase > 0);
      const totalQuantity = materialLots.reduce((sum, lot) => sum + lot.convertedQtyBase, 0);
      const totalAmount = materialLots.reduce((sum, lot) => sum + lot.baseUnitCost * lot.convertedQtyBase, 0);
      map.set(material.id, totalQuantity > 0 ? totalAmount / totalQuantity : 0);
      return map;
    }, new Map<string, number>());
  }, [lots, materials]);
  const inventoryTotalValue = useMemo(
    () => lots.reduce((sum, lot) => sum + Math.max(lot.remainingQtyBase, 0) * lot.baseUnitCost, 0),
    [lots]
  );
  const resolveLedgerConsumptionCost = (ledger: InventoryLedgerRow) => {
    const lot = ledger.lotNo ? lotByNo.get(ledger.lotNo) : undefined;
    const baseUnitCost = lot?.baseUnitCost || materialAverageCostMap.get(ledger.materialId) || 0;
    const sign = ledger.type === "消耗冲销" ? -1 : 1;
    return sign * Math.abs(parseLedgerQuantity(ledger.quantityText)) * baseUnitCost;
  };
  const inventoryValueShareRows = useMemo<InventoryValueShareRow[]>(() => {
    const totalValue = Math.max(inventoryTotalValue, 0);
    return inventoryAmountChartCategories.map((category) => {
      const amount = lots.reduce((sum, lot) => {
        const material = materialMap.get(lot.materialId);
        if (!material || material.category !== category) return sum;
        return sum + Math.max(lot.remainingQtyBase, 0) * lot.baseUnitCost;
      }, 0);
      return {
        category,
        amount,
        share: totalValue > 0 ? amount / totalValue : 0,
        color: inventoryCategoryChartColors[category]
      };
    });
  }, [inventoryTotalValue, lots, materialMap]);
  const sortedInventoryValueShareRows = useMemo(
    () => inventoryValueShareRows.slice().sort((a, b) => b.amount - a.amount),
    [inventoryValueShareRows]
  );
  const analyticsDateWindow = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (analyticsTimeRange === "近7天") {
      const start = new Date(today);
      start.setDate(today.getDate() - 6);
      return { start: formatISODate(start), end: formatISODate(today), label: "近 7 天" };
    }
    if (analyticsTimeRange === "近30天") {
      const start = new Date(today);
      start.setDate(today.getDate() - 29);
      return { start: formatISODate(start), end: formatISODate(today), label: "近 30 天" };
    }
    if (analyticsTimeRange === "上月") {
      const firstThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastPrevMonth = new Date(firstThisMonth.getTime() - 86_400_000);
      const firstPrevMonth = new Date(lastPrevMonth.getFullYear(), lastPrevMonth.getMonth(), 1);
      return { start: formatISODate(firstPrevMonth), end: formatISODate(lastPrevMonth), label: "上月" };
    }
    if (analyticsTimeRange === "自定义" && analyticsCustomRange) {
      return {
        start: analyticsCustomRange[0],
        end: analyticsCustomRange[1],
        label: `${formatMonthDay(analyticsCustomRange[0])} - ${formatMonthDay(analyticsCustomRange[1])}`
      };
    }
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    return { start: formatISODate(firstDay), end: formatISODate(today), label: "本月" };
  }, [analyticsTimeRange, analyticsCustomRange]);
  const consumptionWindowLedgers = useMemo(
    () =>
      ledgers.filter((ledger) => {
        if (ledger.type !== "业务消耗" && ledger.type !== "消耗冲销") return false;
        const date = ledger.occurredAt.slice(0, 10);
        if (date < analyticsDateWindow.start || date > analyticsDateWindow.end) return false;
        if (analyticsCategoryFilter === "全部") return true;
        return materialMap.get(ledger.materialId)?.category === analyticsCategoryFilter;
      }),
    [analyticsCategoryFilter, analyticsDateWindow, ledgers, materialMap]
  );
  const consumptionTrendPoints = useMemo<InventoryTrendPoint[]>(() => {
    const amountsByDate = consumptionWindowLedgers.reduce((map, ledger) => {
      const date = ledger.occurredAt.slice(0, 10);
      map.set(date, (map.get(date) || 0) + resolveLedgerConsumptionCost(ledger));
      return map;
    }, new Map<string, number>());
    return enumerateDates(analyticsDateWindow.start, analyticsDateWindow.end).map((date) => ({
      date,
      label: date.slice(8),
      amount: amountsByDate.get(date) || 0
    }));
  }, [analyticsDateWindow, consumptionWindowLedgers, lotByNo, materialAverageCostMap]);
  const consumptionTrendTotal = useMemo(
    () => consumptionTrendPoints.reduce((sum, point) => sum + point.amount, 0),
    [consumptionTrendPoints]
  );
  const consumptionTrendAverage = useMemo(
    () => (consumptionTrendPoints.length ? consumptionTrendTotal / consumptionTrendPoints.length : 0),
    [consumptionTrendPoints, consumptionTrendTotal]
  );
  const consumptionTrendPeak = useMemo(
    () =>
      consumptionTrendPoints.reduce<InventoryTrendPoint | null>(
        (peak, point) => (!peak || point.amount > peak.amount ? point : peak),
        null
      ),
    [consumptionTrendPoints]
  );
  const feedConsumptionWeight = useMemo(
    () =>
      consumptionWindowLedgers.reduce((sum, ledger) => {
        const material = materialMap.get(ledger.materialId);
        if (material?.category !== "饲料" || material.baseUnit !== "kg") return sum;
        const sign = ledger.type === "消耗冲销" ? -1 : 1;
        return sum + sign * Math.abs(parseLedgerQuantity(ledger.quantityText));
      }, 0),
    [consumptionWindowLedgers, materialMap]
  );
  const windowTopSpendRows = useMemo<InventoryTopSpendRow[]>(() => {
    if (analyticsCategoryFilter === "全部") {
      const amountByCategory = consumptionWindowLedgers.reduce((map, ledger) => {
        const category = materialMap.get(ledger.materialId)?.category || "其他";
        map.set(category, (map.get(category) || 0) + resolveLedgerConsumptionCost(ledger));
        return map;
      }, new Map<InventoryCategory, number>());
      const totalAmount = Array.from(amountByCategory.values()).reduce((sum, amount) => sum + amount, 0);
      return Array.from(amountByCategory.entries())
        .map(([category, amount]) => ({
          id: `category-${category}`,
          materialName: category,
          category,
          amount,
          share: totalAmount > 0 ? amount / totalAmount : 0,
          color: inventoryCategoryChartColors[category],
          isCategorySummary: true
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);
    }

    const amountByMaterial = consumptionWindowLedgers.reduce((map, ledger) => {
      if (materialMap.get(ledger.materialId)?.category !== analyticsCategoryFilter) return map;
      map.set(ledger.materialId, (map.get(ledger.materialId) || 0) + resolveLedgerConsumptionCost(ledger));
      return map;
    }, new Map<string, number>());
    const totalAmount = Array.from(amountByMaterial.values()).reduce((sum, amount) => sum + amount, 0);
    return Array.from(amountByMaterial.entries())
      .map(([materialId, amount]) => {
        const material = materialMap.get(materialId);
        return {
          id: materialId,
          materialName: material?.materialName || "未知物料",
          category: material?.category || "其他",
          amount,
          share: totalAmount > 0 ? amount / totalAmount : 0,
          color: inventoryCategoryChartColors[material?.category || "其他"]
        };
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [analyticsCategoryFilter, consumptionWindowLedgers, lotByNo, materialAverageCostMap, materialMap]);
  const analyticsFilterSummaryLabel = analyticsCategoryFilter === "全部" ? "全部分类" : analyticsCategoryFilter;
  const analyticsRangeLabel = analyticsDateWindow.label;
  const largestInventoryShare = Math.max(...sortedInventoryValueShareRows.map((row) => row.share), 0);

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
  const materialTrendDays = materialTrendRange === "7天" ? 7 : materialTrendRange === "90天" ? 90 : 30;
  const selectedMaterialStockStatus =
    selectedSummary && selectedMaterialLots.length
      ? resolveMaterialDetailStockStatus(selectedSummary, selectedMaterialLots)
      : selectedSummary
        ? resolveMaterialDetailStockStatus(selectedSummary, [])
        : null;
  const selectedInventoryValue = selectedMaterialLots.reduce(
    (sum, lot) => sum + Math.max(lot.remainingQtyBase, 0) * lot.baseUnitCost,
    0
  );
  const selectedConsumptionQty30Days = selectedMaterialConsumptionLedgers
    .filter((ledger) => new Date().getTime() - new Date(ledger.occurredAt).getTime() <= 30 * 24 * 60 * 60 * 1000)
    .reduce((sum, ledger) => sum + Math.abs(parseLedgerQuantity(ledger.quantityText)), 0);
  const selectedAverageDailyConsumption = selectedConsumptionQty30Days / 30;
  const selectedEstimatedAvailableDays =
    selectedSummary && selectedAverageDailyConsumption > 0
      ? Math.max(0, Math.floor(selectedSummary.currentStockBase / selectedAverageDailyConsumption))
      : null;
  const selectedMaterialTrendPoints = useMemo<MaterialStockTrendPoint[]>(() => {
    if (!selectedSummary) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(today.getDate() - (materialTrendDays - 1));
    const dateList = enumerateDates(formatISODate(start), formatISODate(today));
    const ledgerDeltaByDate = selectedMaterialLedgers.reduce(
      (map, ledger) => {
        const date = ledger.occurredAt.slice(0, 10);
        if (!dateList.includes(date)) return map;
        const signedQuantity = parseLedgerQuantity(ledger.quantityText);
        const quantity = Math.abs(signedQuantity);
        const entry = map.get(date) || { inbound: 0, outbound: 0, adjustment: 0, scrap: 0, net: 0 };
        if (ledger.type === "采购入库" || ledger.type === "入库更正" || ledger.type === "盘盈" || ledger.type === "消耗冲销") {
          entry.inbound += quantity;
          entry.net += quantity;
        } else if (ledger.type === "业务消耗" || ledger.type === "盘亏") {
          entry.outbound += quantity;
          entry.net -= quantity;
        } else if (ledger.type === "报废") {
          entry.scrap += quantity;
          entry.net -= quantity;
        } else {
          entry.adjustment += signedQuantity;
          entry.net += signedQuantity;
        }
        map.set(date, entry);
        return map;
      },
      new Map<string, { inbound: number; outbound: number; adjustment: number; scrap: number; net: number }>()
    );
    const eodByDate = new Map<string, number>();
    let cursorStock = selectedSummary.currentStockBase;
    for (let index = dateList.length - 1; index >= 0; index -= 1) {
      const date = dateList[index];
      eodByDate.set(date, cursorStock);
      cursorStock -= ledgerDeltaByDate.get(date)?.net || 0;
    }
    return dateList.map((date) => {
      const movement = ledgerDeltaByDate.get(date) || { inbound: 0, outbound: 0, adjustment: 0, scrap: 0, net: 0 };
      return {
        date,
        quantity: eodByDate.get(date) || 0,
        inboundQuantity: movement.inbound,
        outboundQuantity: movement.outbound,
        adjustmentQuantity: movement.adjustment,
        scrapQuantity: movement.scrap,
        hasInbound: movement.inbound > 0,
        hasOutbound: movement.outbound > 0,
        hasAdjustment: movement.adjustment !== 0,
        hasScrap: movement.scrap > 0
      };
    });
  }, [materialTrendDays, selectedMaterialLedgers, selectedSummary]);
  const batchReceiveSubmittingEntries = batchReceiveEntries.filter(isBatchReceiveEntrySubmitting);
  const batchReceiveReadyEntries = batchReceiveEntries.filter((entry) =>
    isBatchReceiveEntryReady(entry, materials)
  );
  const outboundScopeRows = useMemo<InventoryOutboundScopeRow[]>(() => {
    return summaries
      .filter((summary) => summary.materialStatus === "启用中")
      .map((summary) => ({
        id: `outbound-${summary.materialId}`,
        materialId: summary.materialId,
        materialName: summary.materialName,
        brand: summary.brand,
        category: summary.category,
        baseUnit: summary.baseUnit,
        currentStockBase: summary.currentStockBase,
        nearestExpiryDate: summary.nearestExpiryDate,
        stockRisk: summary.stockRisk,
        materialStatus: summary.materialStatus
      }))
      .sort(
        (a, b) =>
          inventoryCategoryOrder.indexOf(a.category) - inventoryCategoryOrder.indexOf(b.category) ||
          a.materialName.localeCompare(b.materialName, "zh-Hans-CN")
      );
  }, [summaries]);
  const filteredOutboundRows = useMemo(() => {
    const keyword = outboundKeyword.trim();
    return outboundScopeRows.filter((row) => {
      if (outboundCategory !== "全部" && row.category !== outboundCategory) return false;
      if (!keyword) return true;
      return `${row.materialName}${row.brand}`.includes(keyword);
    });
  }, [outboundCategory, outboundKeyword, outboundScopeRows]);
  const outboundSelectedRows = useMemo<InventoryOutboundOrderLine[]>(() => {
    return outboundScopeRows.reduce<InventoryOutboundOrderLine[]>((rows, row) => {
      const quantity = outboundQuantities[row.materialId];
      if (typeof quantity !== "number" || quantity <= 0) return rows;
      rows.push({
        ...row,
        outboundQuantity: quantity,
        afterStockBase: row.currentStockBase - quantity,
        ledgerCount: 0
      });
      return rows;
    }, []);
  }, [outboundQuantities, outboundScopeRows]);
  const selectedOutboundOrder = selectedOutboundOrderNo
    ? outboundOrders.find((order) => order.no === selectedOutboundOrderNo) || null
    : null;
  const selectedRiskMessages =
    selectedSummary && selectedMaterial
      ? [
          selectedSummary.currentStockBase < 0
            ? `负库存：当前库存 ${formatInventoryQty(selectedSummary.currentStockBase, selectedSummary.baseUnit)}，请补录入库或修正库存流水。`
            : "",
          ...selectedMaterialLots
            .filter((lot) => lot.status === "临期" && lot.remainingQtyBase > 0)
            .map((lot) => `临期批次：${lot.lotNo} 将于 ${lot.expiryDate} 到期，请关注到期风险。`),
          ...selectedMaterialLots
            .filter((lot) => lot.status === "过期" && lot.remainingQtyBase > 0)
            .map((lot) => `过期库存：${lot.lotNo} 已过期，剩余 ${formatInventoryQty(lot.remainingQtyBase, selectedSummary.baseUnit)}。`),
          isLongUnstocked(selectedMaterial.lastStocktakeAt)
            ? `长期未盘点：最近盘点时间为 ${formatInventoryDate(selectedMaterial.lastStocktakeAt)}，已超过 ${STOCKTAKE_RISK_DAYS} 天。`
            : ""
        ].filter((message): message is string => Boolean(message))
      : [];
  const openPurchaseOrderDraft = () => {
    const enabledSelectedIds = selectedPurchaseMaterialIds.filter((materialId) => {
      const material = materialMap.get(materialId);
      return material && getInventoryMaterialStatus(material) === "启用中";
    });
    if (!enabledSelectedIds.length) {
      message.warning("请先选择需要采购的物料。");
      return;
    }

    const nextQuantities = enabledSelectedIds.reduce<Record<string, number | undefined>>((values, materialId) => {
      const material = materialMap.get(materialId);
      if (!material) return values;
      const lastPurchaseInfo = resolveInventoryLastPurchaseInfo(material, lots, ledgers);
      values[materialId] = lastPurchaseInfo.quantityBase > 0 ? lastPurchaseInfo.quantityBase : undefined;
      return values;
    }, {});
    setSelectedPurchaseMaterialIds(enabledSelectedIds);
    setPurchaseOrderQuantities(nextQuantities);
    setSelectedPurchaseOrderNo(null);
    setInventoryView("purchase-order-draft");
  };

  const submitPurchaseOrder = () => {
    if (!selectedPurchaseOrderRows.length) {
      message.error("请先选择需要采购的物料。");
      return;
    }

    const invalidLine = selectedPurchaseOrderRows.find((row) => !row.quantityBase || row.quantityBase <= 0);
    if (invalidLine) {
      message.error(`${invalidLine.materialName} 的采购数量必须大于 0。`);
      return;
    }

    const todayKey = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const orderNo = `CG${todayKey}-${String(purchaseOrders.length + 1).padStart(3, "0")}`;
    const createdAt = `${new Date().toISOString().slice(0, 10)} 14:00`;
    const nextOrder: InventoryPurchaseOrderRecord = {
      no: orderNo,
      createdAt,
      lines: selectedPurchaseOrderRows.map((row) => ({
        ...row,
        quantityBase: row.quantityBase || 0
      }))
    };

    setPurchaseOrders((prev) => [nextOrder, ...prev]);
    setSelectedPurchaseOrderNo(orderNo);
    setInventoryView("purchase-order-detail");
    setSelectedPurchaseMaterialIds([]);
    setPurchaseOrderQuantities({});
    message.success(`采购单 ${orderNo} 已生成`);
  };

  const openCategory = (category: InventoryCategory, keyword = "") => {
    setActiveCategory(category);
    setSummaryKeyword(keyword);
  };

  const openMaterialDetail = (materialId: string, tab: MaterialDetailTabKey = "detail") => {
    setSelectedMaterialId(materialId);
    setMaterialDetailTab(tab);
    setInventoryView("detail");
  };

  const openDifferenceMaterialLedger = (materialId: string) => {
    closeDifferenceHandler();
    openMaterialDetail(materialId, "ledger");
  };

  const openExpiredScrapModal = (lot: InventoryLot | null) => {
    if (!lot) return;
    setExpiredActionLot(lot);
    scrapForm.setFieldsValue({
      scrapQuantity: lot.remainingQtyBase,
      reason: lot.status === "过期" ? "过期/变质" : undefined,
      handlingMethod: "无害化处理"
    });
  };

  const openLotEditModal = (lot: InventoryLot) => {
    setEditingLotId(lot.id);
    lotEditForm.setFieldsValue({
      expiryDate: lot.expiryDate,
      supplierBatchNo: lot.supplierBatchNo,
      note: lot.note
    });
  };

  const closeLotEditModal = () => {
    setEditingLotId(null);
    lotEditForm.resetFields();
  };

  const submitLotEdit = async () => {
    if (!editingLotId) return;
    const values = await lotEditForm.validateFields();
    setLots((prev) =>
      prev.map((lot) =>
        lot.id === editingLotId
          ? {
              ...lot,
              expiryDate: values.expiryDate?.trim() || undefined,
              supplierBatchNo: values.supplierBatchNo?.trim() || undefined,
              note: values.note?.trim() || undefined
            }
          : lot
      )
    );
    closeLotEditModal();
    message.success("批次信息已更新");
  };

  const openStocktakeScope = () => {
    const effectiveMode: InventoryStocktakeMode = "指定物料盘点";
    const rows = buildInventoryStocktakeScope({
      mode: effectiveMode,
      materials,
      lots,
      summaries
    });
    setStocktakeMode(effectiveMode);
    setStocktakeScopeRows(rows);
    setStocktakeScopeKeyword("");
    setStocktakeScopeCategory("全部");
    setStocktakeRiskFilter("全部");
    setStocktakeActuals({});
    setStocktakeTaskValues(buildDefaultStocktakeTaskValues(effectiveMode));
    setStocktakeCompleteResult(null);
    setInventoryView("stocktake-execute");
  };

  const validateStocktakeExecution = () => {
    for (const row of stocktakeDifferenceRows) {
      const actualQty = stocktakeActuals[row.id];
      if (actualQty !== undefined && actualQty < 0) {
        message.error("盘点库存不能小于 0。");
        return false;
      }
    }
    if (!stocktakeChangedRows.length) {
      message.info("本次没有填写发生变化的库存。");
      return false;
    }
    return true;
  };

  const submitStocktakeExecution = () => {
    if (!validateStocktakeExecution()) return;
    setStocktakeSubmitted(true);
    setInventoryView("stocktake-confirm");
  };

  const confirmStocktakeAdjustment = () => {
    if (!validateStocktakeExecution()) return;
    const effectiveStocktakeValues = stocktakeTaskValues || buildDefaultStocktakeTaskValues(stocktakeMode);
    const stocktakeNo = currentStocktakeNo || `PD${new Date().toISOString().slice(0, 10).replace(/-/g, "")}002`;
    const occurredAt = `${new Date().toISOString().slice(0, 10)} 10:45`;
    try {
      const changedActualQuantities = Object.fromEntries(
        stocktakeChangedRows.map((row) => [row.id, row.actualQty])
      );
      const transaction = buildInventoryStocktakeTransaction({
        materials,
        lots,
        scopeRows: stocktakeChangedRows,
        actualQuantities: changedActualQuantities,
        operator: effectiveStocktakeValues.assignee,
        stocktakeNo,
        occurredAt,
        ledgerIdPrefix: `ledger-stocktake-${Date.now()}`
      });
      setMaterials(transaction.materials);
      setLots(transaction.lots);
      setLedgers((prev) => [...transaction.ledgers, ...prev]);
      setStocktakeCompleteResult(transaction);
      const nextRecord: InventoryStocktakeRecord = {
        no: stocktakeNo,
        name: `库存盘点-${new Date().toISOString().slice(0, 10).replace(/-/g, "/")}`,
        mode: stocktakeMode,
        materialCount: stocktakeScopeRows.length,
        differenceCount: transaction.summary.adjustmentCount,
        status: "已完成",
        reason: "库存修正",
        assignee: effectiveStocktakeValues.assignee,
        createdAt: occurredAt.replace("10:45", "10:30"),
        completedAt: occurredAt,
        scopeRows: stocktakeChangedRows,
        actualQuantities: Object.fromEntries(
          Object.entries(stocktakeActuals).filter((entry): entry is [string, number] => typeof entry[1] === "number")
        ),
        transaction
      };
      setStocktakeRecords((prev) => [nextRecord, ...prev]);
      setSelectedStocktakeRecordNo(stocktakeNo);
      setInventoryView("stocktake-complete");
      message.success("盘点已确认，新库存已生效");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "盘点提交失败，请检查数据。");
    }
  };

  const pendingDifferences = useMemo(
    () => differences.filter((item) => item.status === "待处理"),
    [differences]
  );
  const processedDifferences = useMemo(
    () => differences.filter((item) => item.status === "已处理"),
    [differences]
  );
  const handlingDifference = useMemo(
    () => differences.find((item) => item.id === handlingDifferenceId) || null,
    [differences, handlingDifferenceId]
  );
  const handlingOption = useMemo(
    () => inventoryDifferenceHandlingOptions.find((item) => item.key === handleOptionKey) || null,
    [handleOptionKey]
  );
  const handlingMethodMeta = useMemo(
    () => inventoryDifferenceMethodMetas.find((item) => item.method === handlingOption?.method) || null,
    [handlingOption]
  );
  const canSubmitDifferenceResolution = Boolean(
    handlingDifference &&
    handlingOption &&
    handleReason &&
    (handleReason !== "其他" || handleReasonNote.trim()) &&
    (!handlingOption.requiredSupplements.includes("amount") || (handleSupplementAmount && handleSupplementAmount > 0))
  );

  const resetDifferenceHandlerInputs = () => {
    setHandleOptionKey(null);
    setHandleReason(undefined);
    setHandleReasonNote("");
    setHandleSupplementAmount(undefined);
  };
  const selectDifferenceHandlingOption = (optionKey: string) => {
    setHandleOptionKey(optionKey);
    setHandleReason(undefined);
    setHandleReasonNote("");
    setHandleSupplementAmount(undefined);
  };
  const openDifferenceHandler = (difference: InventoryDifferenceRecord) => {
    setHandlingDifferenceId(difference.id);
    resetDifferenceHandlerInputs();
  };
  const closeDifferenceHandler = () => {
    setHandlingDifferenceId(null);
    resetDifferenceHandlerInputs();
  };
  const submitDifferenceResolution = () => {
    if (!handlingDifference || !handlingOption) {
      message.error("请选择差异处理方式。");
      return;
    }
    if (!handleReason) {
      message.error("请选择处理原因。");
      return;
    }
    if (handleReason === "其他" && !handleReasonNote.trim()) {
      message.error("选择其他原因时，请填写原因备注。");
      return;
    }
    if (handlingOption.requiredSupplements.includes("amount") && (!handleSupplementAmount || handleSupplementAmount <= 0)) {
      message.error("请填写补录金额，且金额必须大于 0。");
      return;
    }
    const occurredAt = `${new Date().toISOString().slice(0, 10)} 11:20`;
    try {
      const resolution = buildInventoryDifferenceResolution({
        record: handlingDifference,
        method: handlingOption.method,
        materials,
        lots,
        ledgers,
        supplementAmount: handleSupplementAmount,
        operator: "当前用户",
        occurredAt,
        ledgerIdPrefix: `ledger-diff-${Date.now()}`
      });
      const reasonRemark = [
        `处理方式：${handlingOption.uiLabel}`,
        `原因：${handleReason}`,
        handleReasonNote.trim() ? `备注：${handleReasonNote.trim()}` : "",
        handleSupplementAmount !== undefined ? `补录金额：${handleSupplementAmount}元` : ""
      ].filter(Boolean).join("；");
      const ledgersWithReason = resolution.ledgers.map((ledger) => ({
        ...ledger,
        remark: [ledger.remark, reasonRemark].filter(Boolean).join("；")
      }));
      setMaterials(resolution.materials);
      setLots(resolution.lots);
      setLedgers((prev) => [...ledgersWithReason, ...prev]);
      setDifferences((prev) =>
        prev.map((item) =>
          item.id === handlingDifference.id
            ? {
                ...item,
                status: "已处理",
                method: handlingOption.method,
                relatedLotNo: resolution.ledgers[0]?.lotNo,
                handlingOptionLabel: handlingOption.uiLabel,
                handlingReason: handleReason,
                handlingReasonNote: handleReasonNote.trim() || undefined,
                supplementAmount: handleSupplementAmount,
                financeStatus: resolution.financeStatus,
                resultLedgerIds: ledgersWithReason.map((ledger) => ledger.id),
                processedAt: occurredAt,
                processedBy: "当前用户"
              }
            : item
        )
      );
      setDifferenceTab("processed");
      closeDifferenceHandler();
      message.success("差异已处理，库存流水已生成");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "差异处理失败，请检查数据。");
    }
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
        : "启用后，该物料将重新支持入库和新任务选择。请确认是否启用。",
      okText: isDisabling ? "确认停用" : "确认启用",
      cancelText: "取消",
      okButtonProps: isDisabling ? { danger: true } : undefined,
      onOk: () => {
        setMaterials((prev) => toggleInventoryMaterialStatus(prev, materialId, nextStatus));
        message.success(isDisabling ? "物料已停用" : "物料已启用");
      }
    });
  };

  const resetOutboundState = () => {
    setOutboundKeyword("");
    setOutboundCategory("全部");
    setOutboundQuantities({});
    setOutboundPurpose("");
    setOutboundRemark("");
  };

  const openOutboundExecution = () => {
    resetOutboundState();
    setInventoryView("outbound-execute");
  };

  const submitOutboundExecution = () => {
    if (!outboundSelectedRows.length) {
      message.info("请至少填写一种物料的出库数量。");
      return;
    }
    const invalidRow = outboundSelectedRows.find((row) => row.outboundQuantity <= 0);
    if (invalidRow) {
      message.error(`${invalidRow.materialName} 的出库数量必须大于 0。`);
      return;
    }
    if (!outboundPurpose.trim()) {
      message.error("请填写领用用途。");
      return;
    }
    if (outboundRemark.length > 200) {
      message.error("备注不能超过 200 字。");
      return;
    }
    setInventoryView("outbound-confirm");
  };

  const confirmOutboundOrder = () => {
    if (!outboundSelectedRows.length) {
      message.info("请至少填写一种物料的出库数量。");
      setInventoryView("outbound-execute");
      return;
    }
    if (!outboundPurpose.trim()) {
      message.error("请填写领用用途。");
      setInventoryView("outbound-execute");
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const todayKey = today.replace(/-/g, "");
    const outboundNo = `CK${todayKey}-${String(outboundOrders.length + 1).padStart(3, "0")}`;
    let nextMaterials = materials;
    let nextLots = lots;
    const nextLedgers: InventoryLedgerRow[] = [];
    const nextLines: InventoryOutboundOrderLine[] = [];

    try {
      outboundSelectedRows.forEach((row, index) => {
        const transaction = buildInventoryOutboundTransaction({
          materials: nextMaterials,
          lots: nextLots,
          materialId: row.materialId,
          outboundQuantity: row.outboundQuantity,
          purpose: outboundPurpose,
          remark: outboundRemark,
          operator: "当前用户",
          outboundDate: today,
          ledgerIdPrefix: `ledger-outbound-${Date.now()}-${index}`
        });
        nextMaterials = transaction.materials;
        nextLots = transaction.lots;
        nextLedgers.push(...transaction.ledgers);
        const lastLedger = transaction.ledgers[transaction.ledgers.length - 1];
        nextLines.push({
          ...row,
          afterStockBase: lastLedger ? parseLedgerQuantity(lastLedger.afterStockText) : row.afterStockBase,
          ledgerCount: transaction.ledgers.length
        });
      });

      const nextOrder: InventoryOutboundOrderRecord = {
        no: outboundNo,
        createdAt: `${today} 10:00`,
        purpose: outboundPurpose.trim(),
        remark: outboundRemark.trim() || undefined,
        operator: "当前用户",
        lines: nextLines,
        ledgers: nextLedgers
      };
      setMaterials(nextMaterials);
      setLots(nextLots);
      setLedgers((prev) => [...nextLedgers, ...prev]);
      setOutboundOrders((prev) => [nextOrder, ...prev]);
      setSelectedOutboundOrderNo(outboundNo);
      resetOutboundState();
      setInventoryView("outbound-detail");
      message.success("出库单已生成");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "出库失败，请检查出库信息。");
    }
  };

  const handleRiskAction = (actionText: string | undefined, item: InventoryHomeRiskRow) => {
    if (!actionText) return;
    if (actionText === "入库") {
      setBatchReceiveEntries([]);
      setInventoryView("batch-receive");
      return;
    }
    if (actionText === "报废") {
      const lot = item.lotNo ? lots.find((candidate) => candidate.lotNo === item.lotNo) || null : null;
      if (lot) openExpiredScrapModal(lot);
      return;
    }
    openStocktakeScope();
  };

  const submitBatchReceive = () => {
    if (!batchReceiveReadyEntries.length) {
      if (batchReceiveSubmittingEntries.length) {
        message.error("已填写的条目需要补齐物料、数量、供应商、总金额和保质期。");
      } else {
        message.error("请至少填写一条入库记录。");
      }
      return;
    }

    const receiveDateValue = batchReceiveHeader.receiveDate || new Date().toISOString().slice(0, 10);
    let baseSequence = lots.filter((lot) => lot.lotNo.startsWith(`RK-${receiveDateValue.replace(/-/g, "")}`)).length + 1;
    const stockByMaterial = new Map(summaries.map((summary) => [summary.materialId, summary.currentStockBase]));
    const pendingMaterials: InventoryMaterial[] = [];
    const nextLots: InventoryLot[] = [];
    const nextLedgers: InventoryLedgerRow[] = [];
    const submittedEntryIds: string[] = [];

    try {
      batchReceiveReadyEntries.forEach((entry, index) => {
        const materialSource = resolveBatchReceiveEntryMaterial(
          entry,
          [...materials, ...pendingMaterials]
        );
        if (!materialSource) {
          throw new Error(`第 ${index + 1} 条：请先选择已有物料或完善新建物料信息。`);
        }

        const selectedExistingId = entry.materialId || materials.find((item) => item.materialName === materialSource.materialName)?.id;
        const newDraft =
          !entry.materialId && entry.newMaterialForm
            ? buildBatchInlineNewMaterialDraft(entry.category || materialSource.category, entry.materialKeyword.trim(), entry.newMaterialForm)
            : null;
        const draft = buildBatchReceiveEntryEffectiveDraft(entry, materialSource);
        const inboundQuantity = Number(draft.inboundQuantity || 0);
        const inboundUnit = draft.inboundUnit || materialSource.baseUnit;
        const packageConversions = materialSource.packageConversions || [];
        const baseQuantity = calculateInventoryBaseQuantity(
          inboundQuantity,
          inboundUnit,
          materialSource.baseUnit,
          packageConversions
        );
        if (!baseQuantity) {
          throw new Error(`${materialSource.materialName} 的入库单位无法换算，请先完善物料档案单位。`);
        }

        const receivedEntry = buildInventoryReceiveEntryFromSearch({
          materials: [...materials, ...pendingMaterials],
          selectedMaterialId: newDraft ? undefined : selectedExistingId,
          materialText: materialSource.materialName,
          category: newDraft?.category || materialSource.category,
          brand: newDraft?.brand || materialSource.brand,
          baseUnit: materialSource.baseUnit,
          note: newDraft?.note,
          newMaterialId: newDraft ? `mat-batch-${Date.now()}-${index}` : `mat-batch-${Date.now()}-${index}`,
          lotId: `lot-batch-receive-${Date.now()}-${index}`,
          expiryDate: draft.expiryDate || "",
          productionDate: draft.productionDate,
          unitPrice: Number(draft.unitPrice || 0),
          inboundQuantity,
          inboundUnit,
          baseQuantity,
          packageConversions,
          supplier: draft.supplier,
          supplierPhone: draft.supplierPhone || undefined,
          externalBatchNo: draft.externalBatchNo,
          receiveDate: receiveDateValue,
          sequence: baseSequence + index
        });

        let finalMaterial = receivedEntry.material;
        if (newDraft) {
          const { id, materialName, category, brand, baseUnit, unitSystem, packageConversions: builtPackages, auxiliaryUnit } =
            receivedEntry.material;
          finalMaterial = {
            ...newDraft,
            id,
            materialName,
            category,
            brand,
            baseUnit,
            unitSystem,
            packageConversions: builtPackages,
            auxiliaryUnit,
            status: "启用中"
          };
        }

        if (!materials.some((item) => item.id === finalMaterial.id) && !pendingMaterials.some((item) => item.id === finalMaterial.id)) {
          pendingMaterials.push(finalMaterial);
        }

        const nextStock = (stockByMaterial.get(finalMaterial.id) || 0) + receivedEntry.lot.convertedQtyBase;
        stockByMaterial.set(finalMaterial.id, nextStock);
        nextLots.push(receivedEntry.lot);

        const remarkParts = [
          `入库：${finalMaterial.category}`,
          draft.supplier ? `供应商：${draft.supplier}` : "",
          draft.supplierPhone ? `供应商电话：${draft.supplierPhone}` : "",
          batchReceiveHeader.purchaseOrderNo ? `采购单号：${batchReceiveHeader.purchaseOrderNo}` : "",
          `原始数量：${formatInventoryQty(receivedEntry.lot.inboundQty, receivedEntry.lot.inboundUnit)}`,
          receivedEntry.lot.inboundUnit === finalMaterial.baseUnit
            ? ""
            : `换算数量：${formatInventoryQty(receivedEntry.lot.convertedQtyBase, finalMaterial.baseUnit)}`,
          receivedEntry.lot.inboundUnit === finalMaterial.baseUnit
            ? ""
            : `规格：${formatPackageConversionSummary(packageConversions).join("，")}`,
          draft.externalBatchNo ? `外部批次：${draft.externalBatchNo}` : "",
          draft.note ? `行备注：${draft.note}` : "",
          batchReceiveHeader.remark ? `整单备注：${batchReceiveHeader.remark}` : ""
        ].filter(Boolean);

        nextLedgers.push({
          id: `ledger-batch-receive-${Date.now()}-${index}`,
          occurredAt: `${receiveDateValue} ${String(9 + Math.floor(index / 6)).padStart(2, "0")}:${String(
            (index % 6) * 10
          ).padStart(2, "0")}`,
          type: "采购入库",
          source: `入库 ${receivedEntry.lot.lotNo}`,
          materialId: finalMaterial.id,
          lotNo: receivedEntry.lot.lotNo,
          quantityText: `+${formatInventoryQty(receivedEntry.lot.convertedQtyBase, finalMaterial.baseUnit)}`,
          afterStockText: formatInventoryQty(nextStock, finalMaterial.baseUnit),
          operator: "当前用户",
          remark: remarkParts.join("；")
        });
        submittedEntryIds.push(entry.id);
      });

      if (pendingMaterials.length) {
        setMaterials((prev) => [...prev, ...pendingMaterials]);
      }
      setLots((prev) => [...prev, ...nextLots]);
      setLedgers((prev) => [...nextLedgers, ...prev]);
      setBatchReceiveEntries((prev) => {
        const remaining = prev.filter((entry) => !submittedEntryIds.includes(entry.id));
        return remaining;
      });
      setBatchReceiveHeader(createDefaultBatchReceiveHeader());
      setActiveCategory(nextLots[0] ? (materials.find((item) => item.id === nextLots[0].materialId)?.category || pendingMaterials[0]?.category || "饲料") : "饲料");
      setSummaryKeyword("");
      message.success(`入库成功，已生成 ${nextLots.length} 个批次和 ${nextLedgers.length} 条库存流水`);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "入库失败，请检查入库信息。");
    }
  };

  const closeExpiredScrapModal = () => {
    setExpiredActionLot(null);
    scrapForm.resetFields();
  };

  const submitExpiredScrap = async () => {
    if (!expiredActionLot) return;
    const values = await scrapForm.validateFields();

    try {
      const transaction = buildInventoryScrapTransaction({
        materials,
        lots,
        lotId: expiredActionLot.id,
        scrapQuantity: values.scrapQuantity,
        reason: values.reason,
        handlingMethod: values.handlingMethod,
        photoNote: values.photoNote,
        operator: "当前用户",
        occurredAt: `${new Date().toISOString().slice(0, 10)} 11:20`,
        ledgerId: `ledger-scrap-${Date.now()}`
      });
      const material = materials.find((item) => item.id === expiredActionLot.materialId);
      setLots(transaction.lots);
      setLedgers((prev) => [transaction.ledger, ...prev]);
      if (material) {
        setActiveCategory(material.category);
        setSummaryKeyword(material.materialName);
      }
      closeExpiredScrapModal();
      message.success("报废成功");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "报废失败，请检查报废信息。");
    }
  };

  const purchaseOrderColumns: ColumnsType<InventoryPurchaseOrderLine> = [
    {
      title: "物料",
      dataIndex: "materialName",
      width: 180,
      render: (_, row) => (
        <div className="inventory-cell-stack">
          <span>{row.materialName}</span>
          <Text type="secondary">
            {row.brand}｜{row.category}
          </Text>
        </div>
      )
    },
    {
      title: "当前库存余量",
      dataIndex: "currentStockText",
      width: 140
    },
    {
      title: "预计可用天数",
      dataIndex: "estimatedAvailableDays",
      width: 140,
      render: (_, row) => renderPurchaseOrderEstimatedAvailableDays(row.estimatedAvailableDays)
    },
    {
      title: "上次入库",
      dataIndex: "lastPurchaseAt",
      width: 300,
      render: (_, row) => {
        if (row.lastPurchaseSource === "none") {
          return <Text type="secondary">暂无入库记录</Text>;
        }
        return (
          <div className="inventory-cell-stack">
            <Space size={6} wrap>
              <span>{row.lastPurchaseAt ? formatInventoryDateTime(row.lastPurchaseAt) : "无入库时间"}</span>
              {row.lastPurchaseSource === "lot" ? <Tag>批次记录</Tag> : null}
            </Space>
            <Text type="secondary">
              上次入库 {row.lastPurchaseQtyText}
              {row.lastPurchaseSupplier ? `｜${row.lastPurchaseSupplier}` : ""}
              {row.lastPurchaseLotNo ? `｜${row.lastPurchaseLotNo}` : ""}
            </Text>
          </div>
        );
      }
    },
    {
      title: "本次采购数量",
      dataIndex: "quantityBase",
      width: 220,
      render: (_, row) => (
        <InputNumber
          min={0.01}
          value={row.quantityBase}
          addonAfter={row.baseUnit}
          placeholder="请输入数量"
          style={{ width: "100%" }}
          onChange={(value) =>
            setPurchaseOrderQuantities((prev) => ({
              ...prev,
              [row.materialId]: typeof value === "number" ? value : undefined
            }))
          }
        />
      )
    }
  ];

  const purchaseOrderDocumentColumns: ColumnsType<InventoryPurchaseOrderRecord["lines"][number]> = [
    {
      title: "序号",
      width: 64,
      render: (_, __, index) => index + 1
    },
    {
      title: "物料",
      dataIndex: "materialName",
      render: (_, row) => (
        <div className="inventory-cell-stack">
          <span>{row.materialName}</span>
          <Text type="secondary">
            {row.brand}｜{row.category}
          </Text>
        </div>
      )
    },
    {
      title: "当前库存余量",
      dataIndex: "currentStockText",
      width: 140
    },
    {
      title: "预计可用天数",
      dataIndex: "estimatedAvailableDays",
      width: 140,
      render: (_, row) => renderPurchaseOrderEstimatedAvailableDaysMeta(row.estimatedAvailableDays)
    },
    {
      title: "上次入库参考",
      dataIndex: "lastPurchaseAt",
      width: 300,
      render: (_, row) => (
        <div className="inventory-cell-stack">
          <span>{row.lastPurchaseSource === "none" ? "暂无入库记录" : row.lastPurchaseAt ? formatInventoryDateTime(row.lastPurchaseAt) : "无入库时间"}</span>
          {row.lastPurchaseSource === "none" ? null : (
            <Text type="secondary">
              上次入库 {row.lastPurchaseQtyText}
              {row.lastPurchaseSupplier ? `｜${row.lastPurchaseSupplier}` : ""}
              {row.lastPurchaseLotNo ? `｜${row.lastPurchaseLotNo}` : ""}
            </Text>
          )}
        </div>
      )
    },
    {
      title: "本次采购数量",
      dataIndex: "quantityBase",
      width: 140,
      render: (_, row) => <strong>{formatInventoryQty(row.quantityBase, row.baseUnit)}</strong>
    }
  ];

  const summaryColumns: ColumnsType<InventorySummary> = useMemo(() => {
    const columns: ColumnsType<InventorySummary> = [
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
        title: "当前库存",
        dataIndex: "currentStockBase",
        sorter: (a, b) => a.currentStockBase - b.currentStockBase,
        render: (_, row) =>
          renderInventoryStockHealth(row, feedAvailableDaysMap.get(row.materialId), materialMap.get(row.materialId))
      },
      {
        title: "库存趋势",
        dataIndex: "stockTrend",
        width: 170,
        defaultSortOrder: "descend",
        sorter: (a, b) => a.monthlyUsageBase - b.monthlyUsageBase,
        render: (_, row) => renderInventoryStockTrend(row)
      }
    ];

    if (activeCategory === "药品") {
      columns.splice(1, 0, {
        title: "药品分类",
        dataIndex: "medicineClass",
        width: 132,
        className: "inventory-table-column-nowrap",
        filters: inventoryMedicineClassOptions.map((value) => ({ text: value, value })),
        onFilter: (value, row) => row.medicineClass === value,
        sorter: (a, b) => (a.medicineClass || "").localeCompare(b.medicineClass || "", "zh-Hans-CN"),
        render: (value) => value || "—"
      });
    }

    if (shouldShowEstimatedAvailableDays(activeCategory)) {
      columns.push({
        title: "预计可用天数",
        key: "estimatedAvailableDays",
        sorter: (a, b) =>
          compareFeedEstimatedAvailableDays(
            feedAvailableDaysMap.get(a.materialId),
            feedAvailableDaysMap.get(b.materialId)
          ),
        render: (_, row) =>
          renderFeedEstimatedAvailableDaysText(
            feedAvailableDaysMap.get(row.materialId) ||
              buildFeedEstimatedAvailableDays(row.currentStockBase, row.materialId, ledgers, {
                referenceAt: INVENTORY_DEMO_REFERENCE_AT
              })
          )
      });
    }

    columns.push(
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
        filters: ["正常", "临期", "负库存"].map((value) => ({ text: value, value })),
        onFilter: (value, row) => resolveListStockStatus(row, lots) === value,
        sorter: (a, b) => resolveListStockStatus(a, lots).localeCompare(resolveListStockStatus(b, lots), "zh-Hans-CN"),
        render: (_, row) => {
          const status = resolveListStockStatus(row, lots);
          return <Tag color={statusColor(status)}>{status}</Tag>;
        }
      },
      {
        title: "操作",
        width: 112,
        render: (_, row) => (
          <Space size={2}>
            <Tooltip title="查看详情">
              <Button type="text" icon={<EyeOutlined />} onClick={() => openMaterialDetail(row.materialId)} />
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
    );

    return columns;
  }, [
    activeCategory,
    feedAvailableDaysMap,
    ledgers,
    lots,
    materials
  ]);

  const materialLotColumns: ColumnsType<InventoryLot> = [
    { title: "库存批次", dataIndex: "lotNo", sorter: (a, b) => a.lotNo.localeCompare(b.lotNo) },
    {
      title: "到期日期",
      dataIndex: "expiryDate",
      sorter: (a, b) => new Date(a.expiryDate || "9999-12-31").getTime() - new Date(b.expiryDate || "9999-12-31").getTime(),
      render: (value) => formatInventoryDate(value)
    },
    {
      title: "库存数量",
      dataIndex: "remainingQtyBase",
      sorter: (a, b) => a.remainingQtyBase - b.remainingQtyBase,
      render: (_, row) => {
        const unit = selectedMaterial?.baseUnit || "";
        const consumedQty = Math.max(row.convertedQtyBase - row.remainingQtyBase, 0);
        return (
          <span className="inventory-lot-quantity">
            <strong>{formatInventoryQtyWithPackage(row.remainingQtyBase, selectedMaterial, row.inboundUnit)}</strong>
            {row.stocktakeAdjustmentType === "盘盈库存" ? (
              <Text type="secondary">盘盈库存，出库优先消耗</Text>
            ) : (
              <Text type="secondary">
                入库 {formatInventoryQty(row.convertedQtyBase, unit)} / 已耗 {formatInventoryQty(consumedQty, unit)}
              </Text>
            )}
          </span>
        );
      }
    },
    {
      title: "总进货价（元）",
      dataIndex: "unitPrice",
      sorter: (a, b) => a.unitPrice - b.unitPrice,
      render: (value, row) => row.stocktakeAdjustmentType === "盘盈库存" ? `系统估算约 ${formatCurrency(value)}` : formatCurrency(value)
    },
    { title: "供应商", dataIndex: "supplier", render: (value) => value || "—" },
    { title: "供应商电话", dataIndex: "supplierPhone", render: (value) => value || "—" },
    {
      title: "入库时间",
      dataIndex: "lotNo",
      sorter: (a, b) =>
        new Date(selectedMaterialLedgers.find((ledger) => ledger.lotNo === a.lotNo && ledger.type === "采购入库")?.occurredAt || "").getTime() -
        new Date(selectedMaterialLedgers.find((ledger) => ledger.lotNo === b.lotNo && ledger.type === "采购入库")?.occurredAt || "").getTime(),
      render: (_, row) =>
        row.stocktakeAdjustmentType === "盘盈库存"
          ? "—"
          : formatInventoryDateTime(selectedMaterialLedgers.find((ledger) => ledger.lotNo === row.lotNo && ledger.type === "采购入库")?.occurredAt)
    },
    {
      title: "批次状态",
      dataIndex: "status",
      filters: ["正常", "临期", "过期", "已耗尽"].map((value) => ({ text: value, value })),
      onFilter: (value, row) => row.status === value,
      render: (value) =>
        value === "过期" ? (
          <Space size={4}>
            <Tag color={statusColor(value)}>{value}</Tag>
            <Tooltip
              trigger="click"
              title="该批次已超过有效期，默认仍可继续用于出库、任务消耗或盘亏扣减；如确认不可用，请发起报废处理。"
            >
              <button type="button" className="inventory-field-help" aria-label="过期批次说明">
                <InfoCircleOutlined />
              </button>
            </Tooltip>
          </Space>
        ) : (
          <Tag color={statusColor(value)}>{value}</Tag>
        )
    },
    {
      title: "操作",
      width: 128,
      render: (_, row) => (
        <Space size={4}>
          <Tooltip title="修改">
            <Button type="text" icon={<EditOutlined />} onClick={() => openLotEditModal(row)} />
          </Tooltip>
          {row.remainingQtyBase > 0 ? (
            <Tooltip title="报废">
              <Button type="text" danger onClick={() => openExpiredScrapModal(row)}>
                报废
              </Button>
            </Tooltip>
          ) : null}
        </Space>
        )
    }
  ];

  const renderLedgerChange = (row: InventoryLedgerRow) => {
    const quantityDisplay = buildInventoryLedgerQuantityDisplay(row);

    return (
      <span className="inventory-ledger-quantity">
        <strong className="inventory-ledger-change-line">
          <span className="inventory-ledger-change-value">{quantityDisplay.changeText}</span>
          <span
            className={`inventory-ledger-change-icon ${
              quantityDisplay.directionText === "库存上升" ? "is-up" : "is-down"
            }`}
            aria-label={quantityDisplay.directionText}
          >
            {quantityDisplay.directionText === "库存上升" ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
          </span>
        </strong>
        <Text type="secondary" className="inventory-ledger-balance">
          结存 {quantityDisplay.balanceText}
        </Text>
        <Tag className="inventory-ledger-type-tag">{row.type}</Tag>
      </span>
    );
  };

  const ledgerColumns: ColumnsType<InventoryLedgerRow> = [
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
    {
      title: "分类",
      dataIndex: "materialId",
      filters: inventoryCategoryOrder.map((value) => ({ text: value, value })),
      onFilter: (value, row) => materials.find((material) => material.id === row.materialId)?.category === value,
      sorter: (a, b) =>
        (materials.find((material) => material.id === a.materialId)?.category || "").localeCompare(
          materials.find((material) => material.id === b.materialId)?.category || "",
          "zh-Hans-CN"
        ),
      render: (value) => {
        const material = materials.find((item) => item.id === value);
        return material ? formatMaterialCategoryLabel(material) : "—";
      }
    },
    {
      title: "批次",
      dataIndex: "lotNo",
      render: (value, row) => value || (parseLedgerQuantity(row.quantityText) < 0 ? "物料级负库存" : "物料级调整")
    },
    {
      title: (
        <span className="inventory-table-title-with-help">
          库存变化
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
      render: (_, row) => renderLedgerChange(row)
    },
    {
      title: "时间",
      dataIndex: "occurredAt",
      sorter: (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
      render: (value) => formatInventoryDate(value)
    }
  ];

  const toggleInventoryCheckRecord = (record: InventoryCheckRecord, event?: ReactMouseEvent<HTMLElement>) => {
    event?.stopPropagation();
    setExpandedCheckRowKeys((current) =>
      current.includes(record.id)
        ? current.filter((key) => key !== record.id)
        : [...current, record.id]
    );
  };

  const toggleInventoryInboundOrder = (record: InventoryInboundOrder, event?: ReactMouseEvent<HTMLElement>) => {
    event?.stopPropagation();
    const willExpand = !expandedInboundRowKeys.includes(record.id);
    setExpandedInboundRowKeys((current) =>
      current.includes(record.id)
        ? current.filter((key) => key !== record.id)
        : [...current, record.id]
    );
    if (willExpand) {
      window.setTimeout(() => {
        document.querySelector(`[data-row-key="${record.id}"]`)?.scrollIntoView({
          block: "start",
          behavior: "smooth"
        });
      }, 120);
    }
  };

  const openInventoryLedgerFromCheckDetail = (record: InventoryCheckRecord, detail: InventoryCheckDetail) => {
    const checkDate = dayjs(record.checkTime.slice(0, 10));
    setLedgerPageTab("ledger");
    setLedgerDateRange([checkDate.subtract(30, "day").format("YYYY-MM-DD"), checkDate.format("YYYY-MM-DD")]);
    setLedgerKeyword(detail.batchNo || detail.materialName.split(" ")[0]);
    message.info("已切换至库存流水，并预填关联记录与盘点日前 30 天筛选");
  };

  const renderStocktakeCurrentStock = (row: InventoryStocktakeScopeRow) => {
    const riskLines = buildStocktakeRiskLines(row, lots);
    const recentLedgers = recentLedgerMap.get(row.materialId) || [];

    return (
      <div className="inventory-stocktake-current">
        <Tooltip
          title={renderStocktakeRecentChangesTooltip(recentLedgers)}
          overlayClassName="inventory-stocktake-change-tooltip-popover"
          placement="topLeft"
        >
          <span className="inventory-stocktake-current__qty">{formatInventoryQty(row.bookQtyBase, row.baseUnit)}</span>
        </Tooltip>
        {riskLines.length ? (
          <div className="inventory-stocktake-current__risks">
            {riskLines.map((line) => (
              <span key={line.status} className={`inventory-stocktake-risk-line is-${line.tone}`}>
                {line.text}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    );
  };

  const renderStocktakeMonthlyUsage = (row: InventoryStocktakeScopeRow) => {
    const summary = summaryByMaterialId.get(row.materialId);
    return summary ? renderInventoryMonthlyUsage(summary) : "—";
  };

  const stocktakeExecuteColumns: ColumnsType<InventoryStocktakeScopeRow> = [
    {
      title: "名称",
      dataIndex: "materialName",
      sorter: (a, b) => a.materialName.localeCompare(b.materialName, "zh-Hans-CN"),
      render: (value) => value
    },
    {
      title: "分类",
      dataIndex: "category",
      width: 120,
      className: "inventory-table-column-nowrap",
      filters: inventoryCategoryOrder.map((value) => ({ text: value, value })),
      onFilter: (value, row) => row.category === value,
      sorter: (a, b) => formatMaterialCategoryLabel(a).localeCompare(formatMaterialCategoryLabel(b), "zh-Hans-CN"),
      render: (_, row) => formatMaterialCategoryLabel(row)
    },
    {
      title: "品牌",
      dataIndex: "brand",
      sorter: (a, b) => a.brand.localeCompare(b.brand, "zh-Hans-CN"),
      render: (value) => value || "—"
    },
    {
      title: "当前库存",
      dataIndex: "bookQtyBase",
      sorter: (a, b) => a.bookQtyBase - b.bookQtyBase,
      render: (_, row) => renderStocktakeCurrentStock(row)
    },
    {
      title: "近30天使用",
      dataIndex: "materialId",
      width: 170,
      sorter: (a, b) =>
        (summaryByMaterialId.get(a.materialId)?.monthlyUsageBase || 0) -
        (summaryByMaterialId.get(b.materialId)?.monthlyUsageBase || 0),
      render: (_, row) => renderStocktakeMonthlyUsage(row)
    },
    {
      title: "盘点库存",
      dataIndex: "id",
      width: 168,
      render: (_, row) => (
        <InputNumber
          min={0}
          value={stocktakeActuals[row.id]}
          addonAfter={row.baseUnit}
          placeholder="不调整"
          style={{ width: "100%" }}
          onChange={(value) =>
            setStocktakeActuals((prev) => ({
              ...prev,
              [row.id]: typeof value === "number" ? value : undefined
            }))
          }
        />
      )
    }
  ];

  const stocktakeConfirmColumns: ColumnsType<(typeof stocktakeDifferenceRows)[number]> = [
    {
      title: "名称",
      dataIndex: "materialName",
      render: (value) => value
    },
    {
      title: "分类",
      dataIndex: "category",
      render: (_, row) => formatMaterialCategoryLabel(row)
    },
    { title: "品牌", dataIndex: "brand", render: (value) => value || "—" },
    { title: "当前库存", dataIndex: "bookQtyBase", render: (_, row) => renderStocktakeCurrentStock(row) },
    { title: "盘点库存", dataIndex: "actualQty", render: (_, row) => formatInventoryQty(row.actualQty || 0, row.baseUnit) },
    {
      title: "差异",
      dataIndex: "diff",
      render: (_, row) =>
        row.diff === undefined ? "—" : `${row.diff > 0 ? "+" : ""}${formatInventoryQty(row.diff, row.baseUnit)}`
    }
  ];

  const outboundExecuteColumns: ColumnsType<InventoryOutboundScopeRow> = [
    {
      title: "物料名称",
      dataIndex: "materialName",
      sorter: (a, b) => a.materialName.localeCompare(b.materialName, "zh-Hans-CN"),
      render: (_, row) => (
        <div className="inventory-cell-stack">
          <span>{row.materialName}</span>
          <span>
            {row.brand}｜<Tag color="success">{row.materialStatus}</Tag>
          </span>
        </div>
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
      sorter: (a, b) => a.category.localeCompare(b.category, "zh-Hans-CN"),
      render: (_, row) => {
        const material = materialMap.get(row.materialId);
        return material ? formatMaterialCategoryLabel(material) : row.category;
      }
    },
    {
      title: "当前库存",
      dataIndex: "currentStockBase",
      sorter: (a, b) => a.currentStockBase - b.currentStockBase,
      render: (_, row) =>
        formatInventoryQtyWithPackage(row.currentStockBase, materialMap.get(row.materialId) || { baseUnit: row.baseUnit })
    },
    {
      title: "最近到期日",
      dataIndex: "nearestExpiryDate",
      sorter: (a, b) => new Date(a.nearestExpiryDate || "9999-12-31").getTime() - new Date(b.nearestExpiryDate || "9999-12-31").getTime(),
      render: (_, row) => row.nearestExpiryDate || "—"
    },
    {
      title: "库存状态",
      dataIndex: "stockRisk",
      filters: ["正常", "负库存"].map((value) => ({ text: value, value })),
      onFilter: (value, row) => row.stockRisk === value,
      render: (value) => <Tag color={statusColor(value)}>{value}</Tag>
    },
    {
      title: "出库数量",
      dataIndex: "materialId",
      width: 180,
      render: (_, row) => (
        <InputNumber
          min={0}
          value={outboundQuantities[row.materialId]}
          addonAfter={row.baseUnit}
          placeholder="不出库"
          style={{ width: "100%" }}
          onChange={(value) =>
            setOutboundQuantities((prev) => ({
              ...prev,
              [row.materialId]: typeof value === "number" && value > 0 ? value : undefined
            }))
          }
        />
      )
    }
  ];

  const outboundConfirmColumns: ColumnsType<InventoryOutboundOrderLine> = [
    {
      title: "物料名称",
      dataIndex: "materialName",
      render: (_, row) => (
        <div className="inventory-cell-stack">
          <span>{row.materialName}</span>
          <Text type="secondary">{row.brand}｜{row.category}</Text>
        </div>
      )
    },
    {
      title: "当前库存",
      dataIndex: "currentStockBase",
      render: (_, row) =>
        formatInventoryQtyWithPackage(row.currentStockBase, materialMap.get(row.materialId) || { baseUnit: row.baseUnit })
    },
    { title: "出库数量", dataIndex: "outboundQuantity", render: (_, row) => formatInventoryQty(row.outboundQuantity, row.baseUnit) },
    {
      title: "预计出库后库存",
      dataIndex: "afterStockBase",
      render: (_, row) => (
        <span className={row.afterStockBase < 0 ? "inventory-diff-amount inventory-diff-amount--loss" : undefined}>
          {formatInventoryQty(row.afterStockBase, row.baseUnit)}
        </span>
      )
    }
  ];

  const outboundOrderLineColumns: ColumnsType<InventoryOutboundOrderLine> = [
    {
      title: "物料名称",
      dataIndex: "materialName",
      render: (_, row) => (
        <div className="inventory-cell-stack">
          <span>{row.materialName}</span>
          <Text type="secondary">{row.brand}｜{row.category}</Text>
        </div>
      )
    },
    { title: "出库数量", dataIndex: "outboundQuantity", render: (_, row) => formatInventoryQty(row.outboundQuantity, row.baseUnit) },
    { title: "出库后库存", dataIndex: "afterStockBase", render: (_, row) => formatInventoryQty(row.afterStockBase, row.baseUnit) },
    { title: "生成流水", dataIndex: "ledgerCount", render: (value) => `${value} 条` }
  ];

  const categoryTabItems = categoryTabs.map((tab: InventoryCategoryTab) => ({
    key: tab.key,
    label: `${tab.label} ${tab.count}`,
    children: (
      <>
        <div className="inventory-table-toolbar inventory-table-toolbar--with-actions">
          <div className="inventory-table-toolbar__filters">
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
          {selectedPurchaseMaterialIds.length > 0 ? (
            <Space className="inventory-table-toolbar__actions" size={10}>
              <Text type="secondary" className="inventory-table-selection-count">
                已选 {selectedPurchaseMaterialIds.length} 种
              </Text>
              <Button type="primary" icon={<FileAddOutlined />} onClick={openPurchaseOrderDraft}>
                生成采购单
              </Button>
            </Space>
          ) : null}
        </div>
        <Table
          rowKey="materialId"
          className="inventory-console-table"
          columns={summaryColumns}
          dataSource={filteredSummaries}
          pagination={false}
          rowSelection={{
            selectedRowKeys: selectedPurchaseMaterialIds,
            preserveSelectedRowKeys: true,
            onChange: (keys) => setSelectedPurchaseMaterialIds(keys.map(String)),
            getCheckboxProps: (row) => ({
              disabled: row.materialStatus === "已停用",
              name: row.materialName
            })
          }}
          key={tab.key === "饲料" ? "feed-summary-with-days" : `summary-${tab.key}`}
        />
      </>
    )
  }));

  const renderLotEditModal = () => (
    <Modal
      title="修改批次信息"
      open={Boolean(editingLotId)}
      okText="保存"
      cancelText="取消"
      onOk={submitLotEdit}
      onCancel={closeLotEditModal}
    >
      <Alert
        showIcon
        type="info"
        className="inventory-lot-edit-alert"
        message="仅允许修改到期日、供应商批次号和备注；库存数量与总进货价必须通过单据流程调整。"
      />
      <Form layout="vertical" form={lotEditForm}>
        <Form.Item label="到期日" name="expiryDate">
          <Input placeholder="YYYY-MM-DD" />
        </Form.Item>
        <Form.Item label="供应商批次号" name="supplierBatchNo" rules={[{ max: 50, message: "供应商批次号不能超过 50 字" }]}>
          <Input placeholder="请输入供应商批次号" />
        </Form.Item>
        <Form.Item label="备注" name="note" rules={[{ max: 200, message: "备注不能超过 200 字" }]}>
          <Input.TextArea rows={3} showCount maxLength={200} placeholder="请输入备注" />
        </Form.Item>
      </Form>
    </Modal>
  );

  const renderExpiredActionModal = () => (
    <Modal
      title="报废处理"
      open={Boolean(expiredActionLot)}
      okText="确认报废"
      cancelText="取消"
      okButtonProps={{ danger: true }}
      onOk={submitExpiredScrap}
      onCancel={closeExpiredScrapModal}
    >
      {expiredActionLot ? (
        <Form layout="vertical" form={scrapForm}>
          <Alert
            showIcon
            type="error"
            className="inventory-scrap-confirm-alert"
            message="请确认该批次确需报废。确认后会扣减批次库存并生成报废库存流水。"
          />
          <Descriptions
            size="small"
            column={1}
            className="inventory-scrap-summary"
            items={[
              {
                key: "material",
                label: "物料",
                children: getInventoryMaterialLabel(materials, expiredActionLot.materialId)
              },
              { key: "lot", label: "批次", children: expiredActionLot.lotNo },
              { key: "supplierBatchNo", label: "供应商批次号", children: expiredActionLot.supplierBatchNo || "—" },
              {
                key: "stock",
                label: "当前批次库存",
                children: formatInventoryQty(
                  expiredActionLot.remainingQtyBase,
                  materials.find((material) => material.id === expiredActionLot.materialId)?.baseUnit || expiredActionLot.inboundUnit
                )
              },
              { key: "expiry", label: "到期日", children: expiredActionLot.expiryDate }
            ]}
          />
          <Form.Item
            label="报废数量"
            name="scrapQuantity"
            rules={[
              { required: true, message: "请输入报废数量" },
              {
                validator: (_, value) =>
                  typeof value === "number" && value > 0 && value <= expiredActionLot.remainingQtyBase
                    ? Promise.resolve()
                    : Promise.reject(new Error("报废数量必须大于 0，且不能超过当前批次库存"))
              }
            ]}
          >
            <InputNumber
              min={0.01}
              max={expiredActionLot.remainingQtyBase}
              addonAfter={materials.find((material) => material.id === expiredActionLot.materialId)?.baseUnit || expiredActionLot.inboundUnit}
              style={{ width: "100%" }}
            />
          </Form.Item>
          <Form.Item label="报废原因" name="reason" rules={[{ required: true, message: "请选择报废原因" }]}>
            <Select options={inventoryScrapReasonOptions.map((value) => ({ label: value, value }))} />
          </Form.Item>
          <Form.Item label="处理方式" name="handlingMethod" rules={[{ required: true, message: "请选择处理方式" }]}>
            <Select options={inventoryScrapHandlingMethodOptions.map((value) => ({ label: value, value }))} />
          </Form.Item>
          <Form.Item label="拍照上传" name="photoNote" extra="原型中以照片说明模拟上传留档；正式环境可替换为附件上传组件。">
            <Input.TextArea rows={2} placeholder="选填：填写照片编号或留档说明" />
          </Form.Item>
        </Form>
      ) : null}
    </Modal>
  );

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
            <strong>备注</strong>
            <Form.Item label="备注" name="note" rules={[{ max: 200, message: "备注不能超过 200 字" }]}>
              <Input.TextArea rows={3} showCount maxLength={200} placeholder="请输入业务补充说明" />
            </Form.Item>
          </section>
        </Form>
      </Modal>
    );
  };

  const selectedStocktakeRecord = selectedStocktakeRecordNo
    ? stocktakeRecords.find((record) => record.no === selectedStocktakeRecordNo) || null
    : null;

  const renderFinanceAnalyticsCards = () => (
    <div className="finance-analysis-grid">
      <Card className="inventory-console-card inventory-analytics-card inventory-analytics-card--share">
        <div className="inventory-analytics-card__head">
          <div>
            <strong>库存金额占比</strong>
          </div>
          <div className="inventory-analytics-card__meta">
            <span>
              <Text type="secondary">最大占比</Text>
              <strong>{formatPercent(largestInventoryShare)}</strong>
            </span>
          </div>
        </div>
        <div className="inventory-analytics-share-layout">
          <InventoryDonutChart rows={sortedInventoryValueShareRows} totalValue={inventoryTotalValue} />
          <div className="inventory-analytics-share-list">
            {sortedInventoryValueShareRows.map((row) => (
              <button
                key={row.category}
                type="button"
                className={`inventory-analytics-share-row${analyticsCategoryFilter === row.category ? " is-active" : ""}`}
                aria-pressed={analyticsCategoryFilter === row.category}
                onClick={() =>
                  setAnalyticsCategoryFilter(analyticsCategoryFilter === row.category ? "全部" : row.category)
                }
              >
                <span className="inventory-analytics-share-row__label">
                  <i style={{ background: row.color }} />
                  <span>{row.category}</span>
                </span>
                <span className="inventory-analytics-share-row__value">
                  <strong>{formatCurrency(row.amount)}</strong>
                  <Text type="secondary">{row.amount > 0 ? formatPercent(row.share) : "—"}</Text>
                </span>
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card className="inventory-console-card inventory-analytics-card inventory-analytics-card--top">
        <div className="inventory-analytics-card__head">
          <div>
            <strong>本月消耗金额 Top 物料</strong>
          </div>
        </div>
        <div className="inventory-top-spend-list">
          {windowTopSpendRows.length ? (
            windowTopSpendRows.map((row, index) => (
              <div key={row.id} className="inventory-top-spend-row">
                <span className="inventory-top-spend-row__rank">{index + 1}</span>
                <div className="inventory-top-spend-row__content">
                  <div className="inventory-top-spend-row__head">
                    <div>
                      <strong>{row.materialName}</strong>
                      <Text type="secondary">{row.isCategorySummary ? "物料类型" : row.category}</Text>
                    </div>
                    <strong>{formatCurrency(row.amount)}</strong>
                  </div>
                  <div className="inventory-top-spend-row__track">
                    <span
                      className="inventory-top-spend-row__bar"
                      style={{ width: `${Math.max(row.share * 100, 10)}%`, background: row.color }}
                    />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="inventory-empty-panel">该时间段暂无消耗记录</div>
          )}
        </div>
      </Card>

      <Card className="inventory-console-card inventory-analytics-card inventory-analytics-card--trend">
        <div className="inventory-analytics-card__head inventory-analytics-card__head--trend">
          <div>
            <strong>库存消耗趋势</strong>
          </div>
          <div className="inventory-trend-filters">
            <div className="inventory-analytics-filter-tags" aria-label="库存消耗趋势时间范围筛选">
              {inventoryAnalyticsTimeRangeOptions.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`inventory-action-filter${analyticsTimeRange === item ? " is-active" : ""}`}
                  onClick={() => setAnalyticsTimeRange(item)}
                >
                  <span>{item}</span>
                </button>
              ))}
            </div>
            {analyticsTimeRange === "自定义" ? (
              <DatePicker.RangePicker
                size="small"
                allowClear
                placeholder={["开始日期", "结束日期"]}
                onChange={(_, dateStrings) =>
                  setAnalyticsCustomRange(dateStrings[0] && dateStrings[1] ? [dateStrings[0], dateStrings[1]] : null)
                }
              />
            ) : null}
          </div>
        </div>
        <div className="inventory-analytics-filter-tags inventory-trend-filters__category" aria-label="库存消耗趋势分类筛选">
          {inventoryAnalyticsCategoryFilterOptions.map((item) => (
            <button
              key={item}
              type="button"
              className={`inventory-action-filter${analyticsCategoryFilter === item ? " is-active" : ""}`}
              onClick={() => setAnalyticsCategoryFilter(item)}
            >
              <span>{item}</span>
            </button>
          ))}
        </div>
        <div className="inventory-analytics-trend-meta">
          <span>
            <Text type="secondary">{analyticsRangeLabel}累计</Text>
            <strong>{formatCurrency(consumptionTrendTotal)}</strong>
          </span>
          <span>
            <Text type="secondary">日均消耗</Text>
            <strong>{formatCurrency(Math.round(consumptionTrendAverage))}</strong>
          </span>
          <span>
            <Text type="secondary">峰值日</Text>
            <strong>
              {consumptionTrendPeak && consumptionTrendPeak.amount > 0
                ? `${formatMonthDay(consumptionTrendPeak.date)} · ${formatCurrency(consumptionTrendPeak.amount)}`
                : "暂无"}
            </strong>
          </span>
          <span>
            <Text type="secondary">饲料消耗重量</Text>
            <strong>{formatInventoryQty(Math.abs(feedConsumptionWeight), "kg")}</strong>
          </span>
        </div>
        <InventoryTrendChart
          points={consumptionTrendPoints}
          rangeLabel={analyticsRangeLabel}
          categoryLabel={analyticsFilterSummaryLabel}
        />
      </Card>
    </div>
  );

  const renderInventoryRiskCard = () => (
    <Card className="inventory-console-card inventory-analytics-card inventory-analytics-card--risk inventory-home-risk-card">
      <div className="inventory-analytics-card__head">
        <div>
          <strong>库存风险</strong>
        </div>
      </div>
      <div className="inventory-risk-filter-tags" aria-label="库存风险筛选">
        {homeActionItems.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`inventory-action-filter${activeHomeRiskType === item.key ? " is-active" : ""}`}
            onClick={() => setActiveHomeRiskType(activeHomeRiskType === item.key ? "全部" : item.key)}
          >
            <span>{item.label}</span>
            <strong>{item.count}</strong>
          </button>
        ))}
      </div>
      <div className="inventory-risk-list">
        {filteredHomeRiskRows.length ? (
          filteredHomeRiskRows.map((item) => (
            <div
              key={item.id}
              className={`inventory-risk-row inventory-risk-row--${item.type}`}
              role="button"
              tabIndex={0}
              onClick={() => openMaterialDetail(item.materialId)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openMaterialDetail(item.materialId);
                }
              }}
            >
              <span className="inventory-risk-row__type">{item.type}</span>
              <div className="inventory-risk-row__main">
                <div className="inventory-risk-row__title">
                  <strong>{item.materialName}</strong>
                  <span>{item.brand}</span>
                </div>
                <Text type="secondary">{item.adviceText}</Text>
              </div>
              <div className="inventory-risk-row__side">
                <span className="inventory-risk-row__value">
                  <strong>{item.valueText}</strong>
                  {item.dateText ? <em>{item.dateText}</em> : null}
                </span>
                {item.actionText || item.auxiliaryActionText ? (
                  <span className="inventory-risk-row__actions">
                    {item.actionText ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleRiskAction(item.actionText, item);
                        }}
                      >
                        {item.actionText}
                      </button>
                    ) : null}
                    {item.auxiliaryActionText ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleRiskAction(item.auxiliaryActionText, item);
                        }}
                      >
                        {item.auxiliaryActionText}
                      </button>
                    ) : null}
                  </span>
                ) : null}
              </div>
            </div>
          ))
        ) : (
          <div className="inventory-empty-panel">暂无待处理物料</div>
        )}
      </div>
    </Card>
  );

  const openFeedTrendLedgerDate = (date: string) => {
    setLedgerKeyword("");
    setLedgerTypes([]);
    setLedgerDateRange([date, date]);
    setInventoryView("ledgers");
  };

  const renderFeedStockTrendCard = () => (
    <Card className="inventory-console-card inventory-analytics-card inventory-feed-stock-card">
      <div className="inventory-analytics-card__head inventory-feed-stock-card__head">
        <div>
          <strong>饲料库存余量趋势</strong>
          <Text type="secondary">近30天每日库存结余</Text>
        </div>
        <div className="inventory-feed-stock-metrics">
          <span>
            <Text type="secondary">当前库存</Text>
            <strong>{formatFeedTrendQty(feedStockTrendLatest?.quantity || 0)}</strong>
          </span>
          <span>
            <Text type="secondary">较昨日变化</Text>
            <strong className={feedStockYesterdayChange < 0 ? "is-down" : feedStockYesterdayChange > 0 ? "is-up" : ""}>
              {formatSignedFeedTrendQty(feedStockYesterdayChange)}
            </strong>
          </span>
          <span>
            <Text type="secondary">预计可用天数</Text>
            <strong>{feedStockAvailableDays == null ? "暂无" : `${feedStockAvailableDays}天`}</strong>
          </span>
        </div>
      </div>
      <FeedStockTrendChart
        points={feedStockTrendPoints}
        onPointClick={openFeedTrendLedgerDate}
      />
    </Card>
  );

  if (inventoryView === "purchase-order-draft") {
    return (
      <div className="inventory-console-page inventory-purchase-order-page">
        <div className="inventory-console-header">
          <div>
            <Button type="text" icon={<ArrowLeftOutlined />} className="inventory-back-button" onClick={() => setInventoryView("home")}>
              返回选择物料
            </Button>
            <Title level={3}>生成采购单</Title>
            <Text type="secondary">已选 {selectedPurchaseOrderRows.length} 种物料，确认前可调整本次采购数量</Text>
          </div>
          <Space>
            <Button onClick={() => setInventoryView("home")}>返回库存列表</Button>
            <Button type="primary" icon={<FileAddOutlined />} disabled={!selectedPurchaseOrderRows.length} onClick={submitPurchaseOrder}>
              确认生成采购单
            </Button>
          </Space>
        </div>

        <Card className="inventory-console-card inventory-purchase-order-card">
          <Space direction="vertical" size={12} className="inventory-purchase-order-editor">
            <Alert showIcon type="info" message="已默认复用上次入库数量，可结合当前库存余量和预计可用天数修改本次采购数量。" />
            <Table
              rowKey="materialId"
              className="inventory-console-table inventory-purchase-order-table"
              columns={purchaseOrderColumns}
              dataSource={selectedPurchaseOrderRows}
              pagination={false}
            />
          </Space>
        </Card>
      </div>
    );
  }

  if (inventoryView === "purchase-order-detail") {
    if (!selectedPurchaseOrder) {
      return (
        <div className="inventory-console-page inventory-purchase-order-page">
          <div className="inventory-console-header">
            <div>
              <Button type="text" icon={<ArrowLeftOutlined />} className="inventory-back-button" onClick={() => setInventoryView("home")}>
                返回库存管理
              </Button>
              <Title level={3}>采购单</Title>
            </div>
          </div>
          <div className="inventory-empty-panel">未找到采购单据</div>
        </div>
      );
    }

    return (
      <div className="inventory-console-page inventory-purchase-order-page">
        <div className="inventory-console-header">
          <div>
            <Button type="text" icon={<ArrowLeftOutlined />} className="inventory-back-button" onClick={() => setInventoryView("home")}>
              返回库存管理
            </Button>
            <Title level={3}>采购单</Title>
            <Text type="secondary">单据已生成，可截图转发或导出 Excel</Text>
          </div>
          <Space>
            <Button icon={<ExportOutlined />} onClick={() => downloadPurchaseOrderExcel(selectedPurchaseOrder)}>
              导出 Excel
            </Button>
            <Button type="primary" onClick={() => setInventoryView("home")}>
              返回库存首页
            </Button>
          </Space>
        </div>

        <section className="inventory-purchase-document">
          <div className="inventory-purchase-document__head">
            <div>
              <Text type="secondary">Sentri 库存管理</Text>
              <h2>采购单</h2>
            </div>
            <span>待采购</span>
          </div>
          <Descriptions
            className="inventory-purchase-document__meta"
            bordered
            size="small"
            column={4}
            items={[
              { key: "no", label: "单据号", children: selectedPurchaseOrder.no },
              { key: "createdAt", label: "生成时间", children: selectedPurchaseOrder.createdAt },
              { key: "lineCount", label: "物料种数", children: `${selectedPurchaseOrder.lines.length} 种` },
              { key: "source", label: "来源", children: "库存管理首页" }
            ]}
          />
          <Table
            rowKey="materialId"
            className="inventory-console-table inventory-purchase-document-table"
            columns={purchaseOrderDocumentColumns}
            dataSource={selectedPurchaseOrder.lines}
            pagination={false}
          />
        </section>
      </div>
    );
  }

  if (inventoryView === "finance") {
    return (
      <div className="inventory-console-page finance-analysis-page">
        <div className="inventory-console-header">
          <div>
            <Title level={3}>财务分析</Title>
            <Text type="secondary">库存金额 · 消耗结构 · 消耗趋势 · 盘点差异</Text>
          </div>
          <Space>
            <Button icon={<ExportOutlined />} onClick={openOutboundExecution}>出库</Button>
            <Badge count={pendingDifferences.length} size="small" offset={[-2, 2]}>
              <Button onClick={() => setInventoryView("difference-list")}>盘点差异</Button>
            </Badge>
          </Space>
        </div>

        {pendingDifferences.length ? (
          <Alert
            showIcon
            type="warning"
            className="inventory-difference-banner"
            message={`存在 ${pendingDifferences.length} 条盘点差异待财务分析，库存已按盘点结果更新`}
            action={
              <Button size="small" type="link" onClick={() => setInventoryView("difference-list")}>
                去处理
              </Button>
            }
          />
        ) : null}

        {renderFinanceAnalyticsCards()}
      </div>
    );
  }

  if (inventoryView === "batch-receive") {
    return (
      <div className="inventory-console-page inventory-batch-receive-page">
        <div className="inventory-console-header">
          <div>
            <Button type="text" icon={<ArrowLeftOutlined />} className="inventory-back-button" onClick={() => setInventoryView("home")}>
              返回库存管理
            </Button>
            <Title level={3}>入库</Title>
          </div>
        </div>

        <BatchReceivePanel
          header={batchReceiveHeader}
          onHeaderChange={setBatchReceiveHeader}
          entries={batchReceiveEntries}
          onEntriesChange={setBatchReceiveEntries}
          materials={materials}
          lots={lots}
          ledgers={ledgers}
          summaries={summaries}
          readyCount={batchReceiveReadyEntries.length}
          onCancel={() => setInventoryView("home")}
          onClear={() => setBatchReceiveEntries([])}
          onSubmit={submitBatchReceive}
          onValidationError={message.error}
        />
      </div>
    );
  }

  if (inventoryView === "outbound-execute") {
    return (
      <div className="inventory-console-page">
        <div className="inventory-console-header">
          <div>
            <Button type="text" icon={<ArrowLeftOutlined />} className="inventory-back-button" onClick={() => setInventoryView("home")}>
              返回库存管理
            </Button>
            <Title level={3}>出库</Title>
            <Text type="secondary">全部物料 {outboundScopeRows.length} 个｜已填写出库 {outboundSelectedRows.length} 个</Text>
          </div>
        </div>
        <Card className="inventory-console-card">
          <div className="inventory-stocktake-toolbar inventory-outbound-toolbar">
            <Input.Search
              allowClear
              placeholder="搜索名称或品牌"
              value={outboundKeyword}
              onChange={(event) => setOutboundKeyword(event.target.value)}
            />
            <Select
              value={outboundCategory}
              onChange={(value) => setOutboundCategory(value)}
              options={[
                { label: "全部分类", value: "全部" },
                ...inventoryCategoryOrder.map((value) => ({ label: value, value }))
              ]}
            />
            <Input
              value={outboundPurpose}
              placeholder="领用用途，例如：治疗任务领用、栏舍消毒、工具领用"
              onChange={(event) => setOutboundPurpose(event.target.value)}
            />
            <Input
              value={outboundRemark}
              placeholder="备注，选填，最多 200 字"
              maxLength={200}
              onChange={(event) => setOutboundRemark(event.target.value)}
            />
          </div>
          <Table
            rowKey="materialId"
            className="inventory-console-table"
            columns={outboundExecuteColumns}
            dataSource={filteredOutboundRows}
            pagination={false}
            scroll={{ x: 1080 }}
          />
          <div className="inventory-stocktake-footer">
            <Button type="primary" onClick={submitOutboundExecution}>提交出库</Button>
          </div>
        </Card>
      </div>
    );
  }

  if (inventoryView === "outbound-confirm") {
    const negativeCount = outboundSelectedRows.filter((row) => row.afterStockBase < 0).length;
    return (
      <div className="inventory-console-page">
        <div className="inventory-console-header">
          <div>
            <Button type="text" icon={<ArrowLeftOutlined />} className="inventory-back-button" onClick={() => setInventoryView("outbound-execute")}>
              返回修改
            </Button>
            <Title level={3}>出库清单</Title>
            <Text type="secondary">以下物料将出库，确认后系统生成出库单和库存流水</Text>
          </div>
        </div>
        <div className="inventory-stocktake-summary">
          <span>全部物料<strong>{outboundScopeRows.length} 个</strong></span>
          <span>出库物料<strong>{outboundSelectedRows.length} 个</strong></span>
          <span>预计负库存<strong>{negativeCount} 个</strong></span>
          <span>领用用途<strong>{outboundPurpose || "未填写"}</strong></span>
        </div>
        <Card className="inventory-console-card">
          <Table rowKey="materialId" className="inventory-console-table" columns={outboundConfirmColumns} dataSource={outboundSelectedRows} pagination={false} />
          <Alert
            showIcon
            type="info"
            className="inventory-stocktake-alert"
            message="确认后系统会按 FEFO 自动扣减批次；库存不足的剩余数量会记录为物料级负库存，并生成无批次业务消耗流水。"
          />
          <div className="inventory-stocktake-footer">
            <Button onClick={() => setInventoryView("outbound-execute")}>返回修改</Button>
            <Button type="primary" onClick={confirmOutboundOrder}>确认出库</Button>
          </div>
        </Card>
      </div>
    );
  }

  if (inventoryView === "outbound-detail") {
    const order = selectedOutboundOrder;
    return (
      <div className="inventory-console-page">
        <div className="inventory-console-header">
          <div>
            <Button type="text" icon={<ArrowLeftOutlined />} className="inventory-back-button" onClick={() => setInventoryView("home")}>
              返回库存管理
            </Button>
            <Title level={3}>出库单详情</Title>
            <Text type="secondary">{order ? `单据号 ${order.no}` : "未选择出库单"}</Text>
          </div>
          <Space>
            <Button icon={<HistoryOutlined />} onClick={() => setInventoryView("ledgers")}>
              查看库存流水
            </Button>
          </Space>
        </div>
        {order ? (
          <>
            <Descriptions
              className="inventory-outbound-descriptions"
              bordered
              size="small"
              column={4}
              items={[
                { key: "no", label: "出库单号", children: order.no },
                { key: "createdAt", label: "出库时间", children: order.createdAt },
                { key: "operator", label: "领用人", children: order.operator },
                { key: "purpose", label: "领用用途", children: order.purpose },
                { key: "count", label: "出库物料", children: `${order.lines.length} 个` },
                { key: "ledger", label: "生成流水", children: `${order.ledgers.length} 条` },
                { key: "remark", label: "备注", children: order.remark || "—" }
              ]}
            />
            <Card className="inventory-console-card">
              <Table rowKey="materialId" className="inventory-console-table" columns={outboundOrderLineColumns} dataSource={order.lines} pagination={false} />
            </Card>
          </>
        ) : (
          <Card className="inventory-console-card inventory-empty-panel">暂无出库单</Card>
        )}
      </div>
    );
  }

  if (inventoryView === "stocktake-execute") {
    return (
      <div className="inventory-console-page">
        <div className="inventory-console-header">
          <div>
            <Button type="text" icon={<ArrowLeftOutlined />} className="inventory-back-button" onClick={() => setInventoryView("home")}>
              返回库存管理
            </Button>
            <Title level={3}>库存盘点</Title>
            <Text type="secondary">全部物料 {stocktakeScopeRows.length} 个｜已填写变化 {stocktakeChangedRows.length} 个</Text>
          </div>
        </div>
        <Card className="inventory-console-card">
          <div className="inventory-stocktake-toolbar">
            <Input.Search
              allowClear
              placeholder="搜索名称或品牌"
              value={stocktakeScopeKeyword}
              onChange={(event) => setStocktakeScopeKeyword(event.target.value)}
            />
            <Select
              value={stocktakeScopeCategory}
              onChange={(value) => setStocktakeScopeCategory(value)}
              options={[
                { label: "全部分类", value: "全部" },
                ...inventoryCategoryOrder.map((value) => ({ label: value, value }))
              ]}
            />
            <Select
              value={stocktakeRiskFilter}
              onChange={(value) => setStocktakeRiskFilter(value)}
              options={[
                { label: "全部异常", value: "全部" },
                ...["负库存", "临期", "已过期"].map((value) => ({ label: value, value }))
              ]}
            />
          </div>
          <Table
            rowKey="id"
            className="inventory-console-table"
            columns={stocktakeExecuteColumns}
            dataSource={filteredStocktakeScopeRows}
            pagination={false}
            scroll={{ x: 1080 }}
          />
          <div className="inventory-stocktake-footer">
            <Button type="primary" onClick={submitStocktakeExecution}>提交盘点</Button>
          </div>
        </Card>
      </div>
    );
  }

  if (inventoryView === "stocktake-confirm") {
    return (
      <div className="inventory-console-page">
        <div className="inventory-console-header">
          <div>
            <Button type="text" icon={<ArrowLeftOutlined />} className="inventory-back-button" onClick={() => setInventoryView("stocktake-execute")}>
              返回修改
            </Button>
            <Title level={3}>盘点清单</Title>
            <Text type="secondary">以下物料库存发生变化，确认后新库存生效</Text>
          </div>
        </div>
        <div className="inventory-stocktake-summary">
          <span>全部物料<strong>{stocktakeScopeRows.length} 个</strong></span>
          <span>库存变化<strong>{stocktakeChangedRows.length} 个</strong></span>
          <span>实盘多出<strong>{stocktakeDiffSummary.gainCount} 个</strong></span>
          <span>实盘少了<strong>{stocktakeDiffSummary.lossCount} 个</strong></span>
        </div>
        <Card className="inventory-console-card">
          <Table rowKey="id" className="inventory-console-table" columns={stocktakeConfirmColumns} dataSource={stocktakeChangedRows} pagination={false} />
          <Alert
            showIcon
            type="info"
            className="inventory-stocktake-alert"
            message="确认后系统会按盘点库存更新当前库存，并生成盘点调整流水。未填写盘点库存的物料不会变化。"
          />
          <div className="inventory-stocktake-footer">
            <Button onClick={() => setInventoryView("stocktake-execute")}>返回修改</Button>
            <Button type="primary" onClick={confirmStocktakeAdjustment}>确认</Button>
          </div>
        </Card>
      </div>
    );
  }

  if (inventoryView === "stocktake-complete") {
    const result = stocktakeCompleteResult;
    const gainCount = result?.summary.gainCount || 0;
    const lossCount = result?.summary.lossCount || 0;
    const adjustmentCount = result?.summary.adjustmentCount || 0;
    return (
      <div className="inventory-console-page">
        <Card className="inventory-console-card inventory-stocktake-complete">
          <CheckCircleOutlined />
          <Title level={3}>盘点已完成</Title>
          <Descriptions
            column={1}
            size="small"
            items={[
              { key: "count", label: "全部物料", children: `${stocktakeScopeRows.length} 个` },
              { key: "adjustment", label: "库存变化", children: `${adjustmentCount} 条` },
              { key: "gain", label: "实盘多出", children: `${gainCount} 个` },
              { key: "loss", label: "实盘少了", children: `${lossCount} 个` }
            ]}
          />
          <Alert
            showIcon
            type="success"
            className="inventory-stocktake-alert"
            message="新库存已生效，系统已生成盘点调整流水。"
          />
          <Space wrap>
            <Button onClick={() => setInventoryView("home")}>返回库存首页</Button>
            <Button type="primary" onClick={() => setInventoryView("ledgers")}>
              查看库存流水
            </Button>
          </Space>
        </Card>
      </div>
    );
  }

  if (inventoryView === "stocktake-detail" && selectedStocktakeRecord) {
    const detailRows = selectedStocktakeRecord.transaction?.ledgers || [];
    const stocktakeDetailColumns: ColumnsType<InventoryLedgerRow> = [
      { title: "物料名称", dataIndex: "materialId", render: (value) => getInventoryMaterialLabel(materials, value) },
      { title: "批次", dataIndex: "lotNo", render: (value) => value || "—" },
      { title: "调整数量", dataIndex: "quantityText" },
      { title: "调整后库存", dataIndex: "afterStockText" },
      { title: "关联流水", dataIndex: "id", render: () => <Button type="link" onClick={() => setInventoryView("ledgers")}>查看</Button> }
    ];
    return (
      <div className="inventory-console-page">
        <div className="inventory-console-header">
          <div>
            <Button type="text" icon={<ArrowLeftOutlined />} className="inventory-back-button" onClick={() => setInventoryView("home")}>返回库存首页</Button>
            <Title level={3}>盘点详情</Title>
            <Text type="secondary">{selectedStocktakeRecord.no}｜{selectedStocktakeRecord.name}</Text>
          </div>
        </div>
        <Card className="inventory-console-card">
          <Descriptions
            size="small"
            column={{ xs: 1, sm: 2, lg: 3 }}
            items={[
              { key: "no", label: "盘点单号", children: selectedStocktakeRecord.no },
              { key: "name", label: "盘点名称", children: selectedStocktakeRecord.name },
              { key: "mode", label: "盘点范围", children: selectedStocktakeRecord.mode },
              { key: "reason", label: "盘点原因", children: selectedStocktakeRecord.reason },
              { key: "assignee", label: "盘点人", children: selectedStocktakeRecord.assignee },
              { key: "created", label: "创建时间", children: selectedStocktakeRecord.createdAt },
              { key: "completed", label: "完成时间", children: selectedStocktakeRecord.completedAt || "—" },
              { key: "status", label: "状态", children: selectedStocktakeRecord.status }
            ]}
          />
        </Card>
        <div className="inventory-stocktake-summary">
          <span>盘点物料<strong>{selectedStocktakeRecord.materialCount} 个</strong></span>
          <span>无差异<strong>{selectedStocktakeRecord.transaction?.summary.noDifferenceCount || 0} 个</strong></span>
          <span>盘盈<strong>{selectedStocktakeRecord.transaction?.summary.gainCount || 0} 个</strong></span>
          <span>盘亏<strong>{selectedStocktakeRecord.transaction?.summary.lossCount || 0} 个</strong></span>
        </div>
        <Card className="inventory-console-card">
          <Table rowKey="id" className="inventory-console-table" columns={stocktakeDetailColumns} dataSource={detailRows} pagination={false} />
        </Card>
      </div>
    );
  }

  if (inventoryView === "detail" && selectedSummary && selectedMaterial) {
    const baseInfoItems: Array<{ label: string; value: ReactNode }> = [
      { label: "物料编码", value: resolveMaterialCode(selectedMaterial) },
      { label: "物料名称(中文)", value: selectedMaterial.materialName },
      { label: "物料名称(英文)", value: selectedMaterial.materialNameEn || "—" },
      { label: "品牌名称(中文)", value: selectedMaterial.brand },
      { label: "品牌名称(英文)", value: selectedMaterial.brandEn || "—" },
      { label: "物料类型", value: selectedMaterial.category },
      { label: "核算单位", value: selectedMaterial.baseUnit },
      { label: "单位换算", value: formatMaterialUnitConversions(selectedMaterial) },
      { label: "状态", value: getInventoryMaterialStatus(selectedMaterial) },
      { label: "备注", value: selectedMaterial.note || "—" },
      ...buildMaterialExtensionItems(selectedMaterial).map((item) => ({ label: item.label, value: item.value || "—" }))
    ];
    const selectedMaterialStatus = getInventoryMaterialStatus(selectedMaterial);
    const inventorySummaryItems: Array<{
      label: string;
      value: ReactNode;
      className?: string;
    }> = [
      {
        label: "当前库存",
        value: formatInventoryQtyWithPackage(selectedSummary.currentStockBase, selectedMaterial)
      },
      {
        label: "预计可用",
        value:
          selectedEstimatedAvailableDays !== null ? (
            `${selectedEstimatedAvailableDays}天`
          ) : (
            <Tooltip title="暂无消耗数据">
              <span>—</span>
            </Tooltip>
          )
      },
      {
        label: "库存价值",
        value: formatCurrency(selectedInventoryValue)
      },
      {
        label: "库存状态",
        value: selectedMaterialStockStatus?.label || "正常",
        className: selectedMaterialStockStatus ? `is-${selectedMaterialStockStatus.tone}` : "is-success"
      }
    ];
    const detailTabItems = [
      {
        key: "detail",
        label: "详情信息",
        children: (
          <div className="inventory-detail-workspace">
            <section className="inventory-detail-section">
              <div className="inventory-detail-section__head">
                <Title level={4}>基础信息</Title>
              </div>
              <Descriptions
                column={{ xs: 1, sm: 2, lg: 3 }}
                size="small"
                items={baseInfoItems.map((item) => ({
                  key: item.label,
                  label: item.label,
                  children: item.value
                }))}
              />
            </section>

            <section className="inventory-detail-section">
              <div className="inventory-detail-section__head">
                <Title level={4}>库存概览</Title>
              </div>
              <div className="inventory-summary-strip">
                {inventorySummaryItems.map((item) => (
                  <div key={item.label} className={`inventory-summary-strip__item ${item.className || ""}`}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            </section>

            <section className="inventory-detail-section">
              <div className="inventory-detail-section__head">
                <Title level={4}>库存趋势</Title>
                <div className="inventory-trend-range-switch" aria-label="库存趋势周期">
                  {(["7天", "30天", "90天"] as MaterialTrendRange[]).map((range) => (
                    <Button
                      key={range}
                      size="small"
                      type={materialTrendRange === range ? "primary" : "text"}
                      onClick={() => setMaterialTrendRange(range)}
                    >
                      {range}
                    </Button>
                  ))}
                </div>
              </div>
              <MaterialStockTrendChart
                points={selectedMaterialTrendPoints}
                unit={selectedSummary.baseUnit}
              />
            </section>

            <section className="inventory-detail-section">
              <div className="inventory-detail-section__head">
                <Title level={4}>批次库存</Title>
              </div>
              <Table
                rowKey="id"
                className="inventory-console-table"
                columns={materialLotColumns}
                dataSource={selectedMaterialLots}
                pagination={false}
                scroll={{ x: 980 }}
              />
            </section>

            <section className="inventory-detail-section">
              <div className="inventory-detail-section__head">
                <Title level={4}>库存风险</Title>
              </div>
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
            </section>
          </div>
        )
      },
      {
        key: "ledger",
        label: "库存流水",
        children: (
          <Card className="inventory-console-card">
            <Table
              rowKey="id"
              className="inventory-console-table"
              columns={ledgerColumns}
              dataSource={selectedMaterialLedgers}
              pagination={false}
            />
          </Card>
        )
      }
    ];

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
            </div>
          </div>
          <Space>
            <Button icon={<EditOutlined />} onClick={() => openEditMaterial(selectedMaterial.id)}>
              编辑物料
            </Button>
            {selectedMaterialStatus === "已停用" ? (
              <Button icon={<PlayCircleOutlined />} onClick={() => toggleMaterialStatus(selectedMaterial.id, "启用中")}>
                启用物料
              </Button>
            ) : (
              <Button danger icon={<StopOutlined />} onClick={() => toggleMaterialStatus(selectedMaterial.id, "已停用")}>
                停用物料
              </Button>
            )}
          </Space>
        </div>

        {renderMaterialEditModal()}
        {renderLotEditModal()}
        {renderExpiredActionModal()}

        <Tabs
          className="inventory-detail-tabs"
          activeKey={materialDetailTab}
          onChange={(key) => setMaterialDetailTab(key as MaterialDetailTabKey)}
          items={detailTabItems}
        />
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
            <Title level={3}>库存记录</Title>
          </div>
        </div>

        <Card className="inventory-console-card">
          <Tabs
            className="inventory-ledger-page-tabs"
            activeKey={ledgerPageTab}
            onChange={(key) => setLedgerPageTab(key as InventoryLedgerPageTabKey)}
            items={[
              {
                key: "ledger",
                label: "库存流水",
                children: (
                  <InventoryLedgerTable
                    dateRange={ledgerDateRange}
                    keyword={ledgerKeyword}
                    ledgerTypes={ledgerTypes}
                    columns={ledgerColumns}
                    dataSource={filteredLedgers}
                    onDateRangeChange={setLedgerDateRange}
                    onKeywordChange={setLedgerKeyword}
                    onLedgerTypesChange={setLedgerTypes}
                  />
                )
              },
              {
                key: "checks",
                label: "盘点记录",
                children: (
                  <InventoryCheckTable
                    dateRange={checkDateRange}
                    keyword={checkKeyword}
                    checker={checkChecker}
                    diffFilter={checkDiffFilter}
                    checkerOptions={inventoryCheckCheckerOptions}
                    dataSource={filteredCheckRecords}
                    expandedRowKeys={expandedCheckRowKeys}
                    focusedRecordId={focusedCheckRecordId}
                    onDateRangeChange={setCheckDateRange}
                    onKeywordChange={setCheckKeyword}
                    onCheckerChange={setCheckChecker}
                    onDiffFilterChange={setCheckDiffFilter}
                    onExpandedRowKeysChange={setExpandedCheckRowKeys}
                    onToggleRecord={toggleInventoryCheckRecord}
                    onViewLedger={openInventoryLedgerFromCheckDetail}
                  />
                )
              },
              {
                key: "inbound",
                label: "入库单",
                children: (
                  <InventoryInboundOrderTable
                    dateRange={inboundDateRange}
                    keyword={inboundKeyword}
                    typeFilter={inboundTypeFilter}
                    dataSource={filteredInboundOrders}
                    expandedRowKeys={expandedInboundRowKeys}
                    onDateRangeChange={setInboundDateRange}
                    onKeywordChange={setInboundKeyword}
                    onTypeFilterChange={setInboundTypeFilter}
                    onToggleRecord={toggleInventoryInboundOrder}
                  />
                )
              }
            ]}
          />
        </Card>
      </div>
    );
  }

  if (inventoryView === "difference-list") {
    if (activeModule !== "finance") {
      return null;
    }
    const baseDifferenceColumns: ColumnsType<InventoryDifferenceRecord> = [
      {
        title: "物料",
        dataIndex: "materialName",
        render: (_, record) => (
          <div className="inventory-cell-stack">
            <span className="inventory-cell-strong">{record.materialName}</span>
            <Text type="secondary">{record.brand}</Text>
          </div>
        )
      },
      {
        title: "分类",
        dataIndex: "category",
        filters: inventoryCategoryOrder.map((category) => ({ text: category, value: category })),
        onFilter: (value, record) => record.category === value,
        render: (_, record) =>
          record.category === "药品" && resolveMedicineClass(record)
            ? formatMaterialCategoryLabel(record)
            : record.category
      },
      {
        title: "账面库存",
        dataIndex: "bookQtyBase",
        align: "right",
        render: (_, record) => formatInventoryQty(record.bookQtyBase, record.baseUnit)
      },
      {
        title: "实盘库存",
        dataIndex: "actualQtyBase",
        align: "right",
        render: (_, record) => formatInventoryQty(record.actualQtyBase, record.baseUnit)
      },
      {
        title: "差异数量",
        dataIndex: "diffBase",
        align: "right",
        sorter: (a, b) => a.diffBase - b.diffBase,
        render: (_, record) => (
          <span className={`inventory-diff-amount inventory-diff-amount--${record.diffBase > 0 ? "gain" : "loss"}`}>
            {record.diffBase > 0 ? "+" : ""}
            {formatInventoryQty(record.diffBase, record.baseUnit)}
          </span>
        )
      },
      {
        title: "盘点结果",
        dataIndex: "direction",
        filters: [
          { text: "盘盈", value: "盘盈" },
          { text: "盘亏", value: "盘亏" }
        ],
        onFilter: (value, record) => record.direction === value,
        render: (value: InventoryDifferenceRecord["direction"]) => (
          <Tag color={value === "盘盈" ? "green" : "orange"}>{value}</Tag>
        )
      },
      {
        title: "盘点人/时间",
        dataIndex: "createdAt",
        sorter: (a, b) => a.createdAt.localeCompare(b.createdAt),
        render: (_, record) => (
          <div className="inventory-cell-stack">
            <span>{record.operator}</span>
            <Text type="secondary">{record.createdAt}</Text>
          </div>
        )
      }
    ];
    const pendingDifferenceColumns: ColumnsType<InventoryDifferenceRecord> = [
      ...baseDifferenceColumns,
      {
        title: "操作",
        key: "action",
        align: "right",
        render: (_, record) => (
          <Tooltip title="处理差异">
            <Button type="link" size="small" onClick={() => openDifferenceHandler(record)}>
              处理差异
            </Button>
          </Tooltip>
        )
      }
    ];
    const processedDifferenceColumns: ColumnsType<InventoryDifferenceRecord> = [
      ...baseDifferenceColumns,
      {
        title: "处理方式",
        dataIndex: "method",
        render: (value: InventoryDifferenceRecord["method"], record) => (
          <div className="inventory-cell-stack">
            <span>{record.handlingOptionLabel || resolveDifferenceHandlingLabel(value)}</span>
            {record.handlingReason ? <Text type="secondary">{record.handlingReason}</Text> : null}
          </div>
        )
      },
      {
        title: "处理人/时间",
        dataIndex: "processedAt",
        sorter: (a, b) => (a.processedAt || "").localeCompare(b.processedAt || ""),
        render: (_, record) => (
          <div className="inventory-cell-stack">
            <span>{record.processedBy || record.operator || "系统"}</span>
            <Text type="secondary">{record.processedAt || "—"}</Text>
          </div>
        )
      }
    ];
    const handlingDifferenceMaterial = handlingDifference
      ? materials.find((material) => material.id === handlingDifference.materialId) || null
      : null;
    const handlingDifferenceSummary = handlingDifference
      ? summaries.find((summary) => summary.materialId === handlingDifference.materialId) || null
      : null;
    const handlingDifferenceLedgers = handlingDifference
      ? ledgers
          .filter((ledger) => ledger.materialId === handlingDifference.materialId)
          .slice()
          .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
      : [];
    const handlingDifferenceDate = handlingDifference?.createdAt.slice(0, 10);
    const recentWindowStart = handlingDifferenceDate
      ? (() => {
          const date = new Date(`${handlingDifferenceDate}T00:00:00`);
          date.setDate(date.getDate() - 29);
          return formatISODate(date);
        })()
      : "";
    const recentDifferenceLedgers = handlingDifferenceDate
      ? handlingDifferenceLedgers.filter((ledger) => {
          const ledgerDate = ledger.occurredAt.slice(0, 10);
          return ledgerDate >= recentWindowStart && ledgerDate <= handlingDifferenceDate;
        })
      : handlingDifferenceLedgers;
    const latestStocktakeRecord = handlingDifference
      ? stocktakeRecords
          .filter((record) => record.completedAt || record.createdAt)
          .map((record) => {
            const scopeRow = record.scopeRows.find((row) => row.materialId === handlingDifference.materialId);
            const actualQty =
              scopeRow && typeof record.actualQuantities[scopeRow.id] === "number"
                ? record.actualQuantities[scopeRow.id]
                : undefined;
            return {
              record,
              scopeRow,
              actualQty,
              occurredAt: record.completedAt || record.createdAt
            };
          })
          .filter((item) => item.scopeRow && item.occurredAt < handlingDifference.createdAt)
          .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0]
      : undefined;
    return (
      <div className="inventory-console-page">
        <div className="inventory-console-header">
          <div>
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              className="inventory-back-button"
              onClick={() => setInventoryView("finance")}
            >
              返回财务分析
            </Button>
            <Title level={3}>盘点差异处理</Title>
            <Text type="secondary">提交盘点后差异先汇总在这里，逐条确认来源后库存与批次才会更新</Text>
          </div>
        </div>
        <Card className="inventory-console-card">
          <Tabs
            activeKey={differenceTab}
            onChange={(key) => setDifferenceTab(key as InventoryDifferenceTab)}
            items={[
              {
                key: "pending",
                label: `待处理 ${pendingDifferences.length}`,
                children: pendingDifferences.length ? (
                  <Table
                    rowKey="id"
                    className="inventory-console-table"
                    columns={pendingDifferenceColumns}
                    dataSource={pendingDifferences}
                    pagination={false}
                    scroll={{ x: 1040 }}
                  />
                ) : (
                  <div className="inventory-empty-panel">暂无待处理盘点差异</div>
                )
              },
              {
                key: "processed",
                label: `已处理 ${processedDifferences.length}`,
                children: processedDifferences.length ? (
                  <Table
                    rowKey="id"
                    className="inventory-console-table"
                    columns={processedDifferenceColumns}
                    dataSource={processedDifferences}
                    pagination={false}
                    scroll={{ x: 1180 }}
                  />
                ) : (
                  <div className="inventory-empty-panel">暂无已处理盘点差异</div>
                )
              }
            ]}
          />
        </Card>

        <Drawer
          width={560}
          title="盘点差异分析 + 处理"
          open={Boolean(handlingDifference)}
          onClose={closeDifferenceHandler}
          destroyOnHidden
          footer={
            <div className="inventory-drawer-footer">
              <Button onClick={closeDifferenceHandler}>取消</Button>
              <Button type="primary" disabled={!canSubmitDifferenceResolution} onClick={submitDifferenceResolution}>
                确认处理
              </Button>
            </div>
          }
        >
          {handlingDifference ? (
            <div className="inventory-diff-drawer">
              <div className={`inventory-diff-drawer__headline inventory-diff-drawer__headline--${handlingDifference.diffBase > 0 ? "gain" : "loss"}`}>
                <span>{handlingDifference.materialName}</span>
                <strong>
                  {handlingDifference.direction} {handlingDifference.diffBase > 0 ? "+" : ""}
                  {formatInventoryQty(handlingDifference.diffBase, handlingDifference.baseUnit)}
                </strong>
              </div>
              <Descriptions column={1} size="small" className="inventory-diff-drawer__meta">
                <Descriptions.Item label="账面库存">
                  {formatInventoryQty(handlingDifference.bookQtyBase, handlingDifference.baseUnit)}
                </Descriptions.Item>
                <Descriptions.Item label="实盘库存">
                  {formatInventoryQty(handlingDifference.actualQtyBase, handlingDifference.baseUnit)}
                </Descriptions.Item>
                <Descriptions.Item label="来源盘点单">{handlingDifference.stocktakeNo}</Descriptions.Item>
              </Descriptions>

              <div className="inventory-diff-analysis">
                <div className="inventory-diff-analysis__head">
                  <div>
                    <div className="inventory-diff-drawer__section-title">库存变动（近30天）</div>
                    <Text type="secondary">先看最近发生了什么，再判断差异来源。</Text>
                  </div>
                  <Button type="link" size="small" onClick={() => openDifferenceMaterialLedger(handlingDifference.materialId)}>
                    查看更多
                  </Button>
                </div>
                <div className="inventory-diff-analysis__summary">
                  <span>
                    当前库存
                    <strong>
                      {formatInventoryQty(
                        handlingDifferenceSummary?.currentStockBase ?? handlingDifference.bookQtyBase,
                        handlingDifference.baseUnit
                      )}
                    </strong>
                  </span>
                  <span>
                    最近一次盘点
                    <strong>
                      {latestStocktakeRecord?.actualQty !== undefined
                        ? `${formatInventoryQty(latestStocktakeRecord.actualQty, handlingDifference.baseUnit)}（${formatInventoryDate(
                            latestStocktakeRecord.occurredAt
                          )}）`
                        : handlingDifferenceMaterial?.lastStocktakeAt
                          ? `${formatInventoryDate(handlingDifferenceMaterial.lastStocktakeAt)}`
                          : "暂无记录"}
                    </strong>
                  </span>
                </div>
                <div className="inventory-diff-ledger-list">
                  {recentDifferenceLedgers.slice(0, 5).map((ledger) => (
                    <div className="inventory-diff-ledger-row" key={ledger.id}>
                      <span className="inventory-diff-ledger-row__date">{formatInventoryShortDate(ledger.occurredAt)}</span>
                      <Tag className="inventory-diff-ledger-row__type">{ledger.type}</Tag>
                      <span className="inventory-diff-ledger-row__source">{ledger.source}</span>
                      <strong className={parseLedgerQuantity(ledger.quantityText) >= 0 ? "is-up" : "is-down"}>
                        {ledger.quantityText}
                      </strong>
                    </div>
                  ))}
                  {!recentDifferenceLedgers.length ? (
                    <div className="inventory-diff-ledger-empty">近30天暂无该物料库存流水</div>
                  ) : null}
                </div>
              </div>

              <div className="inventory-diff-drawer__section-title">选择处理方式</div>
              <div className="inventory-diff-method-group">
                {inventoryDifferenceHandlingOptions
                  .filter((option) => option.direction === handlingDifference.direction)
                  .map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      className={`inventory-diff-method${handleOptionKey === option.key ? " is-selected" : ""}`}
                      onClick={() => selectDifferenceHandlingOption(option.key)}
                    >
                      <span className="inventory-diff-method__label">{option.uiLabel}</span>
                      <span className="inventory-diff-method__scene">
                        <strong>适用于：</strong>{option.appliesToText}
                      </span>
                      <span className="inventory-diff-method__scene">
                        <strong>库存处理：</strong>{option.inventoryText}
                      </span>
                      <span className="inventory-diff-method__scene">
                        <strong>账务处理：</strong>{option.accountingText}
                      </span>
                    </button>
                  ))}
              </div>
              {handlingOption ? (
                <div className="inventory-diff-drawer__field">
                  <Text type="secondary">2. 处理原因</Text>
                  <Select
                    placeholder="请选择处理原因"
                    value={handleReason}
                    onChange={(value) => {
                      setHandleReason(value);
                      if (value !== "其他") {
                        setHandleReasonNote("");
                      }
                    }}
                    options={handlingOption.reasons.map((reason) => ({ label: reason, value: reason }))}
                  />
                </div>
              ) : null}
              {handlingOption?.requiredSupplements.includes("amount") ? (
                <div className="inventory-diff-drawer__field">
                  <Text type="secondary">补录金额（元）</Text>
                  <InputNumber
                    min={0.01}
                    precision={2}
                    placeholder="请输入补录金额"
                    value={handleSupplementAmount}
                    onChange={(value) => setHandleSupplementAmount(value === null ? undefined : Number(value))}
                    style={{ width: "100%" }}
                  />
                </div>
              ) : null}
              {handlingOption ? (
                <div className="inventory-diff-drawer__field">
                  <Text type="secondary">{handleReason === "其他" ? "原因备注（必填）" : "原因备注（选填）"}</Text>
                  <Input.TextArea
                    rows={3}
                    placeholder="补充业务单据、现场说明或供应商信息"
                    value={handleReasonNote}
                    onChange={(event) => setHandleReasonNote(event.target.value)}
                  />
                </div>
              ) : null}
              {handlingMethodMeta ? (
                <div className="inventory-diff-impact">
                  <div className="inventory-diff-impact__title">本次处理影响</div>
                  <div className="inventory-diff-impact__row">
                    <span>库存影响</span>
                    <strong>
                      库存{handlingMethodMeta.stockEffect} {formatInventoryQty(Math.abs(handlingDifference.diffBase), handlingDifference.baseUnit)}
                    </strong>
                  </div>
                  <div className="inventory-diff-impact__row">
                    <span>库存流水</span>
                    <strong>{handlingMethodMeta.ledgerType}</strong>
                  </div>
                  <div className="inventory-diff-impact__row">
                    <span>业务消耗</span>
                    <strong>{handlingMethodMeta.consumptionEffect}</strong>
                  </div>
                  <div className="inventory-diff-impact__row">
                    <span>财务状态</span>
                    <strong>{handlingMethodMeta.financeStatus}</strong>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </Drawer>
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
          <Button icon={<HistoryOutlined />} onClick={() => setInventoryView("ledgers")}>
            库存记录
          </Button>
          <Button
            type="primary"
            icon={<InboxOutlined />}
            onClick={() => {
              setBatchReceiveEntries([]);
              setInventoryView("batch-receive");
            }}
          >
            入库
          </Button>
          <Button onClick={openStocktakeScope}>发起盘点</Button>
        </Space>
      </div>

      <div className="inventory-home-health-grid">
        {renderFeedStockTrendCard()}
        {renderInventoryRiskCard()}
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

      {renderExpiredActionModal()}
    </div>
  );
}
