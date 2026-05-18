import { ArrowLeftOutlined, MenuOutlined, RightOutlined, SearchOutlined } from "@ant-design/icons";
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
};

type RetainedPigletRecord = {
  key: string;
  pigletId: string;
  sowId: string;
  location: string;
  gender: string;
  age: string;
  weight: string;
};

type CullingDecisionStatus = "确认淘汰" | "已淘汰" | "不淘汰";
type CullingDecisionSource = "建议淘汰" | "现场新增" | "无";
type CullingDisposition = "未处理" | "售卖" | "转移" | "场内屠宰" | "死亡" | "-";
type CullingDecisionRecord = {
  key: string;
  sowId: string;
  pigType: string;
  location: string;
  status: CullingDecisionStatus;
  source: CullingDecisionSource;
  rejectReason: string;
  disposition: CullingDisposition;
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
    pigType: "生产母猪",
    location: "A2 · 断奶舍",
    status: "确认淘汰",
    source: "建议淘汰",
    rejectReason: "-",
    disposition: "未处理"
  },
  {
    key: "cull-2",
    sowId: "DEV000006",
    pigType: "生产母猪",
    location: "A3 · 配怀舍",
    status: "已淘汰",
    source: "建议淘汰",
    rejectReason: "-",
    disposition: "售卖"
  },
  {
    key: "cull-3",
    sowId: "DEV000009",
    pigType: "生产母猪",
    location: "B1 · 配怀舍",
    status: "不淘汰",
    source: "建议淘汰",
    rejectReason: "现场复核体况恢复良好，建议继续留群观察",
    disposition: "-"
  },
  {
    key: "cull-4",
    sowId: "DEV000012",
    pigType: "生产母猪",
    location: "B2 · 断奶舍",
    status: "确认淘汰",
    source: "现场新增",
    rejectReason: "-",
    disposition: "未处理"
  },
  {
    key: "cull-5",
    sowId: "DEV000013",
    pigType: "生产母猪",
    location: "C1 · 断奶舍",
    status: "已淘汰",
    source: "无",
    rejectReason: "-",
    disposition: "转移"
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
    location: "A1 · 保育预留栏",
    gender: "母",
    age: "28日龄",
    weight: "7.1kg"
  },
  {
    key: "piglet-2",
    pigletId: "P-260315-003",
    sowId: "DEV000002",
    location: "A1 · 保育预留栏",
    gender: "公",
    age: "28日龄",
    weight: "6.9kg"
  },
  {
    key: "piglet-3",
    pigletId: "P-260315-011",
    sowId: "DEV000004",
    location: "A2 · 保育预留栏",
    gender: "母",
    age: "27日龄",
    weight: "6.7kg"
  },
  {
    key: "piglet-4",
    pigletId: "P-260315-015",
    sowId: "DEV000004",
    location: "A2 · 保育预留栏",
    gender: "公",
    age: "27日龄",
    weight: "7.0kg"
  },
  {
    key: "piglet-5",
    pigletId: "P-260315-018",
    sowId: "DEV000004",
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
    sorter: (a, b) => a.sowId.localeCompare(b.sowId),
    render: (value: string) => <span className="culling-detail-link">{value}</span>
  },
  {
    title: "猪只类型",
    dataIndex: "pigType",
    filters: [{ text: "生产母猪", value: "生产母猪" }],
    onFilter: (value, record) => record.pigType === value,
    sorter: (a, b) => a.pigType.localeCompare(b.pigType, "zh-Hans-CN")
  },
  {
    title: "位置",
    dataIndex: "location",
    sorter: (a, b) => a.location.localeCompare(b.location, "zh-Hans-CN")
  },
  {
    title: "淘汰状态",
    dataIndex: "status",
    filters: [
      { text: "确认淘汰", value: "确认淘汰" },
      { text: "已淘汰", value: "已淘汰" },
      { text: "不淘汰", value: "不淘汰" }
    ],
    onFilter: (value, record) => record.status === value,
    render: (value: CullingDecisionStatus) => {
      if (value === "确认淘汰") return <Tag className="culling-detail-tag-cull-pending">确认淘汰</Tag>;
      if (value === "已淘汰") return <Tag className="culling-detail-tag-cull-done">已淘汰</Tag>;
      return <Tag className="culling-detail-tag-neutral">不淘汰</Tag>;
    }
  },
  {
    title: "来源",
    dataIndex: "source",
    filters: [
      { text: "建议淘汰", value: "建议淘汰" },
      { text: "现场新增", value: "现场新增" },
      { text: "无", value: "无" }
    ],
    onFilter: (value, record) => record.source === value,
    render: (value: CullingDecisionSource) =>
      value === "建议淘汰" ? (
        <Tag className="culling-detail-tag-source-plan">建议淘汰</Tag>
      ) : value === "现场新增" ? (
        <Tag className="culling-detail-tag-source-live">现场新增</Tag>
      ) : (
        <Tag className="culling-detail-tag-neutral">无</Tag>
      )
  },
  {
    title: "不淘汰原因",
    dataIndex: "rejectReason",
    render: (value: string) => value || "-"
  },
  {
    title: "后续去向",
    dataIndex: "disposition",
    filters: [
      { text: "未处理", value: "未处理" },
      { text: "售卖", value: "售卖" },
      { text: "转移", value: "转移" },
      { text: "场内屠宰", value: "场内屠宰" },
      { text: "死亡", value: "死亡" }
    ],
    onFilter: (value, record) => record.disposition === value,
    render: (value: CullingDisposition) => {
      if (value === "未处理") return <Tag className="culling-detail-tag-pending">未处理</Tag>;
      if (value === "售卖") return <Tag className="culling-detail-tag-soft">售卖</Tag>;
      if (value === "转移") return <Tag className="culling-detail-tag-soft">转移</Tag>;
      if (value === "场内屠宰") return <Tag className="culling-detail-tag-warn">场内屠宰</Tag>;
      if (value === "死亡") return <Tag className="culling-detail-tag-neutral">死亡</Tag>;
      return "-";
    }
  }
];

