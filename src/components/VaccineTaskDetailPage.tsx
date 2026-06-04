import { ArrowLeftOutlined, LinkOutlined, QuestionCircleOutlined } from "@ant-design/icons";
import { Button, Card, Popconfirm, Popover, Progress, Space, Table, Tabs, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import type { MobileExecutionLog, MobilePigTask } from "../mobileVaccinationUtils";
import { resolveVaccineTaskTypeLabel, type TaskRow } from "./VaccineTaskListPage";
import { getPigMobileMeta } from "../pigMeta";
import { sampleContainerLabel, samplingMethodLabel } from "../planEffectTracking";

const { Title, Text } = Typography;

type DetailPigRow = {
  key: string;
  sourcePigId: string;
  pigId: string;
  batchProductionLine?: string;
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
  allTasks?: TaskRow[];
  onOpenRelatedTask?: (taskId: string) => void;
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
      : task.status === "已取消"
        ? 0
        : task.status === "接种中"
        ? Math.max(1, Math.floor(total * 0.65))
        : Math.max(0, total - Math.max(1, Math.ceil(total * 0.08)));
  const exemptionCount =
    task.status === "待接种" || task.status === "已取消"
      ? Math.min(1, ids.length)
      : Math.min(Math.max(1, Math.ceil(total * 0.08)), ids.length);

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
      batchProductionLine: task.batchProductionLine,
      roomLabel: meta.roomLabel,
      stallNo: meta.stallNo,
      executionStatus,
      exemptionLabel: isExempt ? meta.exemptionTagLabel ?? "命中接种豁免规则" : undefined,
      actualAt: isCompleted ? task.executedAt ?? task.createdAt : undefined,
      executor: isCompleted ? task.executor ?? "当前执行人" : undefined
    };
  });
}

