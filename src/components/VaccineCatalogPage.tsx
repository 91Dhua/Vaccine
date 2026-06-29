import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  Upload
} from "antd";
import {
  CloudUploadOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  UploadOutlined
} from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import { MaterialProfileFields } from "./inventory/MaterialProfileFields";
import {
  formatInventoryMaterialFieldValue,
  generateInventoryMaterialCode,
  inventoryCategoryBaseUnitRecommendations,
  inventoryCategoryFieldSpecs,
  inventoryCategoryOrder,
  inventorySeedMaterials,
  inventoryUnitOptions,
  isMaterialProfileIncomplete,
  type InventoryCategory,
  type InventoryMaterial
} from "./inventory/inventoryData";

const { Title, Text } = Typography;

const materialCategoryOrder = inventoryCategoryOrder;

const productCategoryOptions = materialCategoryOrder.map((category) => ({
  label: category,
  value: category
}));

const materialNamePlaceholders: Record<InventoryCategory, { cn: string; en: string }> = {
  饲料: {
    cn: "如：妊娠母猪料、哺乳母猪料、保育料",
    en: "如：Gestation Sow Feed、Lactation Sow Feed、Nursery Feed"
  },
  疫苗: {
    cn: "如：非瘟灭活疫苗、蓝耳二联疫苗、圆环病毒疫苗",
    en: "如：ASF Inactivated Vaccine、PRRS Vaccine、PCV2 Vaccine"
  },
  兽药: {
    cn: "如：头孢、阿莫西林、替米考星",
    en: "如：Ceftiofur、Amoxicillin、Tilmicosin"
  },
  保健品: {
    cn: "如：复合维生素、电解多维、益生菌",
    en: "如：Multivitamin、Electrolyte Multivitamin、Probiotics"
  },
  消毒用品: {
    cn: "如：戊二醛消毒液、过硫酸氢钾、聚维酮碘",
    en: "如：Glutaraldehyde Disinfectant、Potassium Peroxymonosulfate、Povidone Iodine"
  },
  工具: {
    cn: "如：连续注射器、采样管、耳标钳",
    en: "如：Automatic Injector、Sampling Tube、Ear Tag Applicator"
  },
  其他: {
    cn: "如：耳标清洁剂、器械润滑剂、采样辅助用品",
    en: "如：Ear Tag Cleaner、Instrument Lubricant、Sampling Supplies"
  }
};

const materialCategoryTagColors: Record<InventoryCategory, string> = {
  饲料: "green",
  兽药: "cyan",
  疫苗: "blue",
  消毒用品: "orange",
  保健品: "lime",
  工具: "default",
  其他: "default"
};

const batchTemplateHeaders = [
  "物料类型",
  "物料名称(中文)",
  "物料名称(英文)",
  "品牌名称(中文)",
  "品牌名称(英文)",
  "核算单位",
  "安全库存"
];

const batchTemplateRows: Record<string, string>[] = [
  {
    "物料类型": "饲料",
    "物料名称(中文)": "妊娠母猪料",
    "物料名称(英文)": "Gestation Sow Feed",
    "品牌名称(中文)": "牧丰",
    "品牌名称(英文)": "MuFeng",
    "核算单位": "kg",
    "安全库存": "600"
  },
  {
    "物料类型": "兽药",
    "物料名称(中文)": "头孢",
    "物料名称(英文)": "Ceftiofur",
    "品牌名称(中文)": "华牧",
    "品牌名称(英文)": "HuaMu",
    "核算单位": "ml",
    "安全库存": "500"
  }
];

const batchTemplateMimeType = "application/vnd.ms-excel;charset=utf-8";

const seedRows: InventoryMaterial[] = inventorySeedMaterials.map((material) => ({ ...material }));

