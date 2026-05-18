import { ArrowLeftOutlined, CloudUploadOutlined, EyeOutlined, PlusOutlined } from "@ant-design/icons";
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  Upload,
  message
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useMemo, useState } from "react";
import type { UploadFile } from "antd/es/upload/interface";
import { getPigMobileMeta } from "../pigMeta";
import {
  SAMPLE_CONTAINER_OPTIONS,
  SAMPLING_METHOD_OPTIONS,
  sampleContainerLabel,
  samplingMethodLabel,
  type PlanEffectTrackingResultStored,
  type PlanEffectTrackingStored
} from "../planEffectTracking";
import type { TaskRow } from "./VaccineTaskListPage";

const { Title, Text } = Typography;

export type ReviewSamplingTaskStatus = "待采样" | "待检测" | "已检测";
export type ReviewSamplingTaskType = "原始接种" | "重新接种";
export type ReviewSampleResult = "阳性" | "阴性";
export type ReviewMeasurementUnit = "S/P值" | "OD值" | "阻断率" | "滴度";

const REVIEW_MEASUREMENT_UNIT_OPTIONS: ReviewMeasurementUnit[] = ["S/P值", "OD值", "阻断率", "滴度"];

export type ReviewSamplingSampleRow = {
  id: string;
  sampleId: string;
  pigId: string;
  earTag: string;
  roomLabel: string;
  stallNo: string;
  targetAntibody: string;
  measurementValue?: string;
  result?: ReviewSampleResult;
};

export type ReviewSamplingTaskRow = {
  id: string;
  vaccinationTaskId: string;
  vaccinationTaskType: ReviewSamplingTaskType;
  targetAntibody: string;
  sampledCount: number;
  thresholdPercent: number;
  createdAt: string;
  status: ReviewSamplingTaskStatus;
  samplingMethod?: PlanEffectTrackingStored["samplingMethod"];
  sampleContainer?: PlanEffectTrackingStored["sampleContainer"];
  measurementUnit?: ReviewMeasurementUnit;
  samples: ReviewSamplingSampleRow[];
  positiveCount?: number;
  negativeCount?: number;
  qualificationRatePercent?: number;
  result?: PlanEffectTrackingResultStored["result"];
};

type ReviewSummary = {
  totalCount: number;
  filledCount: number;
  positiveCount: number;
  negativeCount: number;
  qualificationRatePercent: number;
  result: PlanEffectTrackingResultStored["result"];
};

type ReviewDetailMode = "view" | "upload";
type AntibodySamplingCreateValues = {
  pigIds: string[];
  targetAntibody?: string;
  samplingMethod?: PlanEffectTrackingStored["samplingMethod"];
  sampleContainer?: PlanEffectTrackingStored["sampleContainer"];
  qualificationThresholdPercent: number;
};

type Props = {
  tasks: TaskRow[];
  reviewTasks: ReviewSamplingTaskRow[];
  onSubmitResults: (taskId: string, samples: ReviewSamplingSampleRow[], measurementUnit: ReviewMeasurementUnit) => void;
  onCreateAntibodySamplingTask: (payload: {
    pigIds: string[];
    targetAntibody: string;
    samplingMethod?: PlanEffectTrackingStored["samplingMethod"];
    sampleContainer?: PlanEffectTrackingStored["sampleContainer"];
    thresholdPercent: number;
  }) => void;
  onOpenVaccinationTask?: (taskId: string) => void;
};

function percent(positiveCount: number, totalCount: number): number {
  if (totalCount <= 0) return 0;
  return Math.round((positiveCount / totalCount) * 100);
}

function compareText(a?: string, b?: string): number {
  return String(a || "").localeCompare(String(b || ""), "zh-Hans-CN");
}

function compareNumber(a?: number, b?: number): number {
  return Number(a || 0) - Number(b || 0);
}

function compareDateText(a?: string, b?: string): number {
  return new Date(String(a || "")).getTime() - new Date(String(b || "")).getTime();
}

function summarizeSamples(
  samples: ReviewSamplingSampleRow[],
  thresholdPercent: number
): ReviewSummary {
  const totalCount = samples.length;
  const filledCount = samples.filter((item) => item.result).length;
  const positiveCount = samples.filter((item) => item.result === "阳性").length;
  const negativeCount = samples.filter((item) => item.result === "阴性").length;
  const qualificationRatePercent = percent(positiveCount, totalCount);
  return {
    totalCount,
    filledCount,
    positiveCount,
    negativeCount,
    qualificationRatePercent,
    result: qualificationRatePercent >= thresholdPercent ? "合格" : "不合格"
  };
}

