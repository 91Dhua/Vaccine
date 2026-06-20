import {
  AuditOutlined,
  CheckCircleOutlined,
  InboxOutlined,
  LeftOutlined,
  PlusCircleOutlined,
  RightOutlined,
  SearchOutlined,
  WarningOutlined
} from "@ant-design/icons";
import { Button, Input, Select, Space, Tag, Typography, message } from "antd";
import { useMemo, useState } from "react";
import {
  buildInventorySummaries,
  formatInventoryQty,
  inventoryCategoryOrder,
  inventorySeedAlerts,
  inventorySeedLots,
  inventorySeedMaterials
} from "./inventoryData";

const { Text, Title } = Typography;

type MobileInventoryFeature = "query" | "receive" | "stocktake" | "create";

const features: Array<{
  key: MobileInventoryFeature;
  label: string;
  description: string;
  icon: JSX.Element;
  meta: string;
}> = [
  { key: "query", label: "查库存", description: "查看当前真实库存", icon: <SearchOutlined />, meta: "常用" },
  { key: "receive", label: "物资入库", description: "记录到货批次", icon: <InboxOutlined />, meta: "到货" },
  { key: "stocktake", label: "库存盘点", description: "录入现场实数", icon: <AuditOutlined />, meta: "校准" },
  { key: "create", label: "新增物料", description: "补充最小信息", icon: <PlusCircleOutlined />, meta: "维护" }
];

const materialOptions = inventorySeedMaterials.map((item) => ({
  label: `${item.materialName} ${item.brand}`,
  value: item.id
}));

const categoryOptions = ["全部", ...inventoryCategoryOrder].map((value) => ({
  label: value,
  value
}));

const receiveUnitOptions = ["瓶", "盒", "袋", "桶", "个"].map((value) => ({ label: value, value }));
const stocktakeUnitOptions = ["盒", "瓶", "袋", "桶", "ml", "kg", "个", "头份"].map((value) => ({
  label: value,
  value
}));
const baseUnitOptions = ["ml", "g", "kg", "头份", "个", "L"].map((value) => ({ label: value, value }));

