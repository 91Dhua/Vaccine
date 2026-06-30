import type { ColumnsType } from "antd/es/table";
import type { TableRowSelection } from "antd/es/table/interface";
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
  Radio,
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
  DeleteOutlined,
  EditOutlined,
  ExportOutlined,
  EyeOutlined,
  InfoCircleOutlined,
  InboxOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  StopOutlined
} from "@ant-design/icons";
import { useEffect, useMemo, useRef, useState, type Key, type MouseEvent as ReactMouseEvent } from "react";
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
  buildInventoryStocktakeTransaction,
  buildInventoryStocktakeDifferences,
  buildInventoryDifferenceResolution,
  resolveInventoryToleranceDifferences,
  inventoryDifferenceMethodMetas,
  inventorySeedDifferences,
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
  inventoryCategoryFieldSpecs,
  inventoryCategoryOrder,
  formatInventoryMaterialFieldValue,
  isMaterialProfileIncomplete,
  inventorySeedLedgers,
  inventorySeedLots,
  inventorySeedMaterials,
  inventoryUnitOptions,
  receiveMaterialCategoryOptions,
  toggleInventoryMaterialStatus,
  updateInventoryMaterial,
  validateInventoryMaterialEdit,
  validateInventoryPackageConversions,
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

const { Text, Title } = Typography;
const STOCKTAKE_RISK_DAYS = 30;

type InventoryHomeRiskKind = "负库存" | "已过期" | "临期" | "低库存";
type InventoryListStockStatus = "正常" | "临期" | "低库存" | "负库存";
type InventoryAnalyticsCategoryFilter = "全部" | "饲料" | "兽药" | "疫苗" | "消毒用品" | "保健品" | "工具";
type InventoryAnalyticsTimeRange = "近7天" | "近30天" | "本月" | "上月" | "自定义";

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

type InventoryTopSpendRow = {
  materialId: string;
  materialName: string;
  category: InventoryCategory;
  amount: number;
  share: number;
  color: string;
};

const inventoryAnalyticsCategoryFilterOptions: InventoryAnalyticsCategoryFilter[] = ["全部", "饲料", "兽药", "疫苗", "消毒用品", "保健品", "工具"];
const inventoryAnalyticsTimeRangeOptions: InventoryAnalyticsTimeRange[] = ["近7天", "近30天", "本月", "上月", "自定义"];
const inventoryAmountChartCategories: InventoryCategory[] = ["饲料", "兽药", "疫苗", "消毒用品", "保健品", "工具", "其他"];
const inventoryCategoryChartColors: Record<InventoryCategory, string> = {
  饲料: "#4F8CFF",
  兽药: "#35B8A6",
  疫苗: "#7B6DFF",
  消毒用品: "#FF9B62",
  保健品: "#78C56D",
  工具: "#8898B3",
  其他: "#C3CBD8"
};

