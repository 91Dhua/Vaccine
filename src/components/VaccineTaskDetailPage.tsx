import { ArrowLeftOutlined, QuestionCircleOutlined } from "@ant-design/icons";
import { Button, Card, Popconfirm, Popover, Progress, Table, Tabs, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { ReactNode } from "react";
import { useMemo } from "react";
import type { MobileExecutionLog, MobilePigTask } from "../mobileVaccinationUtils";
import type { TaskRow } from "./VaccineTaskListPage";
import { getPigMobileMeta } from "../pigMeta";
import { sampleContainerLabel, samplingMethodLabel } from "../planEffectTracking";

const { Title, Text } = Typography;

type DetailPigRow = {
  key: string;
  sourcePigId: string;
  pigId: string;
  roomLabel: string;
  stallNo: string;
  executionStatus: "待接种" | "已接种" | "未接种" | "命中豁免";
  exemptionLabel?: string;
  actualAt?: string;
  executor?: string;
};

type Props = {
  task: TaskRow;
  pigTasks: MobilePigTask[];
  logs: MobileExecutionLog[];
  onBack: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onSupplement?: (action: { pigIds: string[]; mode: "pending-only" | "review-full" }) => void;
};

type DetailInfoItem = {
  label: string;
  value: ReactNode;
  span?: "full";
};

function buildSyntheticRows(task: TaskRow): DetailPigRow[] {
  const total = Math.max(task.targetCount, task.pigIds?.length ?? 0, 1);
  const ids =
    task.pigIds && task.pigIds.length > 0
      ? task.pigIds
      : Array.from({ length: total }, (_, index) => `pig-${1000 + index}`);

  const completedCount =
    task.status === "待接种"
      ? 0
      : task.status === "进行中"
        ? Math.max(1, Math.floor(total * 0.65))
        : Math.max(0, total - Math.max(1, Math.ceil(total * 0.08)));
  const exemptionCount =
    task.status === "待接种" ? Math.min(1, ids.length) : Math.min(Math.max(1, Math.ceil(total * 0.08)), ids.length);

  return ids.map((pigId, index) => {
    const meta = getPigMobileMeta(pigId);
    const isExempt = index < exemptionCount;
    const isCompleted = index < completedCount;
    const executionStatus: DetailPigRow["executionStatus"] =
      task.status === "待接种"
        ? "待接种"
        : isCompleted
          ? "已接种"
          : isExempt
            ? "命中豁免"
            : "未接种";

    return {
      key: `${task.id}-${pigId}`,
      sourcePigId: pigId,
      pigId: meta.earTag,
      roomLabel: meta.roomLabel,
      stallNo: meta.stallNo,
      executionStatus,
      exemptionLabel: isExempt ? meta.exemptionTagLabel ?? "命中接种豁免规则" : undefined,
      actualAt: isCompleted ? task.executedAt ?? task.createdAt : undefined,
      executor: isCompleted ? task.executor ?? "当前执行人" : undefined
    };
  });
}

function mapPigTaskToDetailRow(task: MobilePigTask): DetailPigRow {
  const executionStatus: DetailPigRow["executionStatus"] =
    task.exemptionHit && task.status !== "completed"
      ? "命中豁免"
      : task.status === "completed"
        ? "已接种"
        : task.status === "skipped" || task.status === "suspended"
          ? "未接种"
          : "待接种";

  return {
    key: task.id,
    sourcePigId: task.pigId,
    pigId: task.earTag,
    roomLabel: task.roomLabel,
    stallNo: task.stallNo,
    executionStatus,
    exemptionLabel: task.exemptionHit ? task.exemptionTagLabel ?? "命中接种豁免规则" : undefined,
    actualAt: task.actualAt,
    executor: task.executor
  };
}

function compareText(a?: string, b?: string): number {
  return String(a || "").localeCompare(String(b || ""), "zh-Hans-CN");
}

function toSectionLabelFromWorkshop(workshopLabel?: string): string {
  const raw = String(workshopLabel || "").trim();
  if (!raw) return "未分配区块";
  if (raw.includes("配怀舍") || raw.includes("母猪")) return "生产一区母猪车间";
  if (raw.includes("分娩舍")) return "生产一区分娩车间";
  if (raw.includes("保育")) return "生产一区保育车间";
  if (raw.includes("育肥")) return "生产一区育肥车间";
  return raw.replace(" · ", "");
}

function DetailInfoGrid({ items }: { items: DetailInfoItem[] }) {
  return (
    <div className="task-detail-info-grid">
      {items.map((item) => (
        <div
          key={item.label}
          className={`task-detail-info-item${item.span === "full" ? " task-detail-info-item--full" : ""}`}
        >
          <div className="task-detail-info-label">{item.label}</div>
          <div className="task-detail-info-value">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

export function VaccineTaskDetailPage({
  task,
  pigTasks,
  logs,
  onBack,
  onEdit,
  onDelete,
  onSupplement
}: Props) {
  const detailRows = useMemo(
    () => (pigTasks.length > 0 ? pigTasks.map(mapPigTaskToDetailRow) : buildSyntheticRows(task)),
    [pigTasks, task]
  );

  const vaccinatedRows = detailRows.filter((row) => row.executionStatus === "已接种");
  const pendingRows = detailRows.filter((row) => row.executionStatus !== "已接种");
  const supplementPigIds = Array.from(new Set(pendingRows.map((row) => row.sourcePigId)));
  const exemptionRows = detailRows.filter((row) => row.executionStatus === "命中豁免");
  const progressPercent =
    task.targetCount > 0 ? Math.min(100, Math.round((vaccinatedRows.length / task.targetCount) * 100)) : 0;
  const latestLog = logs[0];
  const targetSectionLabels = useMemo(() => {
    const sourcePigIds =
      pigTasks.length > 0
        ? pigTasks.map((item) => item.pigId)
        : task.pigIds && task.pigIds.length > 0
          ? task.pigIds
          : detailRows.map((_, index) => `pig-${1000 + index}`);

    return Array.from(
      new Set(sourcePigIds.map((pigId) => toSectionLabelFromWorkshop(getPigMobileMeta(pigId).workshopLabel)))
    );
  }, [detailRows, pigTasks, task.pigIds]);

  const targetSectionText = targetSectionLabels.join("、") || "未分配区块";
  const planName = task.planName || `${task.vaccine}免疫计划`;
  const planType = task.planType || "跟批免疫";
  const planCreatedAt = task.planCreatedAt || task.createdAt;
  const planStatus = task.planStatus || "启用中";
  const effectTracking = task.effectTracking;
  const effectTrackingResult = task.effectTrackingResult;
  const reviewEnabled = Boolean(effectTracking?.effectTrackingEnabled);
  const reviewResultAvailable = reviewEnabled && Boolean(effectTrackingResult);
  const showPendingSupplementAction = task.supplementStatus === "需补打" && task.hasPendingSupplementNeed;
  const showPendingSupplementCoveredHint = Boolean(task.hasPendingSupplementCoveredByReview);
  const showReviewRevaccinationAction = task.supplementStatus === "需补打" && task.hasReviewSupplementNeed;
  const planInfoItems: DetailInfoItem[] = [
    { label: "计划名称", value: planName },
    { label: "计划类型", value: planType },
    { label: "计划状态", value: <Tag color="default">{planStatus}</Tag> },
    { label: "启用状态", value: <Tag color={planStatus === "停用" ? "default" : "success"}>{planStatus === "停用" ? "停用" : "启用"}</Tag> },
    { label: "计划创建时间", value: planCreatedAt }
  ];
  const taskInfoItems: DetailInfoItem[] = [
    { label: "任务编号", value: task.id },
    {
      label: "任务状态",
      value: <Tag color={task.status === "待接种" ? "default" : task.status === "进行中" ? "processing" : "success"}>{task.status}</Tag>
    },
    { label: "疫苗名称", value: task.vaccine },
    { label: "品牌名称", value: task.brand || "—" },
    { label: "接种方式", value: task.administrationRoute || "—" },
    { label: "剂量", value: task.dosage },
    { label: "接种日期", value: task.schedule },
    { label: "目标范围", value: targetSectionText },
    { label: "创建人/时间", value: `${task.creator} / ${task.createdAt}` },
    ...(task.status !== "待接种"
      ? [{ label: "执行人/时间", value: `${task.executor || latestLog?.actor || "—"} / ${task.executedAt || latestLog?.at || "—"}` }]
      : []),
    { label: "豁免命中数量", value: `${exemptionRows.length} 头` }
  ];
  const reviewItems: DetailInfoItem[] = reviewEnabled
    ? [
        { label: "是否启用复核", value: "是" },
        { label: "目标抗体", value: effectTracking?.targetAntibody || "—" },
        { label: "采样方式", value: samplingMethodLabel(effectTracking?.samplingMethod) || "—" },
        { label: "样品容器", value: sampleContainerLabel(effectTracking?.sampleContainer) || "—" },
        { label: "抽检间隔", value: `${effectTracking?.samplingIntervalDays ?? "—"} 天` },
        { label: "抽样比例", value: `${effectTracking?.samplingRatioPercent ?? "—"}%` },
        { label: "抗体合格率阈值", value: `${effectTracking?.qualificationThresholdPercent ?? "—"}%` }
      ]
    : [];
  const reviewResultItems: DetailInfoItem[] = reviewResultAvailable
    ? [
        { label: "配置阈值", value: `${effectTracking?.qualificationThresholdPercent ?? "—"}%` },
        {
          label: "实际检测结果",
          value: `${effectTrackingResult?.qualifiedCount ?? 0} / ${effectTrackingResult?.sampledCount ?? 0}`
        },
        { label: "实际合格率", value: `${effectTrackingResult?.qualificationRatePercent ?? 0}%` },
        {
          label: "结果判定",
          value: (
            <Tag color={effectTrackingResult?.result === "合格" ? "success" : "error"}>
              {effectTrackingResult?.result}
            </Tag>
          )
        }
      ]
    : [];

  const pendingColumns: ColumnsType<DetailPigRow> = [
    {
      title: "猪只ID",
      dataIndex: "pigId",
      width: 160,
      sorter: (a, b) => compareText(a.pigId, b.pigId)
    },
    {
      title: "房间",
      dataIndex: "roomLabel",
      width: 220,
      ellipsis: true,
      sorter: (a, b) => compareText(a.roomLabel, b.roomLabel)
    },
    {
      title: "栏位",
      dataIndex: "stallNo",
      width: 100,
      align: "center",
      sorter: (a, b) => compareText(a.stallNo, b.stallNo)
    },
    {
      title: "豁免命中",
      dataIndex: "exemptionLabel",
      ellipsis: true,
      filters: [{ text: "命中豁免", value: "hit" }, { text: "未命中", value: "none" }],
      onFilter: (value, record) => value === "hit" ? Boolean(record.exemptionLabel) : !record.exemptionLabel,
      render: (value?: string) => value || "—"
    }
  ];

  const completedColumns: ColumnsType<DetailPigRow> = [
    {
      title: "猪只ID",
      dataIndex: "pigId",
      width: 140,
      sorter: (a, b) => compareText(a.pigId, b.pigId)
    },
    {
      title: "房间",
      dataIndex: "roomLabel",
      width: 160,
      ellipsis: true,
      sorter: (a, b) => compareText(a.roomLabel, b.roomLabel)
    },
    {
      title: "栏位",
      dataIndex: "stallNo",
      width: 100,
      sorter: (a, b) => compareText(a.stallNo, b.stallNo)
    },
    {
      title: "豁免命中",
      dataIndex: "exemptionLabel",
      ellipsis: true,
      filters: [{ text: "命中豁免", value: "hit" }, { text: "未命中", value: "none" }],
      onFilter: (value, record) => value === "hit" ? Boolean(record.exemptionLabel) : !record.exemptionLabel,
      render: (value?: string) => value || "—"
    },
    {
      title: "执行人/时间",
      key: "executorAt",
      width: 220,
      render: (_, row) => (row.executor || row.actualAt ? `${row.executor || "—"} / ${row.actualAt || "—"}` : "—")
    }
  ];

  const tabItems =
    task.status === "待接种"
      ? [
          {
            key: "targets",
            label: `目标猪只 (${detailRows.length})`,
            children: <Table rowKey="key" columns={pendingColumns} dataSource={detailRows} pagination={{ pageSize: 8 }} />
          }
        ]
      : task.status === "进行中"
        ? [
            {
              key: "vaccinated",
              label: `已接种 (${vaccinatedRows.length})`,
              children: <Table rowKey="key" columns={completedColumns} dataSource={vaccinatedRows} pagination={{ pageSize: 8 }} />
            },
            {
              key: "pending",
              label: `未接种 (${pendingRows.length})`,
              children: <Table rowKey="key" columns={pendingColumns} dataSource={pendingRows} pagination={{ pageSize: 8 }} />
            }
          ]
        : [
            {
              key: "vaccinated",
              label: `已接种 (${vaccinatedRows.length})`,
              children: <Table rowKey="key" columns={completedColumns} dataSource={vaccinatedRows} pagination={{ pageSize: 8 }} />
            },
            {
              key: "pending",
              label: `未接种 (${pendingRows.length})`,
              children: <Table rowKey="key" columns={pendingColumns} dataSource={pendingRows} pagination={{ pageSize: 8 }} />
            }
          ];

  return (
    <div>
      <div className="page-header">
        <div>
          <Button type="link" icon={<ArrowLeftOutlined />} style={{ paddingInline: 0 }} onClick={onBack}>
            返回任务列表
          </Button>
          <Title level={4} style={{ margin: 0 }}>
            接种任务详情
          </Title>
          <Text type="secondary">按任务状态查看配置、进度和目标猪只结果</Text>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          {task.status === "待接种" && onEdit ? <Button onClick={onEdit}>编辑任务</Button> : null}
          {task.status === "待接种" && onDelete ? (
            <Popconfirm
              title="删除接种任务"
              description="删除后会同步移除该任务下发到 Mobile 的接种数据。"
              okText="删除"
              cancelText="取消"
              onConfirm={onDelete}
            >
              <Button danger>删除任务</Button>
            </Popconfirm>
          ) : null}
        </div>
      </div>

      <div className="task-detail-grid">
        <Card className="section-card">
          <Title level={5} className="task-detail-section-title" style={{ marginTop: 0 }}>
            所属免疫计划信息
          </Title>
          <DetailInfoGrid items={planInfoItems} />
        </Card>

        <Card className="section-card">
          <Title level={5} className="task-detail-section-title" style={{ marginTop: 0 }}>
            疫苗任务信息
          </Title>
          <DetailInfoGrid items={taskInfoItems} />
          <div className="task-detail-progress-row">
            <div className="task-detail-progress-meta">
              <div className="task-detail-progress-label">已接种 / 目标接种</div>
              <div className="task-detail-progress-value">{vaccinatedRows.length} / {task.targetCount} 头</div>
            </div>
            <Progress
              percent={progressPercent}
              strokeColor={task.status === "待接种" ? "#94a3b8" : task.status === "进行中" ? "#1677ff" : "#16a34a"}
              showInfo={false}
            />
          </div>
        </Card>
      </div>

      {reviewResultAvailable ? (
        <Card className="section-card">
          <div className="task-detail-card-head">
            <Title level={5} className="task-detail-section-title" style={{ marginTop: 0, marginBottom: 0 }}>
              免疫复核结果
            </Title>
            {showReviewRevaccinationAction && onSupplement ? (
              <Button
                onClick={() =>
                  onSupplement({
                    pigIds: detailRows.map((row) => row.sourcePigId),
                    mode: "review-full"
                  })
                }
              >
                重新接种
              </Button>
            ) : null}
          </div>
          <DetailInfoGrid items={reviewResultItems} />
        </Card>
      ) : null}

      {reviewEnabled ? (
        <Card className="section-card">
          <Title level={5} className="task-detail-section-title" style={{ marginTop: 0 }}>
            免疫复核设置
          </Title>
          <DetailInfoGrid items={reviewItems} />
        </Card>
      ) : null}

      {task.status !== "待接种" ? (
        <Card className="section-card">
          <div className="task-detail-card-head">
            <Title level={5} className="task-detail-section-title" style={{ marginTop: 0, marginBottom: 0 }}>
              接种猪只列表
            </Title>
            {showPendingSupplementAction && onSupplement ? (
              <Button
                type="primary"
                onClick={() => onSupplement({ pigIds: supplementPigIds, mode: "pending-only" })}
                disabled={supplementPigIds.length === 0}
              >
                补充接种
              </Button>
            ) : null}
            {!showPendingSupplementAction && showPendingSupplementCoveredHint ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Button type="primary" disabled>
                  补充接种
                </Button>
                <Popover
                  trigger="click"
                  placement="leftTop"
                  content="本次接种合格率未达到要求，您已经安排了任务内全部猪只重新接种，无需补充接种。"
                >
                  <Button
                    type="text"
                    size="small"
                    icon={<QuestionCircleOutlined />}
                    aria-label="补充接种说明"
                  />
                </Popover>
              </div>
            ) : null}
          </div>
          <Tabs items={tabItems} />
        </Card>
      ) : null}
    </div>
  );
}