function mapPigTaskToDetailRow(task: MobilePigTask, sourceTask: TaskRow): DetailPigRow {
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
    batchProductionLine: sourceTask.batchProductionLine,
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

function taskTypeTagColor(task: TaskRow) {
  const taskType = resolveVaccineTaskTypeLabel(task);
  if (taskType === "疫苗计划") return "blue";
  if (taskType === "补充接种") return "gold";
  if (taskType === "重新接种") return "purple";
  return "default";
}

export function VaccineTaskDetailPage({
  task,
  pigTasks,
  logs,
  onBack,
  onEdit,
  onDelete,
  onSupplement,
  allTasks = [],
  onOpenRelatedTask
}: Props) {
  const detailRows = useMemo(
    () => (pigTasks.length > 0 ? pigTasks.map((pigTask) => mapPigTaskToDetailRow(pigTask, task)) : buildSyntheticRows(task)),
    [pigTasks, task]
  );

  const vaccinatedRows = useMemo(
    () => detailRows.filter((row) => row.executionStatus === "已接种"),
    [detailRows]
  );
  const pendingRows = useMemo(
    () => detailRows.filter((row) => row.executionStatus !== "已接种"),
    [detailRows]
  );
  const selectableSupplementPigIds = useMemo(
    () =>
      Array.from(
        new Set(
          pendingRows
            .filter((row) => row.executionStatus === "未接种")
            .map((row) => row.sourcePigId)
        )
      ),
    [pendingRows]
  );
  const [selectedSupplementPigIds, setSelectedSupplementPigIds] = useState<string[]>([]);
  const [activePigTab, setActivePigTab] = useState<string>("vaccinated");
  const exemptionRows = useMemo(
    () => detailRows.filter((row) => row.executionStatus === "命中豁免"),
    [detailRows]
  );
  const progressPercent =
    task.targetCount > 0 ? Math.min(100, Math.round((vaccinatedRows.length / task.targetCount) * 100)) : 0;
  const latestLog = logs[0];
  const planName = task.planName || `${task.vaccine}免疫计划`;
  const planType = task.planType || "跟批免疫";
  const planCreatedAt = task.planCreatedAt || task.createdAt;
  const planStatus = task.planStatus || "启用中";
  const taskType = resolveVaccineTaskTypeLabel(task);
  const relatedSourceTask = task.supplementSourceTaskId
    ? allTasks.find((item) => item.id === task.supplementSourceTaskId)
    : undefined;
  const relatedChildTasks = allTasks.filter((item) => item.supplementSourceTaskId === task.id);
  const relatedTasks = [
    ...(relatedSourceTask ? [{ relationLabel: "来源任务", task: relatedSourceTask }] : []),
    ...relatedChildTasks.map((item) => ({ relationLabel: resolveVaccineTaskTypeLabel(item), task: item }))
  ];
  const effectTracking = task.effectTracking;
  const effectTrackingResult = task.effectTrackingResult;
  const reviewEnabled = Boolean(effectTracking?.effectTrackingEnabled);
  const reviewResultAvailable = reviewEnabled && Boolean(effectTrackingResult);
  const showPendingSupplementAction = task.supplementStatus === "需补打" && task.hasPendingSupplementNeed;
  const showPendingSupplementCoveredHint = Boolean(task.hasPendingSupplementCoveredByReview);
  const showReviewRevaccinationAction = task.supplementStatus === "需补打" && task.hasReviewSupplementNeed;
  const showPendingSupplementButton = showPendingSupplementAction && activePigTab === "pending";
  const showPendingSupplementHint = !showPendingSupplementAction && showPendingSupplementCoveredHint && activePigTab === "pending";

  useEffect(() => {
    setSelectedSupplementPigIds(selectableSupplementPigIds);
  }, [selectableSupplementPigIds, task.id]);

  useEffect(() => {
    setActivePigTab(task.status === "待接种" || task.status === "已取消" ? "targets" : "vaccinated");
  }, [task.id, task.status]);
  const planInfoItems: DetailInfoItem[] = [
    { label: "计划名称", value: planName },
    { label: "计划类型", value: planType },
    { label: "计划状态", value: <Tag color="default">{planStatus}</Tag> },
    { label: "启用状态", value: <Tag color={planStatus === "停用" ? "default" : "success"}>{planStatus === "停用" ? "停用" : "启用"}</Tag> },
    { label: "计划创建时间", value: planCreatedAt }
  ];
  const taskInfoItems: DetailInfoItem[] = [
    { label: "任务ID", value: task.id },
    {
      label: "任务状态",
      value: <Tag color={task.status === "待接种" ? "default" : task.status === "接种中" ? "processing" : task.status === "已取消" ? "error" : "success"}>{task.status}</Tag>
    },
    { label: "任务类型", value: <Tag color={taskTypeTagColor(task)}>{taskType}</Tag> },
    { label: "疫苗名称", value: task.vaccine },
    { label: "品牌名称", value: task.brand || "—" },
    { label: "接种方式", value: task.administrationRoute || "—" },
    { label: "剂量", value: task.dosage },
    { label: "接种日期", value: task.schedule },
    { label: "创建人/时间", value: `${task.creator} / ${task.createdAt}` },
    ...(task.status !== "待接种"
      ? [{ label: "操作人/时间", value: `${task.executor || latestLog?.actor || "—"} / ${task.executedAt || latestLog?.at || "—"}` }]
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
  const reviewSampledCount = effectTrackingResult?.sampledCount ?? 0;
  const reviewQualifiedCount = effectTrackingResult?.qualifiedCount ?? 0;
  const reviewNegativeCount = Math.max(0, reviewSampledCount - reviewQualifiedCount);
  const reviewQualificationPercent = effectTrackingResult?.qualificationRatePercent ?? 0;
  const reviewProgressPercent = reviewSampledCount > 0 ? 100 : 0;

  const pendingColumns: ColumnsType<DetailPigRow> = [
    {
      title: "猪只ID",
      dataIndex: "pigId",
      width: 160,
      sorter: (a, b) => compareText(a.pigId, b.pigId)
    },
    {
      title: "批次-生产线",
      dataIndex: "batchProductionLine",
      width: 180,
      ellipsis: true,
      sorter: (a, b) => compareText(a.batchProductionLine, b.batchProductionLine),
      render: (value?: string) => value || "—"
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
      title: "批次-生产线",
      dataIndex: "batchProductionLine",
      width: 180,
      ellipsis: true,
      sorter: (a, b) => compareText(a.batchProductionLine, b.batchProductionLine),
      render: (value?: string) => value || "—"
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
      title: "操作人/时间",
      key: "executorAt",
      width: 220,
      render: (_, row) => (row.executor || row.actualAt ? `${row.executor || "—"} / ${row.actualAt || "—"}` : "—")
    }
  ];

  const tabItems =
    task.status === "待接种" || task.status === "已取消"
      ? [
          {
            key: "targets",
            label: `目标猪只 (${detailRows.length})`,
            children: <Table rowKey="key" columns={pendingColumns} dataSource={detailRows} pagination={{ pageSize: 8 }} />
          }
        ]
      : task.status === "接种中"
        ? [
            {
              key: "vaccinated",
              label: `已接种 (${vaccinatedRows.length})`,
              children: <Table rowKey="key" columns={completedColumns} dataSource={vaccinatedRows} pagination={{ pageSize: 8 }} />
            },
            {
              key: "pending",
              label: `未接种 (${pendingRows.length})`,
              children: (
                <Table
                  rowKey="key"
                  columns={pendingColumns}
                  dataSource={pendingRows}
                  pagination={{ pageSize: 8 }}
                  rowSelection={
                    showPendingSupplementAction
                      ? {
                          selectedRowKeys: pendingRows
                            .filter((row) => selectedSupplementPigIds.includes(row.sourcePigId))
                            .map((row) => row.key),
                          getCheckboxProps: (row) => ({
                            disabled: row.executionStatus !== "未接种"
                          }),
                          onChange: (_, rows) => {
                            setSelectedSupplementPigIds(
                              Array.from(
                                new Set(
                                  rows
                                    .filter((row) => row.executionStatus === "未接种")
                                    .map((row) => row.sourcePigId)
                                )
                              )
                            );
                          }
                        }
                      : undefined
                  }
                />
              )
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
              children: (
                <Table
                  rowKey="key"
                  columns={pendingColumns}
                  dataSource={pendingRows}
                  pagination={{ pageSize: 8 }}
                  rowSelection={
                    showPendingSupplementAction
                      ? {
                          selectedRowKeys: pendingRows
                            .filter((row) => selectedSupplementPigIds.includes(row.sourcePigId))
                            .map((row) => row.key),
                          getCheckboxProps: (row) => ({
                            disabled: row.executionStatus !== "未接种"
                          }),
                          onChange: (_, rows) => {
                            setSelectedSupplementPigIds(
                              Array.from(
                                new Set(
                                  rows
                                    .filter((row) => row.executionStatus === "未接种")
                                    .map((row) => row.sourcePigId)
                                )
                              )
                            );
                          }
                        }
                      : undefined
                  }
                />
              )
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
              description="删除后任务状态将变为已取消，并同步移除该任务下发到 Mobile 的接种数据。"
              okText="删除"
              cancelText="取消"
              onConfirm={onDelete}
            >
              <Button danger>删除任务</Button>
            </Popconfirm>
          ) : null}
        </div>
      </div>

      {relatedTasks.length > 0 ? (
        <div className="task-related-strip">
          <div className="task-related-strip__head">
            <div className="task-related-strip__title">关联任务</div>
            <Text type="secondary" className="task-related-strip__desc">
              查看本任务与补充接种、重新接种任务之间的关系
            </Text>
          </div>
          <Space size={[8, 8]} wrap className="task-related-strip__links">
            {relatedTasks.map(({ relationLabel, task: relatedTask }) => (
              <Button
                key={`${relationLabel}-${relatedTask.id}`}
                className="task-related-link"
                icon={<LinkOutlined />}
                onClick={() => onOpenRelatedTask?.(relatedTask.id)}
              >
                <span className="task-related-link__relation">{relationLabel}</span>
                <span className="task-related-link__id">{relatedTask.id}</span>
              </Button>
            ))}
          </Space>
        </div>
      ) : null}

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
              <div className="task-detail-progress-label">
                {task.status === "已完成" ? "已接种 / 计划接种" : "接种进度"}
              </div>
              <div className="task-detail-progress-value">{vaccinatedRows.length} / {task.targetCount} 头</div>
            </div>
            <Progress
              percent={progressPercent}
              strokeColor={task.status === "待接种" ? "#94a3b8" : task.status === "接种中" ? "#1677ff" : task.status === "已取消" ? "#ef4444" : "#16a34a"}
              showInfo={false}
            />
          </div>
        </Card>
      </div>

      {reviewEnabled ? (
        <Card className="section-card">
          <Title level={5} className="task-detail-section-title" style={{ marginTop: 0 }}>
            免疫复核设置
          </Title>
          <DetailInfoGrid items={reviewItems} />
        </Card>
      ) : null}

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
          <div className="review-sampling-antibody-summary">
            <div className="review-sampling-antibody-summary__progress">
              <div>
                <div className="review-sampling-summary-label">检测进度</div>
                <div className="review-sampling-antibody-summary__progress-value">
                  {reviewSampledCount} / {reviewSampledCount} 份
                </div>
              </div>
              <div className="review-sampling-antibody-summary__progress-bar">
                <div className="review-sampling-antibody-summary__progress-percent">{reviewProgressPercent}%</div>
                <Progress
                  percent={reviewProgressPercent}
                  size="small"
                  showInfo={false}
                  strokeColor={reviewProgressPercent === 100 ? "#16a34a" : "#1677ff"}
                />
              </div>
            </div>
            <div className="review-sampling-antibody-summary__metrics">
              <div className="review-sampling-antibody-summary__metric review-sampling-antibody-summary__metric--primary">
                <div className="review-sampling-summary-label">当前合格率</div>
                <div className="review-sampling-antibody-summary__metric-value">
                  {reviewQualificationPercent}%
                </div>
                <Text type="secondary">阳性 {reviewQualifiedCount} / 已检测 {reviewSampledCount}</Text>
              </div>
              <div className="review-sampling-antibody-summary__metric">
                <div className="review-sampling-summary-label">阳性数</div>
                <div className="review-sampling-summary-value">{reviewQualifiedCount} 头</div>
              </div>
              <div className="review-sampling-antibody-summary__metric">
                <div className="review-sampling-summary-label">阴性数</div>
                <div className="review-sampling-summary-value">{reviewNegativeCount} 头</div>
              </div>
              <div className="review-sampling-antibody-summary__metric">
                <div className="review-sampling-summary-label">检测结果</div>
                <div className="review-sampling-summary-value">
                  <Tag color={effectTrackingResult?.result === "合格" ? "success" : "error"}>
                    {effectTrackingResult?.result}
                  </Tag>
                </div>
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      <Card className="section-card">
        <div className="task-detail-card-head">
          <Title level={5} className="task-detail-section-title" style={{ marginTop: 0, marginBottom: 0 }}>
            接种猪只列表
          </Title>
          {showPendingSupplementButton && onSupplement ? (
            <Button
              type="primary"
              onClick={() => onSupplement({ pigIds: selectedSupplementPigIds, mode: "pending-only" })}
              disabled={selectedSupplementPigIds.length === 0}
            >
              补充接种{selectedSupplementPigIds.length > 0 ? `（${selectedSupplementPigIds.length}）` : ""}
            </Button>
          ) : null}
          {showPendingSupplementHint ? (
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
        <Tabs items={tabItems} activeKey={activePigTab} onChange={setActivePigTab} />
      </Card>
    </div>
  );
}