function buildSampleRow(
  vaccinationTaskId: string,
  pigId: string,
  index: number,
  targetAntibody: string,
  result?: ReviewSampleResult
): ReviewSamplingSampleRow {
  const meta = getPigMobileMeta(pigId);
  return {
    id: `${vaccinationTaskId}-sample-${index + 1}`,
    sampleId: `RS-${vaccinationTaskId.replace(/^VT-/, "")}-${String(index + 1).padStart(2, "0")}`,
    pigId,
    earTag: meta.earTag,
    roomLabel: meta.roomLabel,
    stallNo: meta.stallNo,
    targetAntibody,
    result
  };
}

function buildSyntheticSampleRow(
  vaccinationTaskId: string,
  index: number,
  targetAntibody: string,
  result?: ReviewSampleResult
): ReviewSamplingSampleRow {
  return {
    id: `${vaccinationTaskId}-sample-${index + 1}`,
    sampleId: `RS-${vaccinationTaskId.replace(/^VT-/, "")}-${String(index + 1).padStart(2, "0")}`,
    pigId: `review-${vaccinationTaskId}-${index + 1}`,
    earTag: `R${String(index + 1).padStart(4, "0")}`,
    roomLabel: "复核样品待归档",
    stallNo: "—",
    targetAntibody,
    result
  };
}

const CREATE_ENTRY_OPTIONS = [
  {
    key: "病毒",
    title: "病毒",
    description: "检查样品（人、猪、环境、物品）是否携带或含有某种病毒传播源。"
  },
  {
    key: "抗体",
    title: "抗体",
    description: "自由创建抗体采样任务，检测猪只是否含有某类疫苗对应的抗体。"
  }
] as const;

function samplingPigCandidates() {
  return Array.from({ length: 16 }).map((_, idx) => {
    const pigId = `pig-${1000 + idx}`;
    const meta = getPigMobileMeta(pigId);
    return {
      id: pigId,
      pigId: meta.earTag,
      roomLabel: meta.roomLabel,
      stallNo: meta.stallNo,
      section: meta.workshopLabel || "生产一区"
    };
  });
}

function buildSamplesForTask(task: TaskRow): ReviewSamplingSampleRow[] {
  const targetAntibody = task.effectTracking?.targetAntibody || "目标抗体待补充";
  const sampledCount = task.effectTrackingResult?.sampledCount ?? Math.max(task.pigIds?.length ?? 0, 1);
  const qualifiedCount = task.effectTrackingResult?.qualifiedCount ?? 0;
  const basePigIds = task.pigIds || [];

  return Array.from({ length: sampledCount }, (_, index) => {
    const result =
      task.effectTrackingResult != null ? (index < qualifiedCount ? "阳性" : "阴性") : undefined;
    const pigId = basePigIds[index];
    return pigId
      ? buildSampleRow(task.id, pigId, index, targetAntibody, result)
      : buildSyntheticSampleRow(task.id, index, targetAntibody, result);
  });
}

export function buildSeedReviewSamplingTasks(tasks: TaskRow[]): ReviewSamplingTaskRow[] {
  return tasks
    .filter((task) => task.status === "已完成" && task.effectTracking?.effectTrackingEnabled)
    .map((task) => {
      const samples = buildSamplesForTask(task);
      const thresholdPercent = task.effectTracking?.qualificationThresholdPercent ?? 80;
      const summary = summarizeSamples(samples, thresholdPercent);
      return {
        id: `RS-${task.id.replace(/^VT-/, "")}`,
        vaccinationTaskId: task.id,
        vaccinationTaskType: task.supplementMode === "review-full" ? "重新接种" : "原始接种",
        targetAntibody: task.effectTracking?.targetAntibody || "目标抗体待补充",
        sampledCount: samples.length,
        thresholdPercent,
        createdAt: task.executedAt || task.createdAt,
        status: task.effectTrackingResult ? "已检测" : task.id === "VT-DEMO-3L8N" ? "待采样" : "待检测",
        samplingMethod: task.effectTracking?.samplingMethod,
        sampleContainer: task.effectTracking?.sampleContainer,
        measurementUnit: "S/P值",
        samples,
        positiveCount: task.effectTrackingResult ? summary.positiveCount : undefined,
        negativeCount: task.effectTrackingResult ? summary.negativeCount : undefined,
        qualificationRatePercent: task.effectTrackingResult ? summary.qualificationRatePercent : undefined,
        result: task.effectTrackingResult ? summary.result : undefined
      };
    });
}

