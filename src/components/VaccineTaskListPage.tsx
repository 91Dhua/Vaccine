import type { ColumnsType } from "antd/es/table";
import { Button, Card, Popconfirm, Progress, Space, Table, Tabs, Tag, Tooltip, Typography } from "antd";
import { DeleteOutlined, EyeOutlined } from "@ant-design/icons";
import type { PlanEffectTrackingResultStored, PlanEffectTrackingStored } from "../planEffectTracking";
import type { ReviewSamplingTaskRow } from "./ReviewSamplingManagementPage";

const { Title, Text } = Typography;

export type TaskRow = {
  /** 系统生成的任务编号（列表「任务ID」、Mobile batchId、表格 rowKey） */
  id: string;
  vaccine: string;
  brand: string;
  dosageForm?: string;
  /** 接种方式（展示文案，如「肌内注射、皮下注射」） */
  administrationRoute?: string;
  dosage: string;
  schedule: string;
  doseTimes: number;
  /** 多次接种：间隔数值 */
  intervalValue?: number;
  /** 多次接种：间隔单位 */
  intervalUnit?: string;
  /** 免疫间隔期（天）：用于 mobile 执行前提醒 */
  immuneIntervalDays?: number;
  /** 任务结束时实际完成接种的猪只数 */
  actualVaccinatedCount?: number;
  targetCount: number;
  status: "待接种" | "接种中" | "已完成" | "已取消";
  createType: "自动" | "手动";
  creator: string;
  createdAt: string;
  executor?: string;
  executedAt?: string;
  /** Console 下发到 Mobile 的猪只 id（与选猪页 rowKey 一致） */
  pigIds?: string[];
  dosageUnit?: string;
  targetPigGroupLabel?: string;
  exemptionHitCount?: number;
  needsSupplement?: boolean;
  planName?: string;
  planType?: string;
  /** 跟批自动任务所属生产线与批次，例如「一线-保育-BY202602-A01」 */
  productionLineBatch?: string;
  /** 任务详情猪只列表展示用批次与生产线，例如「BY202602-A01-一线-保育」 */
  batchProductionLine?: string;
  planScope?: string;
  dispatchRule?: string;
  planCreatedAt?: string;
  planStatus?: string;
  effectTracking?: PlanEffectTrackingStored;
  effectTrackingResult?: PlanEffectTrackingResultStored;
  supplementSourceTaskId?: string;
  supplementMode?: "pending-only" | "review-full";
  supplementStatus?: "需补打" | "已安排补打";
  supplementReason?: string;
  hasPendingSupplementNeed?: boolean;
  hasReviewSupplementNeed?: boolean;
  hasPendingSupplementCoveredByReview?: boolean;
  arrangedSupplementPigIds?: string[];
};

export type VaccineTaskTypeLabel = "疫苗计划" | "手动创建" | "补充接种" | "重新接种";

function compareText(a?: string, b?: string): number {
  return String(a || "").localeCompare(String(b || ""), "zh-Hans-CN");
}

function compareNumber(a?: number, b?: number): number {
  return Number(a || 0) - Number(b || 0);
}

function compareDateText(a?: string, b?: string): number {
  return new Date(String(a || "")).getTime() - new Date(String(b || "")).getTime();
}

function resolveCreateType(row: TaskRow): TaskRow["createType"] {
  return row.createType || (row.planName ? "自动" : "手动");
}

export function resolveVaccineTaskTypeLabel(row: TaskRow): VaccineTaskTypeLabel {
  if (row.supplementMode === "review-full") return "重新接种";
  if (row.supplementMode === "pending-only") return "补充接种";
  return resolveCreateType(row) === "自动" || row.planName ? "疫苗计划" : "手动创建";
}

function resolveActualVaccinatedCount(row: TaskRow): number {
  if (typeof row.actualVaccinatedCount === "number") {
    return row.actualVaccinatedCount;
  }
  if (row.status === "已完成") {
    return Math.max(0, row.targetCount - (row.exemptionHitCount ?? 0));
  }
  return 0;
}

function isReviewSampleUploaded(sample: ReviewSamplingTaskRow["samples"][number]): boolean {
  return Boolean(sample.result) && Boolean(String(sample.measurementValue || "").trim());
}

