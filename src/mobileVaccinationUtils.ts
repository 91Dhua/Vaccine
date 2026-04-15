import type { TaskRow } from "./components/VaccineTaskListPage";
import { vaccineCatalog } from "./mockData";
import { getPigMobileMeta, type PigMobileMeta } from "./pigMeta";

const ADMIN_ROUTE_LABELS: Record<string, string> = {
  IM: "肌内注射",
  SC: "皮下注射",
  滴鼻: "滴鼻",
  饮水: "饮水",
  喷雾: "喷雾"
};

/** 将目录中的途径代码转为中文展示，多项用顿号连接 */
export function formatAdministrationRoutes(routes?: readonly string[] | null): string | undefined {
  if (!routes?.length) return undefined;
  const parts = routes.map((r) => ADMIN_ROUTE_LABELS[r] ?? r);
  return parts.join("、");
}

/** 按疫苗中文名 + 品牌中文名从疫苗目录解析剂型与接种途径（用于下发任务行） */
export function resolveTaskVaccinePresentation(
  vaccineName: string,
  brandName: string
): { dosageForm?: string; administrationRoute?: string } {
  const v = vaccineName.trim();
  const b = brandName.trim();
  if (!v || !b || b === "-") return {};
  const cat = vaccineCatalog.find((c) => c.nameCn === v);
  if (!cat) return {};
  const brand = cat.brands.find((x) => x.brandNameCn === b);
  if (!brand) return {};
  return {
    dosageForm: brand.dosageForm,
    administrationRoute: formatAdministrationRoutes(brand.administrationRoutes)
  };
}

export type MobilePigTaskStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "skipped"
  /** 已暂缓：原计划行冻结，补打由 Is_Retry 克隆体承接 */
  | "suspended";

export type CompletionSubtype = "normal" | "forced";

/**
 * 豁免命中时展示「命中了哪条规则」：优先档案下发的规则文案，其次生理阶段，最后兜底。
 * 支持去掉前缀「豁免规则命中：」；将旧版「生理阶段标记：X」规范为可读长句。
 */
export function exemptionHitRuleDisplay(t: MobilePigTask): string {
  if (!t.exemptionHit) return "";
  const raw = (t.exemptionTagLabel ?? "").trim();
  const legacyPhase = raw.match(/^生理阶段标记[：:]\s*(.+)$/);
  if (legacyPhase) {
    return `猪只生理阶段为「${legacyPhase[1].trim()}」，已命中接种豁免规则。`;
  }
  const stripped = raw.replace(/^豁免规则命中[：:]\s*/i, "").trim();
  if (stripped) return stripped;
  const phase = t.physiologicalPhase?.trim();
  if (phase) return `猪只生理阶段为「${phase}」，已命中接种豁免规则。`;
  return "已命中接种豁免规则，具体条件以场区规则与档案为准。";
}

export type MobilePigTask = {
  id: string;
  batchId: string;
  pigId: string;
  /** Console 疫苗任务编号（与 TaskRow.id 一致） */
  taskId: string;
  vaccineName: string;
  /** 疫苗品牌（来自任务行 brand） */
  vaccineBrand?: string;
  /** 剂型 */
  dosageForm?: string;
  /** 接种途径（已格式化为展示文案） */
  administrationRoute?: string;
  /** 剂量全文，如「2 毫克」（来自任务行的 dosage） */
  dosage: string;
  dosageUnit: string;
  targetPigGroup: string;
  coverCount: number;
  exemptionHitCount: number;
  schedule: string;
  /** 与创建页「剂次」一致 */
  doseTimes?: number;
  /** 多次接种间隔展示，如「2 天」 */
  intervalLabel?: string;
  /** 品牌配置的免疫间隔期（天） */
  immuneIntervalDays?: number;
  /** 上次接种疫苗名 */
  lastVaccinatedVaccineName?: string;
  /** 上次接种日期（YYYY-MM-DD） */
  lastVaccinatedAt?: string;
  /** 日龄（天） */
  dayAge?: number;
  /** 任务下发到 Mobile 的时间（用于首页「已下发：X天」角标） */
  dispatchedAt?: string;
  status: MobilePigTaskStatus;
  /** 规则命中：需在任务内处理（跳过 / 暂缓补打 / 仍接种等） */
  exemptionHit: boolean;
  exceptionPending: boolean;
  deferUntil?: string;
  exemptionReason?: string;
  actualAt?: string;
  executor?: string;
  doseGiven?: string;
  batchNo?: string;
  remark?: string;
  completionMode?: "full" | "partial";
  completionSubtype?: CompletionSubtype;
  workshopId: string;
  workshopLabel: string;
  roomId: string;
  roomLabel: string;
  stallNo: string;
  /** 猪只号 / 耳标展示 */
  earTag: string;
  /** 耳缺号（可选） */
  earNotch?: string;
  /** Console 豁免规则标签（弱提示 Banner） */
  exemptionTagLabel?: string;
  /** 生理阶段 · 强确认「XX期」 */
  physiologicalPhase?: string;
  /** 补打任务：原计划克隆体，Is_Retry */
  isRetry: boolean;
  /** 指向被暂缓的原始猪只任务 id */
  retryOfPigTaskId?: string;
};