function reviewListColumns(
  status: ReviewSamplingTaskStatus,
  onOpen: (taskId: string, mode: ReviewDetailMode) => void
): ColumnsType<ReviewSamplingTaskRow> {
  const base: ColumnsType<ReviewSamplingTaskRow> = [
    {
      title: "复核任务ID",
      dataIndex: "id",
      key: "id",
      width: 220,
      fixed: "left",
      ellipsis: true,
      sorter: (a, b) => compareText(a.id, b.id)
    },
    {
      title: "关联接种任务",
      dataIndex: "vaccinationTaskId",
      key: "vaccinationTaskId",
      width: 180,
      ellipsis: true,
      sorter: (a, b) => compareText(a.vaccinationTaskId, b.vaccinationTaskId)
    },
    {
      title: "检测抗体",
      dataIndex: "targetAntibody",
      key: "targetAntibody",
      width: 170,
      ellipsis: true,
      filters: [
        ...new Set([
          "伪狂犬病毒抗体",
          "圆环病毒抗体",
          "蓝耳病毒抗体",
          "猪瘟病毒抗体"
        ])
      ].map((item) => ({ text: item, value: item })),
      onFilter: (value, record) => record.targetAntibody === value,
      sorter: (a, b) => compareText(a.targetAntibody, b.targetAntibody)
    },
    {
      title: "抽样猪只",
      dataIndex: "sampledCount",
      key: "sampledCount",
      width: 100,
      render: (value) => `${value} 头`,
      sorter: (a, b) => compareNumber(a.sampledCount, b.sampledCount)
    },
    {
      title: "样品容器",
      dataIndex: "sampleContainer",
      key: "sampleContainer",
      width: 140,
      filters: [
        ...new Set(["REAGENT_BAG_BLOOD", "REAGENT_BAG", "BLOOD_TUBE"])
      ].map((item) => ({ text: sampleContainerLabel(item) || item, value: item })),
      onFilter: (value, record) => record.sampleContainer === value,
      sorter: (a, b) => compareText(sampleContainerLabel(a.sampleContainer), sampleContainerLabel(b.sampleContainer)),
      render: (value?: PlanEffectTrackingStored["sampleContainer"]) => sampleContainerLabel(value) || "—"
    },
  ];

  const completedOnly: ColumnsType<ReviewSamplingTaskRow> =
    status === "已检测"
      ? [
          {
            title: "阳性 / 抽样总数",
            key: "positiveSummary",
            width: 150,
            sorter: (a, b) => compareNumber(a.positiveCount, b.positiveCount),
            render: (_, row) => `${row.positiveCount ?? 0} / ${row.sampledCount}`
          },
          {
            title: "合格率",
            dataIndex: "qualificationRatePercent",
            key: "qualificationRatePercent",
            width: 100,
            sorter: (a, b) => compareNumber(a.qualificationRatePercent, b.qualificationRatePercent),
            render: (value) => `${value ?? 0}%`
          },
          {
            title: "判定结果",
            dataIndex: "result",
            key: "result",
            width: 110,
            filters: [
              { text: "合格", value: "合格" },
              { text: "不合格", value: "不合格" }
            ],
            onFilter: (value, record) => record.result === value,
            render: (value?: PlanEffectTrackingResultStored["result"]) =>
              value ? <Tag color={value === "合格" ? "success" : "error"}>{value}</Tag> : "—"
          }
        ]
      : [];

  return [
    ...base,
    ...completedOnly,
    {
      title: "创建时间",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 160,
      sorter: (a, b) => compareDateText(a.createdAt, b.createdAt)
    },
    {
      title: "操作",
      key: "actions",
      width: 92,
      fixed: "right",
      render: (_, row) =>
        status === "待检测" ? (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Tooltip title="上传结果">
              <Button
                type="text"
                icon={<CloudUploadOutlined />}
                onClick={() => onOpen(row.id, "upload")}
                aria-label={`上传${row.id}的复核结果`}
              />
            </Tooltip>
            <Tooltip title="查看详情">
              <Button
                type="text"
                icon={<EyeOutlined />}
                onClick={() => onOpen(row.id, "view")}
                aria-label={`查看${row.id}的复核详情`}
              />
            </Tooltip>
          </div>
        ) : status === "待采样" ? (
          <Tooltip title="查看详情">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => onOpen(row.id, "view")}
              aria-label={`查看${row.id}的复核详情`}
            />
          </Tooltip>
        ) : (
          <Button type="link" style={{ paddingInline: 0 }} onClick={() => onOpen(row.id, "view")}>
            查看详情
          </Button>
        )
    }
  ];
}