function resolveLinkedReviewTask(row: TaskRow, reviewTasks: ReviewSamplingTaskRow[] = []) {
  const linkedTasks = reviewTasks.filter((task) => task.vaccinationTaskId === row.id);
  return linkedTasks.find((task) => task.reviewCategory === "抗体检测") ?? linkedTasks[0];
}

function resolveReviewProgress(row: TaskRow, reviewTasks: ReviewSamplingTaskRow[] = []) {
  if (row.effectTrackingResult) {
    return {
      completed: row.effectTrackingResult.sampledCount,
      total: row.effectTrackingResult.sampledCount,
      percent: 100,
      result: row.effectTrackingResult.result
    };
  }

  const linkedTask = resolveLinkedReviewTask(row, reviewTasks);
  if (linkedTask) {
    const total = linkedTask.sampledCount || linkedTask.samples.length;
    const completed = linkedTask.samples.filter(isReviewSampleUploaded).length;
    const percent = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;
    const positiveCount = linkedTask.samples.filter((sample) => sample.result === "阳性").length;
    const qualificationRatePercent = total > 0 ? Math.round((positiveCount / total) * 100) : 0;
    const result =
      linkedTask.result ??
      (qualificationRatePercent >= linkedTask.thresholdPercent ? "合格" : "不合格");

    return {
      completed,
      total,
      percent,
      result: percent === 100 ? result : undefined
    };
  }

  if (row.effectTracking?.effectTrackingEnabled) {
    return { completed: 0, total: 0, percent: 0, result: undefined };
  }

  return null;
}

function renderTaskIdCell(row: TaskRow, reviewTasks: ReviewSamplingTaskRow[] = []) {
  const reviewProgress = resolveReviewProgress(row, reviewTasks);
  const result = reviewProgress?.percent === 100 ? reviewProgress.result : undefined;

  return (
    <Space size={6} wrap>
      <span>{row.id?.trim() || "—"}</span>
      {result ? <Tag color={result === "合格" ? "success" : "error"}>{result}</Tag> : null}
    </Space>
  );
}

function renderVaccinationProgress(row: TaskRow, showProgress: boolean) {
  const actual = resolveActualVaccinatedCount(row);
  const planned = Math.max(row.targetCount, 0);
  const percent = planned > 0 ? Math.min(100, Math.round((actual / planned) * 100)) : 0;

  return (
    <div className="task-vaccination-progress-cell">
      <div className="task-vaccination-progress-value">{actual} / {planned} 头</div>
      {showProgress ? <Progress percent={percent} size="small" showInfo={false} strokeColor="#1677ff" /> : null}
    </div>
  );
}

function renderReviewProgress(row: TaskRow, reviewTasks: ReviewSamplingTaskRow[] = []) {
  const reviewProgress = resolveReviewProgress(row, reviewTasks);
  if (!reviewProgress) return "—";

  return (
    <div className="task-vaccination-progress-cell">
      <div className="task-vaccination-progress-value">
        {reviewProgress.total > 0
          ? `${reviewProgress.completed} / ${reviewProgress.total} 份`
          : "0 / 0 份"}
      </div>
      <Progress
        percent={reviewProgress.percent}
        size="small"
        showInfo={false}
        strokeColor={reviewProgress.percent === 100 ? "#16a34a" : "#1677ff"}
      />
    </div>
  );
}

function renderTaskVaccineMethodCell(record: TaskRow) {
  return (
    <div className="plan-vaccine-method-cell">
      <div className="plan-vaccine-method-primary">{record.vaccine || "—"}</div>
      <Text type="secondary" className="plan-vaccine-method-secondary">
        {record.administrationRoute || "—"}
      </Text>
    </div>
  );
}

function renderCreateTypeCell(row: TaskRow) {
  const createType = resolveCreateType(row);

  return (
    <div className="task-create-meta-cell">
      <div className="task-create-meta-primary">{createType === "自动" ? "系统" : row.creator || "—"}</div>
      <Text type="secondary" className="task-create-meta-secondary">
        {row.createdAt || "—"}
      </Text>
    </div>
  );
}

