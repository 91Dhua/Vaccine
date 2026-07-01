import { Form, Input, Select } from "antd";
import { MaterialProfileFields } from "./MaterialProfileFields";
import {
  inventoryCategoryBaseUnitRecommendations,
  inventoryUnitOptions,
  type InventoryBatchNewMaterialForm,
  type InventoryCategory
} from "./inventoryData";

export function BatchReceiveInlineNewMaterial({
  category,
  value,
  onChange
}: {
  category: InventoryCategory;
  value: InventoryBatchNewMaterialForm;
  onChange: (next: InventoryBatchNewMaterialForm) => void;
}) {
  const [form] = Form.useForm<InventoryBatchNewMaterialForm>();

  return (
    <Form
      form={form}
      layout="vertical"
      className="inventory-batch-new-material__form inventory-batch-new-material__form--grid"
      initialValues={value}
      onValuesChange={(_, allValues) => onChange({ ...value, ...allValues, optionalExpanded: value.optionalExpanded })}
    >
      <Form.Item
        name="materialNameEn"
        className="inventory-batch-field-grid-item"
        label="物料名称(英文)"
        rules={[{ required: true, message: "请输入英文物料名" }]}
      >
        <Input size="small" placeholder="English name" />
      </Form.Item>
      <Form.Item
        name="brand"
        className="inventory-batch-field-grid-item"
        label="品牌名称(中文)"
        rules={[{ required: true, message: "请输入中文品牌名" }]}
      >
        <Input size="small" placeholder="品牌" />
      </Form.Item>
      <Form.Item
        name="brandEn"
        className="inventory-batch-field-grid-item"
        label="品牌名称(英文)"
        rules={[{ required: true, message: "请输入英文品牌名" }]}
      >
        <Input size="small" placeholder="Brand EN" />
      </Form.Item>
      <Form.Item
        name="baseUnit"
        className="inventory-batch-field-grid-item"
        label="核算单位"
        rules={[{ required: true, message: "请选择核算单位" }]}
      >
        <Select
          size="small"
          showSearch
          placeholder="单位"
          options={inventoryUnitOptions.map((unit) => ({ label: unit, value: unit }))}
          onChange={(nextUnit) => {
            const recommended = inventoryCategoryBaseUnitRecommendations[category]?.[0];
            if (nextUnit === recommended) {
              form.setFieldValue("packageConversions", [{ fromUnit: undefined, quantity: undefined }]);
            }
          }}
        />
      </Form.Item>

      <MaterialProfileFields category={category} requiredMode="batch" fieldScope="required" layout="gridInline" compact />
    </Form>
  );
}

export function BatchReceiveInlineNewMaterialOptional({
  category,
  value,
  onChange
}: {
  category: InventoryCategory;
  value: InventoryBatchNewMaterialForm;
  onChange: (next: InventoryBatchNewMaterialForm) => void;
}) {
  const [form] = Form.useForm<InventoryBatchNewMaterialForm>();

  return (
    <Form
      form={form}
      layout="vertical"
      className="inventory-batch-new-material__form inventory-batch-new-material__form--grid inventory-batch-new-material__form--optional"
      initialValues={value}
      onValuesChange={(_, allValues) => onChange({ ...value, ...allValues, optionalExpanded: value.optionalExpanded })}
    >
      <MaterialProfileFields category={category} requiredMode="batch" fieldScope="optional" layout="gridInline" compact />
      <Form.Item name="materialNote" className="inventory-batch-field-grid-item inventory-batch-field--span-2" label="物料备注">
        <Input.TextArea size="small" rows={1} placeholder="选填，仅写入物料档案" />
      </Form.Item>
    </Form>
  );
}
