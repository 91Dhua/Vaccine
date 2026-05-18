import type { MobileHomeTaskCard } from "./mobileHomeTypes";
import {
  filterTasksByLocation,
  isSupersededOriginal,
  resolveDosageLabel,
  type MobilePigTask
} from "./mobileVaccinationUtils";
import { WORKSHOPS, roomLabelById } from "./mobileWorkshops";
import dayjs from "dayjs";

function countPending(ts: MobilePigTask[]): number {
  return ts.filter(
    (x) => x.status !== "completed" && x.status !== "skipped" && x.status !== "suspended"
  ).length;
}

/** 首页接种卡副标题：疫苗种类 + 品牌、接种方式、剂量（中间用 · 分隔） */
function formatVaccinationCardSubtitle(t: MobilePigTask): string {
  const name = t.vaccineName.trim() || "—";
  const extras: string[] = [];
  const brand = t.vaccineBrand?.trim();
  if (brand) extras.push(brand);
  const route = t.administrationRoute?.trim();
  if (route) extras.push(route);
  const dose = resolveDosageLabel(t);
  if (dose && dose !== "—") extras.push(dose);
  return extras.length ? `${name} · ${extras.join(" · ")}` : name;
}

function resolveDispatchedDays(rows: MobilePigTask[]): number | undefined {
  const parsed = rows
    .map((x) => x.dispatchedAt?.trim())
    .filter((x): x is string => !!x)
    .map((x) => dayjs(x))
    .filter((d) => d.isValid());
  if (!parsed.length) return undefined;
  let earliest = parsed[0];
  for (const d of parsed.slice(1)) {
    if (d.isBefore(earliest)) earliest = d;
  }
  return Math.max(0, dayjs().startOf("day").diff(earliest.startOf("day"), "day"));
}

/** 由猪只任务聚合首页「接种」任务卡片（车间下含各房间待处理分布） */
export function buildVaccinationHomeCards(
  allTasks: MobilePigTask[],
  scope: "workshop" | "room",
  workshopId: string,
  roomId: string | null
): MobileHomeTaskCard[] {
  const visible = filterTasksByLocation(allTasks, scope, workshopId, roomId);
  const workshopRooms = WORKSHOPS.find((w) => w.id === workshopId)?.roomIds ?? [];

  const byBatch = new Map<string, MobilePigTask[]>();
  for (const t of visible) {
    if (isSupersededOriginal(t, allTasks)) continue;
    if (!byBatch.has(t.batchId)) byBatch.set(t.batchId, []);
    byBatch.get(t.batchId)!.push(t);
  }

  const cards: MobileHomeTaskCard[] = [];
  for (const [, rows] of byBatch) {
    const first = rows[0];
    const batchId = first.batchId;
    const pRows = countPending(rows);
    const subtitle = formatVaccinationCardSubtitle(first);
    const dispatchedDays = resolveDispatchedDays(rows);

    if (scope === "room" && roomId) {
      cards.push({
        id: `vac-${batchId}`,
        kind: "vaccination",
        title: "接种任务",
        subtitle,
        dispatchedDays,
        batchId,
        roomPending: [
          {
            roomId,
            roomLabel: first.roomLabel,
            pending: pRows,
            total: rows.length
          }
        ]
      });
    } else {
      const roomPending = workshopRooms
        .map((rid) => {
          const roomRows = allTasks.filter(
            (t) =>
              t.batchId === batchId &&
              t.roomId === rid &&
              !isSupersededOriginal(t, allTasks)
          );
          return {
            roomId: rid,
            roomLabel: roomLabelById(rid),
            pending: countPending(roomRows),
            total: roomRows.length
          };
        })
        .filter((x) => x.total > 0);

      cards.push({
        id: `vac-${batchId}`,
        kind: "vaccination",
        title: "接种任务",
        subtitle,
        dispatchedDays,
        batchId,
        roomPending
      });
    }
  }
  return cards;
}
