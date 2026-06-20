import { ArrowLeftOutlined, EyeOutlined, WarningOutlined } from "@ant-design/icons";
import { Breadcrumb, Button, Card, Tag, Tooltip } from "antd";
import type { ReactNode } from "react";
import "./CullingBatchDetailPage.css";

type OutcomeDetailTab = "culling" | "retained";
type BatchInfoItem = {
  label: ReactNode;
  value: ReactNode;
};

function ProgressValue({
  done,
  total,
  tooltip
}: {
  done: number;
  total: number;
  tooltip: string;
}) {
  return (
    <Tooltip title={tooltip} overlayClassName="culling-batch-progress-tooltip">
      <span className="culling-batch-progress-value">
        <span>{done}</span>
        <span className="culling-batch-progress-divider">/</span>
        <span>{total}</span>
        <span className="culling-batch-progress-unit">头</span>
      </span>
    </Tooltip>
  );
}

function ProgressLabel({
  label,
  tooltip,
  onClick,
  reminder
}: {
  label: string;
  tooltip: string;
  onClick: () => void;
  reminder?: ReactNode;
}) {
  return (
    <span className="culling-batch-progress-label">
      <span className="culling-batch-progress-label-main">
        <span>{label}</span>
        <Tooltip title={tooltip}>
          <Button
            type="text"
            size="small"
            className="culling-batch-progress-view"
            icon={<EyeOutlined />}
            aria-label={tooltip}
            onClick={onClick}
          />
        </Tooltip>
      </span>
      {reminder}
    </span>
  );
}

function CullingPendingReminder({
  count
}: {
  count: number;
}) {
  return (
    <span className="culling-batch-pending-reminder">
      <span className="culling-batch-pending-reminder-icon">
        <WarningOutlined />
      </span>
      <span className="culling-batch-pending-reminder-copy">
        <strong>发现 {count} 头建议淘汰母猪待确认</strong>
        <span>查看并完成淘汰决策</span>
      </span>
    </span>
  );
}

const batchInfoBase: BatchInfoItem[] = [
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
  { label: "猪舍", value: "-" }
];

export function CullingBatchDetailPage({
  onBack,
  onOpenOutcomeDetail
}: {
  onBack: () => void;
  onOpenOutcomeDetail?: (tab?: OutcomeDetailTab) => void;
}) {
  const taskStatus = "已结束";
  const pendingCullingConfirmationCount = 2;
  const canOpenOutcomeDetail = Boolean(onOpenOutcomeDetail);
  const showPendingCullingReminder =
    taskStatus === "已结束" && pendingCullingConfirmationCount > 0 && canOpenOutcomeDetail;

  const batchInfo: BatchInfoItem[] = [
    ...batchInfoBase,
    {
      label: (
        <ProgressLabel
          label="淘汰进度"
          tooltip="查看淘汰详情"
          onClick={() => onOpenOutcomeDetail?.("culling")}
          reminder={showPendingCullingReminder ? (
            <CullingPendingReminder count={pendingCullingConfirmationCount} />
          ) : null}
        />
      ),
      value: (
        <ProgressValue
          done={2}
          total={4}
          tooltip="确认淘汰 / 目标淘汰"
        />
      )
    },
    {
      label: (
        <ProgressLabel
          label="留种进度"
          tooltip="查看留种详情"
          onClick={() => onOpenOutcomeDetail?.("retained")}
        />
      ),
      value: (
        <ProgressValue
          done={5}
          total={6}
          tooltip="标记留种 / 目标留种"
        />
      )
    }
  ];

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
