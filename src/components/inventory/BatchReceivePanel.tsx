import {
  Alert,
  AutoComplete,
  Button,
  Card,
  Input,
  InputNumber,
  Select,
  Space,
  Tag,
  Typography
} from "antd";
import { DeleteOutlined, DownOutlined, PlusOutlined, UpOutlined } from "@ant-design/icons";
import { BatchReceiveInlineNewMaterial, BatchReceiveInlineNewMaterialOptional } from "./BatchReceiveInlineNewMaterial";
import { BatchReceivePackageField } from "./BatchReceivePackageField";
import {
  buildBatchInlineNewMaterialDraft,
  calculateInventoryBaseQuantity,
  createDefaultBatchNewMaterialForm,
  formatInventoryMaterialFieldValue,
  formatInventoryQty,
  getBatchReceiveOptionalFieldHint,
  getInventoryMaterialStatus,
  getInventoryReceiveMaterialOptions,
  inventoryCategoryFieldSpecs,
  inventoryCategoryOrder,
  normalizeBatchPackageConversions,
  validateBatchInlineNewMaterial,
  validateBatchReceivePackageSpec,
  type InventoryBatchNewMaterialForm,
  type InventoryCategory,
  type InventoryMaterial,
  type InventoryPackageConversion,
  type InventorySummary
} from "./inventoryData";

const { Text } = Typography;

export type InventoryBatchReceiveDraft = {
  inboundQuantity?: number;
  inboundUnit?: string;
  expiryDate?: string;
  unitPrice?: number;
  supplier?: string;
  supplierPhone?: string;
  storageLocation?: string;
  note?: string;
};

export type InventoryBatchReceiveEntry = {
  id: string;
  materialKeyword: string;
  materialId?: string;
  newMaterialForm?: InventoryBatchNewMaterialForm | null;
  optionalExpanded: boolean;
  draft: InventoryBatchReceiveDraft;
};

type BatchReceivePanelProps = {
  category: InventoryCategory;
  onCategoryChange: (category: InventoryCategory) => void;
  entries: InventoryBatchReceiveEntry[];
  onEntriesChange: (entries: InventoryBatchReceiveEntry[]) => void;
  materials: InventoryMaterial[];
  summaries: InventorySummary[];
  onCancel: () => void;
  onClear: () => void;
  onSubmit: () => void;
  readyCount: number;
};

function formatInventoryNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function buildReceiveUnitOptions(baseUnit: string, conversions: InventoryPackageConversion[]) {
  return Array.from(new Set([baseUnit, ...conversions.map((conversion) => conversion.fromUnit)].filter(Boolean))).map((unit) => ({
    label: unit,
    value: unit
  }));
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
  return `本次入库：${formatInventoryNumber(quantity)}${unit} = ${formatInventoryQty(baseQuantity, baseUnit)}`;
}

function resolveBatchReceiveUnit(material: InventoryMaterial) {
  return material.auxiliaryUnit || material.packageConversions?.[0]?.fromUnit || material.baseUnit;
}