const initialToleranceResolution = resolveInventoryToleranceDifferences({
  differences: inventorySeedDifferences,
  materials: inventorySeedMaterials,
  lots: inventorySeedLots,
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
  safetyStockBase?: number;
  note?: string;
};

type InventoryOutboundFormValues = {
  materialId: string;
  outboundQuantity: number;
  unit: string;
  purpose: string;
  remark?: string;
};

type InventoryScrapFormValues = {
  scrapQuantity: number;
  reason: string;
  handlingMethod: string;
};

type InventoryHomeRiskRow = {
  id: string;
  type: InventoryHomeRiskKind;
  materialId: string;
  materialName: string;
  brand: string;
  lotNo?: string;
  valueText: string;
  detailText: string;
  actionText?: string;
  auxiliaryActionText?: string;
  priority: number;
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

type ConsoleInventoryInitialView = "home" | "ledgers";

type ConsoleInventoryPageProps = {
  initialView?: ConsoleInventoryInitialView;
};

type InventoryStocktakeTaskFormValues = {
  name: string;
  reason: string;
  assignee: string;
  deadline?: string;
  showBookStock: boolean;
  remark?: string;
};

const materialStatusFilterOptions: InventoryMaterialStatusFilter[] = ["全部", "启用中", "已停用"];
const materialEditCategoryOptions: InventoryCategory[] = ["饲料", "兽药", "保健品", "疫苗", "消毒用品", "工具", "其他"];
const stocktakeReasonOptions = ["异常复核", "月度盘点", "临时抽查", "交接盘点", "库存修正", "其他"];
const inventoryScrapReasonOptions = ["超过有效期", "污染/破损", "保存异常", "盘点确认不可用", "其他"];
const inventoryScrapHandlingMethodOptions = ["无害化处理", "退回供应商", "集中销毁", "交由第三方处理", "其他"];

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

function resolveBusinessType(source: string) {
  if (source.includes("治疗")) return "治疗任务";
  if (source.includes("免疫")) return "免疫任务";
  if (source.includes("消毒")) return "消毒任务";
  if (source.includes("饲喂")) return "饲喂任务";
  if (source.includes("盘点")) return "库存盘点";
  if (source.includes("入库")) return "采购入库";
  return "其他业务";
}

function resolveMaterialCode(material: InventoryMaterial) {
  return material.materialCode || `MAT-${material.id.slice(-6).toUpperCase()}`;
}

function buildMaterialExtensionItems(material: InventoryMaterial) {
  const specs = inventoryCategoryFieldSpecs[material.category] || [];
  return specs.map((spec) => ({
    label: spec.label,
    value: formatInventoryMaterialFieldValue(material, spec)
  }));
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
    .filter((conversion) => conversion.fromUnit || conversion.quantity);
}

function buildDefaultPackageConversion(): ReceivePackageConversionDraft[] {
  return [{ fromUnit: undefined, quantity: undefined }];
}

function buildReceiveUnitOptions(baseUnit: string, conversions: InventoryPackageConversion[]) {
  return Array.from(new Set([baseUnit, ...conversions.map((conversion) => conversion.fromUnit)].filter(Boolean))).map((unit) => ({
    label: unit,
    value: unit
  }));
}

function formatPackageConversionSummary(conversions: InventoryPackageConversion[]) {
  return conversions.map((conversion) => `1${conversion.fromUnit} = ${formatInventoryNumber(conversion.quantity)}${conversion.toUnit}`);
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

function formatInventoryQtyWithPackage(quantity: number, material?: InventoryMaterial | null, preferredUnit?: string) {
  const baseUnit = material?.baseUnit || "";
  const baseText = formatInventoryQty(quantity, baseUnit);
  const packageUnit = preferredUnit || material?.auxiliaryUnit;
  if (!material || !packageUnit || packageUnit === baseUnit) return baseText;
  const factor = calculateInventoryBaseQuantity(1, packageUnit, baseUnit, material.packageConversions || []);
  if (!factor) return baseText;
  return `${baseText}（约 ${formatInventoryNumber(quantity / factor)}${packageUnit}）`;
}

function formatReceiveMaterialSpecLine(material: InventoryMaterial, summary?: InventorySummary) {
  const stockText = summary
    ? material.category === "饲料"
      ? formatInventoryQtyWithPackage(summary.currentStockBase, material)
      : formatInventoryQty(summary.currentStockBase, material.baseUnit)
    : formatInventoryQty(0, material.baseUnit);
  return `规格：${formatPrimaryPackageSpec(material, material.packageConversions || [])}｜当前库存：${stockText}`;
}

function formatReceiveIncreasePreview(quantity: number | undefined, unit: string | undefined, baseUnit: string, conversions: InventoryPackageConversion[]) {
  if (!quantity || quantity <= 0 || !unit || !baseUnit) return "";
  const baseQuantity = calculateInventoryBaseQuantity(quantity, unit, baseUnit, conversions);
  if (!baseQuantity) return "";
  return `本次入库：${formatInventoryNumber(quantity)}${unit} = ${formatInventoryQty(baseQuantity, baseUnit)}`;
}

function resolveRiskPrimaryAction(type: InventoryRiskType | InventoryHomeRiskKind) {
  if (type === "负库存") return "发起盘点";
  if (type === "临期" || type === "低库存") return undefined;
  return "报废";
}

function resolveRiskAuxiliaryAction(_type: InventoryRiskType | InventoryHomeRiskKind) {
  return undefined;
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
      name: "兽药月度盘点",
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

export function ConsoleInventoryPage({ initialView = "home" }: ConsoleInventoryPageProps) {
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
    | "stocktake-scope"
    | "stocktake-execute"
    | "stocktake-confirm"
    | "stocktake-complete"
    | "stocktake-detail"
    | "difference-list"
  >(initialView);
  const [activeCategory, setActiveCategory] = useState<InventoryCategory>(inventoryCategoryOrder[0]);
  const [summaryKeyword, setSummaryKeyword] = useState("");
  const [materialStatusFilter, setMaterialStatusFilter] = useState<InventoryMaterialStatusFilter>("启用中");
  const [ledgerKeyword, setLedgerKeyword] = useState("");
  const [ledgerDateRange, setLedgerDateRange] = useState<[string, string] | null>(null);
  const [ledgerTypes, setLedgerTypes] = useState<InventoryLedgerType[]>([]);
  const [stocktakeStartOpen, setStocktakeStartOpen] = useState(false);
  const [stocktakeMode, setStocktakeMode] = useState<InventoryStocktakeMode>("异常盘点");
  const [stocktakeScopeRows, setStocktakeScopeRows] = useState<InventoryStocktakeScopeRow[]>([]);
  const [stocktakeScopeKeyword, setStocktakeScopeKeyword] = useState("");
  const [stocktakeScopeCategory, setStocktakeScopeCategory] = useState<InventoryCategory | "全部">("全部");
  const [stocktakeScopeStatus, setStocktakeScopeStatus] = useState<InventoryStocktakeScopeRow["status"] | "全部">("全部");
  const [stocktakeScopeSelectedRowIds, setStocktakeScopeSelectedRowIds] = useState<string[]>([]);
  const [stocktakeTaskValues, setStocktakeTaskValues] = useState<InventoryStocktakeTaskFormValues | null>(null);
  const [stocktakeActuals, setStocktakeActuals] = useState<Record<string, number | undefined>>({});
  const [stocktakeSubmitted, setStocktakeSubmitted] = useState(false);
  const [stocktakeCompleteResult, setStocktakeCompleteResult] = useState<InventoryStocktakeTransaction | null>(null);
  const [selectedStocktakeRecordNo, setSelectedStocktakeRecordNo] = useState<string | null>(null);
  const [stocktakeRecords, setStocktakeRecords] = useState<InventoryStocktakeRecord[]>(createInitialStocktakeRecords);
  const [differences, setDifferences] = useState<InventoryDifferenceRecord[]>([
    ...initialToleranceResolution.pendingDifferences,
    ...initialToleranceResolution.processedDifferences
  ]);
  const [stocktakeDifferenceResult, setStocktakeDifferenceResult] = useState<InventoryDifferenceRecord[]>([]);
  const [handlingDifferenceId, setHandlingDifferenceId] = useState<string | null>(null);
  const [handleMethod, setHandleMethod] = useState<InventoryDifferenceMethod | null>(null);
  const [handleRelatedLotNo, setHandleRelatedLotNo] = useState<string | undefined>(undefined);
  const [outboundOpen, setOutboundOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receiveMaterialText, setReceiveMaterialText] = useState("");
  const [receiveMaterialId, setReceiveMaterialId] = useState<string | undefined>();
  const [receiveNewMaterialDraft, setReceiveNewMaterialDraft] = useState<InventoryMaterial | null>(null);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickCreateForm] = Form.useForm();
  const quickCreateCategory = (Form.useWatch("category", quickCreateForm) || "饲料") as InventoryCategory;
  const quickCreateBaseUnit = Form.useWatch("baseUnit", quickCreateForm) as string | undefined;
  const quickCreatePackageDrafts = (Form.useWatch("packageConversions", quickCreateForm) || []) as ReceivePackageConversionDraft[];
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [activeHomeRiskType, setActiveHomeRiskType] = useState<InventoryHomeRiskKind | "全部">("全部");
  const [analyticsCategoryFilter, setAnalyticsCategoryFilter] = useState<InventoryAnalyticsCategoryFilter>("全部");
  const [analyticsTimeRange, setAnalyticsTimeRange] = useState<InventoryAnalyticsTimeRange>("本月");
  const [analyticsCustomRange, setAnalyticsCustomRange] = useState<[string, string] | null>(null);
  const [expiredActionLot, setExpiredActionLot] = useState<InventoryLot | null>(null);
  const [receiveForm] = Form.useForm();
  const [outboundForm] = Form.useForm<InventoryOutboundFormValues>();
  const [scrapForm] = Form.useForm<InventoryScrapFormValues>();
  const [editMaterialForm] = Form.useForm<InventoryMaterialEditFormValues>();
  const outboundMaterialId = Form.useWatch("materialId", outboundForm) as string | undefined;
  const receiveBaseUnitValue = Form.useWatch("baseUnit", receiveForm) as string | undefined;
  const receivePackageDrafts = (Form.useWatch("packageConversions", receiveForm) || []) as ReceivePackageConversionDraft[];
  const receiveInboundQuantity = Form.useWatch("inboundQuantity", receiveForm) as number | undefined;
  const receiveInboundUnit = Form.useWatch("inboundUnit", receiveForm) as string | undefined;
  const editBaseUnitValue = Form.useWatch("baseUnit", editMaterialForm) as string | undefined;

  useEffect(() => {
    setInventoryView(initialView);
  }, [initialView]);

  const summaries = useMemo(() => buildInventorySummaries(materials, lots), [materials, lots]);
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
  const currentStocktakeNo = stocktakeTaskValues ? `PD${new Date().toISOString().slice(0, 10).replace(/-/g, "")}002` : "";
  const filteredStocktakeScopeRows = useMemo(() => {
    const keyword = stocktakeScopeKeyword.trim();
    return stocktakeScopeRows.filter((row) => {
      if (stocktakeScopeCategory !== "全部" && row.category !== stocktakeScopeCategory) return false;
      if (stocktakeScopeStatus !== "全部" && row.status !== stocktakeScopeStatus) return false;
      if (!keyword) return true;
      return `${row.materialName}${row.brand}${row.lotNo || ""}`.includes(keyword);
    });
  }, [stocktakeScopeCategory, stocktakeScopeKeyword, stocktakeScopeRows, stocktakeScopeStatus]);
  const selectedStocktakeScopeRows = useMemo(() => {
    if (stocktakeMode !== "指定物料盘点") return stocktakeScopeRows;
    const selectedIds = new Set(stocktakeScopeSelectedRowIds);
    return stocktakeScopeRows.filter((row) => selectedIds.has(row.id));
  }, [stocktakeMode, stocktakeScopeRows, stocktakeScopeSelectedRowIds]);
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
  const stocktakeDiffSummary = stocktakeDifferenceRows.reduce(
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
          detailText: item.lotNo ? `批次 ${item.lotNo}` : "库存异常，请查看物料详情",
          actionText: resolveRiskPrimaryAction(item.type),
          auxiliaryActionText: resolveRiskAuxiliaryAction(item.type),
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
  const materialMap = useMemo(() => new Map(materials.map((material) => [material.id, material])), [materials]);
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
  const consumptionTrendActiveDays = useMemo(
    () => consumptionTrendPoints.filter((point) => point.amount > 0).length,
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
  const windowTopSpendRows = useMemo<InventoryTopSpendRow[]>(() => {
    const amountByMaterial = consumptionWindowLedgers.reduce((map, ledger) => {
      map.set(ledger.materialId, (map.get(ledger.materialId) || 0) + resolveLedgerConsumptionCost(ledger));
      return map;
    }, new Map<string, number>());
    const totalAmount = Array.from(amountByMaterial.values()).reduce((sum, amount) => sum + amount, 0);
    return Array.from(amountByMaterial.entries())
      .map(([materialId, amount]) => {
        const material = materialMap.get(materialId);
        return {
          materialId,
          materialName: material?.materialName || "未知物料",
          category: material?.category || "其他",
          amount,
          share: totalAmount > 0 ? amount / totalAmount : 0,
          color: inventoryCategoryChartColors[material?.category || "其他"]
        };
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [consumptionWindowLedgers, lotByNo, materialAverageCostMap, materialMap]);
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
  const editSafetyStockUnitText = editingMaterial?.baseUnit || editBaseUnitValue || "核算单位";
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
  const activeReceiveNewDraft =
    !selectedReceiveMaterial && receiveNewMaterialDraft && receiveNewMaterialDraft.materialName === receiveMaterialKeyword
      ? receiveNewMaterialDraft
      : null;
  const effectiveReceiveMaterial = selectedReceiveMaterial || activeReceiveNewDraft;
  const receiveDuplicateCandidates =
    receiveMaterialKeyword && !effectiveReceiveMaterial
      ? activeReceiveMaterials
          .filter(
            (item) =>
              item.materialName !== receiveMaterialKeyword &&
              (item.materialName.includes(receiveMaterialKeyword) ||
                receiveMaterialKeyword.includes(item.materialName))
          )
          .slice(0, 4)
      : [];
  const receiveMaterialInfoVisible = Boolean(receiveMaterialKeyword);
  const effectiveReceiveBaseUnit = effectiveReceiveMaterial?.baseUnit || receiveBaseUnitValue || "";
  const receivePackageConversions = effectiveReceiveMaterial?.packageConversions || normalizeReceivePackageConversions(effectiveReceiveBaseUnit, receivePackageDrafts);
  const receiveInboundUnitOptions = buildReceiveUnitOptions(effectiveReceiveBaseUnit, receivePackageConversions);
  const receivePackageValidationMessage =
    !effectiveReceiveMaterial && effectiveReceiveBaseUnit && receivePackageConversions.length
      ? validateInventoryPackageConversions(effectiveReceiveBaseUnit, receivePackageConversions)
      : null;
  const receivePackageSummary = formatPackageConversionSummary(receivePackageConversions);
  const receiveSelectedSummary = selectedReceiveMaterial
    ? summaries.find((summary) => summary.materialId === selectedReceiveMaterial.id)
    : undefined;
  const receiveMaterialSpecLine = selectedReceiveMaterial
    ? formatReceiveMaterialSpecLine(selectedReceiveMaterial, receiveSelectedSummary)
    : "";
  const receiveIncreasePreview = formatReceiveIncreasePreview(
    receiveInboundQuantity,
    receiveInboundUnit,
    effectiveReceiveBaseUnit,
    receivePackageConversions
  );
  const receiveMaterialOptions = getInventoryReceiveMaterialOptions(materials);
  const activeOutboundMaterials = materials.filter((material) => getInventoryMaterialStatus(material) === "启用中");
  const selectedOutboundMaterial = outboundMaterialId
    ? activeOutboundMaterials.find((item) => item.id === outboundMaterialId) || null
    : null;
  const selectedOutboundSummary = outboundMaterialId
    ? summaries.find((item) => item.materialId === outboundMaterialId) || null
    : null;
  const outboundMaterialOptions = activeOutboundMaterials.map((material) => {
    const summary = summaries.find((item) => item.materialId === material.id);
    return {
      label: `${material.materialName} ${material.brand} · 库存 ${
        summary ? formatInventoryQty(summary.currentStockBase, material.baseUnit) : `0${material.baseUnit}`
      }`,
      value: material.id
    };
  });
  const selectedRiskMessages =
    selectedSummary && selectedMaterial
      ? [
          selectedSummary.currentStockBase < 0
            ? `负库存：当前库存 ${formatInventoryQty(selectedSummary.currentStockBase, selectedSummary.baseUnit)}，请补录入库或修正库存流水。`
            : "",
          selectedSummary.safetyStockBase !== undefined &&
          selectedSummary.currentStockBase >= 0 &&
          selectedSummary.currentStockBase <= selectedSummary.safetyStockBase
            ? `低库存：当前库存 ${formatInventoryQty(selectedSummary.currentStockBase, selectedSummary.baseUnit)}，低于或等于安全库存 ${formatInventoryQty(selectedSummary.safetyStockBase, selectedSummary.baseUnit)}。`
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
  const openCategory = (category: InventoryCategory, keyword = "") => {
    setActiveCategory(category);
    setSummaryKeyword(keyword);
  };

  const openMaterialDetail = (materialId: string) => {
    setSelectedMaterialId(materialId);
    setInventoryView("detail");
  };

  const openExpiredScrapModal = (lot: InventoryLot | null) => {
    if (!lot) return;
    setExpiredActionLot(lot);
    scrapForm.setFieldsValue({
      scrapQuantity: lot.remainingQtyBase,
      reason: "超过有效期",
      handlingMethod: "无害化处理"
    });
  };

  const openStocktakeScope = (mode: InventoryStocktakeMode, targetMaterialId?: string) => {
    const effectiveMode: InventoryStocktakeMode = targetMaterialId ? "指定物料盘点" : mode;
    const rows = buildInventoryStocktakeScope({
      mode: effectiveMode,
      materials,
      lots,
      summaries,
      category: activeCategory
    });
    const initialSelectedRows = targetMaterialId
      ? buildInventoryStocktakeScope({
          mode: "指定物料盘点",
          materials,
          lots,
          summaries,
          targetMaterialId
        })
      : effectiveMode === "指定物料盘点"
        ? []
        : rows;
    setStocktakeMode(effectiveMode);
    setStocktakeScopeRows(rows);
    setStocktakeScopeSelectedRowIds(initialSelectedRows.map((row) => row.id));
    setStocktakeScopeKeyword("");
    setStocktakeScopeCategory("全部");
    setStocktakeScopeStatus("全部");
    setStocktakeActuals({});
    setStocktakeSubmitted(false);
    setStocktakeTaskValues(null);
    setStocktakeCompleteResult(null);
    setStocktakeStartOpen(false);
    setInventoryView("stocktake-scope");
  };

  const removeStocktakeScopeRow = (rowId: string) => {
    setStocktakeScopeRows((prev) => prev.filter((row) => row.id !== rowId));
    setStocktakeScopeSelectedRowIds((prev) => prev.filter((id) => id !== rowId));
    setStocktakeActuals((prev) => {
      const next = { ...prev };
      delete next[rowId];
      return next;
    });
  };

  const fillStocktakeBookStock = () => {
    setStocktakeActuals((prev) => ({
      ...selectedStocktakeScopeRows.reduce<Record<string, number>>((values, row) => {
        values[row.id] = row.bookQtyBase < 0 ? 0 : row.bookQtyBase;
        return values;
      }, {}),
      ...prev
    }));
  };

  const beginStocktakeExecution = () => {
    setStocktakeTaskValues(buildDefaultStocktakeTaskValues(stocktakeMode));
    setInventoryView("stocktake-execute");
  };

  const validateStocktakeExecution = () => {
    for (const row of selectedStocktakeScopeRows) {
      const actualQty = stocktakeActuals[row.id];
      if (actualQty === undefined || actualQty < 0) {
        message.error("请完整填写实际库存，且实际库存不能小于 0。");
        return false;
      }
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
      const newDifferences = buildInventoryStocktakeDifferences({
        scopeRows: selectedStocktakeScopeRows,
        actualQuantities: stocktakeActuals,
        operator: effectiveStocktakeValues.assignee,
        stocktakeNo,
        occurredAt,
        idPrefix: `diff-${Date.now()}`
      });
      const toleranceResolution = resolveInventoryToleranceDifferences({
        differences: newDifferences,
        materials,
        lots,
        operator: "系统",
        occurredAt,
        ledgerIdPrefix: `ledger-auto-tolerance-${Date.now()}`
      });
      const allStocktakeDifferences = [
        ...toleranceResolution.pendingDifferences,
        ...toleranceResolution.processedDifferences
      ];
      setMaterials(toleranceResolution.materials);
      setLots(toleranceResolution.lots);
      setLedgers((prev) => [...toleranceResolution.ledgers, ...prev]);
      setDifferences((prev) => [...allStocktakeDifferences, ...prev]);
      setStocktakeDifferenceResult(allStocktakeDifferences);
      const pendingDifferenceCount = toleranceResolution.pendingDifferences.length;
      const nextRecord: InventoryStocktakeRecord = {
        no: stocktakeNo,
        name: effectiveStocktakeValues.name,
        mode: stocktakeMode,
        materialCount: selectedStocktakeScopeRows.length,
        differenceCount: allStocktakeDifferences.length,
        status: pendingDifferenceCount > 0 ? "待确认" : "已完成",
        reason: effectiveStocktakeValues.reason,
        assignee: effectiveStocktakeValues.assignee,
        createdAt: occurredAt.replace("10:45", "10:30"),
        completedAt: pendingDifferenceCount > 0 ? undefined : occurredAt,
        scopeRows: selectedStocktakeScopeRows,
        actualQuantities: Object.fromEntries(
          Object.entries(stocktakeActuals).filter((entry): entry is [string, number] => typeof entry[1] === "number")
        )
      };
      setStocktakeRecords((prev) => [nextRecord, ...prev]);
      setSelectedStocktakeRecordNo(stocktakeNo);
      setInventoryView("stocktake-complete");
      message.success(
        pendingDifferenceCount > 0
          ? `已自动处理 ${toleranceResolution.processedDifferences.length} 条小差异，仍有 ${pendingDifferenceCount} 条进入盘点差异处理`
          : toleranceResolution.processedDifferences.length > 0
            ? `盘点完成，${toleranceResolution.processedDifferences.length} 条小差异已自动处理并生成库存流水`
            : "盘点完成，账实一致，无差异"
      );
    } catch (error) {
      message.error(error instanceof Error ? error.message : "盘点提交失败，请检查数据。");
    }
  };

  const pendingDifferences = useMemo(
    () => differences.filter((item) => item.status === "待处理"),
    [differences]
  );
  const pendingDifferenceMaterialIds = useMemo(
    () => new Set(pendingDifferences.map((item) => item.materialId)),
    [pendingDifferences]
  );
  const pendingDifferenceByMaterial = useMemo(() => {
    const map = new Map<string, number>();
    pendingDifferences.forEach((item) => {
      map.set(item.materialId, (map.get(item.materialId) || 0) + item.diffBase);
    });
    return map;
  }, [pendingDifferences]);
  const handlingDifference = useMemo(
    () => differences.find((item) => item.id === handlingDifferenceId) || null,
    [differences, handlingDifferenceId]
  );
  const handlingMethodMeta = useMemo(
    () => inventoryDifferenceMethodMetas.find((item) => item.method === handleMethod) || null,
    [handleMethod]
  );
  const handlingLotOptions = useMemo(() => {
    if (!handlingDifference) return [];
    return getInventoryLotsForMaterial(lots, handlingDifference.materialId)
      .filter((lot) => lot.lotNo)
      .map((lot) => ({
        label: `${lot.lotNo}（剩余 ${formatInventoryQty(lot.remainingQtyBase, handlingDifference.baseUnit)}）`,
        value: lot.lotNo
      }));
  }, [handlingDifference, lots]);

  const openDifferenceHandler = (difference: InventoryDifferenceRecord) => {
    setHandlingDifferenceId(difference.id);
    setHandleMethod(null);
    setHandleRelatedLotNo(difference.relatedLotNo);
  };
  const closeDifferenceHandler = () => {
    setHandlingDifferenceId(null);
    setHandleMethod(null);
    setHandleRelatedLotNo(undefined);
  };
  const submitDifferenceResolution = () => {
    if (!handlingDifference || !handleMethod) {
      message.error("请选择差异处理方式。");
      return;
    }
    const occurredAt = `${new Date().toISOString().slice(0, 10)} 11:20`;
    try {
      const resolution = buildInventoryDifferenceResolution({
        record: handlingDifference,
        method: handleMethod,
        materials,
        lots,
        relatedLotNo: handleRelatedLotNo,
        operator: handlingDifference.operator,
        occurredAt,
        ledgerIdPrefix: `ledger-diff-${Date.now()}`
      });
      setMaterials(resolution.materials);
      setLots(resolution.lots);
      setLedgers((prev) => [...resolution.ledgers, ...prev]);
      setDifferences((prev) =>
        prev.map((item) =>
          item.id === handlingDifference.id
            ? {
                ...item,
                status: "已处理",
                method: handleMethod,
                relatedLotNo: handleRelatedLotNo,
                financeStatus: resolution.financeStatus,
                resultLedgerIds: resolution.ledgers.map((ledger) => ledger.id),
                processedAt: occurredAt
              }
            : item
        )
      );
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

  const deleteMaterial = (materialId: string) => {
    const material = materials.find((item) => item.id === materialId);
    if (!material) return;
    const usageState = resolveMaterialUsageState(materialId);
    Modal.confirm({
      title: usageState.currentStock !== 0 ? "当前物料仍有库存，确认删除？" : "确认删除物料？",
      content:
        usageState.currentStock !== 0
          ? "当前物料仍有库存。删除后，该物料将不再支持新任务选择和新增入库，但库存、批次和历史记录仍会保留。请确认是否删除。"
          : "删除后，该物料将不再支持新任务选择和新增入库，但历史记录仍会保留。请确认是否删除。",
      okText: "确认删除",
      cancelText: "取消",
      okButtonProps: { danger: true },
      onOk: () => {
        setMaterials((prev) => toggleInventoryMaterialStatus(prev, materialId, "已停用"));
        setSelectedMaterialId(null);
        setInventoryView("home");
        message.success("物料已删除");
      }
    });
  };

  const resetReceiveFormState = () => {
    receiveForm.resetFields();
    setReceiveMaterialText("");
    setReceiveMaterialId(undefined);
    setReceiveNewMaterialDraft(null);
  };

  const buildReceiveProfileValues = (category: InventoryCategory, values: Record<string, unknown>) => {
    const specs = inventoryCategoryFieldSpecs[category] || [];
    const profile: Record<string, unknown> = {};
    specs.forEach((spec) => {
      profile[String(spec.key)] = values[String(spec.key)];
    });
    return profile;
  };

  const openQuickCreateMaterial = () => {
    const presetCategory = (receiveForm.getFieldValue("category") as InventoryCategory) || "饲料";
    const presetBaseUnit = inventoryCategoryBaseUnitRecommendations[presetCategory]?.[0];
    quickCreateForm.resetFields();
    quickCreateForm.setFieldsValue({
      materialName: receiveMaterialKeyword,
      category: presetCategory,
      baseUnit: presetBaseUnit,
      packageConversions: buildDefaultPackageConversion()
    });
    setQuickCreateOpen(true);
  };

  const confirmQuickCreateMaterial = async () => {
    const values = await quickCreateForm.validateFields();
    const category = (values.category || "饲料") as InventoryCategory;
    const baseUnit = String(values.baseUnit);
    const packageConversions = normalizeReceivePackageConversions(baseUnit, values.packageConversions);
    if (packageConversions.length) {
      const packageMessage = validateInventoryPackageConversions(baseUnit, packageConversions);
      if (packageMessage) {
        message.error(packageMessage);
        return;
      }
    }
    const draft: InventoryMaterial = {
      id: `mat-draft-${Date.now()}`,
      materialName: String(values.materialName).trim(),
      materialNameEn: values.materialNameEn ? String(values.materialNameEn).trim() : undefined,
      category,
      brand: String(values.brand).trim(),
      brandEn: values.brandEn ? String(values.brandEn).trim() : undefined,
      baseUnit,
      unitSystem: [`1${baseUnit} = 1${baseUnit}`],
      packageConversions,
      status: "启用中",
      auxiliaryUnit: packageConversions[0]?.fromUnit || baseUnit,
      note: values.note ? String(values.note).trim() : undefined,
      ...buildReceiveProfileValues(category, values)
    };
    draft.profileIncomplete = isMaterialProfileIncomplete(draft);

    setReceiveNewMaterialDraft(draft);
    setReceiveMaterialId(undefined);
    setReceiveMaterialText(draft.materialName);
    receiveForm.setFieldsValue({
      materialName: draft.materialName,
      brand: draft.brand,
      category: draft.category,
      baseUnit: draft.baseUnit,
      inboundUnit: draft.auxiliaryUnit,
      inboundQuantity: undefined
    });
    setQuickCreateOpen(false);
    message.success(draft.profileIncomplete ? "已新建物料草稿，部分专属资料待完善" : "已新建物料草稿");
  };

  const clearReceiveNewMaterialDraft = () => {
    setReceiveNewMaterialDraft(null);
    setReceiveMaterialId(undefined);
    setReceiveMaterialText("");
    receiveForm.setFieldsValue({
      materialName: undefined,
      brand: undefined,
      category: undefined,
      baseUnit: undefined,
      inboundUnit: undefined,
      inboundQuantity: undefined
    });
  };

  const resetOutboundFormState = () => {
    outboundForm.resetFields();
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
    setReceiveNewMaterialDraft(null);
    const defaultInboundUnit = material.auxiliaryUnit || material.packageConversions?.[0]?.fromUnit || material.baseUnit;
    receiveForm.setFieldsValue({
      brand: material.brand,
      category: material.category,
      baseUnit: material.baseUnit,
      packageConversions: undefined,
      inboundUnit: defaultInboundUnit,
      inboundQuantity: undefined
    });
  };

  const openReceiveForMaterial = (materialId: string) => {
    const material = activeReceiveMaterials.find((item) => item.id === materialId);
    if (!material) return;
    resetReceiveFormState();
    setReceiveMaterialText(material.materialName);
    receiveForm.setFieldsValue({ materialName: material.materialName });
    applyExistingReceiveMaterial(material);
    setReceiveOpen(true);
  };

  const handleRiskAction = (actionText: string | undefined, item: InventoryHomeRiskRow) => {
    if (!actionText) return;
    if (actionText === "入库") {
      openReceiveForMaterial(item.materialId);
      return;
    }
    if (actionText === "报废") {
      const lot = item.lotNo ? lots.find((candidate) => candidate.lotNo === item.lotNo) || null : null;
      if (lot) openExpiredScrapModal(lot);
      return;
    }
    openStocktakeScope("指定物料盘点", item.materialId);
  };

  const submitReceive = async () => {
    const values = await receiveForm.validateFields();
    if (!selectedReceiveMaterial && !activeReceiveNewDraft) {
      message.error("请先选择已有物料或新建物料。");
      return;
    }
    const materialId = `mat-receive-${Date.now()}`;
    const materialSource = selectedReceiveMaterial || activeReceiveNewDraft;
    const baseUnit = materialSource?.baseUnit || values.baseUnit;
    const inboundQuantity = Number(values.inboundQuantity || 0);
    if (!baseUnit) {
      message.error("请选择核算单位。");
      return;
    }
    if (inboundQuantity <= 0) {
      message.error("入库数量必须大于 0。");
      return;
    }
    const inboundUnit = values.inboundUnit || baseUnit;
    const packageConversions = materialSource?.packageConversions || normalizeReceivePackageConversions(baseUnit, values.packageConversions);
    const packageValidationMessage = packageConversions.length
      ? validateInventoryPackageConversions(baseUnit, packageConversions)
      : null;
    if (packageValidationMessage) {
      message.error(packageValidationMessage);
      return;
    }
    const baseQuantity = calculateInventoryBaseQuantity(inboundQuantity, inboundUnit, baseUnit, packageConversions);
    if (!baseQuantity) {
      message.error("当前入库单位缺少物料规格，无法换算为核算单位。");
      return;
    }
    const receivedEntry = buildInventoryReceiveEntryFromSearch({
      materials,
      selectedMaterialId: receiveMaterialId,
      materialText: values.materialName,
      category: activeReceiveNewDraft?.category || values.category,
      brand: activeReceiveNewDraft?.brand || values.brand,
      baseUnit,
      safetyStockBase: activeReceiveNewDraft?.safetyStockBase ?? values.safetyStockBase,
      note: activeReceiveNewDraft?.note ?? values.note,
      newMaterialId: materialId,
      lotId: `lot-receive-${Date.now()}`,
      expiryDate: values.expiryDate,
      unitPrice: values.unitPrice,
      inboundQuantity,
      inboundUnit,
      baseQuantity,
      packageConversions,
      supplier: values.supplier,
      supplierPhone: values.supplierPhone,
      receiveDate,
      sequence: receiveSequence
    });

    let finalMaterial = receivedEntry.material;
    if (activeReceiveNewDraft) {
      const { id, materialName, category, brand, baseUnit: builtBaseUnit, unitSystem, packageConversions: builtPackages, auxiliaryUnit } =
        receivedEntry.material;
      finalMaterial = {
        ...activeReceiveNewDraft,
        id,
        materialName,
        category,
        brand,
        baseUnit: builtBaseUnit,
        unitSystem,
        packageConversions: builtPackages,
        auxiliaryUnit,
        status: "启用中"
      };
    }

    if (!materials.some((item) => item.id === finalMaterial.id)) {
      setMaterials((prev) => [...prev, finalMaterial]);
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
        operator: "当前用户",
        remark:
          receivedEntry.lot.inboundUnit === receivedEntry.material.baseUnit
            ? `原始数量：${formatInventoryQty(receivedEntry.lot.inboundQty, receivedEntry.lot.inboundUnit)}`
            : `原始数量：${formatInventoryQty(receivedEntry.lot.inboundQty, receivedEntry.lot.inboundUnit)}；换算数量：${formatInventoryQty(
                receivedEntry.lot.convertedQtyBase,
                receivedEntry.material.baseUnit
              )}；规格：${formatPackageConversionSummary(packageConversions).join("，")}`
      },
      ...prev
    ]);
    setActiveCategory(receivedEntry.material.category);
    setSummaryKeyword(receivedEntry.material.materialName);
    resetReceiveFormState();
    setReceiveOpen(false);
    message.success("已生成系统批次，并写入对应物料列表和批次明细");
  };

  const submitOutbound = async () => {
    const values = await outboundForm.validateFields();
    const material = materials.find((item) => item.id === values.materialId);
    if (!material) {
      message.error("请选择出库物料。");
      return;
    }

    try {
      const transaction = buildInventoryOutboundTransaction({
        materials,
        lots,
        materialId: values.materialId,
        outboundQuantity: values.outboundQuantity,
        purpose: values.purpose,
        remark: values.remark,
        operator: "当前用户",
        outboundDate: new Date().toISOString().slice(0, 10),
        ledgerIdPrefix: `ledger-outbound-${Date.now()}`
      });
      setMaterials(transaction.materials);
      setLots(transaction.lots);
      setLedgers((prev) => [...transaction.ledgers, ...prev]);
      setActiveCategory(material.category);
      setSummaryKeyword(material.materialName);
      resetOutboundFormState();
      setOutboundOpen(false);
      message.success("出库成功");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "出库失败，请检查出库信息。");
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
      render: (_, row) => (
        <div className="inventory-cell-stack">
          <span>
            {formatInventoryQtyWithPackage(
              row.currentStockBase,
              materials.find((material) => material.id === row.materialId)
            )}
          </span>
          {pendingDifferenceMaterialIds.has(row.materialId) ? (
            <Tag color="gold" className="inventory-pending-diff-tag">
              含未处理差异
            </Tag>
          ) : null}
        </div>
      )
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
      width: 88,
      render: (_, row) =>
        row.status === "过期" && row.remainingQtyBase > 0 ? (
          <Button type="link" danger onClick={() => openExpiredScrapModal(row)}>
            报废
          </Button>
        ) : (
          <Text type="secondary">—</Text>
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
      </span>
    );
  };

  const ledgerColumns: ColumnsType<InventoryLedgerRow> = [
    {
      title: "流水类型",
      dataIndex: "type",
      filters: ["采购入库", "业务消耗", "消耗冲销", "入库更正", "盘盈", "盘亏", "盘点调整", "报废"].map((value) => ({ text: value, value })),
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
      render: (value) => materials.find((material) => material.id === value)?.category || "—"
    },
    { title: "批次", dataIndex: "lotNo", render: (value) => value || "物料级负库存" },
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

  const stocktakeScopeColumns: ColumnsType<InventoryStocktakeScopeRow> = [
    { title: "物料名称", dataIndex: "materialName", sorter: (a, b) => a.materialName.localeCompare(b.materialName, "zh-Hans-CN") },
    {
      title: "分类",
      dataIndex: "category",
      filters: inventoryCategoryOrder.map((value) => ({ text: value, value })),
      onFilter: (value, row) => row.category === value
    },
    {
      title: "账面库存",
      dataIndex: "bookQtyBase",
      sorter: (a, b) => a.bookQtyBase - b.bookQtyBase,
      render: (_, row) => formatInventoryQty(row.bookQtyBase, row.baseUnit)
    },
    {
      title: "异常原因",
      dataIndex: "reason",
      filters: ["负库存", "低库存", "临期", "已过期", "手动添加", "分类盘点", "全部盘点"].map((value) => ({ text: value, value })),
      onFilter: (value, row) => row.reason === value,
      render: (value) => <Tag color={statusColor(value)}>{value}</Tag>
    },
    {
      title: "状态",
      dataIndex: "status",
      filters: ["异常", "可盘点"].map((value) => ({ text: value, value })),
      onFilter: (value, row) => row.status === value,
      render: (value) => <Tag color={statusColor(value)}>{value}</Tag>
    }
  ];

  if (stocktakeMode !== "指定物料盘点") {
    stocktakeScopeColumns.push({
      title: "操作",
      width: 82,
      render: (_, row) => (
        <Tooltip title="移除">
          <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeStocktakeScopeRow(row.id)} />
        </Tooltip>
      )
    });
  }

  const stocktakeScopeRowSelection: TableRowSelection<InventoryStocktakeScopeRow> | undefined =
    stocktakeMode === "指定物料盘点"
      ? {
          selectedRowKeys: stocktakeScopeSelectedRowIds,
          preserveSelectedRowKeys: true,
          onChange: (selectedRowKeys: Key[]) => {
            setStocktakeScopeSelectedRowIds(selectedRowKeys.map(String));
          }
        }
      : undefined;

  const stocktakeExecuteColumns: ColumnsType<InventoryStocktakeScopeRow> = [
    { title: "物料名称", dataIndex: "materialName" },
    {
      title: "账面库存",
      dataIndex: "bookQtyBase",
      render: (_, row) => (stocktakeTaskValues?.showBookStock ? formatInventoryQty(row.bookQtyBase, row.baseUnit) : "已隐藏")
    },
    {
      title: "实际库存",
      dataIndex: "id",
      width: 150,
      render: (_, row) => (
        <InputNumber
          min={0}
          value={stocktakeActuals[row.id]}
          addonAfter={row.baseUnit}
          style={{ width: "100%" }}
          onChange={(value) =>
            setStocktakeActuals((prev) => ({
              ...prev,
              [row.id]: typeof value === "number" ? value : undefined
            }))
          }
        />
      )
    },
    {
      title: "差异",
      dataIndex: "id",
      render: (_, row) => {
        const actualQty = stocktakeActuals[row.id];
        if (actualQty === undefined) return "—";
        const diff = actualQty - row.bookQtyBase;
        return (
          <Text type={diff < 0 ? "danger" : diff > 0 ? "success" : "secondary"}>
            {diff > 0 ? "+" : ""}
            {formatInventoryQty(diff, row.baseUnit)}
          </Text>
        );
      }
    },
  ];

  const stocktakeConfirmColumns: ColumnsType<(typeof stocktakeDifferenceRows)[number]> = [
    { title: "物料名称", dataIndex: "materialName" },
    { title: "账面库存", dataIndex: "bookQtyBase", render: (_, row) => formatInventoryQty(row.bookQtyBase, row.baseUnit) },
    { title: "实际库存", dataIndex: "actualQty", render: (_, row) => formatInventoryQty(row.actualQty || 0, row.baseUnit) },
    {
      title: "差异",
      dataIndex: "diff",
      render: (_, row) =>
        row.diff === undefined ? "—" : `${row.diff > 0 ? "+" : ""}${formatInventoryQty(row.diff, row.baseUnit)}`
    },
    {
      title: "盘点结果",
      dataIndex: "status",
      render: (_, row) => {
        if (!row.diff) return <Tag>无差异</Tag>;
        return <Tag color={row.diff > 0 ? "green" : "orange"}>{row.diff > 0 ? "盘盈 · 待处理" : "盘亏 · 待处理"}</Tag>;
      }
    }
  ];

  const usageRecordColumns: ColumnsType<InventoryLedgerRow> = [
    { title: "任务类型", dataIndex: "source", render: (value) => resolveBusinessType(value) },
    { title: "任务名称", dataIndex: "source" },
    { title: "使用量", dataIndex: "quantityText" },
    { title: "提交人", dataIndex: "operator" },
    { title: "时间", dataIndex: "occurredAt", render: (value) => formatInventoryDateTime(value) }
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

  const renderQuickCreateMaterialModal = () => (
    <Modal
      title="快速新建物料"
      open={quickCreateOpen}
      width={560}
      okText="确认新建"
      cancelText="取消"
      destroyOnClose
      onOk={confirmQuickCreateMaterial}
      onCancel={() => setQuickCreateOpen(false)}
      className="compact-modal"
    >
      <Alert
        showIcon
        type="info"
        style={{ marginBottom: 14 }}
        message="只填物料档案信息（不含本次采购数量、供应商、安全库存等）。分类专属字段多数可选填；饲料类需填写适用猪只与适用阶段，疫苗类需填写接种方式。其他未填齐的必填专属字段会标记“资料待完善”，可稍后在物料管理补全。"
      />
      <Form layout="vertical" form={quickCreateForm}>
        <Form.Item name="materialName" label="物料名称(中文)" rules={[{ required: true, message: "请输入物料中文名称" }]}>
          <Input placeholder="如：妊娠母猪料、氟苯尼考" />
        </Form.Item>
        <Form.Item name="materialNameEn" label="物料名称(英文)">
          <Input placeholder="选填" />
        </Form.Item>
        <Form.Item name="category" label="物料分类" rules={[{ required: true, message: "请选择物料分类" }]}>
          <Select
            placeholder="请选择物料分类"
            options={receiveMaterialCategoryOptions.map((value) => ({ label: value, value }))}
            onChange={(value) => {
              const recommended = inventoryCategoryBaseUnitRecommendations[value as InventoryCategory]?.[0];
              if (recommended) {
                quickCreateForm.setFieldsValue({ baseUnit: recommended });
              }
            }}
          />
        </Form.Item>
        <Form.Item name="brand" label="品牌名称(中文)" rules={[{ required: true, message: "请输入中文品牌名" }]}>
          <Input placeholder="如 A品牌、百利" />
        </Form.Item>
        <Form.Item name="brandEn" label="品牌名称(英文)">
          <Input placeholder="选填" />
        </Form.Item>
        <Form.Item name="baseUnit" label="核算单位" rules={[{ required: true, message: "请选择核算单位" }]}>
          <Select
            showSearch
            placeholder="如 ml、kg、头份、个"
            options={inventoryUnitOptions.map((unit) => ({ label: unit, value: unit }))}
          />
        </Form.Item>
        <Form.List name="packageConversions">
          {(fields, { add, remove }) => (
            <div className="inventory-package-spec">
              <span className="inventory-package-spec__title">包装规格（选填）</span>
              {fields.map((field, index) => {
                const toUnit =
                  index === 0
                    ? quickCreateBaseUnit || "核算单位"
                    : quickCreatePackageDrafts[index - 1]?.fromUnit || "下一级单位";
                const { key, ...fieldProps } = field;
                return (
                  <div className="inventory-package-row" key={key}>
                    <span>1</span>
                    <Form.Item {...fieldProps} name={[field.name, "fromUnit"]}>
                      <Select
                        placeholder="包装单位"
                        options={inventoryUnitOptions.map((value) => ({ label: value, value }))}
                      />
                    </Form.Item>
                    <span>=</span>
                    <Form.Item {...fieldProps} name={[field.name, "quantity"]}>
                      <InputNumber min={0.01} placeholder="数量" style={{ width: "100%" }} />
                    </Form.Item>
                    <span className="inventory-package-row__unit">{toUnit}</span>
                    {fields.length ? (
                      <Button type="text" onClick={() => remove(field.name)}>
                        删除
                      </Button>
                    ) : null}
                  </div>
                );
              })}
              <Button
                type="link"
                onClick={() => add({ fromUnit: undefined, quantity: undefined })}
                disabled={!quickCreateBaseUnit}
              >
                + 添加上级包装
              </Button>
            </div>
          )}
        </Form.List>
        <MaterialProfileFields category={quickCreateCategory} requiredMode="quick" />
        <Form.Item name="note" label="备注">
          <Input.TextArea rows={2} placeholder="选填" />
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
      onOk={submitExpiredScrap}
      onCancel={closeExpiredScrapModal}
    >
      {expiredActionLot ? (
        <Form layout="vertical" form={scrapForm}>
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
          <Form.Item label="报废原因" name="reason" rules={[{ required: true, message: "请填写报废原因" }]}>
            <Select
              showSearch
              options={inventoryScrapReasonOptions.map((value) => ({ label: value, value }))}
            />
          </Form.Item>
          <Form.Item label="处理方式" name="handlingMethod" rules={[{ required: true, message: "请选择处理方式" }]}>
            <Select options={inventoryScrapHandlingMethodOptions.map((value) => ({ label: value, value }))} />
          </Form.Item>
          <Alert
            showIcon
            type="warning"
            message="确认后系统将扣减该批次库存，生成类型为报废的库存流水；全部报废后首页过期风险项会关闭。"
          />
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
            >
              <div className="inventory-unit-input-row">
                <Form.Item name="safetyStockBase" noStyle>
                  <InputNumber min={0} placeholder="请输入最低库存数量" style={{ width: "100%" }} />
                </Form.Item>
                <Input className="inventory-receive-unit-field" disabled value={editSafetyStockUnitText} />
              </div>
            </Form.Item>
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

  if (inventoryView === "stocktake-scope") {
    return (
      <div className="inventory-console-page">
        <div className="inventory-console-header">
          <div>
            <Button type="text" icon={<ArrowLeftOutlined />} className="inventory-back-button" onClick={() => setInventoryView("home")}>
              返回库存管理
            </Button>
            <Title level={3}>确认盘点范围</Title>
            <Text type="secondary">盘点方式：{stocktakeMode}｜已选择物料：{selectedStocktakeScopeRows.length} 个</Text>
          </div>
        </div>

        <Card className="inventory-console-card">
          <div className="inventory-stocktake-toolbar">
            <Input.Search allowClear placeholder="搜索物料名称或品牌" value={stocktakeScopeKeyword} onChange={(event) => setStocktakeScopeKeyword(event.target.value)} />
            <Select value={stocktakeScopeCategory} onChange={(value) => setStocktakeScopeCategory(value)} options={["全部", ...inventoryCategoryOrder].map((value) => ({ label: value, value }))} />
            <Select value={stocktakeScopeStatus} onChange={(value) => setStocktakeScopeStatus(value)} options={["全部", "异常", "可盘点"].map((value) => ({ label: value, value }))} />
          </div>
          <Alert
            showIcon
            type="info"
            className="inventory-stocktake-alert"
            message="盘点只核对物料总数，不按具体批次盘点。提交后系统会自动处理容差内小差异；剩余差异进入「盘点差异处理」确认来源。"
          />
          <Table
            rowKey="id"
            className="inventory-console-table"
            columns={stocktakeScopeColumns}
            dataSource={filteredStocktakeScopeRows}
            pagination={false}
            rowSelection={stocktakeScopeRowSelection}
          />
          <div className="inventory-stocktake-footer">
            <Button
              onClick={() => {
                setInventoryView("home");
                setStocktakeStartOpen(true);
              }}
            >
              上一步
            </Button>
            <Button type="primary" disabled={!selectedStocktakeScopeRows.length} onClick={beginStocktakeExecution}>
              开始盘点
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (inventoryView === "stocktake-execute") {
    return (
      <div className="inventory-console-page">
        <div className="inventory-console-header">
          <div>
            <Button type="text" icon={<ArrowLeftOutlined />} className="inventory-back-button" onClick={() => setInventoryView("stocktake-scope")}>
              返回确认范围
            </Button>
            <Title level={3}>盘点操作</Title>
            <Text type="secondary">盘点方式：{stocktakeMode}｜{stocktakeSubmitted ? "待确认" : "盘点中"}</Text>
          </div>
          <Button onClick={fillStocktakeBookStock}>一键填入账面库存</Button>
        </div>
        <Card className="inventory-console-card">
          <Descriptions
            size="small"
            column={{ xs: 1, sm: 2, lg: 3 }}
            items={[
              { key: "mode", label: "盘点范围", children: stocktakeMode },
              { key: "count", label: "盘点物料", children: `${selectedStocktakeScopeRows.length} 个` },
              { key: "assignee", label: "盘点人", children: stocktakeTaskValues?.assignee || "当前用户" },
              { key: "createdAt", label: "开始时间", children: `${new Date().toISOString().slice(0, 10)} 10:30` }
            ]}
          />
        </Card>
        <Card className="inventory-console-card">
          <Table rowKey="id" className="inventory-console-table" columns={stocktakeExecuteColumns} dataSource={selectedStocktakeScopeRows} pagination={false} scroll={{ x: 1180 }} />
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
            <Title level={3}>盘点差异确认</Title>
            <Text type="secondary">提交后系统先自动处理可闭环的小差异，剩余差异进入「盘点差异处理」</Text>
          </div>
        </div>
        <div className="inventory-stocktake-summary">
          <span>本次盘点物料<strong>{selectedStocktakeScopeRows.length} 个</strong></span>
          <span>无差异<strong>{stocktakeDiffSummary.noDifferenceCount} 个</strong></span>
          <span>盘盈<strong>{stocktakeDiffSummary.gainCount} 个</strong></span>
          <span>盘亏<strong>{stocktakeDiffSummary.lossCount} 个</strong></span>
        </div>
        <Card className="inventory-console-card">
          <Table rowKey="id" className="inventory-console-table" columns={stocktakeConfirmColumns} dataSource={stocktakeDifferenceRows} pagination={false} />
          <Alert
            showIcon
            type="info"
            className="inventory-stocktake-alert"
            message="提交盘点后，容差内小差异会自动生成库存流水；仍需判断的差异会进入「盘点差异处理」。"
          />
          <div className="inventory-stocktake-footer">
            <Button onClick={() => setInventoryView("stocktake-execute")}>返回修改</Button>
            <Button type="primary" onClick={confirmStocktakeAdjustment}>提交盘点</Button>
          </div>
        </Card>
      </div>
    );
  }

  if (inventoryView === "stocktake-complete") {
    const result = stocktakeDifferenceResult;
    const gainCount = result.filter((item) => item.direction === "盘盈").length;
    const lossCount = result.filter((item) => item.direction === "盘亏").length;
    const autoProcessedCount = result.filter((item) => item.status === "已处理").length;
    const pendingResultCount = result.filter((item) => item.status === "待处理").length;
    const hasPendingDifference = pendingResultCount > 0;
    return (
      <div className="inventory-console-page">
        <Card className="inventory-console-card inventory-stocktake-complete">
          <CheckCircleOutlined />
          <Title level={3}>{hasPendingDifference ? "盘点已提交" : "盘点已完成"}</Title>
          <Descriptions
            column={1}
            size="small"
            items={[
              { key: "task", label: "盘点方式", children: stocktakeMode },
              { key: "count", label: "盘点物料", children: `${selectedStocktakeScopeRows.length} 个` },
              { key: "pending", label: "待处理差异", children: `${pendingResultCount} 条` },
              { key: "auto", label: "已自动处理", children: `${autoProcessedCount} 条` },
              { key: "gain", label: "盘盈", children: `${gainCount} 个` },
              { key: "loss", label: "盘亏", children: `${lossCount} 个` }
            ]}
          />
          {hasPendingDifference ? (
            <Alert
              showIcon
              type="info"
              className="inventory-stocktake-alert"
              message="容差内小差异已自动处理并生成库存流水，剩余差异请到「盘点差异处理」确认来源。"
            />
          ) : null}
          <Space wrap>
            <Button onClick={() => setInventoryView("home")}>返回库存首页</Button>
            {hasPendingDifference ? (
              <Button type="primary" onClick={() => setInventoryView("difference-list")}>
                去处理差异
              </Button>
            ) : null}
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
    const detailTabItems = [
      {
        key: "detail",
        label: "详情信息",
        children: (
          <>
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

            <Card className="inventory-console-card" title="关联业务与消耗分析">
              <div className="inventory-analysis-grid">
                <span>
                  近7天消耗
                  <strong>{formatInventoryQty(Math.abs(selectedConsumptionQty7Days), selectedSummary.baseUnit)}</strong>
                </span>
                <span>
                  近30天消耗
                  <strong>{formatInventoryQty(Math.abs(selectedConsumptionQty), selectedSummary.baseUnit)}</strong>
                </span>
                <span>
                  本月消耗金额
                  <strong>{formatCurrency(Math.abs(selectedConsumptionCost))}</strong>
                </span>
                <span>
                  消耗任务数
                  <strong>{selectedMaterialConsumptionLedgers.length} 次</strong>
                </span>
              </div>
              <div className="inventory-source-breakdown">
                <Text type="secondary">消耗记录</Text>
              </div>
              <Table
                rowKey="id"
                className="inventory-console-table inventory-analysis-table"
                columns={usageRecordColumns}
                dataSource={selectedMaterialConsumptionLedgers}
                pagination={false}
              />
            </Card>
          </>
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
            <Button danger icon={<DeleteOutlined />} onClick={() => deleteMaterial(selectedMaterial.id)}>
              删除物料
            </Button>
          </Space>
        </div>

        {renderMaterialEditModal()}

        {pendingDifferenceByMaterial.has(selectedMaterial.id) ? (
          <Alert
            showIcon
            type="warning"
            className="inventory-difference-banner"
            message={`该物料存在未处理盘点差异：${
              (pendingDifferenceByMaterial.get(selectedMaterial.id) || 0) > 0 ? "盘盈 +" : "盘亏 "
            }${formatInventoryQty(
              Math.abs(pendingDifferenceByMaterial.get(selectedMaterial.id) || 0),
              selectedMaterial.baseUnit
            )}（库存暂未变动，处理后更新）`}
            action={
              <Button size="small" type="link" onClick={() => setInventoryView("difference-list")}>
                去处理
              </Button>
            }
          />
        ) : null}

        <Tabs className="inventory-detail-tabs" items={detailTabItems} />
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
            <Title level={3}>库存流水</Title>
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
            <Select
              mode="multiple"
              allowClear
              placeholder="流水类型"
              value={ledgerTypes}
              onChange={(value) => setLedgerTypes(value)}
              options={["采购入库", "业务消耗", "消耗冲销", "入库更正", "盘盈", "盘亏", "盘点调整", "报废"].map((value) => ({ label: value, value }))}
            />
          </div>
          <Table
            rowKey="id"
            className="inventory-console-table"
            columns={ledgerColumns}
            dataSource={filteredLedgers}
            pagination={false}
          />
        </Card>
      </div>
    );
  }

  if (inventoryView === "difference-list") {
    const differenceColumns: ColumnsType<InventoryDifferenceRecord> = [
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
        onFilter: (value, record) => record.category === value
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
        title: "处理方式",
        dataIndex: "method",
        render: (value: InventoryDifferenceRecord["method"]) =>
          value ? inventoryDifferenceMethodMetas.find((meta) => meta.method === value)?.label || value : <Text type="secondary">—</Text>
      },
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
              返回库存首页
            </Button>
            <Title level={3}>盘点差异处理</Title>
            <Text type="secondary">提交盘点后差异先汇总在这里，逐条确认来源后库存与批次才会更新</Text>
          </div>
        </div>
        <Card className="inventory-console-card">
          {pendingDifferences.length ? (
            <Table
              rowKey="id"
              className="inventory-console-table"
              columns={differenceColumns}
              dataSource={pendingDifferences}
              pagination={false}
              scroll={{ x: 980 }}
            />
          ) : (
            <div className="inventory-empty-panel">暂无待处理盘点差异</div>
          )}
        </Card>

        <Drawer
          width={460}
          title="处理盘点差异"
          open={Boolean(handlingDifference)}
          onClose={closeDifferenceHandler}
          destroyOnClose
          footer={
            <div className="inventory-drawer-footer">
              <Button onClick={closeDifferenceHandler}>取消</Button>
              <Button type="primary" onClick={submitDifferenceResolution}>
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
              <div className="inventory-diff-drawer__section-title">请选择差异来源</div>
              <Radio.Group
                className="inventory-diff-method-group"
                value={handleMethod}
                onChange={(event) => setHandleMethod(event.target.value)}
              >
                {inventoryDifferenceMethodMetas
                  .filter((meta) => meta.direction === handlingDifference.direction)
                  .map((meta) => (
                    <Radio key={meta.method} value={meta.method} className="inventory-diff-method">
                      <span className="inventory-diff-method__label">{meta.label}</span>
                      <span className="inventory-diff-method__scene">{meta.scene}</span>
                    </Radio>
                  ))}
              </Radio.Group>
              {handlingMethodMeta?.needsRelatedLot ? (
                <div className="inventory-diff-drawer__field">
                  <Text type="secondary">关联批次</Text>
                  <Select
                    placeholder="选择关联批次"
                    value={handleRelatedLotNo}
                    onChange={(value) => setHandleRelatedLotNo(value)}
                    options={handlingLotOptions}
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
          <Badge count={pendingDifferences.length} size="small" offset={[-2, 2]}>
            <Button onClick={() => setInventoryView("difference-list")}>盘点差异</Button>
          </Badge>
          <Button icon={<ExportOutlined />} onClick={() => setOutboundOpen(true)}>
            出库
          </Button>
          <Button type="primary" icon={<InboxOutlined />} onClick={() => setReceiveOpen(true)}>
            入库
          </Button>
          <Button onClick={() => setStocktakeStartOpen(true)}>发起盘点</Button>
        </Space>
      </div>

      {pendingDifferences.length ? (
        <Alert
          showIcon
          type="warning"
          className="inventory-difference-banner"
          message={`存在 ${pendingDifferences.length} 条未处理盘点差异，库存暂以系统账面为准，处理后才会更新`}
          action={
            <Button size="small" type="link" onClick={() => setInventoryView("difference-list")}>
              去处理
            </Button>
          }
        />
      ) : null}

      <div className="inventory-analytics-grid">
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
                <div key={row.category} className="inventory-analytics-share-row">
                  <span className="inventory-analytics-share-row__label">
                    <i style={{ background: row.color }} />
                    <span>{row.category}</span>
                  </span>
                  <span className="inventory-analytics-share-row__value">
                    <strong>{formatCurrency(row.amount)}</strong>
                    <Text type="secondary">{row.amount > 0 ? formatPercent(row.share) : "—"}</Text>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="inventory-console-card inventory-analytics-card inventory-analytics-card--top">
          <div className="inventory-analytics-card__head">
            <div>
              <strong>消耗金额 Top 物料</strong>
            </div>
          </div>
          <div className="inventory-top-spend-list">
            {windowTopSpendRows.length ? (
              windowTopSpendRows.map((row, index) => (
                <div key={row.materialId} className="inventory-top-spend-row">
                  <span className="inventory-top-spend-row__rank">{index + 1}</span>
                  <div className="inventory-top-spend-row__content">
                    <div className="inventory-top-spend-row__head">
                      <div>
                        <strong>{row.materialName}</strong>
                        <Text type="secondary">{row.category}</Text>
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

        <Card className="inventory-console-card inventory-analytics-card inventory-analytics-card--risk">
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
                    <strong>{item.materialName}</strong>
                    <Text type="secondary">{item.brand} · {item.detailText}</Text>
                  </div>
                  <div className="inventory-risk-row__side">
                    <span className="inventory-risk-row__value">{item.valueText}</span>
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
                    setAnalyticsCustomRange(
                      dateStrings[0] && dateStrings[1] ? [dateStrings[0], dateStrings[1]] : null
                    )
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
              <Text type="secondary">消耗天数</Text>
              <strong>{consumptionTrendActiveDays} 天</strong>
            </span>
          </div>
          <InventoryTrendChart
            points={consumptionTrendPoints}
            rangeLabel={analyticsRangeLabel}
            categoryLabel={analyticsFilterSummaryLabel}
          />
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
        title="发起盘点"
        open={stocktakeStartOpen}
        okText="下一步"
        cancelText="取消"
        onOk={() => openStocktakeScope(stocktakeMode)}
        onCancel={() => setStocktakeStartOpen(false)}
      >
        <Alert
          showIcon
          type="info"
          className="inventory-stocktake-alert"
          message="盘点用于核对账面库存与实际库存差异，确认后将生成库存调整记录并更新当前库存。"
        />
        <div className="inventory-stocktake-mode-list">
          {([
            ["异常盘点", "自动选择当前负库存、低库存、临期、过期等风险物料，适合快速修复库存异常。"],
            ["指定物料盘点", "从全部物料候选中筛选并勾选盘点目标。"],
            ["分类盘点", "按饲料、兽药、疫苗、消毒用品、工具等分类发起盘点。"],
            ["全部盘点", "盘点全部启用物料。"]
          ] as Array<[InventoryStocktakeMode, string]>).map(([mode, description]) => (
            <button
              key={mode}
              type="button"
              className={`inventory-stocktake-mode${stocktakeMode === mode ? " is-active" : ""}`}
              onClick={() => setStocktakeMode(mode)}
            >
              <strong>{mode}</strong>
              <Text type="secondary">{description}</Text>
            </button>
          ))}
        </div>
      </Modal>

      <Modal
        title="出库"
        open={outboundOpen}
        okText="确认出库"
        cancelText="取消"
        onOk={submitOutbound}
        onCancel={() => {
          resetOutboundFormState();
          setOutboundOpen(false);
        }}
      >
        <Form layout="vertical" form={outboundForm}>
          <section className="inventory-receive-section">
            <strong>出库物品</strong>
            <Form.Item label="物料名称" name="materialId" rules={[{ required: true, message: "请选择出库物料" }]}>
              <Select
                showSearch
                placeholder="请选择出库物料"
                options={outboundMaterialOptions}
                optionFilterProp="label"
                onChange={(value) => {
                  const material = activeOutboundMaterials.find((item) => item.id === value);
                  outboundForm.setFieldsValue({ unit: material?.baseUnit, outboundQuantity: undefined });
                }}
              />
            </Form.Item>
            <div className="inventory-receive-quantity-row">
              <Form.Item label="出库数量" name="outboundQuantity" rules={[{ required: true, message: "请输入出库数量" }]}>
                <InputNumber min={0.01} placeholder="请输入出库数量" style={{ width: "100%" }} />
              </Form.Item>
              <Form.Item label="单位" name="unit" rules={[{ required: true, message: "请选择物料后自动带出单位" }]}>
                <Input disabled placeholder="自动带出" />
              </Form.Item>
            </div>
            {selectedOutboundMaterial && selectedOutboundSummary ? (
              <Alert
                showIcon
                type={selectedOutboundSummary.currentStockBase < 0 ? "warning" : "info"}
                message={`当前库存 ${formatInventoryQty(
                  selectedOutboundSummary.currentStockBase,
                  selectedOutboundMaterial.baseUnit
                )}，提交后系统按批次自动扣减并记录库存流水。`}
              />
            ) : null}
          </section>

          <section className="inventory-receive-section">
            <strong>领用信息</strong>
            <Form.Item label="领用用途" name="purpose" rules={[{ required: true, message: "请填写领用用途" }]}>
              <Input placeholder="例如：治疗任务领用、栏舍消毒、工具领用" />
            </Form.Item>
            <Form.Item label="备注" name="remark" rules={[{ max: 200, message: "备注不能超过 200 字" }]}>
              <Input.TextArea rows={3} showCount maxLength={200} placeholder="请输入补充说明" />
            </Form.Item>
          </section>
        </Form>
      </Modal>

      <Modal
        title="采购入库"
        open={receiveOpen}
        width={760}
        className="inventory-receive-modal"
        okText="提交入库"
        cancelText="取消"
        onOk={submitReceive}
        onCancel={() => {
          resetReceiveFormState();
          setReceiveOpen(false);
        }}
      >
        <Form layout="vertical" form={receiveForm}>
          <div className="inventory-receive-form-stack">
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
                        if (!receiveNewMaterialDraft || receiveNewMaterialDraft.materialName !== value.trim()) {
                          setReceiveNewMaterialDraft(null);
                        }
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
                <Form.Item name="baseUnit" hidden>
                  <Input />
                </Form.Item>
                {effectiveReceiveMaterial ? (
                  <div className="inventory-receive-material-card">
                    {selectedReceiveMaterial && receiveMaterialSpecLine ? (
                      <Alert className="inventory-receive-spec-alert" showIcon type="info" message={receiveMaterialSpecLine} />
                    ) : null}
                    <div className="inventory-receive-material-card__head">
                      <span className="inventory-receive-material-card__name">
                        {effectiveReceiveMaterial.materialName}
                        <Tag color="blue" style={{ marginLeft: 8 }}>{effectiveReceiveMaterial.category}</Tag>
                        {activeReceiveNewDraft ? <Tag color="green">新建</Tag> : null}
                        {activeReceiveNewDraft?.profileIncomplete ? <Tag color="gold">资料待完善</Tag> : null}
                      </span>
                      {activeReceiveNewDraft ? (
                        <Space size={4}>
                          <Button type="link" size="small" onClick={openQuickCreateMaterial}>
                            重新编辑
                          </Button>
                          <Button type="link" size="small" danger onClick={clearReceiveNewMaterialDraft}>
                            清除
                          </Button>
                        </Space>
                      ) : null}
                    </div>
                    <div className="inventory-receive-material-card__meta">
                      <span>品牌：{effectiveReceiveMaterial.brand}</span>
                      <span>核算单位：{effectiveReceiveMaterial.baseUnit}</span>
                      {effectiveReceiveMaterial.safetyStockBase != null ? (
                        <span>安全库存：{effectiveReceiveMaterial.safetyStockBase} {effectiveReceiveMaterial.baseUnit}</span>
                      ) : null}
                    </div>
                  </div>
                ) : receiveMaterialInfoVisible ? (
                  <div className="inventory-receive-create-hint">
                    {receiveDuplicateCandidates.length ? (
                      <div className="inventory-receive-dup">
                        <Text type="secondary">可能是这些已有物料，点击可直接选用：</Text>
                        <Space wrap size={6} style={{ marginTop: 6 }}>
                          {receiveDuplicateCandidates.map((candidate) => (
                            <Button
                              key={candidate.id}
                              size="small"
                              onClick={() => {
                                setReceiveMaterialText(candidate.materialName);
                                receiveForm.setFieldsValue({ materialName: candidate.materialName });
                                applyExistingReceiveMaterial(candidate);
                              }}
                            >
                              {candidate.materialName} · {candidate.brand}
                            </Button>
                          ))}
                        </Space>
                      </div>
                    ) : null}
                    <Button type="dashed" block icon={<PlusOutlined />} onClick={openQuickCreateMaterial}>
                      新建物料「{receiveMaterialKeyword}」
                    </Button>
                  </div>
                ) : null}
              </section>

              <section className="inventory-receive-section">
                <strong>采购信息</strong>
                <div className="inventory-receive-quantity-row">
                  <Form.Item label="入库数量" name="inboundQuantity" rules={[{ required: true, message: "请输入入库数量" }]}>
                    <InputNumber min={0.01} placeholder="请输入入库数量" style={{ width: "100%" }} />
                  </Form.Item>
                  <Form.Item label="单位" name="inboundUnit" rules={[{ required: true, message: "请选择入库单位" }]}>
                    <Select placeholder="请选择单位" options={receiveInboundUnitOptions} />
                  </Form.Item>
                </div>
                {receiveIncreasePreview ? (
                  <Alert showIcon type="success" message={receiveIncreasePreview} />
                ) : null}
                <Form.Item label="到期日期" name="expiryDate" rules={[{ required: true, message: "请填写到期日期" }]}>
                  <Input placeholder="2026-12-31" />
                </Form.Item>
                <Form.Item label="总进货价（元）" name="unitPrice" rules={[{ required: true, message: "请填写总进货价" }]}>
                  <InputNumber min={0} style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item label="供应商" name="supplier" rules={[{ required: true, message: "请填写供应商" }]}>
                  <Input placeholder="请输入供应商名称" />
                </Form.Item>
                <Form.Item label="供应商电话" name="supplierPhone">
                  <Input placeholder="选填，请输入供应商电话" />
                </Form.Item>
                <Form.Item label="备注" name="note">
                  <Input placeholder="请输入业务补充说明" />
                </Form.Item>
              </section>

              {effectiveReceiveMaterial ? (
                <section className="inventory-receive-section">
                  <div className="inventory-receive-section-head">
                    <strong>规格与包装</strong>
                    <Text type="secondary">使用物料已维护的包装规格，采购入库时只需填写收到的数量。</Text>
                  </div>
                  <div className="inventory-package-summary">
                    {receivePackageSummary.length ? (
                      receivePackageSummary.map((item) => <Tag key={item}>{item}</Tag>)
                    ) : (
                      <Text type="secondary">该物料暂无包装规格，入库数量将按核算单位填写。</Text>
                    )}
                  </div>
                </section>
              ) : null}

          </div>
        </Form>
      </Modal>

      {renderQuickCreateMaterialModal()}

      {renderExpiredActionModal()}
    </div>
  );
}
