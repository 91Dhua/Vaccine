import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography
} from "antd";
import { DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined } from "@ant-design/icons";
import { useMemo, useState } from "react";
import { vaccineCatalog as seedCatalog } from "../mockData";

const { Title, Text } = Typography;

type ProductCategory = "疫苗" | "兽药" | "保健品" | "消毒用品" | "其他";

type ProductBrandRow = {
  id: string;
  category: ProductCategory;
  productNameCn: string;
  productNameEn: string;
  brandNameCn: string;
  brandNameEn: string;
  dosageForm?: string;
  standardDosage?: string;
  durationOfImmunity?: string;
  withdrawalPeriodDays?: number;
  immuneIntervalDays?: number;
  administrationRoutes?: string[];
  vaccineType?: string;
};

const productCategoryOptions: { label: ProductCategory; value: ProductCategory }[] = [
  { label: "疫苗", value: "疫苗" },
  { label: "兽药", value: "兽药" },
  { label: "保健品", value: "保健品" },
  { label: "消毒用品", value: "消毒用品" },
  { label: "其他", value: "其他" }
];

const productNamePlaceholders: Record<ProductCategory, { cn: string; en: string }> = {
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
  其他: {
    cn: "如：耳标清洁剂、器械润滑剂、采样辅助用品",
    en: "如：Ear Tag Cleaner、Instrument Lubricant、Sampling Supplies"
  }
};

const seedRows: ProductBrandRow[] = [
  ...seedCatalog.flatMap((product) =>
    product.brands.map((brand) => ({
      id: `${product.id}-${brand.id}`,
      category: "疫苗" as const,
      productNameCn: product.nameCn,
      productNameEn: product.nameEn,
      brandNameCn: brand.brandNameCn,
      brandNameEn: brand.brandNameEn,
      dosageForm: brand.dosageForm,
      standardDosage: brand.standardDosage,
      durationOfImmunity: brand.durationOfImmunity,
      withdrawalPeriodDays: brand.withdrawalPeriodDays,
      immuneIntervalDays: brand.immuneIntervalDays,
      administrationRoutes: brand.administrationRoutes,
      vaccineType: brand.targetPathogen
    }))
  ),
  {
    id: "drug-ceftiofur-huamu",
    category: "兽药",
    productNameCn: "头孢",
    productNameEn: "Ceftiofur",
    brandNameCn: "华牧",
    brandNameEn: "HuaMu"
  },
  {
    id: "health-vitamin-muan",
    category: "保健品",
    productNameCn: "复合维生素",
    productNameEn: "Multivitamin",
    brandNameCn: "牧安",
    brandNameEn: "MuAn"
  },
  {
    id: "disinfectant-glutaraldehyde-kangjie",
    category: "消毒用品",
    productNameCn: "戊二醛消毒液",
    productNameEn: "Glutaraldehyde Disinfectant",
    brandNameCn: "康洁",
    brandNameEn: "KangJie"
  }
];

function renderRoutes(value?: string[]) {
  if (!Array.isArray(value) || value.length === 0) return "—";
  return value
    .map((route) =>
      route === "IM"
        ? "肌肉注射(IM)"
        : route === "SC"
          ? "皮下注射(SC)"
          : route
    )
    .join("、");
}

function getProductDetailFields(row: ProductBrandRow) {
  const baseFields = [
    ["产品名称(中文)", row.productNameCn],
    ["产品名称(英文)", row.productNameEn],
    ["药品类型", row.category],
    ["品牌名称(中文)", row.brandNameCn],
    ["品牌名称(英文)", row.brandNameEn]
  ];

  if (row.category !== "疫苗") {
    return baseFields;
  }

  return [
    ...baseFields,
    ["剂型", row.dosageForm || "—"],
    ["单次剂量", row.standardDosage || "—"],
    ["免疫有效期", row.durationOfImmunity || "—"],
    ["休药期(天)", row.withdrawalPeriodDays ?? "—"],
    ["免疫间隔期(天)", row.immuneIntervalDays ?? "—"],
    ["接种方式", renderRoutes(row.administrationRoutes)],
    ["疫苗类型", row.vaccineType || "—"]
  ];
}

