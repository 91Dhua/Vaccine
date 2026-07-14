import { Form, Input, InputNumber, Select } from "antd";
import {
  getMaterialProfileFieldSpecs,
  inventoryMedicineClassOptions,
  type InventoryCategory,
  type InventoryMaterialFieldSpec,
  type InventoryMedicineClass
} from "./inventoryData";

function renderFieldControl(spec: InventoryMaterialFieldSpec, compact?: boolean) {
  if (spec.type === "number") {
    return <InputNumber size={compact ? "small" : undefined} min={0} style={{ width: "100%" }} placeholder={spec.placeholder} />;
  }
  if (spec.type === "select") {
    return (
      <Select
        size={compact ? "small" : undefined}
        allowClear
        placeholder={spec.placeholder || `请选择${spec.label}`}
        options={(spec.options || []).map((option) => ({ label: option, value: option }))}
      />
    );
  }
  if (spec.type === "multiSelect") {
    return (
      <Select
        size={compact ? "small" : undefined}
        mode="multiple"
        allowClear
        placeholder={spec.placeholder || `请选择${spec.label}`}
        options={(spec.options || []).map((option) => ({ label: option, value: option }))}
      />
    );
  }
  return <Input size={compact ? "small" : undefined} placeholder={spec.placeholder} />;
}

export function MedicineProfileSelectors({
  compact = false,
  required = true
}: {
  compact?: boolean;
  required?: boolean;
}) {
  return (
    <Form.Item
      name="medicineClass"
      label="药品分类"
      className="inventory-batch-field-grid-item"
      rules={required ? [{ required: true, message: "请选择药品分类" }] : undefined}
    >
      <Select
        size={compact ? "small" : undefined}
        placeholder="疫苗 / 兽药 / 保健品"
        options={inventoryMedicineClassOptions.map((option) => ({ label: option, value: option }))}
      />
    </Form.Item>
  );
}

/**
 * 分类专属字段渲染器：物料管理新增/编辑与入库快建复用同一套字段定义。
 * - requiredMode = "catalog"：按物料管理完整档案口径，spec.required 字段必填。
 * - requiredMode = "quick"：入库快建口径，默认专属字段选填；标记 requiredInQuick 的字段仍必填。
 * - requiredMode = "batch"：入库口径，标记 requiredInBatchReceive 的字段必填。
 */
export function MaterialProfileFields({
  category,
  medicineClass,
  requiredMode = "catalog",
  fieldScope = "all",
  layout = "stack",
  compact = false
}: {
  category: InventoryCategory;
  medicineClass?: InventoryMedicineClass;
  requiredMode?: "catalog" | "quick" | "batch";
  fieldScope?: "all" | "required" | "optional";
  layout?: "stack" | "grid" | "gridInline";
  compact?: boolean;
}) {
  const watchedMedicineClass = Form.useWatch("medicineClass") as InventoryMedicineClass | undefined;
  const resolvedClass = category === "药品" ? medicineClass || watchedMedicineClass : undefined;
  const specs = getMaterialProfileFieldSpecs(category, resolvedClass).filter((spec) => {
    const isRequired =
      (requiredMode === "catalog" && spec.required) ||
      (requiredMode === "quick" && spec.requiredInQuick) ||
      (requiredMode === "batch" && spec.requiredInBatchReceive);
    if (fieldScope === "required") return isRequired;
    if (fieldScope === "optional") return !isRequired;
    return true;
  });
  if (specs.length === 0) return null;

  const resolveRequired = (spec: InventoryMaterialFieldSpec) =>
    (requiredMode === "catalog" && spec.required) ||
    (requiredMode === "quick" && spec.requiredInQuick) ||
    (requiredMode === "batch" && spec.requiredInBatchReceive);

  const content = specs.map((spec) => {
    const required = resolveRequired(spec);
    return (
      <Form.Item
        key={String(spec.key)}
        name={String(spec.key)}
        className="inventory-batch-field-grid-item"
        label={spec.label}
        rules={required ? [{ required: true, message: `请填写${spec.label}` }] : undefined}
      >
        {renderFieldControl(spec, compact)}
      </Form.Item>
    );
  });

  if (layout === "gridInline") {
    return <>{content}</>;
  }
  if (layout === "grid") {
    return (
      <div className="inventory-batch-entry-grid inventory-batch-entry-grid--6 material-profile-fields-grid">{content}</div>
    );
  }
  return <>{content}</>;
}
