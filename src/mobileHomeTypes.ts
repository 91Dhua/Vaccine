export type MobileHomeTaskKind = "vaccination" | "production" | "transfer";

/** 首页任务卡片（接种由猪只任务聚合生成，其它为演示数据） */
export type MobileHomeTaskCard = {
  id: string;
  kind: MobileHomeTaskKind;
  title: string;
  subtitle: string;
  /** 任务已下发到 Mobile 的天数（用于首页角标） */
  dispatchedDays?: number;
  /** 接种批次 id，用于进猪只列表与抽屉选间 */
  batchId?: string;
  /** 车间下接种卡片：各房间待处理头数 */
  roomPending?: { roomId: string; roomLabel: string; pending: number; total: number }[];
};
