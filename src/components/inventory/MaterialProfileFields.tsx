import { Button, Form, Input, InputNumber, Select, Space } from "antd";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import {
  inventoryCategoryFieldSpecs,
  inventoryProductionPhaseOptions,
  type InventoryCategory,
  type InventoryMaterialFieldSpec
} from "./inventoryData";

function renderFieldControl(spec: InventoryMaterialFieldSpec) {
  if (spec.type === "number") {
    return <InputNumber min={0} style={{ width: "100%" }} placeholder={spec.placeholder} />;
  }
  if (spec.type === "select") {
    return (
      <Select
        allowClear
        placeholder={spec.placeholder || `请选择${spec.label}`}
        options={(spec.options || []).map((option) => ({ label: option, value: option }))}
      />
    );
  }
  if (spec.type === "multiSelect") {
    return (
      <Select
        mode="multiple"
        allowClear
        placeholder={spec.placeholder || `请选择${spec.label}`}
        options={(spec.options || []).map((option) => ({ label: option, value: option }))}
      />
    );
  }
  return <Input placeholder={spec.placeholder} />;
}

function FeedStagesField({ name, label, required }: { name: string; label: string; required: boolean }) {
  return (
    <Form.Item
      label={label}
      className="material-feed-stage-field"
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
              <Space key={field.key} align="baseline" className="material-feed-stage-row">
                <Form.Item
                  name={[field.name, "phase"]}
                  rules={[{ required: true, message: "请选择生产状态" }]}
                  noStyle
                >
                  <Select
                    placeholder="生产状态"
                    style={{ width: 130 }}
                    options={inventoryProductionPhaseOptions.map((phase) => ({ label: phase, value: phase }))}
                  />
                </Form.Item>
                <Form.Item
                  name={[field.name, "startDay"]}
                  rules={[{ required: true, message: "请输入起始天" }]}
                  noStyle
                >
                  <InputNumber min={0} placeholder="起始天" style={{ width: 96 }} />
                </Form.Item>
                <span className="material-feed-stage-sep">至</span>
                <Form.Item
                  name={[field.name, "endDay"]}
                  rules={[{ required: true, message: "请输入结束天" }]}
                  noStyle
                >
                  <InputNumber min={0} placeholder="结束天" style={{ width: 96 }} />
                </Form.Item>
                <MinusCircleOutlined onClick={() => remove(field.name)} />
              </Space>
            ))}
            <Button type="dashed" onClick={() => add({})} icon={<PlusOutlined />} block>
              添加适用阶段（如 妊娠期 15-36天）
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
 */
export function MaterialProfileFields({
  category,
  requiredMode = "catalog"
}: {
  category: InventoryCategory;
  requiredMode?: "catalog" | "quick";
}) {
  const specs = inventoryCategoryFieldSpecs[category] || [];
  if (specs.length === 0) return null;
  return (
    <>
      {specs.map((spec) => {
        const required =
          (requiredMode === "catalog" && spec.required) ||
          (requiredMode === "quick" && spec.requiredInQuick);
        if (spec.type === "feedStages") {
          return <FeedStagesField key={String(spec.key)} name={String(spec.key)} label={spec.label} required={Boolean(required)} />;
        }
        return (
          <Form.Item
            key={String(spec.key)}
            name={String(spec.key)}
            label={spec.label}
            rules={required ? [{ required: true, message: `请填写${spec.label}` }] : undefined}
          >
            {renderFieldControl(spec)}
          </Form.Item>
        );
      })}
    </>
  );
}