function getMaterialDetailFields(material: InventoryMaterial): [string, string][] {
  const baseFields: [string, string][] = [
    ["物料名称(中文)", material.materialName],
    ["物料名称(英文)", material.materialNameEn || "—"],
    ["物料类型", material.category],
    ["品牌名称(中文)", material.brand],
    ["品牌名称(英文)", material.brandEn || "—"],
    ["核算单位", material.baseUnit],
    ["安全库存", material.safetyStockBase != null ? `${material.safetyStockBase} ${material.baseUnit}` : "—"]
  ];
  const specs = inventoryCategoryFieldSpecs[material.category] || [];
  const extraFields: [string, string][] = specs.map((spec) => [
    spec.label,
    formatInventoryMaterialFieldValue(material, spec) || "—"
  ]);
  if (material.note) {
    extraFields.push(["备注", material.note]);
  }
  return [...baseFields, ...extraFields];
}

function getCellText(value: unknown) {
  return String(value ?? "").trim();
}

function escapeXml(value: unknown) {
  return getCellText(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getCellNumber(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeMaterialCategory(value: unknown) {
  const text = getCellText(value);
  return materialCategoryOrder.find((category) => category === text) || null;
}

function buildBatchTemplateXml() {
  const headerXml = batchTemplateHeaders
    .map((header) => `<Cell><Data ss:Type="String">${escapeXml(header)}</Data></Cell>`)
    .join("");
  const rowsHtml = batchTemplateRows
    .map(
      (row) =>
        `<Row>${batchTemplateHeaders
          .map((header) => `<Cell><Data ss:Type="String">${escapeXml(row[header])}</Data></Cell>`)
          .join("")}</Row>`
    )
    .join("");

  return [
    "<?xml version=\"1.0\"?>",
    "<?mso-application progid=\"Excel.Sheet\"?>",
    "<Workbook xmlns=\"urn:schemas-microsoft-com:office:spreadsheet\"",
    " xmlns:o=\"urn:schemas-microsoft-com:office:office\"",
    " xmlns:x=\"urn:schemas-microsoft-com:office:excel\"",
    " xmlns:ss=\"urn:schemas-microsoft-com:office:spreadsheet\">",
    "<Worksheet ss:Name=\"物料批量添加模板\">",
    "<Table>",
    `<Row>${headerXml}</Row>`,
    rowsHtml,
    "</Table>",
    "</Worksheet>",
    "</Workbook>"
  ].join("");
}

async function readBatchTemplateRows(file: File) {
  const text = await file.text();
  const parsedDocument = new DOMParser().parseFromString(text, "application/xml");
  const xmlRows = Array.from(parsedDocument.getElementsByTagNameNS("*", "Row"));

  if (xmlRows.length >= 2) {
    const headers = Array.from(xmlRows[0].getElementsByTagNameNS("*", "Cell")).map((cell) =>
      getCellText(cell.textContent)
    );
    return xmlRows.slice(1).map((row) => {
      const cells = Array.from(row.getElementsByTagNameNS("*", "Cell"));
      return headers.reduce<Record<string, string>>((result, header, index) => {
        result[header] = getCellText(cells[index]?.textContent);
        return result;
      }, {});
    });
  }

  const htmlDocument = new DOMParser().parseFromString(text, "text/html");
  const tableRows = Array.from(htmlDocument.querySelectorAll("tr"));
  if (tableRows.length < 2) return [];

  const headers = Array.from(tableRows[0].querySelectorAll("th,td")).map((cell) => getCellText(cell.textContent));
  return tableRows.slice(1).map((tableRow) => {
    const cells = Array.from(tableRow.querySelectorAll("td,th"));
    return headers.reduce<Record<string, string>>((result, header, index) => {
      result[header] = getCellText(cells[index]?.textContent);
      return result;
    }, {});
  });
}

function recommendedBaseUnit(category: InventoryCategory) {
  return inventoryCategoryBaseUnitRecommendations[category]?.[0] || inventoryUnitOptions[0];
}

export function VaccineCatalogPage() {
  const [rows, setRows] = useState<InventoryMaterial[]>(seedRows);
  const [createOpen, setCreateOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [viewingRow, setViewingRow] = useState<InventoryMaterial | null>(null);
  const [editingRow, setEditingRow] = useState<InventoryMaterial | null>(null);
  const [keyword, setKeyword] = useState("");
  const [activeCategory, setActiveCategory] = useState<InventoryCategory>("饲料");
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const createCategory = (Form.useWatch("category", createForm) || "饲料") as InventoryCategory;
  const editCategory = (Form.useWatch("category", editForm) || "饲料") as InventoryCategory;
  const createNamePlaceholder = materialNamePlaceholders[createCategory] || materialNamePlaceholders.饲料;

  useEffect(() => {
    if (!editingRow) return;
    editForm.setFieldsValue(editingRow);
  }, [editForm, editingRow]);

  const categoryFilters = useMemo(
    () => productCategoryOptions.map((item) => ({ text: item.label, value: item.value })),
    []
  );

  const filteredRows = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return rows.filter((row) => {
      if (row.category !== activeCategory) return false;
      if (!q) return true;
      return [row.materialName, row.materialNameEn, row.brand, row.brandEn, row.category]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [activeCategory, keyword, rows]);

  const categoryTabItems = useMemo(
    () =>
      materialCategoryOrder.map((category) => ({
        key: category,
        label: `${category} ${rows.filter((row) => row.category === category).length}`
      })),
    [rows]
  );

  const openCreate = () => {
    setCreateOpen(true);
    createForm.resetFields();
    createForm.setFieldsValue({ category: "饲料", baseUnit: recommendedBaseUnit("饲料") });
  };

  const resetCreate = () => {
    setCreateOpen(false);
    createForm.resetFields();
  };

  const buildProfileValues = (category: InventoryCategory, values: Record<string, unknown>) => {
    const specs = inventoryCategoryFieldSpecs[category] || [];
    const profile: Record<string, unknown> = {};
    specs.forEach((spec) => {
      profile[String(spec.key)] = values[String(spec.key)];
    });
    return profile;
  };

  const createMaterial = async () => {
    const values = await createForm.validateFields();
    const category = (values.category || "饲料") as InventoryCategory;
    const baseUnit = String(values.baseUnit || recommendedBaseUnit(category));
    const next: InventoryMaterial = {
      id: `mat-${Date.now()}`,
      materialCode: generateInventoryMaterialCode(rows),
      materialName: String(values.materialName).trim(),
      materialNameEn: values.materialNameEn ? String(values.materialNameEn).trim() : undefined,
      category,
      brand: String(values.brand).trim(),
      brandEn: values.brandEn ? String(values.brandEn).trim() : undefined,
      baseUnit,
      unitSystem: [`1${baseUnit} = 1${baseUnit}`],
      safetyStockBase: values.safetyStockBase != null ? Number(values.safetyStockBase) : undefined,
      status: "启用中",
      auxiliaryUnit: baseUnit,
      note: values.note ? String(values.note).trim() : undefined,
      ...buildProfileValues(category, values)
    };
    next.profileIncomplete = isMaterialProfileIncomplete(next);
    setRows((prev) => [next, ...prev]);
    setActiveCategory(category);
    resetCreate();
    message.success(next.profileIncomplete ? "已添加物料，部分专属资料待完善" : "已添加物料");
  };

  const openEdit = (record: InventoryMaterial) => {
    setEditingRow(record);
  };

  const saveEdit = async () => {
    if (!editingRow) return;
    const values = await editForm.validateFields();
    const category = (values.category || editingRow.category) as InventoryCategory;
    const baseUnit = String(values.baseUnit || editingRow.baseUnit);
    setRows((prev) =>
      prev.map((item) => {
        if (item.id !== editingRow.id) return item;
        const updated: InventoryMaterial = {
          ...item,
          materialName: String(values.materialName).trim(),
          materialNameEn: values.materialNameEn ? String(values.materialNameEn).trim() : undefined,
          category,
          brand: String(values.brand).trim(),
          brandEn: values.brandEn ? String(values.brandEn).trim() : undefined,
          baseUnit,
          safetyStockBase: values.safetyStockBase != null ? Number(values.safetyStockBase) : undefined,
          note: values.note ? String(values.note).trim() : undefined,
          ...buildProfileValues(category, values)
        };
        updated.profileIncomplete = isMaterialProfileIncomplete(updated);
        return updated;
      })
    );
    setEditingRow(null);
    editForm.resetFields();
    message.success("已保存物料");
  };

  const downloadBatchTemplate = () => {
    const blob = new Blob([buildBatchTemplateXml()], { type: batchTemplateMimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "物料批量添加模板.xls";
    link.click();
    URL.revokeObjectURL(url);
  };

  const importBatchRows = async (file: File) => {
    const importedRows = await readBatchTemplateRows(file);
    const nextRows: InventoryMaterial[] = [];
    const errors: string[] = [];

    importedRows.forEach((row, index) => {
      const line = index + 2;
      const category = normalizeMaterialCategory(row["物料类型"]);
      const materialName = getCellText(row["物料名称(中文)"]);
      const materialNameEn = getCellText(row["物料名称(英文)"]);
      const brand = getCellText(row["品牌名称(中文)"]);
      const brandEn = getCellText(row["品牌名称(英文)"]);
      const baseUnit = getCellText(row["核算单位"]) || (category ? recommendedBaseUnit(category) : "");

      if (!category || !materialName || !brand || !baseUnit) {
        errors.push(`第 ${line} 行缺少必填信息（物料类型/物料名称/品牌/核算单位）或物料类型不在模板范围内`);
        return;
      }

      const material: InventoryMaterial = {
        id: `mat-batch-${Date.now()}-${index}`,
        materialCode: generateInventoryMaterialCode([...rows, ...nextRows]),
        materialName,
        materialNameEn: materialNameEn || undefined,
        category,
        brand,
        brandEn: brandEn || undefined,
        baseUnit,
        unitSystem: [`1${baseUnit} = 1${baseUnit}`],
        safetyStockBase: getCellNumber(row["安全库存"]),
        status: "启用中",
        auxiliaryUnit: baseUnit
      };
      material.profileIncomplete = isMaterialProfileIncomplete(material);
      nextRows.push(material);
    });

    if (errors.length > 0) {
      message.error(errors[0]);
      return;
    }

    if (nextRows.length === 0) {
      message.warning("未读取到可导入的物料，请检查模板内容。");
      return;
    }

    setRows((prev) => [...nextRows, ...prev]);
    setActiveCategory(nextRows[0].category);
    setBatchOpen(false);
    const incomplete = nextRows.filter((row) => row.profileIncomplete).length;
    message.success(
      incomplete > 0
        ? `已批量添加 ${nextRows.length} 条物料，其中 ${incomplete} 条专属资料待完善`
        : `已批量添加 ${nextRows.length} 条物料`
    );
  };

  const renderGenericFields = (
    placeholder: { cn: string; en: string },
    category: InventoryCategory
  ) => (
    <>
      <Form.Item name="materialName" label="物料名称(中文)" rules={[{ required: true, message: "请输入物料中文名称" }]}>
        <Input placeholder={placeholder.cn} />
      </Form.Item>
      <Form.Item name="materialNameEn" label="物料名称(英文)">
        <Input placeholder={placeholder.en} />
      </Form.Item>
      <Form.Item name="category" label="物料类型" rules={[{ required: true, message: "请选择物料类型" }]}>
        <Select options={productCategoryOptions} />
      </Form.Item>
      <Form.Item name="brand" label="品牌名称(中文)" rules={[{ required: true, message: "请输入中文品牌名" }]}>
        <Input />
      </Form.Item>
      <Form.Item name="brandEn" label="品牌名称(英文)" rules={[{ required: true, message: "请输入英文品牌名" }]}>
        <Input />
      </Form.Item>
      <Form.Item name="baseUnit" label="核算单位" rules={[{ required: true, message: "请选择核算单位" }]}>
        <Select
          showSearch
          placeholder="如 ml、kg、头份、个"
          options={inventoryUnitOptions.map((unit) => ({ label: unit, value: unit }))}
        />
      </Form.Item>
      <Form.Item name="safetyStockBase" label="安全库存（核算单位）">
        <InputNumber min={0} style={{ width: "100%" }} placeholder="低于该值进入库存风险" />
      </Form.Item>
      <MaterialProfileFields category={category} requiredMode="catalog" />
      <Form.Item name="note" label="备注">
        <Input.TextArea rows={2} placeholder="选填" />
      </Form.Item>
    </>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <Title level={4} style={{ margin: 0 }}>
            物料管理
          </Title>
          <Text type="secondary">统一维护饲料、兽药、疫苗、消毒用品、保健品、工具及其他物料档案</Text>
        </div>
        <Space size={8}>
          <Button icon={<UploadOutlined />} onClick={() => setBatchOpen(true)}>
            批量添加
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            添加
          </Button>
        </Space>
      </div>

      <Card className="section-card">
        <Tabs
          className="material-catalog-tabs"
          activeKey={activeCategory}
          items={categoryTabItems}
          onChange={(key) => setActiveCategory(key as InventoryCategory)}
        />
        <div className="drug-catalog-toolbar">
          <Input.Search
            allowClear
            placeholder="搜索物料名称 / 品牌名称"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            style={{ width: 320 }}
          />
          <Text type="secondary" className="drug-catalog-result-count">
            共 {filteredRows.length} 条
          </Text>
        </div>
        <Table<InventoryMaterial>
          rowKey="id"
          dataSource={filteredRows}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          className="drug-catalog-table"
          size="middle"
          columns={[
            {
              title: "物料名称",
              dataIndex: "materialName",
              width: 280,
              sorter: (a, b) => a.materialName.localeCompare(b.materialName, "zh-Hans-CN"),
              render: (_, record) => (
                <div className="plan-vaccine-method-cell">
                  <div className="plan-vaccine-method-primary">
                    {record.materialName}
                    {record.profileIncomplete ? (
                      <Tag color="gold" style={{ marginLeft: 8 }}>
                        资料待完善
                      </Tag>
                    ) : null}
                  </div>
                  {record.materialNameEn ? (
                    <Text type="secondary" className="plan-vaccine-method-secondary">
                      {record.materialNameEn}
                    </Text>
                  ) : null}
                </div>
              )
            },
            {
              title: "物料类型",
              dataIndex: "category",
              width: 130,
              filters: categoryFilters,
              onFilter: (value, record) => record.category === value,
              render: (value: InventoryCategory) => <Tag color={materialCategoryTagColors[value]}>{value}</Tag>
            },
            {
              title: "品牌名称",
              dataIndex: "brand",
              width: 220,
              sorter: (a, b) => a.brand.localeCompare(b.brand, "zh-Hans-CN"),
              render: (_, record) => (
                <div className="plan-vaccine-method-cell">
                  <div className="plan-vaccine-method-primary">{record.brand}</div>
                  {record.brandEn ? (
                    <Text type="secondary" className="plan-vaccine-method-secondary">
                      {record.brandEn}
                    </Text>
                  ) : null}
                </div>
              )
            },
            {
              title: "核算单位",
              dataIndex: "baseUnit",
              width: 100
            },
            {
              title: "操作",
              key: "actions",
              width: 132,
              fixed: "right",
              align: "center",
              render: (_, record) => (
                <Space size={8}>
                  <Tooltip title="查看">
                    <Button type="text" icon={<EyeOutlined />} className="icon-btn" onClick={() => setViewingRow(record)} />
                  </Tooltip>
                  <Tooltip title="编辑">
                    <Button type="text" icon={<EditOutlined />} className="icon-btn" onClick={() => openEdit(record)} />
                  </Tooltip>
                  <Tooltip title="删除">
                    <Button
                      type="text"
                      icon={<DeleteOutlined />}
                      className="icon-btn danger"
                      onClick={() => {
                        Modal.confirm({
                          title: "确认删除该物料？",
                          content: "删除后将无法恢复。",
                          okText: "确认",
                          cancelText: "取消",
                          onOk: () => setRows((prev) => prev.filter((item) => item.id !== record.id))
                        });
                      }}
                    />
                  </Tooltip>
                </Space>
              )
            }
          ]}
        />
      </Card>

      <Modal
        title="批量添加物料"
        open={batchOpen}
        onCancel={() => setBatchOpen(false)}
        footer={null}
        width={620}
        destroyOnClose
        className="compact-modal"
      >
        <Alert
          showIcon
          type="info"
          className="material-batch-alert"
          message="先下载 Excel 模版，按列填写物料类型、物料名称、品牌名称和核算单位后上传。专属字段可在添加后到对应物料编辑中补全。"
        />
        <div className="material-batch-actions">
          <Button icon={<DownloadOutlined />} onClick={downloadBatchTemplate}>
            下载 Excel 模版
          </Button>
        </div>
        <Upload.Dragger
          className="material-batch-uploader"
          accept=".xls"
          multiple={false}
          maxCount={1}
          showUploadList={false}
          beforeUpload={(file) => {
            importBatchRows(file);
            return false;
          }}
        >
          <p className="ant-upload-drag-icon">
            <CloudUploadOutlined />
          </p>
          <p className="ant-upload-text">拖拽或点击上传已填写的 Excel 文件</p>
          <p className="ant-upload-hint">请上传下载的 .xls 模版文件；支持饲料、兽药、疫苗、消毒用品、保健品、工具、其他。</p>
        </Upload.Dragger>
      </Modal>

      <Modal
        title="物料详情"
        open={Boolean(viewingRow)}
        onCancel={() => setViewingRow(null)}
        footer={<Button onClick={() => setViewingRow(null)}>关闭</Button>}
        width={560}
        destroyOnClose
      >
        {viewingRow ? (
          <div className="task-detail-info-grid">
            {getMaterialDetailFields(viewingRow).map(([label, value]) => (
              <div key={label} className="task-detail-info-item">
                <div className="task-detail-info-label">{label}</div>
                <div className="task-detail-info-value">{value}</div>
              </div>
            ))}
          </div>
        ) : null}
      </Modal>

      <Modal
        title="添加物料"
        open={createOpen}
        onCancel={resetCreate}
        footer={
          <div className="form-actions">
            <Button onClick={resetCreate}>取消</Button>
            <Button type="primary" onClick={createMaterial}>
              添加
            </Button>
          </div>
        }
        width={560}
        destroyOnClose
        className="compact-modal"
      >
        <Form form={createForm} layout="vertical" initialValues={{ category: "饲料", baseUnit: recommendedBaseUnit("饲料") }}>
          {renderGenericFields(createNamePlaceholder, createCategory)}
        </Form>
      </Modal>

      <Modal
        title="编辑物料"
        open={Boolean(editingRow)}
        onCancel={() => {
          setEditingRow(null);
          editForm.resetFields();
        }}
        footer={
          <div className="form-actions">
            <Button
              onClick={() => {
                setEditingRow(null);
                editForm.resetFields();
              }}
            >
              取消
            </Button>
            <Button type="primary" onClick={saveEdit}>
              保存
            </Button>
          </div>
        }
        width={560}
        destroyOnClose
        className="compact-modal"
      >
        <Form form={editForm} layout="vertical">
          {renderGenericFields(materialNamePlaceholders[editCategory] || materialNamePlaceholders.饲料, editCategory)}
        </Form>
      </Modal>
    </div>
  );
}