export function CullingTaskDetailPage({ onBack }: { onBack: () => void }) {
  const [detailSubPage, setDetailSubPage] = useState<DetailSubPage>("main");
  const [sowKeyword, setSowKeyword] = useState("");
  const [cullingKeyword, setCullingKeyword] = useState("");
  const [cullingView, setCullingView] = useState<"all" | "need" | "done" | "rejected">("all");
  const [retainedKeyword, setRetainedKeyword] = useState("");
  const [retainedTab, setRetainedTab] = useState<"boar" | "gilt">("gilt");

  const filteredSowData = useMemo(() => {
    const q = sowKeyword.trim();
    if (!q) return sowData;
    return sowData.filter((item) => `${item.sowId}${item.location}${item.observation}`.includes(q));
  }, [sowKeyword]);

  const filteredCullingDecisions = useMemo(() => {
    const q = cullingKeyword.trim();
    const statusFiltered = cullingDecisionData.filter((item) => {
      if (cullingView === "need") return item.status === "确认淘汰";
      if (cullingView === "done") return item.status === "已淘汰";
      if (cullingView === "rejected") return item.status === "不淘汰" && item.source === "建议淘汰";
      return true;
    });
    if (!q) return statusFiltered;
    return statusFiltered.filter((item) => item.sowId.includes(q));
  }, [cullingKeyword, cullingView]);

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
  const confirmedCullingCount = cullingDecisionData.filter((item) => item.status === "确认淘汰").length;
  const completedCullingCount = cullingDecisionData.filter((item) => item.status === "已淘汰").length;
  const rejectedSuggestedCount = cullingDecisionData.filter((item) => item.status === "不淘汰" && item.source === "建议淘汰").length;
  const retainedTarget = 6;
  const retainedDone = retainedPigletData.length;

  const pageTitle = detailSubPage === "culling" ? "淘汰猪只" : detailSubPage === "retained" ? "留种仔猪" : "断奶";

  const handleBack = () => {
    if (detailSubPage === "main") {
      onBack();
      return;
    }
    setDetailSubPage("main");
  };

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


          <Card className="culling-detail-card culling-detail-record-card" bordered={false}>
            <div className="culling-detail-section-head culling-detail-section-head--stack">
              <div>
                <h2 className="culling-detail-card-title">淘汰与留种进度</h2>
                <p className="culling-detail-section-subtitle">点击进度条可查看对应淘汰/留种详情</p>
              </div>
            </div>
            <div className="culling-detail-plan-progress-list culling-detail-plan-progress-list--standalone">
              <DetailPlanProgress
                label="已淘汰 / 计划淘汰"
                tooltip="已淘汰数量 / 计划淘汰数量"
                done={completedCullingCount}
                total={plannedCullingCount}
                unit="头"
                strokeColor="#f97316"
                clickable
                onClick={() => setDetailSubPage("culling")}
              />
              <DetailPlanProgress
                label="标记留种 / 计划留种"
                tooltip="已标记留种仔猪 / 计划留种目标"
                done={retainedDone}
                total={retainedTarget}
                unit="头"
                strokeColor="#22c55e"
                clickable
                onClick={() => setDetailSubPage("retained")}
              />
            </div>
          </Card>
        </>
      ) : null}

      {detailSubPage === "culling" ? (
        <Card className="culling-detail-card culling-detail-record-card" bordered={false}>
          <div className="culling-detail-section-head culling-detail-section-head--stack">
            <div>
              <h2 className="culling-detail-card-title">淘汰猪只</h2>
              <p className="culling-detail-section-subtitle">查看本轮任务的淘汰执行结果，并展示相关淘汰结果与处理信息。</p>
            </div>
          </div>

          <div className="culling-detail-progress-summary">
            <DetailPlanProgress
              label="已淘汰 / 计划淘汰"
              tooltip="已淘汰数量 / 计划淘汰数量"
              done={completedCullingCount}
              total={plannedCullingCount}
              unit="头"
              strokeColor="#f97316"
            />
          </div>

          <div className="culling-detail-kpi-grid">
            <ResultStatCard label="计划淘汰" value={`${plannedCullingCount} 头`} tone="slate" />
            <ResultStatCard label="确认淘汰" value={`${confirmedCullingCount} 头`} tone="orange" />
            <ResultStatCard label="已淘汰" value={`${completedCullingCount} 头`} tone="green" />
            <ResultStatCard label="建议淘汰但未淘汰" value={`${rejectedSuggestedCount} 头`} tone="rose" />
          </div>

          <div className="culling-detail-toolbar culling-detail-toolbar--split">
            <Input
              className="culling-detail-search culling-detail-search--wide"
              prefix={<SearchOutlined />}
              value={cullingKeyword}
              onChange={(e) => setCullingKeyword(e.target.value)}
              placeholder="搜索母猪 ID"
            />
            <div className="culling-detail-filter-chips">
              <button type="button" className={`culling-detail-chip ${cullingView === "all" ? "is-active" : ""}`} onClick={() => setCullingView("all")}>全部</button>
              <button type="button" className={`culling-detail-chip ${cullingView === "need" ? "is-active" : ""}`} onClick={() => setCullingView("need")}>仅看确认淘汰</button>
              <button type="button" className={`culling-detail-chip ${cullingView === "done" ? "is-active" : ""}`} onClick={() => setCullingView("done")}>仅看已淘汰</button>
              <button type="button" className={`culling-detail-chip ${cullingView === "rejected" ? "is-active" : ""}`} onClick={() => setCullingView("rejected")}>仅看建议淘汰但未淘汰</button>
            </div>
          </div>

          <Table<CullingDecisionRecord>
            columns={cullingDecisionColumns}
            dataSource={filteredCullingDecisions}
            pagination={{
              pageSize: 25,
              showSizeChanger: true,
              pageSizeOptions: ["25", "50", "100"],
              showTotal: (total, range) => `${range[0]}-${range[1]} 条，共 ${total} 条`
            }}
          />
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
              label="标记留种 / 计划留种"
              tooltip="已标记留种仔猪 / 计划留种目标"
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

function ResultStatCard({
  label,
  value,
  tone
}: {
  label: string;
  value: string;
  tone: "slate" | "orange" | "green" | "rose";
}) {
  return (
    <div className={`culling-detail-stat-card culling-detail-stat-card--${tone}`}>
      <div className="culling-detail-stat-label">{label}</div>
      <div className="culling-detail-stat-value">{value}</div>
    </div>
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
