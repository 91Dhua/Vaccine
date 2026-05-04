import type { ColumnsType } from "antd/es/table";
import { Button, Card, Popconfirm, Space, Table, Tabs, Tag, Typography } from "antd";

const { Title, Text } = Typography;

export type TaskRow = {
  /** 系统生成的任务编号（列表「任务ID」、Mobile batchId、表格 rowKey） */
  id: string;
  vaccine: string;
  brand: string;
  /** 剂型（展示，来自疫苗目录 + 品牌） */
  dosageForm?: string;
  /** 接种方式（展示文案，如「肌内注射、皮下注射」） */
  administrationRoute?: string;
  dosage: string;
  schedule: string;
  /** 剂次（与创建页「剂次」一致） */
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
};

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
      render: (text: string, row) => (
        <Space size={8} wrap>
          <span>{text?.trim() || "—"}</span>
          {row.status === "已完成" && row.needsSupplement ? <Tag color="gold">需补打</Tag> : null}
        </Space>
      )
    },
    { title: "疫苗", dataIndex: "vaccine", key: "vaccine", width: 140, ellipsis: true },
    { title: "品牌", dataIndex: "brand", key: "brand", width: 120, ellipsis: true },
    {
      title: "剂型",
      dataIndex: "dosageForm",
      key: "dosageForm",
      width: 130,
      ellipsis: true,
      render: (v) => v || "—"
    },
    {
      title: "接种方式",
      dataIndex: "administrationRoute",
      key: "administrationRoute",
      width: 140,
      ellipsis: true,
      render: (v) => v || "—"
    },
    { title: "剂量", dataIndex: "dosage", key: "dosage", width: 120 },
    {
      title: "剂次",
      dataIndex: "doseTimes",
      key: "doseTimes",
      width: 72,
      render: (n: number) => `${n ?? 1} 次`
    },
    { title: "接种日期", dataIndex: "schedule", key: "schedule", width: 120 },
    {
      title: "目标猪只",
      dataIndex: "targetCount",
      key: "targetCount",
      width: 110,
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
  return [
    ...base,
    {
      title: "执行人/时间",
      key: "executorAt",
      width: 200,
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
          items={(["待接种", "进行中", "已完成"] as const).map((status) => ({
            key: status,
            label: status,
            children: (
              <Table<TaskRow>
                rowKey="id"
                dataSource={tasks.filter((task) => task.status === status)}
                pagination={false}
                scroll={{ x: "max-content" }}
                locale={{ emptyText: "暂无任务" }}
                columns={taskTableColumns(status, onViewTask, onDeleteTask)}
              />
            )
          }))}
        />
      </Card>
    </div>
  );
}