export function MobileInventoryToolsPage() {
  const [activeFeature, setActiveFeature] = useState<MobileInventoryFeature | null>(null);
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("全部");
  const summaries = useMemo(
    () => buildInventorySummaries(inventorySeedMaterials, inventorySeedLots),
    []
  );
  const filteredSummaries = summaries.filter((item) => {
    const matchedKeyword = `${item.materialName}${item.brand}${item.category}`.includes(keyword.trim());
    const matchedCategory = category === "全部" || item.category === category;
    return matchedKeyword && matchedCategory;
  });
  const negativeAlertCount = inventorySeedAlerts.filter((item) => item.type === "负库存提醒").length;
  const expiredLotCount = inventorySeedLots.filter((item) => item.status === "过期").length;
  const activeFeatureConfig = features.find((feature) => feature.key === activeFeature) || null;

  return (
    <main className="mv-home-scroll mv-inventory-tools">
      {!activeFeatureConfig ? (
        <>
          <header className="mv-inventory-tools__header">
            <Text type="secondary">配怀舍 · 一车间</Text>
            <Title level={4}>库存</Title>
          </header>

          <section className="mv-inventory-alert-strip">
            <span>
              <WarningOutlined /> 负库存 {negativeAlertCount}
            </span>
            <span>过期批次 {expiredLotCount}</span>
          </section>

          <section className="mv-inventory-feature-list" aria-label="库存功能">
            {features.map((feature) => (
              <button
                key={feature.key}
                type="button"
                className="mv-inventory-feature"
                onClick={() => setActiveFeature(feature.key)}
              >
                <span className="mv-inventory-feature__icon">{feature.icon}</span>
                <span className="mv-inventory-feature__main">
                  <strong>{feature.label}</strong>
                  <Text type="secondary">{feature.description}</Text>
                </span>
                <span className="mv-inventory-feature__meta">{feature.meta}</span>
                <RightOutlined className="mv-inventory-feature__arrow" />
              </button>
            ))}
          </section>
        </>
      ) : (
        <>
          <header className="mv-inventory-subpage-head">
            <button
              type="button"
              className="mv-inventory-back"
              aria-label="返回库存工具"
              onClick={() => setActiveFeature(null)}
            >
              <LeftOutlined />
            </button>
            <span>
              <Text type="secondary">库存</Text>
              <Title level={4}>{activeFeatureConfig.label}</Title>
            </span>
          </header>

          {activeFeature === "query" ? (
            <section className="mv-inventory-panel">
              <div className="mv-inventory-panel__head">
                <strong>{filteredSummaries.length} 个物料</strong>
                <Text type="secondary">真实库存</Text>
              </div>
              <Space direction="vertical" size={8} style={{ width: "100%" }}>
                <Input
                  className="mv-inventory-search"
                  prefix={<SearchOutlined />}
                  placeholder="搜索物料或品牌"
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                />
                <Select
                  value={category}
                  options={categoryOptions}
                  onChange={setCategory}
                  className="mv-inventory-filter"
                />
              </Space>
              <div className="mv-inventory-list">
                {filteredSummaries.map((item) => (
                  <button key={item.materialId} type="button" className="mv-inventory-row">
                    <span>
                      <strong>{item.materialName}</strong>
                      <Text type="secondary">{item.brand} · {item.category}</Text>
                    </span>
                    <span>
                      <b>{formatInventoryQty(item.currentStockBase, item.baseUnit)}</b>
                      <Tag color={item.stockRisk === "负库存" ? "error" : item.stockRisk === "低库存" ? "warning" : "success"}>
                        {item.stockRisk}
                      </Tag>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {activeFeature === "receive" ? (
            <section className="mv-inventory-panel">
              <div className="mv-inventory-panel__head">
                <strong>到货信息</strong>
                <Text type="secondary">按批次记录</Text>
              </div>
              <Space direction="vertical" size={12} style={{ width: "100%" }}>
                <label className="mv-inventory-field">
                  <span>物料</span>
                  <Select placeholder="选择物料" options={materialOptions} />
                </label>
                <label className="mv-inventory-field">
                  <span>批次号</span>
                  <Input placeholder="如 FL-202606-A" />
                </label>
                <div className="mv-inventory-inline-fields">
                  <label className="mv-inventory-field">
                    <span>数量</span>
                    <Input placeholder="输入数量" />
                  </label>
                  <label className="mv-inventory-field">
                    <span>单位</span>
                    <Select placeholder="单位" options={receiveUnitOptions} />
                  </label>
                </div>
                <label className="mv-inventory-field">
                  <span>到期日期</span>
                  <Input placeholder="2026-12-31" />
                </label>
                <Button type="primary" block icon={<CheckCircleOutlined />} onClick={() => message.success("演示：入库成功，已生成批次库存和入库流水")}>
                  提交入库
                </Button>
              </Space>
            </section>
          ) : null}

          {activeFeature === "stocktake" ? (
            <section className="mv-inventory-panel">
              <div className="mv-inventory-panel__head">
                <strong>盘点实数</strong>
                <Text type="secondary">按现场看到的单位录入</Text>
              </div>
              <Space direction="vertical" size={12} style={{ width: "100%" }}>
                <label className="mv-inventory-field">
                  <span>物料</span>
                  <Select placeholder="选择物料" options={materialOptions} />
                </label>
                <div className="mv-inventory-inline-fields">
                  <label className="mv-inventory-field">
                    <span>实际数量</span>
                    <Input placeholder="输入数量" />
                  </label>
                  <label className="mv-inventory-field">
                    <span>单位</span>
                    <Select placeholder="单位" options={stocktakeUnitOptions} />
                  </label>
                </div>
                <label className="mv-inventory-field">
                  <span>备注</span>
                  <Input placeholder="可选" />
                </label>
                <Button type="primary" block icon={<CheckCircleOutlined />} onClick={() => message.success("演示：盘点完成，系统已更新库存")}>
                  提交盘点
                </Button>
              </Space>
            </section>
          ) : null}

          {activeFeature === "create" ? (
            <section className="mv-inventory-panel">
              <div className="mv-inventory-panel__head">
                <strong>物料信息</strong>
                <Text type="secondary">最小必要字段</Text>
              </div>
              <Space direction="vertical" size={12} style={{ width: "100%" }}>
                <label className="mv-inventory-field">
                  <span>物料名称</span>
                  <Input placeholder="输入名称" />
                </label>
                <label className="mv-inventory-field">
                  <span>分类</span>
                  <Select placeholder="选择分类" options={categoryOptions.filter((item) => item.value !== "全部")} />
                </label>
                <label className="mv-inventory-field">
                  <span>品牌</span>
                  <Input placeholder="输入品牌" />
                </label>
                <label className="mv-inventory-field">
                  <span>基础单位</span>
                  <Select placeholder="选择单位" options={baseUnitOptions} />
                </label>
                <label className="mv-inventory-field">
                  <span>单位换算</span>
                  <Input placeholder="如 1瓶=100ml" />
                </label>
                <Button type="primary" block icon={<CheckCircleOutlined />} onClick={() => message.success("演示：新增物料成功，已回填到入库单")}>
                  保存物料
                </Button>
              </Space>
            </section>
          ) : null}
        </>
      )}
    </main>
  );
}
