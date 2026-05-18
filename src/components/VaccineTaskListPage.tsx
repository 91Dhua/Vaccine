import { useMemo, useState } from "react";
import type { ColumnsType } from "antd/es/table";
import { Button, Card, Popconfirm, Segmented, Space, Table, Tabs, Tag, Typography } from "antd";
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
  targetCount: number;
  status: "待接种" | "进行中" | "已完成";
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
  planScope?: string;
  dispatchRule?: string;
  planCreatedAt?: string;
  planStatus?: string;
  effectTracking?: PlanEffectTrackingStored;
  effectTrackingResult?: PlanEffectTrackingResultStored;
  supplementSourceTaskId?: string;
  supplementMode?: "pending-only" | "review-full";
  supplementStatus?: "需补打" | "补打处理中" | "补打已完成";
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
    { title: "疫苗", dataIndex: "vaccine", key: "vaccine", width: 140, ellipsis: true, sorter: (a, b) => compareText(a.vaccine, b.vaccine) },
    { title: "品牌", dataIndex: "brand", key: "brand", width: 120, ellipsis: true, sorter: (a, b) => compareText(a.brand, b.brand) },
    {
      title: "接种方式",
      dataIndex: "administrationRoute",
      key: "administrationRoute",
      width: 140,
      ellipsis: true,
      sorter: (a, b) => compareText(a.administrationRoute, b.administrationRoute),
      render: (v) => v || "—"
    },
    { title: "剂量", dataIndex: "dosage", key: "dosage", width: 120, sorter: (a, b) => compareText(a.dosage, b.dosage) },
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
  if (status === "待接种") {
    return [
      ...base,
      {
        title: "创建人/时间",
        key: "creatorAt",
        width: 200,
        sorter: (a, b) => compareDateText(a.createdAt, b.createdAt),
        render: (_, row) => `${row.creator} / ${row.createdAt}`
      },
      {
        title: "操作",
        key: "actions",
        width: 180,
        fixed: "right",
        render: (_, row) =>
          (
            <Space size={12}>
              <Button
                type="link"
                style={{ paddingInline: 0 }}
                onClick={() => onViewTask?.(row.id)}
              >
                查看详情
              </Button>
              {onDeleteTask ? (
                <Popconfirm
                  title="删除接种任务"
                  description="删除后会同步移除该任务下发到 Mobile 的接种数据。"
                  okText="删除"
                  cancelText="取消"
                  onConfirm={() => onDeleteTask(row.id)}
                >
                  <Button type="link" danger style={{ paddingInline: 0 }}>
                    删除
                  </Button>
                </Popconfirm>
              ) : null}
            </Space>
          )
      }
    ];
  }
  const supplementColumns: ColumnsType<TaskRow> =
    status === "已完成"
      ? [
          {
            title: "补打状态",
            dataIndex: "supplementStatus",
            key: "supplementStatus",
            width: 120,
            filters: [
              { text: "需补打", value: "需补打" },
              { text: "补打处理中", value: "补打处理中" },
              { text: "补打已完成", value: "补打已完成" }
            ],
            onFilter: (value, record) => record.supplementStatus === value,
            render: (value?: TaskRow["supplementStatus"]) =>
              value ? (
                <Tag
                  color={
                    value === "需补打" ? "gold" : value === "补打处理中" ? "processing" : "success"
                  }
                >
                  {value}
                </Tag>
              ) : (
                "—"
              )
          },
          {
            title: "补打原因",
            dataIndex: "supplementReason",
            key: "supplementReason",
            width: 180,
            ellipsis: true,
            filters: [
              { text: "未接种", value: "未接种" },
              { text: "复核不合格", value: "复核不合格" }
            ],
            onFilter: (value, record) => String(record.supplementReason || "").includes(String(value)),
            render: (value?: string) => value || "—"
          }
        ]
      : [];

  return [
    ...base,
    ...supplementColumns,
    {
      title: "执行人/时间",
      key: "executorAt",
      width: 200,
      sorter: (a, b) => compareDateText(a.executedAt, b.executedAt),
      render: (_, row) => `${row.executor || "-"} / ${row.executedAt || "-"}`
    },
    {
      title: "创建人/时间",
      key: "createdAt2",
      width: 200,
      render: (_, row) => `${row.creator} / ${row.createdAt}`
    },
    {
      title: "操作",
      key: "actions",
      width: 120,
      fixed: "right",
      render: (_, row) => (
        <Button
          type="link"
          style={{ paddingInline: 0 }}
          onClick={() => onViewTask?.(row.id)}
        >
          查看详情
        </Button>
      )
    }
  ];
}

export function VaccineTaskListPage({ onCreateTask, onViewTask, onDeleteTask, tasks }: Props) {
  const [completedFilter, setCompletedFilter] = useState<"all" | "needSupplement">("all");
  const completedRows = useMemo(() => {
    const rows = tasks.filter((task) => task.status === "已完成");
    return completedFilter === "needSupplement"
      ? rows.filter((task) => task.supplementStatus === "需补打")
      : rows;
  }, [completedFilter, tasks]);
  const tabItems = [
    { key: "待接种", label: "待接种", rows: tasks.filter((task) => task.status === "待接种"), status: "待接种" as const },
    { key: "进行中", label: "进行中", rows: tasks.filter((task) => task.status === "进行中"), status: "进行中" as const },
    { key: "已完成", label: "已完成", rows: completedRows, status: "已完成" as const }
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
              <>
                {tab.key === "已完成" ? (
                  <div style={{ marginBottom: 16, display: "flex", justifyContent: "flex-end" }}>
                    <Segmented
                      value={completedFilter}
                      onChange={(value) => setCompletedFilter(value as "all" | "needSupplement")}
                      options={[
                        { label: "全部", value: "all" },
                        { label: "仅看需补打", value: "needSupplement" }
                      ]}
                    />
                  </div>
                ) : null}
                <Table<TaskRow>
                  rowKey="id"
                  dataSource={tab.rows}
                  pagination={false}
                  scroll={{ x: "max-content" }}
                  locale={{ emptyText: "暂无任务" }}
                  columns={taskTableColumns(tab.status, onViewTask, onDeleteTask)}
                />
              </>
            )
          }))}
        />
      </Card>
    </div>
  );
}
