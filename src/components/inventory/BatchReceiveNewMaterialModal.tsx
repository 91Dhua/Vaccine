import { Button, Form, Input, Modal, Select } from "antd";
import { DownOutlined, UpOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import { BatchReceiveInlineNewMaterial, BatchReceiveInlineNewMaterialOptional } from "./BatchReceiveInlineNewMaterial";
import {
  createDefaultBatchNewMaterialForm,
  getBatchReceiveOptionalFieldHint,
  inventoryCategoryOrder,
  validateBatchInlineNewMaterial,
  type InventoryBatchNewMaterialForm,
  type InventoryCategory
} from "./inventoryData";

export type BatchReceiveNewMaterialResult = {
  materialName: string;
  category: InventoryCategory;
  form: InventoryBatchNewMaterialForm;
};

type BatchReceiveNewMaterialModalProps = {
  open: boolean;
  initialName?: string;
  initialCategory?: InventoryCategory;
  onCancel: () => void;
  onConfirm: (result: BatchReceiveNewMaterialResult) => void;
};

export function BatchReceiveNewMaterialModal({
  open,
  initialName = "",
  initialCategory,
  onCancel,
  onConfirm
}: BatchReceiveNewMaterialModalProps) {
  const [materialName, setMaterialName] = useState(initialName);
  const [category, setCategory] = useState<InventoryCategory>(initialCategory || inventoryCategoryOrder[0]);
  const [formValue, setFormValue] = useState<InventoryBatchNewMaterialForm>(() =>
    createDefaultBatchNewMaterialForm(initialCategory || inventoryCategoryOrder[0])
  );
  const [optionalExpanded, setOptionalExpanded] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setMaterialName(initialName);
    const nextCategory = initialCategory || inventoryCategoryOrder[0];
    setCategory(nextCategory);
    setFormValue(createDefaultBatchNewMaterialForm(nextCategory));
    setOptionalExpanded(true);
    setErrorMessage(null);
  }, [initialCategory, initialName, open]);

  const handleCategoryChange = (nextCategory: InventoryCategory) => {
    setCategory(nextCategory);
    setFormValue(createDefaultBatchNewMaterialForm(nextCategory));
  };

  const handleConfirm = () => {
    const trimmedName = materialName.trim();
    if (!trimmedName) {
      setErrorMessage("请填写物料名称。");
      return;
    }
    const validationMessage = validateBatchInlineNewMaterial(category, trimmedName, formValue);
    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }
    onConfirm({ materialName: trimmedName, category, form: formValue });
  };

  const optionalHint = getBatchReceiveOptionalFieldHint(category);

  return (
    <Modal
      title="新建物料"
      open={open}
      width={760}
      destroyOnHidden
      className="inventory-batch-new-material-modal"
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button key="confirm" type="primary" onClick={handleConfirm}>
          保存并加入入库
        </Button>
      ]}
    >
      <p className="inventory-batch-new-material-modal__hint">
        仅填写物料基础档案，入库数量与金额在下方入库明细中填写。
      </p>
      <div className="inventory-batch-new-material-modal__grid">
        <Form.Item label="物料名称" required className="inventory-batch-field">
          <Input value={materialName} placeholder="物料名称" onChange={(event) => setMaterialName(event.target.value)} />
        </Form.Item>
        <Form.Item label="分类" required className="inventory-batch-field">
          <Select
            value={category}
            options={inventoryCategoryOrder.map((item) => ({ label: item, value: item }))}
            onChange={handleCategoryChange}
          />
        </Form.Item>
      </div>

      <BatchReceiveInlineNewMaterial category={category} value={formValue} onChange={setFormValue} />

      {optionalExpanded ? (
        <BatchReceiveInlineNewMaterialOptional category={category} value={formValue} onChange={setFormValue} />
      ) : null}

      <button
        type="button"
        className="inventory-batch-entry-toggle inventory-batch-new-material-modal__toggle"
        onClick={() => setOptionalExpanded((prev) => !prev)}
      >
        {optionalExpanded ? <UpOutlined /> : <DownOutlined />}
        <span>{optionalExpanded ? "收起选填项" : "展开选填项"}</span>
        <em>{optionalHint}</em>
      </button>

      {errorMessage ? <p className="inventory-batch-new-material-modal__error">{errorMessage}</p> : null}
    </Modal>
  );
}
