import {
  AppstoreOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  CloseOutlined,
  FilterOutlined,
  LeftOutlined,
  RightOutlined,
  SearchOutlined,
  UnorderedListOutlined
} from "@ant-design/icons";
import { Button, Card, Checkbox, Input, Modal, Radio, Segmented, Tag, Typography, message } from "antd";
import { type ReactNode, useMemo, useState } from "react";
import { useMobileSimulationContainer } from "../mobileSimulationContext";

const { Text, Title } = Typography;

type RoomRow = {
  id: string;
  stallNo: string;
  earTag: string;
  status: "pending" | "done";
  sowParityText: string;
  sowAgeDays: number;
};

type RowPlanState = {
  cullPlanned: boolean;
  cullDone: boolean;
  retainPlanned: boolean;
  retainDone: boolean;
  pigletTotal?: number;
  retainedPiglets?: number;
  note?: string;
};

type AnnotatedRow = RoomRow & RowPlanState & { overlap: boolean };
type RowFilter = "all" | "pending" | "cull" | "retain" | "overlap";
type ViewMode = "list" | "grid";

type PigletInfo = {
  healthyCount: number;
  weakCount: number;
  malformedCount: number;
  weightKg: number;
  maleCount: number;
  femaleCount: number;
  retainedCount: number;
};

type SowStatus = {
  bodyScore: 1 | 2 | 3 | 4 | 5;
  mastitis: "无" | "轻微" | "中度" | "重度";
  milk: "差" | "中" | "佳";
  lochia: "正常" | "异常";
  appetite: "正常" | "进食减少" | "拒食";
  activity: "正常" | "病" | "不愿意动";
  backfat: "薄" | "适中" | "厚";
  cullSuggestion: "不淘汰" | "淘汰";
  cullRejectReason?: string;
};

type CheckRecord = {
  piglet?: PigletInfo;
  sow?: SowStatus;
};

const DEFAULT_ROWS: RoomRow[] = [
  { id: "wr-1", stallNo: "A1", earTag: "000001", status: "pending", sowParityText: "3胎", sowAgeDays: 650 },
  { id: "wr-2", stallNo: "A1", earTag: "000002", status: "pending", sowParityText: "2胎", sowAgeDays: 605 },
  { id: "wr-3", stallNo: "A2", earTag: "000003", status: "done", sowParityText: "4胎", sowAgeDays: 702 },
  { id: "wr-4", stallNo: "A2", earTag: "000004", status: "pending", sowParityText: "3胎", sowAgeDays: 640 }
];

const ROW_PLAN_STATE: Record<string, RowPlanState> = {
  "wr-1": {
    cullPlanned: true,
    cullDone: false,
    retainPlanned: true,
    retainDone: false
  },
  "wr-2": {
    cullPlanned: false,
    cullDone: false,
    retainPlanned: true,
    retainDone: false
  },
  "wr-3": {
    cullPlanned: true,
    cullDone: true,
    retainPlanned: true,
    retainDone: true,
    pigletTotal: 20,
    retainedPiglets: 5
  },
  "wr-4": {
    cullPlanned: true,
    cullDone: false,
    retainPlanned: false,
    retainDone: false
  }
};

interface Props {
  title: string;
  roomLabel?: string;
  onBack: () => void;
}