function renderTaskTypeCell(row: TaskRow) {
  const taskType = resolveVaccineTaskTypeLabel(row);
  const color =
    taskType === "疫苗计划"
      ? "blue"
      : taskType === "手动创建"
        ? "default"
        : taskType === "补充接种"
          ? "gold"
          : "purple";

  return <Tag color={color}>{taskType}</Tag>;
}

function taskStatusTone(status: TaskRow["status"]) {
  if (status === "待接种") return "pending";
  if (status === "接种中") return "active";
  if (status === "已完成") return "done";
  return "cancelled";
}

function taskStatusTagColor(status: TaskRow["status"]) {
  if (status === "待接种") return "default";
  if (status === "接种中") return "processing";
  if (status === "已完成") return "success";
  return "error";
}

function renderDoseSchedule(row: TaskRow) {
  if (row.doseTimes <= 1) return "单次接种";
  return `${row.doseTimes} 次接种 · 间隔 ${row.intervalValue ?? "-"} ${row.intervalUnit ?? ""}`.trim();
}

function VaccineTaskWorkbenchCard({
  task,
  reviewTasks,
  onViewTask,
  onDeleteTask
}: {
  task: TaskRow;
  reviewTasks: ReviewSamplingTaskRow[];
  onViewTask?: (taskId: string) => void;
  onDeleteTask?: (taskId: string) => void;
}) {
  const actual = resolveActualVaccinatedCount(task);
  const planned = Math.max(task.targetCount, 0);
  const percent = planned > 0 ? Math.min(100, Math.round((actual / planned) * 100)) : 0;
  const reviewProgress = resolveReviewProgress(task, reviewTasks);
  const taskType = resolveVaccineTaskTypeLabel(task);

  return (
    <div className={`vaccine-task-work-card is-${taskStatusTone(task.status)}`}>
      <div className="vaccine-task-work-card__head">
        <div>
          <div className="vaccine-task-work-card__title-row">
            <Title level={5}>{task.vaccine}</Title>
            <Tag color={taskStatusTagColor(task.status)}>{task.status}</Tag>
          </div>
          <Text type="secondary">{task.brand || "未填写品牌"} · {task.dosageForm || task.administrationRoute || "接种任务"}</Text>
        </div>
        <Button type="link" onClick={() => onViewTask?.(task.id)}>
          {task.status === "待接种" ? "查看任务" : "进入详情"}
        </Button>
      </div>

      <div className="vaccine-task-work-card__meta">
        <div>
          <span>接种方式</span>
          <strong>{task.administrationRoute || "—"}</strong>
        </div>
        <div>
          <span>剂量</span>
          <strong>{task.dosage}</strong>
        </div>
        <div>
          <span>接种日期</span>
          <strong>{task.schedule}</strong>
        </div>
      </div>

      <div className="vaccine-task-work-card__note">
        <span>{renderDoseSchedule(task)}</span>
        <span>{task.targetPigGroupLabel || task.productionLineBatch || `${task.targetCount} 头猪`}</span>
      </div>

      <div className="vaccine-task-work-card__rows">
        <button type="button" onClick={() => onViewTask?.(task.id)}>
          <span>{task.doseTimes > 1 ? `1/${task.doseTimes} 剂次` : "1/1 剂次"}</span>
          <strong>{task.targetCount} 头猪</strong>
          <em>{task.status === "已完成" ? "已完成" : task.status === "接种中" ? "继续执行" : "可执行"} ›</em>
        </button>
      </div>

      <div className="vaccine-task-work-card__footer">
        <div className="vaccine-task-work-card__progress">
          <span>{task.status === "已完成" ? "完成情况" : "接种进度"}</span>
          <strong>{actual} / {planned} 头</strong>
          <Progress percent={percent} size="small" showInfo={false} strokeColor={task.status === "已完成" ? "#2FA872" : "#43B883"} />
        </div>
        <Space size={8} wrap>
          {renderTaskTypeCell(task)}
          {reviewProgress ? (
            <Tag color={reviewProgress.result === "不合格" ? "error" : "green"}>
              复核 {reviewProgress.total > 0 ? `${reviewProgress.completed}/${reviewProgress.total}` : "已配置"}
            </Tag>
          ) : null}
          {task.status === "待接种" && onDeleteTask ? (
            <Popconfirm
              title="删除接种任务"
              description="删除后任务状态将变为已取消，并同步移除该任务下发到 Mobile 的接种数据。"
              okText="删除"
              cancelText="取消"
              onConfirm={() => onDeleteTask(task.id)}
            >
              <Button type="text" danger icon={<DeleteOutlined />}>删除</Button>
            </Popconfirm>
          ) : null}
        </Space>
      </div>
    </div>
  );
}

