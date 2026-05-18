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
  Typography
} from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { useMemo, useState } from "react";
import { vaccineCatalog as seedCatalog, VaccineCategory } from "../mockData";

const { Title, Text } = Typography;

export function VaccineCatalogPage() {
  const [catalog, setCatalog] = useState<VaccineCategory[]>(seedCatalog);
  const [createVaccineOpen, setCreateVaccineOpen] = useState(false);
  const [createBrandOpen, setCreateBrandOpen] = useState(false);
  const [editVaccineOpen, setEditVaccineOpen] = useState(false);
  const [editBrandOpen, setEditBrandOpen] = useState(false);
  const [selectedVaccineId, setSelectedVaccineId] = useState<string | null>(null);
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [vaccineForm] = Form.useForm();
  const [brandForm] = Form.useForm();
  const [editVaccineForm] = Form.useForm();
  const [editBrandForm] = Form.useForm();

  const selectedVaccine = useMemo(
    () => catalog.find((item) => item.id === selectedVaccineId),
    [catalog, selectedVaccineId]
  );

  const selectedBrand = useMemo(
    () =>
      catalog
        .find((item) => item.id === selectedVaccineId)
        ?.brands.find((brand) => brand.id === selectedBrandId),
    [catalog, selectedVaccineId, selectedBrandId]
  );

  const handleAddVaccine = async () => {
    const values = await vaccineForm.validateFields();
    const newItem: VaccineCategory = {
      id: `vac-${Date.now()}`,
      vaccineId: `VAC-${Date.now()}`,
      nameCn: values.nameCn,
      nameEn: values.nameEn,
      targetAntibody: values.targetAntibody,
      brands: []
    };
    setCatalog((prev) => [newItem, ...prev]);
    setCreateVaccineOpen(false);
    vaccineForm.resetFields();
  };

  const handleAddBrand = async () => {
    const values = await brandForm.validateFields();
    if (!selectedVaccineId) return;
    setCatalog((prev) =>
      prev.map((item) =>
        item.id === selectedVaccineId
          ? {
              ...item,
              brands: [
                ...item.brands,
                {
                  id: `brand-${Date.now()}`,
                  brandNameCn: values.brandNameCn,
                  brandNameEn: values.brandNameEn,
                  dosageForm: values.dosageForm,
                  standardDosage: values.standardDosage,
                  durationOfImmunity: values.durationOfImmunity,
                  withdrawalPeriodDays: values.withdrawalPeriodDays,
                  immuneIntervalDays: values.immuneIntervalDays,
                  administrationRoutes: values.administrationRoutes,
                  targetPathogen: values.targetPathogen
                }
              ]
            }
          : item
      )
    );
    setCreateBrandOpen(false);
    brandForm.resetFields();
  };

  const handleEditVaccine = async () => {
    const values = await editVaccineForm.validateFields();
    if (!selectedVaccineId) return;
    setCatalog((prev) =>
      prev.map((item) =>
            item.id === selectedVaccineId
          ? {
              ...item,
              nameCn: values.nameCn,
              nameEn: values.nameEn,
              targetAntibody: values.targetAntibody
            }
          : item
      )
    );
    setEditVaccineOpen(false);
    setSelectedVaccineId(null);
  };

  const handleEditBrand = async () => {
    const values = await editBrandForm.validateFields();
    if (!selectedVaccineId || !selectedBrandId) return;
    setCatalog((prev) =>
      prev.map((item) =>
        item.id === selectedVaccineId
          ? {
              ...item,
              brands: item.brands.map((brand) =>
                brand.id === selectedBrandId
                  ? {
                      ...brand,
                      brandNameCn: values.brandNameCn,
                      brandNameEn: values.brandNameEn,
                      dosageForm: values.dosageForm,
                      standardDosage: values.standardDosage,
                      durationOfImmunity: values.durationOfImmunity,
                      withdrawalPeriodDays: values.withdrawalPeriodDays,
                      immuneIntervalDays: values.immuneIntervalDays,
                      administrationRoutes: values.administrationRoutes,
                      targetPathogen: values.targetPathogen
                    }
                  : brand
              )
            }
          : item
      )
    );
    setEditBrandOpen(false);
    setSelectedBrandId(null);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <Title level={4} style={{ margin: 0 }}>
            疫苗管理
          </Title>
          <Text type="secondary">可维护不同品牌的同一种疫苗配置</Text>
        </div>
        <Button type="primary" onClick={() => setCreateVaccineOpen(true)}>
          添加疫苗
        </Button>
      </div>

      <Card className="section-card">
        <div className="table-toolbar">
          <Input.Search placeholder="搜索疫苗名称 / 品牌" style={{ width: 260 }} />
        </div>
        <Table
          rowKey="id"
          dataSource={catalog}
          pagination={false}
          columns={[
            {
              title: "疫苗名称(中文)",
              dataIndex: "nameCn",
              width: 200,
              sorter: (a, b) => a.nameCn.localeCompare(b.nameCn, "zh-Hans-CN"),
              render: (value) => <Text strong>{value}</Text>
            },
            { title: "疫苗名称(英文)", dataIndex: "nameEn", ellipsis: true, sorter: (a, b) => a.nameEn.localeCompare(b.nameEn) },
            {
              title: "目标抗体",
              dataIndex: "targetAntibody",
              filters: [...new Set(catalog.map((item) => item.targetAntibody).filter(Boolean))].map((item) => ({ text: item, value: item })),
              onFilter: (value, record) => record.targetAntibody === value,
              sorter: (a, b) => String(a.targetAntibody || "").localeCompare(String(b.targetAntibody || ""), "zh-Hans-CN"),
              render: (value: string) =>
                value ? (
                  <Text type="secondary" ellipsis={{ tooltip: value }}>
                    {value}
                  </Text>
                ) : (
                  <Text type="secondary">—</Text>
                )
            },
            {
              title: "操作",
              width: 120,
              render: (_, record) => (
                <Space>
                  <Button
                    type="text"
                    icon={<EditOutlined />}
                    className="icon-btn"
                    onClick={() => {
                      setSelectedVaccineId(record.id);
                      editVaccineForm.setFieldsValue({
                        nameCn: record.nameCn,
                        nameEn: record.nameEn,
                        targetAntibody: record.targetAntibody
                      });
                      setEditVaccineOpen(true);
                    }}
                  />
                  <Button
                    type="text"
                    icon={<DeleteOutlined />}
                    className="icon-btn danger"
                    onClick={() => {
                      Modal.confirm({
                        title: "确认删除该疫苗？",
                        content: "删除后将无法恢复。",
                        okText: "确认",
                        cancelText: "取消",
                        onOk: () =>
                          setCatalog((prev) =>
                            prev.filter((item) => item.id !== record.id)
                          )
                      });
                    }}
                  />
                </Space>
              )
            }
          ]}
          expandable={{
            expandedRowRender: (record) => (
              <div className="expanded-panel">
                <div className="expanded-header compact">
                  <Button
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => {
                      setSelectedVaccineId(record.id);
                      setCreateBrandOpen(true);
                    }}
                  >
                    添加品牌
                  </Button>
                </div>
                {record.brands.length === 0 ? (
                  <div className="empty-card">
                    <div className="empty-illustration" />
                    <div className="empty-text">No data</div>
                  </div>
                ) : (
                  <Table
                    rowKey="id"
                    dataSource={record.brands}
                    pagination={false}
                    size="small"
                    columns={[
                      { title: "品牌名称(中文)", dataIndex: "brandNameCn", sorter: (a, b) => a.brandNameCn.localeCompare(b.brandNameCn, "zh-Hans-CN") },
                      { title: "品牌名称(英文)", dataIndex: "brandNameEn", sorter: (a, b) => a.brandNameEn.localeCompare(b.brandNameEn) },
                      {
                        title: "剂型",
                        dataIndex: "dosageForm",
                        width: 140,
                        filters: [...new Set(record.brands.map((item) => item.dosageForm).filter(Boolean))].map((item) => ({ text: String(item), value: String(item) })),
                        onFilter: (value, row) => row.dosageForm === value
                      },
                      {
                        title: "单次剂量",
                        dataIndex: "standardDosage",
                        width: 120,
                        sorter: (a, b) => String(a.standardDosage || "").localeCompare(String(b.standardDosage || ""))
                      },
                      {
                        title: "免疫有效期",
                        dataIndex: "durationOfImmunity",
                        width: 140,
                        sorter: (a, b) => String(a.durationOfImmunity || "").localeCompare(String(b.durationOfImmunity || ""))
                      },
                      {
                        title: "休药期(天)",
                        dataIndex: "withdrawalPeriodDays",
                        width: 110,
                        sorter: (a, b) => Number(a.withdrawalPeriodDays || 0) - Number(b.withdrawalPeriodDays || 0)
                      },
                      {
                        title: "免疫间隔期(天)",
                        dataIndex: "immuneIntervalDays",
                        width: 130,
                        sorter: (a, b) => Number(a.immuneIntervalDays || 0) - Number(b.immuneIntervalDays || 0)
                      },
                      {
                        title: "接种方式",
                        dataIndex: "administrationRoutes",
                        width: 140,
                        filters: [
                          { text: "肌肉注射(IM)", value: "IM" },
                          { text: "皮下注射(SC)", value: "SC" }
                        ],
                        onFilter: (value, row) => Array.isArray(row.administrationRoutes) && row.administrationRoutes.includes(value as any),
                        render: (value?: string[]) =>
                          Array.isArray(value) && value.length > 0
                            ? value
                                .map((v) =>
                                  v === "IM"
                                    ? "肌肉注射(IM)"
                                    : v === "SC"
                                      ? "皮下注射(SC)"
                                      : v
                                )
                                .join("、")
                            : "-"
                      },
                      {
                        title: "疫苗类型",
                        dataIndex: "targetPathogen",
                        width: 100
                      },
                      {
                        title: "操作",
                        dataIndex: "actions",
                        width: 120,
                        render: (_, brand) => (
                          <Space>
                            <Button
                              type="text"
                              icon={<EditOutlined />}
                              className="icon-btn"
                              onClick={() => {
                                setSelectedVaccineId(record.id);
                                setSelectedBrandId(brand.id);
                                editBrandForm.setFieldsValue({
                                  brandNameCn: brand.brandNameCn,
                                  brandNameEn: brand.brandNameEn,
                                  dosageForm: brand.dosageForm,
                                  standardDosage: brand.standardDosage,
                                  durationOfImmunity: brand.durationOfImmunity,
                                  withdrawalPeriodDays: brand.withdrawalPeriodDays,
                                  immuneIntervalDays: brand.immuneIntervalDays,
                                  administrationRoutes: brand.administrationRoutes,
                                  targetPathogen: brand.targetPathogen
                                });
                                setEditBrandOpen(true);
                              }}
                            />
                            <Button
                              type="text"
                              icon={<DeleteOutlined />}
                              className="icon-btn danger"
                              onClick={() => {
                                Modal.confirm({
                                  title: "确认删除该品牌？",
                                  content: "删除后将无法恢复。",
                                  okText: "确认",
                                  cancelText: "取消",
                                  onOk: () =>
                                    setCatalog((prev) =>
                                      prev.map((item) =>
                                        item.id === record.id
                                          ? {
                                              ...item,
                                              brands: item.brands.filter(
                                                (b) => b.id !== brand.id
                                              )
                                            }
                                          : item
                                      )
                                    )
                                });
                              }}
                            />
                          </Space>
                        )
                      }
                    ]}
                  />
                )}
              </div>
            )
          }}
        />
      </Card>

      <Modal
        title="添加疫苗"
        open={createVaccineOpen}
        onCancel={() => setCreateVaccineOpen(false)}
        onOk={handleAddVaccine}
        okText="添加"
        cancelText="取消"
        width={480}
        destroyOnClose
        className="compact-modal"
      >
        <Form form={vaccineForm} layout="vertical">
          <Form.Item
            name="nameCn"
            label="疫苗名称(中文)"
            rules={[{ required: true, message: "请输入中文名称" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="nameEn"
            label="疫苗名称(英文)"
            rules={[{ required: true, message: "请输入英文名称" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="targetAntibody"
            label="目标抗体"
            rules={[{ required: true, message: "请输入目标抗体" }]}
            extra="用于计划免疫复核中的检测项目展示，如：非洲猪瘟病毒抗体"
          >
            <Input placeholder="如：非洲猪瘟病毒抗体" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="添加疫苗品牌"
        open={createBrandOpen}
        onCancel={() => setCreateBrandOpen(false)}
        onOk={handleAddBrand}
        okText="添加"
        cancelText="取消"
        width={520}
        destroyOnClose
        className="compact-modal"
      >
        <Form form={brandForm} layout="vertical">
          <Form.Item label="疫苗">
            <Input value={selectedVaccine?.nameCn || ""} disabled />
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
          <Form.Item
            name="standardDosage"
            label="单次使用剂量"
            extra="如：2 ml/头"
          >
            <Input placeholder="如 2 ml/头" />
          </Form.Item>
          <Form.Item
            name="durationOfImmunity"
            label="免疫有效期"
            extra="如：6 个月；用于系统计算下次加强免疫时间"
          >
            <Input placeholder="如 6 个月" />
          </Form.Item>
          <Form.Item
            name="withdrawalPeriodDays"
            label="休药期(天)"
            extra="用于出栏前豁免与预警"
          >
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            name="immuneIntervalDays"
            label="免疫间隔期(天)"
            extra="接种后需间隔的最短天数，未达间隔期将提示延期接种"
          >
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            name="administrationRoutes"
            label="接种方式"
          >
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
          <Form.Item
            name="targetPathogen"
            label="疫苗类型"
          >
            <Select
              options={[
                { label: "病毒性", value: "病毒性" },
                { label: "细菌性", value: "细菌性" },
                { label: "寄生虫", value: "寄生虫" }
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="编辑疫苗"
        open={editVaccineOpen}
        onCancel={() => setEditVaccineOpen(false)}
        onOk={handleEditVaccine}
        okText="保存"
        cancelText="取消"
        width={480}
        destroyOnClose
        className="compact-modal"
      >
        <Form form={editVaccineForm} layout="vertical">
          <Form.Item
            name="nameCn"
            label="疫苗名称(中文)"
            rules={[{ required: true, message: "请输入中文名称" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="nameEn"
            label="疫苗名称(英文)"
            rules={[{ required: true, message: "请输入英文名称" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="targetAntibody"
            label="目标抗体"
            rules={[{ required: true, message: "请输入目标抗体" }]}
            extra="用于计划免疫复核中的检测项目展示"
          >
            <Input placeholder="如：非洲猪瘟病毒抗体" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="编辑疫苗品牌"
        open={editBrandOpen}
        onCancel={() => setEditBrandOpen(false)}
        onOk={handleEditBrand}
        okText="保存"
        cancelText="取消"
        width={520}
        destroyOnClose
        className="compact-modal"
      >
        <Form form={editBrandForm} layout="vertical">
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
          <Form.Item
            name="standardDosage"
            label="单次使用剂量"
            extra="如：2 ml/头"
          >
            <Input placeholder="如 2 ml/头" />
          </Form.Item>
          <Form.Item
            name="durationOfImmunity"
            label="免疫有效期"
            extra="如：6 个月；用于系统计算下次加强免疫时间"
          >
            <Input placeholder="如 6 个月" />
          </Form.Item>
          <Form.Item
            name="withdrawalPeriodDays"
            label="休药期(天)"
            extra="用于出栏前豁免与预警"
          >
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            name="immuneIntervalDays"
            label="免疫间隔期(天)"
            extra="接种后需间隔的最短天数，未达间隔期将提示延期接种"
          >
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            name="administrationRoutes"
            label="接种方式"
          >
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
          <Form.Item
            name="targetPathogen"
            label="疫苗类型"
          >
            <Select
              options={[
                { label: "病毒性", value: "病毒性" },
                { label: "细菌性", value: "细菌性" },
                { label: "寄生虫", value: "寄生虫" }
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
