import { ArrowLeftOutlined, CloudUploadOutlined, EyeOutlined, PlusOutlined } from "@ant-design/icons";
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Progress,
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
export type ReviewSamplingTaskCategory = "常规检测" | "抗体检测";
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
  reviewCategory: ReviewSamplingTaskCategory;
  targetAntibody: string;
  sampledCount: number;
  thresholdPercent: number;
  creator?: string;
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

function isSampleUploaded(sample: ReviewSamplingSampleRow): boolean {
  return Boolean(sample.result) && Boolean(String(sample.measurementValue || "").trim());
}

function hasSampleDraftValue(sample: ReviewSamplingSampleRow): boolean {
  return Boolean(sample.result) || Boolean(String(sample.measurementValue || "").trim());
}

function countUploadedSamples(samples: ReviewSamplingSampleRow[]): number {
  return samples.filter(isSampleUploaded).length;
}

function calculateUploadProgressPercent(samples: ReviewSamplingSampleRow[]): number {
  if (samples.length === 0) return 0;
  return Math.round((countUploadedSamples(samples) / samples.length) * 100);
}

function isDynamicAntibodyTask(task: ReviewSamplingTaskRow): boolean {
  return task.reviewCategory === "抗体检测" && calculateUploadProgressPercent(task.samples) < 100;
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

function buildManualAntibodySeedTasks(): ReviewSamplingTaskRow[] {
  return [
    {
      id: "RS-AB-260518-01",
      vaccinationTaskId: "",
      vaccinationTaskType: "原始接种",
      reviewCategory: "抗体检测",
      targetAntibody: "蓝耳病毒抗体",
      sampledCount: 5,
      thresholdPercent: 80,
      createdAt: "2026-05-17 14:20",
      status: "待检测",
      samplingMethod: "FRONT_VENA",
      sampleContainer: "BLOOD_TUBE",
      measurementUnit: "S/P值",
      samples: [
        {
          id: "RS-AB-260518-01-sample-1",
          sampleId: "RS-AB-260518-01-01",
          pigId: "pig-1000",
          earTag: "A-1000",
          roomLabel: "生产一区母猪车间",
          stallNo: "A01",
          targetAntibody: "蓝耳病毒抗体",
          measurementValue: "0.88",
          result: "阳性"
        },
        {
          id: "RS-AB-260518-01-sample-2",
          sampleId: "RS-AB-260518-01-02",
          pigId: "pig-1001",
          earTag: "A-1001",
          roomLabel: "生产一区母猪车间",
          stallNo: "A02",
          targetAntibody: "蓝耳病毒抗体",
          measurementValue: "0.81",
          result: "阳性"
        },
        {
          id: "RS-AB-260518-01-sample-3",
          sampleId: "RS-AB-260518-01-03",
          pigId: "pig-1002",
          earTag: "A-1002",
          roomLabel: "生产一区母猪车间",
          stallNo: "A03",
          targetAntibody: "蓝耳病毒抗体",
          measurementValue: "0.35",
          result: "阴性"
        },
        {
          id: "RS-AB-260518-01-sample-4",
          sampleId: "RS-AB-260518-01-04",
          pigId: "pig-1003",
          earTag: "A-1003",
          roomLabel: "生产一区母猪车间",
          stallNo: "A04",
          targetAntibody: "蓝耳病毒抗体"
        },
        {
          id: "RS-AB-260518-01-sample-5",
          sampleId: "RS-AB-260518-01-05",
          pigId: "pig-1004",
          earTag: "A-1004",
          roomLabel: "生产一区母猪车间",
          stallNo: "A05",
          targetAntibody: "蓝耳病毒抗体"
        }
      ]
    },
    {
      id: "RS-AB-260518-02",
      vaccinationTaskId: "",
      vaccinationTaskType: "原始接种",
      reviewCategory: "抗体检测",
      targetAntibody: "猪瘟病毒抗体",
      sampledCount: 4,
      thresholdPercent: 75,
      createdAt: "2026-05-16 09:40",
      status: "已检测",
      samplingMethod: "TAIL_VEIN",
      sampleContainer: "REAGENT_BAG",
      measurementUnit: "OD值",
      samples: [
        {
          id: "RS-AB-260518-02-sample-1",
          sampleId: "RS-AB-260518-02-01",
          pigId: "pig-1005",
          earTag: "A-1005",
          roomLabel: "生产一区母猪车间",
          stallNo: "B01",
          targetAntibody: "猪瘟病毒抗体",
          measurementValue: "1.12",
          result: "阳性"
        },
        {
          id: "RS-AB-260518-02-sample-2",
          sampleId: "RS-AB-260518-02-02",
          pigId: "pig-1006",
          earTag: "A-1006",
          roomLabel: "生产一区母猪车间",
          stallNo: "B02",
          targetAntibody: "猪瘟病毒抗体",
          measurementValue: "0.98",
          result: "阳性"
        },
        {
          id: "RS-AB-260518-02-sample-3",
          sampleId: "RS-AB-260518-02-03",
          pigId: "pig-1007",
          earTag: "A-1007",
          roomLabel: "生产一区母猪车间",
          stallNo: "B03",
          targetAntibody: "猪瘟病毒抗体",
          measurementValue: "0.91",
          result: "阳性"
        },
        {
          id: "RS-AB-260518-02-sample-4",
          sampleId: "RS-AB-260518-02-04",
          pigId: "pig-1008",
          earTag: "A-1008",
          roomLabel: "生产一区母猪车间",
          stallNo: "B04",
          targetAntibody: "猪瘟病毒抗体",
          measurementValue: "0.42",
          result: "阴性"
        }
      ]
    }
  ];
}

export function buildSeedReviewSamplingTasks(tasks: TaskRow[]): ReviewSamplingTaskRow[] {
  const regularTasks: ReviewSamplingTaskRow[] = tasks
    .filter((task) => task.status === "已完成" && task.effectTracking?.effectTrackingEnabled)
    .map((task): ReviewSamplingTaskRow => {
      const samples = buildSamplesForTask(task);
      const thresholdPercent = task.effectTracking?.qualificationThresholdPercent ?? 80;
      const summary = summarizeSamples(samples, thresholdPercent);
      return {
        id: `RS-${task.id.replace(/^VT-/, "")}`,
        vaccinationTaskId: task.id,
        vaccinationTaskType: task.supplementMode === "review-full" ? "重新接种" : "原始接种",
        reviewCategory: "常规检测" as const,
        targetAntibody: task.effectTracking?.targetAntibody || "目标抗体待补充",
        sampledCount: samples.length,
        thresholdPercent,
        creator: task.creator,
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

  return [...regularTasks, ...buildManualAntibodySeedTasks()];
}

function reviewListColumns(
  status: ReviewSamplingTaskStatus,
  completedCategory: ReviewSamplingTaskCategory | null,
  onOpen: (taskId: string, mode: ReviewDetailMode) => void
): ColumnsType<ReviewSamplingTaskRow> {
  if (status === "已检测" && completedCategory === "常规检测") {
    return [
      {
        title: "检测项目",
        dataIndex: "targetAntibody",
        key: "targetAntibody",
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
        title: "样品容器",
        dataIndex: "sampleContainer",
        key: "sampleContainer",
        filters: [
          ...new Set(["REAGENT_BAG_BLOOD", "REAGENT_BAG", "BLOOD_TUBE"])
        ].map((item) => ({ text: sampleContainerLabel(item) || item, value: item })),
        onFilter: (value, record) => record.sampleContainer === value,
        sorter: (a, b) => compareText(sampleContainerLabel(a.sampleContainer), sampleContainerLabel(b.sampleContainer)),
        render: (value?: PlanEffectTrackingStored["sampleContainer"]) => sampleContainerLabel(value) || "—"
      },
      {
        title: "采样目标",
        dataIndex: "sampledCount",
        key: "sampledCount",
        sorter: (a, b) => compareNumber(a.sampledCount, b.sampledCount),
        render: (value) => `${value} 头`
      },
      {
        title: "创建人",
        dataIndex: "creator",
        key: "creator",
        sorter: (a, b) => compareText(a.creator, b.creator),
        render: (value?: string) => value || "—"
      },
      {
        title: "检测结果",
        dataIndex: "result",
        key: "result",
        filters: [
          { text: "合格", value: "合格" },
          { text: "不合格", value: "不合格" }
        ],
        onFilter: (value, record) => summarizeSamples(record.samples, record.thresholdPercent).result === value,
        render: (_, row) => {
          const result = summarizeSamples(row.samples, row.thresholdPercent).result;
          return <Tag color={result === "合格" ? "success" : "error"}>{result}</Tag>;
        }
      }
    ];
  }

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
          ...(completedCategory === "抗体检测"
            ? [
                {
                  title: "检测进度",
                  key: "uploadProgress",
                  width: 210,
                  sorter: (a, b) => compareNumber(countUploadedSamples(a.samples), countUploadedSamples(b.samples)),
                  render: (_, row) => {
                    const uploadedCount = countUploadedSamples(row.samples);
                    const progress = calculateUploadProgressPercent(row.samples);
                    return (
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                          <span>{uploadedCount} / {row.sampledCount} 份</span>
                          <span>{progress}%</span>
                        </div>
                        <Progress
                          percent={progress}
                          size="small"
                          showInfo={false}
                          strokeColor={progress === 100 ? "#16a34a" : "#1677ff"}
                        />
                      </div>
                    );
                  }
                }
              ]
            : []),
          {
            title: "当前合格率",
            dataIndex: "qualificationRatePercent",
            key: "qualificationRatePercent",
            width: 150,
            sorter: (a, b) =>
              compareNumber(summarizeSamples(a.samples, a.thresholdPercent).qualificationRatePercent, summarizeSamples(b.samples, b.thresholdPercent).qualificationRatePercent),
            render: (_, row) => {
              const summary = summarizeSamples(row.samples, row.thresholdPercent);
              const uploadedCount = countUploadedSamples(row.samples);
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontWeight: 600 }}>{summary.qualificationRatePercent}%</span>
                  <Text type="secondary">{`阳性 ${summary.positiveCount} / 已检测 ${uploadedCount}`}</Text>
                </div>
              );
            }
          },
          {
            title: completedCategory === "抗体检测" ? "检测结果" : "判定结果",
            dataIndex: "result",
            key: "result",
            width: 110,
            filters: [
              { text: "合格", value: "合格" },
              { text: "不合格", value: "不合格" }
            ],
            onFilter: (value, record) => summarizeSamples(record.samples, record.thresholdPercent).result === value,
            render: (_, row) => {
              const summary = summarizeSamples(row.samples, row.thresholdPercent);
              if (row.reviewCategory === "抗体检测" && isDynamicAntibodyTask(row)) {
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <Tag color="processing" style={{ width: "fit-content" }}>
                      检测中
                    </Tag>
                    <Text type="secondary">{`当前${summary.result}`}</Text>
                  </div>
                );
              }
              return <Tag color={summary.result === "合格" ? "success" : "error"}>{summary.result}</Tag>;
            }
          }
        ]
      : [];

  const listBase =
    completedCategory === "抗体检测"
      ? base.filter((column) => column.key !== "sampleContainer" && column.key !== "sampledCount")
      : base;

  return [
    ...listBase,
    ...completedOnly,
    ...(completedCategory === "抗体检测"
      ? []
      : [
          {
            title: "创建时间",
            dataIndex: "createdAt",
            key: "createdAt",
            width: 160,
            sorter: (a, b) => compareDateText(a.createdAt, b.createdAt)
          }
        ]),
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
          <Tooltip title="查看详情">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => onOpen(row.id, "view")}
              aria-label={`查看${row.id}的复核详情`}
            />
          </Tooltip>
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
  const isAntibodyTask = task.reviewCategory === "抗体检测";
  const uploadedCount = countUploadedSamples(task.samples);
  const uploadProgress = calculateUploadProgressPercent(task.samples);
  if (isAntibodyTask) {
    return (
      <Card className="section-card">
        <Title level={5} className="task-detail-section-title" style={{ marginTop: 0 }}>
          {title}
        </Title>
        <div className="review-sampling-antibody-summary">
          <div className="review-sampling-antibody-summary__progress">
            <div>
              <div className="review-sampling-summary-label">检测进度</div>
              <div className="review-sampling-antibody-summary__progress-value">
                {uploadedCount} / {summary.totalCount} 份
              </div>
            </div>
            <div className="review-sampling-antibody-summary__progress-bar">
              <div className="review-sampling-antibody-summary__progress-percent">{uploadProgress}%</div>
              <Progress
                percent={uploadProgress}
                size="small"
                showInfo={false}
                strokeColor={uploadProgress === 100 ? "#16a34a" : "#1677ff"}
              />
            </div>
          </div>
          <div className="review-sampling-antibody-summary__metrics">
            <div className="review-sampling-antibody-summary__metric review-sampling-antibody-summary__metric--primary">
              <div className="review-sampling-summary-label">当前合格率</div>
              <div className="review-sampling-antibody-summary__metric-value">
                {summary.qualificationRatePercent}%
              </div>
              <Text type="secondary">阳性 {summary.positiveCount} / 已检测 {uploadedCount}</Text>
            </div>
            <div className="review-sampling-antibody-summary__metric">
              <div className="review-sampling-summary-label">阳性数</div>
              <div className="review-sampling-summary-value">{summary.positiveCount} 头</div>
            </div>
            <div className="review-sampling-antibody-summary__metric">
              <div className="review-sampling-summary-label">阴性数</div>
              <div className="review-sampling-summary-value">{summary.negativeCount} 头</div>
            </div>
            <div className="review-sampling-antibody-summary__metric">
              <div className="review-sampling-summary-label">阈值</div>
              <div className="review-sampling-summary-value">{task.thresholdPercent}%</div>
            </div>
            <div className="review-sampling-antibody-summary__metric">
              <div className="review-sampling-summary-label">检测结果</div>
              <div className="review-sampling-summary-value">
                <Tag color={summary.result === "合格" ? "success" : "error"}>{summary.result}</Tag>
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  }

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
    if (
      activeTask &&
      ((activeTask.status === "待检测" && detailMode === "upload") ||
        (activeTask.status === "已检测" &&
          activeTask.reviewCategory === "抗体检测" &&
          detailMode === "upload" &&
          calculateUploadProgressPercent(activeTask.samples) < 100))
    ) {
      setDraftSamples(activeTask.samples.map((item) => ({ ...item })));
      setDirty(false);
      setSampleKeyword("");
      setReportFiles([]);
      setMeasurementUnit(activeTask.measurementUnit || "S/P值");
    }
  }, [activeTask, detailMode]);

  const reviewColumns = useMemo(() => {
    const openDetail = (taskId: string, mode: ReviewDetailMode) => {
      setCreateMode(false);
      setDetailMode(mode);
      setActiveTaskId(taskId);
    };

    const enhanceCompletedColumns = (completedCategory: ReviewSamplingTaskCategory): ColumnsType<ReviewSamplingTaskRow> =>
      reviewListColumns("已检测", completedCategory, openDetail).map((column) =>
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
      completedRegular: enhanceCompletedColumns("常规检测"),
      completedAntibody: enhanceCompletedColumns("抗体检测")
    };
  }, [onOpenVaccinationTask]);
  const completedRows = useMemo(
    () => reviewTasks.filter((item) => item.status === "已检测"),
    [reviewTasks]
  );
  const completedRegularRows = useMemo(
    () => completedRows.filter((item) => item.reviewCategory === "常规检测"),
    [completedRows]
  );
  const completedAntibodyRows = useMemo(
    () => completedRows.filter((item) => item.reviewCategory === "抗体检测"),
    [completedRows]
  );

  const pendingSummary = useMemo(
    () => summarizeSamples(draftSamples, activeTask?.thresholdPercent ?? 80),
    [activeTask?.thresholdPercent, draftSamples]
  );
  const completedSummary = useMemo(() => {
    if (!activeTask) return null;
    return summarizeSamples(activeTask.samples, activeTask.thresholdPercent);
  }, [activeTask]);

  const activeTaskUploadProgress = activeTask ? calculateUploadProgressPercent(activeTask.samples) : 0;
  const isAntibodyUploadContinuation =
    activeTask?.status === "已检测" &&
    activeTask?.reviewCategory === "抗体检测" &&
    detailMode === "upload" &&
    activeTaskUploadProgress < 100;
  const canEditResults = activeTask?.status === "待检测" ? detailMode === "upload" : isAntibodyUploadContinuation;
  const detailRows = canEditResults ? draftSamples : activeTask?.samples || [];
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
        const currentValue = canEditResults
          ? draftSamples.find((item) => item.id === row.id)?.measurementValue
          : row.measurementValue;

        if (!canEditResults) {
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
        const current = canEditResults
          ? draftSamples.find((item) => item.id === row.id)?.result
          : row.result;

        if (!canEditResults) {
          if (current) {
            return <Tag color={current === "阳性" ? "success" : "error"}>{current}</Tag>;
          }

          if (activeTask?.reviewCategory === "抗体检测") {
            return <Tag color="default">待上传</Tag>;
          }

          return "—";
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
        {
          label: "关联接种任务",
          value: activeTask.vaccinationTaskId
            ? onOpenVaccinationTask
              ? <Button type="link" style={{ paddingInline: 0 }} onClick={() => onOpenVaccinationTask(activeTask.vaccinationTaskId)}>{activeTask.vaccinationTaskId}</Button>
              : activeTask.vaccinationTaskId
            : "—"
        },
        { label: "检测类型", value: activeTask.reviewCategory },
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
    if (canEditResults && dirty) {
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
    const hasHalfFilledRow = draftSamples.some((item) => hasSampleDraftValue(item) && !isSampleUploaded(item));
    if (hasHalfFilledRow) {
      message.warning("请把已开始录入的样品补全检测值和检测结果。");
      return;
    }

    const uploadedCount = countUploadedSamples(draftSamples);
    if (activeTask.reviewCategory === "常规检测" && uploadedCount < draftSamples.length) {
      message.warning("请先完成全部样品结果录入。");
      return;
    }

    if (activeTask.reviewCategory === "抗体检测" && uploadedCount === 0) {
      message.warning("请至少上传 1 份样品结果后再保存进度。");
      return;
    }

    onSubmitResults(activeTask.id, draftSamples, measurementUnit);
    setDirty(false);
    setActiveTaskId(null);
    setDetailMode("view");
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
              <Text type="secondary">选择需要进行抗体采样检测的猪只，创建后会生成本轮样品明细。</Text>
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
    const isPending = canEditResults;
    const isPendingView = activeTask.status === "待检测" && detailMode === "view";
    const summary = isPending ? pendingSummary : completedSummary;
    const isDynamicAntibodyUpload = activeTask.reviewCategory === "抗体检测" && activeTaskUploadProgress < 100;
    return (
      <div>
        <div className="page-header">
          <div>
            <Button type="link" icon={<ArrowLeftOutlined />} style={{ paddingInline: 0 }} onClick={handleBackFromDetail}>
              返回复核任务列表
            </Button>
            <Title level={4} style={{ margin: 0 }}>
              {isSampling ? "复核采样详情" : isPending ? (isDynamicAntibodyUpload ? "抗体检测结果上传" : "复核结果上传") : "复核结果详情"}
            </Title>
            <Text type="secondary">
              {isSampling
                ? "查看本轮待采样任务的样品范围与采样要求。"
                : isPending
                  ? isDynamicAntibodyUpload
                    ? "抗体检测支持分批上传样品结果，系统会实时更新检测进度和当前判定。"
                    : "逐条录入样品结果，系统会自动计算合格率并回写接种任务。"
                  : "查看已提交的复核结果汇总与单样品明细。"}
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

        {(activeTask.status === "已检测" || isPending) && summary ? (
          <SummaryGrid
            title={isDynamicAntibodyUpload ? "当前检测汇总" : "复核结果汇总"}
            task={activeTask}
            summary={summary}
            showFilled={isPending}
          />
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
            columns={isSampling || (isPendingView && activeTask.reviewCategory !== "抗体检测") ? samplingColumns : detailColumns}
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
                  disabled={
                    activeTask.reviewCategory === "常规检测"
                      ? draftSamples.some((item) => !isSampleUploaded(item))
                      : draftSamples.every((item) => !isSampleUploaded(item))
                  }
                >
                  {activeTask.reviewCategory === "抗体检测" && isDynamicAntibodyUpload ? "保存并更新进度" : "提交结果"}
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
          <Text type="secondary">按常规检测和抗体检测查看已检测结果，结果提交后自动回写接种任务。</Text>
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
          items={[
            {
              key: "已检测",
              label: `已检测 (${completedRows.length})`,
              children: (
                <Tabs
                  items={[
                    {
                      key: "completed-regular",
                      label: `常规检测 (${completedRegularRows.length})`,
                      children: (
                        <Table
                          rowKey="id"
                          dataSource={completedRegularRows}
                          pagination={false}
                          scroll={{ x: "max-content" }}
                          locale={{ emptyText: "暂无常规检测任务" }}
                          columns={reviewColumns.completedRegular}
                        />
                      )
                    },
                    {
                      key: "completed-antibody",
                      label: `抗体检测 (${completedAntibodyRows.length})`,
                      children: (
                        <Table
                          rowKey="id"
                          dataSource={completedAntibodyRows}
                          pagination={false}
                          scroll={{ x: "max-content" }}
                          locale={{ emptyText: "暂无抗体检测任务" }}
                          columns={reviewColumns.completedAntibody}
                        />
                      )
                    }
                  ]}
                />
              )
            }
          ]}
        />
      </Card>
    </div>
  );
}