export function createEmptyBatchReceiveEntry(): InventoryBatchReceiveEntry {
  return {
    id: `batch-entry-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    materialKeyword: "",
    optionalExpanded: false,
    draft: {}
  };
}

function resolveEntryMaterial(
  entry: InventoryBatchReceiveEntry,
  activeMaterials: InventoryMaterial[],
  category: InventoryCategory
) {
  if (entry.materialId) {
    return activeMaterials.find((item) => item.id === entry.materialId) || null;
  }
  const keyword = entry.materialKeyword.trim();
  const existing = activeMaterials.find((item) => item.materialName === keyword && item.category === category);
  if (existing) return existing;
  if (keyword && entry.newMaterialForm) {
    return buildBatchInlineNewMaterialDraft(category, keyword, entry.newMaterialForm);
  }
  return null;
}

function buildEffectiveDraft(entry: InventoryBatchReceiveEntry, material?: InventoryMaterial | null) {
  const draft = entry.draft;
  return {
    ...draft,
    inboundUnit: draft.inboundUnit || (material ? resolveBatchReceiveUnit(material) : undefined),
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

function ExistingMaterialBrief({
  material,
  compact,
  withStockColumn = false
}: {
  material: InventoryMaterial;
  compact?: boolean;
  withStockColumn?: boolean;
}) {
  const profileSpecs = (inventoryCategoryFieldSpecs[material.category] || []).filter(
    (spec) => spec.requiredInBatchReceive
  );

  const renderReadonlyField = (label: string, value: string, key?: string) => (
    <div className="inventory-batch-field" key={key || label}>
      <FieldLabel>{label}</FieldLabel>
      <div className="inventory-batch-field-readonly">{value}</div>
    </div>
  );

  if (compact) {
    const coreFields = withStockColumn
      ? [
          { label: "物料名称(英文)", value: material.materialNameEn || "—" },
          { label: "品牌名称(中文)", value: material.brand },
          { label: "品牌名称(英文)", value: material.brandEn || "—" }
        ]
      : [
          { label: "物料名称(英文)", value: material.materialNameEn || "—" },
          { label: "品牌名称(中文)", value: material.brand },
          { label: "品牌名称(英文)", value: material.brandEn || "—" },
          { label: "核算单位", value: material.baseUnit }
        ];

    return (
      <>
        {coreFields.map((field) => renderReadonlyField(field.label, field.value))}
        {withStockColumn ? renderReadonlyField("核算单位", material.baseUnit) : null}
        {profileSpecs.map((spec) =>
          renderReadonlyField(spec.label, formatInventoryMaterialFieldValue(material, spec) || "—", String(spec.key))
        )}
      </>
    );
  }

  return (
    <div className="inventory-batch-material-brief">
      <div className="inventory-batch-entry-grid inventory-batch-entry-grid--6">
        {renderReadonlyField("物料名称(中文)", material.materialName)}
        {renderReadonlyField("物料名称(英文)", material.materialNameEn || "—")}
        {renderReadonlyField("品牌名称(中文)", material.brand)}
        {renderReadonlyField("品牌名称(英文)", material.brandEn || "—")}
        {renderReadonlyField("核算单位", material.baseUnit)}
        {profileSpecs.map((spec) =>
          renderReadonlyField(spec.label, formatInventoryMaterialFieldValue(material, spec) || "—", String(spec.key))
        )}
      </div>
    </div>
  );
}

function resolveBatchReceivePackageConversions(
  material: InventoryMaterial | null | undefined,
  newMaterialForm?: InventoryBatchNewMaterialForm | null
) {
  if (material?.packageConversions?.length) {
    return material.packageConversions;
  }
  if (newMaterialForm?.baseUnit) {
    return normalizeBatchPackageConversions(newMaterialForm.baseUnit, newMaterialForm.packageConversions || []);
  }
  return [];
}

type BatchReceiveEntryCardProps = {
  index: number;
  entry: InventoryBatchReceiveEntry;
  category: InventoryCategory;
  activeMaterials: InventoryMaterial[];
  materialOptions: Array<{ value: string; label: string; materialId?: string }>;
  summaries: InventorySummary[];
  canRemove: boolean;
  onChange: (entry: InventoryBatchReceiveEntry) => void;
  onRemove: () => void;
};

function BatchReceiveEntryCard({
  index,
  entry,
  category,
  activeMaterials,
  materialOptions,
  summaries,
  canRemove,
  onChange,
  onRemove
}: BatchReceiveEntryCardProps) {
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
  const effectiveDraft = buildEffectiveDraft(entry, effectiveMaterial);
  const packageConversions = resolveBatchReceivePackageConversions(effectiveMaterial, entry.newMaterialForm);
  const unitOptions = effectiveMaterial
    ? buildReceiveUnitOptions(effectiveMaterial.baseUnit, packageConversions)
    : entry.newMaterialForm?.baseUnit
      ? buildReceiveUnitOptions(entry.newMaterialForm.baseUnit, packageConversions)
      : [];
  const increasePreview = effectiveMaterial
    ? formatReceiveIncreasePreview(
        effectiveDraft.inboundQuantity,
        effectiveDraft.inboundUnit || effectiveMaterial.baseUnit,
        effectiveMaterial.baseUnit,
        packageConversions
      )
    : "";
  const duplicateCandidates =
    keyword && !selectedMaterial
      ? activeMaterials
          .filter(
            (item) =>
              item.category === category &&
              item.materialName !== keyword &&
              (item.materialName.includes(keyword) || keyword.includes(item.materialName))
          )
          .slice(0, 4)
      : [];
  const summary = selectedMaterial ? summaries.find((item) => item.materialId === selectedMaterial.id) : undefined;
  const inlineValidationMessage =
    isCreatingNew && entry.newMaterialForm
      ? validateBatchInlineNewMaterial(category, keyword, entry.newMaterialForm)
      : null;
  const packageValidationMessage =
    isCreatingNew && entry.newMaterialForm?.baseUnit
      ? validateBatchReceivePackageSpec(
          entry.newMaterialForm.baseUnit,
          normalizeBatchPackageConversions(entry.newMaterialForm.baseUnit, entry.newMaterialForm.packageConversions || [])
        )
      : null;
  const hasQuantity = typeof effectiveDraft.inboundQuantity === "number" && effectiveDraft.inboundQuantity > 0;
  const isReady = Boolean(
    effectiveMaterial &&
      !inlineValidationMessage &&
      !packageValidationMessage &&
      hasQuantity &&
      effectiveDraft.expiryDate &&
      effectiveDraft.unitPrice !== undefined &&
      Number(effectiveDraft.unitPrice) >= 0 &&
      effectiveDraft.supplier &&
      effectiveDraft.storageLocation?.trim()
  );
  const showFormSections = Boolean(keyword);
  const optionalHint = getBatchReceiveOptionalFieldHint(category);

  const patchDraft = (patch: InventoryBatchReceiveDraft) => {
    onChange({ ...entry, draft: { ...entry.draft, ...patch } });
  };

  const patchNewMaterialForm = (patch: Partial<InventoryBatchNewMaterialForm>) => {
    if (!entry.newMaterialForm) return;
    onChange({ ...entry, newMaterialForm: { ...entry.newMaterialForm, ...patch } });
  };

  const selectMaterial = (material: InventoryMaterial) => {
    onChange({
      ...entry,
      materialKeyword: material.materialName,
      materialId: material.id,
      newMaterialForm: null,
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
      draft: entry.draft
    });
  };

  return (
    <div className={`inventory-batch-entry-card${isReady ? " is-ready" : hasQuantity || keyword ? " is-partial" : ""}`}>
      <div className="inventory-batch-entry-card__head">
        <div className="inventory-batch-entry-card__title">
          <strong>入库物料 {index + 1}</strong>
          {selectedMaterial ? <Tag color="blue">{selectedMaterial.category}</Tag> : null}
          {isCreatingNew ? <Tag color="green">新建</Tag> : null}
          {inlineDraft?.profileIncomplete ? <Tag color="gold">资料待完善</Tag> : null}
          {hasQuantity && !isReady ? <Tag color="orange">待补齐</Tag> : null}
          {isReady ? <Tag color="success">可提交</Tag> : null}
        </div>
        {canRemove ? (
          <Button type="text" danger icon={<DeleteOutlined />} onClick={onRemove}>
            移除
          </Button>
        ) : null}
      </div>

      <div className="inventory-batch-entry-block inventory-batch-entry-block--compact">
        <div className="inventory-batch-entry-block__title">物料信息</div>
        <div className="inventory-batch-entry-grid inventory-batch-entry-grid--6">
        <div className="inventory-batch-field">
          <FieldLabel required>物料名称(中文)</FieldLabel>
          <AutoComplete
            size="small"
            value={entry.materialKeyword}
            options={materialOptions.filter((option) => {
              const material = activeMaterials.find((item) => item.id === option.materialId);
              return material ? material.category === category : true;
            })}
            placeholder={`搜索或输入${category}物料名称`}
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
        </div>

        {selectedMaterial ? (
          <>
            {summary ? (
              <div className="inventory-batch-field">
                <FieldLabel>当前库存</FieldLabel>
                <div className="inventory-batch-field-readonly">
                  {formatInventoryQty(summary.currentStockBase, selectedMaterial.baseUnit)}
                </div>
              </div>
            ) : null}
            <ExistingMaterialBrief material={selectedMaterial} compact withStockColumn={Boolean(summary)} />
          </>
        ) : null}

        {isCreatingNew && entry.newMaterialForm ? (
          <BatchReceiveInlineNewMaterial
            key={`${entry.id}-${category}-${keyword}-material`}
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
        ) : null}
        </div>
      </div>

      {duplicateCandidates.length ? (
        <div className="inventory-receive-dup inventory-batch-entry-dup">
          <Text type="secondary">可能是这些已有物料：</Text>
          <Space wrap size={4}>
            {duplicateCandidates.map((candidate) => (
              <Button key={candidate.id} size="small" onClick={() => selectMaterial(candidate)}>
                {candidate.materialName} · {candidate.brand}
              </Button>
            ))}
          </Space>
        </div>
      ) : null}

      {showFormSections ? (
        <div className="inventory-batch-entry-block inventory-batch-entry-block--compact">
          <div className="inventory-batch-entry-block__title">采购信息</div>
          <div className="inventory-batch-entry-grid inventory-batch-entry-grid--6">
            <div className="inventory-batch-field">
              <FieldLabel required>入库数量</FieldLabel>
              <InputNumber
                size="small"
                min={0.01}
                value={effectiveDraft.inboundQuantity}
                placeholder="数量"
                style={{ width: "100%" }}
                onChange={(value) => patchDraft({ inboundQuantity: typeof value === "number" ? value : undefined })}
              />
            </div>
            <div className="inventory-batch-field">
              <FieldLabel required>单位</FieldLabel>
              <Select
                size="small"
                value={effectiveDraft.inboundUnit}
                options={unitOptions}
                placeholder="单位"
                style={{ width: "100%" }}
                disabled={!unitOptions.length}
                onChange={(value) => patchDraft({ inboundUnit: value })}
              />
            </div>
            <div className="inventory-batch-field">
              <FieldLabel required>到期日期</FieldLabel>
              <Input
                size="small"
                value={effectiveDraft.expiryDate}
                placeholder="2026-12-31"
                onChange={(event) => patchDraft({ expiryDate: event.target.value })}
              />
            </div>
            <div className="inventory-batch-field">
              <FieldLabel required>总进货价（元）</FieldLabel>
              <InputNumber
                size="small"
                min={0}
                value={effectiveDraft.unitPrice}
                placeholder="金额"
                style={{ width: "100%" }}
                onChange={(value) => patchDraft({ unitPrice: typeof value === "number" ? value : undefined })}
              />
            </div>
            <div className="inventory-batch-field">
              <FieldLabel required>供应商</FieldLabel>
              <Input
                size="small"
                value={effectiveDraft.supplier}
                placeholder="供应商"
                onChange={(event) => patchDraft({ supplier: event.target.value })}
              />
            </div>
            <div className="inventory-batch-field">
              <FieldLabel required>存放位置</FieldLabel>
              <Input
                size="small"
                value={effectiveDraft.storageLocation}
                placeholder="存放位置"
                onChange={(event) => patchDraft({ storageLocation: event.target.value })}
              />
            </div>
            <div className="inventory-batch-field inventory-batch-field--span-6">
              <FieldLabel required>规格与包装</FieldLabel>
            {isCreatingNew && entry.newMaterialForm ? (
              <BatchReceivePackageField
                baseUnit={entry.newMaterialForm.baseUnit}
                value={entry.newMaterialForm.packageConversions || [{ fromUnit: undefined, quantity: undefined }]}
                editable
                showOptionalExtra
                onChange={(next) => patchNewMaterialForm({ packageConversions: next })}
              />
            ) : (
              <BatchReceivePackageField
                baseUnit={selectedMaterial?.baseUnit}
                readonlyConversions={packageConversions}
              />
            )}
            </div>
          </div>

          {increasePreview ? (
            <Text type="secondary" className="inventory-batch-entry-conversion">
              {increasePreview}
            </Text>
          ) : null}
        </div>
      ) : null}

      {showFormSections ? (
        <div className="inventory-batch-entry-card__optional">
          <button
            type="button"
            className="inventory-batch-entry-toggle"
            onClick={() => onChange({ ...entry, optionalExpanded: !entry.optionalExpanded })}
          >
            {entry.optionalExpanded ? <UpOutlined /> : <DownOutlined />}
            <span>{entry.optionalExpanded ? "收起选填项" : "展开选填项"}</span>
            <em>{optionalHint}</em>
          </button>

          {entry.optionalExpanded ? (
            <div className="inventory-batch-entry-card__section inventory-batch-entry-card__section--optional">
              <div className="inventory-batch-entry-grid inventory-batch-entry-grid--6">
              {isCreatingNew && entry.newMaterialForm ? (
                <BatchReceiveInlineNewMaterialOptional
                  key={`${entry.id}-${category}-optional`}
                  category={category}
                  value={entry.newMaterialForm}
                  onChange={(nextForm) => onChange({ ...entry, newMaterialForm: nextForm })}
                />
              ) : null}
                <div className="inventory-batch-field">
                  <FieldLabel>供应商电话</FieldLabel>
                  <Input
                    size="small"
                    value={effectiveDraft.supplierPhone}
                    placeholder="选填"
                    onChange={(event) => patchDraft({ supplierPhone: event.target.value })}
                  />
                </div>
                <div className="inventory-batch-field inventory-batch-field--span-2">
                  <FieldLabel>备注</FieldLabel>
                  <Input
                    size="small"
                    value={effectiveDraft.note}
                    placeholder="入库备注"
                    onChange={(event) => patchDraft({ note: event.target.value })}
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {(inlineValidationMessage || packageValidationMessage) &&
      (hasQuantity || entry.newMaterialForm?.brand || entry.newMaterialForm?.materialNameEn) ? (
        <Text type="danger" className="inventory-batch-entry-validation">
          {inlineValidationMessage || packageValidationMessage}
        </Text>
      ) : null}
    </div>
  );
}

export function BatchReceivePanel({
  category,
  onCategoryChange,
  entries,
  onEntriesChange,
  materials,
  summaries,
  onCancel,
  onClear,
  onSubmit,
  readyCount
}: BatchReceivePanelProps) {
  const activeMaterials = materials.filter((material) => getInventoryMaterialStatus(material) === "启用中");
  const materialOptions = getInventoryReceiveMaterialOptions(materials);

  const updateEntry = (entryId: string, nextEntry: InventoryBatchReceiveEntry) => {
    onEntriesChange(entries.map((entry) => (entry.id === entryId ? nextEntry : entry)));
  };

  const removeEntry = (entryId: string) => {
    if (entries.length <= 1) {
      onEntriesChange([createEmptyBatchReceiveEntry()]);
      return;
    }
    onEntriesChange(entries.filter((entry) => entry.id !== entryId));
  };

  const handleCategoryChange = (nextCategory: InventoryCategory) => {
    onCategoryChange(nextCategory);
    onEntriesChange(
      entries.map((entry) => ({
        ...createEmptyBatchReceiveEntry(),
        id: entry.id
      }))
    );
  };

  return (
    <Card className="inventory-console-card inventory-batch-receive-card">
      <div className="inventory-batch-receive-head">
        <div className="inventory-batch-receive-head__main">
          <div className="inventory-batch-receive-tabs" aria-label="批量入库分类">
            {inventoryCategoryOrder.map((item) => (
              <button
                key={item}
                type="button"
                className={`inventory-action-filter${category === item ? " is-active" : ""}`}
                onClick={() => handleCategoryChange(item)}
              >
                <span>{item}</span>
              </button>
            ))}
          </div>
          <Text type="secondary">请先选择物料分类，再在下方卡片中搜索或输入物料名称。</Text>
        </div>
      </div>

      <Alert
        showIcon
        type="info"
        className="inventory-batch-receive-tip"
        message="库内已有物料直接选用；搜不到时会在卡片内展开新建字段，无需再点按钮打开弹窗。"
      />

      <div className="inventory-batch-entry-list">
        {entries.map((entry, index) => (
          <BatchReceiveEntryCard
            key={entry.id}
            index={index}
            entry={entry}
            category={category}
            activeMaterials={activeMaterials}
            materialOptions={materialOptions}
            summaries={summaries}
            canRemove={entries.length > 1}
            onChange={(nextEntry) => updateEntry(entry.id, nextEntry)}
            onRemove={() => removeEntry(entry.id)}
          />
        ))}
      </div>

      <Button
        type="dashed"
        block
        icon={<PlusOutlined />}
        className="inventory-batch-entry-add"
        onClick={() => onEntriesChange([...entries, createEmptyBatchReceiveEntry()])}
      >
        添加入库物料
      </Button>

      <div className="inventory-stocktake-footer">
        <Button onClick={onCancel}>取消</Button>
        <Button onClick={onClear}>清空填写</Button>
        <Button
          type="primary"
          className="inventory-batch-receive-submit"
          disabled={!readyCount}
          onClick={onSubmit}
        >
          确认入库{readyCount ? `（${readyCount}）` : ""}
        </Button>
      </div>
    </Card>
  );
}

export function resolveBatchReceiveEntryMaterial(
  entry: InventoryBatchReceiveEntry,
  materials: InventoryMaterial[],
  category: InventoryCategory
) {
  const activeMaterials = materials.filter((material) => getInventoryMaterialStatus(material) === "启用中");
  return resolveEntryMaterial(entry, activeMaterials, category);
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
  category: InventoryCategory
) {
  const material = resolveBatchReceiveEntryMaterial(entry, materials, category);
  const draft = buildBatchReceiveEntryEffectiveDraft(entry, material);
  const hasQuantity = typeof draft.inboundQuantity === "number" && draft.inboundQuantity > 0;
  const inlineError =
    entry.newMaterialForm && !entry.materialId
      ? validateBatchInlineNewMaterial(category, entry.materialKeyword, entry.newMaterialForm)
      : null;
  const packageError =
    entry.newMaterialForm && !entry.materialId && entry.newMaterialForm.baseUnit
      ? validateBatchReceivePackageSpec(
          entry.newMaterialForm.baseUnit,
          normalizeBatchPackageConversions(entry.newMaterialForm.baseUnit, entry.newMaterialForm.packageConversions || [])
        )
      : null;
  return Boolean(
    material &&
      !inlineError &&
      !packageError &&
      hasQuantity &&
      draft.expiryDate &&
      draft.unitPrice !== undefined &&
      Number(draft.unitPrice) >= 0 &&
      draft.supplier &&
      draft.storageLocation?.trim()
  );
}

export function isBatchReceiveEntrySubmitting(entry: InventoryBatchReceiveEntry) {
  return typeof entry.draft.inboundQuantity === "number" && entry.draft.inboundQuantity > 0;
}
