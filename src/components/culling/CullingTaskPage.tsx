import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Drawer,
  Input,
  Modal,
  Progress,
  Space,
  Table,
  Tabs,
  Tag,
  Timeline,
  Typography,
  message
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  BellOutlined,
  CheckCircleOutlined,
  ExportOutlined,
  LinkOutlined,
  NodeIndexOutlined,
  RocketOutlined
} from "@ant-design/icons";
import {
  cullingTaskStatusColors,
  cullingTaskStatusLabels,
  destinationMethodLabels,
  seedCullingTasks
} from "./workflowData";
import type {
  CullingTaskSow,
  CullingTaskStatus,
  CullingWorkflowTask,
  DestinationMethod,
  SlotReleaseStatus
} from "./workflowTypes";
import "./CullingTaskPage.css";

const { Text, Title } = Typography;

const statusOrder: CullingTaskStatus[] = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "PENDING_DESTINATION_ASSIGNMENT",
  "DESTINATION_ASSIGNED"
];

function taskTypeLabel(task: CullingWorkflowTask) {
  return task.taskType === "CULLING_REVIEW_TASK" ? "淘汰复核" : "去向执行";
}

function fieldDecisionLabel(decision: CullingTaskSow["fieldDecision"]) {
  const labels = {
    NOT_REVIEWED: "未复核",
    FIELD_CONFIRMED: "现场确认",
    FIELD_CONTESTED: "建议保留",
    IDENTITY_REVIEW_REQUIRED: "身份异常"
  } as const;
  return labels[decision];
}

function buildNextTaskState(task: CullingWorkflowTask): CullingWorkflowTask {
  if (task.status === "NOT_STARTED") {
    return { ...task, status: "IN_PROGRESS", nextAction: "等待 Mobile 提交复核结果" };
  }

  if (task.status === "IN_PROGRESS") {
    const confirmed = task.sows.filter((sow) => sow.fieldDecision === "FIELD_CONFIRMED").length;
    return {
      ...task,
      status: "PENDING_DESTINATION_ASSIGNMENT",
      fieldConfirmedCount: confirmed,
      nextAction: "确认淘汰名单并分配去向"
    };
  }

  if (task.status === "PENDING_CAPACITY_RESOLUTION") {
    return {
      ...task,
      status: "PENDING_DESTINATION_ASSIGNMENT",
      capacityGap: 0,
      nextAction: "栏位缺口已处理，为淘汰猪分配去向"
    };
  }

  if (task.status === "DESTINATION_ASSIGNED") {
    return {
      ...task,
      status: "COMPLETED",
      capacityGap: 0,
      destinationPendingCount: 0,
      nextAction: "查看淘汰记录"
    };
  }

  return task;
}