function SummaryGrid({
  title,
  task,
  summary,
  showFilled
}: {
  title: string;
  task: ReviewSamplingTaskRow;
  summary: ReviewSummary;
  showFilled: boolean;
}) {
  return (
    <Card className="section-card">
      <Title level={5} className="task-detail-section-title" style={{ marginTop: 0 }}>
        {title}
      </Title>
      <div className="review-sampling-summary-grid">
        <div className="review-sampling-summary-item">
          <div className="review-sampling-summary-label">抽样总数</div>
          <div className="review-sampling-summary-value">{summary.totalCount} 头</div>
        </div>
        {showFilled ? (
          <div className="review-sampling-summary-item">
            <div className="review-sampling-summary-label">已填写</div>
            <div className="review-sampling-summary-value">{summary.filledCount} / {summary.totalCount}</div>
          </div>
        ) : null}
        <div className="review-sampling-summary-item">
          <div className="review-sampling-summary-label">阳性数</div>
          <div className="review-sampling-summary-value">{summary.positiveCount} 头</div>
        </div>
        <div className="review-sampling-summary-item">
          <div className="review-sampling-summary-label">阴性数</div>
          <div className="review-sampling-summary-value">{summary.negativeCount} 头</div>
        </div>
        <div className="review-sampling-summary-item">
          <div className="review-sampling-summary-label">合格率</div>
          <div className="review-sampling-summary-value">{summary.qualificationRatePercent}%</div>
        </div>
        <div className="review-sampling-summary-item">
          <div className="review-sampling-summary-label">阈值</div>
          <div className="review-sampling-summary-value">{task.thresholdPercent}%</div>
        </div>
        <div className="review-sampling-summary-item review-sampling-summary-item--full">
          <div className="review-sampling-summary-label">当前判定</div>
          <div className="review-sampling-summary-value">
            <Tag color={summary.result === "合格" ? "success" : "error"}>{summary.result}</Tag>
          </div>
        </div>
      </div>
    </Card>
  );
}

