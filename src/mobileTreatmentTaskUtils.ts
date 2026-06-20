export type TreatmentPigStatus = "pending" | "done" | "skipped" | "removed";

export type MobileTreatmentPig = {
  id: string;
  label: string;
  stall: string;
};

export type MobileTreatmentDose = {
  id: string;
  index: number;
  plannedAt: string;
  shift: string;
  pigStatus: Record<string, TreatmentPigStatus>;
};

export type MobileTreatmentTask = {
  id: string;
  prescriptionId: string;
  status: "执行中" | "已完成" | "已终止";
  roomId: string;
  roomLabel: string;
  drugName: string;
  drugSpec: string;
  treatmentMethod: string;
  dosage: string;
  doseTimes: number;
  intervalHours: number;
  targetDisease: string[];
  targetSymptoms: string[];
  creator: string;
  createdAt: string;
  remark: string;
  pigs: MobileTreatmentPig[];
  doses: MobileTreatmentDose[];
};

export type TreatmentHomeCardInfo = {
  title: "治疗任务";
  subtitle: string;
  drugName: string;
  pendingDoseIndex: number;
  pendingDoseLabel: string;
  doneHeads: number;
  pendingHeads: number;
  totalHeads: number;
};

const basePigIds = Array.from({ length: 20 }).map((_, index) =>
  index < 2 ? `pig-noear-${index + 1}` : `pig-${String(index - 1).padStart(6, "0")}`
);

function buildDose(index: number, plannedAt: string, shift: string, status: TreatmentPigStatus): MobileTreatmentDose {
  return {
    id: `dose-${index + 1}`,
    index,
    plannedAt,
    shift,
    pigStatus: Object.fromEntries(basePigIds.map((id) => [id, status]))
  };
}

export const mockTreatmentTask: MobileTreatmentTask = {
  id: "treat-rx-25g009",
  prescriptionId: "RX-25G009",
  status: "执行中",
  roomId: "r-a1",
  roomLabel: "配怀 1 舍",
  drugName: "阿莫西林",
  drugSpec: "云南白药（粉剂）",
  treatmentMethod: "饲料混合",
  dosage: "300 mg",
  doseTimes: 3,
  intervalHours: 24,
  targetDisease: ["感冒", "发烧", "蓝耳PRRS"],
  targetSymptoms: ["流涕", "持续高烧", "食欲不振", "Loss of Appetite"],
  creator: "顾大华",
  createdAt: "2025/03/31 12:09",
  remark:
    "重点观察采食情况与精神状态；若连续两次治疗后仍高热，请联系兽医复核处方。",
  pigs: basePigIds.map((id, index) => ({
    id,
    label: index < 2 ? "无耳号" : String(index - 1).padStart(6, "0"),
    stall: index < 4 ? "A1" : index < 8 ? "A2" : `配怀 ${Math.floor(index / 4) + 1} 舍`
  })),
  doses: [
    buildDose(0, "12-23 08:00", "大华", "pending"),
    buildDose(1, "距离第2剂次：23时59分", "", "pending"),
    buildDose(2, "待第2剂次完成后生成", "", "pending")
  ]
};

function activePigIds(task: MobileTreatmentTask): string[] {
  return task.pigs.map((pig) => pig.id);
}

export function resolveCurrentTreatmentDoseIndex(task: MobileTreatmentTask): number {
  const pigs = activePigIds(task);
  const index = task.doses.findIndex((dose) =>
    pigs.some((pigId) => {
      const status = dose.pigStatus[pigId] ?? "pending";
      return status === "pending";
    })
  );
  return index >= 0 ? index : Math.max(0, task.doses.length - 1);
}

export function treatmentDoseStats(task: MobileTreatmentTask, doseIndex = resolveCurrentTreatmentDoseIndex(task)) {
  const dose = task.doses[doseIndex] ?? task.doses[0];
  const pigs = activePigIds(task);
  const doneHeads = pigs.filter((pigId) => dose.pigStatus[pigId] === "done").length;
  const skippedHeads = pigs.filter((pigId) => dose.pigStatus[pigId] === "skipped").length;
  const removedHeads = pigs.filter((pigId) => dose.pigStatus[pigId] === "removed").length;
  const pendingHeads = Math.max(0, pigs.length - doneHeads - skippedHeads - removedHeads);
  return {
    doneHeads,
    skippedHeads,
    removedHeads,
    pendingHeads,
    totalHeads: pigs.length
  };
}

export function buildTreatmentHomeCard(task: MobileTreatmentTask): TreatmentHomeCardInfo {
  const pendingDoseIndex = resolveCurrentTreatmentDoseIndex(task);
  const stats = treatmentDoseStats(task, pendingDoseIndex);
  return {
    title: "治疗任务",
    subtitle: `${task.treatmentMethod} · ${task.drugName}`,
    drugName: `${task.drugName}（${task.drugSpec.replace(/[（）]/g, "")}）`,
    pendingDoseIndex,
    pendingDoseLabel: `${pendingDoseIndex + 1}/${task.doseTimes} 剂次`,
    doneHeads: stats.doneHeads,
    pendingHeads: stats.pendingHeads,
    totalHeads: stats.totalHeads
  };
}

function updateDoseStatuses(
  task: MobileTreatmentTask,
  doseIndex: number,
  pigIds: string[],
  status: TreatmentPigStatus
): MobileTreatmentTask {
  const selected = new Set(pigIds);
  return {
    ...task,
    doses: task.doses.map((dose, index) =>
      index === doseIndex
        ? {
            ...dose,
            pigStatus: Object.fromEntries(
              Object.entries(dose.pigStatus).map(([pigId, prev]) => [
                pigId,
                selected.has(pigId) ? status : prev
              ])
            )
          }
        : dose
    )
  };
}

export function executeTreatmentDose(task: MobileTreatmentTask, doseIndex: number, pigIds: string[]) {
  return updateDoseStatuses(task, doseIndex, pigIds, "done");
}

export function skipTreatmentDose(task: MobileTreatmentTask, doseIndex: number, pigIds: string[]) {
  return updateDoseStatuses(task, doseIndex, pigIds, "skipped");
}

export function removePigsFromTreatment(task: MobileTreatmentTask, doseIndex: number, pigIds: string[]) {
  return updateDoseStatuses(task, doseIndex, pigIds, "removed");
}

export function addPigsToTreatment(task: MobileTreatmentTask, pigs: MobileTreatmentPig[]) {
  const existing = new Set(task.pigs.map((pig) => pig.id));
  const incoming = pigs.filter((pig) => !existing.has(pig.id));
  if (!incoming.length) return task;
  return {
    ...task,
    pigs: [...task.pigs, ...incoming],
    doses: task.doses.map((dose) => ({
      ...dose,
      pigStatus: {
        ...dose.pigStatus,
        ...Object.fromEntries(incoming.map((pig) => [pig.id, "pending" as TreatmentPigStatus]))
      }
    }))
  };
}

export function terminateTreatmentTask(task: MobileTreatmentTask): MobileTreatmentTask {
  return {
    ...task,
    status: "已终止"
  };
}

