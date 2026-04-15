/** Demo：车间 / 房间 / 栏位 / 耳标（Console 下发可对齐） */
export type PigMobileMeta = {
  workshopId: string;
  workshopLabel: string;
  roomId: string;
  roomLabel: string;
  /** 栏位号 */
  stallNo: string;
  /** 猪只号（耳标等业务号） */
  earTag: string;
  /** 耳缺号（可选，用于搜索） */
  earNotch?: string;
  /** 豁免规则命中后的展示文案（弱提示 Banner） */
  exemptionTagLabel?: string;
  /** 生理阶段，用于强制接种强确认「XX期」 */
  physiologicalPhase?: string;
  /** 上次接种疫苗名 */
  lastVaccinatedVaccineName?: string;
  /** 上次接种时间（YYYY-MM-DD） */
  lastVaccinatedAt?: string;
  /** 日龄（天） */
  dayAge?: number;
};

export const MOCK_PIG_MOBILE_META: Record<string, PigMobileMeta> = {
  "pig-1000": {
    workshopId: "ws-1",
    workshopLabel: "配怀舍 · 一车间",
    roomId: "r-a1",
    roomLabel: "配怀舍 A1 间",
    stallNo: "A1",
    earTag: "100000",
    earNotch: "缺-03",
    exemptionTagLabel:
      "猪只健康状态异常：发烧，发热。猪只处于预计发情任务开始前2-3天",
    physiologicalPhase: "泌乳期",
    lastVaccinatedVaccineName: "非瘟灭活疫苗",
    lastVaccinatedAt: "2026-02-04",
    dayAge: 469
  },
  "pig-1001": {
    workshopId: "ws-1",
    workshopLabel: "配怀舍 · 一车间",
    roomId: "r-a1",
    roomLabel: "配怀舍 A1 间",
    stallNo: "A1",
    earTag: "100001",
    earNotch: "缺-07",
    physiologicalPhase: "空怀期",
    lastVaccinatedVaccineName: "蓝耳二联疫苗",
    lastVaccinatedAt: "2026-02-06",
    dayAge: 475
  },
  "pig-1002": {
    workshopId: "ws-1",
    workshopLabel: "配怀舍 · 一车间",
    roomId: "r-a1",
    roomLabel: "配怀舍 A1 间",
    stallNo: "A1",
    earTag: "100002",
    exemptionTagLabel: "猪只处于发情高峰期，与配种任务窗口重叠，建议暂缓本场接种。",
    physiologicalPhase: "发情期",
    lastVaccinatedVaccineName: "伪狂犬疫苗",
    lastVaccinatedAt: "2026-02-05",
    dayAge: 469
  },
  "pig-1003": {
    workshopId: "ws-1",
    workshopLabel: "配怀舍 · 一车间",
    roomId: "r-a1",
    roomLabel: "配怀舍 A1 间",
    stallNo: "A1",
    earTag: "100003",
    physiologicalPhase: "妊娠期",
    dayAge: 471
  },
  "pig-1004": {
    workshopId: "ws-1",
    workshopLabel: "配怀舍 · 一车间",
    roomId: "r-a1",
    roomLabel: "配怀舍 A1 间",
    stallNo: "A2",
    earTag: "100004",
    physiologicalPhase: "泌乳期",
    dayAge: 468
  },
  "pig-1005": {
    workshopId: "ws-1",
    workshopLabel: "配怀舍 · 一车间",
    roomId: "r-a1",
    roomLabel: "配怀舍 A1 间",
    stallNo: "A2",
    earTag: "100005",
    physiologicalPhase: "空怀期",
    dayAge: 473
  },
  "pig-1006": {
    workshopId: "ws-1",
    workshopLabel: "配怀舍 · 一车间",
    roomId: "r-a1",
    roomLabel: "配怀舍 A1 间",
    stallNo: "A2",
    earTag: "100006",
    physiologicalPhase: "后备期",
    dayAge: 452
  },
  "pig-1007": {
    workshopId: "ws-1",
    workshopLabel: "配怀舍 · 一车间",
    roomId: "r-a1",
    roomLabel: "配怀舍 A1 间",
    stallNo: "A2",
    earTag: "100007",
    physiologicalPhase: "后备期",
    dayAge: 456
  },
  "pig-1008": {
    workshopId: "ws-1",
    workshopLabel: "配怀舍 · 一车间",
    roomId: "r-a1",
    roomLabel: "配怀舍 A1 间",
    stallNo: "A1",
    earTag: "100008",
    physiologicalPhase: "妊娠期",
    dayAge: 462
  },
  "pig-1009": {
    workshopId: "ws-1",
    workshopLabel: "配怀舍 · 一车间",
    roomId: "r-a1",
    roomLabel: "配怀舍 A1 间",
    stallNo: "A1",
    earTag: "100009",
    physiologicalPhase: "空怀期",
    dayAge: 458
  },
  "pig-1010": {
    workshopId: "ws-1",
    workshopLabel: "配怀舍 · 一车间",
    roomId: "r-a1",
    roomLabel: "配怀舍 A1 间",
    stallNo: "A1",
    earTag: "100010",
    physiologicalPhase: "后备期",
    dayAge: 447
  },
  "pig-1011": {
    workshopId: "ws-1",
    workshopLabel: "配怀舍 · 一车间",
    roomId: "r-a1",
    roomLabel: "配怀舍 A1 间",
    stallNo: "A1",
    earTag: "100011",
    physiologicalPhase: "泌乳期",
    dayAge: 470
  },
  "pig-1012": {
    workshopId: "ws-1",
    workshopLabel: "配怀舍 · 一车间",
    roomId: "r-a1",
    roomLabel: "配怀舍 A1 间",
    stallNo: "A2",
    earTag: "100012",
    physiologicalPhase: "妊娠期",
    dayAge: 463
  },
  "pig-1013": {
    workshopId: "ws-1",
    workshopLabel: "配怀舍 · 一车间",
    roomId: "r-a1",
    roomLabel: "配怀舍 A1 间",
    stallNo: "A2",
    earTag: "100013",
    physiologicalPhase: "空怀期",
    dayAge: 459
  },
  "pig-1014": {
    workshopId: "ws-1",
    workshopLabel: "配怀舍 · 一车间",
    roomId: "r-a1",
    roomLabel: "配怀舍 A1 间",
    stallNo: "A2",
    earTag: "100014",
    physiologicalPhase: "后备期",
    dayAge: 451
  },
  "pig-1015": {
    workshopId: "ws-1",
    workshopLabel: "配怀舍 · 一车间",
    roomId: "r-a1",
    roomLabel: "配怀舍 A1 间",
    stallNo: "A2",
    earTag: "100015",
    physiologicalPhase: "泌乳期",
    dayAge: 468
  }
};

export function getPigMobileMeta(pigId: string): PigMobileMeta {
  return (
    MOCK_PIG_MOBILE_META[pigId] ?? {
      workshopId: "ws-unknown",
      workshopLabel: "未分配车间",
      roomId: `r-${pigId}`,
      roomLabel: "未分区栏位",
      stallNo: "—",
      earTag: pigId.replace(/^pig-/, "")
    }
  );
}
