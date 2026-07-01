import { Button, Form, InputNumber, Select, Tag, Typography } from "antd";
import {
  inventoryUnitOptions,
  type InventoryBatchPackageConversionDraft,
  type InventoryPackageConversion
} from "./inventoryData";

const { Text } = Typography;

type BatchReceivePackageFieldProps = {
  baseUnit?: string;
  value?: InventoryBatchPackageConversionDraft[];
  readonlyConversions?: InventoryPackageConversion[];
  editable?: boolean;
  onChange?: (next: InventoryBatchPackageConversionDraft[]) => void;
  showOptionalExtra?: boolean;
};

function formatPackageSummary(conversions: InventoryPackageConversion[]) {
  return conversions.map((conversion) => `1${conversion.fromUnit} = ${conversion.quantity}${conversion.toUnit}`);
}

export function BatchReceivePackageField({
  baseUnit,
  value = [],
  readonlyConversions = [],
  editable = false,
  onChange,
  showOptionalExtra = false
}: BatchReceivePackageFieldProps) {
  if (!editable) {
    return (
      <div className="inventory-batch-entry-package">
        <div className="inventory-package-summary">
          {readonlyConversions.length ? (
            formatPackageSummary(readonlyConversions).map((item) => <Tag key={item}>{item}</Tag>)
          ) : baseUnit ? (
            <Tag>{`1${baseUnit}`}</Tag>
          ) : (
            <Text type="secondary">暂无包装规格，入库数量将按核算单位填写。</Text>
          )}
        </div>
      </div>
    );
  }

  const drafts = value.length ? value : [{ fromUnit: undefined, quantity: undefined }];

  const patchDrafts = (next: InventoryBatchPackageConversionDraft[]) => {
    onChange?.(next);
  };

  return (
    <div className="inventory-batch-entry-package">
      <div className="inventory-package-spec inventory-batch-package-spec">
        {drafts.map((draft, index) => {
          const toUnit = index === 0 ? baseUnit || "核算单位" : drafts[index - 1]?.fromUnit || "下一级单位";
          return (
            <div className="inventory-package-row" key={`package-${index}`}>
              <span>1</span>
              <Select
                placeholder="包装单位"
                value={draft.fromUnit}
                options={inventoryUnitOptions.map((unit) => ({ label: unit, value: unit }))}
                onChange={(fromUnit) => {
                  const next = drafts.map((item, itemIndex) => (itemIndex === index ? { ...item, fromUnit } : item));
                  patchDrafts(next);
                }}
              />
              <span>=</span>
              <InputNumber
                min={0.01}
                placeholder="数量"
                style={{ width: "100%" }}
                value={draft.quantity}
                onChange={(quantity) => {
                  const next = drafts.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, quantity: typeof quantity === "number" ? quantity : undefined } : item
                  );
                  patchDrafts(next);
                }}
              />
              <span className="inventory-package-row__unit">{toUnit}</span>
              {showOptionalExtra && drafts.length > 1 ? (
                <Button type="text" onClick={() => patchDrafts(drafts.filter((_, itemIndex) => itemIndex !== index))}>
                  删除
                </Button>
              ) : null}
            </div>
          );
        })}
        {showOptionalExtra ? (
          <Button
            type="link"
            disabled={!baseUnit}
            onClick={() => patchDrafts([...drafts, { fromUnit: undefined, quantity: undefined }])}
          >
            + 添加上级包装
          </Button>
        ) : null}
      </div>
    </div>
  );
}

/** Form-integrated variant for inline new material forms */
export function BatchReceivePackageFormList({
  baseUnit,
  showOptionalExtra = false
}: {
  baseUnit?: string;
  showOptionalExtra?: boolean;
}) {
  const packageDrafts = (Form.useWatch("packageConversions") || []) as InventoryBatchPackageConversionDraft[];

  return (
    <Form.List name="packageConversions">
      {(fields, { add, remove }) => (
        <div className="inventory-package-spec inventory-batch-package-spec">
          {fields.map((field, index) => {
            const toUnit =
              index === 0 ? baseUnit || "核算单位" : packageDrafts[index - 1]?.fromUnit || "下一级单位";
            const { key, ...fieldProps } = field;
            return (
              <div className="inventory-package-row" key={key}>
                <span>1</span>
                <Form.Item {...fieldProps} name={[field.name, "fromUnit"]} noStyle>
                  <Select
                    placeholder="包装单位"
                    options={inventoryUnitOptions.map((unit) => ({ label: unit, value: unit }))}
                  />
                </Form.Item>
                <span>=</span>
                <Form.Item {...fieldProps} name={[field.name, "quantity"]} noStyle>
                  <InputNumber min={0.01} placeholder="数量" style={{ width: "100%" }} />
                </Form.Item>
                <span className="inventory-package-row__unit">{toUnit}</span>
                {showOptionalExtra && fields.length > 1 ? (
                  <Button type="text" onClick={() => remove(field.name)}>
                    删除
                  </Button>
                ) : null}
              </div>
            );
          })}
          {showOptionalExtra ? (
            <Button type="link" disabled={!baseUnit} onClick={() => add({ fromUnit: undefined, quantity: undefined })}>
              + 添加上级包装
            </Button>
          ) : null}
        </div>
      )}
    </Form.List>
  );
}
