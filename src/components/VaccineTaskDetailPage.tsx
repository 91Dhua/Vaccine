import { ArrowLeftOutlined } from "@ant-design/icons";
import { Button, Card, Descriptions, Popconfirm, Progress, Table, Tabs, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMemo } from "react";
import type { MobileExecutionLog, MobilePigTask } from "../mobileVaccinationUtils";
import type { TaskRow } from "./VaccineTaskListPage";
import { getPigMobileMeta } from "../pigMeta";

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
  onSupplement?: (pigIds: string[]) => void;
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

function statusTagColor(status: DetailPigRow["executionStatus"]) {
  switch (status) {
    case "已接种":
      return "green";
    case "命中豁免":
      return "orange";
    case "未接种":
      return "red";
    default:
      return "default";
  }
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

export function VaccineTaskDetailPage({ task, pigTasks, logs, onBack, onEdit, onDelete, onSupplement }: Props) {
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

  const pendingColumns: ColumnsType<DetailPigRow> = [
    {
      title: "猪只ID",
      dataIndex: "pigId",
      width: 160
    },
    {
      title: "房间",
      dataIndex: "roomLabel",
      width: 220,
      ellipsis: true
    },
    {
      title: "栏位",
      dataIndex: "stallNo",
      width: 100,
      align: "center"
    },
    {
      title: "豁免命中",
      dataIndex: "exemptionLabel",
      ellipsis: true,
      render: (value?: string) => value || "—"
    }
  ];

  const completedColumns: ColumnsType<DetailPigRow> = [
    {
      title: "猪只ID",
      dataIndex: "pigId",
      width: 140
    },
    {
      title: "房间",
      dataIndex: "roomLabel",
      width: 160,
      ellipsis: true
    },
    {
      title: "栏位",
      dataIndex: "stallNo",
      width: 100
    },
    {
      title: "豁免命中",
      dataIndex: "exemptionLabel",
      ellipsis: true,
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
          {task.status === "已完成" && onSupplement ? (
            <Button type="primary" onClick={() => onSupplement(supplementPigIds)} disabled={supplementPigIds.length === 0}>
              补充接种
            </Button>
          ) : null}
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
            任务信息
          </Title>
          <Descriptions column={2} size="small" labelStyle={{ width: 88 }}>
            <Descriptions.Item label="任务编号">{task.id}</Descriptions.Item>
            <Descriptions.Item label="疫苗">{task.vaccine}</Descriptions.Item>
            <Descriptions.Item label="品牌">{task.brand || "—"}</Descriptions.Item>
            <Descriptions.Item label="剂型">{task.dosageForm || "—"}</Descriptions.Item>
            <Descriptions.Item label="接种方式">{task.administrationRoute || "—"}</Descriptions.Item>
            <Descriptions.Item label="剂量">{task.dosage}</Descriptions.Item>
            <Descriptions.Item label="剂次">{task.doseTimes} 次</Descriptions.Item>
            <Descriptions.Item label="接种日期">{task.schedule}</Descriptions.Item>
            <Descriptions.Item label="目标猪只">{task.targetCount} 头</Descriptions.Item>
            <Descriptions.Item label="创建人">{task.creator}</Descriptions.Item>
            <Descriptions.Item label="创建时间">{task.createdAt}</Descriptions.Item>
          </Descriptions>
        </Card>

        <Card className="section-card">
          <Title level={5} className="task-detail-section-title" style={{ marginTop: 0 }}>
            任务进度
          </Title>
          <div className="task-detail-progress-row">
            <div>
              <div className="task-detail-progress-label">已接种 / 目标接种</div>
              <div className="task-detail-progress-value">
                {vaccinatedRows.length} / {task.targetCount} 头
              </div>
            </div>
            <Tag color={task.status === "待接种" ? "default" : task.status === "进行中" ? "processing" : "success"}>
              {task.status}
            </Tag>
          </div>
          <Progress percent={progressPercent} strokeColor={task.status === "待接种" ? "#94a3b8" : task.status === "进行中" ? "#1677ff" : "#16a34a"} showInfo={false} />
          <Descriptions column={1} size="small" labelStyle={{ width: 110 }} style={{ marginTop: 16 }}>
            <Descriptions.Item label="目标范围">{targetSectionText}</Descriptions.Item>
            {task.status !== "待接种" ? (
              <Descriptions.Item label="执行人">{task.executor || latestLog?.actor || "—"}</Descriptions.Item>
            ) : null}
            {task.status !== "待接种" ? (
              <Descriptions.Item label="执行时间">{task.executedAt || latestLog?.at || "—"}</Descriptions.Item>
            ) : null}
            <Descriptions.Item label="命中豁免">{exemptionRows.length} 头</Descriptions.Item>
          </Descriptions>
        </Card>
      </div>

      <Card className="section-card">
        <Title level={5} className="task-detail-section-title" style={{ marginTop: 0 }}>
          目标猪只列表
        </Title>
        {task.status === "待接种" ? (
          <Table rowKey="key" columns={pendingColumns} dataSource={detailRows} pagination={{ pageSize: 8 }} />
        ) : (
          <Tabs items={tabItems} />
        )}
      </Card>
    </div>
  );
}