interface Props {
  tasks: TaskRow[];
  reviewTasks?: ReviewSamplingTaskRow[];
  onCreateTask: () => void;
  onViewTask?: (taskId: string) => void;
  onDeleteTask?: (taskId: string) => void;
}

function taskTableColumns(
  status: TaskRow["status"],
  reviewTasks: ReviewSamplingTaskRow[] = [],
  onViewTask?: (taskId: string) => void,
  onDeleteTask?: (taskId: string) => void
): ColumnsType<TaskRow> {
  const base: ColumnsType<TaskRow> = [
    {
      title: "任务ID",
      dataIndex: "id",
      key: "taskId",
      width: 200,
      fixed: "left",
      ellipsis: true,
      sorter: (a, b) => compareText(a.id, b.id),
      render: (_, row) => renderTaskIdCell(row, reviewTasks)
    },
    {
      title: "疫苗 / 接种方式",
      key: "vaccineMethod",
      width: 180,
      sorter: (a, b) => compareText(a.vaccine, b.vaccine),
      render: (_, row) => renderTaskVaccineMethodCell(row)
    },
    { title: "接种日期", dataIndex: "schedule", key: "schedule", width: 120, sorter: (a, b) => compareDateText(a.schedule, b.schedule) },
    {
      title: "目标猪只",
      dataIndex: "targetCount",
      key: "targetCount",
      width: 110,
      sorter: (a, b) => compareNumber(a.targetCount, b.targetCount),
      render: (value) => <Tag color="green">{value} 头</Tag>
    }
  ];
  const taskTypeColumn: ColumnsType<TaskRow>[number] = {
    title: "任务类型",
    dataIndex: "taskType",
    key: "taskType",
    width: 132,
    filters: [
      { text: "疫苗计划", value: "疫苗计划" },
      { text: "手动创建", value: "手动创建" },
      { text: "补充接种", value: "补充接种" },
      { text: "重新接种", value: "重新接种" }
    ],
    onFilter: (value, record) => resolveVaccineTaskTypeLabel(record) === value,
    sorter: (a, b) => compareText(resolveVaccineTaskTypeLabel(a), resolveVaccineTaskTypeLabel(b)),
    render: (_, row) => renderTaskTypeCell(row)
  };
  const createTypeColumn: ColumnsType<TaskRow>[number] = {
    title: "创建人/时间",
    dataIndex: "createType",
    key: "createType",
    width: 150,
    filters: [
      { text: "自动", value: "自动" },
      { text: "手动", value: "手动" }
    ],
    onFilter: (value, record) => resolveCreateType(record) === value,
    sorter: (a, b) => compareText(resolveCreateType(a), resolveCreateType(b)),
    render: (_, row) => renderCreateTypeCell(row)
  };
  if (status === "待接种") {
    return [
      ...base,
      taskTypeColumn,
      createTypeColumn,
      {
        title: "操作",
        key: "actions",
        width: 100,
        align: "center",
        fixed: "right",
        render: (_, row) =>
          (
            <Space size={12}>
              <Tooltip title="查看详情">
                <Button
                  type="text"
                  icon={<EyeOutlined />}
                  className="icon-btn"
                  onClick={() => onViewTask?.(row.id)}
                />
              </Tooltip>
              {onDeleteTask ? (
                <Popconfirm
                  title="删除接种任务"
                  description="删除后任务状态将变为已取消，并同步移除该任务下发到 Mobile 的接种数据。"
                  okText="删除"
                  cancelText="取消"
                  onConfirm={() => onDeleteTask(row.id)}
                >
                  <Tooltip title="删除">
                    <Button type="text" danger icon={<DeleteOutlined />} className="icon-btn" />
                  </Tooltip>
                </Popconfirm>
              ) : null}
            </Space>
          )
      }
    ];
  }
  const progressColumns: ColumnsType<TaskRow> =
    status === "接种中"
      ? [
          {
            title: "接种进度",
            key: "vaccinationProgress",
            width: 170,
            sorter: (a, b) => compareNumber(resolveActualVaccinatedCount(a), resolveActualVaccinatedCount(b)),
            render: (_, row) => renderVaccinationProgress(row, true)
          }
        ]
      : status === "已完成"
      ? [
          {
            title: "已接种 / 计划接种",
            key: "actualPlannedVaccination",
            width: 170,
            sorter: (a, b) => compareNumber(resolveActualVaccinatedCount(a), resolveActualVaccinatedCount(b)),
            render: (_, row) => renderVaccinationProgress(row, false)
          },
          {
            title: "检测进度",
            key: "reviewProgress",
            width: 170,
            sorter: (a, b) =>
              compareNumber(
                resolveReviewProgress(a, reviewTasks)?.percent,
                resolveReviewProgress(b, reviewTasks)?.percent
              ),
            render: (_, row) => renderReviewProgress(row, reviewTasks)
          }
        ]
      : [];

  return [
    ...base,
    ...progressColumns,
    taskTypeColumn,
    {
      ...createTypeColumn
    },
    {
      title: "操作",
      key: "actions",
      width: 76,
      align: "center",
      fixed: "right",
      render: (_, row) => (
        <Tooltip title="查看详情">
          <Button
            type="text"
            icon={<EyeOutlined />}
            className="icon-btn"
            onClick={() => onViewTask?.(row.id)}
          />
        </Tooltip>
      )
    }
  ];
}