export function ReviewSamplingManagementPage({ tasks, reviewTasks, onSubmitResults, onCreateAntibodySamplingTask, onOpenVaccinationTask }: Props) {
  const [activeTab, setActiveTab] = useState<ReviewSamplingTaskStatus>("待检测");
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [detailMode, setDetailMode] = useState<ReviewDetailMode>("view");
  const [createMode, setCreateMode] = useState(false);
  const activeTask = reviewTasks.find((item) => item.id === activeTaskId) || null;
  const linkedTask = tasks.find((item) => item.id === activeTask?.vaccinationTaskId);
  const [draftSamples, setDraftSamples] = useState<ReviewSamplingSampleRow[]>([]);
  const [dirty, setDirty] = useState(false);
  const [sampleKeyword, setSampleKeyword] = useState("");
  const [reportFiles, setReportFiles] = useState<UploadFile[]>([]);
  const [measurementUnit, setMeasurementUnit] = useState<ReviewMeasurementUnit>("S/P值");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createPigKeyword, setCreatePigKeyword] = useState("");
  const [createForm] = Form.useForm<AntibodySamplingCreateValues>();
  const pigCandidates = useMemo(() => samplingPigCandidates(), []);
  const targetAntibodyOptions = useMemo(
    () => Array.from(new Set(tasks.map((task) => task.effectTracking?.targetAntibody).filter(Boolean))).map((item) => ({ label: item as string, value: item as string })),
    [tasks]
  );
  const selectedCreatePigIds = Form.useWatch("pigIds", createForm) || [];
  const filteredCreatePigs = useMemo(() => {
    const keyword = createPigKeyword.trim();
    return pigCandidates.filter((item) => !keyword || [item.pigId, item.roomLabel, item.stallNo].join(" ").includes(keyword));
  }, [createPigKeyword, pigCandidates]);

  useEffect(() => {
    if (activeTask?.status === "待检测") {
      setDraftSamples(activeTask.samples.map((item) => ({ ...item })));
      setDirty(false);
      setSampleKeyword("");
      setReportFiles([]);
      setMeasurementUnit(activeTask.measurementUnit || "S/P值");
    }
  }, [activeTask]);

  const samplingRows = useMemo(
    () => reviewTasks.filter((item) => item.status === "待采样"),
    [reviewTasks]
  );
  const pendingRows = useMemo(
    () => reviewTasks.filter((item) => item.status === "待检测"),
    [reviewTasks]
  );
  const reviewColumns = useMemo(() => {
    const openDetail = (taskId: string, mode: ReviewDetailMode) => {
      setCreateMode(false);
      setDetailMode(mode);
      setActiveTaskId(taskId);
    };

    const enhanceColumns = (status: ReviewSamplingTaskStatus): ColumnsType<ReviewSamplingTaskRow> =>
      reviewListColumns(status, openDetail).map((column) =>
        column.key === "vaccinationTaskId"
          ? {
              ...column,
              render: (value: string) =>
                value ? (
                  onOpenVaccinationTask ? (
                    <Button type="link" style={{ paddingInline: 0 }} onClick={() => onOpenVaccinationTask(value)}>
                      {value}
                    </Button>
                  ) : (
                    value
                  )
                ) : (
                  "—"
                )
            }
          : column
      );

    return {
      sampling: enhanceColumns("待采样"),
      pending: enhanceColumns("待检测"),
      completed: enhanceColumns("已检测")
    };
  }, [onOpenVaccinationTask]);
  const completedRows = useMemo(
    () => reviewTasks.filter((item) => item.status === "已检测"),
    [reviewTasks]
  );

  const pendingSummary = useMemo(
    () => summarizeSamples(draftSamples, activeTask?.thresholdPercent ?? 80),
    [activeTask?.thresholdPercent, draftSamples]
  );
  const completedSummary = useMemo(() => {
    if (!activeTask) return null;
    return summarizeSamples(activeTask.samples, activeTask.thresholdPercent);
  }, [activeTask]);

  const detailRows = activeTask?.status === "待检测" ? draftSamples : activeTask?.samples || [];
  const filteredDetailRows = useMemo(() => {
    const keyword = sampleKeyword.trim().toLowerCase();
    if (!keyword) return detailRows;
    return detailRows.filter((item) =>
      [item.sampleId, item.earTag, item.roomLabel, item.stallNo, item.targetAntibody]
        .join(" ")
        .toLowerCase()
        .includes(keyword)
    );
  }, [detailRows, sampleKeyword]);

  const detailColumns: ColumnsType<ReviewSamplingSampleRow> = [
    {
      title: "耳标号",
      dataIndex: "earTag",
      key: "earTag",
      width: 120,
      fixed: "left",
      sorter: (a, b) => compareText(a.earTag, b.earTag)
    },
    {
      title: "采样地点",
      key: "samplingSpot",
      width: 180,
      sorter: (a, b) => compareText(`${a.roomLabel} ${a.stallNo}`, `${b.roomLabel} ${b.stallNo}`),
      render: (_, row) => `${row.roomLabel} · ${row.stallNo}`
    },
    {
      title: "采样人员",
      key: "collector",
      width: 120,
      filters: [{ text: "实验室人员", value: "实验室人员" }],
      onFilter: () => true,
      render: () => "实验室人员"
    },
    {
      title: "检测值",
      key: "measurementValue",
      width: 160,
      sorter: (a, b) => compareText(a.measurementValue, b.measurementValue),
      render: (_, row) => {
        const currentValue = activeTask?.status === "待检测"
          ? draftSamples.find((item) => item.id === row.id)?.measurementValue
          : row.measurementValue;

        if (activeTask?.status === "已检测") {
          return currentValue || "—";
        }

        return (
          <Input
            value={currentValue}
            placeholder={`填写本头样品的${measurementUnit}`}
            onChange={(event) => {
              const nextValue = event.target.value;
              setDraftSamples((prev) =>
                prev.map((item) => (item.id === row.id ? { ...item, measurementValue: nextValue } : item))
              );
              setDirty(true);
            }}
          />
        );
      }
    },
    {
      title: "采样时间",
      key: "sampledAt",
      width: 160,
      sorter: () => 0,
      render: () => activeTask?.createdAt || "—"
    },
    {
      title: "检测结果",
      key: "result",
      width: 180,
      filters: [
        { text: "阳性", value: "阳性" },
        { text: "阴性", value: "阴性" }
      ],
      onFilter: (value, record) => record.result === value,
      render: (_, row) => {
        const current = activeTask?.status === "待检测"
          ? draftSamples.find((item) => item.id === row.id)?.result
          : row.result;

        if (activeTask?.status === "已检测") {
          return current ? <Tag color={current === "阳性" ? "success" : "error"}>{current}</Tag> : "—";
        }

        return (
          <Select
            value={current}
            placeholder="选择结果"
            style={{ width: 128 }}
            className="review-sampling-result-select"
            options={[
              { label: "阳性", value: "阳性" },
              { label: "阴性", value: "阴性" }
            ]}
            onChange={(value) => {
              setDraftSamples((prev) =>
                prev.map((item) => (item.id === row.id ? { ...item, result: value as ReviewSampleResult } : item))
              );
              setDirty(true);
            }}
          />
        );
      }
    }
  ];

  const samplingColumns: ColumnsType<ReviewSamplingSampleRow> = [
    {
      title: "样品ID",
      dataIndex: "sampleId",
      key: "sampleId",
      width: 200,
      fixed: "left",
      sorter: (a, b) => compareText(a.sampleId, b.sampleId)
    },
    {
      title: "耳标号",
      dataIndex: "earTag",
      key: "earTag",
      width: 120,
      sorter: (a, b) => compareText(a.earTag, b.earTag)
    },
    {
      title: "采样地点",
      key: "samplingSpot",
      width: 180,
      sorter: (a, b) => compareText(`${a.roomLabel} ${a.stallNo}`, `${b.roomLabel} ${b.stallNo}`),
      render: (_, row) => `${row.roomLabel} · ${row.stallNo}`
    },
    {
      title: "采样时间",
      key: "sampledAt",
      width: 160,
      render: () => activeTask?.createdAt || "—"
    }
  ];

  const detailInfoItems = activeTask
    ? [
        { label: "复核任务ID", value: activeTask.id },
        { label: "关联接种任务", value: onOpenVaccinationTask ? <Button type="link" style={{ paddingInline: 0 }} onClick={() => onOpenVaccinationTask(activeTask.vaccinationTaskId)}>{activeTask.vaccinationTaskId}</Button> : activeTask.vaccinationTaskId },
        { label: "检测抗体", value: <Tag color="volcano">{activeTask.targetAntibody}</Tag> },
        { label: "采样方式", value: samplingMethodLabel(activeTask.samplingMethod) || "—" },
        { label: "样品容器", value: sampleContainerLabel(activeTask.sampleContainer) || "—" },
        { label: "检测单位", value: activeTask.measurementUnit || "S/P值" },
        { label: "阈值", value: `${activeTask.thresholdPercent}%` },
        { label: "创建时间", value: activeTask.createdAt },
        { label: "关联疫苗", value: linkedTask?.vaccine || "—" },
      ]
    : [];

  const handleBackFromDetail = () => {
    if (activeTask?.status === "待检测" && dirty) {
      Modal.confirm({
        title: "确认返回",
        content: "当前结果尚未提交，返回后本次填写不会生效。",
        okText: "放弃返回",
        cancelText: "继续填写",
        onOk: () => {
          setActiveTaskId(null);
          setDraftSamples([]);
          setDirty(false);
          setDetailMode("view");
        }
      });
      return;
    }
    setActiveTaskId(null);
    setDraftSamples([]);
    setDirty(false);
    setDetailMode("view");
  };

  const handleSubmit = () => {
    if (!activeTask) return;
    const hasIncomplete = draftSamples.some((item) => !item.result);
    if (hasIncomplete) {
      message.warning("请先完成全部样品结果录入。");
      return;
    }
    onSubmitResults(activeTask.id, draftSamples, measurementUnit);
    setDirty(false);
    setActiveTaskId(null);
    setDetailMode("view");
    setActiveTab("已检测");
  };

  if (createMode) {
    return (
      <div>
        <div className="page-header">
          <div>
            <Button type="link" icon={<ArrowLeftOutlined />} style={{ paddingInline: 0 }} onClick={() => setCreateMode(false)}>
              返回复核任务列表
            </Button>
            <Title level={4} style={{ margin: 0 }}>创建抗体采样任务</Title>
            <Text type="secondary">当未开启免疫复核时，可在这里自主创建抗体采样任务，检测猪只是否含有某类疫苗对应的抗体。</Text>
          </div>
          <div>
            <Button onClick={() => setCreateMode(false)}>取消</Button>
            <Button
              type="primary"
              style={{ marginLeft: 12 }}
              onClick={async () => {
                try {
                  const values = await createForm.validateFields();
                  onCreateAntibodySamplingTask({
                    pigIds: values.pigIds,
                    targetAntibody: values.targetAntibody!,
                    samplingMethod: values.samplingMethod,
                    sampleContainer: values.sampleContainer,
                    thresholdPercent: values.qualificationThresholdPercent
                  });
                  message.success("抗体采样任务已创建");
                  createForm.resetFields();
                  setCreatePigKeyword("");
                  setCreateMode(false);
                  setActiveTab("待采样");
                } catch (error) {}
              }}
            >
              完成创建
            </Button>
          </div>
        </div>

        <Card className="section-card">
          <Title level={5} className="task-detail-section-title" style={{ marginTop: 0 }}>任务配置</Title>
          <Form form={createForm} layout="vertical" initialValues={{ pigIds: [], qualificationThresholdPercent: 80 }}>
            <div className="review-sampling-create-grid">
              <Form.Item name="targetAntibody" label="检测抗体" rules={[{ required: true, message: "请选择检测抗体" }]}>
                <Select placeholder="请选择检测抗体" options={targetAntibodyOptions} />
              </Form.Item>
              <Form.Item name="samplingMethod" label="采样方式" rules={[{ required: true, message: "请选择采样方式" }]}>
                <Select placeholder="请选择采样方式" options={SAMPLING_METHOD_OPTIONS as any} />
              </Form.Item>
              <Form.Item name="sampleContainer" label="样品容器" rules={[{ required: true, message: "请选择样品容器" }]}>
                <Select placeholder="请选择样品容器" options={SAMPLE_CONTAINER_OPTIONS as any} />
              </Form.Item>
              <Form.Item name="qualificationThresholdPercent" label="合格率阈值" rules={[{ required: true, message: "请输入合格率阈值" }]}>
                <InputNumber min={1} max={100} addonAfter="%" style={{ width: "100%" }} />
              </Form.Item>
            </div>
          </Form>
        </Card>

        <Card className="section-card">
          <div className="review-sampling-select-header">
            <div>
              <Title level={5} className="task-detail-section-title" style={{ marginTop: 0 }}>选择采样猪只</Title>
              <Text type="secondary">选择需要进行抗体采样检测的猪只，创建后会进入待采样列表。</Text>
            </div>
            <Tag color="green">已选 {selectedCreatePigIds.length} 头</Tag>
          </div>
          <Input.Search
            allowClear
            placeholder="搜索耳标号 / 房间 / 栏位"
            value={createPigKeyword}
            onChange={(event) => setCreatePigKeyword(event.target.value)}
            className="review-sampling-search"
          />
          <Form form={createForm} component={false}>
            <Form.Item name="pigIds" rules={[{ required: true, message: "请至少选择 1 头猪" }]} style={{ marginTop: 16, marginBottom: 0 }}>
              <Table
                className="review-sampling-table"
                rowKey="id"
                pagination={false}
                scroll={{ x: 720 }}
                dataSource={filteredCreatePigs}
                rowSelection={{
                  selectedRowKeys: selectedCreatePigIds,
                  onChange: (keys) => createForm.setFieldValue("pigIds", keys)
                }}
                columns={[
                  { title: "耳标号", dataIndex: "pigId", key: "pigId", sorter: (a, b) => compareText(a.pigId, b.pigId) },
                  { title: "房间", dataIndex: "roomLabel", key: "roomLabel", sorter: (a, b) => compareText(a.roomLabel, b.roomLabel) },
                  { title: "栏位", dataIndex: "stallNo", key: "stallNo", sorter: (a, b) => compareText(a.stallNo, b.stallNo) },
                  { title: "单元", dataIndex: "section", key: "section", sorter: (a, b) => compareText(a.section, b.section) }
                ]}
              />
            </Form.Item>
          </Form>
        </Card>
      </div>
    );
  }

  if (activeTask) {
    const isSampling = activeTask.status === "待采样";
    const isPending = activeTask.status === "待检测" && detailMode === "upload";
    const isPendingView = activeTask.status === "待检测" && detailMode === "view";
    const summary = isPending ? pendingSummary : completedSummary;
    return (
      <div>
        <div className="page-header">
          <div>
            <Button type="link" icon={<ArrowLeftOutlined />} style={{ paddingInline: 0 }} onClick={handleBackFromDetail}>
              返回复核任务列表
            </Button>
            <Title level={4} style={{ margin: 0 }}>
              {isSampling ? "复核采样详情" : isPending ? "复核结果上传" : "复核结果详情"}
            </Title>
            <Text type="secondary">
              {isSampling ? "查看本轮待采样任务的样品范围与采样要求。" : isPending ? "逐条录入样品结果，系统会自动计算合格率并回写接种任务。" : "查看已提交的复核结果汇总与单样品明细。"}
            </Text>
          </div>
        </div>

        <Card className="section-card">
          <Title level={5} className="task-detail-section-title" style={{ marginTop: 0 }}>
            复核任务信息
          </Title>
          <div className="task-detail-info-grid">
            {detailInfoItems.map((item) => (
              <div key={item.label} className="task-detail-info-item">
                <div className="task-detail-info-label">{item.label}</div>
                <div className="task-detail-info-value">{item.value}</div>
              </div>
            ))}
          </div>
        </Card>

        {activeTask.status === "已检测" && summary ? (
          <SummaryGrid title="复核结果汇总" task={activeTask} summary={summary} showFilled={false} />
        ) : null}

        <Card className="section-card">
          {isPending ? (
            <>
              <div className="review-sampling-guidance">
                <div className="review-sampling-guidance__item">
                  <div className="review-sampling-guidance__label">检测单位</div>
                  <div className="review-sampling-guidance__text">选择本轮实验室出具结果时使用的单位，例如 S/P值、OD值或阻断率。</div>
                </div>
                <div className="review-sampling-guidance__item">
                  <div className="review-sampling-guidance__label">检测值</div>
                  <div className="review-sampling-guidance__text">填写每头猪样品对应的原始检测读数，系统会保留该原始结果用于后续追溯。</div>
                </div>
                <div className="review-sampling-guidance__item">
                  <div className="review-sampling-guidance__label">检测结果</div>
                  <div className="review-sampling-guidance__text">根据试剂盒说明和检测值，由实验室人员手动判断并选择阳性或阴性。</div>
                </div>
              </div>
              <div className="review-sampling-toolbar">
                <Select
                  value={measurementUnit}
                  className="review-sampling-unit-select"
                  options={REVIEW_MEASUREMENT_UNIT_OPTIONS.map((item) => ({ label: item, value: item }))}
                  onChange={(value) => {
                    setMeasurementUnit(value as ReviewMeasurementUnit);
                    setDirty(true);
                  }}
                />
                <Input.Search
                  allowClear
                  placeholder="搜索耳标号 / 样品ID / 检测抗体"
                  value={sampleKeyword}
                  onChange={(event) => setSampleKeyword(event.target.value)}
                  className="review-sampling-search"
                />
              </div>
            </>
          ) : (
            <Title level={5} className="task-detail-section-title" style={{ marginTop: 0 }}>
              {isSampling ? "待采样样品列表" : "样品明细"}
            </Title>
          )}
          <Table
            className="review-sampling-table"
            rowKey="id"
            dataSource={filteredDetailRows}
            columns={isSampling || isPendingView ? samplingColumns : detailColumns}
            pagination={{ pageSize: 8 }}
            scroll={{ x: 980 }}
            footer={
              isPending && summary
                ? () => (
                    <div className="review-sampling-table-footer">
                      <span>已填写 {summary.filledCount} / {summary.totalCount}</span>
                    </div>
                  )
                : undefined
            }
          />
        </Card>

        {isPending ? (
          <>
            <Card className="section-card">
              <Title level={5} className="task-detail-section-title" style={{ marginTop: 0 }}>
                上传报告
              </Title>
              <Upload.Dragger
                className="review-sampling-upload-dragger"
                multiple={false}
                beforeUpload={() => false}
                fileList={reportFiles}
                onChange={({ fileList }) => {
                  setReportFiles(fileList.slice(-1));
                  setDirty(true);
                }}
              >
                <p className="ant-upload-drag-icon">
                  <CloudUploadOutlined />
                </p>
                <p className="ant-upload-text">拖拽或点击上传检测报告</p>
                <p className="ant-upload-hint">支持上传本轮复核的检测报告文件，便于后续追溯查看。</p>
              </Upload.Dragger>
            </Card>

            <Card className="section-card">
              <div className="review-sampling-detail-actions">
                <Button onClick={handleBackFromDetail}>返回</Button>
                <Button
                  type="primary"
                  onClick={handleSubmit}
                  disabled={draftSamples.some((item) => !item.result || !String(item.measurementValue || "").trim())}
                >
                  提交结果
                </Button>
              </div>
            </Card>
          </>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <Title level={4} style={{ margin: 0 }}>
            免疫复核采样结果管理
          </Title>
          <Text type="secondary">按复核任务管理待检测结果与已检测结果，结果提交后自动回写接种任务。</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>创建采样</Button>
      </div>

      <Modal open={createModalOpen} title="选择采样类型" footer={null} width={720} onCancel={() => setCreateModalOpen(false)}>
        <div className="review-sampling-entry-grid">
          {CREATE_ENTRY_OPTIONS.map((item) => (
            <button
              type="button"
              key={item.key}
              className="review-sampling-entry-card"
              onClick={() => {
                if (item.key === "病毒") {
                  message.info("病毒采样创建入口暂未开放，这次先完成抗体采样任务。");
                  return;
                }
                setCreateModalOpen(false);
                createForm.resetFields();
                setCreatePigKeyword("");
                setCreateMode(true);
              }}
            >
              <div className="review-sampling-entry-card__title">{item.title}</div>
              <div className="review-sampling-entry-card__desc">{item.description}</div>
            </button>
          ))}
        </div>
      </Modal>

      <Card className="section-card">
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as ReviewSamplingTaskStatus)}
          items={[
            {
              key: "待采样",
              label: `待采样 (${samplingRows.length})`,
              children: (
                <Table
                  rowKey="id"
                  dataSource={samplingRows}
                  pagination={false}
                  scroll={{ x: "max-content" }}
                  locale={{ emptyText: "暂无待采样复核任务" }}
                  columns={reviewColumns.sampling}
                />
              )
            },
            {
              key: "待检测",
              label: `待检测 (${pendingRows.length})`,
              children: (
                <Table
                  rowKey="id"
                  dataSource={pendingRows}
                  pagination={false}
                  scroll={{ x: "max-content" }}
                  locale={{ emptyText: "暂无待检测复核任务" }}
                  columns={reviewColumns.pending}
                />
              )
            },
            {
              key: "已检测",
              label: `已检测 (${completedRows.length})`,
              children: (
                <Table
                  rowKey="id"
                  dataSource={completedRows}
                  pagination={false}
                  scroll={{ x: "max-content" }}
                  locale={{ emptyText: "暂无已检测复核任务" }}
                  columns={reviewColumns.completed}
                />
              )
            }
          ]}
        />
      </Card>
    </div>
  );
}
