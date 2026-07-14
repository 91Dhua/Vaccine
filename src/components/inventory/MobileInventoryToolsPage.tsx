import {
  AuditOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  DownOutlined,
  InboxOutlined,
  LeftOutlined,
  PlusOutlined,
  SearchOutlined,
  UpOutlined,
  WarningOutlined
} from "@ant-design/icons";
import { AutoComplete, Button, Checkbox, Input, InputNumber, Select, Tag, Typography, message } from "antd";
import { useMemo, useState } from "react";
import { BatchReceiveInlineNewMaterial, BatchReceiveInlineNewMaterialOptional } from "./BatchReceiveInlineNewMaterial";
import {
  buildBatchInlineNewMaterialDraft,
  buildInventoryReceiveEntryFromSearch,
  buildInventoryStocktakeDifferences,
  buildInventoryStocktakeScope,
  buildInventorySummaries,
  calculateInventoryBaseQuantity,
  createDefaultBatchNewMaterialForm,
  formatInventoryMaterialFieldValue,
  formatInventoryQty,
  formatInventoryQtyWithPackage,
  getBatchReceiveOptionalFieldHint,
  getInventoryMaterialStatus,
  getInventoryReceiveMaterialOptions,
  getMaterialProfileFieldSpecs,
  inventoryCategoryOrder,
  inventorySeedLedgers,
  inventorySeedLots,
  inventorySeedMaterials,
  normalizeBatchPackageConversions,
  resolveInventoryReceivableUnits,
  resolveInventoryToleranceDifferences,
  validateBatchInlineNewMaterial,
  type InventoryCategory,
  type InventoryDifferenceRecord,
  type InventoryLedgerRow,
  type InventoryLot,
  type InventoryMaterial,
  type InventoryPackageConversion,
  type InventoryStocktakeMode,
  type InventoryStocktakeScopeRow,
  type InventorySummary
} from "./inventoryData";
import {
  buildBatchReceiveEntryEffectiveDraft,
  createEmptyBatchReceiveEntry,
  isBatchReceiveEntryReady,
  isBatchReceiveEntrySubmitting,
  resolveBatchReceiveEntryMaterial,
  type InventoryBatchReceiveDraft,
  type InventoryBatchReceiveEntry
} from "./BatchReceivePanel";

const { Text, Title } = Typography;

type MobileInventoryFeature = "query" | "receive" | "stocktake";
type MobileStocktakeStep = "mode" | "scope" | "execute" | "confirm" | "complete";

const features: Array<{
  key: MobileInventoryFeature;
  label: string;
  icon: JSX.Element;
  meta: string;
}> = [
  { key: "query", label: "查库存", icon: <SearchOutlined />, meta: "真实库存" },
  { key: "receive", label: "入库", icon: <InboxOutlined />, meta: "批量" },
  { key: "stocktake", label: "盘点", icon: <AuditOutlined />, meta: "实数" }
];

const stocktakeModeOptions: Array<{ mode: InventoryStocktakeMode; label: string }> = [
  { mode: "异常盘点", label: "异常" },
  { mode: "指定物料盘点", label: "指定" },
  { mode: "分类盘点", label: "分类" }
];

const allCategoryOptions = ["全部", ...inventoryCategoryOrder].map((value) => ({
  label: value,
  value
}));

function formatInventoryNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatPackageConversionSummary(conversions: InventoryPackageConversion[]) {
  return conversions.map((conversion) => `1${conversion.fromUnit} = ${conversion.quantity}${conversion.toUnit}`);
}

function formatReceiveIncreasePreview(
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

function resolveBatchReceiveUnit(material: InventoryMaterial) {
  const receivableUnits = resolveInventoryReceivableUnits(material.baseUnit, material.packageConversions || []);
  const preferredUnit = [material.auxiliaryUnit, material.packageConversions?.[0]?.fromUnit, material.baseUnit].find(
    (unit): unit is string => Boolean(unit && receivableUnits.includes(unit))
  );
  return preferredUnit || receivableUnits[0] || material.baseUnit;
}

function getReceivePackageConversions(
  material: InventoryMaterial | null | undefined,
  entry: InventoryBatchReceiveEntry
) {
  if (material?.packageConversions?.length) return material.packageConversions;
  if (entry.newMaterialForm?.baseUnit) {
    return normalizeBatchPackageConversions(entry.newMaterialForm.baseUnit, entry.newMaterialForm.packageConversions || []);
  }
  return [];
}

function MobileReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <span className="mv-inventory-mini-field">
      <Text type="secondary">{label}</Text>
      <strong>{value || "-"}</strong>
    </span>
  );
}

function MobileFieldLabel({ children, required = false }: { children: string; required?: boolean }) {
  return (
    <span className="mv-inventory-field-label">
      {required ? <em aria-hidden="true">*</em> : null}
      {children}
    </span>
  );
}

