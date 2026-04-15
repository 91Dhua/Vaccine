/** 车间 — 房间层级（与现场首页选址一致） */
export type WorkshopDef = {
  id: string;
  label: string;
  roomIds: string[];
};

export const WORKSHOPS: WorkshopDef[] = [
  { id: "ws-1", label: "配怀舍 · 一车间", roomIds: ["r-a1", "r-a2"] },
  /** 「 · 」前为首页/抽屉中的高层级车间名（如母猪车间） */
  { id: "ws-2", label: "母猪车间 · 分娩舍", roomIds: ["r-b1"] }
];

export function workshopForRoom(roomId: string): WorkshopDef | undefined {
  return WORKSHOPS.find((w) => w.roomIds.includes(roomId));
}

export function allRoomOptions(): { roomId: string; roomLabel: string; workshopId: string; workshopLabel: string }[] {
  const out: { roomId: string; roomLabel: string; workshopId: string; workshopLabel: string }[] = [];
  for (const w of WORKSHOPS) {
    for (const rid of w.roomIds) {
      out.push({
        roomId: rid,
        roomLabel: roomLabelById(rid),
        workshopId: w.id,
        workshopLabel: w.label
      });
    }
  }
  return out;
}

/** 与 pigMeta 中 roomId 对齐的展示名 */
export function roomLabelById(roomId: string): string {
  const map: Record<string, string> = {
    "r-a1": "配怀舍 A1 间",
    "r-a2": "配怀舍 A2 间",
    "r-b1": "分娩舍 B1 间"
  };
  return map[roomId] ?? roomId;
}