export function VaccineTaskListPage({ onCreateTask, onViewTask, onDeleteTask, tasks, reviewTasks = [] }: Props) {
  const tabItems = [
    { key: "待接种", label: "待接种", rows: tasks.filter((task) => task.status === "待接种"), status: "待接种" as const },
    { key: "接种中", label: "接种中", rows: tasks.filter((task) => task.status === "接种中"), status: "接种中" as const },
    { key: "已完成", label: "已完成", rows: tasks.filter((task) => task.status === "已完成"), status: "已完成" as const }
  ];
  const totalPending = tabItems.find((item) => item.key === "待接种")?.rows.length ?? 0;
  const totalActive = tabItems.find((item) => item.key === "接种中")?.rows.length ?? 0;
  const totalDone = tabItems.find((item) => item.key === "已完成")?.rows.length ?? 0;

  return (
    <div className="vaccine-task-workbench">
      <div className="vaccine-task-mobile-head">
        <div>
          <Text type="secondary">Zone1 - Farrowing</Text>
          <Title level={4}>疫苗任务</Title>
          <Text type="secondary">按原健康与治疗任务结构查看、执行和追踪接种任务</Text>
        </div>
        <Button type="primary" onClick={onCreateTask}>
          创建疫苗任务
        </Button>
      </div>

      <div className="vaccine-task-summary-strip">
        <div>
          <span>待接种</span>
          <strong>{totalPending}</strong>
        </div>
        <div>
          <span>接种中</span>
          <strong>{totalActive}</strong>
        </div>
        <div>
          <span>已完成</span>
          <strong>{totalDone}</strong>
        </div>
      </div>

      <Card className="section-card vaccine-task-workbench-card">
        <Tabs
          defaultActiveKey="待接种"
          items={tabItems.map((tab) => ({
            key: tab.key,
            label: `${tab.label} ${tab.rows.length}`,
            children: (
              <div className="vaccine-task-work-list">
                {tab.rows.length > 0 ? (
                  tab.rows.map((task) => (
                    <VaccineTaskWorkbenchCard
                      key={task.id}
                      task={task}
                      reviewTasks={reviewTasks}
                      onViewTask={onViewTask}
                      onDeleteTask={onDeleteTask}
                    />
                  ))
                ) : (
                  <div className="vaccine-task-empty">暂无{tab.label}任务</div>
                )}
              </div>
            )
          }))}
        />
      </Card>
    </div>
  );
}