function MobileReceiveEntryCard({
  index,
  entry,
  category,
  activeMaterials,
  materialOptions,
  summaries,
  canRemove,
  onChange,
  onRemove
}: {
  index: number;
  entry: InventoryBatchReceiveEntry;
  category: InventoryCategory;
  activeMaterials: InventoryMaterial[];
  materialOptions: Array<{ value: string; label: string; materialId?: string }>;
  summaries: InventorySummary[];
  canRemove: boolean;
  onChange: (entry: InventoryBatchReceiveEntry) => void;
  onRemove: () => void;
}) {
  const keyword = entry.materialKeyword.trim();
  const selectedMaterial = entry.materialId
    ? activeMaterials.find((item) => item.id === entry.materialId) || null
    : activeMaterials.find((item) => item.materialName === keyword && item.category === category) || null;
  const isCreatingNew = Boolean(keyword && !selectedMaterial);
  const inlineDraft =
    isCreatingNew && entry.newMaterialForm
      ? buildBatchInlineNewMaterialDraft(category, keyword, entry.newMaterialForm)
      : null;
  const effectiveMaterial = selectedMaterial || inlineDraft;
  const effectiveDraft = buildBatchReceiveEntryEffectiveDraft(entry, effectiveMaterial);
  const packageConversions = getReceivePackageConversions(effectiveMaterial, entry);
  const summary = selectedMaterial ? summaries.find((item) => item.materialId === selectedMaterial.id) : undefined;
  const inlineValidationMessage =
    isCreatingNew && entry.newMaterialForm
      ? validateBatchInlineNewMaterial(category, keyword, entry.newMaterialForm)
      : null;
  const hasQuantity = typeof effectiveDraft.inboundQuantity === "number" && effectiveDraft.inboundQuantity > 0;
  const isReady = isBatchReceiveEntryReady(entry, activeMaterials, category);
  const optionalHint = getBatchReceiveOptionalFieldHint(category);
  const profileSpecs = effectiveMaterial
    ? getMaterialProfileFieldSpecs(effectiveMaterial).filter((spec) => spec.requiredInBatchReceive)
    : [];
  const receivableUnitOptions = effectiveMaterial
    ? resolveInventoryReceivableUnits(effectiveMaterial.baseUnit, packageConversions).map((unit) => ({
        label: unit,
        value: unit
      }))
    : [];
  const increasePreview = effectiveMaterial
    ? formatReceiveIncreasePreview(
        effectiveDraft.inboundQuantity,
        effectiveDraft.inboundUnit || effectiveMaterial.baseUnit,
        effectiveMaterial.baseUnit,
        packageConversions
      )
    : "";

  const patchDraft = (patch: InventoryBatchReceiveDraft) => {
    onChange({ ...entry, draft: { ...entry.draft, ...patch } });
  };

  const patchNewMaterialForm = (patch: Partial<NonNullable<InventoryBatchReceiveEntry["newMaterialForm"]>>) => {
    if (!entry.newMaterialForm) return;
    onChange({ ...entry, newMaterialForm: { ...entry.newMaterialForm, ...patch } });
  };

  const selectMaterial = (material: InventoryMaterial) => {
    onChange({
      ...entry,
      materialKeyword: material.materialName,
      materialId: material.id,
      newMaterialForm: null,
      optionalExpanded: false,
      draft: {
        ...entry.draft,
        inboundUnit: resolveBatchReceiveUnit(material)
      }
    });
  };

  const handleKeywordChange = (value: string) => {
    const trimmed = value.trim();
    const matched = activeMaterials.find((item) => item.materialName === trimmed && item.category === category);
    if (matched) {
      selectMaterial(matched);
      return;
    }
    onChange({
      ...entry,
      materialKeyword: value,
      materialId: undefined,
      newMaterialForm: trimmed ? entry.newMaterialForm || createDefaultBatchNewMaterialForm(category) : null,
      optionalExpanded: trimmed ? (!matched && !entry.newMaterialForm ? true : entry.optionalExpanded) : false,
      draft: entry.draft
    });
  };

  return (
    <article className={`mv-inventory-receive-card${isReady ? " is-ready" : hasQuantity || keyword ? " is-partial" : ""}`}>
      <div className="mv-inventory-receive-card__head">
        <span>
          <strong>入库物料 {index + 1}</strong>
          <Text type="secondary">{category}</Text>
        </span>
        <span className="mv-inventory-receive-card__tags">
          {isCreatingNew ? <Tag color="green">新建</Tag> : null}
          {hasQuantity && !isReady ? <Tag color="orange">待补齐</Tag> : null}
          {isReady ? <Tag color="success">可提交</Tag> : null}
          {canRemove ? <Button type="text" danger icon={<DeleteOutlined />} onClick={onRemove} /> : null}
        </span>
      </div>

      <label className="mv-inventory-field">
        <MobileFieldLabel required>物料名称(中文)</MobileFieldLabel>
        <AutoComplete
          value={entry.materialKeyword}
          options={materialOptions.filter((option) => {
            const material = activeMaterials.find((item) => item.id === option.materialId);
            return material ? material.category === category : true;
          })}
          placeholder={`搜索或输入${category}物料`}
          filterOption={(inputValue, option) =>
            String(option?.label || "").includes(inputValue) || String(option?.value || "").includes(inputValue)
          }
          onSelect={(value, option) => {
            const material = activeMaterials.find((item) => item.id === option.materialId);
            if (material) selectMaterial(material);
            else handleKeywordChange(String(value));
          }}
          onChange={handleKeywordChange}
        />
      </label>

      {selectedMaterial ? (
        <div className="mv-inventory-mini-grid">
          {summary ? (
            <MobileReadOnlyField
              label="当前库存"
              value={formatInventoryQtyWithPackage(summary.currentStockBase, selectedMaterial)}
            />
          ) : null}
          <MobileReadOnlyField label="品牌" value={selectedMaterial.brand} />
          {profileSpecs.slice(0, 3).map((spec) => (
            <MobileReadOnlyField
              key={String(spec.key)}
              label={spec.label}
              value={formatInventoryMaterialFieldValue(selectedMaterial, spec) || "-"}
            />
          ))}
        </div>
      ) : null}

      {isCreatingNew && entry.newMaterialForm ? (
        <div className="mv-inventory-mobile-new-material">
          <BatchReceiveInlineNewMaterial
            category={category}
            value={entry.newMaterialForm}
            onChange={(nextForm) =>
              onChange({
                ...entry,
                newMaterialForm: nextForm,
                draft: nextForm.baseUnit
                  ? { ...entry.draft, inboundUnit: entry.draft.inboundUnit || nextForm.baseUnit }
                  : entry.draft
              })
            }
          />
        </div>
      ) : null}

      {keyword ? (
        <div className="mv-inventory-form-stack">
          <div className="mv-inventory-inline-fields">
            <label className="mv-inventory-field">
              <MobileFieldLabel required>入库数量</MobileFieldLabel>
              <InputNumber
                min={0.01}
                value={effectiveDraft.inboundQuantity}
                placeholder="数量"
                style={{ width: "100%" }}
                onChange={(value) => patchDraft({ inboundQuantity: typeof value === "number" ? value : undefined })}
              />
            </label>
            <label className="mv-inventory-field">
              <MobileFieldLabel required>单位</MobileFieldLabel>
              <Select
                value={effectiveDraft.inboundUnit}
                options={receivableUnitOptions}
                placeholder="单位"
                style={{ width: "100%" }}
                onChange={(inboundUnit) => patchDraft({ inboundUnit })}
              />
            </label>
          </div>
          <div className="mv-inventory-inline-fields">
            <label className="mv-inventory-field">
              <MobileFieldLabel required>到期日期</MobileFieldLabel>
              <Input
                value={effectiveDraft.expiryDate}
                placeholder="2026-12-31"
                onChange={(event) => patchDraft({ expiryDate: event.target.value })}
              />
            </label>
            <label className="mv-inventory-field">
              <MobileFieldLabel required>总进货价（元）</MobileFieldLabel>
              <InputNumber
                min={0}
                value={effectiveDraft.unitPrice}
                placeholder="金额"
                style={{ width: "100%" }}
                onChange={(value) => patchDraft({ unitPrice: typeof value === "number" ? value : undefined })}
              />
            </label>
          </div>
          <label className="mv-inventory-field">
            <MobileFieldLabel required>供应商</MobileFieldLabel>
            <Input
              value={effectiveDraft.supplier}
              placeholder="供应商"
              onChange={(event) => patchDraft({ supplier: event.target.value })}
            />
          </label>
          {increasePreview ? <Text type="secondary">换算库存：{increasePreview}</Text> : null}
        </div>
      ) : null}

      {keyword ? (
        <div className="mv-inventory-optional">
          {entry.optionalExpanded ? (
            <div className="mv-inventory-form-stack">
              {isCreatingNew && entry.newMaterialForm ? (
                <BatchReceiveInlineNewMaterialOptional
                  category={category}
                  value={entry.newMaterialForm}
                  onChange={(nextForm) => onChange({ ...entry, newMaterialForm: nextForm })}
                />
              ) : null}
              <label className="mv-inventory-field">
                <MobileFieldLabel>供应商电话</MobileFieldLabel>
                <Input
                  value={effectiveDraft.supplierPhone}
                  placeholder="选填"
                  onChange={(event) => patchDraft({ supplierPhone: event.target.value })}
                />
              </label>
              <label className="mv-inventory-field">
                <MobileFieldLabel>备注</MobileFieldLabel>
                <Input.TextArea
                  rows={2}
                  value={effectiveDraft.note}
                  placeholder="入库备注"
                  onChange={(event) => patchDraft({ note: event.target.value })}
                />
              </label>
            </div>
          ) : null}

          <button
            type="button"
            className="mv-inventory-link-toggle"
            onClick={() => onChange({ ...entry, optionalExpanded: !entry.optionalExpanded })}
          >
            {entry.optionalExpanded ? <UpOutlined /> : <DownOutlined />}
            <span>{entry.optionalExpanded ? "收起选填项" : "展开选填项"}</span>
            <em>{optionalHint}</em>
          </button>
        </div>
      ) : null}

      {inlineValidationMessage &&
      (hasQuantity || entry.newMaterialForm?.brand || entry.newMaterialForm?.materialNameEn) ? (
        <Text type="danger" className="mv-inventory-validation">
          {inlineValidationMessage}
        </Text>
      ) : null}
    </article>
  );
}

