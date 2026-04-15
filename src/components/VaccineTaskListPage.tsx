import type { ColumnsType } from "antd/es/table";
import { Button, Card, Table, Tabs, Tag, Typography } from "antd";

const { Title, Text } = Typography;

export type TaskRow = {
  /** 系统生成的任务编号（列表「任务ID」、Mobile batchId、表格 rowKey） */
  id: string;
  vaccine: string;
  brand: string;
  /** 剂型（展示，来自疫苗目录 + 品牌） */
  dosageForm?: string;
  /** 接种途径（展示文案，如「肌内注射、皮下注射」） */
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
  status: "未开始" | "进行中" | "已完成";
  creator: string;
  createdAt: string;
  executor?: string;
  executedAt?: string;
  /** Console 下发到 Mobile 的猪只 id（与选猪页 rowKey 一致） */
  pigIds?: string[];
  dosageUnit?: string;
  targetPigGroupLabel?: string;
  exemptionHitCount?: number;
};

interface Props {
  tasks: TaskRow[];
  onCreateTask: () => void;
}

function taskTableColumns(status: TaskRow["status"]): ColumnsType<TaskRow> {
  const base: ColumnsType<TaskRow> = [
    {
      title: "任务ID",
      dataIndex: "id",
      key: "taskId",
      width: 200,
      fixed: "left",
      ellipsis: true,
      render: (text: string) => text?.trim() || "—"
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
      title: "接种途径",
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
    {
      title: "间隔",
      key: "interval",
      width: 120,
      render: (_, row) =>
        row.intervalValue != null && row.intervalUnit
          ? `${row.intervalValue} ${row.intervalUnit}`
          : "—"
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
  if (status === "未开始") {
    return [
      ...base,
      {
        title: "创建人/时间",
        key: "creatorAt",
        width: 200,
        render: (_, row) => `${row.creator} / ${row.createdAt}`
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
    }
  ];
}

export function VaccineTaskListPage({ onCreateTask, tasks }: Props) {
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
          defaultActiveKey="未开始"
          items={(["未开始", "进行中", "已完成"] as const).map((status) => ({
            key: status,
            label: status,
            children: (
              <Table<TaskRow>
                rowKey="id"
                dataSource={tasks.filter((task) => task.status === status)}
                pagination={false}
                scroll={{ x: "max-content" }}
                locale={{ emptyText: "暂无任务" }}
                columns={taskTableColumns(status)}
              />
            )
          }))}
        />
      </Card>
    </div>
  );
}
