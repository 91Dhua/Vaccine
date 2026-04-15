import type { MobileHomeTaskKind } from "./mobileHomeTypes";
import { workshopForRoom } from "./mobileWorkshops";

/** 首页非接种类任务演示（生产 / 转舍等），按车间或房间过滤 */
export type FixtureHomeTask = {
  id: string;
  kind: Exclude<MobileHomeTaskKind, "vaccination">;
  title: string;
  subtitle: string;
  /** 出现在哪些车间 */
  workshopIds: string[];
  /** 若限定房间则仅在该房间选址时出现；省略表示该车间的所有房间都显示 */
  roomIds?: string[];
};

export const MOBILE_HOME_FIXTURE_TASKS: FixtureHomeTask[] = [
  {
    id: "fx-prod-1",
    kind: "production",
    title: "生产任务 · 单元巡检",
    subtitle: "采食量录入 · 今日 2 条待处理",
    workshopIds: ["ws-1", "ws-2"]
  },
  {
    id: "fx-prod-2",
    kind: "production",
    title: "生产任务 · 母猪体况评分",
    subtitle: "配怀线 · 本周批次",
    workshopIds: ["ws-1"]
  },
  {
    id: "fx-xfer-1",
    kind: "transfer",
    title: "转舍任务 · 仔猪调出",
    subtitle: "目标：保育舍 · 待确认头数",
    workshopIds: ["ws-2"],
    roomIds: ["r-b1"]
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
