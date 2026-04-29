import {
  AppstoreOutlined,
  BellOutlined,
  DeploymentUnitOutlined,
  ExclamationCircleFilled,
  FilterOutlined,
  HomeOutlined,
  LeftOutlined,
  MedicineBoxOutlined,
  MoreOutlined,
  RightOutlined,
  SearchOutlined,
  TagOutlined,
  ToolOutlined,
  UnorderedListOutlined,
  UpOutlined,
  UserOutlined
} from "@ant-design/icons";
import {
  Checkbox,
  Button,
  Card,
  DatePicker,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Popover,
  Radio,
  Segmented,
  Select,
  Tabs,
  Tag,
  Typography,
  message
} from "antd";
import dayjs from "dayjs";
import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { buildVaccinationHomeCards } from "../buildMobileHomeCards";
import { filterFixtureTasks, MOBILE_HOME_FIXTURE_TASKS } from "../mobileHomeFixtures";
import type { MobileHomeTaskCard } from "../mobileHomeTypes";
import { MobileWeaningCheckFlow } from "./MobileWeaningCheckFlow";
import {
  exemptionHitRuleDisplay,
  filterTasksByLocation,
  isSupersededOriginal,
  normalizeDosageUnitForInput,
  resolveDosageLabel,
  type MobileExecutionLog,
  type MobilePigTask
} from "../mobileVaccinationUtils";
import { useMobileSimulationContainer } from "../mobileSimulationContext";
import {
  allRoomOptions,
  roomLabelById,
  type WorkshopDef,
  workshopForRoom,
  WORKSHOPS
} from "../mobileWorkshops";
import { FixtureMissionCard, VaccinationHomeCard } from "./MobileHomeTaskCards";

const { Text, Title } = Typography;

/** 车间展示名：取「 · 」前为高层级（如 配怀舍），与现场「母猪车间」式层级一致 */
function workshopTierLabel(w: WorkshopDef): string {
  const i = w.label.indexOf(" · ");
  return i >= 0 ? w.label.slice(0, i).trim() : w.label.trim();
}

function workshopSubLabel(w: WorkshopDef): string | null {
  const i = w.label.indexOf(" · ");
  return i >= 0 ? w.label.slice(i + 3).trim() || null : null;
}

type RoomPickerView = "pick" | "distribute";

type RoomPickerGroup = {
  workshop: WorkshopDef;
  rooms: NonNullable<MobileHomeTaskCard["roomPending"]>;
};

function fieldOrDash(s?: string | null): string {
  const t = s?.trim();
  if (!t || t === "-") return "—";
  return t;
}

function formatZhDate(dateText?: string): string {
  if (!dateText) return "";
  const d = dayjs(dateText);
  if (!d.isValid()) return dateText;
  return `${d.year()}年${d.month() + 1}月${d.date()}日`;
}

function buildImmuneIntervalTip(task: MobilePigTask): string | null {
  const intervalDays = Number(task.immuneIntervalDays ?? 0);
  const lastAt = task.lastVaccinatedAt?.trim();
  if (!intervalDays || intervalDays <= 0 || !lastAt) return null;
  const last = dayjs(lastAt);
  const schedule = dayjs(task.schedule);
  if (!last.isValid() || !schedule.isValid()) return null;
  const diffDays = schedule.startOf("day").diff(last.startOf("day"), "day");
  if (diffDays >= intervalDays) return null;
  const nextDate = last.add(intervalDays, "day");
  const lastVaccineName = task.lastVaccinatedVaccineName?.trim() || "未知疫苗";
  return `${task.earTag} 距离上次接种“${lastVaccineName}”（${formatZhDate(lastAt)}）未满${intervalDays}天，当前仍在免疫间隔期内。\n为避免免疫干扰，建议延后至 ${formatZhDate(nextDate.format("YYYY-MM-DD"))} 后再接种。`;
}

type Screen = "hub" | "pigList" | "weaning";
type PigDrawerPhase = "detail" | "execute";

const LOG_TYPE_LABEL: Record<MobileExecutionLog["type"], string> = {
  started: "开始执行",
  completed: "接种完成",
  skipped: "已跳过",
  deferred: "已延期",
  exception_resolved: "异常已处理",
  still_vaccinate: "仍接种",
  suspended_retry: "暂缓 · 补打任务",
  room_batch_closed: "本间结束",
  forced_complete_prompt: "强制接种确认"
};

function statusLabel(t: MobilePigTask): string {
  if (t.isRetry) return t.status === "completed" ? "补打·已完成" : "补打·待办";
  if (t.exceptionPending) return "异常待处理";
  if (t.status === "in_progress") return "执行中";
  if (t.status === "completed")
    return t.completionSubtype === "forced" ? "已完成（强制接种）" : "已完成";
  if (t.status === "skipped") return "已跳过";
  if (t.status === "suspended") return "已暂缓";
  if (t.deferUntil) return `待执行（延期至 ${t.deferUntil}）`;
  return "待执行";
}

function matchesRetryList(t: MobilePigTask): boolean {
  return t.isRetry && t.status !== "completed" && t.status !== "skipped";
}

/** 接种任务卡进度：已完成头数 / 总头数 */
function vaccinationCardProgress(card: MobileHomeTaskCard): {
  done: number;
  total: number;
  pct: number;
} {
  const rooms = card.roomPending ?? [];
  const total = rooms.reduce((s, r) => s + r.total, 0);
  const pending = rooms.reduce((s, r) => s + r.pending, 0);
  const done = Math.max(0, total - pending);
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return { done, total, pct };
}

/** 房间猪只列表卡片右上角状态文案与颜色 */
function pigRowListStatus(t: MobilePigTask): {
  label: string;
  color: string;
  tone: "pending" | "completed" | "skipped" | "suspended" | "deferred";
} {
  if (t.status === "completed") return { label: "已接种", color: "green", tone: "completed" };
  if (t.status === "skipped") return { label: "已跳过", color: "orange", tone: "skipped" };
  if (t.status === "suspended") return { label: "已暂缓", color: "default", tone: "suspended" };
  if (t.deferUntil?.trim()) {
    const p = dayjs(t.deferUntil);
    const ts = p.isValid() ? p.format("YYYY-MM-DD HH:mm:ss") : t.deferUntil.trim();
    return { label: `${ts}后可接种`, color: "processing", tone: "deferred" };
  }
  return { label: "待接种", color: "default", tone: "pending" };
}

function pigListSearchMatches(t: MobilePigTask, q: string): boolean {
  const raw = q.trim().toLowerCase();
  if (!raw) return true;
  const pid = t.pigId.toLowerCase();
  const pidShort = pid.replace(/^pig-/, "");
  const parts = [t.earTag, t.stallNo, pid, pidShort, t.earNotch ?? ""].map((x) =>
    String(x).toLowerCase()
  );
  return parts.some((p) => p.includes(raw));
}

function pigTypeLabel(t: MobilePigTask): string {
  const group = t.targetPigGroup?.trim();
  if (group) return group.split("·")[0].trim();
  return "猪只";
}

interface Props {
  pigTasks: MobilePigTask[];
  setPigTasks: Dispatch<SetStateAction<MobilePigTask[]>>;
  logs: MobileExecutionLog[];
  setLogs: Dispatch<SetStateAction<MobileExecutionLog[]>>;
}

