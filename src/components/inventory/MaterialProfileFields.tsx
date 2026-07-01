import { Button, Form, Input, InputNumber, Select, Space } from "antd";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import {
  inventoryCategoryFieldSpecs,
  inventoryPigTypeOptions,
  inventoryProductionPhaseOptions,
  type InventoryCategory,
  type InventoryMaterialFieldSpec
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

function FeedStagesField({
  name,
  label,
  required,
  compact = false
}: {
  name: string;
  label: string;
  required: boolean;
  compact?: boolean;
}) {
  return (
    <Form.Item
      label={label}
      className={`material-feed-stage-field${compact ? " material-feed-stage-field--compact" : ""}`}
      required={required}
    >
      <Form.List
        name={name}
        initialValue={[{}]}
        rules={
          required
            ? [
                {
                  validator: async (_, value) => {
                    if (!value || value.length === 0) {
                      throw new Error(`请填写${label}`);
                    }
                  }
                }
              ]
            : undefined
        }
      >
        {(fields, { add, remove }, { errors }) => (
          <div className="material-feed-stage-list">
            {fields.map((field) => (
              <Space key={field.key} align="baseline" className="material-feed-stage-row" wrap>
                <Form.Item
                  name={[field.name, "pigType"]}
                  rules={[{ required: true, message: "请选择适用猪只" }]}
                  noStyle
                >
                  <Select
                    placeholder="适用猪只"
                    style={{ width: compact ? 120 : 140 }}
                    options={inventoryPigTypeOptions.map((pigType) => ({ label: pigType, value: pigType }))}
                  />
                </Form.Item>
                <Form.Item
                  name={[field.name, "phases"]}
                  rules={[{ required: true, message: "请选择适用阶段" }]}
                  noStyle
                >
                  <Select
                    mode="multiple"
                    allowClear
                    placeholder="适用阶段"
                    style={{ minWidth: compact ? 180 : 220 }}
                    options={inventoryProductionPhaseOptions.map((phase) => ({ label: phase, value: phase }))}
                  />
                </Form.Item>
                <MinusCircleOutlined onClick={() => remove(field.name)} />
              </Space>
            ))}
            <Button type="dashed" onClick={() => add({})} icon={<PlusOutlined />} block={!compact} size={compact ? "small" : "middle"}>
              添加适用对象
            </Button>
            <Form.ErrorList errors={errors} />
          </div>
        )}
      </Form.List>
    </Form.Item>
  );
}

/**
 * 分类专属字段渲染器：物料管理新增/编辑与入库快建复用同一套字段定义。
 * - requiredMode = "catalog"：按物料管理完整档案口径，spec.required 字段必填。
 * - requiredMode = "quick"：入库快建口径，默认专属字段选填；标记 requiredInQuick 的字段仍必填。
 * - requiredMode = "batch"：批量入库口径，标记 requiredInBatchReceive 的字段必填。
 */
export function MaterialProfileFields({
  category,
  requiredMode = "catalog",
  fieldScope = "all",
  layout = "stack",
  compact = false
}: {
  category: InventoryCategory;
  requiredMode?: "catalog" | "quick" | "batch";
  fieldScope?: "all" | "required" | "optional";
  layout?: "stack" | "grid" | "gridInline";
  compact?: boolean;
}) {
  const specs = (inventoryCategoryFieldSpecs[category] || []).filter((spec) => {
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
        if (spec.type === "feedStages") {
          return (
            <div
              key={String(spec.key)}
              className={`inventory-batch-field-grid-item material-profile-fields-grid__full${layout === "grid" || layout === "gridInline" ? "" : ""}`}
            >
              <FeedStagesField name={String(spec.key)} label={spec.label} required={Boolean(required)} compact={compact || layout === "gridInline"} />
            </div>
          );
        }
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
