import { ArrowLeftOutlined, MenuOutlined, SearchOutlined } from "@ant-design/icons";
import { Avatar, Breadcrumb, Button, Card, Input, Progress, Table, Tabs, Tag, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMemo, useState } from "react";
import "./CullingTaskDetailPage.css";

type SowRecord = {
  key: string;
  sowId: string;
  location: string;
  taskStatus: string;
  bodyScore: string;
  abnormalCount: string;
  observation: string;
  cullingAdvice: string;
};

type RetainedPigletRecord = {
  key: string;
  pigletId: string;
  sowId: string;
  batch: string;
  location: string;
  gender: string;
  age: string;
  weight: string;
};

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
    render: (value: string) => <span className="culling-detail-emphasis">{value}</span>
  },
  {
    title: "其他观察",
    dataIndex: "observation"
  },
  {
    title: "淘汰建议",
    dataIndex: "cullingAdvice",
    render: (value: string) => (
      <Tag className={value.includes("不建议") ? "culling-detail-tag-soft" : "culling-detail-tag-warn"}>
        {value}
      </Tag>
    )
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
    observation: "-",
    cullingAdvice: "不建议淘汰"
  },
  {
    key: "2",
    sowId: "DEV000004",
    location: "-",
    taskStatus: "已检查",
    bodyScore: "2分",
    abnormalCount: "3项异常",
    observation: "-",
    cullingAdvice: "建议淘汰"
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
    title: "批次",
    dataIndex: "batch"
  },
  {
    title: "位置",
    dataIndex: "location"
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
    batch: "断奶批次 0001",
    location: "A1 · 保育预留栏",
    gender: "母",
    age: "28日龄",
    weight: "7.1kg"
  },
  {
    key: "piglet-2",
    pigletId: "P-260315-003",
    sowId: "DEV000002",
    batch: "断奶批次 0001",
    location: "A1 · 保育预留栏",
    gender: "公",
    age: "28日龄",
    weight: "6.9kg"
  },
  {
    key: "piglet-3",
    pigletId: "P-260315-011",
    sowId: "DEV000004",
    batch: "断奶批次 0001",
    location: "A2 · 保育预留栏",
    gender: "母",
    age: "27日龄",
    weight: "6.7kg"
  },
  {
    key: "piglet-4",
    pigletId: "P-260315-015",
    sowId: "DEV000004",
    batch: "断奶批次 0001",
    location: "A2 · 保育预留栏",
    gender: "公",
    age: "27日龄",
    weight: "7.0kg"
  },
  {
    key: "piglet-5",
    pigletId: "P-260315-018",
    sowId: "DEV000004",
    batch: "断奶批次 0001",
    location: "A2 · 保育预留栏",
    gender: "母",
    age: "27日龄",
    weight: "7.2kg"
  }
];

export function CullingTaskDetailPage({ onBack }: { onBack: () => void }) {
  const [sowKeyword, setSowKeyword] = useState("");
  const [retainedKeyword, setRetainedKeyword] = useState("");
  const [retainedTab, setRetainedTab] = useState<"boar" | "gilt">("gilt");

  const filteredSowData = useMemo(() => {
    const q = sowKeyword.trim();
    if (!q) return sowData;
    return sowData.filter((item) => `${item.sowId}${item.location}${item.cullingAdvice}`.includes(q));
  }, [sowKeyword]);

  const filteredRetainedPiglets = useMemo(() => {
    const q = retainedKeyword.trim();
    const tabFiltered = retainedPigletData.filter((item) =>
      retainedTab === "boar" ? item.gender === "公" : item.gender === "母"
    );
    if (!q) return tabFiltered;
    return tabFiltered.filter((item) => `${item.pigletId}${item.sowId}${item.location}`.includes(q));
  }, [retainedKeyword, retainedTab]);

  const retainedBoarCount = useMemo(
    () => retainedPigletData.filter((item) => item.gender === "公").length,
    []
  );

  const retainedGiltCount = useMemo(
    () => retainedPigletData.filter((item) => item.gender === "母").length,
    []
  );

  const checkedTotal = sowData.length;
  const checkedDone = sowData.filter((item) => item.taskStatus === "已检查").length;
  const cullingTotal = sowData.filter((item) => item.cullingAdvice.includes("建议") && !item.cullingAdvice.includes("不建议")).length;
  const cullingDone = cullingTotal;
  const retainedTarget = 6;
  const retainedDone = retainedPigletData.length;

  return (
    <div className="culling-detail-page">
      <div className="culling-detail-topbar">
        <Button type="text" className="culling-detail-icon-button" icon={<MenuOutlined />} />
        <div className="culling-detail-topbar-actions">
          <span className="culling-detail-flag">🇨🇳</span>
          <Avatar className="culling-detail-avatar">A</Avatar>
        </div>
      </div>

      <div className="culling-detail-header-row">
        <div className="culling-detail-header-main">
          <Button type="text" icon={<ArrowLeftOutlined />} className="culling-detail-back" onClick={onBack} />
          <h1 className="culling-detail-title">断奶</h1>
        </div>
        <Button className="culling-detail-end-button">结束任务</Button>
      </div>

      <Breadcrumb
        className="culling-detail-breadcrumb"
        items={[
          { title: "首页" },
          { title: "生产批次" },
          { title: "断奶" }
        ]}
      />

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
          <div className="culling-detail-plan-progress-list">
            <DetailPlanProgress
              label="淘汰进度"
              tooltip="已确认淘汰 / 需确认淘汰"
              done={cullingDone}
              total={cullingTotal}
              unit="头"
              strokeColor="#f97316"
            />
            <DetailPlanProgress
              label="留种进度"
              tooltip="已标记留种仔猪 / 计划留种目标"
              done={retainedDone}
              total={retainedTarget}
              unit="头"
              strokeColor="#22c55e"
            />
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

      <Card className="culling-detail-card culling-detail-record-card" bordered={false}>
        <div className="culling-detail-section-head">
          <h2 className="culling-detail-card-title">留种仔猪</h2>
        </div>

        <Tabs
          className="culling-detail-tabs culling-detail-tabs--retain"
          activeKey={retainedTab}
          onChange={(key) => setRetainedTab(key as "boar" | "gilt")}
          items={[
            { key: "boar", label: `留种公猪 (${retainedBoarCount})` },
            { key: "gilt", label: `留种母猪 (${retainedGiltCount})` }
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
    </div>
  );
}

function DetailPlanProgress({
  label,
  tooltip,
  done,
  total,
  unit,
  strokeColor
}: {
  label: string;
  tooltip: string;
  done: number;
  total: number;
  unit: string;
  strokeColor: string;
}) {
  const percent = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;

  return (
    <div className="culling-detail-plan-progress">
      <div className="culling-detail-progress-row">
        <span className="culling-detail-label">
          {label}
          <Tooltip title={tooltip}>
            <span className="culling-detail-info-dot">i</span>
          </Tooltip>
        </span>
        <span className="culling-detail-progress-value">
          {done} / {total} {unit}
        </span>
      </div>
      <Progress percent={percent} showInfo={false} strokeColor={strokeColor} className="culling-detail-progress culling-detail-progress--compact" />
    </div>
  );
}