function PigSlotDrawer({
  open,
  onClose,
  phase,
  setPhase,
  task,
  executeForced,
  setExecuteForced,
  appendLog,
  removeTask,
  updateTask,
  modalContainer
}: {
  open: boolean;
  onClose: () => void;
  phase: PigDrawerPhase;
  setPhase: (p: PigDrawerPhase) => void;
  task: MobilePigTask;
  executeForced: boolean;
  setExecuteForced: (v: boolean) => void;
  appendLog: (entry: Omit<MobileExecutionLog, "id">) => void;
  removeTask: (id: string) => void;
  updateTask: (id: string, patch: Partial<MobilePigTask>) => void;
  modalContainer: () => HTMLElement;
}) {
  const [moreActionsOpen, setMoreActionsOpen] = useState(false);
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);

  const pigMoreActionItems = [
    { key: "triage", label: "调整分诊等级" },
    { key: "symptom", label: "编辑疾病/症状" },
    { key: "death", label: "上报死亡" },
    { key: "mark", label: "标记" }
  ] as const;

  const actionsLocked =
    task.status === "completed" || task.status === "skipped" || task.status === "suspended";
  const drawerStatus = pigRowListStatus(task);
  const immuneIntervalTip = buildImmuneIntervalTip(task);

  return (
    <Drawer
      rootClassName="mv-pig-action-drawer"
      title={null}
      placement="bottom"
      height="auto"
      getContainer={false}
      open={open}
      onClose={onClose}
      destroyOnClose
      closable
    >
      <div className="mv-pig-drawer__head">
        <div className="mv-pig-drawer__title-row">
          <div className="mv-pig-drawer__title-main">
            <Title level={5} className="mv-pig-drawer__title" style={{ margin: 0 }}>
              {task.earTag}
            </Title>
            <div className="mv-pig-drawer__head-meta">
              <Text type="secondary" className="mv-pig-drawer__stall">
                栏位 {task.stallNo}
              </Text>
              <Tag
                className={`mv-pig-drawer__status-tag mv-pig-status-tone--${drawerStatus.tone}`}
                color={drawerStatus.color}
              >
                {drawerStatus.label}
              </Tag>
            </div>
          </div>
          <Button
            type="text"
            className="mv-pig-drawer__more-btn"
            icon={<MoreOutlined />}
            aria-label="更多操作"
            onClick={() => setMoreActionsOpen(true)}
          />
        </div>
      </div>

      <div className="mv-pig-drawer__body">
        {phase === "execute" && (
          <ExecuteScreen
            embedded
            task={task}
            completionSubtype={executeForced ? "forced" : "normal"}
            onBack={() => {
              setExecuteForced(false);
              setPhase("detail");
            }}
            onSubmit={(values) => {
              const actualAt = dayjs().format("YYYY-MM-DD HH:mm");
              const subtype = values.completionSubtype;
              updateTask(task.id, {
                status: "completed",
                exceptionPending: false,
                deferUntil: undefined,
                actualAt,
                executor: "现场用户",
                doseGiven: String(values.doseGiven ?? ""),
                remark: values.remark,
                completionMode: "full",
                completionSubtype: subtype
              });
              appendLog({
                pigTaskId: task.id,
                at: actualAt,
                actor: "现场用户",
                type: "completed",
                summary:
                  subtype === "forced"
                    ? "完成（强制接种）"
                    : "完成接种",
                payload: {
                  ...values,
                  actualAt,
                  completionSubtype: subtype
                }
              });
              setExecuteForced(false);
              setPhase("detail");
            }}
          />
        )}

        {phase === "detail" && (
          <>
            {task.isRetry && (
              <div className="mv-retry-stripe">补打任务 · Is_Retry · 请优先核对栏位与头数</div>
            )}

            {task.exemptionHit && (
              <div className="mv-exemption-rule-hit mv-exemption-rule-hit--drawer">
                <p className="mv-exemption-rule-hit__text">
                  {exemptionHitRuleDisplay(task)} 建议延期接种。
                </p>
              </div>
            )}
            {immuneIntervalTip && (
              <div className="mv-exemption-rule-hit mv-exemption-rule-hit--drawer">
                <p className="mv-exemption-rule-hit__text" style={{ whiteSpace: "pre-line" }}>
                  {immuneIntervalTip}
                </p>
              </div>
            )}

            <div className="mv-pig-drawer-primary-actions">
              <Button
                block
                size="large"
                danger
                disabled={actionsLocked}
                onClick={() => setRemoveConfirmOpen(true)}
              >
                移出接种列表
              </Button>
              <Button
                block
                size="large"
                type="primary"
                disabled={actionsLocked}
                onClick={() => {
                  const actualAt = dayjs().format("YYYY-MM-DD HH:mm");
                  const subtype = task.exemptionHit ? "forced" : "normal";
                  updateTask(task.id, {
                    status: "completed",
                    exceptionPending: false,
                    deferUntil: undefined,
                    actualAt,
                    executor: "现场用户",
                    completionMode: "full",
                    completionSubtype: subtype
                  });
                  appendLog({
                    pigTaskId: task.id,
                    at: actualAt,
                    actor: "现场用户",
                    type: "completed",
                    summary: subtype === "forced" ? "完成（强制接种）" : "完成接种",
                    payload: { actualAt, completionSubtype: subtype, mode: "quick_complete" }
                  });
                }}
              >
                {task.exemptionHit ? "仍然接种" : "接种"}
              </Button>
            </div>
          </>
        )}
      </div>

      <Modal
        title="更多操作"
        open={moreActionsOpen}
        getContainer={modalContainer}
        footer={null}
        destroyOnClose
        onCancel={() => setMoreActionsOpen(false)}
        width={360}
      >
        <Text type="secondary" className="mv-pig-more-actions__hint">
          以下入口已对接既有模块，演示环境仅作占位提示。
        </Text>
        <div className="mv-pig-more-actions">
          {pigMoreActionItems.map((item) => (
            <Button
              key={item.key}
              block
              size="large"
              className="mv-pig-more-actions__btn"
              onClick={() => {
                message.info(`「${item.label}」请在正式环境中打开已配置页面`);
                setMoreActionsOpen(false);
              }}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </Modal>

      <Modal
        title="移出接种列表"
        open={removeConfirmOpen}
        getContainer={modalContainer}
        okText="确认移出"
        cancelText="取消"
        okButtonProps={{ danger: true }}
        destroyOnClose
        onCancel={() => setRemoveConfirmOpen(false)}
        onOk={() => {
          removeTask(task.id);
          setRemoveConfirmOpen(false);
          onClose();
          message.success("已移出接种列表");
          return Promise.resolve();
        }}
      >
        <Text type="secondary">
          确认将耳标 {task.earTag} 从接种列表移除？移除后将不再参与本次接种。
        </Text>
      </Modal>
    </Drawer>
  );
}

export function MobileVaccinationPage({
  pigTasks,
  setPigTasks,
  logs,
  setLogs
}: Props) {
  const modalContainer = useMobileSimulationContainer();
  const [scopeMode, setScopeMode] = useState<"workshop" | "room">("workshop");
  const [workshopId, setWorkshopId] = useState<string>("ws-1");
  const [roomIdDirect, setRoomIdDirect] = useState<string>("r-a1");
  const [screen, setScreen] = useState<Screen>("hub");
  const [pigListBatchId, setPigListBatchId] = useState<string | null>(null);
  const [pigListRoomId, setPigListRoomId] = useState<string | null>(null);
  const [weaningFlowTitle, setWeaningFlowTitle] = useState("断奶检查");
  const [weaningFlowRoomLabel, setWeaningFlowRoomLabel] = useState("分娩舍 B1 间");
  const [inspectionDrawerOpen, setInspectionDrawerOpen] = useState(false);
  const [inspectionFixture, setInspectionFixture] = useState<(typeof fixtureCards)[0] | null>(null);
  const [pigDrawerOpen, setPigDrawerOpen] = useState(false);
  const [pigDrawerPhase, setPigDrawerPhase] = useState<PigDrawerPhase>("detail");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerCard, setDrawerCard] = useState<MobileHomeTaskCard | null>(null);
  const [roomPickerView, setRoomPickerView] = useState<RoomPickerView>("pick");
  const [distWorkshopFilter, setDistWorkshopFilter] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [executeForced, setExecuteForced] = useState(false);
  const [pigListSearch, setPigListSearch] = useState("");
  const [pigListView, setPigListView] = useState<"list" | "grid">("list");
  const [pigListStatusFilter, setPigListStatusFilter] = useState<"all" | "incomplete" | "done">(
    "all"
  );
  const [pigListFilterOpen, setPigListFilterOpen] = useState(false);
  const [pigListSelectedIds, setPigListSelectedIds] = useState<string[]>([]);
  /** 房间内：免疫任务（猪只列表）| vaccine（任务详情，Tab 文案均为「免疫任务」） */
  const [pigListRoomTab, setPigListRoomTab] = useState<"immunity" | "vaccine">("immunity");
  const [endTaskModalOpen, setEndTaskModalOpen] = useState(false);
  const [endTaskConfirmChecked, setEndTaskConfirmChecked] = useState(false);

  const resolvedWorkshopId =
    scopeMode === "room" ? workshopForRoom(roomIdDirect)?.id ?? "ws-1" : workshopId;

  useEffect(() => {
    if (scopeMode !== "room") return;
    const valid = allRoomOptions().some((o) => o.roomId === roomIdDirect);
    if (!valid && allRoomOptions().length) {
      setRoomIdDirect(allRoomOptions()[0].roomId);
    }
  }, [scopeMode, roomIdDirect]);

  const active = useMemo(
    () => pigTasks.find((p) => p.id === activeId) ?? null,
    [pigTasks, activeId]
  );

  const locationFiltered = useMemo(
    () =>
      filterTasksByLocation(
        pigTasks,
        scopeMode === "room" ? "room" : "workshop",
        resolvedWorkshopId,
        scopeMode === "room" ? roomIdDirect : null
      ),
    [pigTasks, scopeMode, resolvedWorkshopId, roomIdDirect]
  );

  /** 本间本批次全部猪只任务，用于单元进度与目标列表（无筛选） */
  const pigListUnitTasks = useMemo(() => {
    if (!pigListBatchId || !pigListRoomId) return [];
    return pigTasks.filter(
      (t) =>
        t.batchId === pigListBatchId &&
        t.roomId === pigListRoomId &&
        !isSupersededOriginal(t, pigTasks)
    );
  }, [pigTasks, pigListBatchId, pigListRoomId]);

  useEffect(() => {
    if (!pigListBatchId || !pigListRoomId) return;
    setPigListSearch("");
    setPigListView("list");
    setPigListStatusFilter("all");
    setPigListFilterOpen(false);
    setPigListSelectedIds([]);
    setPigListRoomTab("immunity");
    setEndTaskModalOpen(false);
    setEndTaskConfirmChecked(false);
  }, [pigListBatchId, pigListRoomId]);

  const pigListDisplayedTasks = useMemo(() => {
    let list = pigListUnitTasks;
    if (pigListStatusFilter === "incomplete") {
      list = list.filter((t) => t.status !== "completed" && t.status !== "skipped");
    } else if (pigListStatusFilter === "done") {
      list = list.filter((t) => t.status === "completed" || t.status === "skipped");
    }
    if (pigListSearch.trim()) {
      list = list.filter((t) => pigListSearchMatches(t, pigListSearch));
    }
    return list;
  }, [pigListUnitTasks, pigListSearch, pigListStatusFilter]);

  const pigListDisplayedByStall = useMemo(() => {
    const g = new Map<string, MobilePigTask[]>();
    for (const t of pigListDisplayedTasks) {
      const key = t.stallNo?.trim() || "未分配栏位";
      if (!g.has(key)) g.set(key, []);
      g.get(key)!.push(t);
    }
    return Array.from(g.entries())
      .map(([stallNo, tasks]) => ({
        stallNo,
        tasks: tasks.slice().sort((a, b) => a.earTag.localeCompare(b.earTag))
      }))
      .sort((a, b) => a.stallNo.localeCompare(b.stallNo));
  }, [pigListDisplayedTasks]);

  const pigListUnitMeta = useMemo(() => {
    if (!pigListUnitTasks.length) return null;
    const ref = pigListUnitTasks.find((t) => !t.isRetry) ?? pigListUnitTasks[0];
    const done = pigListUnitTasks.filter(
      (t) => t.status === "completed" || t.status === "skipped"
    ).length;
    return {
      taskId: ref.taskId,
      doseTimes: ref.doseTimes,
      intervalLabel: ref.intervalLabel,
      schedule: ref.schedule,
      targetPigGroup: ref.targetPigGroup,
      coverCount: ref.coverCount,
      exemptionHitCount: ref.exemptionHitCount,
      vaccineName: ref.vaccineName,
      vaccineBrand: ref.vaccineBrand,
      dosageForm: ref.dosageForm,
      administrationRoute: ref.administrationRoute,
      dosage: resolveDosageLabel(ref),
      done,
      total: pigListUnitTasks.length
    };
  }, [pigListUnitTasks]);

  const roomTaskStatusSummary = useMemo(() => {
    const completed = pigListUnitTasks.filter((t) => t.status === "completed").length;
    const skipped = pigListUnitTasks.filter((t) => t.status === "skipped").length;
    const suspended = pigListUnitTasks.filter((t) => t.status === "suspended").length;
    const pending = pigListUnitTasks.filter((t) => t.status === "pending").length;
    const inProgress = pigListUnitTasks.filter((t) => t.status === "in_progress").length;
    const deferred = pigListUnitTasks.filter(
      (t) => t.status === "pending" && !!t.deferUntil?.trim()
    ).length;
    const unfinished = pigListUnitTasks.length - completed - skipped;
    const done = completed + skipped;
    return {
      total: pigListUnitTasks.length,
      completed,
      skipped,
      suspended,
      pending,
      inProgress,
      deferred,
      done,
      unfinished,
      allDone: pigListUnitTasks.length > 0 && unfinished === 0
    };
  }, [pigListUnitTasks]);

  const pigListSelectedSet = useMemo(() => new Set(pigListSelectedIds), [pigListSelectedIds]);

  const togglePigSelected = useCallback((id: string, checked: boolean) => {
    setPigListSelectedIds((prev) => {
      const set = new Set(prev);
      if (checked) set.add(id);
      else set.delete(id);
      return Array.from(set);
    });
  }, []);

  const clearPigSelection = useCallback(() => setPigListSelectedIds([]), []);

  const retryScoped = useMemo(
    () => locationFiltered.filter(matchesRetryList),
    [locationFiltered]
  );

  const vaccinationHomeCards = useMemo(
    () =>
      buildVaccinationHomeCards(
        pigTasks,
        scopeMode === "room" ? "room" : "workshop",
        resolvedWorkshopId,
        scopeMode === "room" ? roomIdDirect : null
      ),
    [pigTasks, scopeMode, resolvedWorkshopId, roomIdDirect]
  );

  useEffect(() => {
    if (!drawerOpen) {
      setRoomPickerView("pick");
      setDistWorkshopFilter(null);
    }
  }, [drawerOpen]);

  useEffect(() => {
    if (!inspectionDrawerOpen) setInspectionFixture(null);
  }, [inspectionDrawerOpen]);

  const roomPickerGroups = useMemo((): RoomPickerGroup[] => {
    const rooms = drawerCard?.roomPending;
    if (!rooms?.length) return [];
    const out: RoomPickerGroup[] = [];
    for (const w of WORKSHOPS) {
      const groupRooms = rooms.filter((r) => w.roomIds.includes(r.roomId));
      if (groupRooms.length) out.push({ workshop: w, rooms: groupRooms });
    }
    return out;
  }, [drawerCard?.roomPending]);

  const drawerTaskTotalHeads = useMemo(() => {
    const rooms = drawerCard?.roomPending ?? [];
    return rooms.reduce((s, r) => s + r.total, 0);
  }, [drawerCard?.roomPending]);

  const distributionRooms = useMemo(() => {
    const rooms = drawerCard?.roomPending ?? [];
    if (!distWorkshopFilter) return rooms;
    const w = WORKSHOPS.find((x) => x.id === distWorkshopFilter);
    if (!w) return rooms;
    return rooms.filter((r) => w.roomIds.includes(r.roomId));
  }, [drawerCard?.roomPending, distWorkshopFilter]);

  const distWorkshopDef = distWorkshopFilter
    ? WORKSHOPS.find((x) => x.id === distWorkshopFilter)
    : null;
  const distributionTitle =
    roomPickerView !== "distribute"
      ? ""
      : !distWorkshopFilter
        ? "全部单元分布"
        : distWorkshopDef
          ? `${workshopTierLabel(distWorkshopDef)} · 单元分布`
          : "单元分布";

  const fixtureCards = useMemo(
    () =>
      filterFixtureTasks(MOBILE_HOME_FIXTURE_TASKS, {
        scope: scopeMode === "room" ? "room" : "workshop",
        workshopId: resolvedWorkshopId,
        roomId: scopeMode === "room" ? roomIdDirect : null
      }),
    [scopeMode, resolvedWorkshopId, roomIdDirect]
  );

  const inspectionRooms = useMemo(() => {
    if (scopeMode === "room") {
      const room = allRoomOptions().find((o) => o.roomId === roomIdDirect);
      return room ? [{ roomId: room.roomId, roomLabel: room.roomLabel, pending: 100, total: 200 }] : [];
    }
    const workshop = WORKSHOPS.find((w) => w.id === resolvedWorkshopId) ?? WORKSHOPS[0];
    return workshop.roomIds.map((roomId) => ({
      roomId,
      roomLabel: roomLabelById(roomId),
      pending: 100,
      total: 200
    }));
  }, [scopeMode, roomIdDirect, resolvedWorkshopId]);

  const enterInspectionRoom = (roomId: string) => {
    if (!inspectionFixture) return;
    setWeaningFlowTitle(inspectionFixture.title);
    setWeaningFlowRoomLabel(roomLabelById(roomId));
    setInspectionDrawerOpen(false);
    setInspectionFixture(null);
    setScreen("weaning");
  };

  const homeProgress = useMemo(() => {
    return fixtureCards.reduce(
      (acc, card) => {
        return {
          done: acc.done + (card.progressDone ?? 0),
          total: acc.total + (card.progressTotal ?? 0)
        };
      },
      { done: 0, total: 0 }
    );
  }, [fixtureCards]);

  const sectionTabRooms = useMemo(() => {
    const workshop = WORKSHOPS.find((w) => w.id === resolvedWorkshopId) ?? WORKSHOPS[0];
    return workshop.roomIds.slice(0, 4).map((roomId, index) => ({
      key: roomId,
      label: `单元${index + 1}`
    }));
  }, [resolvedWorkshopId]);

  const setOverviewScope = useCallback(() => {
    setScopeMode("workshop");
  }, []);

  const setUnitScope = useCallback((roomId: string) => {
    setRoomIdDirect(roomId);
    setScopeMode("room");
  }, []);

  const appendLog = useCallback(
    (entry: Omit<MobileExecutionLog, "id">) => {
      setLogs((prev) => [
        {
          ...entry,
          id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        },
        ...prev
      ]);
    },
    [setLogs]
  );

  const updateTask = useCallback(
    (id: string, patch: Partial<MobilePigTask>) => {
      setPigTasks((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    },
    [setPigTasks]
  );

  const removeTask = useCallback(
    (id: string) => {
      setPigTasks((prev) => prev.filter((p) => p.id !== id));
    },
    [setPigTasks]
  );

  const removeTasks = useCallback(
    (ids: string[]) => {
      if (!ids.length) return;
      const set = new Set(ids);
      setPigTasks((prev) => prev.filter((p) => !set.has(p.id)));
    },
    [setPigTasks]
  );

  const openPigDrawer = useCallback((id: string) => {
    setActiveId(id);
    setPigDrawerPhase("detail");
    setPigDrawerOpen(true);
    setExecuteForced(false);
  }, []);

  const closePigDrawer = useCallback(() => {
    setPigDrawerOpen(false);
    setPigDrawerPhase("detail");
    setActiveId(null);
    setExecuteForced(false);
  }, []);

  const openVaccinationCard = (card: MobileHomeTaskCard) => {
    if (!card.batchId) return;
    setDrawerCard(card);
    setDrawerOpen(true);
  };

  const enterRoomFromDrawer = (roomId: string) => {
    if (!drawerCard?.batchId) return;
    setPigListBatchId(drawerCard.batchId);
    setPigListRoomId(roomId);
    setRoomPickerView("pick");
    setDistWorkshopFilter(null);
    setDrawerOpen(false);
    setDrawerCard(null);
    setScreen("pigList");
  };

  /** 本间 + 当前批次：参与「本间完成」批量标记的猪只任务（不含补打克隆、不含已顶替原行） */
  const roomBatchActivePigLines = useCallback(
    (roomId: string, batchId: string) =>
      pigTasks.filter(
        (t) =>
          t.roomId === roomId &&
          t.batchId === batchId &&
          !t.isRetry &&
          !isSupersededOriginal(t, pigTasks)
      ),
    [pigTasks]
  );

  const runRoomBatchMarkVaccinated = useCallback(
    (roomId: string, batchId: string, forceIncludeExemption: boolean) => {
      const at = dayjs().format("YYYY-MM-DD HH:mm");
      setPigTasks((prev) =>
        prev.map((t) => {
          if (t.roomId !== roomId || t.batchId !== batchId || t.isRetry) return t;
          if (isSupersededOriginal(t, prev)) return t;
          if (t.status === "completed" || t.status === "skipped") return t;

          if (t.exemptionHit && !forceIncludeExemption) return t;

          const forced = t.exemptionHit && forceIncludeExemption;
          return {
            ...t,
            status: "completed" as const,
            exceptionPending: false,
            actualAt: at,
            executor: "本间完成（批量）",
            doseGiven: "—",
            batchNo: "—",
            completionMode: "full" as const,
            completionSubtype: forced ? ("forced" as const) : ("normal" as const)
          };
        })
      );
      appendLog({
        pigTaskId: `room-${roomId}-batch-${batchId}`,
        at,
        actor: "现场用户",
        type: "room_batch_closed",
        summary: `本间完成：房间 ${roomId} · 批次 ${batchId} · 批量标记已接种${forceIncludeExemption ? "（含豁免·强行接种）" : ""}`,
        payload: { roomId, batchId, forceIncludeExemption }
      });
    },
    [appendLog, setPigTasks]
  );

  const confirmRoomComplete = useCallback(
    (roomId: string, batchId: string | null) => {
      if (!batchId) {
        Modal.warning({
          title: "本间完成",
          content: "缺少批次信息，请从任务进入房间列表后再操作。",
          getContainer: modalContainer
        });
        return;
      }

      const lines = roomBatchActivePigLines(roomId, batchId);
      const incomplete = lines.filter((t) => t.status !== "completed" && t.status !== "skipped");
      const retryOnlyIncomplete = pigTasks.filter(
        (t) =>
          t.roomId === roomId &&
          t.batchId === batchId &&
          t.isRetry &&
          t.status !== "completed" &&
          t.status !== "skipped"
      );

      if (incomplete.length === 0 && retryOnlyIncomplete.length === 0) {
        Modal.info({
          title: "本间状态",
          content: "本间本批次接种任务均已结束，无需再次完成。",
          getContainer: modalContainer
        });
        return;
      }

      if (incomplete.length === 0 && retryOnlyIncomplete.length > 0) {
        Modal.info({
          title: "本间状态",
          content:
            "原计划行已收尾，当前未完成项仅为补打任务（Is_Retry），请在首页补打任务区逐头处理。",
          getContainer: modalContainer
        });
        return;
      }

      const nExempt = incomplete.filter((t) => t.exemptionHit).length;
      const nTotal = incomplete.length;

      if (nExempt > 0) {
        Modal.confirm({
          title: "本间完成 · 豁免提示",
          content: (
            <div>
              <p style={{ marginBottom: 12 }}>
                本间本批次仍有 <strong>{nTotal}</strong> 头未标记为已接种，其中{" "}
                <strong style={{ color: "#c2410c" }}>{nExempt}</strong> 头命中豁免规则。
              </p>
              <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>
                若选择「强行接种并标记」，将把上述 <strong>{nTotal}</strong> 头全部标记为已接种。
              </p>
            </div>
          ),
          okText: "强行接种并标记",
          cancelText: "返回",
          width: 400,
          getContainer: modalContainer,
          onOk: () => runRoomBatchMarkVaccinated(roomId, batchId, true)
        });
        return;
      }

      Modal.confirm({
        title: "本间完成 · 请确认",
        content: (
          <div>
            <p style={{ marginBottom: 8 }}>
              将把本间本批次 <strong>{nTotal}</strong> 头未接种猪只<strong>全部标记为已接种</strong>
              （批量结案）。
            </p>
            <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>请再次核对栏位与现场执行情况后再确认。</p>
          </div>
        ),
        okText: "确认标记",
        cancelText: "再检查一下",
        width: 400,
        getContainer: modalContainer,
        onOk: () => runRoomBatchMarkVaccinated(roomId, batchId, false)
      });
    },
    [pigTasks, roomBatchActivePigLines, runRoomBatchMarkVaccinated, modalContainer]
  );

  if (screen === "hub") {
    const siteSelectValue = scopeMode === "workshop" ? workshopId : roomIdDirect;
    const siteSelectOptions =
      scopeMode === "workshop"
        ? WORKSHOPS.map((w) => ({ label: w.label, value: w.id }))
        : allRoomOptions().map((o) => ({
            label: `${o.roomLabel} · ${o.workshopLabel}`,
            value: o.roomId
          }));

    const openFixture = (fx: (typeof fixtureCards)[0]) => {
      if (fx.taskType === "weaning-check" || fx.taskType === "postpartum-check") {
        setInspectionFixture(fx);
        setInspectionDrawerOpen(true);
        return;
      }
      Modal.info({
        title: fx.title,
        content: "演示：转舍任务请在场内转舍流程中确认头数与目的地。",
        getContainer: modalContainer
      });
    };

    return (
      <>
        <div className="mv-root mv-root--hub">
          <div className="mv-app-shell">
          <div className="mv-statusbar" aria-hidden>
            <span className="mv-statusbar__time">9:41</span>
            <span className="mv-statusbar__icons">
              <i className="mv-signal" />
              <i className="mv-wifi" />
              <i className="mv-battery" />
            </span>
          </div>

          <header className="mv-topbar mv-topbar--reference">
            <button type="button" className="mv-avatar-btn" aria-label="个人">
              <span className="mv-avatar-face">👩‍🌾</span>
            </button>
            <Select
              className="mv-section-selector-select"
              bordered={false}
              popupMatchSelectWidth={false}
              value={siteSelectValue}
              onChange={(v) =>
                scopeMode === "workshop"
                  ? setWorkshopId(v as string)
                  : setRoomIdDirect(v as string)
              }
              options={siteSelectOptions}
            />
            <button type="button" className="mv-bell-btn" aria-label="通知">
              <BellOutlined />
            </button>
          </header>

          <div className="mv-section-tabs" role="tablist" aria-label="区域切换">
            <button
              type="button"
              className={`mv-section-tab${scopeMode === "workshop" ? " is-active" : ""}`}
              onClick={setOverviewScope}
            >
              总览
            </button>
            {sectionTabRooms.map((room) => (
              <button
                key={room.key}
                type="button"
                className={`mv-section-tab${scopeMode === "room" && roomIdDirect === room.key ? " is-active" : ""}`}
                onClick={() => setUnitScope(room.key)}
              >
                {room.label}
              </button>
            ))}
          </div>

          <main className="mv-home-scroll">
              <section className="mv-home-stats" aria-label="现场概览">
                <div className="mv-home-stat-card">
                  <span className="mv-home-stat-title">存栏</span>
                  <strong>99,999</strong>
                  <span>头</span>
                </div>
                <div className="mv-home-stat-card mv-home-stat-card--action">
                  <span className="mv-home-stat-arrow"><RightOutlined /></span>
                  <span className="mv-home-stat-title">断奶检查</span>
                  <strong>{homeProgress.total > 0 ? `${homeProgress.done} / ${homeProgress.total}` : "0 / 0"}</strong>
                  <span>已检查</span>
                </div>
              </section>

              <section className="mv-hub-section">
                {vaccinationHomeCards.length === 0 && fixtureCards.length === 0 ? (
                  <div className="mv-mission-empty">
                    <Text type="secondary">当前场区暂无任务</Text>
                  </div>
                ) : (
                  <div className="mv-mission-list">
                    {vaccinationHomeCards.map((card) => {
                      const { done, total, pct } = vaccinationCardProgress(card);
                      return (
                        <VaccinationHomeCard
                          key={card.id}
                          card={card}
                          done={done}
                          total={total}
                          pct={pct}
                          scopeMode={scopeMode}
                          onOpen={openVaccinationCard}
                        />
                      );
                    })}
                    {fixtureCards.map((fx) => (
                      <FixtureMissionCard key={fx.id} task={fx} onOpen={openFixture} />
                    ))}
                  </div>
                )}
              </section>
          </main>

          <button
            type="button"
            className="mv-floating-up"
            aria-label="回到顶部"
            onClick={() => message.info("演示：回到顶部")}
          >
            <UpOutlined />
          </button>

          <nav className="mv-bottom-nav mv-bottom-nav--reference" aria-label="主导航">
            <button type="button" className="mv-bottom-nav__item mv-bottom-nav__item--active">
              <HomeOutlined />
              <span>首页</span>
            </button>
            <button
              type="button"
              className="mv-bottom-nav__fab"
              aria-label="快捷操作"
              onClick={() => message.info("演示：可接入扫码、快速登记等能力")}
            >
              <UnorderedListOutlined />
            </button>
            <button
              type="button"
              className="mv-bottom-nav__item"
              onClick={() => message.info("演示：工具箱入口")}
            >
              <ToolOutlined />
              <span>工具</span>
            </button>
          </nav>
        </div>

        <Drawer
          title={
            roomPickerView === "pick" ? (
              "选择进入单元"
            ) : (
              <div className="mv-room-drawer__title-bar">
                <button
                  type="button"
                  className="mv-room-drawer__nav-back"
                  aria-label="返回"
                  onClick={() => {
                    setRoomPickerView("pick");
                    setDistWorkshopFilter(null);
                  }}
                >
                  ‹
                </button>
                <span className="mv-room-drawer__title-center">{distributionTitle}</span>
                <span className="mv-room-drawer__title-placeholder" aria-hidden />
              </div>
            )
          }
          placement="bottom"
          height="auto"
          getContainer={false}
          rootClassName="mv-room-drawer"
          open={drawerOpen}
          onClose={() => {
            setDrawerOpen(false);
            setDrawerCard(null);
          }}
        >
          {roomPickerView === "distribute" ? (
            <div className="mv-room-dist">
              <Text type="secondary" className="mv-room-dist__hint">
                以下为该任务在各单元的猪只分布，可点击右侧按钮进入对应单元执行。
              </Text>
              <div className="mv-room-dist__list">
                {distributionRooms.map((r) => (
                  <div key={r.roomId} className="mv-room-dist__row">
                    <div className="mv-room-dist__row-main">
                      <div className="mv-room-dist__row-name">{r.roomLabel}</div>
                      <div className="mv-room-dist__row-meta">
                        待处理 {r.pending} 头 · 共 {r.total} 头
                      </div>
                    </div>
                    <button
                      type="button"
                      className="mv-room-drawer__enter-btn"
                      aria-label={`进入 ${r.roomLabel}`}
                      onClick={() => enterRoomFromDrawer(r.roomId)}
                    >
                      <RightOutlined />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mv-room-pick">
              <button
                type="button"
                className="mv-room-pick__summary"
                onClick={() => {
                  setDistWorkshopFilter(null);
                  setRoomPickerView("distribute");
                }}
              >
                <span className="mv-room-pick__summary-text">
                  本任务猪只：<strong>{drawerTaskTotalHeads}</strong> 头
                </span>
                <span className="mv-room-pick__summary-action">查看 &gt;</span>
              </button>
              <div className="mv-room-pick__groups">
                {roomPickerGroups.map(({ workshop, rooms }) => (
                  <div key={workshop.id} className="mv-room-pick__group">
                    <div className="mv-room-pick__group-head">
                      <div className="mv-room-pick__group-head-text">
                        <div className="mv-room-pick__tier">{workshopTierLabel(workshop)}</div>
                        {workshopSubLabel(workshop) ? (
                          <div className="mv-room-pick__tier-sub">{workshopSubLabel(workshop)}</div>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        className="mv-room-pick__link"
                        onClick={() => {
                          setDistWorkshopFilter(workshop.id);
                          setRoomPickerView("distribute");
                        }}
                      >
                        全部单元 &gt;
                      </button>
                    </div>
                    <div className="mv-room-pick__units">
                      {rooms.map((r) => (
                        <div key={r.roomId} className="mv-room-pick__unit-row">
                          <div className="mv-room-pick__unit-main">
                            <span className="mv-room-pick__unit-name">{r.roomLabel}</span>
                            <span className="mv-room-pick__unit-count">
                              待处理 {r.pending} / 共 {r.total} 头
                            </span>
                          </div>
                          <button
                            type="button"
                            className="mv-room-drawer__enter-btn"
                            aria-label={`进入 ${r.roomLabel}`}
                            onClick={() => enterRoomFromDrawer(r.roomId)}
                          >
                            <RightOutlined />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Drawer>

        <Drawer
          title="选择进入房间"
          placement="bottom"
          height="auto"
          getContainer={false}
          rootClassName="mv-inspection-room-drawer"
          open={inspectionDrawerOpen}
          onClose={() => setInspectionDrawerOpen(false)}
        >
          <div className="mv-inspection-room-sheet">
            <Text type="secondary" className="mv-inspection-room-sheet__hint">
              {inspectionFixture?.title ?? "检查任务"}需要选择执行房间后进入任务。
            </Text>
            <div className="mv-inspection-room-sheet__list">
              {inspectionRooms.map((r) => (
                <button
                  key={r.roomId}
                  type="button"
                  className="mv-inspection-room-sheet__row"
                  onClick={() => enterInspectionRoom(r.roomId)}
                >
                  <span>
                    <strong>{r.roomLabel}</strong>
                    <em>待检查 {r.pending} / 共 {r.total} {"栏"}</em>
                  </span>
                  <RightOutlined />
                </button>
              ))}
            </div>
          </div>
        </Drawer>
        </div>
        {pigDrawerOpen && active ? (
          <PigSlotDrawer
            open={pigDrawerOpen}
            onClose={closePigDrawer}
            phase={pigDrawerPhase}
            setPhase={setPigDrawerPhase}
            task={active}
            executeForced={executeForced}
            setExecuteForced={setExecuteForced}
            appendLog={appendLog}
            removeTask={removeTask}
            updateTask={updateTask}
            modalContainer={modalContainer}
          />
        ) : null}
      </>
    );
  }

  if (screen === "pigList" && pigListBatchId && pigListRoomId) {
    const roomLabel =
      pigTasks.find((t) => t.roomId === pigListRoomId)?.roomLabel ?? pigListRoomId;
    const unit = pigListUnitMeta;
    const unitPct =
      unit && unit.total > 0 ? Math.round((unit.done / unit.total) * 100) : 0;

    return (
      <>
        <div className="mv-root mv-piglist-root">
          <div className="mv-statusbar" aria-label="手机状态栏">
            <span>9:41</span>
            <span className="mv-status-icons" aria-hidden>
              <span className="mv-signal" />
              <span className="mv-wifi" />
              <span className="mv-battery" />
            </span>
          </div>
          <div className="mv-piglist-header">
          <div className="mv-piglist-toolbar">
            <Button
              type="text"
              icon={<LeftOutlined />}
              aria-label="返回"
              className="mv-piglist-toolbar__back"
              onClick={() => {
                setScreen("hub");
                setPigListBatchId(null);
                setPigListRoomId(null);
              }}
            />
            <Button
              type="primary"
              className="mv-piglist-toolbar__complete"
              onClick={() => confirmRoomComplete(pigListRoomId, pigListBatchId)}
              style={{ visibility: pigListRoomTab === "immunity" ? "visible" : "hidden" }}
            >
              本间完成
            </Button>
          </div>
          <Title level={5} className="mv-piglist-page-title">
            疫苗任务
          </Title>
          <Text type="secondary" className="mv-sub mv-piglist-page-sub">
            接种 · {roomLabel}
          </Text>

          <Tabs
            activeKey={pigListRoomTab}
            onChange={(k) => setPigListRoomTab(k as "immunity" | "vaccine")}
            className="mv-piglist-room-tabs"
            items={[
              { key: "immunity", label: "免疫任务" },
              { key: "vaccine", label: "任务详情" }
            ]}
          />

          {pigListRoomTab === "immunity" ? (
            <section className="mv-unit-progress" aria-label="单元进度">
              <div className="mv-section-bar-title">单元进度</div>
              <div className="mv-unit-progress__card">
                <div className="mv-unit-progress__compact-head">
                  <span className="mv-unit-progress__compact-room">{roomLabel}</span>
                  <span className="mv-unit-progress__compact-vaccine">{unit?.vaccineName ?? "—"}</span>
                </div>
                <div className="mv-unit-progress__compact-meta">
                  <span className="mv-unit-progress__meta-chip">
                    <TagOutlined className="mv-unit-progress__meta-icon" />
                    <em className="mv-unit-progress__meta-value" title={`品牌：${fieldOrDash(unit?.vaccineBrand)}`}>
                      {fieldOrDash(unit?.vaccineBrand)}
                    </em>
                  </span>
                  <span className="mv-unit-progress__meta-chip">
                    <AppstoreOutlined className="mv-unit-progress__meta-icon" />
                    <em className="mv-unit-progress__meta-value" title={`剂型：${fieldOrDash(unit?.dosageForm)}`}>
                      {fieldOrDash(unit?.dosageForm)}
                    </em>
                  </span>
                  <span className="mv-unit-progress__meta-chip">
                    <DeploymentUnitOutlined className="mv-unit-progress__meta-icon" />
                    <em
                      className="mv-unit-progress__meta-value"
                      title={`接种途径：${fieldOrDash(unit?.administrationRoute)}`}
                    >
                      {fieldOrDash(unit?.administrationRoute)}
                    </em>
                  </span>
                  <span className="mv-unit-progress__meta-chip">
                    <MedicineBoxOutlined className="mv-unit-progress__meta-icon" />
                    <em className="mv-unit-progress__meta-value" title={`剂量：${unit?.dosage ?? "—"}`}>
                      {unit?.dosage ?? "—"}
                    </em>
                  </span>
                </div>
                <div className="mv-unit-progress__stats-row">
                  <span className="mv-unit-progress__stats-label">（已接种+已跳过）/ 应接种</span>
                  <span className="mv-unit-progress__stats-value">
                    {unit ? `${unit.done} / ${unit.total}` : "—"}
                  </span>
                </div>
                <div className="mv-unit-progress__track">
                  <div className="mv-unit-progress__fill" style={{ width: `${unitPct}%` }} />
                </div>
              </div>
            </section>
          ) : null}
        </div>

        <div
          className={`mv-piglist-scroll${pigListRoomTab === "vaccine" ? " mv-piglist-scroll--with-endbar" : ""}`}
        >
          {pigListRoomTab === "immunity" ? (
            <>
          <div className="mv-section-bar-title">目标列表</div>
          <div className="mv-piglist-toolbar-row">
            <Input
              allowClear
              className="mv-piglist-search"
              prefix={<SearchOutlined className="mv-piglist-search__prefix" />}
              placeholder="耳标/耳缺号/栏位号"
              value={pigListSearch}
              onChange={(e) => setPigListSearch(e.target.value)}
              aria-label="搜索耳标、耳缺号或栏位号"
            />
            <Popover
              title="筛选"
              trigger="click"
              open={pigListFilterOpen}
              onOpenChange={setPigListFilterOpen}
              placement="bottomRight"
              content={
                <Radio.Group
                  value={pigListStatusFilter}
                  onChange={(e) => {
                    setPigListStatusFilter(e.target.value);
                    setPigListFilterOpen(false);
                  }}
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  <Radio value="all">全部状态</Radio>
                  <Radio value="incomplete">仅未完成</Radio>
                  <Radio value="done">仅已接种 / 已跳过</Radio>
                </Radio.Group>
              }
            >
              <Button
                type="text"
                icon={<FilterOutlined />}
                className={`mv-piglist-icon-btn${pigListStatusFilter !== "all" ? " mv-piglist-icon-btn--active" : ""}`}
                aria-label="筛选"
              />
            </Popover>
            <Radio.Group
              className="mv-piglist-view-toggle"
              value={pigListView}
              onChange={(e) => setPigListView(e.target.value as "list" | "grid")}
              optionType="button"
              buttonStyle="solid"
            >
              <Radio.Button value="list" aria-label="列表视图">
                <UnorderedListOutlined />
              </Radio.Button>
              <Radio.Button value="grid" aria-label="宫格视图">
                <AppstoreOutlined />
              </Radio.Button>
            </Radio.Group>
          </div>
          <Text type="secondary" className="mv-piglist-list-hint">
            {pigListUnitTasks.length === 0
              ? "暂无可显示猪只任务。"
              : pigListDisplayedTasks.length === pigListUnitTasks.length
                ? `共 ${pigListUnitTasks.length} 头 · 点击卡片登记该猪只接种信息`
                : `匹配 ${pigListDisplayedTasks.length} 头（全部 ${pigListUnitTasks.length} 头）· 点击卡片登记`}
          </Text>
          <div className="mv-pig-stall-groups">
            {pigListUnitTasks.length === 0 ? (
              <Card className="mv-card mv-empty">
                <Text type="secondary">暂无可显示猪只任务。</Text>
              </Card>
            ) : pigListDisplayedTasks.length === 0 ? (
              <Card className="mv-card mv-empty">
                <Text type="secondary">无匹配的猪只，请调整搜索或筛选条件。</Text>
              </Card>
            ) : (
              pigListDisplayedByStall.map((group) => (
                <section key={group.stallNo} className="mv-pig-stall-group">
                  <div className="mv-pig-stall-group__head">
                    <div className="mv-pig-stall-group__head-main">
                      <span className="mv-pig-stall-group__title">栏位 {group.stallNo}</span>
                      <span className="mv-pig-stall-group__count">{group.tasks.length} 头</span>
                    </div>
                    <Checkbox
                      checked={
                        group.tasks.length > 0 && group.tasks.every((x) => pigListSelectedSet.has(x.id))
                      }
                      indeterminate={
                        group.tasks.some((x) => pigListSelectedSet.has(x.id)) &&
                        !group.tasks.every((x) => pigListSelectedSet.has(x.id))
                      }
                      className="mv-pig-stall-group__select-all"
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setPigListSelectedIds((prev) => {
                          const set = new Set(prev);
                          for (const t of group.tasks) {
                            if (checked) set.add(t.id);
                            else set.delete(t.id);
                          }
                          return Array.from(set);
                        });
                      }}
                    />
                  </div>
                  <div
                    className={`mv-list mv-list--piglist${pigListView === "grid" ? " mv-list--piglist-grid" : ""}`}
                  >
                    {pigListView === "list"
                      ? group.tasks.map((t) => {
                          const rowSt = pigRowListStatus(t);
                          return (
                            <div
                              key={t.id}
                              className={`mv-task-card mv-pig-row-card ${t.isRetry ? "mv-task-card--retry" : ""}${pigListSelectedSet.has(t.id) ? " mv-pig-card--selected" : ""}`}
                            >
                              {t.isRetry && <div className="mv-retry-banner">补打 · Is_Retry</div>}
                              <div className="mv-pig-row-main">
                                <div className="mv-pig-row-ear-title">
                                  {t.earTag}
                                  {t.exemptionHit ? (
                                    <ExclamationCircleFilled
                                      className="mv-pig-row-alert-icon"
                                      aria-label="命中豁免规则"
                                    />
                                  ) : null}
                                </div>
                                <div className="mv-pig-row-meta-line">
                                  <span>{pigTypeLabel(t)}</span>
                                  <span className="mv-pig-row-meta-sep">｜</span>
                                  <span className={`mv-pig-row-meta-status mv-pig-status-tone--${rowSt.tone}`}>
                                    {rowSt.label}
                                  </span>
                                  <span className="mv-pig-row-meta-sep">｜</span>
                                  <span>{t.dayAge != null ? `${t.dayAge}日龄` : "—"}</span>
                                </div>
                              </div>
                              <Checkbox
                                checked={pigListSelectedSet.has(t.id)}
                                className="mv-pig-card-select"
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => togglePigSelected(t.id, e.target.checked)}
                              />
                            </div>
                          );
                        })
                      : group.tasks.map((t) => {
                          const rowSt = pigRowListStatus(t);
                          return (
                            <div
                              key={t.id}
                              className={`mv-pig-grid-card ${t.isRetry ? "mv-pig-grid-card--retry" : ""}${pigListSelectedSet.has(t.id) ? " mv-pig-card--selected" : ""}`}
                            >
                              {t.isRetry ? <span className="mv-pig-grid-card__retry">补打</span> : null}
                              <div className="mv-pig-grid-card__ear">
                                {t.earTag}
                                {t.exemptionHit ? (
                                  <ExclamationCircleFilled
                                    className="mv-pig-row-alert-icon"
                                    aria-label="命中豁免规则"
                                  />
                                ) : null}
                              </div>
                              <Tag
                                className={`mv-pig-grid-card__tag mv-pig-status-tone--${rowSt.tone}${rowSt.label.includes("后可接种") ? " mv-pig-grid-card__tag--long" : ""}`}
                                color={rowSt.color}
                              >
                                {rowSt.label}
                              </Tag>
                              <Checkbox
                                checked={pigListSelectedSet.has(t.id)}
                                className="mv-pig-card-select mv-pig-card-select--grid"
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => togglePigSelected(t.id, e.target.checked)}
                              />
                            </div>
                          );
                        })}
                  </div>
                </section>
              ))
            )}
          </div>
          <div className="mv-pig-batchbar">
            <span className="mv-pig-batchbar__count">已选 {pigListSelectedIds.length} 头</span>
            <div className="mv-pig-batchbar__actions">
              <Button
                onClick={() => clearPigSelection()}
                className="mv-pig-batchbar__ghost"
                disabled={pigListSelectedIds.length === 0}
              >
                清空
              </Button>
              <Button
                type="primary"
                disabled={pigListSelectedIds.length === 0}
                onClick={() => {
                  const set = new Set(pigListSelectedIds);
                  const at = dayjs().format("YYYY-MM-DD HH:mm");
                  setPigTasks((prev) =>
                    prev.map((t) =>
                      set.has(t.id)
                        ? {
                            ...t,
                            status: "completed",
                            exceptionPending: false,
                            deferUntil: undefined,
                            actualAt: at,
                            executor: "现场用户（批量）",
                            completionMode: "full",
                            completionSubtype: "normal"
                          }
                        : t
                    )
                  );
                  clearPigSelection();
                  message.success("已完成批量接种");
                }}
              >
                接种
              </Button>
              <Button
                danger
                disabled={pigListSelectedIds.length === 0}
                onClick={() => {
                  Modal.confirm({
                    title: "批量移出确认",
                    content: `确认将已选 ${pigListSelectedIds.length} 头从接种列表移除？`,
                    okText: "确认移出",
                    okButtonProps: { danger: true },
                    getContainer: modalContainer,
                    onOk: () => {
                      removeTasks(pigListSelectedIds);
                      clearPigSelection();
                    }
                  });
                }}
              >
                移出接种列表
              </Button>
            </div>
          </div>
            </>
          ) : (
            <div className="mv-task-detail">
              <div className="mv-section-bar-title">任务详情</div>

              <Card className="mv-card mv-task-detail__card" bordered={false}>
                <div className="mv-task-detail__block-title">总任务进度</div>
                <div className="mv-task-detail__progress-line">
                  <span className="mv-task-detail__progress-value">
                    {unit ? `${unit.done} / ${unit.total}` : "—"}
                  </span>
                  {unit && unit.total > 0 ? (
                    <span className="mv-task-detail__progress-pct">{unitPct}%</span>
                  ) : null}
                </div>
                <div className="mv-unit-progress__track mv-task-detail__track">
                  <div className="mv-unit-progress__fill" style={{ width: `${unitPct}%` }} />
                </div>
                <Text type="secondary" className="mv-task-detail__block-desc">
                  本间本批次应接种头数中，已完成接种或已跳过的数量占比。
                </Text>
              </Card>

              <Card className="mv-card mv-task-detail__card" bordered={false}>
                <div className="mv-task-detail__block-title">任务配置</div>
                <div className="mv-task-detail__config-grid">
                  <div className="mv-task-detail__config-row">
                    <span className="mv-task-detail__config-k">任务ID</span>
                    <span className="mv-task-detail__config-v">{unit?.taskId ?? "—"}</span>
                  </div>
                  <div className="mv-task-detail__config-row">
                    <span className="mv-task-detail__config-k">疫苗</span>
                    <span className="mv-task-detail__config-v">{unit?.vaccineName ?? "—"}</span>
                  </div>
                  <div className="mv-task-detail__config-row">
                    <span className="mv-task-detail__config-k">品牌</span>
                    <span className="mv-task-detail__config-v">{fieldOrDash(unit?.vaccineBrand)}</span>
                  </div>
                  <div className="mv-task-detail__config-row">
                    <span className="mv-task-detail__config-k">剂型</span>
                    <span className="mv-task-detail__config-v">{fieldOrDash(unit?.dosageForm)}</span>
                  </div>
                  <div className="mv-task-detail__config-row">
                    <span className="mv-task-detail__config-k">接种途径</span>
                    <span className="mv-task-detail__config-v">{fieldOrDash(unit?.administrationRoute)}</span>
                  </div>
                  <div className="mv-task-detail__config-row">
                    <span className="mv-task-detail__config-k">剂量</span>
                    <span className="mv-task-detail__config-v">{unit?.dosage ?? "—"}</span>
                  </div>
                  <div className="mv-task-detail__config-row">
                    <span className="mv-task-detail__config-k">剂次</span>
                    <span className="mv-task-detail__config-v">
                      {unit?.doseTimes != null ? `${unit.doseTimes} 次` : "—"}
                    </span>
                  </div>
                  <div className="mv-task-detail__config-row">
                    <span className="mv-task-detail__config-k">间隔</span>
                    <span className="mv-task-detail__config-v">
                      {unit?.intervalLabel?.trim() ? unit.intervalLabel : "—"}
                    </span>
                  </div>
                  <div className="mv-task-detail__config-row">
                    <span className="mv-task-detail__config-k">接种日期</span>
                    <span className="mv-task-detail__config-v">{unit?.schedule ?? "—"}</span>
                  </div>
                  <div className="mv-task-detail__config-row">
                    <span className="mv-task-detail__config-k">目标猪群</span>
                    <span className="mv-task-detail__config-v">{unit?.targetPigGroup ?? "—"}</span>
                  </div>
                  <div className="mv-task-detail__config-row">
                    <span className="mv-task-detail__config-k">覆盖猪只数量</span>
                    <span className="mv-task-detail__config-v">
                      {unit != null ? `${unit.coverCount} 头` : "—"}
                    </span>
                  </div>
                  <div className="mv-task-detail__config-row">
                    <span className="mv-task-detail__config-k">豁免命中数量</span>
                    <span className="mv-task-detail__config-v">
                      {unit != null ? `${unit.exemptionHitCount} 头` : "—"}
                    </span>
                  </div>
                </div>
              </Card>

              <Card className="mv-card mv-task-detail__card" bordered={false}>
                <div className="mv-task-detail__block-title">状态说明</div>
                <div className="mv-task-detail__legend">
                  <div className="mv-task-detail__legend-item">
                    <Tag>待接种</Tag>
                    <Text type="secondary">计划内需要打这针疫苗的猪只，正等您去操作。</Text>
                  </div>
                  <div className="mv-task-detail__legend-item">
                    <Tag color="green">已接种</Tag>
                    <Text type="secondary">已经顺利打完疫苗的猪只。系统已自动记录打针时间。</Text>
                  </div>
                  <div className="mv-task-detail__legend-item">
                    <Tag>已暂缓</Tag>
                    <Text type="secondary">
                      猪只今天状态不好（如生病、服药），暂时不能打。先缓一缓，等身体恢复后系统会再次提醒您补打。
                    </Text>
                  </div>
                  <div className="mv-task-detail__legend-item">
                    <Tag color="orange">已跳过</Tag>
                    <Text type="secondary">
                      因为特殊原因（如即将出栏、已淘汰等）不需要打这针的猪只。跳过之后，本次任务就不会再提醒您给它打了。
                    </Text>
                  </div>
                </div>
                <Text type="secondary" className="mv-task-detail__block-desc">
                  列表中若显示具体时间后「可接种」，表示已延期接种，到达该时间后可继续登记。
                </Text>
              </Card>
            </div>
          )}
        </div>
        </div>
        {pigListRoomTab === "vaccine" ? (
          <div className="mv-task-detail-bottom-bar">
            <Button
              type="primary"
              size="large"
              block
              className="mv-task-detail-bottom-bar__btn"
              onClick={() => {
                setEndTaskConfirmChecked(false);
                setEndTaskModalOpen(true);
              }}
            >
              结束任务
            </Button>
          </div>
        ) : null}
        <Modal
          title="结束任务"
          open={endTaskModalOpen}
          getContainer={modalContainer}
          width={420}
          okText="结束任务"
          cancelText="取消"
          okButtonProps={{ disabled: !roomTaskStatusSummary.allDone || !endTaskConfirmChecked }}
          onCancel={() => setEndTaskModalOpen(false)}
          onOk={() => {
            if (!roomTaskStatusSummary.allDone) {
              message.warning("当前仍有未完成猪只，任务不可结束。");
              return Promise.reject();
            }
            if (!endTaskConfirmChecked) {
              message.warning("请先勾选确认后再结束任务。");
              return Promise.reject();
            }
            appendLog({
              pigTaskId: `room-${pigListRoomId}-batch-${pigListBatchId}`,
              at: dayjs().format("YYYY-MM-DD HH:mm"),
              actor: "现场用户",
              type: "room_batch_closed",
              summary: `结束任务：房间 ${pigListRoomId} · 批次 ${pigListBatchId} · 已完成 ${roomTaskStatusSummary.done}/${roomTaskStatusSummary.total}`
            });
            setEndTaskModalOpen(false);
            message.success("任务已结束");
            setScreen("hub");
            setPigListBatchId(null);
            setPigListRoomId(null);
            return Promise.resolve();
          }}
        >
          <Card className="mv-task-end-modal-card" bordered={false}>
            <div className="mv-task-end-modal-card__title">任务目标</div>
            <div className="mv-task-end-modal-card__row">
              <span>已完成（已接种+已跳过）</span>
              <strong>
                {roomTaskStatusSummary.done} / {roomTaskStatusSummary.total} 头
              </strong>
            </div>
            <div className="mv-task-end-modal-card__row is-sub">
              <span>未完成（保留在任务中）</span>
              <strong>{roomTaskStatusSummary.unfinished} 头</strong>
            </div>
          </Card>

          <div className="mv-task-end-modal-section-title">执行详情</div>
          <Card className="mv-task-end-modal-card" bordered={false}>
            <div className="mv-task-end-modal-card__row">
              <span>已接种</span>
              <strong>{roomTaskStatusSummary.completed} 头</strong>
            </div>
            <div className="mv-task-end-modal-card__row">
              <span>已跳过</span>
              <strong>{roomTaskStatusSummary.skipped} 头</strong>
            </div>
            <div className="mv-task-end-modal-card__row">
              <span>已暂缓</span>
              <strong>{roomTaskStatusSummary.suspended} 头</strong>
            </div>
            <div className="mv-task-end-modal-card__row">
              <span>执行中</span>
              <strong>{roomTaskStatusSummary.inProgress} 头</strong>
            </div>
            <div className="mv-task-end-modal-card__row">
              <span>待接种</span>
              <strong>{roomTaskStatusSummary.pending} 头</strong>
            </div>
            <div className="mv-task-end-modal-card__row is-sub">
              <span>其中延期接种</span>
              <strong>{roomTaskStatusSummary.deferred} 头</strong>
            </div>
          </Card>

          <Text
            type={roomTaskStatusSummary.allDone ? "secondary" : "danger"}
            className="mv-task-end-modal-rule"
          >
            规则：仅当全部猪只处于「已接种 / 已跳过」时可结束任务，其余状态将继续保留在任务中。
          </Text>
          <Checkbox
            checked={endTaskConfirmChecked}
            onChange={(e) => setEndTaskConfirmChecked(e.target.checked)}
          >
            我已知晓，确认结束任务
          </Checkbox>
        </Modal>
        {pigDrawerOpen && active ? (
          <PigSlotDrawer
            open={pigDrawerOpen}
            onClose={closePigDrawer}
            phase={pigDrawerPhase}
            setPhase={setPigDrawerPhase}
            task={active}
            executeForced={executeForced}
            setExecuteForced={setExecuteForced}
            appendLog={appendLog}
            removeTask={removeTask}
            updateTask={updateTask}
            modalContainer={modalContainer}
          />
        ) : null}
      </>
    );
  }

  if (screen === "weaning") {
    return (
      <MobileWeaningCheckFlow
        title={weaningFlowTitle}
        roomLabel={weaningFlowRoomLabel}
        onBack={() => {
          setScreen("hub");
          setWeaningFlowTitle("断奶检查");
          setWeaningFlowRoomLabel("分娩舍 B1 间");
        }}
      />
    );
  }

  return null;
}

function ExecuteScreen({
  task,
  completionSubtype,
  onBack,
  onSubmit,
  embedded
}: {
  task: MobilePigTask;
  completionSubtype: "normal" | "forced";
  onBack: () => void;
  embedded?: boolean;
  onSubmit: (v: {
    doseGiven: number;
    remark?: string;
    completionSubtype: "normal" | "forced";
  }) => void;
}) {
  const [form] = Form.useForm();

  return (
    <div className={embedded ? "mv-pig-drawer-embed-exec" : "mv-root"}>
      <div className="mv-nav">
        <Button type="link" onClick={onBack}>
          {embedded ? "← 返回" : "← 返回详情"}
        </Button>
      </div>
      <Title level={5}>
        接种记录 · 猪只 {task.earTag}（栏位 {task.stallNo}）
        {completionSubtype === "forced" && (
          <Tag color="orange" style={{ marginLeft: 8 }}>
            强制接种
          </Tag>
        )}
      </Title>
      <Form
        key={completionSubtype}
        layout="vertical"
        form={form}
        className="mv-form"
        initialValues={{
          doseGiven: 1,
          remark: ""
        }}
        onFinish={(values) => onSubmit({ ...values, completionSubtype })}
      >
        <Form.Item name="doseGiven" label="剂量" rules={[{ required: true }]}>
          <InputNumber
            min={0}
            style={{ width: "100%" }}
            addonAfter={normalizeDosageUnitForInput(task.dosageUnit)}
          />
        </Form.Item>
        <Form.Item name="remark" label="备注">
          <Input.TextArea rows={3} placeholder="选填" />
        </Form.Item>
        <Button type="primary" htmlType="submit" block size="large">
          提交记录
        </Button>
      </Form>
    </div>
  );
}
