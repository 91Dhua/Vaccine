import { Button, Card, Space, Table, Tabs, Tag, Typography } from "antd";

const { Title, Text } = Typography;

export type TaskRow = {
  id: string;
  taskName: string;
  vaccine: string;
  brand: string;
  dosage: string;
  schedule: string;
  targetCount: number;
  status: "未开始" | "进行中" | "已完成";
  creator: string;
  createdAt: string;
  executor?: string;
  executedAt?: string;
};

interface Props {
  tasks: TaskRow[];
  onCreateTask: () => void;
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
          items={["未开始", "进行中", "已完成"].map((status) => ({
            key: status,
            label: status,
            children: (
              <Table
                rowKey="id"
                dataSource={tasks.filter((task) => task.status === status)}
                pagination={false}
                locale={{ emptyText: "暂无任务" }}
                columns={[
                  { title: "任务名称", dataIndex: "taskName" },
                  { title: "疫苗", dataIndex: "vaccine" },
                  { title: "品牌", dataIndex: "brand" },
                  { title: "剂量", dataIndex: "dosage" },
                  { title: "计划时间", dataIndex: "schedule" },
                  {
                    title: "目标猪只",
                    dataIndex: "targetCount",
                    render: (value) => <Tag color="green">{value} 头</Tag>
                  },
                  ...(status === "未开始"
                    ? [
                        {
                          title: "创建人/时间",
                          dataIndex: "createdAt",
                          render: (_, row) => `${row.creator} / ${row.createdAt}`
                        }
                      ]
                    : [
                        {
                          title: "执行人/时间",
                          dataIndex: "executedAt",
                          render: (_, row) =>
                            `${row.executor || "-"} / ${row.executedAt || "-"}`
                        },
                        {
                          title: "创建人/时间",
                          dataIndex: "createdAt",
                          render: (_, row) => `${row.creator} / ${row.createdAt}`
                        }
                      ])
                ]}
              />
            )
          }))}
        />
      </Card>
    </div>
  );
}
