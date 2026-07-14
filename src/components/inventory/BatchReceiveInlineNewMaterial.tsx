import { Button, Form, Input, InputNumber, Select } from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { useEffect } from "react";
import { MaterialProfileFields, MedicineProfileSelectors } from "./MaterialProfileFields";
import {
  createDefaultBatchPackageConversionDrafts,
  type InventoryBatchNewMaterialForm,
  type InventoryBatchPackageConversionDraft,
  inventoryUnitOptions,
  type InventoryCategory
} from "./inventoryData";

const inventoryUnitSelectOptions = inventoryUnitOptions.map((unit) => ({
  label: unit === "L" ? "L（升）" : unit,
  value: unit
}));

function ensureBatchConversionDrafts(
  category: InventoryCategory,
  baseUnit?: string,
  drafts: InventoryBatchPackageConversionDraft[] = []
) {
  if (!drafts.length) return createDefaultBatchPackageConversionDrafts(category, baseUnit);
  const nextDrafts = drafts.map((draft) => ({ ...draft, toUnit: draft.toUnit || baseUnit }));
  if (
    category === "饲料" &&
    !nextDrafts.some((draft) => draft.fromUnit === "吨" && draft.toUnit === "L")
  ) {
    nextDrafts.push({ fromUnit: "吨", quantity: undefined, toUnit: "L" });
  }
  return nextDrafts;
}

function BatchReceiveUnitConversionFields({
  category,
  value,
  onChange
}: {
  category: InventoryCategory;
  value: InventoryBatchNewMaterialForm;
  onChange: (next: InventoryBatchNewMaterialForm) => void;
}) {
  const baseUnit = value.baseUnit;
  const conversionDrafts = ensureBatchConversionDrafts(category, baseUnit, value.packageConversions || []);

  const updateConversions = (nextConversions: InventoryBatchPackageConversionDraft[]) => {
    onChange({ ...value, packageConversions: nextConversions });
  };

  const patchConversion = (
    index: number,
    key: keyof InventoryBatchPackageConversionDraft,
    nextValue: string | number | undefined
  ) => {
    updateConversions(
      conversionDrafts.map((conversion, conversionIndex) =>
        conversionIndex === index ? { ...conversion, [key]: nextValue } : conversion
      )
    );
  };

  const addConversion = () => {
    updateConversions([...conversionDrafts, { fromUnit: undefined, quantity: undefined, toUnit: baseUnit }]);
  };

  const removeConversion = (index: number) => {
    updateConversions(conversionDrafts.filter((_, conversionIndex) => conversionIndex !== index));
  };

  return (
    <div className="inventory-batch-unit-conversion inventory-batch-field--span-2">
      <div className="inventory-batch-unit-conversion__head">
        <span>
          <span className="inventory-batch-field-required">*</span>
          单位换算
        </span>
        <em>{category === "饲料" ? "饲料必须填写 1吨 = xxL" : "至少填写一条换算规则"}</em>
      </div>
      <div className="inventory-batch-unit-conversion__rows">
        {conversionDrafts.map((conversion, index) => {
          const feedTonToLiter = category === "饲料" && conversion.fromUnit === "吨" && conversion.toUnit === "L";
          return (
            <div className="inventory-batch-unit-conversion__row" key={`${index}-${conversion.fromUnit || "from"}`}>
              <span>1</span>
              <Select
                size="small"
                value={conversion.fromUnit}
                disabled={feedTonToLiter}
                placeholder="单位"
                options={inventoryUnitSelectOptions}
                onChange={(nextUnit) => patchConversion(index, "fromUnit", nextUnit)}
              />
              <span>=</span>
              <InputNumber
                size="small"
                min={0.0001}
                precision={4}
                value={conversion.quantity}
                placeholder="数量"
                style={{ width: "100%" }}
                onChange={(nextQuantity) =>
                  patchConversion(index, "quantity", typeof nextQuantity === "number" ? nextQuantity : undefined)
                }
              />
              <Select
                size="small"
                value={conversion.toUnit}
                disabled={feedTonToLiter}
                placeholder={baseUnit || "单位"}
                options={inventoryUnitSelectOptions}
                onChange={(nextUnit) => patchConversion(index, "toUnit", nextUnit)}
              />
              <Button
                type="text"
                size="small"
                aria-label="删除单位换算"
                icon={<DeleteOutlined />}
                disabled={feedTonToLiter}
                onClick={() => removeConversion(index)}
              />
            </div>
          );
        })}
      </div>
      <Button type="link" size="small" icon={<PlusOutlined />} onClick={addConversion}>
        增加换算规则
      </Button>
    </div>
  );
}

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

  useEffect(() => {
    form.setFieldsValue(value as Parameters<typeof form.setFieldsValue>[0]);
  }, [form, value]);

  return (
    <Form
      form={form}
      layout="vertical"
      className="inventory-batch-new-material__form inventory-batch-new-material__form--grid"
      initialValues={value}
      onValuesChange={(changedValues, allValues) => {
        const nextBaseUnit = allValues.baseUnit || value.baseUnit;
        const nextPackageConversions =
          "baseUnit" in changedValues
            ? ensureBatchConversionDrafts(category, nextBaseUnit, value.packageConversions || []).map((conversion) =>
                conversion.toUnit && conversion.toUnit !== value.baseUnit
                  ? conversion
                  : { ...conversion, toUnit: nextBaseUnit }
              )
            : value.packageConversions;
        onChange({
          ...value,
          ...allValues,
          packageConversions: nextPackageConversions,
          optionalExpanded: value.optionalExpanded
        });
      }}
    >
      <Form.Item
        name="brand"
        className="inventory-batch-field-grid-item"
        label="品牌名称(中文)"
        rules={[{ required: true, message: "请输入中文品牌名" }]}
      >
        <Input size="small" placeholder="品牌" />
      </Form.Item>
      <Form.Item
        name="baseUnit"
        className="inventory-batch-field-grid-item"
        label="单位"
        rules={[{ required: true, message: "请选择单位" }]}
      >
        <Select
          size="small"
          placeholder="单位"
          options={inventoryUnitSelectOptions}
        />
      </Form.Item>
      <BatchReceiveUnitConversionFields category={category} value={value} onChange={onChange} />

      {category === "药品" ? <MedicineProfileSelectors compact required /> : null}

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

  useEffect(() => {
    form.setFieldsValue(value as Parameters<typeof form.setFieldsValue>[0]);
  }, [form, value]);

  return (
    <Form
      form={form}
      layout="vertical"
      className="inventory-batch-new-material__form inventory-batch-new-material__form--grid inventory-batch-new-material__form--optional"
      initialValues={value}
      onValuesChange={(_, allValues) => onChange({ ...value, ...allValues, optionalExpanded: value.optionalExpanded })}
    >
      <Form.Item
        name="materialNameEn"
        className="inventory-batch-field-grid-item"
        label="物料名称(英文)"
      >
        <Input size="small" placeholder="English name" />
      </Form.Item>
      <Form.Item
        name="brandEn"
        className="inventory-batch-field-grid-item"
        label="品牌名称(英文)"
      >
        <Input size="small" placeholder="Brand EN" />
      </Form.Item>
      <MaterialProfileFields category={category} requiredMode="batch" fieldScope="optional" layout="gridInline" compact />
      <Form.Item name="materialNote" className="inventory-batch-field-grid-item inventory-batch-field--span-2" label="物料备注">
        <Input.TextArea size="small" rows={1} placeholder="选填，仅写入物料档案" />
      </Form.Item>
    </Form>
  );
}
