import type { MobileHomeTaskKind } from "./mobileHomeTypes";
import { workshopForRoom } from "./mobileWorkshops";

/** 首页非接种类任务演示（生产 / 转舍等），按车间或房间过滤 */
export type FixtureHomeTask = {
  id: string;
  kind: Exclude<MobileHomeTaskKind, "vaccination">;
  taskType?: "postpartum-check" | "weaning-check" | "transfer";
  title: string;
  subtitle: string;
  statusLabel?: string;
  progressLabel?: string;
  progressDone?: number;
  progressTotal?: number;
  actionText?: string;
  /** 出现在哪些车间 */
  workshopIds: string[];
  /** 若限定房间则仅在该房间选址时出现；省略表示该车间的所有房间都显示 */
  roomIds?: string[];
};

export const MOBILE_HOME_FIXTURE_TASKS: FixtureHomeTask[] = [
  {
    id: "fx-weaning-check-1",
    kind: "production",
    taskType: "weaning-check",
    title: "断奶检查",
    subtitle: "生产线1 ｜ 批次25",
    statusLabel: "第 2/3 天",
    progressLabel: "已检查 / 需检查",
    progressDone: 100,
    progressTotal: 200,
    workshopIds: ["ws-1", "ws-2"]
  },
  {
    id: "fx-weaning-check-2",
    kind: "production",
    taskType: "weaning-check",
    title: "断奶检查",
    subtitle: "生产线1 ｜ 批次26",
    statusLabel: "第 1/3 天",
    progressLabel: "已检查 / 需检查",
    progressDone: 40,
    progressTotal: 200,
    workshopIds: ["ws-1", "ws-2"]
  },
  {
    id: "fx-weaning-check-3",
    kind: "production",
    taskType: "weaning-check",
    title: "断奶检查",
    subtitle: "生产线2 ｜ 批次12",
    statusLabel: "已完成",
    progressLabel: "已检查 / 需检查",
    progressDone: 180,
    progressTotal: 180,
    workshopIds: ["ws-2"]
  }
];

export function filterFixtureTasks(
  fixtures: FixtureHomeTask[],
  params: { scope: "workshop" | "room"; workshopId: string; roomId?: string | null }
): FixtureHomeTask[] {
  return fixtures.filter((f) => {
    if (!f.workshopIds.includes(params.workshopId)) return false;
    if (params.scope === "room" && params.roomId) {
      if (f.roomIds && f.roomIds.length > 0 && !f.roomIds.includes(params.roomId)) return false;
      return true;
    }
    if (f.roomIds && f.roomIds.length > 0) {
      const touchesWorkshop = f.roomIds.some(
        (rid) => workshopForRoom(rid)?.id === params.workshopId
      );
      if (!touchesWorkshop) return false;
    }
    return true;
  });
}
