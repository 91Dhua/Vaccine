import type { ColumnsType } from "antd/es/table";
import { Button, Card, Popconfirm, Progress, Space, Table, Tabs, Tag, Tooltip, Typography } from "antd";
import { DeleteOutlined, EyeOutlined } from "@ant-design/icons";
import type { PlanEffectTrackingResultStored, PlanEffectTrackingStored } from "../planEffectTracking";

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

function resolveActualVaccinatedCount(row: TaskRow): number {
  if (typeof row.actualVaccinatedCount === "number") {
    return row.actualVaccinatedCount;
  }
  if (row.status === "已完成") {
    return Math.max(0, row.targetCount - (row.exemptionHitCount ?? 0));
  }
  return 0;
}

function renderActualPlannedVaccination(row: TaskRow) {
  const actual = resolveActualVaccinatedCount(row);
  const planned = Math.max(row.targetCount, 0);
  const percent = planned > 0 ? Math.min(100, Math.round((actual / planned) * 100)) : 0;

  return (
    <div className="task-vaccination-progress-cell">
      <div className="task-vaccination-progress-value">{actual} / {planned} 头</div>
      <Progress percent={percent} size="small" showInfo={false} strokeColor="#1677ff" />
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
  if (createType === "自动") {
    return <Tag color="processing">自动</Tag>;
  }

  return (
    <div className="task-create-meta-cell">
      <div className="task-create-meta-primary">{row.creator || "—"}</div>
      <Text type="secondary" className="task-create-meta-secondary">
        {row.createdAt || "—"}
      </Text>
    </div>
  );
}

interface Props {
  tasks: TaskRow[];
  onCreateTask: () => void;
  onViewTask?: (taskId: string) => void;
  onDeleteTask?: (taskId: string) => void;
}

function taskTableColumns(
  status: TaskRow["status"],
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
      render: (text: string) => text?.trim() || "—"
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
  const createTypeColumn: ColumnsType<TaskRow>[number] = {
    title: "创建人",
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
  const completionColumns: ColumnsType<TaskRow> =
    status === "已完成"
      ? [
          {
            title: "实际接种 / 计划接种",
            key: "actualPlannedVaccination",
            width: 170,
            sorter: (a, b) => compareNumber(resolveActualVaccinatedCount(a), resolveActualVaccinatedCount(b)),
            render: (_, row) => renderActualPlannedVaccination(row)
          }
        ]
      : [];

  return [
    ...base,
    ...completionColumns,
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

export function VaccineTaskListPage({ onCreateTask, onViewTask, onDeleteTask, tasks }: Props) {
  const tabItems = [
    { key: "待接种", label: "待接种", rows: tasks.filter((task) => task.status === "待接种"), status: "待接种" as const },
    { key: "接种中", label: "接种中", rows: tasks.filter((task) => task.status === "接种中"), status: "接种中" as const },
    { key: "已完成", label: "已完成", rows: tasks.filter((task) => task.status === "已完成"), status: "已完成" as const }
  ];
  return (
    <div>
      <div className="page-header">
        <div>
          <Title level={4} style={{ margin: 0 }}>
            疫苗任务
          </Title>
          <Text type="secondary">查看不同状态下的接种任务</Text>
        </div>
        <Button type="primary" onClick={onCreateTask}>
          创建疫苗任务
        </Button>
      </div>

      <Card className="section-card">
        <Tabs
          defaultActiveKey="待接种"
          items={tabItems.map((tab) => ({
            key: tab.key,
            label: tab.label,
            children: (
              <Table<TaskRow>
                rowKey="id"
                dataSource={tab.rows}
                pagination={false}
                scroll={{ x: "max-content" }}
                locale={{ emptyText: "暂无任务" }}
                columns={taskTableColumns(tab.status, onViewTask, onDeleteTask)}
              />
            )
          }))}
        />
      </Card>
    </div>
  );
}