/** 剂量/单位是否为占位（空、-、—） */
function isDosePlaceholder(s: string): boolean {
  const t = s.trim();
  return !t || /^[-—]+$/.test(t);
}

/**
 * 由任务行的 dosage + dosageUnit 拼出展示文案，如「2 毫克」「1.5 毫升」。
 * 支持 dosage 已为「2 毫克」合写、或仅为数字时自动拼单位。
 */
export function buildDosageLineFromTaskRow(row: Pick<TaskRow, "dosage" | "dosageUnit">): string {
  const raw = String(row.dosage ?? "").trim();
  const unit = String(row.dosageUnit ?? "").trim();
  const d = isDosePlaceholder(raw) ? "" : raw;
  const u = isDosePlaceholder(unit) ? "" : unit;

  if (!d && !u) return "—";

  if (d && !/^\d+(\.\d+)?$/.test(d)) {
    return d;
  }

  if (d && u) return `${d} ${u}`;
  if (d) return d;
  return u || "—";
}

/** 现场任务上展示剂量（兼容历史脏数据：仅 -、缺单位等） */
export function resolveDosageLabel(t: Pick<MobilePigTask, "dosage" | "dosageUnit">): string {
  return buildDosageLineFromTaskRow({
    dosage: t.dosage,
    dosageUnit: t.dosageUnit
  });
}

/** 表单侧剂量单位：避免展示为「-」 */
export function normalizeDosageUnitForInput(unit: string): string {
  const u = String(unit ?? "").trim();
  return isDosePlaceholder(u) ? "毫克" : u;
}

export type MobileExecutionLog = {
  id: string;
  pigTaskId: string;
  at: string;
  actor: string;
  type:
    | "started"
    | "completed"
    | "skipped"
    | "deferred"
    | "exception_resolved"
    | "still_vaccinate"
    | "suspended_retry"
    | "room_batch_closed"
    | "forced_complete_prompt";
  summary: string;
  payload?: Record<string, unknown>;
};

function applyPigMeta(
  pigId: string,
  exemptionHit: boolean,
  meta?: PigMobileMeta
): Pick<
  MobilePigTask,
  | "workshopId"
  | "workshopLabel"
  | "roomId"
  | "roomLabel"
  | "stallNo"
  | "earTag"
  | "earNotch"
  | "exemptionTagLabel"
  | "physiologicalPhase"
  | "lastVaccinatedVaccineName"
  | "lastVaccinatedAt"
  | "dayAge"
> {
  const m = meta ?? getPigMobileMeta(pigId);
  const tag =
    exemptionHit && (m.exemptionTagLabel || m.physiologicalPhase)
      ? m.exemptionTagLabel ?? `生理阶段标记：${m.physiologicalPhase ?? "待确认"}`
      : undefined;
  const earNotch = m.earNotch?.trim() || undefined;
  return {
    workshopId: m.workshopId,
    workshopLabel: m.workshopLabel,
    roomId: m.roomId,
    roomLabel: m.roomLabel,
    stallNo: m.stallNo,
    earTag: m.earTag,
    earNotch,
    exemptionTagLabel: tag,
    physiologicalPhase: m.physiologicalPhase,
    lastVaccinatedVaccineName: m.lastVaccinatedVaccineName,
    lastVaccinatedAt: m.lastVaccinatedAt,
    dayAge: m.dayAge
  };
}

