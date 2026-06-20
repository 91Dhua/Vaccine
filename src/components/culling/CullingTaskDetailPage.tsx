import { ArrowLeftOutlined, EyeOutlined, MenuOutlined, RightOutlined, SearchOutlined } from "@ant-design/icons";
import { Alert, Avatar, Breadcrumb, Button, Card, Input, InputNumber, Modal, Progress, Table, Tabs, Tag, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { Key } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import "./CullingTaskDetailPage.css";

type SowRecord = {
  key: string;
  sowId: string;
  location: string;
  taskStatus: string;
  bodyScore: string;
  abnormalCount: string;
  observation: string;
};

type RetainedPigletRecord = {
  key: string;
  pigletId: string;
  sowId: string;
  sireId: string;
  location: string;
  gender: string;
  age: string;
  weight: string;
};

type CullingDecisionStatus = "建议淘汰" | "确认淘汰" | "已淘汰";
type CullingDecisionRecord = {
  key: string;
  sowId: string;
  location: string;
  cullingIndex: number;
  parity: number;
  dystociaHistoryCount: number;
  averageLitterSize: number;
  teatCount: number;
  averageLiveBorn: number;
  returnToEstrusCount: number;
  diseaseTags: string[];
  status: CullingDecisionStatus;
  operator: string;
  operatedAt: string;
};

type DetailSubPage = "main" | "culling" | "retained";

const sowColumns: ColumnsType<SowRecord> = [
  {
    title: "猪只ID",
    dataIndex: "sowId",
    sorter: (a, b) => a.sowId.localeCompare(b.sowId),
    render: (value: string) => <span className="culling-detail-link">{value}</span>
  },
  {
    title: "位置",
    dataIndex: "location",
    sorter: (a, b) => a.location.localeCompare(b.location)
  },
  {
    title: "任务状态",
    dataIndex: "taskStatus",
    filters: [{ text: "已检查", value: "已检查" }],
    onFilter: (value, record) => record.taskStatus === value,
    render: (value: string) => <Tag className="culling-detail-status-tag">{value}</Tag>
  },
  {
    title: "体况评分",
    dataIndex: "bodyScore",
    sorter: (a, b) => Number(a.bodyScore.replace(/\D/g, "")) - Number(b.bodyScore.replace(/\D/g, ""))
  },
  {
    title: "检查异常",
    dataIndex: "abnormalCount",
    filters: [{ text: "有异常", value: "has" }, { text: "无异常", value: "none" }],
    onFilter: (value, record) => (value === "has" ? record.abnormalCount !== "-" : record.abnormalCount === "-"),
    sorter: (a, b) => Number(a.abnormalCount.replace(/\D/g, "") || 0) - Number(b.abnormalCount.replace(/\D/g, "") || 0),
    render: (value: string) => <span className="culling-detail-emphasis">{value}</span>
  },
  {
    title: "其他观察",
    dataIndex: "observation"
  }
];

const sowData: SowRecord[] = [
  {
    key: "1",
    sowId: "DEV000002",
    location: "-",
    taskStatus: "已检查",
    bodyScore: "3分",
    abnormalCount: "3项异常",
    observation: "-"
  },
  {
    key: "2",
    sowId: "DEV000004",
    location: "-",
    taskStatus: "已检查",
    bodyScore: "2分",
    abnormalCount: "3项异常",
    observation: "-"
  }
];

const cullingDecisionData: CullingDecisionRecord[] = [
  {
    key: "cull-1",
    sowId: "DEV000004",
    location: "A2 · 断奶舍",
    cullingIndex: 82,
    parity: 5,
    dystociaHistoryCount: 2,
    averageLitterSize: 9.4,
    teatCount: 13,
    averageLiveBorn: 8.8,
    returnToEstrusCount: 1,
    diseaseTags: ["高胎龄"],
    status: "建议淘汰",
    operator: "王敏",
    operatedAt: "2026-05-18 09:20"
  },
  {
    key: "cull-2",
    sowId: "DEV000006",
    location: "A3 · 配怀舍",
    cullingIndex: 91,
    parity: 6,
    dystociaHistoryCount: 2,
    averageLitterSize: 8.9,
    teatCount: 11,
    averageLiveBorn: 8.1,
    returnToEstrusCount: 2,
    diseaseTags: ["肢蹄问题"],
    status: "已淘汰",
    operator: "王敏",
    operatedAt: "2026-05-18 10:10"
  },
  {
    key: "cull-3",
    sowId: "DEV000009",
    location: "B1 · 配怀舍",
    cullingIndex: 76,
    parity: 4,
    dystociaHistoryCount: 1,
    averageLitterSize: 9.1,
    teatCount: 12,
    averageLiveBorn: 8.4,
    returnToEstrusCount: 0,
    diseaseTags: ["乳房炎", "治疗中"],
    status: "确认淘汰",
    operator: "赵磊",
    operatedAt: "2026-05-18 11:25"
  },
  {
    key: "cull-4",
    sowId: "DEV000012",
    location: "B2 · 断奶舍",
    cullingIndex: 79,
    parity: 3,
    dystociaHistoryCount: 1,
    averageLitterSize: 8.6,
    teatCount: 12,
    averageLiveBorn: 7.9,
    returnToEstrusCount: 1,
    diseaseTags: ["体况恢复慢"],
    status: "建议淘汰",
    operator: "刘婷",
    operatedAt: "2026-05-18 14:05"
  },
  {
    key: "cull-5",
    sowId: "DEV000013",
    location: "C1 · 断奶舍",
    cullingIndex: 88,
    parity: 1,
    dystociaHistoryCount: 0,
    averageLitterSize: 10.1,
    teatCount: 14,
    averageLiveBorn: 9.7,
    returnToEstrusCount: 3,
    diseaseTags: ["返情频繁"],
    status: "已淘汰",
    operator: "系统",
    operatedAt: "2026-05-18 16:30"
  },
  {
    key: "cull-6",
    sowId: "DEV000015",
    location: "C2 · 断奶舍",
    cullingIndex: 84,
    parity: 5,
    dystociaHistoryCount: 2,
    averageLitterSize: 8.7,
    teatCount: 12,
    averageLiveBorn: 8.2,
    returnToEstrusCount: 1,
    diseaseTags: ["产仔下降"],
    status: "建议淘汰",
    operator: "陈雨",
    operatedAt: "2026-05-19 08:40"
  },
  {
    key: "cull-7",
    sowId: "DEV000018",
    location: "C3 · 配怀舍",
    cullingIndex: 87,
    parity: 6,
    dystociaHistoryCount: 3,
    averageLitterSize: 8.3,
    teatCount: 11,
    averageLiveBorn: 7.8,
    returnToEstrusCount: 2,
    diseaseTags: ["难产史", "高胎龄"],
    status: "建议淘汰",
    operator: "李刚",
    operatedAt: "2026-05-19 09:15"
  },
  {
    key: "cull-8",
    sowId: "DEV000021",
    location: "D1 · 断奶舍",
    cullingIndex: 73,
    parity: 2,
    dystociaHistoryCount: 0,
    averageLitterSize: 8.5,
    teatCount: 12,
    averageLiveBorn: 8.0,
    returnToEstrusCount: 1,
    diseaseTags: ["乳汁不足"],
    status: "确认淘汰",
    operator: "赵磊",
    operatedAt: "2026-05-19 10:05"
  },
  {
    key: "cull-9",
    sowId: "DEV000024",
    location: "D2 · 断奶舍",
    cullingIndex: 90,
    parity: 7,
    dystociaHistoryCount: 2,
    averageLitterSize: 8.2,
    teatCount: 10,
    averageLiveBorn: 7.6,
    returnToEstrusCount: 2,
    diseaseTags: ["高胎龄", "乳头不足"],
    status: "建议淘汰",
    operator: "王敏",
    operatedAt: "2026-05-19 11:20"
  },
  {
    key: "cull-10",
    sowId: "DEV000027",
    location: "D3 · 配怀舍",
    cullingIndex: 78,
    parity: 4,
    dystociaHistoryCount: 1,
    averageLitterSize: 8.8,
    teatCount: 12,
    averageLiveBorn: 8.2,
    returnToEstrusCount: 2,
    diseaseTags: ["返情频繁"],
    status: "确认淘汰",
    operator: "刘婷",
    operatedAt: "2026-05-19 13:10"
  },
  {
    key: "cull-11",
    sowId: "DEV000030",
    location: "E1 · 断奶舍",
    cullingIndex: 85,
    parity: 5,
    dystociaHistoryCount: 2,
    averageLitterSize: 8.4,
    teatCount: 12,
    averageLiveBorn: 7.7,
    returnToEstrusCount: 1,
    diseaseTags: ["体况差"],
    status: "建议淘汰",
    operator: "陈雨",
    operatedAt: "2026-05-19 14:25"
  },
  {
    key: "cull-12",
    sowId: "DEV000033",
    location: "E2 · 配怀舍",
    cullingIndex: 81,
    parity: 3,
    dystociaHistoryCount: 1,
    averageLitterSize: 9.0,
    teatCount: 13,
    averageLiveBorn: 8.3,
    returnToEstrusCount: 2,
    diseaseTags: ["配种失败"],
    status: "建议淘汰",
    operator: "李刚",
    operatedAt: "2026-05-19 15:05"
  },
  {
    key: "cull-13",
    sowId: "DEV000036",
    location: "E3 · 断奶舍",
    cullingIndex: 77,
    parity: 4,
    dystociaHistoryCount: 1,
    averageLitterSize: 9.3,
    teatCount: 12,
    averageLiveBorn: 8.6,
    returnToEstrusCount: 0,
    diseaseTags: ["慢性炎症"],
    status: "确认淘汰",
    operator: "王敏",
    operatedAt: "2026-05-19 16:30"
  },
  {
    key: "cull-14",
    sowId: "DEV000039",
    location: "F1 · 断奶舍",
    cullingIndex: 89,
    parity: 6,
    dystociaHistoryCount: 2,
    averageLitterSize: 8.1,
    teatCount: 11,
    averageLiveBorn: 7.5,
    returnToEstrusCount: 3,
    diseaseTags: ["返情频繁", "高胎龄"],
    status: "建议淘汰",
    operator: "刘婷",
    operatedAt: "2026-05-20 08:10"
  },
  {
    key: "cull-15",
    sowId: "DEV000042",
    location: "F2 · 配怀舍",
    cullingIndex: 74,
    parity: 2,
    dystociaHistoryCount: 0,
    averageLitterSize: 8.9,
    teatCount: 12,
    averageLiveBorn: 8.1,
    returnToEstrusCount: 2,
    diseaseTags: ["反复空怀"],
    status: "建议淘汰",
    operator: "赵磊",
    operatedAt: "2026-05-20 09:35"
  },
  {
    key: "cull-16",
    sowId: "DEV000045",
    location: "F3 · 断奶舍",
    cullingIndex: 83,
    parity: 5,
    dystociaHistoryCount: 2,
    averageLitterSize: 8.6,
    teatCount: 13,
    averageLiveBorn: 8.0,
    returnToEstrusCount: 1,
    diseaseTags: ["产后恢复慢"],
    status: "确认淘汰",
    operator: "陈雨",
    operatedAt: "2026-05-20 10:20"
  },
  {
    key: "cull-17",
    sowId: "DEV000048",
    location: "G1 · 配怀舍",
    cullingIndex: 86,
    parity: 6,
    dystociaHistoryCount: 3,
    averageLitterSize: 8.4,
    teatCount: 12,
    averageLiveBorn: 7.9,
    returnToEstrusCount: 2,
    diseaseTags: ["难产史"],
    status: "建议淘汰",
    operator: "李刚",
    operatedAt: "2026-05-20 11:05"
  },
  {
    key: "cull-18",
    sowId: "DEV000051",
    location: "G2 · 断奶舍",
    cullingIndex: 80,
    parity: 4,
    dystociaHistoryCount: 1,
    averageLitterSize: 9.2,
    teatCount: 12,
    averageLiveBorn: 8.4,
    returnToEstrusCount: 1,
    diseaseTags: ["乳房硬结"],
    status: "确认淘汰",
    operator: "赵磊",
    operatedAt: "2026-05-20 13:15"
  },
  {
    key: "cull-19",
    sowId: "DEV000054",
    location: "G3 · 断奶舍",
    cullingIndex: 92,
    parity: 7,
    dystociaHistoryCount: 2,
    averageLitterSize: 8.0,
    teatCount: 10,
    averageLiveBorn: 7.3,
    returnToEstrusCount: 3,
    diseaseTags: ["高胎龄", "乳头不足"],
    status: "建议淘汰",
    operator: "王敏",
    operatedAt: "2026-05-20 14:40"
  },
  {
    key: "cull-20",
    sowId: "DEV000057",
    location: "H1 · 配怀舍",
    cullingIndex: 75,
    parity: 3,
    dystociaHistoryCount: 1,
    averageLitterSize: 9.0,
    teatCount: 13,
    averageLiveBorn: 8.3,
    returnToEstrusCount: 1,
    diseaseTags: ["治疗中"],
    status: "确认淘汰",
    operator: "刘婷",
    operatedAt: "2026-05-20 15:25"
  },
  {
    key: "cull-21",
    sowId: "DEV000060",
    location: "H2 · 断奶舍",
    cullingIndex: 88,
    parity: 5,
    dystociaHistoryCount: 2,
    averageLitterSize: 8.5,
    teatCount: 11,
    averageLiveBorn: 7.8,
    returnToEstrusCount: 2,
    diseaseTags: ["肢蹄问题"],
    status: "建议淘汰",
    operator: "陈雨",
    operatedAt: "2026-05-20 16:10"
  },
  {
    key: "cull-22",
    sowId: "DEV000063",
    location: "H3 · 断奶舍",
    cullingIndex: 82,
    parity: 4,
    dystociaHistoryCount: 1,
    averageLitterSize: 8.7,
    teatCount: 12,
    averageLiveBorn: 8.1,
    returnToEstrusCount: 2,
    diseaseTags: ["反复空怀"],
    status: "确认淘汰",
    operator: "李刚",
    operatedAt: "2026-05-20 17:00"
  },
  {
    key: "cull-23",
    sowId: "DEV000066",
    location: "J1 · 配怀舍",
    cullingIndex: 79,
    parity: 3,
    dystociaHistoryCount: 0,
    averageLitterSize: 9.1,
    teatCount: 12,
    averageLiveBorn: 8.5,
    returnToEstrusCount: 1,
    diseaseTags: ["体况恢复慢"],
    status: "确认淘汰",
    operator: "王敏",
    operatedAt: "2026-05-21 08:30"
  },
  {
    key: "cull-24",
    sowId: "DEV000069",
    location: "J2 · 断奶舍",
    cullingIndex: 86,
    parity: 6,
    dystociaHistoryCount: 2,
    averageLitterSize: 8.8,
    teatCount: 11,
    averageLiveBorn: 8.0,
    returnToEstrusCount: 2,
    diseaseTags: ["肢蹄问题", "高胎龄"],
    status: "确认淘汰",
    operator: "赵磊",
    operatedAt: "2026-05-21 09:45"
  },
  {
    key: "cull-25",
    sowId: "DEV000072",
    location: "J3 · 配怀舍",
    cullingIndex: 77,
    parity: 4,
    dystociaHistoryCount: 1,
    averageLitterSize: 9.3,
    teatCount: 13,
    averageLiveBorn: 8.6,
    returnToEstrusCount: 1,
    diseaseTags: ["慢性炎症"],
    status: "确认淘汰",
    operator: "刘婷",
    operatedAt: "2026-05-21 10:20"
  },
  {
    key: "cull-26",
    sowId: "DEV000075",
    location: "J4 · 断奶舍",
    cullingIndex: 84,
    parity: 5,
    dystociaHistoryCount: 2,
    averageLitterSize: 8.9,
    teatCount: 12,
    averageLiveBorn: 8.2,
    returnToEstrusCount: 2,
    diseaseTags: ["返情频繁", "体况差"],
    status: "确认淘汰",
    operator: "陈雨",
    operatedAt: "2026-05-21 11:05"
  }
];

const retainedPigletColumns: ColumnsType<RetainedPigletRecord> = [
  {
    title: "仔猪ID",
    dataIndex: "pigletId",
    sorter: (a, b) => a.pigletId.localeCompare(b.pigletId),
    render: (value: string) => <span className="culling-detail-link">{value}</span>
  },
  {
    title: "母猪ID",
    dataIndex: "sowId",
    sorter: (a, b) => a.sowId.localeCompare(b.sowId)
  },
  {
    title: "父系ID",
    dataIndex: "sireId",
    sorter: (a, b) => a.sireId.localeCompare(b.sireId)
  },
  {
    title: "位置",
    dataIndex: "location",
    sorter: (a, b) => a.location.localeCompare(b.location, "zh-Hans-CN")
  },
  {
    title: "日龄",
    dataIndex: "age",
    sorter: (a, b) => Number(a.age.replace(/\D/g, "")) - Number(b.age.replace(/\D/g, ""))
  },
  {
    title: "断奶体重",
    dataIndex: "weight",
    sorter: (a, b) => Number(a.weight.replace(/[^\d.]/g, "")) - Number(b.weight.replace(/[^\d.]/g, ""))
  }
];

const retainedPigletData: RetainedPigletRecord[] = [
  {
    key: "piglet-1",
    pigletId: "P-260315-001",
    sowId: "DEV000002",
    sireId: "BOAR-118",
    location: "A1 · 保育预留栏",
    gender: "母",
    age: "28日龄",
    weight: "7.1kg"
  },
  {
    key: "piglet-2",
    pigletId: "P-260315-003",
    sowId: "DEV000002",
    sireId: "BOAR-118",
    location: "A1 · 保育预留栏",
    gender: "公",
    age: "28日龄",
    weight: "6.9kg"
  },
  {
    key: "piglet-3",
    pigletId: "P-260315-011",
    sowId: "DEV000004",
    sireId: "BOAR-125",
    location: "A2 · 保育预留栏",
    gender: "母",
    age: "27日龄",
    weight: "6.7kg"
  },
  {
    key: "piglet-4",
    pigletId: "P-260315-015",
    sowId: "DEV000004",
    sireId: "BOAR-125",
    location: "A2 · 保育预留栏",
    gender: "公",
    age: "27日龄",
    weight: "7.0kg"
  },
  {
    key: "piglet-5",
    pigletId: "P-260315-018",
    sowId: "DEV000004",
    sireId: "BOAR-125",
    location: "A2 · 保育预留栏",
    gender: "母",
    age: "27日龄",
    weight: "7.2kg"
  }
];

const cullingDecisionColumns: ColumnsType<CullingDecisionRecord> = [
  {
    title: "猪只ID",
    dataIndex: "sowId",
    fixed: "left",
    width: 132,
    sorter: (a, b) => a.sowId.localeCompare(b.sowId),
    render: (value: string) => <span className="culling-detail-sow-id">{value}</span>
  },
  {
    title: "位置",
    dataIndex: "location",
    width: 128,
    sorter: (a, b) => a.location.localeCompare(b.location, "zh-Hans-CN")
  },
  {
    title: "淘汰指数",
    dataIndex: "cullingIndex",
    align: "center",
    width: 96,
    sorter: (a, b) => a.cullingIndex - b.cullingIndex,
    render: (value: number, row) => (
      <Tooltip
        placement="right"
        overlayClassName="culling-detail-index-popover"
        title={
          <div className="culling-detail-index-tooltip">
            <div className="culling-detail-index-tooltip-title">最新检查结果</div>
            <div className="culling-detail-index-tooltip-notice">请确认母猪当前体况，并按现场检查结果给出淘汰建议。</div>
            <CullingCheckResult title="乳房炎" value="无" />
            <CullingCheckResult title="乳汁产能" value="中" />
            <CullingCheckResult title="分泌物" value="正常" />
            <CullingCheckResult title="采食情况" value="正常" />
            <CullingCheckResult title="活动能力" value="正常" />
            <CullingCheckResult title="背膘" value="适中" />
          </div>
        }
      >
        <span className={`culling-detail-culling-index ${value >= 85 ? "is-high" : ""}`}>{value}</span>
      </Tooltip>
    )
  },
  {
    title: "胎次",
    dataIndex: "parity",
    align: "center",
    width: 72,
    sorter: (a, b) => a.parity - b.parity,
    render: (value: number) => <span className={`culling-detail-metric ${value >= 6 ? "is-risk" : ""}`}>{value}</span>
  },
  {
    title: "历史难产",
    dataIndex: "dystociaHistoryCount",
    align: "center",
    width: 96,
    sorter: (a, b) => a.dystociaHistoryCount - b.dystociaHistoryCount,
    render: (value: number) => <span className={`culling-detail-metric ${value >= 2 ? "is-risk" : ""}`}>{value} 次</span>
  },
  {
    title: "窝均产仔",
    dataIndex: "averageLitterSize",
    align: "center",
    width: 96,
    sorter: (a, b) => a.averageLitterSize - b.averageLitterSize,
    render: (value: number) => <span className={`culling-detail-metric ${value < 9.5 ? "is-risk" : ""}`}>{value} 头</span>
  },
  {
    title: "乳头数量",
    dataIndex: "teatCount",
    align: "center",
    width: 96,
    sorter: (a, b) => a.teatCount - b.teatCount,
    render: (value: number) => <span className={`culling-detail-metric ${value < 12 ? "is-risk" : ""}`}>{value} 个</span>
  },
  {
    title: "窝均活仔",
    dataIndex: "averageLiveBorn",
    align: "center",
    width: 96,
    sorter: (a, b) => a.averageLiveBorn - b.averageLiveBorn,
    render: (value: number) => <span className={`culling-detail-metric ${value < 8.5 ? "is-risk" : ""}`}>{value} 头</span>
  },
  {
    title: "反情次数",
    dataIndex: "returnToEstrusCount",
    align: "center",
    width: 96,
    sorter: (a, b) => a.returnToEstrusCount - b.returnToEstrusCount,
    render: (value: number) => <span className={`culling-detail-metric ${value >= 2 ? "is-risk" : ""}`}>{value} 次</span>
  },
  {
    title: "疾病标签",
    dataIndex: "diseaseTags",
    width: 168,
    render: (tags: string[]) => tags.length ? (
      <div className="culling-detail-disease-tags">
        {tags.map((tag) => <Tag key={tag} color="red">{tag}</Tag>)}
      </div>
    ) : <span className="culling-detail-muted">-</span>
  },
  {
    title: "操作人/时间",
    key: "operatorTime",
    width: 142,
    sorter: (a, b) => `${a.operator}${a.operatedAt}`.localeCompare(`${b.operator}${b.operatedAt}`, "zh-Hans-CN"),
    render: (_, row) => (
      <div className="culling-detail-operator-cell">
        <span className="culling-detail-operator">{row.operator || "-"}</span>
        <span className="culling-detail-muted">{row.operatedAt || "-"}</span>
      </div>
    )
  }
];

export function CullingTaskDetailPage({
  embedded = false,
  initialSubPage = "main",
  focusPendingCulling = false,
  lockedSubPage = false,
  onBack
}: {
  embedded?: boolean;
  initialSubPage?: DetailSubPage;
  focusPendingCulling?: boolean;
  lockedSubPage?: boolean;
  onBack: () => void;
}) {
  const [detailSubPage, setDetailSubPage] = useState<DetailSubPage>(initialSubPage);
  const pendingCullingListRef = useRef<HTMLDivElement>(null);
  const [sowKeyword, setSowKeyword] = useState("");
  const [cullingKeyword, setCullingKeyword] = useState("");
  const [cullingRows, setCullingRows] = useState<CullingDecisionRecord[]>(cullingDecisionData);
  const [cullingDecisionTab, setCullingDecisionTab] = useState<"pending" | "confirmed">("pending");
  const [selectedCullingKeys, setSelectedCullingKeys] = useState<Key[]>([]);
  const [confirmCullingOpen, setConfirmCullingOpen] = useState(false);
  const [confirmCullingCountInput, setConfirmCullingCountInput] = useState<number | null>(null);
  const [retainedKeyword, setRetainedKeyword] = useState("");
  const [retainedTab, setRetainedTab] = useState<"boar" | "gilt">("gilt");

  const filteredSowData = useMemo(() => {
    const q = sowKeyword.trim();
    if (!q) return sowData;
    return sowData.filter((item) => `${item.sowId}${item.location}${item.observation}`.includes(q));
  }, [sowKeyword]);

  const filteredPendingCullingDecisions = useMemo(() => {
    const q = cullingKeyword.trim();
    const pendingRows = cullingRows.filter((item) => item.status === "建议淘汰");
    if (!q) return pendingRows;
    return pendingRows.filter((item) => item.sowId.includes(q));
  }, [cullingKeyword, cullingRows]);

  const latestPendingCullingUpdatedAt = useMemo(() => {
    const pendingRows = cullingRows.filter((item) => item.status === "建议淘汰" && item.operatedAt);
    if (pendingRows.length === 0) return "-";
    return pendingRows
      .map((item) => item.operatedAt)
      .sort((a, b) => b.localeCompare(a))[0];
  }, [cullingRows]);

  const filteredConfirmedCullingDecisions = useMemo(() => {
    const q = cullingKeyword.trim();
    const confirmedRows = cullingRows.filter((item) => item.status === "确认淘汰");
    if (!q) return confirmedRows;
    return confirmedRows.filter((item) => item.sowId.includes(q));
  }, [cullingKeyword, cullingRows]);

  const filteredRetainedPiglets = useMemo(() => {
    const q = retainedKeyword.trim();
    const tabFiltered = retainedPigletData.filter((item) =>
      retainedTab === "boar" ? item.gender === "公" : item.gender === "母"
    );
    if (!q) return tabFiltered;
    return tabFiltered.filter((item) => `${item.pigletId}${item.sowId}${item.location}`.includes(q));
  }, [retainedKeyword, retainedTab]);

  const retainedBoarCount = useMemo(() => retainedPigletData.filter((item) => item.gender === "公").length, []);
  const retainedGiltCount = useMemo(() => retainedPigletData.filter((item) => item.gender === "母").length, []);

  const checkedTotal = sowData.length;
  const checkedDone = sowData.filter((item) => item.taskStatus === "已检查").length;
  const plannedCullingCount = 4;
  const decidedCullingCount = cullingRows.filter((item) => item.status === "确认淘汰").length;
  const retainedTarget = 6;
  const retainedDone = retainedPigletData.length;

  const pageTitle = detailSubPage === "culling" ? "淘汰猪只" : detailSubPage === "retained" ? "留种仔猪" : "断奶";

  useEffect(() => {
    if (!focusPendingCulling || detailSubPage !== "culling") return;
    setCullingDecisionTab("pending");
    window.requestAnimationFrame(() => {
      pendingCullingListRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  }, [detailSubPage, focusPendingCulling]);

  const handleBack = () => {
    if (detailSubPage === "main" || lockedSubPage) {
      onBack();
      return;
    }
    setDetailSubPage("main");
  };

  const openConfirmSelectedCulling = () => {
    if (selectedCullingKeys.length === 0) return;
    setConfirmCullingCountInput(null);
    setConfirmCullingOpen(true);
  };

  const confirmSelectedCulling = () => {
    if (selectedCullingKeys.length === 0 || confirmCullingCountInput !== selectedCullingKeys.length) return;
    const selectedKeySet = new Set(selectedCullingKeys.map(String));
    setCullingRows((prev) =>
      prev.map((item) =>
        selectedKeySet.has(item.key) && item.status === "建议淘汰"
          ? { ...item, status: "确认淘汰", operator: "当前用户", operatedAt: "2026-05-27 10:30" }
          : item
      )
    );
    setConfirmCullingOpen(false);
    setConfirmCullingCountInput(null);
    setSelectedCullingKeys([]);
  };

  return (
    <div className={`culling-detail-page ${embedded ? "is-embedded" : ""}`}>
      {!embedded ? (
        <div className="culling-detail-topbar">
          <Button type="text" className="culling-detail-icon-button" icon={<MenuOutlined />} />
          <div className="culling-detail-topbar-actions">
            <span className="culling-detail-flag">🇨🇳</span>
            <Avatar className="culling-detail-avatar">A</Avatar>
          </div>
        </div>
      ) : null}

      {!embedded ? (
        <>
          <div className="culling-detail-header-row">
            <div className="culling-detail-header-main">
              <Button type="text" icon={<ArrowLeftOutlined />} className="culling-detail-back" onClick={handleBack} />
              <h1 className="culling-detail-title">{pageTitle}</h1>
            </div>
            <Button className="culling-detail-end-button">结束任务</Button>
          </div>

          <Breadcrumb
            className="culling-detail-breadcrumb"
            items={[
              { title: "首页" },
              { title: "生产批次" },
              { title: "断奶" },
              ...(detailSubPage === "main" ? [] : [{ title: pageTitle }])
            ]}
          />
        </>
      ) : null}

      {detailSubPage === "main" ? (
        <>
          <div className="culling-detail-summary-grid">
            <Card className="culling-detail-card" bordered={false}>
              <h2 className="culling-detail-card-title">任务信息</h2>
              <div className="culling-detail-info-grid">
                <div>
                  <div className="culling-detail-label">任务ID</div>
                  <div className="culling-detail-value">BATCH-7E923B81-LACTATION</div>
                </div>
                <div>
                  <div className="culling-detail-label">任务状态</div>
                  <div className="culling-detail-value culling-detail-value--status">
                    <Tag className="culling-detail-tag-success">已结束</Tag>
                  </div>
                </div>
                <div>
                  <div className="culling-detail-label">批次号</div>
                  <div className="culling-detail-value">0001</div>
                </div>
                <div>
                  <div className="culling-detail-label">猪只数量</div>
                  <div className="culling-detail-value">2</div>
                </div>
                <div>
                  <div className="culling-detail-label">预计批次起始日期</div>
                  <div className="culling-detail-value">2026/03/13</div>
                </div>
                <div>
                  <div className="culling-detail-label">实际批次起始日期</div>
                  <div className="culling-detail-value">2026/03/13</div>
                </div>
                <div>
                  <div className="culling-detail-label">猪舍</div>
                  <div className="culling-detail-value">-</div>
                </div>
                <div>
                  <div className="culling-detail-label">实际执行人</div>
                  <div className="culling-detail-value">-</div>
                </div>
                <div>
                  <div className="culling-detail-label">
                    <TaskProgressLabel
                      label="淘汰进度"
                      tooltip="查看淘汰详情"
                      onClick={() => setDetailSubPage("culling")}
                    />
                  </div>
                  <div className="culling-detail-value">
                    <TaskProgressValue
                      done={decidedCullingCount}
                      total={plannedCullingCount}
                      tooltip="确认淘汰 / 目标淘汰"
                    />
                  </div>
                </div>
                <div>
                  <div className="culling-detail-label">
                    <TaskProgressLabel
                      label="留种进度"
                      tooltip="查看留种详情"
                      onClick={() => setDetailSubPage("retained")}
                    />
                  </div>
                  <div className="culling-detail-value">
                    <TaskProgressValue
                      done={retainedDone}
                      total={retainedTarget}
                      tooltip="标记留种 / 目标留种"
                    />
                  </div>
                </div>
              </div>
            </Card>

            <Card className="culling-detail-card culling-detail-card--metrics" bordered={false}>
              <h2 className="culling-detail-card-title">任务数据</h2>
              <div className="culling-detail-metrics-box">
                <div>
                  <div className="culling-detail-label">
                    断奶平均体重
                    <Tooltip title="用于查看断奶质量">
                      <span className="culling-detail-info-dot">i</span>
                    </Tooltip>
                  </div>
                  <div className="culling-detail-metric-value">1.9 <span>kg</span></div>
                </div>
                <div>
                  <div className="culling-detail-label">
                    断奶存活率
                    <Tooltip title="用于查看断奶存活水平">
                      <span className="culling-detail-info-dot">i</span>
                    </Tooltip>
                  </div>
                  <div className="culling-detail-metric-value">0 <span>%</span></div>
                </div>
              </div>
              <Progress percent={100} showInfo={false} strokeColor="#39c54a" className="culling-detail-progress" />
              <div className="culling-detail-progress-row">
                <span className="culling-detail-label">已检查 / 需检查</span>
                <span className="culling-detail-progress-value">{checkedDone} / {checkedTotal} 头</span>
              </div>
            </Card>
          </div>

          <Card className="culling-detail-card culling-detail-record-card" bordered={false}>
            <h2 className="culling-detail-card-title">断奶记录</h2>
            <div className="culling-detail-toolbar">
              <Input
                className="culling-detail-search"
                prefix={<SearchOutlined />}
                value={sowKeyword}
                onChange={(e) => setSowKeyword(e.target.value)}
                placeholder="搜索母猪 ID / 位置"
              />
            </div>
            <Table<SowRecord>
              columns={sowColumns}
              dataSource={filteredSowData}
              pagination={{
                pageSize: 25,
                showSizeChanger: true,
                pageSizeOptions: ["25", "50", "100"],
                showTotal: (total, range) => `${range[0]}-${range[1]} 条，共 ${total} 条`
              }}
            />
          </Card>


        </>
      ) : null}

      {detailSubPage === "culling" ? (
        <Card className="culling-detail-card culling-detail-record-card culling-detail-decision-page" bordered={false}>
          <div className="culling-detail-decision-shell" ref={pendingCullingListRef}>
            <Tabs
              className="culling-detail-decision-tabs"
              activeKey={cullingDecisionTab}
              onChange={(key) => {
                setCullingDecisionTab(key as "pending" | "confirmed");
                setSelectedCullingKeys([]);
              }}
              items={[
                {
                  key: "pending",
                  label: (
                    <span className="culling-detail-decision-tab-label">
                      建议淘汰
                      <span>{filteredPendingCullingDecisions.length} 头</span>
                    </span>
                  )
                },
                {
                  key: "confirmed",
                  label: (
                    <span className="culling-detail-decision-tab-label">
                      确认淘汰
                      <span>{filteredConfirmedCullingDecisions.length} 头</span>
                    </span>
                  )
                }
              ]}
            />
          </div>

          <div className="culling-detail-toolbar culling-detail-toolbar--split culling-detail-decision-toolbar">
            <Input
              className="culling-detail-search culling-detail-search--wide"
              prefix={<SearchOutlined />}
              value={cullingKeyword}
              onChange={(e) => setCullingKeyword(e.target.value)}
              placeholder="搜索母猪 ID"
            />
          </div>

          {cullingDecisionTab === "pending" ? (
            <>
              <div className="culling-detail-decision-hint">
                请勾选需要确认淘汰的猪只，点击「确认淘汰」后，猪只将进入「确认淘汰」列表。
              </div>
              <Table<CullingDecisionRecord>
                key="pending-culling-decisions"
                className="culling-detail-culling-table"
                columns={cullingDecisionColumns}
                dataSource={filteredPendingCullingDecisions}
                rowSelection={{
                  selectedRowKeys: selectedCullingKeys,
                  onChange: setSelectedCullingKeys
                }}
                pagination={{
                  pageSize: 10,
                  showSizeChanger: false,
                  showTotal: (total, range) => `${range[0]}-${range[1]} 条，共 ${total} 条`
                }}
                scroll={{ x: 1320 }}
              />
              <div className="culling-detail-table-actions">
                <div className="culling-detail-list-meta culling-detail-list-meta--bottom">
                  <span>上次更新</span>
                  <strong>断奶检查任务 · {latestPendingCullingUpdatedAt}</strong>
                </div>
                <div className="culling-detail-table-action-controls">
                  <span className="culling-detail-selected-copy">
                    已选 <strong>{selectedCullingKeys.length}</strong> 头，确认后进入确认淘汰 tab
                  </span>
                  <Button
                    type="primary"
                    className="culling-detail-batch-action"
                    disabled={selectedCullingKeys.length === 0}
                    onClick={openConfirmSelectedCulling}
                  >
                    确认淘汰{selectedCullingKeys.length > 0 ? `（${selectedCullingKeys.length}）` : ""}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <Table<CullingDecisionRecord>
              key="confirmed-culling-decisions"
              className="culling-detail-culling-table"
              columns={cullingDecisionColumns}
              dataSource={filteredConfirmedCullingDecisions}
              rowSelection={{
                selectedRowKeys: [],
                columnTitle: "",
                renderCell: () => null,
                getCheckboxProps: () => ({ disabled: true })
              }}
              pagination={{
                pageSize: 10,
                showSizeChanger: false,
                showTotal: (total, range) => `${range[0]}-${range[1]} 条，共 ${total} 条`
              }}
              scroll={{ x: 1320 }}
            />
          )}

          <Modal
            title="确认淘汰"
            open={confirmCullingOpen}
            centered
            okText="确认淘汰"
            cancelText="取消"
            okButtonProps={{
              disabled: confirmCullingCountInput !== selectedCullingKeys.length,
              className: "culling-detail-confirm-modal-ok"
            }}
            onOk={confirmSelectedCulling}
            onCancel={() => {
              setConfirmCullingOpen(false);
              setConfirmCullingCountInput(null);
            }}
          >
            <div className="culling-detail-confirm-modal">
              <p>
                本次将确认淘汰 <strong>{selectedCullingKeys.length}</strong> 头猪。请输入本次确认数量后完成确认。
              </p>
              <InputNumber
                min={0}
                precision={0}
                value={confirmCullingCountInput}
                onChange={(value) => setConfirmCullingCountInput(typeof value === "number" ? value : null)}
                placeholder="请输入确认数量"
                className="culling-detail-confirm-count-input"
              />
              <Alert
                type="warning"
                showIcon
                message="确认淘汰的猪只将被标记为「确认淘汰」，支持在「出售」「转移」模块中快速筛选，且不会再加入新批次。"
              />
            </div>
          </Modal>
        </Card>
      ) : null}

      {detailSubPage === "retained" ? (
        <Card className="culling-detail-card culling-detail-record-card" bordered={false}>
          <div className="culling-detail-section-head culling-detail-section-head--stack">
            <div>
              <h2 className="culling-detail-card-title">留种仔猪</h2>
              <p className="culling-detail-section-subtitle">查看本轮任务的留种进度与最终标记结果。</p>
            </div>
          </div>

          <div className="culling-detail-progress-summary">
            <DetailPlanProgress
              label="已标记留种 / 留种目标"
              tooltip="已标记留种仔猪 / 留种目标"
              done={retainedDone}
              total={retainedTarget}
              unit="头"
              strokeColor="#22c55e"
            />
          </div>

          <Tabs
            className="culling-detail-tabs culling-detail-tabs--retain"
            activeKey={retainedTab}
            onChange={(key) => setRetainedTab(key as "boar" | "gilt")}
            items={[
              { key: "boar", label: `育种公猪 (${retainedBoarCount})` },
              { key: "gilt", label: `育种母猪 (${retainedGiltCount})` }
            ]}
          />

          <div className="culling-detail-toolbar">
            <Input
              className="culling-detail-search"
              prefix={<SearchOutlined />}
              value={retainedKeyword}
              onChange={(e) => setRetainedKeyword(e.target.value)}
              placeholder={retainedTab === "boar" ? "搜索公猪 ID / 母猪 ID" : "搜索母猪 ID / 来源母猪 ID"}
            />
          </div>

          <Table<RetainedPigletRecord>
            columns={retainedPigletColumns}
            dataSource={filteredRetainedPiglets}
            pagination={{
              pageSize: 25,
              showSizeChanger: true,
              pageSizeOptions: ["25", "50", "100"],
              showTotal: (total, range) => `${range[0]}-${range[1]} 条，共 ${total} 条`
            }}
          />
        </Card>
      ) : null}
    </div>
  );
}

function CullingCheckResult({
  title,
  value
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="culling-detail-check-result">
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}

function TaskProgressLabel({
  label,
  tooltip,
  onClick
}: {
  label: string;
  tooltip: string;
  onClick: () => void;
}) {
  return (
    <span className="culling-detail-progress-field-label">
      <span>{label}</span>
      <Tooltip title={tooltip}>
        <Button
          type="text"
          size="small"
          className="culling-detail-progress-field-view"
          icon={<EyeOutlined />}
          aria-label={tooltip}
          onClick={onClick}
        />
      </Tooltip>
    </span>
  );
}

function TaskProgressValue({
  done,
  total,
  tooltip
}: {
  done: number;
  total: number;
  tooltip: string;
}) {
  return (
    <Tooltip title={tooltip} overlayClassName="culling-detail-progress-field-tooltip">
      <span className="culling-detail-progress-field-value">
        <span>{done}</span>
        <span className="culling-detail-progress-field-divider">/</span>
        <span>{total}</span>
        <span className="culling-detail-progress-field-unit">头</span>
      </span>
    </Tooltip>
  );
}

function DetailPlanProgress({
  label,
  tooltip,
  done,
  total,
  unit,
  strokeColor,
  clickable = false,
  onClick
}: {
  label: string;
  tooltip: string;
  done: number;
  total: number;
  unit: string;
  strokeColor: string;
  clickable?: boolean;
  onClick?: () => void;
}) {
  const percent = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;

  return (
    <button
      type="button"
      className={`culling-detail-plan-progress ${clickable ? "is-clickable" : ""}`}
      onClick={onClick}
      disabled={!clickable}
    >
      <div className="culling-detail-progress-row">
        <span className="culling-detail-label">
          {label}
          <Tooltip title={tooltip}>
            <span className="culling-detail-info-dot">i</span>
          </Tooltip>
        </span>
        <span className="culling-detail-progress-row-end">
          <span className="culling-detail-progress-value">
            {done} / {total} {unit}
          </span>
          {clickable ? <RightOutlined className="culling-detail-progress-arrow" /> : null}
        </span>
      </div>
      <Progress percent={percent} showInfo={false} strokeColor={strokeColor} className="culling-detail-progress culling-detail-progress--compact" />
    </button>
  );
}