export function MobileWeaningCheckFlow({
  title,
  roomLabel = "分娩舍 B1 间",
  onBack
}: Props) {
  const modalContainer = useMobileSimulationContainer();
  const isPostpartum = title.includes("产后");
  const checkTabLabel = isPostpartum ? "断奶检查" : "断奶检查";
  const [tab, setTab] = useState<"check" | "detail">("check");
  const [rows, setRows] = useState<RoomRow[]>(DEFAULT_ROWS);
  const [search, setSearch] = useState("");
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<"piglet" | "sow" | null>(null);
  const [records, setRecords] = useState<Record<string, CheckRecord>>({});
  const [retainedModalOpen, setRetainedModalOpen] = useState(false);
  const [retainedIds, setRetainedIds] = useState<string[]>([]);
  const [endTaskOpen, setEndTaskOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [rowFilter, setRowFilter] = useState<RowFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [cullRejectReasonOpen, setCullRejectReasonOpen] = useState(false);
  const [cullRejectReason, setCullRejectReason] = useState("");

  const annotatedRows = useMemo<AnnotatedRow[]>(
    () =>
      rows.map((row) => {
        const planState = ROW_PLAN_STATE[row.id] ?? {
          cullPlanned: false,
          cullDone: false,
          retainPlanned: false,
          retainDone: false
        };
        return {
          ...row,
          ...planState,
          overlap: planState.cullPlanned && planState.retainPlanned
        };
      }),
    [rows]
  );
  const activeRow = useMemo(() => rows.find((r) => r.id === activeRowId) ?? null, [rows, activeRowId]);
  const activeAnnotatedRow = useMemo(
    () => annotatedRows.find((r) => r.id === activeRowId) ?? null,
    [annotatedRows, activeRowId]
  );
  const activeRecord = activeRowId ? records[activeRowId] : undefined;
  const completedCount = rows.filter((r) => r.status === "done").length;
  const totalCount = rows.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const displayUnit = isPostpartum ? "头" : "栏";
  const displayScale = 50;
  const completedDisplay = completedCount * displayScale;
  const totalDisplay = totalCount * displayScale;
  const dayLabel = `第 ${Math.min(3, Math.max(1, completedCount + 1))}/3 天`;
  const taskDayLabel = isPostpartum ? dayLabel : "第 1/1 天";

  const cullNeeded = annotatedRows.filter((row) => row.cullPlanned).length;
  const cullDoneCount = annotatedRows.filter((row) => row.cullDone).length;
  const retainNeeded = annotatedRows.filter((row) => row.retainPlanned).length;
  const retainDoneCount = annotatedRows.filter((row) => row.retainDone).length;

  const filterLabelMap: Record<RowFilter, string> = {
    all: "全部母猪",
    pending: "待检查猪只",
    cull: "建议淘汰猪只",
    retain: "推荐留种母猪",
    overlap: "交叉关注猪只"
  };

  const filteredRows = useMemo(() => {
    const q = search.trim();
    return annotatedRows.filter((row) => {
      const matchesSearch = !q || `${row.stallNo}${row.earTag}`.includes(q);
      const matchesFilter =
        rowFilter === "all" ? true :
        rowFilter === "pending" ? row.status !== "done" :
        rowFilter === "cull" ? row.cullPlanned && !row.cullDone :
        rowFilter === "retain" ? row.retainPlanned && !row.retainDone :
        row.overlap;
      return matchesSearch && matchesFilter;
    });
  }, [annotatedRows, rowFilter, search]);

  const groupedRows = useMemo(() => {
    const groups = new Map<string, AnnotatedRow[]>();
    for (const row of filteredRows) {
      const key = row.stallNo.trim() || "未分配栏位";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(row);
    }
    return Array.from(groups.entries()).map(([stallNo, tasks]) => ({ stallNo, tasks }));
  }, [filteredRows]);

  const listTitleMap: Record<RowFilter, string> = {
    all: "猪只列表",
    pending: "待检查猪只",
    cull: "建议淘汰猪只",
    retain: "推荐留种母猪",
    overlap: "交叉关注猪只"
  };

  const listSummaryTextMap: Record<RowFilter, string> = {
    all: `当前显示 ${filteredRows.length} 头母猪，请优先处理带有淘汰或留种标记的个体。`,
    pending: `当前显示 ${filteredRows.length} 头待检查母猪，请优先补齐断奶检查结果。`,
    cull: `当前显示 ${filteredRows.length} 头建议淘汰的母猪，请逐头完成淘汰确认。`,
    retain: `当前显示 ${filteredRows.length} 头推荐留种母猪，请重点核对其仔猪留种标记。`,
    overlap: `当前显示 ${filteredRows.length} 头交叉关注母猪，请同步核对淘汰与留种信息。`
  };

  const avgWeight = useMemo(() => {
    const vals = Object.values(records)
      .map((x) => x.piglet?.weightKg ?? 0)
      .filter((x) => x > 0);
    if (!vals.length) return 0;
    return Math.round((vals.reduce((s, n) => s + n, 0) / vals.length) * 10) / 10;
  }, [records]);

  const vitality = useMemo(() => {
    const vals = Object.values(records).map((x) => {
      const piglet = x.piglet;
      if (!piglet) return 0;
      return piglet.healthyCount + piglet.weakCount + piglet.malformedCount;
    });
    if (!vals.length) return 90;
    const total = vals.reduce((s, n) => s + n, 0);
    const healthy = Object.values(records).reduce((s, x) => s + (x.piglet?.healthyCount ?? 0), 0);
    return total > 0 ? Math.round((healthy / total) * 100) : 90;
  }, [records]);

  const saveRowAsDone = () => {
    if (!activeRowId) return;
    if (!activeRecord?.piglet || !activeRecord?.sow) {
      message.warning("请先完成仔猪信息与母猪状态填写");
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === activeRowId ? { ...r, status: "done" } : r)));
    setDetailOpen(false);
    setActiveRowId(null);
    message.success("已提交断奶检查");
  };

  const returnToActiveDetail = () => {
    setRetainedModalOpen(false);
    setEditingSection(null);
    if (activeRowId) {
      setDetailOpen(true);
    }
  };

  const isActivePigletDone = Boolean(activeRecord?.piglet);
  const isActiveSowDone = Boolean(activeRecord?.sow);
  const isActiveReadyToSubmit = isActivePigletDone && isActiveSowDone;

  if (editingSection === "sow" && activeRow) {
    const isConsoleSuggestedCull = Boolean(activeAnnotatedRow?.cullPlanned);
    const current: SowStatus =
      activeRecord?.sow ?? {
        bodyScore: 3,
        mastitis: "无",
        milk: "中",
        lochia: "正常",
        appetite: "正常",
        activity: "正常",
        backfat: "适中",
        cullSuggestion: isConsoleSuggestedCull ? "淘汰" : "不淘汰"
      };
    const updateCurrentSow = (next: SowStatus) => {
      setRecords((prev) => ({
        ...prev,
        [activeRow.id]: {
          piglet: prev[activeRow.id]?.piglet,
          sow: next
        }
      }));
    };
    const handleCullReviewChange = (value: SowStatus["cullSuggestion"]) => {
      if (isConsoleSuggestedCull && value === "不淘汰") {
        updateCurrentSow({ ...current, cullSuggestion: value });
        setCullRejectReason(current.cullRejectReason ?? "");
        setCullRejectReasonOpen(true);
        return;
      }
      updateCurrentSow({ ...current, cullSuggestion: value, cullRejectReason: undefined });
    };
    return (
      <div className="mv-root mv-weaning-page mv-weaning-page--editor">
        <div className="mv-statusbar" aria-hidden>
          <span className="mv-statusbar__time">9:41</span>
          <span className="mv-statusbar__icons">
            <i className="mv-signal" />
            <i className="mv-wifi" />
            <i className="mv-battery" />
          </span>
        </div>
        <div className="mv-weaning-header">
          <Button type="text" icon={<LeftOutlined />} onClick={returnToActiveDetail} />
          <Title level={5}>母猪状态</Title>
          <span />
        </div>
        <div className="mv-weaning-pig-ident">
          <strong>{activeRow.stallNo}</strong>
          <span>{activeRow.earTag}</span>
          <Text type="secondary">
            母猪，{activeRow.sowAgeDays}日龄，{activeRow.sowParityText}
          </Text>
        </div>
        <div className="mv-weaning-editor-tip">
          <span className="mv-weaning-editor-tip__dot" />
          请确认母猪当前体况，并完成是否淘汰的现场复核。
        </div>
        <div className="mv-weaning-scroll">
          <div className="mv-section-bar-title">体况评分</div>
          <Segmented
            block
            options={[1, 2, 3, 4, 5].map((x) => ({ label: `${x}分`, value: x }))}
            value={current.bodyScore}
            onChange={(v) =>
              setRecords((prev) => ({
                ...prev,
                [activeRow.id]: { piglet: prev[activeRow.id]?.piglet, sow: { ...current, bodyScore: v as 1 | 2 | 3 | 4 | 5 } }
              }))
            }
          />
          <div className="mv-section-bar-title">{isPostpartum ? "断奶检查项" : "断奶检查项"}</div>
          <Card className="mv-card mv-weaning-form-card" bordered={false}>
            <WeaningOptionRow
              label="乳房炎"
              options={["无", "轻微", "中度", "重度"]}
              value={current.mastitis}
              onChange={(v) =>
                setRecords((prev) => ({
                  ...prev,
                  [activeRow.id]: { piglet: prev[activeRow.id]?.piglet, sow: { ...current, mastitis: v as SowStatus["mastitis"] } }
                }))
              }
            />
            <WeaningOptionRow
              label="乳汁产能"
              options={["差", "中", "佳"]}
              value={current.milk}
              onChange={(v) =>
                setRecords((prev) => ({
                  ...prev,
                  [activeRow.id]: { piglet: prev[activeRow.id]?.piglet, sow: { ...current, milk: v as SowStatus["milk"] } }
                }))
              }
            />
            <WeaningOptionRow
              label="分泌物"
              options={["正常", "异常"]}
              value={current.lochia}
              onChange={(v) =>
                setRecords((prev) => ({
                  ...prev,
                  [activeRow.id]: { piglet: prev[activeRow.id]?.piglet, sow: { ...current, lochia: v as SowStatus["lochia"] } }
                }))
              }
            />
            <WeaningOptionRow
              label="采食情况"
              options={["正常", "进食减少", "拒食"]}
              value={current.appetite}
              onChange={(v) =>
                setRecords((prev) => ({
                  ...prev,
                  [activeRow.id]: { piglet: prev[activeRow.id]?.piglet, sow: { ...current, appetite: v as SowStatus["appetite"] } }
                }))
              }
            />
            <WeaningOptionRow
              label="活动能力"
              options={["正常", "病", "不愿意动"]}
              value={current.activity}
              onChange={(v) =>
                setRecords((prev) => ({
                  ...prev,
                  [activeRow.id]: { piglet: prev[activeRow.id]?.piglet, sow: { ...current, activity: v as SowStatus["activity"] } }
                }))
              }
            />
            <WeaningOptionRow
              label="背膘"
              options={["薄", "适中", "厚"]}
              value={current.backfat}
              onChange={(v) =>
                setRecords((prev) => ({
                  ...prev,
                  [activeRow.id]: { piglet: prev[activeRow.id]?.piglet, sow: { ...current, backfat: v as SowStatus["backfat"] } }
                }))
              }
            />
            <WeaningOptionRow
              label={
                <span className="mv-weaning-option-row__label-inline">
                  <span>淘汰复核</span>
                  {isConsoleSuggestedCull ? (
                    <Tag className="mv-weaning-flag mv-weaning-flag--cull-pending">建议淘汰</Tag>
                  ) : null}
                </span>
              }
              options={["不淘汰", "淘汰"]}
              value={current.cullSuggestion}
              onChange={(v) => handleCullReviewChange(v as SowStatus["cullSuggestion"])}
            />
          </Card>
        </div>
        <div className="mv-weaning-bottom-bar">
          <Button type="primary" block size="large" onClick={returnToActiveDetail}>
            确认
          </Button>
        </div>
        <Modal
          title={null}
          open={cullRejectReasonOpen}
          onCancel={() => {
            updateCurrentSow({ ...current, cullSuggestion: "淘汰", cullRejectReason: undefined });
            setCullRejectReasonOpen(false);
            setCullRejectReason("");
          }}
          footer={null}
          width={340}
          getContainer={modalContainer}
          className="mv-weaning-cull-reason-modal"
          destroyOnClose
        >
          <div className="mv-weaning-cull-reason">
            <strong>请填写不淘汰原因</strong>
            <Text type="secondary">
              该母猪已由管理者标记为建议淘汰。如现场判断不淘汰，需要记录原因，方便后台复盘。
            </Text>
            <Input.TextArea
              value={cullRejectReason}
              onChange={(e) => setCullRejectReason(e.target.value)}
              placeholder="例如：体况恢复良好，乳房与采食正常，建议继续观察"
              autoSize={{ minRows: 3, maxRows: 5 }}
              maxLength={120}
              showCount
            />
            <div className="mv-weaning-cull-reason__actions">
              <Button
                onClick={() => {
                  updateCurrentSow({ ...current, cullSuggestion: "淘汰", cullRejectReason: undefined });
                  setCullRejectReasonOpen(false);
                  setCullRejectReason("");
                }}
              >
                取消
              </Button>
              <Button
                type="primary"
                onClick={() => {
                  const reason = cullRejectReason.trim();
                  if (!reason) {
                    message.warning("请填写不淘汰原因");
                    return;
                  }
                  updateCurrentSow({ ...current, cullSuggestion: "不淘汰", cullRejectReason: reason });
                  setCullRejectReasonOpen(false);
                }}
              >
                确认
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  if (editingSection === "piglet" && activeRow) {
    const current: PigletInfo =
      activeRecord?.piglet ?? {
        healthyCount: 0,
        weakCount: 0,
        malformedCount: 0,
        weightKg: 0,
        maleCount: 0,
        femaleCount: 0,
        retainedCount: 0
      };
    const totalPiglet = current.healthyCount + current.weakCount + current.malformedCount;
    return (
      <div className="mv-root mv-weaning-page mv-weaning-page--editor">
        <div className="mv-statusbar" aria-hidden>
          <span className="mv-statusbar__time">9:41</span>
          <span className="mv-statusbar__icons">
            <i className="mv-signal" />
            <i className="mv-wifi" />
            <i className="mv-battery" />
          </span>
        </div>
        <div className="mv-weaning-header">
          <Button type="text" icon={<LeftOutlined />} onClick={returnToActiveDetail} />
          <Title level={5}>仔猪信息</Title>
          <span />
        </div>
        <div className="mv-weaning-pig-ident">
          <strong>{activeRow.stallNo}</strong>
          <span>{activeRow.earTag}</span>
          <Text type="secondary">
            母猪，{activeRow.sowAgeDays}日龄，{activeRow.sowParityText}
          </Text>
        </div>
        <div className="mv-weaning-editor-tip">
          <span className="mv-weaning-editor-tip__dot" />
          先记录断奶结果，再选择需要重点保留的仔猪。
        </div>
        <div className="mv-weaning-scroll">
          <div className="mv-section-bar-title">{isPostpartum ? "记录当前仔猪数量" : "记录当前断奶数量"}</div>
          <Card className="mv-card mv-weaning-form-card" bordered={false}>
            <WeaningStepperRow
              label="健仔"
              value={current.healthyCount}
              onChange={(v) =>
                setRecords((prev) => ({
                  ...prev,
                  [activeRow.id]: { sow: prev[activeRow.id]?.sow, piglet: { ...current, healthyCount: v } }
                }))
              }
            />
            <WeaningStepperRow
              label="弱仔"
              value={current.weakCount}
              onChange={(v) =>
                setRecords((prev) => ({
                  ...prev,
                  [activeRow.id]: { sow: prev[activeRow.id]?.sow, piglet: { ...current, weakCount: v } }
                }))
              }
            />
            <WeaningStepperRow
              label="畸形"
              value={current.malformedCount}
              onChange={(v) =>
                setRecords((prev) => ({
                  ...prev,
                  [activeRow.id]: { sow: prev[activeRow.id]?.sow, piglet: { ...current, malformedCount: v } }
                }))
              }
            />
            <div className="mv-weaning-kv-row">
              <span>仔猪总数量</span>
              <strong>{totalPiglet}</strong>
            </div>
          </Card>

          <div className="mv-section-bar-title">仔猪体重</div>
          <Card className="mv-card mv-weaning-form-card" bordered={false}>
            <div className="mv-weaning-kv-row">
              <span>仔猪总体现重</span>
              <Input
                className="mv-weaning-inline-input"
                value={current.weightKg ? String(current.weightKg) : ""}
                onChange={(e) => {
                  const n = Number(e.target.value || 0);
                  setRecords((prev) => ({
                    ...prev,
                    [activeRow.id]: { sow: prev[activeRow.id]?.sow, piglet: { ...current, weightKg: Number.isFinite(n) ? n : 0 } }
                  }));
                }}
                suffix="kg"
                placeholder="请输入"
              />
            </div>
          </Card>

          <div className="mv-section-bar-title">仔猪性别</div>
          <Card className="mv-card mv-weaning-form-card" bordered={false}>
            <WeaningStepperRow
              label="公猪数量"
              value={current.maleCount}
              onChange={(v) =>
                setRecords((prev) => ({
                  ...prev,
                  [activeRow.id]: { sow: prev[activeRow.id]?.sow, piglet: { ...current, maleCount: v } }
                }))
              }
            />
            <WeaningStepperRow
              label="母猪数量"
              value={current.femaleCount}
              onChange={(v) =>
                setRecords((prev) => ({
                  ...prev,
                  [activeRow.id]: { sow: prev[activeRow.id]?.sow, piglet: { ...current, femaleCount: v } }
                }))
              }
            />
          </Card>

          <div className="mv-section-bar-title">留种仔猪</div>
          <Card className="mv-card mv-weaning-form-card" bordered={false}>
            <button type="button" className="mv-weaning-link-btn" onClick={() => setRetainedModalOpen(true)}>
              + 选择留种仔猪
            </button>
            <div className="mv-weaning-kv-row">
              <span>已选</span>
              <strong>{current.retainedCount} 头</strong>
            </div>
          </Card>
        </div>
        <div className="mv-weaning-bottom-bar">
          <Button type="primary" block size="large" onClick={returnToActiveDetail}>
            确认
          </Button>
        </div>

        {retainedModalOpen ? (
          <div className="mv-weaning-inline-sheet" onClick={() => setRetainedModalOpen(false)}>
            <div
              className="mv-weaning-inline-sheet__panel"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="选择留种仔猪"
            >
              <div className="mv-weaning-inline-sheet__handle" />
              <div className="mv-weaning-inline-sheet__header">
                <strong>选择留种仔猪</strong>
                <Button type="text" icon={<CloseOutlined />} onClick={() => setRetainedModalOpen(false)} />
              </div>
              <div className="mv-weaning-retain-list">
                {Array.from({ length: 6 }).map((_, i) => {
                  const id = `piglet-${i + 1}`;
                  const checked = retainedIds.includes(id);
                  return (
                    <label key={id} className="mv-weaning-retain-row">
                      <div>
                        <div className="mv-weaning-retain-row__title">0000{i + 1} · 商品猪 · 7日龄</div>
                        <Text type="secondary">活跃，无异常</Text>
                      </div>
                      <Checkbox
                        checked={checked}
                        onChange={(e) =>
                          setRetainedIds((prev) =>
                            e.target.checked ? [...prev, id] : prev.filter((x) => x !== id)
                          )
                        }
                      />
                    </label>
                  );
                })}
              </div>
              <Button
                type="primary"
                block
                size="large"
                className="mv-weaning-modal-confirm"
                onClick={() => {
                  setRecords((prev) => ({
                    ...prev,
                    [activeRow.id]: {
                      sow: prev[activeRow.id]?.sow,
                      piglet: { ...current, retainedCount: retainedIds.length }
                    }
                  }));
                  setRetainedModalOpen(false);
                }}
              >
                确认
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  const endTaskAllDone = completedCount >= totalCount;
  const endTaskRemaining = Math.max(0, totalCount - completedCount);

  if (endTaskOpen) {
    return (
      <div className={`mv-root mv-weaning-page mv-weaning-end-page${endTaskAllDone ? " is-done" : " is-incomplete"}`}>
        <div className="mv-statusbar" aria-hidden>
          <span className="mv-statusbar__time">9:41</span>
          <span className="mv-statusbar__icons">
            <i className="mv-signal" />
            <i className="mv-wifi" />
            <i className="mv-battery" />
          </span>
        </div>
        <div className="mv-weaning-header mv-weaning-end-header">
          <Button type="text" icon={<LeftOutlined />} onClick={() => setEndTaskOpen(false)} />
          <Title level={5}>结束任务</Title>
          <span />
        </div>

        <div className="mv-weaning-scroll mv-weaning-end-scroll">
          <Card className="mv-card mv-weaning-end-summary" bordered={false}>
            <div className="mv-weaning-end-summary__title">
              <span className={`mv-weaning-end-status-icon ${endTaskAllDone ? "is-done" : "is-incomplete"}`}>
                {endTaskAllDone ? <CheckCircleFilled /> : <CloseOutlined />}
              </span>
              <strong>{endTaskAllDone ? "已达到任务目标" : "未达到任务目标"}</strong>
            </div>
            <div className="mv-weaning-end-progress-box">
              <div className="mv-weaning-end-progress-meta">
                <span>已检查 / 需检查</span>
                <strong>
                  {completedDisplay} / {totalDisplay}栏 <em>({progressPct}%)</em>
                </strong>
              </div>
              <div className="mv-weaning-end-summary__track">
                <div className="mv-weaning-end-summary__fill" style={{ width: `${progressPct}%` }} />
              </div>
              <div className="mv-weaning-end-progress-extra">
                <CompactProcessRow label="已淘汰 / 计划淘汰" done={cullDoneCount} total={cullNeeded} tone="cull" unit="头" />
                <CompactProcessRow label="标记留种 / 计划留种" done={retainDoneCount} total={retainNeeded} tone="retain" unit="头" />
              </div>
            </div>
          </Card>

          <div className="mv-section-bar-title">执行详情</div>
          <Card className="mv-card mv-weaning-end-detail-card" bordered={false}>
            <div className="mv-weaning-end-detail-group">
              <div className="mv-weaning-end-detail-group__title">
                <span className="mv-weaning-end-detail-icon is-done"><CheckCircleFilled /></span>
                <strong>继续跟随批次</strong>
              </div>
              {!endTaskAllDone ? (
                <>
                  <div className="mv-weaning-end-detail-row">
                    <span>已检查栏位</span>
                    <strong>{completedDisplay} 栏（共：1,231 头仔猪）</strong>
                  </div>
                  <div className="mv-weaning-end-detail-row">
                    <span>未检查栏位</span>
                    <strong>{endTaskRemaining * displayScale} 栏（共：1,231 头仔猪）</strong>
                  </div>
                </>
              ) : null}
              <div className="mv-weaning-end-detail-total">1,231 头</div>
            </div>

            <div className="mv-weaning-end-detail-group">
              <div className="mv-weaning-end-detail-group__title">
                <span className="mv-weaning-end-detail-icon is-incomplete"><CloseOutlined /></span>
                <strong>将从批次中移出</strong>
              </div>
              <div className="mv-weaning-end-detail-row">
                <span>母猪</span>
                <strong>100 头</strong>
              </div>
              <div className="mv-weaning-end-detail-total">100 栏&nbsp;&nbsp;100 头</div>
            </div>
          </Card>
        </div>

        <div className="mv-weaning-end-bottom">
          <div className="mv-weaning-end-confirm-row">
            <span className="mv-weaning-end-info-dot">i</span>
            <span>请确认，将从批次中移出</span>
            <span className="mv-weaning-end-count-box">200</span>
            <strong>头母猪 *</strong>
          </div>
          <div className="mv-weaning-end-actions">
            <Button onClick={() => setEndTaskOpen(false)}>取消</Button>
            <Button
              type="primary"
              onClick={() => {
                message.success("任务已结束");
                onBack();
              }}
            >
              结束任务
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`mv-root mv-weaning-page${detailOpen ? " is-detail-modal-open" : ""}`}>
      <div className="mv-statusbar" aria-hidden>
        <span className="mv-statusbar__time">9:41</span>
        <span className="mv-statusbar__icons">
          <i className="mv-signal" />
          <i className="mv-wifi" />
          <i className="mv-battery" />
        </span>
      </div>
      <div className="mv-weaning-header">
        <Button type="text" icon={<LeftOutlined />} onClick={onBack} />
        <Title level={5}>{title}</Title>
        <span />
      </div>
      <Segmented
        block
        className="mv-weaning-tabs"
        value={tab}
        onChange={(value) => setTab(value as "check" | "detail")}
        options={[
          { label: checkTabLabel, value: "check" },
          { label: "任务详情", value: "detail" }
        ]}
      />
      {tab === "check" ? (
        <section className="mv-weaning-progress-board" aria-label="任务进度">
          <Card className="mv-card mv-weaning-progress-card" bordered={false}>
            <div className="mv-weaning-progress-card__head">
              <span className="mv-weaning-progress-card__icon">
                <CheckCircleFilled />
              </span>
              <div className="mv-weaning-progress-card__title-block">
                <strong>{title}</strong>
                <Text type="secondary">{roomLabel}</Text>
              </div>
              <Tag>{taskDayLabel}</Tag>
            </div>
            <div className="mv-weaning-progress-card__process">
              <CompactProcessRow label="已检查 / 需检查" done={completedDisplay} total={totalDisplay} tone="check" />
              <CompactProcessRow label="已淘汰 / 计划淘汰" done={cullDoneCount} total={cullNeeded} tone="cull" unit="头" />
              <CompactProcessRow label="标记留种 / 计划留种" done={retainDoneCount} total={retainNeeded} tone="retain" unit="头" />
            </div>
          </Card>
        </section>
      ) : null}
      <div className="mv-weaning-scroll">
        {tab === "check" ? (
          <>
            <div className="mv-section-bar-title">{listTitleMap[rowFilter]}</div>
            <div className="mv-weaning-list-toolbar">
              <Input
                allowClear
                prefix={<SearchOutlined />}
                placeholder="搜索栏位/耳标号"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Button
                type="text"
                icon={<FilterOutlined />}
                aria-label="筛选"
                className={rowFilter !== "all" ? "is-active" : ""}
                onClick={() => setFilterOpen(true)}
              />
              <Button
                type="text"
                icon={<UnorderedListOutlined />}
                aria-label="列表视图"
                className={viewMode === "list" ? "is-active" : ""}
                onClick={() => setViewMode("list")}
              />
              <Button
                type="text"
                icon={<AppstoreOutlined />}
                aria-label="宫格视图"
                className={viewMode === "grid" ? "is-active" : ""}
                onClick={() => setViewMode("grid")}
              />
            </div>
            <Card className="mv-card mv-weaning-list-summary" bordered={false}>
              <strong>{filterLabelMap[rowFilter]}</strong>
              <Text type="secondary">{listSummaryTextMap[rowFilter]}</Text>
            </Card>
            <div className="mv-weaning-list">
              {viewMode === "list"
                ? groupedRows.map((group) => (
                    <Card key={group.stallNo} className="mv-card mv-weaning-stall-card" bordered={false}>
                      <div className="mv-weaning-row__title">{group.stallNo}</div>
                      {group.tasks.map((row) => (
                        <WeaningRowCard
                          key={row.id}
                          row={row}
                          mode="list"
                          onOpen={() => {
                            setActiveRowId(row.id);
                            setDetailOpen(true);
                          }}
                        />
                      ))}
                    </Card>
                  ))
                : (
                  <div className="mv-weaning-grid">
                    {filteredRows.map((row) => (
                      <WeaningRowCard
                        key={row.id}
                        row={row}
                        mode="grid"
                        onOpen={() => {
                          setActiveRowId(row.id);
                          setDetailOpen(true);
                        }}
                      />
                    ))}
                  </div>
                )}
            </div>
          </>
        ) : (
          <div className="mv-weaning-task-detail-page">
            <section className="mv-weaning-detail-section">
              <div className="mv-section-bar-title">总任务进度</div>
              <Card className="mv-card mv-weaning-progress-card mv-weaning-detail-progress-card" bordered={false}>
                <div className="mv-weaning-progress-card__head">
                  <span className="mv-weaning-progress-card__icon">
                    <CheckCircleFilled />
                  </span>
                  <div className="mv-weaning-progress-card__title-block">
                    <strong>{title}</strong>
                    <Text type="secondary">{roomLabel} · 共 5 个单元</Text>
                  </div>
                  <Tag>{taskDayLabel}</Tag>
                </div>
                <div className="mv-weaning-progress-card__process">
                  <CompactProcessRow label="已检查 / 需检查" done={completedDisplay} total={totalDisplay} tone="check" />
                  <CompactProcessRow label="已淘汰 / 计划淘汰" done={cullDoneCount} total={cullNeeded} tone="cull" unit="头" />
                  <CompactProcessRow label="标记留种 / 计划留种" done={retainDoneCount} total={retainNeeded} tone="retain" unit="头" />
                </div>
              </Card>
            </section>

            <section className="mv-weaning-detail-section">
              <div className="mv-section-bar-title">状态说明</div>
              <Card className="mv-card mv-weaning-detail-legend-card" bordered={false}>
                <div className="mv-weaning-legend">
                  <div className="mv-weaning-legend__item mv-weaning-legend__item--with-copy">
                    <span className="mv-weaning-dot mv-weaning-dot--suggested-cull" />
                    <div>
                      <span className="mv-weaning-legend__title">建议淘汰</span>
                      <span className="mv-weaning-legend__copy">由管理者在后台标记的淘汰对象，用于提前关注和评估是否淘汰。</span>
                    </div>
                  </div>
                  <div className="mv-weaning-legend__item mv-weaning-legend__item--with-copy">
                    <span className="mv-weaning-dot mv-weaning-dot--cull-pending" />
                    <div>
                      <span className="mv-weaning-legend__title">需淘汰</span>
                      <span className="mv-weaning-legend__copy">在任务执行过程中确认需要淘汰的猪只，表示该猪只已进入淘汰流程。</span>
                    </div>
                  </div>
                  <div className="mv-weaning-legend__item mv-weaning-legend__item--with-copy">
                    <span className="mv-weaning-dot mv-weaning-dot--cull-done" />
                    <div>
                      <span className="mv-weaning-legend__title">已淘汰</span>
                      <span className="mv-weaning-legend__copy">已完成淘汰处理的猪只（如出售、死亡或离场）。</span>
                    </div>
                  </div>
                </div>
              </Card>
            </section>

            <Card className="mv-card mv-weaning-detail-metrics-card" bordered={false}>
              <div className="mv-weaning-detail-metric">
                <span>{isPostpartum ? "仔猪平均体重" : "断奶平均体重"}</span>
                <strong>{avgWeight || 10} kg</strong>
              </div>
              <div className="mv-weaning-detail-metric">
                <span>{isPostpartum ? "仔猪健康率" : "断奶仔活率"}</span>
                <strong>{vitality}%</strong>
              </div>
            </Card>

            <section className="mv-weaning-detail-section">
              <div className="mv-section-bar-title">任务配置</div>
              <Card className="mv-card mv-weaning-detail-config-card" bordered={false}>
                <div className="mv-weaning-kv-row">
                  <span>{checkTabLabel}开始时间</span>
                  <strong>{isPostpartum ? "断奶前第 0 天" : "断奶前第 0 天"}</strong>
                </div>
                <div className="mv-weaning-kv-row">
                  <span>检查对象</span>
                  <strong>{isPostpartum ? "生产母猪 / 仔猪" : "断奶栏位 / 母猪"}</strong>
                </div>
              </Card>
            </section>

            <section className="mv-weaning-detail-section">
              <div className="mv-section-bar-title">SOP</div>
              <Card className="mv-card mv-weaning-detail-sop-card" bordered={false}>
                <div className="mv-weaning-kv-row">
                  <span>{isPostpartum ? "查看断奶检查标准" : "查看断奶检查标准"}</span>
                  <RightOutlined />
                </div>
              </Card>
            </section>
          </div>
        )}
      </div>
      {tab === "detail" ? (
        <div className="mv-weaning-bottom-bar">
          <Button type="primary" block size="large" onClick={() => setEndTaskOpen(true)}>
            结束任务
          </Button>
        </div>
      ) : null}

      <Modal
        title={null}
        open={detailOpen && !!activeAnnotatedRow}
        onCancel={() => {
          setDetailOpen(false);
          setRetainedModalOpen(false);
        }}
        footer={null}
        closeIcon={<CloseOutlined />}
        getContainer={modalContainer}
        width={390}
        className="mv-weaning-detail-modal"
        destroyOnClose
      >
        {activeAnnotatedRow ? (
          <div className="mv-weaning-detail">
            <Title level={4} className="mv-weaning-detail__title">
              {checkTabLabel}
            </Title>
            <div className="mv-weaning-detail__head">
              <strong>{activeAnnotatedRow.stallNo}</strong>
              <div className="mv-weaning-detail__identity-main">
                <div className="mv-weaning-detail__identity-row">
                  <span>{activeAnnotatedRow.earTag}</span>
                  <div className="mv-weaning-row__flags mv-weaning-row__flags--inline">
                    {activeAnnotatedRow.cullPlanned ? (
                      <Tag
                        className={`mv-weaning-flag ${
                          activeAnnotatedRow.cullDone ? "mv-weaning-flag--cull-done" : "mv-weaning-flag--cull-pending"
                        }`}
                      >
                        {activeAnnotatedRow.cullDone ? "已淘汰" : "需淘汰"}
                      </Tag>
                    ) : null}
                    {activeAnnotatedRow.retainPlanned ? (
                      <Tag className="mv-weaning-flag mv-weaning-flag--retain">重点留种来源</Tag>
                    ) : null}
                  </div>
                </div>
                <Text type="secondary">
                  母猪，{activeAnnotatedRow.sowAgeDays}日龄，{activeAnnotatedRow.sowParityText}
                </Text>
              </div>
            </div>

            <div className="mv-section-bar-title">仔猪信息</div>
            <Card className="mv-card mv-weaning-modal-info-card mv-weaning-modal-piglet-card" bordered={false}>
              <div className="mv-weaning-detail-card__head">
                <div>
                  <strong>仔猪信息</strong>
                </div>
                <Button
                  type="link"
                  className="mv-weaning-edit-link"
                  onClick={() => {
                    setRetainedModalOpen(false);
                    setDetailOpen(false);
                    setEditingSection("piglet");
                  }}
                >
                  {isActivePigletDone ? "重新编辑" : "去填写"}
                </Button>
              </div>
              <div className="mv-weaning-detail-stat-grid">
                <DetailStat label="总数量" value={activeRecord?.piglet ? String(activeRecord.piglet.healthyCount + activeRecord.piglet.weakCount + activeRecord.piglet.malformedCount) : "-"} />
                <DetailStat label="公 / 母" value={activeRecord?.piglet ? `${activeRecord.piglet.maleCount} / ${activeRecord.piglet.femaleCount}` : "-"} />
                <DetailStat label="留种标记" value={activeRecord?.piglet != null ? `${activeRecord.piglet.retainedCount}头` : "-"} />
                <DetailStat label="总体重" value={activeRecord?.piglet?.weightKg ? `${activeRecord.piglet.weightKg}kg` : "-"} />
              </div>
            </Card>

            <div className="mv-section-bar-title">母猪状态</div>
            <Card className="mv-card mv-weaning-modal-info-card mv-weaning-modal-sow-card" bordered={false}>
              <div className="mv-weaning-detail-card__head">
                <div>
                  <strong>母猪状态</strong>
                </div>
                <Button
                  type="link"
                  className="mv-weaning-edit-link"
                  onClick={() => {
                    setRetainedModalOpen(false);
                    setDetailOpen(false);
                    setEditingSection("sow");
                  }}
                >
                  {isActiveSowDone ? "重新编辑" : "去填写"}
                </Button>
              </div>
              <div className="mv-weaning-detail-stat-grid mv-weaning-detail-stat-grid--compact">
                <DetailStat label="体况评分" value={activeRecord?.sow ? `${activeRecord.sow.bodyScore}分` : "-"} />
                <DetailStat label="淘汰复核" value={activeRecord?.sow?.cullSuggestion ?? "-"} />
                <DetailStat label="检查异常" value={activeRecord?.sow ? "3项" : "-"} />
              </div>
            </Card>

            <div className="mv-weaning-bottom-bar mv-weaning-bottom-bar--detail">
              <Button type="primary" block size="large" onClick={saveRowAsDone} disabled={!isActiveReadyToSubmit}>
                {isActiveReadyToSubmit ? "提交本头检查" : "请先完成两项填写"}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>



      <Modal
        title="筛选猪只"
        open={filterOpen}
        onCancel={() => setFilterOpen(false)}
        footer={null}
        width={360}
        getContainer={modalContainer}
        className="mv-weaning-retain-modal mv-weaning-filter-modal"
        destroyOnClose
      >
        <div className="mv-weaning-filter-list">
          {(
            [
              ["all", "全部母猪"],
              ["pending", "待检查猪只"],
              ["cull", "建议淘汰猪只"],
              ["retain", "推荐留种母猪"],
              ["overlap", "交叉关注猪只"]
            ] as Array<[RowFilter, string]>
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`mv-weaning-filter-row${rowFilter === value ? " is-active" : ""}`}
              onClick={() => {
                setRowFilter(value);
                setFilterOpen(false);
              }}
            >
              <span>{label}</span>
              {rowFilter === value ? <CheckCircleFilled /> : null}
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}

function WeaningRowCard({
  row,
  mode,
  onOpen
}: {
  row: AnnotatedRow;
  mode: ViewMode;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      className={`mv-weaning-row__line mv-weaning-row__line--${row.status}${mode === "grid" ? " mv-weaning-row__line--grid" : ""}`}
      onClick={onOpen}
    >
      <div className="mv-weaning-row__main">
        <div className="mv-weaning-row__topline">
          <div className="mv-weaning-row__identity">
            <div className="mv-weaning-row__earline">
              <span className="mv-weaning-row__ear">{row.earTag}</span>
              <div className="mv-weaning-row__flags mv-weaning-row__flags--inline">
                {row.cullPlanned ? (
                  <Tag className={`mv-weaning-flag ${row.cullDone ? "mv-weaning-flag--cull-done" : "mv-weaning-flag--cull-pending"}`}>
                    {row.cullDone ? "已淘汰" : "需淘汰"}
                  </Tag>
                ) : null}
                {row.retainPlanned ? <Tag className="mv-weaning-flag mv-weaning-flag--retain">重点留种来源</Tag> : null}
              </div>
            </div>
            {row.status === "done" && (row.pigletTotal || row.retainedPiglets) ? (
              <div className="mv-weaning-row__subline">
                <div className="mv-weaning-row__result">
                  <span>共：{row.pigletTotal ?? 0}</span>
                  <span className="mv-weaning-row__result-divider">|</span>
                  <span>留种：{row.retainedPiglets ?? 0}</span>
                </div>
              </div>
            ) : null}
          </div>
          <div className="mv-weaning-row__aside">
            <span
              className={`mv-weaning-row__status mv-weaning-row__status--${row.status}`}
              aria-label={row.status === "done" ? "已完成" : "待断奶检查"}
              title={row.status === "done" ? "已完成" : "待断奶检查"}
            >
              {row.status === "done" ? <CheckCircleFilled /> : <ClockCircleOutlined />}
            </span>
            <span className="mv-weaning-row__action">
              <RightOutlined />
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

function CompactProcessRow({
  label,
  done,
  total,
  tone,
  unit
}: {
  label: string;
  done: number;
  total: number;
  tone: "check" | "cull" | "retain";
  unit?: string;
}) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className={`mv-weaning-progress-card__process-row mv-weaning-progress-card__process-row--${tone}`}>
      <div className="mv-weaning-progress-card__process-meta">
        <span>{label}</span>
        <strong>
          {done} / {total}{unit ? ` ${unit}` : ""}
        </strong>
      </div>
      <div className="mv-weaning-progress-card__process-track">
        <div className="mv-weaning-progress-card__process-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="mv-weaning-detail-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function PlanProgressRow({
  label,
  done,
  total,
  tone
}: {
  label: string;
  done: number;
  total: number;
  tone: "cull" | "retain";
}) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className={`mv-weaning-plan-progress mv-weaning-plan-progress--${tone}`}>
      <div className="mv-weaning-plan-progress__meta">
        <span>{label}</span>
        <strong>
          {done} / {total}
        </strong>
      </div>
      <div className="mv-weaning-plan-progress__track">
        <div className="mv-weaning-plan-progress__fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function WeaningStepperRow({
  label,
  value,
  onChange
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="mv-weaning-stepper-row">
      <span>{label}</span>
      <div className="mv-weaning-stepper">
        <button type="button" onClick={() => onChange(Math.max(0, value - 1))}>
          -
        </button>
        <strong>{value}</strong>
        <button type="button" onClick={() => onChange(value + 1)}>
          +
        </button>
      </div>
    </div>
  );
}

function WeaningOptionRow({
  label,
  options,
  value,
  onChange
}: {
  label: ReactNode;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="mv-weaning-option-row">
      <div className="mv-weaning-option-row__label">{label}</div>
      <Radio.Group
        className="mv-weaning-option-row__group"
        size="small"
        options={options.map((x) => ({ label: x, value: x }))}
        value={value}
        optionType="button"
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