export function buildMobilePigTasksFromBatch(
  row: TaskRow,
  pigIds: string[],
  exemptionHitCount?: number,
  metaMap?: Record<string, PigMobileMeta>
): MobilePigTask[] {
  const coverCount = pigIds.length;
  const hits =
    exemptionHitCount ??
    row.exemptionHitCount ??
    (coverCount === 0 ? 0 : Math.min(coverCount, Math.max(1, Math.ceil(coverCount * 0.1))));
  const hitIds = new Set(pigIds.slice(0, hits));
  const rowUnit = String(row.dosageUnit ?? "").trim();
  const dosageUnit = isDosePlaceholder(rowUnit) ? "毫克" : rowUnit;
  const dosage = buildDosageLineFromTaskRow(row);
  const targetPigGroup = row.targetPigGroupLabel?.trim() || "按任务选猪";

  return pigIds.map((pigId) => {
    const exemptionHit = hitIds.has(pigId);
    const meta = metaMap?.[pigId];
    const brandStr = String(row.brand ?? "").trim();
    const intervalLabel =
      row.intervalValue != null && row.intervalUnit
        ? `${row.intervalValue} ${row.intervalUnit}`
        : undefined;
    return {
      id: `${row.id}__${pigId}`,
      batchId: row.id,
      pigId,
      taskId: row.id,
      vaccineName: row.vaccine,
      vaccineBrand: brandStr && brandStr !== "-" ? brandStr : undefined,
      dosageForm: row.dosageForm?.trim() || undefined,
      administrationRoute: row.administrationRoute?.trim() || undefined,
      dosage,
      dosageUnit,
      targetPigGroup,
      coverCount,
      exemptionHitCount: hits,
      schedule: row.schedule,
      doseTimes: row.doseTimes,
      intervalLabel,
      immuneIntervalDays: row.immuneIntervalDays,
      dispatchedAt: row.createdAt,
      status: "pending",
      exemptionHit,
      exceptionPending: exemptionHit,
      isRetry: false,
      ...applyPigMeta(pigId, exemptionHit, meta)
    };
  });
}

/** 暂缓并产生补打克隆（Is_Retry=true） */
export function spawnRetryTask(original: MobilePigTask): MobilePigTask {
  const suffix = `retry-${Date.now()}`;
  return {
    ...original,
    id: `${original.batchId}__${original.pigId}__${suffix}`,
    isRetry: true,
    retryOfPigTaskId: original.id,
    status: "pending",
    exceptionPending: original.exemptionHit,
    deferUntil: undefined,
    completionSubtype: undefined,
    completionMode: undefined,
    actualAt: undefined,
    executor: undefined,
    doseGiven: undefined,
    batchNo: undefined,
    remark: undefined,
    exemptionReason: undefined
  };
}

export function hasPendingRetryForOriginal(
  tasks: MobilePigTask[],
  originalId: string
): boolean {
  return tasks.some(
    (t) =>
      t.retryOfPigTaskId === originalId &&
      t.isRetry &&
      t.status !== "completed" &&
      t.status !== "skipped" &&
      t.status !== "suspended"
  );
}

export function isSupersededOriginal(t: MobilePigTask, all: MobilePigTask[]): boolean {
  return t.status === "suspended" && hasPendingRetryForOriginal(all, t.id);
}

export function filterTasksByLocation(
  tasks: MobilePigTask[],
  scope: "workshop" | "room",
  workshopId: string,
  roomId?: string | null
): MobilePigTask[] {
  if (scope === "workshop") return tasks.filter((t) => t.workshopId === workshopId);
  if (!roomId) return [];
  return tasks.filter((t) => t.roomId === roomId);
}

export function seedMobileTasksFromConsole(tasks: TaskRow[]): MobilePigTask[] {
  return tasks
    .filter((t) => t.pigIds && t.pigIds.length > 0)
    .flatMap((t) => buildMobilePigTasksFromBatch(t, t.pigIds!, t.exemptionHitCount));
}
