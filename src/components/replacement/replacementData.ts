import type { ReplacementBatch, ReplacementCandidate, ReplacementTaskStatus } from "./types";

export const replacementStatusLabels: Record<ReplacementTaskStatus, string> = {
  DRAFT: "配置中",
  READY_FOR_MOBILE: "待下发复核",
  PENDING_FIELD_VERIFICATION: "现场复核中",
  PENDING_MANAGER_CONFIRMATION: "待管理确认",
  PENDING_TRANSFER: "待转入批次",
  ACTIVE_IN_BATCH: "已补入批次"
};

export const replacementStatusColors: Record<ReplacementTaskStatus, string> = {
  DRAFT: "default",
  READY_FOR_MOBILE: "blue",
  PENDING_FIELD_VERIFICATION: "processing",
  PENDING_MANAGER_CONFIRMATION: "warning",
  PENDING_TRANSFER: "gold",
  ACTIVE_IN_BATCH: "success"
};

export const replacementBatches: ReplacementBatch[] = [
  {
    id: "BATCH-2026-04-A",
    name: "2026-04 A批 · 经产母猪",
    productionLine: "繁育一线",
    targetSowCount: 120,
    currentSowCount: 120,
    confirmedCulling: 7,
    confirmedRemoved: 1,
    deceased: 0,
    otherExcluded: 0,
    targetUnit: "妊娠舍 A2",
    freeSlots: 6,
    sourceAreas: ["后备舍 H1", "后备舍 H2", "隔离舍 Q1"]
  },
  {
    id: "BATCH-2026-04-B",
    name: "2026-04 B批 · 二元母猪",
    productionLine: "繁育二线",
    targetSowCount: 96,
    currentSowCount: 94,
    confirmedCulling: 2,
    confirmedRemoved: 0,
    deceased: 1,
    otherExcluded: 0,
    targetUnit: "妊娠舍 B1",
    freeSlots: 5,
    sourceAreas: ["后备舍 H3", "隔离舍 Q2"]
  }
];

export const replacementCandidates: ReplacementCandidate[] = [
  {
    id: "gilt-2108",
    earTag: "G-2108",
    ageDays: 238,
    weightKg: 142,
    bodyCondition: 3.5,
    estrusStatus: "二情期已记录",
    healthStatus: "健康",
    vaccinationStatus: "繁殖群免疫完成",
    location: "后备舍 H1-03",
    source: "internal",
    score: 94,
    recommended: true,
    eligibility: "ELIGIBLE",
    blockers: [],
    reasons: ["已达最低日龄", "体况良好", "未分配批次", "位置匹配"]
  },
  {
    id: "gilt-2116",
    earTag: "G-2116",
    ageDays: 231,
    weightKg: 136,
    bodyCondition: 3.25,
    estrusStatus: "二情期已记录",
    healthStatus: "健康",
    vaccinationStatus: "繁殖群免疫完成",
    location: "后备舍 H1-05",
    source: "internal",
    score: 90,
    recommended: true,
    eligibility: "ELIGIBLE",
    blockers: [],
    reasons: ["同生产线", "体况稳定", "疫苗完成"]
  },
  {
    id: "gilt-2142",
    earTag: "G-2142",
    ageDays: 245,
    weightKg: 148,
    bodyCondition: 3.75,
    estrusStatus: "三情期已记录",
    healthStatus: "健康",
    vaccinationStatus: "繁殖群免疫完成",
    location: "后备舍 H2-01",
    source: "internal",
    score: 88,
    recommended: true,
    eligibility: "ELIGIBLE",
    blockers: [],
    reasons: ["成熟度高", "体重达标", "未分配批次"]
  },
  {
    id: "gilt-2177",
    earTag: "G-2177",
    ageDays: 226,
    weightKg: 130,
    bodyCondition: 3,
    estrusStatus: "一情期已记录",
    healthStatus: "轻微跛行观察",
    vaccinationStatus: "繁殖群免疫完成",
    location: "后备舍 H2-04",
    source: "internal",
    score: 76,
    recommended: false,
    eligibility: "WARNING",
    blockers: [],
    reasons: ["接近阈值", "需现场复核肢蹄"]
  },
  {
    id: "gilt-2203",
    earTag: "G-2203",
    ageDays: 242,
    weightKg: 146,
    bodyCondition: 3.5,
    estrusStatus: "二情期已记录",
    healthStatus: "健康",
    vaccinationStatus: "隔离免疫待确认",
    location: "隔离舍 Q1-02",
    source: "quarantine",
    score: 73,
    recommended: false,
    eligibility: "WARNING",
    blockers: [],
    reasons: ["隔离来源", "免疫记录需确认"]
  },
  {
    id: "gilt-2231",
    earTag: "G-2231",
    ageDays: 218,
    weightKg: 119,
    bodyCondition: 2.75,
    estrusStatus: "未记录",
    healthStatus: "健康",
    vaccinationStatus: "繁殖群免疫完成",
    location: "后备舍 H3-06",
    source: "internal",
    score: 61,
    recommended: false,
    eligibility: "BLOCKED",
    blockers: ["体重未达标", "发情记录缺失"],
    reasons: ["年龄接近", "需继续培育"]
  },
  {
    id: "gilt-2250",
    earTag: "G-2250",
    ageDays: 252,
    weightKg: 152,
    bodyCondition: 4,
    estrusStatus: "三情期已记录",
    healthStatus: "治疗中",
    vaccinationStatus: "繁殖群免疫完成",
    location: "后备舍 H1-08",
    source: "internal",
    score: 58,
    recommended: false,
    eligibility: "BLOCKED",
    blockers: ["当前治疗中"],
    reasons: ["成熟度足够", "健康状态阻断"]
  },
  {
    id: "gilt-2299",
    earTag: "G-2299",
    ageDays: 236,
    weightKg: 139,
    bodyCondition: 3.25,
    estrusStatus: "二情期已记录",
    healthStatus: "健康",
    vaccinationStatus: "繁殖群免疫完成",
    location: "后备舍 H2-07",
    source: "internal",
    score: 84,
    recommended: true,
    eligibility: "ELIGIBLE",
    blockers: [],
    reasons: ["未分配批次", "位置可转入", "健康记录稳定"]
  }
];