export function VaccineCatalogPage() {
  const [rows, setRows] = useState<ProductBrandRow[]>(seedRows);
  const [createOpen, setCreateOpen] = useState(false);
  const [createStep, setCreateStep] = useState<1 | 2>(1);
  const [viewingRow, setViewingRow] = useState<ProductBrandRow | null>(null);
  const [editingRow, setEditingRow] = useState<ProductBrandRow | null>(null);
  const [editCategory, setEditCategory] = useState<ProductCategory>("疫苗");
  const [keyword, setKeyword] = useState("");
  const [draftProduct, setDraftProduct] = useState<Pick<
    ProductBrandRow,
    "category" | "productNameCn" | "productNameEn"
  > | null>(null);
  const [productForm] = Form.useForm();
  const [brandForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const selectedCreateCategory = (Form.useWatch("category", productForm) || "疫苗") as ProductCategory;
  const createNamePlaceholder = productNamePlaceholders[selectedCreateCategory] || productNamePlaceholders.疫苗;

  const isVaccineDraft = draftProduct?.category === "疫苗";

  const categoryFilters = useMemo(
    () => productCategoryOptions.map((item) => ({ text: item.label, value: item.value })),
    []
  );
  const filteredRows = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return rows.filter((row) => {
      if (!q) return true;
      return [
        row.productNameCn,
        row.productNameEn,
        row.brandNameCn,
        row.brandNameEn,
        row.category
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [keyword, rows]);

  const resetCreate = () => {
    setCreateOpen(false);
    setCreateStep(1);
    setDraftProduct(null);
    productForm.resetFields();
    brandForm.resetFields();
  };

  const goBrandStep = async () => {
    const values = await productForm.validateFields();
    setDraftProduct({
      category: values.category,
      productNameCn: values.productNameCn,
      productNameEn: values.productNameEn
    });
    setCreateStep(2);
  };

  const createProductBrand = async () => {
    if (!draftProduct) return;
    const values = await brandForm.validateFields();
    const now = Date.now();
    setRows((prev) => [
      {
        id: `product-brand-${now}`,
        ...draftProduct,
        brandNameCn: values.brandNameCn,
        brandNameEn: values.brandNameEn,
        dosageForm: values.dosageForm,
        standardDosage: values.standardDosage,
        durationOfImmunity: values.durationOfImmunity,
        withdrawalPeriodDays: values.withdrawalPeriodDays,
        immuneIntervalDays: values.immuneIntervalDays,
        administrationRoutes: values.administrationRoutes,
        vaccineType: values.vaccineType
      },
      ...prev
    ]);
    resetCreate();
  };

  const openEdit = (record: ProductBrandRow) => {
    setEditingRow(record);
    setEditCategory(record.category);
    editForm.setFieldsValue(record);
  };

  const saveEdit = async () => {
    if (!editingRow) return;
    const values = await editForm.validateFields();
    setRows((prev) =>
      prev.map((item) =>
        item.id === editingRow.id
          ? {
              ...item,
              ...values,
              dosageForm: values.category === "疫苗" ? values.dosageForm : undefined,
              standardDosage: values.category === "疫苗" ? values.standardDosage : undefined,
              durationOfImmunity: values.category === "疫苗" ? values.durationOfImmunity : undefined,
              withdrawalPeriodDays: values.category === "疫苗" ? values.withdrawalPeriodDays : undefined,
              immuneIntervalDays: values.category === "疫苗" ? values.immuneIntervalDays : undefined,
              administrationRoutes: values.category === "疫苗" ? values.administrationRoutes : undefined,
              vaccineType: values.category === "疫苗" ? values.vaccineType : undefined
            }
          : item
      )
    );
    setEditingRow(null);
    editForm.resetFields();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <Title level={4} style={{ margin: 0 }}>
            药品管理
          </Title>
          <Text type="secondary">统一维护疫苗、兽药、保健品、消毒用品及其他药品品牌信息</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
          添加药品
        </Button>
      </div>

      <Card className="section-card">
        <div className="drug-catalog-toolbar">
          <Input.Search
            allowClear
            placeholder="搜索产品名称 / 品牌名称"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            style={{ width: 320 }}
          />
          <Text type="secondary" className="drug-catalog-result-count">
            共 {filteredRows.length} 条
          </Text>
        </div>
        <Table<ProductBrandRow>
          rowKey="id"
          dataSource={filteredRows}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          className="drug-catalog-table"
          size="middle"
          columns={[
            {
              title: "产品名称",
              dataIndex: "productNameCn",
              width: 300,
              fixed: "left",
              sorter: (a, b) => a.productNameCn.localeCompare(b.productNameCn, "zh-Hans-CN"),
              render: (_, record) => (
                <div className="plan-vaccine-method-cell">
                  <div className="plan-vaccine-method-primary">{record.productNameCn}</div>
                  <Text type="secondary" className="plan-vaccine-method-secondary">
                    {record.productNameEn}
                  </Text>
                </div>
              )
            },
            {
              title: "药品类型",
              dataIndex: "category",
              width: 150,
              filters: categoryFilters,
              onFilter: (value, record) => record.category === value,
              render: (value: ProductCategory) => <Tag color={value === "疫苗" ? "blue" : "default"}>{value}</Tag>
            },
            {
              title: "品牌名称",
              dataIndex: "brandNameCn",
              width: 260,
              sorter: (a, b) => a.brandNameCn.localeCompare(b.brandNameCn, "zh-Hans-CN"),
              render: (_, record) => (
                <div className="plan-vaccine-method-cell">
                  <div className="plan-vaccine-method-primary">{record.brandNameCn}</div>
                  <Text type="secondary" className="plan-vaccine-method-secondary">
                    {record.brandNameEn}
                  </Text>
                </div>
              )
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
                    <Button
                      type="text"
                      icon={<EyeOutlined />}
                      className="icon-btn"
                      onClick={() => setViewingRow(record)}
                    />
                  </Tooltip>
                  <Tooltip title="编辑">
                    <Button
                      type="text"
                      icon={<EditOutlined />}
                      className="icon-btn"
                      onClick={() => openEdit(record)}
                    />
                  </Tooltip>
                  <Tooltip title="删除">
                    <Button
                      type="text"
                      icon={<DeleteOutlined />}
                      className="icon-btn danger"
                      onClick={() => {
                        Modal.confirm({
                          title: "确认删除该药品品牌？",
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
        title="药品详情"
        open={Boolean(viewingRow)}
        onCancel={() => setViewingRow(null)}
        footer={<Button onClick={() => setViewingRow(null)}>关闭</Button>}
        width={560}
        destroyOnClose
      >
        {viewingRow ? (
          <div className="task-detail-info-grid">
            {getProductDetailFields(viewingRow).map(([label, value]) => (
              <div key={String(label)} className="task-detail-info-item">
                <div className="task-detail-info-label">{label}</div>
                <div className="task-detail-info-value">{value}</div>
              </div>
            ))}
          </div>
        ) : null}
      </Modal>

      <Modal
        title="编辑药品"
        open={Boolean(editingRow)}
        onCancel={() => {
          setEditingRow(null);
          editForm.resetFields();
        }}
        onOk={saveEdit}
        okText="保存"
        cancelText="取消"
        width={560}
        destroyOnClose
        className="compact-modal"
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="productNameCn" label="产品名称(中文)" rules={[{ required: true, message: "请输入产品中文名称" }]}>
            <Input />
          </Form.Item>
          <Form.Item name="productNameEn" label="产品名称(英文)" rules={[{ required: true, message: "请输入产品英文名称" }]}>
            <Input />
          </Form.Item>
          <Form.Item name="category" label="药品类型" rules={[{ required: true, message: "请选择药品类型" }]}>
            <Select options={productCategoryOptions} onChange={(value) => setEditCategory(value)} />
          </Form.Item>
          <Form.Item name="brandNameCn" label="品牌名称(中文)" rules={[{ required: true, message: "请输入中文品牌名" }]}>
            <Input />
          </Form.Item>
          <Form.Item name="brandNameEn" label="品牌名称(英文)" rules={[{ required: true, message: "请输入英文品牌名" }]}>
            <Input />
          </Form.Item>
          {editCategory === "疫苗" ? (
            <>
              <Form.Item name="dosageForm" label="剂型" rules={[{ required: true, message: "请选择剂型" }]}>
                <Select
                  options={[
                    { label: "活疫苗（冻干苗）", value: "活疫苗（冻干苗）" },
                    { label: "油佐剂灭活疫苗", value: "油佐剂灭活疫苗" },
                    { label: "水佐剂灭活疫苗", value: "水佐剂灭活疫苗" }
                  ]}
                />
              </Form.Item>
              <Form.Item name="standardDosage" label="单次剂量">
                <Input />
              </Form.Item>
              <Form.Item name="durationOfImmunity" label="免疫有效期">
                <Input />
              </Form.Item>
              <Form.Item name="withdrawalPeriodDays" label="休药期(天)">
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
              <Form.Item name="immuneIntervalDays" label="免疫间隔期(天)">
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
              <Form.Item name="administrationRoutes" label="接种方式">
                <Select
                  mode="multiple"
                  options={[
                    { label: "肌肉注射(IM)", value: "IM" },
                    { label: "皮下注射(SC)", value: "SC" },
                    { label: "滴鼻", value: "滴鼻" },
                    { label: "饮水", value: "饮水" },
                    { label: "喷雾", value: "喷雾" }
                  ]}
                />
              </Form.Item>
              <Form.Item name="vaccineType" label="疫苗类型">
                <Select
                  options={[
                    { label: "病毒性", value: "病毒性" },
                    { label: "细菌性", value: "细菌性" },
                    { label: "寄生虫", value: "寄生虫" }
                  ]}
                />
              </Form.Item>
            </>
          ) : null}
        </Form>
      </Modal>

      <Modal
        title={createStep === 1 ? "添加药品" : "添加品牌信息"}
        open={createOpen}
        onCancel={resetCreate}
        footer={
          createStep === 1 ? (
            <div className="form-actions">
              <Button onClick={resetCreate}>取消</Button>
              <Button type="primary" onClick={goBrandStep}>
                下一步
              </Button>
            </div>
          ) : (
            <div className="form-actions">
              <Button onClick={() => setCreateStep(1)}>上一步</Button>
              <Button type="primary" onClick={createProductBrand}>
                添加
              </Button>
            </div>
          )
        }
        width={560}
        destroyOnClose
        className="compact-modal"
      >
        {createStep === 1 ? (
          <Form form={productForm} layout="vertical" initialValues={{ category: "疫苗" }}>
            <Form.Item
              name="productNameCn"
              label="产品名称(中文)"
              rules={[{ required: true, message: "请输入产品中文名称" }]}
            >
              <Input placeholder={createNamePlaceholder.cn} />
            </Form.Item>
            <Form.Item
              name="productNameEn"
              label="产品名称(英文)"
              rules={[{ required: true, message: "请输入产品英文名称" }]}
            >
              <Input placeholder={createNamePlaceholder.en} />
            </Form.Item>
            <Form.Item
              name="category"
              label="药品类型"
              rules={[{ required: true, message: "请选择药品类型" }]}
            >
              <Select options={productCategoryOptions} />
            </Form.Item>
          </Form>
        ) : (
          <Form form={brandForm} layout="vertical">
            <Form.Item label="产品名称">
              <Input value={draftProduct?.productNameCn || ""} disabled />
            </Form.Item>
            <Form.Item label="药品类型">
              <Input value={draftProduct?.category || ""} disabled />
            </Form.Item>
            <Form.Item
              name="brandNameCn"
              label="品牌名称(中文)"
              rules={[{ required: true, message: "请输入中文品牌名" }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="brandNameEn"
              label="品牌名称(英文)"
              rules={[{ required: true, message: "请输入英文品牌名" }]}
            >
              <Input />
            </Form.Item>
            {isVaccineDraft ? (
              <>
                <Form.Item
                  name="dosageForm"
                  label="剂型"
                  rules={[{ required: true, message: "请选择剂型" }]}
                >
                  <Select
                    options={[
                      { label: "活疫苗（冻干苗）", value: "活疫苗（冻干苗）" },
                      { label: "油佐剂灭活疫苗", value: "油佐剂灭活疫苗" },
                      { label: "水佐剂灭活疫苗", value: "水佐剂灭活疫苗" }
                    ]}
                  />
                </Form.Item>
                <Form.Item name="standardDosage" label="单次剂量">
                  <Input placeholder="如 2 ml/头" />
                </Form.Item>
                <Form.Item name="durationOfImmunity" label="免疫有效期">
                  <Input placeholder="如 6 个月" />
                </Form.Item>
                <Form.Item name="withdrawalPeriodDays" label="休药期(天)">
                  <InputNumber min={0} style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item name="immuneIntervalDays" label="免疫间隔期(天)">
                  <InputNumber min={0} style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item name="administrationRoutes" label="接种方式">
                  <Select
                    mode="multiple"
                    placeholder="可多选"
                    options={[
                      { label: "肌肉注射(IM)", value: "IM" },
                      { label: "皮下注射(SC)", value: "SC" },
                      { label: "滴鼻", value: "滴鼻" },
                      { label: "饮水", value: "饮水" },
                      { label: "喷雾", value: "喷雾" }
                    ]}
                  />
                </Form.Item>
                <Form.Item name="vaccineType" label="疫苗类型">
                  <Select
                    options={[
                      { label: "病毒性", value: "病毒性" },
                      { label: "细菌性", value: "细菌性" },
                      { label: "寄生虫", value: "寄生虫" }
                    ]}
                  />
                </Form.Item>
              </>
            ) : null}
          </Form>
        )}
      </Modal>
    </div>
  );
}