export function MobileInventoryToolsPage() {
  const [materials, setMaterials] = useState<InventoryMaterial[]>(inventorySeedMaterials);
  const [lots, setLots] = useState<InventoryLot[]>(inventorySeedLots);
  const [ledgers, setLedgers] = useState<InventoryLedgerRow[]>(inventorySeedLedgers);
  const [differences, setDifferences] = useState<InventoryDifferenceRecord[]>([]);
  const [activeFeature, setActiveFeature] = useState<MobileInventoryFeature | null>(null);
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState<InventoryCategory | "全部">("全部");
  const [receiveCategory, setReceiveCategory] = useState<InventoryCategory>("饲料");
  const [receiveEntries, setReceiveEntries] = useState<InventoryBatchReceiveEntry[]>(() => [createEmptyBatchReceiveEntry()]);
  const [stocktakeStep, setStocktakeStep] = useState<MobileStocktakeStep>("mode");
  const [stocktakeMode, setStocktakeMode] = useState<InventoryStocktakeMode>("异常盘点");
  const [stocktakeCategory, setStocktakeCategory] = useState<InventoryCategory>("饲料");
  const [stocktakeScopeRows, setStocktakeScopeRows] = useState<InventoryStocktakeScopeRow[]>([]);
  const [stocktakeSelectedRowIds, setStocktakeSelectedRowIds] = useState<string[]>([]);
  const [stocktakeKeyword, setStocktakeKeyword] = useState("");
  const [stocktakeScopeCategory, setStocktakeScopeCategory] = useState<InventoryCategory | "全部">("全部");
  const [stocktakeActuals, setStocktakeActuals] = useState<Record<string, number | undefined>>({});
  const [stocktakeResult, setStocktakeResult] = useState<{
    stocktakeNo: string;
    materialCount: number;
    noDifferenceCount: number;
    gainCount: number;
    lossCount: number;
    processedCount: number;
    pendingCount: number;
  } | null>(null);

  const summaries = useMemo(() => buildInventorySummaries(materials, lots, ledgers), [ledgers, lots, materials]);
  const activeMaterials = useMemo(
    () => materials.filter((material) => getInventoryMaterialStatus(material) === "启用中"),
    [materials]
  );
  const materialOptions = useMemo(() => getInventoryReceiveMaterialOptions(materials), [materials]);
  const filteredSummaries = summaries.filter((item) => {
    const matchedKeyword = `${item.materialName}${item.brand}${item.category}`.includes(keyword.trim());
    const matchedCategory = category === "全部" || item.category === category;
    return matchedKeyword && matchedCategory;
  });
  const negativeAlertCount = summaries.filter((item) => item.stockRisk === "负库存").length;
  const expiredLotCount = lots.filter((item) => item.status === "过期" && item.remainingQtyBase > 0).length;
  const activeFeatureConfig = features.find((feature) => feature.key === activeFeature) || null;
  const receiveSubmittingEntries = receiveEntries.filter(isBatchReceiveEntrySubmitting);
  const receiveReadyEntries = receiveEntries.filter((entry) =>
    isBatchReceiveEntryReady(entry, materials, receiveCategory)
  );
  const selectedStocktakeScopeRows = stocktakeScopeRows.filter((row) => stocktakeSelectedRowIds.includes(row.id));
  const filteredStocktakeScopeRows = stocktakeScopeRows.filter((row) => {
    const matchedKeyword = `${row.materialName}${row.brand}${row.category}`.includes(stocktakeKeyword.trim());
    const matchedCategory = stocktakeScopeCategory === "全部" || row.category === stocktakeScopeCategory;
    return matchedKeyword && matchedCategory;
  });
  const stocktakeDifferenceRows = selectedStocktakeScopeRows.map((row) => {
    const actualQty = stocktakeActuals[row.id];
    return {
      ...row,
      actualQty,
      differenceQty: typeof actualQty === "number" ? Number((actualQty - row.bookQtyBase).toFixed(4)) : undefined
    };
  });
  const stocktakeDiffSummary = stocktakeDifferenceRows.reduce(
    (acc, row) => {
      if (row.differenceQty === undefined) return acc;
      if (row.differenceQty === 0) acc.noDifferenceCount += 1;
      if (row.differenceQty > 0) acc.gainCount += 1;
      if (row.differenceQty < 0) acc.lossCount += 1;
      return acc;
    },
    { noDifferenceCount: 0, gainCount: 0, lossCount: 0 }
  );

  const updateReceiveEntry = (entryId: string, nextEntry: InventoryBatchReceiveEntry) => {
    setReceiveEntries((prev) => prev.map((entry) => (entry.id === entryId ? nextEntry : entry)));
  };

  const removeReceiveEntry = (entryId: string) => {
    setReceiveEntries((prev) => {
      if (prev.length <= 1) return [createEmptyBatchReceiveEntry()];
      return prev.filter((entry) => entry.id !== entryId);
    });
  };

  const handleReceiveCategoryChange = (nextCategory: InventoryCategory) => {
    setReceiveCategory(nextCategory);
    setReceiveEntries([createEmptyBatchReceiveEntry()]);
  };

  const submitBatchReceive = () => {
    if (!receiveReadyEntries.length) {
      if (receiveSubmittingEntries.length) {
        message.error("已填写数量的条目需要补齐物料、到期日期、总进货价和供应商。");
      } else {
        message.error("请至少填写一条入库记录。");
      }
      return;
    }

    const receiveDateValue = new Date().toISOString().slice(0, 10);
    const baseSequence = lots.filter((lot) => lot.lotNo.startsWith(`RK-${receiveDateValue.replace(/-/g, "")}`)).length + 1;
    const stockByMaterial = new Map(summaries.map((summary) => [summary.materialId, summary.currentStockBase]));
    const pendingMaterials: InventoryMaterial[] = [];
    const nextLots: InventoryLot[] = [];
    const nextLedgers: InventoryLedgerRow[] = [];
    const submittedEntryIds: string[] = [];

    try {
      receiveReadyEntries.forEach((entry, index) => {
        const materialSource = resolveBatchReceiveEntryMaterial(
          entry,
          [...materials, ...pendingMaterials],
          receiveCategory
        );
        if (!materialSource) {
          throw new Error(`第 ${index + 1} 条：请先选择已有物料或完善新建物料信息。`);
        }

        const selectedExistingId =
          entry.materialId ||
          materials.find((item) => item.materialName === materialSource.materialName && item.category === materialSource.category)?.id;
        const newDraft =
          !entry.materialId && entry.newMaterialForm
            ? buildBatchInlineNewMaterialDraft(receiveCategory, entry.materialKeyword.trim(), entry.newMaterialForm)
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
          newMaterialId: `mat-mobile-batch-${Date.now()}-${index}`,
          lotId: `lot-mobile-batch-${Date.now()}-${index}`,
          expiryDate: draft.expiryDate || "",
          unitPrice: Number(draft.unitPrice || 0),
          inboundQuantity,
          inboundUnit,
          baseQuantity,
          packageConversions,
          supplier: draft.supplier,
          supplierPhone: draft.supplierPhone || undefined,
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
          `入库：${receiveCategory}`,
          `原始数量：${formatInventoryQty(receivedEntry.lot.inboundQty, receivedEntry.lot.inboundUnit)}`,
          receivedEntry.lot.inboundUnit === finalMaterial.baseUnit
            ? ""
            : `换算数量：${formatInventoryQty(receivedEntry.lot.convertedQtyBase, finalMaterial.baseUnit)}`,
          receivedEntry.lot.inboundUnit === finalMaterial.baseUnit
            ? ""
            : `规格：${formatPackageConversionSummary(packageConversions).join("，")}`,
          draft.note ? `备注：${draft.note}` : ""
        ].filter(Boolean);

        nextLedgers.push({
          id: `ledger-mobile-batch-receive-${Date.now()}-${index}`,
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
      setReceiveEntries((prev) => {
        const remaining = prev.filter((entry) => !submittedEntryIds.includes(entry.id));
        return remaining.length ? remaining : [createEmptyBatchReceiveEntry()];
      });
      setKeyword("");
      message.success(`入库成功，已生成 ${nextLots.length} 个批次和 ${nextLedgers.length} 条库存流水`);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "入库失败，请检查入库信息。");
    }
  };

  const openStocktakeScope = (mode: InventoryStocktakeMode) => {
    const rows = buildInventoryStocktakeScope({
      mode,
      materials,
      lots,
      summaries,
      category: stocktakeCategory
    });
    setStocktakeMode(mode);
    setStocktakeScopeRows(rows);
    setStocktakeSelectedRowIds(mode === "指定物料盘点" ? [] : rows.map((row) => row.id));
    setStocktakeKeyword("");
    setStocktakeScopeCategory("全部");
    setStocktakeActuals({});
    setStocktakeResult(null);
    setStocktakeStep("scope");
  };

  const toggleStocktakeRow = (rowId: string, checked: boolean) => {
    setStocktakeSelectedRowIds((prev) => {
      if (checked) return Array.from(new Set([...prev, rowId]));
      return prev.filter((id) => id !== rowId);
    });
  };

  const fillStocktakeBookStock = () => {
    setStocktakeActuals((prev) => ({
      ...prev,
      ...selectedStocktakeScopeRows.reduce<Record<string, number>>((values, row) => {
        values[row.id] = Math.max(row.bookQtyBase, 0);
        return values;
      }, {})
    }));
  };

  const validateStocktakeActuals = () => {
    for (const row of selectedStocktakeScopeRows) {
      const actualQty = stocktakeActuals[row.id];
      if (actualQty === undefined || actualQty < 0) {
        message.error(`请填写 ${row.materialName} 的实际库存，且不能小于 0。`);
        return false;
      }
    }
    return true;
  };

  const submitStocktakeActuals = () => {
    if (!selectedStocktakeScopeRows.length) {
      message.error("请至少选择一个盘点物料。");
      return;
    }
    if (!validateStocktakeActuals()) return;
    setStocktakeStep("confirm");
  };

  const confirmStocktake = () => {
    if (!validateStocktakeActuals()) return;
    const stocktakeNo = `PD${new Date().toISOString().slice(0, 10).replace(/-/g, "")}M01`;
    const occurredAt = `${new Date().toISOString().slice(0, 10)} 10:45`;

    try {
      const newDifferences = buildInventoryStocktakeDifferences({
        scopeRows: selectedStocktakeScopeRows,
        actualQuantities: stocktakeActuals,
        operator: "当前用户",
        stocktakeNo,
        occurredAt,
        idPrefix: `diff-mobile-${Date.now()}`
      });
      const toleranceResolution = resolveInventoryToleranceDifferences({
        differences: newDifferences,
        materials,
        lots,
        ledgers,
        operator: "系统",
        occurredAt,
        ledgerIdPrefix: `ledger-mobile-auto-tolerance-${Date.now()}`
      });
      const allStocktakeDifferences = [
        ...toleranceResolution.pendingDifferences,
        ...toleranceResolution.processedDifferences
      ];

      setMaterials(toleranceResolution.materials);
      setLots(toleranceResolution.lots);
      setLedgers((prev) => [...toleranceResolution.ledgers, ...prev]);
      setDifferences((prev) => [...allStocktakeDifferences, ...prev]);
      setStocktakeResult({
        stocktakeNo,
        materialCount: selectedStocktakeScopeRows.length,
        noDifferenceCount: stocktakeDiffSummary.noDifferenceCount,
        gainCount: stocktakeDiffSummary.gainCount,
        lossCount: stocktakeDiffSummary.lossCount,
        processedCount: toleranceResolution.processedDifferences.length,
        pendingCount: toleranceResolution.pendingDifferences.length
      });
      setStocktakeStep("complete");
      message.success("盘点已提交，系统将按规则处理差异");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "盘点提交失败，请检查数据。");
    }
  };

  const renderHome = () => (
    <>
      <header className="mv-inventory-tools__header">
        <Text type="secondary">配怀舍 · 一车间</Text>
        <Title level={4}>库存</Title>
      </header>

      <section className="mv-inventory-alert-strip">
        <span>
          <WarningOutlined /> 负库存 {negativeAlertCount}
        </span>
        <span>过期批次 {expiredLotCount}</span>
        {differences.filter((item) => item.status === "待处理").length ? (
          <span>待处理差异 {differences.filter((item) => item.status === "待处理").length}</span>
        ) : null}
      </section>

      <section className="mv-inventory-feature-grid" aria-label="库存功能">
        {features.map((feature) => (
          <button
            key={feature.key}
            type="button"
            className="mv-inventory-feature"
            onClick={() => setActiveFeature(feature.key)}
          >
            <span className="mv-inventory-feature__icon">{feature.icon}</span>
            <strong>{feature.label}</strong>
            <Text type="secondary">{feature.meta}</Text>
          </button>
        ))}
      </section>
    </>
  );

  const renderQuery = () => (
    <section className="mv-inventory-panel">
      <div className="mv-inventory-panel__head">
        <strong>{filteredSummaries.length} 个物料</strong>
        <Text type="secondary">真实库存</Text>
      </div>
      <div className="mv-inventory-query-tools">
        <Input
          className="mv-inventory-search"
          prefix={<SearchOutlined />}
          placeholder="搜索物料或品牌"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
        />
        <Select
          value={category}
          options={allCategoryOptions}
          onChange={(value) => setCategory(value as InventoryCategory | "全部")}
          className="mv-inventory-filter"
        />
      </div>
      <div className="mv-inventory-list">
        {filteredSummaries.map((item) => {
          const material = materials.find((candidate) => candidate.id === item.materialId);
          return (
            <button key={item.materialId} type="button" className="mv-inventory-row">
              <span>
                <strong>{item.materialName}</strong>
                <Text type="secondary">{item.brand} · {item.category}</Text>
              </span>
              <span>
                <b>{formatInventoryQtyWithPackage(item.currentStockBase, material || { baseUnit: item.baseUnit })}</b>
                <Tag color={item.stockRisk === "负库存" ? "error" : "success"}>
                  {item.stockRisk}
                </Tag>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );

  const renderReceive = () => (
    <>
      <section className="mv-inventory-panel mv-inventory-receive-panel">
        <div className="mv-inventory-panel__head">
          <strong>入库</strong>
          <Text type="secondary">可提交 {receiveReadyEntries.length}</Text>
        </div>
        <div className="mv-inventory-category-scroll" aria-label="入库分类">
          {inventoryCategoryOrder.map((item) => (
            <button
              key={item}
              type="button"
              className={`mv-inventory-chip${receiveCategory === item ? " is-active" : ""}`}
              onClick={() => handleReceiveCategoryChange(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      <section className="mv-inventory-receive-list">
        {receiveEntries.map((entry, index) => (
          <MobileReceiveEntryCard
            key={entry.id}
            index={index}
            entry={entry}
            category={receiveCategory}
            activeMaterials={activeMaterials}
            materialOptions={materialOptions}
            summaries={summaries}
            canRemove={receiveEntries.length > 1}
            onChange={(nextEntry) => updateReceiveEntry(entry.id, nextEntry)}
            onRemove={() => removeReceiveEntry(entry.id)}
          />
        ))}
      </section>

      <Button
        block
        icon={<PlusOutlined />}
        className="mv-inventory-secondary-button mv-inventory-receive-add-button"
        onClick={() => setReceiveEntries((prev) => [...prev, createEmptyBatchReceiveEntry()])}
      >
        添加入库物料
      </Button>

      <div className="mv-inventory-bottom-bar">
        <Button onClick={() => setReceiveEntries([createEmptyBatchReceiveEntry()])}>清空</Button>
        <Button type="primary" icon={<CheckCircleOutlined />} disabled={!receiveReadyEntries.length} onClick={submitBatchReceive}>
          确认入库{receiveReadyEntries.length ? `（${receiveReadyEntries.length}）` : ""}
        </Button>
      </div>
    </>
  );

  const renderStocktakeMode = () => (
    <section className="mv-inventory-panel">
      <div className="mv-inventory-panel__head">
        <strong>盘点方式</strong>
        <Text type="secondary">对齐 Console</Text>
      </div>
      <div className="mv-inventory-mode-grid">
        {stocktakeModeOptions.map((item) => (
          <button
            key={item.mode}
            type="button"
            className={`mv-inventory-mode${stocktakeMode === item.mode ? " is-active" : ""}`}
            onClick={() => setStocktakeMode(item.mode)}
          >
            <AuditOutlined />
            <strong>{item.label}</strong>
            <Text type="secondary">{item.mode}</Text>
          </button>
        ))}
      </div>
      {stocktakeMode === "分类盘点" ? (
        <label className="mv-inventory-field">
          <span>物料分类</span>
          <Select
            value={stocktakeCategory}
            options={inventoryCategoryOrder.map((value) => ({ label: value, value }))}
            onChange={(value) => setStocktakeCategory(value)}
          />
        </label>
      ) : null}
      <Button type="primary" block icon={<CheckCircleOutlined />} onClick={() => openStocktakeScope(stocktakeMode)}>
        确认范围
      </Button>
    </section>
  );

  const renderStocktakeScope = () => (
    <>
      <section className="mv-inventory-panel">
        <div className="mv-inventory-panel__head">
          <strong>确认盘点范围</strong>
          <Text type="secondary">已选 {selectedStocktakeScopeRows.length}</Text>
        </div>
        <div className="mv-inventory-query-tools">
          <Input
            className="mv-inventory-search"
            prefix={<SearchOutlined />}
            placeholder="搜索物料或品牌"
            value={stocktakeKeyword}
            onChange={(event) => setStocktakeKeyword(event.target.value)}
          />
          <Select
            value={stocktakeScopeCategory}
            options={allCategoryOptions}
            onChange={(value) => setStocktakeScopeCategory(value as InventoryCategory | "全部")}
            className="mv-inventory-filter"
          />
        </div>
      </section>

      <section className="mv-inventory-stocktake-list">
        {filteredStocktakeScopeRows.map((row) => (
          <label key={row.id} className="mv-inventory-stocktake-row">
            <Checkbox
              checked={stocktakeSelectedRowIds.includes(row.id)}
              onChange={(event) => toggleStocktakeRow(row.id, event.target.checked)}
            />
            <span>
              <strong>{row.materialName}</strong>
              <Text type="secondary">
                {row.brand} · {row.category} · {row.reason}
              </Text>
            </span>
            <b>{formatInventoryQty(row.bookQtyBase, row.baseUnit)}</b>
          </label>
        ))}
      </section>

      <div className="mv-inventory-bottom-bar">
        <Button onClick={() => setStocktakeStep("mode")}>返回</Button>
        <Button type="primary" disabled={!selectedStocktakeScopeRows.length} onClick={() => setStocktakeStep("execute")}>
          开始盘点
        </Button>
      </div>
    </>
  );

  const renderStocktakeExecute = () => (
    <>
      <section className="mv-inventory-panel">
        <div className="mv-inventory-panel__head">
          <strong>盘点操作</strong>
          <Button size="small" onClick={fillStocktakeBookStock}>
            填入账面数
          </Button>
        </div>
        <div className="mv-inventory-stocktake-meta">
          <span>{stocktakeMode}</span>
          <span>{selectedStocktakeScopeRows.length} 个物料</span>
          <span>当前用户</span>
        </div>
      </section>

      <section className="mv-inventory-stocktake-list">
        {selectedStocktakeScopeRows.map((row) => (
          <div key={row.id} className="mv-inventory-stocktake-input-row">
            <span>
              <strong>{row.materialName}</strong>
              <Text type="secondary">账面 {formatInventoryQty(row.bookQtyBase, row.baseUnit)}</Text>
            </span>
            <InputNumber
              min={0}
              value={stocktakeActuals[row.id]}
              placeholder="实数"
              addonAfter={row.baseUnit}
              onChange={(value) =>
                setStocktakeActuals((prev) => ({
                  ...prev,
                  [row.id]: typeof value === "number" ? value : undefined
                }))
              }
            />
          </div>
        ))}
      </section>

      <div className="mv-inventory-bottom-bar">
        <Button onClick={() => setStocktakeStep("scope")}>返回</Button>
        <Button type="primary" onClick={submitStocktakeActuals}>
          提交盘点
        </Button>
      </div>
    </>
  );

  const renderStocktakeConfirm = () => (
    <>
      <section className="mv-inventory-panel">
        <div className="mv-inventory-panel__head">
          <strong>盘点差异确认</strong>
          <Text type="secondary">提交后按规则处理</Text>
        </div>
        <div className="mv-inventory-stocktake-summary">
          <span>无差异<strong>{stocktakeDiffSummary.noDifferenceCount}</strong></span>
          <span>实盘多出<strong>{stocktakeDiffSummary.gainCount}</strong></span>
          <span>实盘少了<strong>{stocktakeDiffSummary.lossCount}</strong></span>
        </div>
      </section>

      <section className="mv-inventory-stocktake-list">
        {stocktakeDifferenceRows.map((row) => (
          <div key={row.id} className="mv-inventory-stocktake-confirm-row">
            <span>
              <strong>{row.materialName}</strong>
              <Text type="secondary">
                账面 {formatInventoryQty(row.bookQtyBase, row.baseUnit)} · 实盘{" "}
                {formatInventoryQty(row.actualQty || 0, row.baseUnit)}
              </Text>
            </span>
            <Tag color={row.differenceQty === 0 ? "success" : row.differenceQty && row.differenceQty > 0 ? "processing" : "warning"}>
              {row.differenceQty === 0
                ? "无差异"
                : row.differenceQty && row.differenceQty > 0
                  ? `多 ${formatInventoryQty(row.differenceQty, row.baseUnit)}`
                  : `少 ${formatInventoryQty(Math.abs(row.differenceQty || 0), row.baseUnit)}`}
            </Tag>
          </div>
        ))}
      </section>

      <div className="mv-inventory-bottom-bar">
        <Button onClick={() => setStocktakeStep("execute")}>返回修改</Button>
        <Button type="primary" icon={<CheckCircleOutlined />} onClick={confirmStocktake}>
          提交盘点
        </Button>
      </div>
    </>
  );

  const renderStocktakeComplete = () => (
    <section className="mv-inventory-panel mv-inventory-complete">
      <CheckCircleOutlined />
      <Title level={4}>{stocktakeResult?.pendingCount ? "盘点已提交" : "盘点已完成"}</Title>
      <Text type="secondary">{stocktakeResult?.stocktakeNo}</Text>
      <div className="mv-inventory-stocktake-summary">
        <span>盘点物料<strong>{stocktakeResult?.materialCount || 0}</strong></span>
        <span>自动处理<strong>{stocktakeResult?.processedCount || 0}</strong></span>
        <span>待处理<strong>{stocktakeResult?.pendingCount || 0}</strong></span>
      </div>
      <Button type="primary" block onClick={() => setActiveFeature(null)}>
        返回库存
      </Button>
      <Button
        block
        onClick={() => {
          setStocktakeStep("mode");
          setStocktakeActuals({});
          setStocktakeResult(null);
        }}
      >
        再盘一次
      </Button>
    </section>
  );

  const renderStocktake = () => {
    if (stocktakeStep === "scope") return renderStocktakeScope();
    if (stocktakeStep === "execute") return renderStocktakeExecute();
    if (stocktakeStep === "confirm") return renderStocktakeConfirm();
    if (stocktakeStep === "complete") return renderStocktakeComplete();
    return renderStocktakeMode();
  };

  return (
    <main className={`mv-home-scroll mv-inventory-tools${activeFeature === "receive" ? " mv-inventory-tools--receive" : ""}`}>
      {!activeFeatureConfig ? (
        renderHome()
      ) : (
        <>
          <header className="mv-inventory-subpage-head">
            <button
              type="button"
              className="mv-inventory-back"
              aria-label="返回库存工具"
              onClick={() => setActiveFeature(null)}
            >
              <LeftOutlined />
            </button>
            <span>
              <Text type="secondary">库存</Text>
              <Title level={4}>{activeFeatureConfig.label}</Title>
            </span>
          </header>

          {activeFeature === "query" ? renderQuery() : null}
          {activeFeature === "receive" ? renderReceive() : null}
          {activeFeature === "stocktake" ? renderStocktake() : null}
        </>
      )}
    </main>
  );
}