export function CullingTaskPage() {
  const [tasks, setTasks] = useState<CullingWorkflowTask[]>(seedCullingTasks);
  const [activeStatus, setActiveStatus] = useState<CullingTaskStatus | "ALL">("ALL");
  const [taskIdQuery, setTaskIdQuery] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState(seedCullingTasks[0]?.id);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  const filteredTasks = useMemo(() => {
    const normalizedQuery = taskIdQuery.trim().toLowerCase();
    return tasks.filter((task) => {
      const hitStatus = activeStatus === "ALL" || task.status === activeStatus;
      const hitQuery = !normalizedQuery || task.id.toLowerCase().includes(normalizedQuery);
      return hitStatus && hitQuery;
    });
  }, [tasks, activeStatus, taskIdQuery]);

  const statusCounts = useMemo(() => {
    const counts = Object.fromEntries(statusOrder.map((status) => [status, 0])) as Record<CullingTaskStatus, number>;
    tasks.forEach((task) => {
      counts[task.status] += 1;
    });
    return counts;
  }, [tasks]);

  const selectedTask = tasks.find((task) => task.id === selectedTaskId) || tasks[0];

  const summary = useMemo(
    () => ({
      notStarted: tasks.filter((task) => task.status === "NOT_STARTED").length,
      active: tasks.filter((task) => task.status === "IN_PROGRESS").length,
      pendingDestination: tasks.filter((task) => task.status === "PENDING_DESTINATION_ASSIGNMENT").length,
      completed: tasks.filter((task) => task.status === "COMPLETED").length
    }),
    [tasks]
  );

  const updateTask = (id: string, updater: (task: CullingWorkflowTask) => CullingWorkflowTask) => {
    setTasks((prev) => prev.map((task) => (task.id === id ? updater(task) : task)));
  };

  const advanceTask = (task: CullingWorkflowTask) => {
    updateTask(task.id, buildNextTaskState);
    message.success("任务状态已推进，通知与决策模块将同步触达相关用户。");
  };

  const assignDestination = (destination: DestinationMethod) => {
    if (!selectedTask) return;

    updateTask(selectedTask.id, (task) => {
      const generatedTaskId =
        destination === "SALE" || destination === "TRANSFER_OUT_OF_FARM"
          ? `OUT-${Date.now().toString().slice(-6)}`
          : destination === "INTERNAL_TRANSFER" || destination === "MOVE_TO_HOLDING"
            ? `TR-${Date.now().toString().slice(-6)}`
            : `SL-${Date.now().toString().slice(-6)}`;

      const updatedSows = task.sows.map((sow): CullingTaskSow => {
        if (sow.fieldDecision !== "FIELD_CONFIRMED") return sow;
        return {
          ...sow,
          destinationMethod: destination,
          linkedTaskId: generatedTaskId,
          slotReleaseStatus: "SCHEDULED_RELEASE"
        };
      });

      return {
        ...task,
        status: "DESTINATION_ASSIGNED",
        destinationPendingCount: 0,
        linkedOutboundTasks: [...new Set([...task.linkedOutboundTasks, generatedTaskId])],
        nextAction: "等待去向执行任务完成",
        sows: updatedSows
      };
    });

    setAssignOpen(false);
    message.success(`已分配去向：${destinationMethodLabels[destination]}`);
  };

  const columns: ColumnsType<CullingWorkflowTask> = [
    {
      title: "任务",
      dataIndex: "id",
      render: (_, task) => (
        <div>
          <Button
            type="link"
            className="culling-task-link"
            onClick={() => {
              setSelectedTaskId(task.id);
              setDrawerOpen(true);
            }}
          >
            {task.id}
          </Button>
          <div className="task-muted">{task.batch} · {taskTypeLabel(task)}</div>
        </div>
      )
    },
    {
      title: "状态",
      dataIndex: "status",
      render: (status: CullingTaskStatus) => (
        <Tag color={cullingTaskStatusColors[status]}>{cullingTaskStatusLabels[status]}</Tag>
      )
    },
    { title: "计划", dataIndex: "plannedTarget", render: (value) => `${value} 头` },
    { title: "建议", dataIndex: "recommendedCount", render: (value) => `${value} 头` },
    { title: "现场确认", dataIndex: "fieldConfirmedCount", render: (value) => `${value} 头` },
    { title: "待分配", dataIndex: "destinationPendingCount", render: (value) => `${value} 头` },
    {
      title: "操作",
      render: (_, task) => (
        <Space>
          <Button size="small" onClick={() => { setSelectedTaskId(task.id); setDrawerOpen(true); }}>
            详情
          </Button>
          {task.status === "PENDING_DESTINATION_ASSIGNMENT" && (
            <Button size="small" type="primary" onClick={() => { setSelectedTaskId(task.id); setAssignOpen(true); }}>
              分配去向
            </Button>
          )}
        </Space>
      )
    }
  ];

  const sowColumns: ColumnsType<CullingTaskSow> = [
    {
      title: "母猪",
      dataIndex: "sowTag",
      render: (_, sow) => (
        <Space size={6} wrap>
          <Text strong>{sow.sowTag}</Text>
          {sow.fieldDecision === "NOT_REVIEWED" && sow.isRecommended ? (
            <Tag color="orange">建议淘汰</Tag>
          ) : (
            <Tag color={sow.fieldDecision === "FIELD_CONFIRMED" ? "success" : sow.fieldDecision === "FIELD_CONTESTED" ? "warning" : sow.fieldDecision === "IDENTITY_REVIEW_REQUIRED" ? "error" : "default"}>
              {fieldDecisionLabel(sow.fieldDecision)}
            </Tag>
          )}
          <Tag>{sow.source === "MANAGER_SELECTED" ? "管理者指定" : "系统推荐"}</Tag>
        </Space>
      )
    },
    { title: "胎次", dataIndex: "parity", width: 72 },
    { title: "位置", dataIndex: "pen" },
    {
      title: "现场结论",
      dataIndex: "fieldDecision",
      render: (value) => fieldDecisionLabel(value)
    },
    {
      title: "去向",
      dataIndex: "destinationMethod",
      render: (value?: DestinationMethod) => value ? destinationMethodLabels[value] : "未分配"
    },
    {
      title: "关联任务",
      dataIndex: "linkedTaskId",
      render: (value?: string) => value ? <Tag icon={<LinkOutlined />}>{value}</Tag> : "-"
    }
  ];

  return (
    <div className="culling-task-page">
      <section className="task-hero">
        <div>
          <div className="task-eyebrow">Culling Control Tower</div>
          <Title level={3} className="task-title">淘汰任务</Title>
          <Text type="secondary">管理淘汰复核、去向分配和出售/转舍联动。</Text>
        </div>
        <Space wrap>
          <Button icon={<BellOutlined />}>通知与决策</Button>
          <Button icon={<ExportOutlined />}>导出记录</Button>
        </Space>
      </section>

      <section className="task-summary-grid">
        <Card><div className="task-stat-label">未开始</div><div className="task-stat-value">{summary.notStarted}</div></Card>
        <Card><div className="task-stat-label">进行中</div><div className="task-stat-value">{summary.active}</div></Card>
        <Card><div className="task-stat-label">待分配去向</div><div className="task-stat-value warn">{summary.pendingDestination}</div></Card>
        <Card><div className="task-stat-label">已完成</div><div className="task-stat-value success">{summary.completed}</div></Card>
      </section>

      <Card className="task-table-card">
        <div className="task-toolbar">
          <Input.Search
            allowClear
            placeholder="搜索任务编号"
            value={taskIdQuery}
            onChange={(event) => setTaskIdQuery(event.target.value)}
            className="task-search"
          />
          <Space wrap>
            <Tag color="blue">Review / Handling 分任务管理</Tag>
            <Tag color="orange">去向可批量设置，也可按猪覆盖</Tag>
          </Space>
        </div>
        <Tabs
          activeKey={activeStatus}
          onChange={(key) => setActiveStatus(key as CullingTaskStatus | "ALL")}
          items={[
            { key: "ALL", label: `全部 ${tasks.length}` },
            ...statusOrder.map((status) => ({
              key: status,
              label: `${cullingTaskStatusLabels[status]} ${statusCounts[status]}`
            }))
          ]}
        />
        <Table rowKey="id" dataSource={filteredTasks} columns={columns} pagination={false} />
      </Card>

      <Drawer
        open={drawerOpen}
        width={820}
        onClose={() => setDrawerOpen(false)}
        title={selectedTask ? `${selectedTask.id} · ${taskTypeLabel(selectedTask)}` : "任务详情"}
        extra={selectedTask && (
          <Space>
            {selectedTask.status !== "COMPLETED" && selectedTask.status !== "CANCELLED" && (
              <Button icon={<RocketOutlined />} onClick={() => advanceTask(selectedTask)}>
                推进状态
              </Button>
            )}
            {selectedTask.status === "PENDING_DESTINATION_ASSIGNMENT" && (
              <Button type="primary" onClick={() => setAssignOpen(true)}>分配去向</Button>
            )}
          </Space>
        )}
      >
        {selectedTask && (
          <div className="task-detail">
            <div className="task-detail-grid">
              <Card size="small"><div className="task-stat-label">计划淘汰</div><div className="task-stat-value">{selectedTask.plannedTarget}</div></Card>
              <Card size="small"><div className="task-stat-label">现场确认</div><div className="task-stat-value">{selectedTask.fieldConfirmedCount}</div></Card>
              <Card size="small"><div className="task-stat-label">最终确认</div><div className="task-stat-value">{selectedTask.finalConfirmedCount}</div></Card>
              <Card size="small"><div className="task-stat-label">待分配</div><div className="task-stat-value warn">{selectedTask.destinationPendingCount}</div></Card>
            </div>

            <Card title="任务进度" className="task-section-card">
              <Progress
                percent={selectedTask.status === "COMPLETED" ? 100 : selectedTask.status === "NOT_STARTED" ? 12 : selectedTask.status === "IN_PROGRESS" ? 45 : 72}
                strokeColor="#0f172a"
              />
              <Timeline
                style={{ marginTop: 18 }}
                items={[
                  { color: "green", children: "Console 已生成淘汰计划与候选列表" },
                  { color: selectedTask.status === "NOT_STARTED" ? "gray" : "green", children: "Mobile 复核任务开始/提交" },
                  { color: selectedTask.status === "PENDING_DESTINATION_ASSIGNMENT" || selectedTask.status === "DESTINATION_ASSIGNED" || selectedTask.status === "COMPLETED" ? "green" : "gray", children: "管理者确认淘汰名单" },
                  { color: selectedTask.status === "DESTINATION_ASSIGNED" || selectedTask.status === "COMPLETED" ? "green" : "gray", children: "分配售卖/外转/转舍等去向" },
                  { color: selectedTask.status === "COMPLETED" ? "green" : "gray", children: "处理完成，进入淘汰记录" }
                ]}
              />
            </Card>

            <Card title="猪只明细" className="task-section-card">
              <Table rowKey="id" dataSource={selectedTask.sows} columns={sowColumns} pagination={false} size="small" />
            </Card>
          </div>
        )}
      </Drawer>

      <Modal
        title="分配淘汰猪去向"
        open={assignOpen}
        onCancel={() => setAssignOpen(false)}
        footer={null}
      >
        <Alert
          type="info"
          showIcon
          message="请选择这批淘汰猪的后续处理方式"
          description="点击去向后，系统会自动生成对应的出售/转移、转舍或场内屠宰处理任务。"
          style={{ marginBottom: 16 }}
        />
        <div className="destination-action-grid">
          <button className="destination-action-card" onClick={() => assignDestination("SALE")}>
            <span className="destination-action-title">售卖/转移</span>
            <span className="destination-action-copy">生成出售或外部转移任务，关联本批确认淘汰母猪。</span>
          </button>
          <button className="destination-action-card" onClick={() => assignDestination("INTERNAL_TRANSFER")}>
            <span className="destination-action-title">转舍</span>
            <span className="destination-action-copy">生成内部转舍任务，将淘汰母猪转入指定栏舍或待处理区。</span>
          </button>
          <button className="destination-action-card" onClick={() => assignDestination("SLAUGHTER_OR_DISPOSAL")}>
            <span className="destination-action-title">场内屠宰</span>
            <span className="destination-action-copy">用于小规模猪场员工福利分肉、自用或内部消化；完成后系统将对应猪只标记为死亡。</span>
          </button>
        </div>
      </Modal>
    </div>
  );
}
