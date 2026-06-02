import { ArrowLeftOutlined } from "@ant-design/icons";
import { Breadcrumb, Button, Card, Tag } from "antd";
import "./CullingBatchDetailPage.css";

const batchInfo = [
  { label: "生产线名称", value: "2(0001)" },
  { label: "现存母猪数量", value: "0头" },
  { label: "现存其他猪数量", value: "0头" },
  { label: "批次状态", value: <Tag className="culling-batch-status-tag">计划中</Tag> },
  { label: "实际批次开始日期", value: "-" },
  { label: "预计批次结束日期", value: "2026/05/27" },
  { label: "预计分娩日期", value: "-" },
  {
    label: "生产计划",
    value: (
      <span className="culling-batch-plan-value">
        1
        <Tag className="culling-batch-warning-tag">模板有改动</Tag>
      </span>
    )
  },
  { label: "", value: "" },
  { label: "猪舍", value: "-" },
  { label: "目标淘汰", value: "4头" },
  { label: "目标留种", value: "6头" }
];

export function CullingBatchDetailPage({
  onBack,
  onOpenOutcomeDetail
}: {
  onBack: () => void;
  onOpenOutcomeDetail?: () => void;
}) {
  return (
    <div className="culling-batch-page">
      <div className="culling-batch-header">
        <div className="culling-batch-title-row">
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            className="culling-batch-back"
            onClick={onBack}
          />
          <h1 className="culling-batch-title">批次详情: 0001</h1>
        </div>
        <div className="culling-batch-actions">
          <Button onClick={() => onOpenOutcomeDetail?.()}>淘汰&留种详情</Button>
          <Button>生产计划设置</Button>
          <Button danger>跳过批次</Button>
        </div>
      </div>

      <Breadcrumb
        className="culling-batch-breadcrumb"
        items={[
          { title: "首页" },
          { title: "生产批次" },
          { title: "BATCH-34F0D479" }
        ]}
      />

      <Card className="culling-batch-card" bordered={false}>
        <h2 className="culling-batch-card-title">基本信息</h2>
        <div className="culling-batch-info-grid">
          {batchInfo.map((item, index) => (
            <div className="culling-batch-info-item" key={`${item.label}-${index}`}>
              {item.label ? <div className="culling-batch-info-label">{item.label}</div> : null}
              {item.label ? <div className="culling-batch-info-value">{item.value}</div> : null}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
