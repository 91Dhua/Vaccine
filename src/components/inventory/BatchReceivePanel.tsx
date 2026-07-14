import {
  Alert,
  Button,
  DatePicker,
  Empty,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tooltip,
  Typography
} from "antd";
import dayjs from "dayjs";
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  PlusOutlined,
  SearchOutlined
} from "@ant-design/icons";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { BatchReceiveNewMaterialModal, type BatchReceiveNewMaterialResult } from "./BatchReceiveNewMaterialModal";
import {
  buildBatchInlineNewMaterialDraft,
  calculateInventoryBaseQuantity,
  formatInventoryMaterialFieldValue,
  formatInventoryQty,
  formatMaterialCategoryLabel,
  getInventoryMaterialStatus,
  getMaterialProfileFieldSpecs,
  resolveInventoryReceivableUnits,
  validateBatchInlineNewMaterial,
  type InventoryBatchNewMaterialForm,
  type InventoryCategory,
  type InventoryLedgerRow,
  type InventoryLot,
  type InventoryMaterial,
  type InventoryPackageConversion,
  type InventorySummary
} from "./inventoryData";

const { Text } = Typography;

const batchReceiveDraftStorageKey = "sentri.inventory.batchReceive.v3";

export type InventoryBatchReceiveHeader = {
  supplier?: string;
  receiveDate?: string;
  purchaseOrderNo?: string;
  remark?: string;
};

export type InventoryBatchReceiveDraft = {
  inboundQuantity?: number;
  inboundUnit?: string;
  unitPricePerUnit?: number;
  unitPrice?: number;
  productionDate?: string;
  expiryDate?: string;
  externalBatchNo?: string;
  supplier?: string;
  supplierPhone?: string;
  note?: string;
};

export type InventoryBatchReceiveEntry = {
  id: string;
  materialKeyword: string;
  materialId?: string;
  category?: InventoryCategory;
  newMaterialForm?: InventoryBatchNewMaterialForm | null;
  optionalExpanded: boolean;
  expanded?: boolean;
  draft: InventoryBatchReceiveDraft;
};

type BatchReceiveStep = "entry" | "summary";

type BatchReceivePanelProps = {
  header: InventoryBatchReceiveHeader;
  onHeaderChange: (header: InventoryBatchReceiveHeader) => void;
  entries: InventoryBatchReceiveEntry[];
  onEntriesChange: (entries: InventoryBatchReceiveEntry[]) => void;
  materials: InventoryMaterial[];
  lots?: InventoryLot[];
  ledgers?: InventoryLedgerRow[];
  summaries: InventorySummary[];
  onCancel: () => void;
  onClear: () => void;
  onSubmit: () => void;
  readyCount: number;
  onValidationError?: (message: string) => void;
};

type SearchResult = {
  material: InventoryMaterial;
  summary?: InventorySummary;
  rank: number;
};

type ResolvedLine = {
  entry: InventoryBatchReceiveEntry;
  material: InventoryMaterial;
  draft: InventoryBatchReceiveDraft;
  amount: number;
  quantity: number;
  isReady: boolean;
  validationMessage: string | null;
};

function formatInventoryNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatAmount(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function formatReceiveUnitLabel(unit?: string) {
  if (!unit) return "";
  const unitLabelMap: Record<string, string> = {
    kg: "公斤",
    g: "克",
    ml: "毫升",
    L: "升"
  };
  return unitLabelMap[unit] || unit;
}

function formatReceiveUnitPrice(amount: number, quantity: number, unit?: string) {
  if (!quantity || quantity <= 0) return "—";
  return `${formatAmount(amount / quantity)}元/${formatReceiveUnitLabel(unit)}`;
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function resolveBatchReceiveUnit(material: InventoryMaterial) {
  const receivableUnits = resolveInventoryReceivableUnits(material.baseUnit, material.packageConversions || []);
  const preferredUnit = [material.auxiliaryUnit, material.packageConversions?.[0]?.fromUnit, material.baseUnit].find(
    (unit): unit is string => Boolean(unit && receivableUnits.includes(unit))
  );
  return preferredUnit || receivableUnits[0] || material.baseUnit;
}

function normalizeSearchText(value: string) {
  return value.trim().toLocaleLowerCase();
}

function getPinyinSeed(material: InventoryMaterial) {
  const seeds: Record<string, string> = {
    妊娠母猪料: "renshenmuzhuliao rsmzl",
    哺乳母猪料: "burumuzhuliao brmzl",
    保育猪料: "baoyuzhuliao byzl",
    育肥猪料: "yufeizhuliao yfzl",
    教槽料: "jiaocaoliao jcl",
    氟苯尼考: "fubennikao fbnk",
    头孢: "toubao tb",
    戊二醛消毒液: "wuerquanxiaoduye weq",
    连续注射器: "lianxuzhusheqi lxzsq"
  };
  return seeds[material.materialName] || "";
}

function resolveSearchRank(material: InventoryMaterial, keyword: string) {
  const query = normalizeSearchText(keyword);
  if (!query) return 99;
  const name = normalizeSearchText(material.materialName);
  const enName = normalizeSearchText(material.materialNameEn || "");
  const brand = normalizeSearchText(material.brand);
  const brandEn = normalizeSearchText(material.brandEn || "");
  const sku = normalizeSearchText(material.materialCode || "");
  const pinyin = normalizeSearchText(getPinyinSeed(material));
  if ([name, enName, sku].some((item) => item === query)) return 0;
  if ([name, enName, sku].some((item) => item.includes(query))) return 1;
  if (pinyin.includes(query)) return 2;
  if ([brand, brandEn].some((item) => item.includes(query))) return 3;
  return 99;
}

export function buildMaterialSearchResults(
  materials: InventoryMaterial[],
  summaries: InventorySummary[],
  keyword: string
): SearchResult[] {
  if (!keyword.trim()) return [];
  return materials
    .filter((material) => getInventoryMaterialStatus(material) === "启用中")
    .map((material) => ({
      material,
      summary: summaries.find((summary) => summary.materialId === material.id),
      rank: resolveSearchRank(material, keyword)
    }))
    .filter((item) => item.rank < 99)
    .sort((a, b) => a.rank - b.rank || a.material.materialName.localeCompare(b.material.materialName))
    .slice(0, 8);
}

function resolveLatestInboundLot(
  materialId: string,
  lots: InventoryLot[] = [],
  ledgers: InventoryLedgerRow[] = []
) {
  const inboundLedgers = ledgers
    .filter((ledger) => ledger.materialId === materialId && ledger.type === "采购入库" && ledger.lotNo)
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
  const latestLedgerLot = inboundLedgers
    .map((ledger) => lots.find((lot) => lot.lotNo === ledger.lotNo))
    .find((lot): lot is InventoryLot => Boolean(lot));
  if (latestLedgerLot) return latestLedgerLot;
  return lots
    .filter((lot) => lot.materialId === materialId)
    .slice()
    .sort((a, b) => String(b.id).localeCompare(String(a.id)))[0];
}

function resolveEntryMaterial(
  entry: InventoryBatchReceiveEntry,
  activeMaterials: InventoryMaterial[]
) {
  if (entry.materialId) {
    return activeMaterials.find((item) => item.id === entry.materialId) || null;
  }
  const keyword = entry.materialKeyword.trim();
  const existing = activeMaterials.find((item) => item.materialName === keyword && item.category === entry.category);
  if (existing) return existing;
  if (keyword && entry.category && entry.newMaterialForm) {
    return buildBatchInlineNewMaterialDraft(entry.category, keyword, entry.newMaterialForm);
  }
  return null;
}

function buildEffectiveDraft(entry: InventoryBatchReceiveEntry, material?: InventoryMaterial | null) {
  const draft = entry.draft;
  const receivableUnits = material ? resolveInventoryReceivableUnits(material.baseUnit, material.packageConversions || []) : [];
  const inboundUnit =
    material && (!draft.inboundUnit || !receivableUnits.includes(draft.inboundUnit))
      ? resolveBatchReceiveUnit(material)
      : draft.inboundUnit;
  return {
    ...draft,
    inboundUnit,
    supplier: (draft.supplier ?? "").trim(),
    supplierPhone: (draft.supplierPhone ?? "").trim()
  };
}

function FieldLabel({ children, required }: { children: string; required?: boolean }) {
  return (
    <label className="inventory-batch-field-label">
      {required ? <span className="inventory-batch-field-required">*</span> : null}
      {children}
    </label>
  );
}

export function createDefaultBatchReceiveHeader(): InventoryBatchReceiveHeader {
  return {
    supplier: "",
    receiveDate: new Date().toISOString().slice(0, 10),
    purchaseOrderNo: "",
    remark: ""
  };
}

export function createEmptyBatchReceiveEntry(): InventoryBatchReceiveEntry {
  return {
    id: `batch-entry-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    materialKeyword: "",
    optionalExpanded: false,
    expanded: true,
    draft: {}
  };
}

function createEntryFromMaterial(
  material: InventoryMaterial,
  lots: InventoryLot[],
  ledgers: InventoryLedgerRow[]
): InventoryBatchReceiveEntry {
  const unit = resolveBatchReceiveUnit(material);
  const recentLot = resolveLatestInboundLot(material.id, lots, ledgers);
  const recentAmount =
    recentLot && recentLot.inboundQty > 0 && recentLot.unitPrice > 0 ? roundMoney(recentLot.unitPrice) : undefined;
  return {
    id: createEmptyBatchReceiveEntry().id,
    materialKeyword: material.materialName,
    materialId: material.id,
    category: material.category,
    newMaterialForm: null,
    optionalExpanded: false,
    expanded: true,
    draft: {
      inboundUnit: unit,
      supplier: recentLot?.supplier,
      supplierPhone: recentLot?.supplierPhone,
      unitPrice: recentAmount
    }
  };
}

function createEntryFromNewMaterial(result: BatchReceiveNewMaterialResult): InventoryBatchReceiveEntry {
  return {
    id: createEmptyBatchReceiveEntry().id,
    materialKeyword: result.materialName,
    materialId: undefined,
    category: result.category,
    newMaterialForm: result.form,
    optionalExpanded: true,
    expanded: true,
    draft: {
      inboundUnit: result.form.baseUnit
    }
  };
}

function resolveLineValidation(entry: InventoryBatchReceiveEntry, material: InventoryMaterial | null, draft: InventoryBatchReceiveDraft) {
  if (!material) return "请先选择或新建物料。";
  if (entry.newMaterialForm && !entry.materialId && entry.category) {
    const inlineError = validateBatchInlineNewMaterial(entry.category, entry.materialKeyword, entry.newMaterialForm);
    if (inlineError) return inlineError;
  }
  if (!draft.inboundQuantity || draft.inboundQuantity <= 0) return "请填写入库数量。";
  if (!draft.inboundUnit) return "当前物料缺少入库单位，请先完善物料档案。";
  if (typeof draft.unitPrice !== "number") return "请填写总金额。";
  if (!draft.expiryDate) return "请填写保质期至。";
  if (!draft.supplier) return "请填写供应商。";
  return null;
}

function resolveEntryLines(
  entries: InventoryBatchReceiveEntry[],
  materials: InventoryMaterial[]
): ResolvedLine[] {
  const activeMaterials = materials.filter((material) => getInventoryMaterialStatus(material) === "启用中");
  return entries.flatMap((entry) => {
    const material = resolveEntryMaterial(entry, activeMaterials);
    if (!material) return [];
    const draft = buildEffectiveDraft(entry, material);
    const quantity = Number(draft.inboundQuantity || 0);
    const amount = Number(draft.unitPrice || 0);
    const validationMessage = resolveLineValidation(entry, material, draft);
    return [{
      entry,
      material,
      draft,
      quantity,
      amount,
      isReady: !validationMessage,
      validationMessage
    }];
  });
}

export function BatchReceivePanel({
  header,
  onHeaderChange,
  entries,
  onEntriesChange,
  materials,
  lots = [],
  ledgers = [],
  summaries,
  onCancel,
  onClear,
  onSubmit,
  readyCount,
  onValidationError
}: BatchReceivePanelProps) {
  const [step, setStep] = useState<BatchReceiveStep>("entry");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [newMaterialOpen, setNewMaterialOpen] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const hydratedRef = useRef(false);
  const activeMaterials = materials.filter((material) => getInventoryMaterialStatus(material) === "启用中");

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    const saved = window.localStorage.getItem(batchReceiveDraftStorageKey);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as {
        header?: InventoryBatchReceiveHeader;
        entries?: InventoryBatchReceiveEntry[];
        step?: BatchReceiveStep;
      };
      if (parsed.header) onHeaderChange({ ...header, ...parsed.header });
      if (Array.isArray(parsed.entries)) onEntriesChange(parsed.entries);
      if (parsed.step === "summary" || parsed.step === "entry") setStep(parsed.step);
      if (parsed.header || (Array.isArray(parsed.entries) && parsed.entries.length)) {
        setDraftRestored(true);
      }
    } catch {
      window.localStorage.removeItem(batchReceiveDraftStorageKey);
    }
  }, [entries.length, header, onEntriesChange, onHeaderChange]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    window.localStorage.setItem(batchReceiveDraftStorageKey, JSON.stringify({ header, entries, step }));
  }, [entries, header, step]);

  const searchResults = useMemo(
    () => buildMaterialSearchResults(activeMaterials, summaries, searchKeyword),
    [activeMaterials, searchKeyword, summaries]
  );
  const resolvedLines = useMemo(() => resolveEntryLines(entries, materials), [entries, materials]);
  const totalAmount = resolvedLines.reduce((sum, line) => sum + line.amount, 0);

  const updateEntry = (entryId: string, nextEntry: InventoryBatchReceiveEntry) => {
    onEntriesChange(entries.map((entry) => (entry.id === entryId ? nextEntry : entry)));
  };

  const focusEntryField = (entryId: string, fieldClassName: string) => {
    window.setTimeout(() => {
      const target = document.querySelector<HTMLInputElement>(
        `[data-entry-id="${entryId}"] .${fieldClassName} input`
      );
      target?.focus();
      target?.select();
    }, 60);
  };

  const addMaterialEntry = (material: InventoryMaterial) => {
    const nextEntry = createEntryFromMaterial(material, lots, ledgers);
    onEntriesChange([...entries, nextEntry]);
    setSearchKeyword("");
    setSearchOpen(false);
    setHighlightedIndex(0);
    focusEntryField(nextEntry.id, "inventory-batch-quantity-input");
  };

  const addNewMaterialEntry = (result: BatchReceiveNewMaterialResult) => {
    const nextEntry = createEntryFromNewMaterial(result);
    onEntriesChange([...entries, nextEntry]);
    setNewMaterialOpen(false);
    setSearchKeyword("");
    setSearchOpen(false);
    focusEntryField(nextEntry.id, "inventory-batch-quantity-input");
  };

  const handleOpenNewMaterial = () => {
    setNewMaterialOpen(true);
    setSearchOpen(false);
  };

  const removeEntry = (entryId: string) => {
    Modal.confirm({
      title: "确认删除该入库明细？",
      okText: "删除",
      cancelText: "取消",
      okButtonProps: { danger: true },
      onOk: () => onEntriesChange(entries.filter((entry) => entry.id !== entryId))
    });
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setSearchOpen(false);
      return;
    }
    if (!searchOpen) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex((prev) => Math.min(prev + 1, searchResults.length - 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, 0));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const highlighted = searchResults[highlightedIndex];
      if (highlighted) addMaterialEntry(highlighted.material);
      else if (searchKeyword.trim()) setNewMaterialOpen(true);
    }
  };

  const handleProceedToSummary = () => {
    if (!entries.length) {
      onValidationError?.("请先搜索并添加入库物料。");
      return;
    }
    const invalidLine = resolvedLines.find((line) => !line.isReady);
    if (invalidLine?.validationMessage) {
      onValidationError?.(invalidLine.validationMessage);
      return;
    }
    setStep("summary");
  };

  const handleSubmit = () => {
    if (!header.receiveDate) {
      onValidationError?.("请选择入库日期。");
      return;
    }
    onSubmit();
    window.localStorage.removeItem(batchReceiveDraftStorageKey);
    setStep("entry");
  };

  const handleClear = () => {
    window.localStorage.removeItem(batchReceiveDraftStorageKey);
    setDraftRestored(false);
    setStep("entry");
    onClear();
  };

  const summaryColumns = [
    {
      title: "物料名称",
      dataIndex: "materialName",
      render: (_: unknown, line: ResolvedLine) => (
        <div className="inventory-batch-summary-material">
          <strong>{line.material.materialName}</strong>
          {line.entry.newMaterialForm && !line.entry.materialId ? (
            <span className="inventory-batch-badge inventory-batch-badge--new">新建</span>
          ) : null}
        </div>
      )
    },
    {
      title: "品牌",
      dataIndex: "brand",
      render: (_: unknown, line: ResolvedLine) => line.material.brand || "—"
    },
    {
      title: "分类",
      dataIndex: "category",
      render: (_: unknown, line: ResolvedLine) => formatMaterialCategoryLabel(line.material)
    },
    {
      title: "供应商",
      dataIndex: "supplier",
      render: (_: unknown, line: ResolvedLine) => line.draft.supplier || "—"
    },
    {
      title: "供应商电话",
      dataIndex: "supplierPhone",
      render: (_: unknown, line: ResolvedLine) => line.draft.supplierPhone || "—"
    },
    {
      title: "数量",
      dataIndex: "quantity",
      render: (_: unknown, line: ResolvedLine) => `${formatInventoryNumber(line.quantity)}${line.draft.inboundUnit || ""}`
    },
    {
      title: "单价",
      dataIndex: "unitPrice",
      render: (_: unknown, line: ResolvedLine) =>
        formatReceiveUnitPrice(line.amount, line.quantity, line.draft.inboundUnit)
    },
    {
      title: "总金额",
      dataIndex: "amount",
      render: (_: unknown, line: ResolvedLine) => `${formatAmount(line.amount)}元`
    },
    {
      title: "保质期至",
      dataIndex: "expiryDate",
      render: (_: unknown, line: ResolvedLine) => line.draft.expiryDate || "—"
    }
  ];

  if (step === "summary") {
    return (
      <div className="inventory-batch-workspace inventory-batch-workspace--summary">
        {draftRestored ? (
          <Alert
            showIcon
            type="info"
            message="已恢复上次未提交草稿"
            closable
            className="inventory-batch-draft-alert"
            onClose={() => setDraftRestored(false)}
          />
        ) : null}
        <section className="inventory-batch-document-head">
          <div className="inventory-batch-section-heading">
            <strong>入库单预览</strong>
            <Text type="secondary">确认无误后提交，系统将生成批次与库存流水</Text>
          </div>
        </section>

        <section className="inventory-batch-main-panel">
          <Table
            rowKey={(line) => line.entry.id}
            className="inventory-batch-summary-table"
            pagination={false}
            dataSource={resolvedLines}
            columns={summaryColumns}
            summary={() => (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={7}>
                  合计
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1}>
                  <strong className="inventory-batch-emphasis">{formatAmount(totalAmount)}元</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} />
              </Table.Summary.Row>
            )}
          />
        </section>

        <div className="inventory-batch-sticky-footer">
          <div className="inventory-batch-summary">
            <div>
              <span>
                共 <strong className="inventory-batch-emphasis">{resolvedLines.length}</strong> 个物料
              </span>
              <span>
                总金额 <strong className="inventory-batch-emphasis">{formatAmount(totalAmount)}元</strong>
              </span>
            </div>
            <span className="inventory-batch-summary-date">入库日期 {header.receiveDate || "—"}</span>
          </div>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => setStep("entry")}>
              返回修改
            </Button>
            <Button type="primary" className="inventory-batch-receive-submit" onClick={handleSubmit}>
              确认入库（{resolvedLines.length}）
            </Button>
          </Space>
        </div>
      </div>
    );
  }
  return (
    <>
      <div className="inventory-batch-workspace">
        {draftRestored ? (
          <Alert
            showIcon
            type="info"
            message="已恢复上次未提交草稿"
            closable
            className="inventory-batch-draft-alert"
            onClose={() => setDraftRestored(false)}
          />
        ) : null}
        <section className="inventory-batch-add-material">
          <div className="inventory-batch-section-heading">
            <strong>添加物料</strong>
          </div>
          <div className="inventory-batch-search-row">
            <div className="inventory-batch-search-input-wrap">
              <Input
                allowClear
                prefix={<SearchOutlined />}
                value={searchKeyword}
                placeholder="搜索物料名称、品牌、SKU、拼音"
                onFocus={() => setSearchOpen(true)}
                onBlur={() => window.setTimeout(() => setSearchOpen(false), 150)}
                onChange={(event) => {
                  setSearchKeyword(event.target.value);
                  setSearchOpen(true);
                  setHighlightedIndex(0);
                }}
                onKeyDown={handleSearchKeyDown}
              />
              {searchOpen && searchKeyword.trim() ? (
                <div className="inventory-batch-search-popover inventory-batch-search-popover--top">
                  {searchResults.length ? (
                    searchResults.map((result, resultIndex) => (
                      <button
                        key={result.material.id}
                        type="button"
                        className={`inventory-batch-search-result${highlightedIndex === resultIndex ? " is-active" : ""}`}
                        onMouseDown={(event) => event.preventDefault()}
                        onMouseEnter={() => setHighlightedIndex(resultIndex)}
                        onClick={() => addMaterialEntry(result.material)}
                      >
                        <span>
                          <strong>{result.material.materialName}</strong>
                          <Text type="secondary">
                            {result.material.brand} · {formatMaterialCategoryLabel(result.material)}
                          </Text>
                        </span>
                        <em>
                          库存 {result.summary ? formatInventoryQty(result.summary.currentStockBase, result.material.baseUnit) : "--"}
                        </em>
                      </button>
                    ))
                  ) : (
                    <div className="inventory-batch-search-empty">
                      <Text type="secondary">未找到「{searchKeyword.trim()}」</Text>
                      <Button
                        type="dashed"
                        block
                        icon={<PlusOutlined />}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={handleOpenNewMaterial}
                      >
                        新建物料：{searchKeyword.trim()}
                      </Button>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="inventory-batch-main-panel">
          <div className="inventory-batch-main-panel__head">
            <div className="inventory-batch-section-heading">
              <strong>入库明细（{entries.length}）</strong>
              <Text type="secondary">已添加 {entries.length} 个物料</Text>
            </div>
          </div>

          {entries.length ? (
            <div className="inventory-batch-detail-table">
              <div className="inventory-batch-detail-table__head">
                <span>物料</span>
                <span><span className="inventory-batch-required">*</span>数量</span>
                <span><span className="inventory-batch-required">*</span>单位</span>
                <span><span className="inventory-batch-required">*</span>总金额</span>
                <span><span className="inventory-batch-required">*</span>保质期至</span>
                <span><span className="inventory-batch-required">*</span>供应商</span>
                <span>供应商电话</span>
                <span aria-hidden />
              </div>
              <div className="inventory-batch-detail-table__body">
                {entries.map((entry) => {
                  const material = resolveEntryMaterial(entry, activeMaterials);
                  if (!material) return null;
                  const draft = buildEffectiveDraft(entry, material);
                  const validationMessage = resolveLineValidation(entry, material, draft);
                  const profileSpec = getMaterialProfileFieldSpecs(material).find((spec) => spec.requiredInBatchReceive);
                  const profileValue = profileSpec ? formatInventoryMaterialFieldValue(material, profileSpec) : "";
                  const receivableUnitOptions = resolveInventoryReceivableUnits(
                    material.baseUnit,
                    material.packageConversions || []
                  ).map((unit) => ({ label: unit, value: unit }));

                  const patchDraft = (patch: InventoryBatchReceiveDraft) => {
                    updateEntry(entry.id, { ...entry, draft: { ...entry.draft, ...patch } });
                  };

                  const showInvalid = Boolean(
                    validationMessage && (draft.inboundQuantity || draft.expiryDate || draft.unitPrice)
                  );

                  return (
                    <div
                      key={entry.id}
                      className={`inventory-batch-detail-row${showInvalid ? " is-invalid" : ""}`}
                      data-entry-id={entry.id}
                    >
                      <div className="inventory-batch-detail-row__material">
                        <div className="inventory-batch-detail-row__name">
                          <strong>{material.materialName}</strong>
                          {entry.newMaterialForm && !entry.materialId ? (
                            <span className="inventory-batch-badge inventory-batch-badge--new">新建</span>
                          ) : null}
                        </div>
                        <Text type="secondary" className="inventory-batch-detail-row__meta">
                          {[material.brand, formatMaterialCategoryLabel(material), profileValue ? `${profileSpec?.label} ${profileValue}` : ""]
                            .filter(Boolean)
                            .join(" · ")}
                        </Text>
                      </div>

                      <div className="inventory-batch-detail-row__field">
                        <InputNumber
                          className="inventory-batch-quantity-input"
                          min={0.01}
                          value={draft.inboundQuantity}
                          placeholder="数量"
                          style={{ width: "100%" }}
                          onPressEnter={() => focusEntryField(entry.id, "inventory-batch-amount-input")}
                          onChange={(value) => patchDraft({ inboundQuantity: typeof value === "number" ? value : undefined })}
                        />
                      </div>

                      <div className="inventory-batch-detail-row__field">
                        <Select
                          value={draft.inboundUnit}
                          options={receivableUnitOptions}
                          placeholder="单位"
                          style={{ width: "100%" }}
                          onChange={(inboundUnit) => patchDraft({ inboundUnit })}
                        />
                      </div>

                      <div className="inventory-batch-detail-row__field">
                        <InputNumber
                          className="inventory-batch-amount-input"
                          min={0}
                          value={draft.unitPrice}
                          placeholder="元"
                          precision={2}
                          style={{ width: "100%" }}
                          onPressEnter={() => focusEntryField(entry.id, "inventory-batch-expiry-input")}
                          onChange={(value) => patchDraft({ unitPrice: typeof value === "number" ? value : undefined })}
                        />
                      </div>

                      <div className="inventory-batch-detail-row__field">
                        <DatePicker
                          className="inventory-batch-expiry-input"
                          value={draft.expiryDate ? dayjs(draft.expiryDate) : null}
                          placeholder="选择日期"
                          style={{ width: "100%" }}
                          onChange={(_, value) => patchDraft({ expiryDate: Array.isArray(value) ? value[0] : value })}
                        />
                      </div>

                      <div className="inventory-batch-detail-row__field">
                        <Input
                          value={draft.supplier}
                          placeholder="供应商"
                          onChange={(event) => patchDraft({ supplier: event.target.value })}
                        />
                      </div>

                      <div className="inventory-batch-detail-row__field">
                        <Input
                          value={draft.supplierPhone}
                          placeholder="供应商电话"
                          onChange={(event) => patchDraft({ supplierPhone: event.target.value })}
                        />
                      </div>

                      <div className="inventory-batch-detail-row__actions">
                        <Tooltip title="删除">
                          <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeEntry(entry.id)} />
                        </Tooltip>
                      </div>

                      {validationMessage && (draft.inboundQuantity || draft.expiryDate) ? (
                        <Text type="danger" className="inventory-batch-detail-row__error">
                          {validationMessage}
                        </Text>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="inventory-batch-empty-state">
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="搜索并选择物料，开始填写入库信息" />
            </div>
          )}
        </section>

        <div className="inventory-batch-sticky-footer">
          <div className="inventory-batch-summary">
            <span>
              共 <strong className="inventory-batch-emphasis">{entries.length}</strong> 个物料
            </span>
            <span>
              总金额 <strong className="inventory-batch-emphasis">{formatAmount(totalAmount)}元</strong>
            </span>
          </div>
          <Space>
            <Button onClick={onCancel}>取消</Button>
            <Button onClick={handleClear}>清空</Button>
            <Tooltip title={!readyCount && entries.length ? "请补齐每条明细的数量、供应商、总金额和保质期" : undefined}>
              <Button type="primary" className="inventory-batch-receive-submit" disabled={!readyCount} onClick={handleProceedToSummary}>
                提交{readyCount ? `（${readyCount}）` : ""}
              </Button>
            </Tooltip>
          </Space>
        </div>
      </div>

      <BatchReceiveNewMaterialModal
        open={newMaterialOpen}
        initialName={searchKeyword.trim()}
        onCancel={() => setNewMaterialOpen(false)}
        onConfirm={addNewMaterialEntry}
      />
    </>
  );
}

export function resolveBatchReceiveEntryMaterial(
  entry: InventoryBatchReceiveEntry,
  materials: InventoryMaterial[],
  fallbackCategory?: InventoryCategory
) {
  const activeMaterials = materials.filter((material) => getInventoryMaterialStatus(material) === "启用中");
  return resolveEntryMaterial(
    fallbackCategory && !entry.category ? { ...entry, category: fallbackCategory } : entry,
    activeMaterials
  );
}

export function buildBatchReceiveEntryEffectiveDraft(
  entry: InventoryBatchReceiveEntry,
  material?: InventoryMaterial | null
) {
  return buildEffectiveDraft(entry, material);
}

export function isBatchReceiveEntryReady(
  entry: InventoryBatchReceiveEntry,
  materials: InventoryMaterial[],
  fallbackCategory?: InventoryCategory
) {
  const effectiveEntry = fallbackCategory && !entry.category ? { ...entry, category: fallbackCategory } : entry;
  const material = resolveBatchReceiveEntryMaterial(effectiveEntry, materials);
  const draft = buildBatchReceiveEntryEffectiveDraft(entry, material);
  return !resolveLineValidation(entry, material, draft);
}

export function isBatchReceiveEntrySubmitting(entry: InventoryBatchReceiveEntry) {
  return Boolean(entry.materialKeyword || entry.materialId || typeof entry.draft.inboundQuantity === "number");
}

export function formatReceiveIncreasePreview(
  quantity: number | undefined,
  unit: string | undefined,
  baseUnit: string,
  conversions: InventoryPackageConversion[]
) {
  if (!quantity || quantity <= 0 || !unit || !baseUnit) return "";
  const baseQuantity = calculateInventoryBaseQuantity(quantity, unit, baseUnit, conversions);
  if (!baseQuantity) return "";
  return `${formatInventoryNumber(quantity)}${unit} = ${formatInventoryQty(baseQuantity, baseUnit)}`;
}
