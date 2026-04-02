import {
  Button,
  Card,
  Form,
  Input,
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
                  brandNameEn: values.brandNameEn
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
              nameEn: values.nameEn
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
                      brandNameEn: values.brandNameEn
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
              render: (value) => <Text strong>{value}</Text>
            },
            { title: "疫苗名称(英文)", dataIndex: "nameEn" },
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
                        nameEn: record.nameEn
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
                      { title: "品牌名称(中文)", dataIndex: "brandNameCn" },
                      { title: "品牌名称(英文)", dataIndex: "brandNameEn" },
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
                                  brandNameEn: brand.brandNameEn
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
        width={420}
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
        </Form>
      </Modal>

      <Modal
        title="编辑疫苗"
        open={editVaccineOpen}
        onCancel={() => setEditVaccineOpen(false)}
        onOk={handleEditVaccine}
        okText="保存"
        cancelText="取消"
        width={420}
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
        </Form>
      </Modal>
    </div>
  );
}
