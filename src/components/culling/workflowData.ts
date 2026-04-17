import type { CullingTaskStatus, CullingWorkflowTask, DestinationMethod } from "./workflowTypes";

export const cullingTaskStatusLabels: Record<CullingTaskStatus, string> = {
  NOT_STARTED: "未开始",
  IN_PROGRESS: "进行中",
  PENDING_CAPACITY_RESOLUTION: "待解决栏位缺口",
  PENDING_DESTINATION_ASSIGNMENT: "待分配去向",
  DESTINATION_ASSIGNED: "已分配去向",
  COMPLETED: "已完成",
  CANCELLED: "已取消"
};

export const cullingTaskStatusColors: Record<CullingTaskStatus, string> = {
  NOT_STARTED: "default",
  IN_PROGRESS: "processing",
  PENDING_CAPACITY_RESOLUTION: "warning",
  PENDING_DESTINATION_ASSIGNMENT: "orange",
  DESTINATION_ASSIGNED: "blue",
  COMPLETED: "success",
  CANCELLED: "error"
};

export const destinationMethodLabels: Record<DestinationMethod, string> = {
  SALE: "售卖",
  TRANSFER_OUT_OF_FARM: "外转",
  INTERNAL_TRANSFER: "转舍",
  MOVE_TO_HOLDING: "转入待售栏",
  SLAUGHTER_OR_DISPOSAL: "屠宰/处置",
  PENDING_OUTBOUND: "暂待离场"
};

export const destinationOptions = [
  { label: "售卖", value: "SALE" },
  { label: "外转", value: "TRANSFER_OUT_OF_FARM" },
  { label: "转舍", value: "INTERNAL_TRANSFER" },
  { label: "转入待售栏", value: "MOVE_TO_HOLDING" },
  { label: "屠宰/处置", value: "SLAUGHTER_OR_DISPOSAL" },
  { label: "暂待离场", value: "PENDING_OUTBOUND" }
];

export const seedCullingTasks: CullingWorkflowTask[] = [
  {
    id: "CT-26F001",
    taskType: "CULLING_REVIEW_TASK",
    batch: "Batch 26F001",
    productionLine: "Line A · Breeding Herd",
    status: "NOT_STARTED",
    plannedTarget: 6,
    minimumVacancies: 4,
    capacityGap: 4,
    recommendedCount: 5,
    managerSelectedCount: 2,
    fieldConfirmedCount: 0,
    finalConfirmedCount: 0,
    destinationPendingCount: 0,
    linkedOutboundTasks: [],
    lastUpdated: "2026-04-16 09:10",
    nextAction: "通知 Mobile 开始复核",
    sows: [
      {
        id: "sow-1042",
        sowTag: "S-1042",
        parity: 3,
        pen: "Farrowing · A12",
        source: "MANAGER_SELECTED",
        isRecommended: true,
        score: 82,
        reasons: ["上一胎断奶数低", "体况恢复慢"],
        fieldDecision: "NOT_REVIEWED",
        slotReleaseStatus: "NOT_RELEASED"
      },
      {
        id: "sow-1087",
        sowTag: "S-1087",
        parity: 5,
        pen: "Breeding · B08",
        source: "MANAGER_SELECTED",
        isRecommended: true,
        score: 76,
        reasons: ["胎次偏高", "配种效率下降"],
        fieldDecision: "NOT_REVIEWED",
        slotReleaseStatus: "NOT_RELEASED"
      },
      {
        id: "sow-1103",
        sowTag: "S-1103",
        parity: 1,
        pen: "Gestation · G21",
        source: "SYSTEM_RECOMMENDED",
        isRecommended: true,
        score: 88,
        reasons: ["连续返情", "空怀天数风险"],
        fieldDecision: "NOT_REVIEWED",
        slotReleaseStatus: "NOT_RELEASED"
      },
      {
        id: "sow-1218",
        sowTag: "S-1218",
        parity: 6,
        pen: "Gestation · D17",
        source: "SYSTEM_RECOMMENDED",
        isRecommended: true,
        score: 91,
        reasons: ["肢蹄问题", "移动能力风险"],
        fieldDecision: "NOT_REVIEWED",
        slotReleaseStatus: "NOT_RELEASED"
      }
    ]
  },
  {
    id: "CT-26E018",
    taskType: "CULLING_REVIEW_TASK",
    batch: "Batch 26E018",
    productionLine: "Line B · Sow Herd",
    status: "IN_PROGRESS",
    plannedTarget: 5,
    minimumVacancies: 3,
    capacityGap: 1,
    recommendedCount: 4,
    managerSelectedCount: 1,
    fieldConfirmedCount: 2,
    finalConfirmedCount: 0,
    destinationPendingCount: 0,
    linkedOutboundTasks: [],
    lastUpdated: "2026-04-16 10:35",
    nextAction: "等待 Mobile 提交复核结果",
    sows: [
      {
        id: "sow-1307",
        sowTag: "S-1307",
        parity: 7,
        pen: "Gestation · F03",
        source: "SYSTEM_RECOMMENDED",
        isRecommended: true,
        score: 93,
        reasons: ["胎次偏高", "断奶数连续偏低"],
        fieldDecision: "FIELD_CONFIRMED",
        slotReleaseStatus: "NOT_RELEASED"
      },
      {
        id: "sow-1322",
        sowTag: "S-1322",
        parity: 4,
        pen: "Farrowing · H11",
        source: "MANAGER_SELECTED",
        isRecommended: false,
        score: 61,
        reasons: ["管理者指定", "乳房状态需复核"],
        fieldDecision: "FIELD_CONFIRMED",
        slotReleaseStatus: "NOT_RELEASED"
      },
      {
        id: "sow-1339",
        sowTag: "S-1339",
        parity: 2,
        pen: "Gestation · F09",
        source: "SYSTEM_RECOMMENDED",
        isRecommended: true,
        score: 72,
        reasons: ["返情记录", "体况偏低"],
        fieldDecision: "FIELD_CONTESTED",
        slotReleaseStatus: "NOT_RELEASED"
      }
    ]
  },
  {
    id: "CT-26D011",
    taskType: "CULLING_HANDLING_TASK",
    batch: "Batch 26D011",
    productionLine: "Line A · Breeding Herd",
    status: "PENDING_DESTINATION_ASSIGNMENT",
    plannedTarget: 8,
    minimumVacancies: 6,
    capacityGap: 2,
    recommendedCount: 6,
    managerSelectedCount: 3,
    fieldConfirmedCount: 7,
    finalConfirmedCount: 7,
    destinationPendingCount: 4,
    linkedOutboundTasks: ["OUT-260416-02"],
    lastUpdated: "2026-04-16 11:05",
    nextAction: "为 4 头淘汰母猪分配去向",
    sows: [
      {
        id: "sow-1410",
        sowTag: "S-1410",
        parity: 6,
        pen: "Gestation · A01",
        source: "SYSTEM_RECOMMENDED",
        isRecommended: true,
        score: 89,
        reasons: ["肢蹄问题", "胎次偏高"],
        fieldDecision: "FIELD_CONFIRMED",
        destinationMethod: "SALE",
        linkedTaskId: "OUT-260416-02",
        slotReleaseStatus: "SCHEDULED_RELEASE"
      },
      {
        id: "sow-1424",
        sowTag: "S-1424",
        parity: 5,
        pen: "Gestation · A04",
        source: "MANAGER_SELECTED",
        isRecommended: true,
        score: 84,
        reasons: ["连续返情", "空怀天数风险"],
        fieldDecision: "FIELD_CONFIRMED",
        slotReleaseStatus: "NOT_RELEASED"
      },
      {
        id: "sow-1441",
        sowTag: "S-1441",
        parity: 4,
        pen: "Farrowing · C08",
        source: "SYSTEM_RECOMMENDED",
        isRecommended: true,
        score: 78,
        reasons: ["哺乳表现差", "仔猪成活率低"],
        fieldDecision: "FIELD_CONFIRMED",
        slotReleaseStatus: "NOT_RELEASED"
      }
    ]
  },
  {
    id: "CT-26C009",
    taskType: "CULLING_HANDLING_TASK",
    batch: "Batch 26C009",
    productionLine: "Line C · Full Cycle",
    status: "COMPLETED",
    plannedTarget: 4,
    minimumVacancies: 2,
    capacityGap: 0,
    recommendedCount: 3,
    managerSelectedCount: 2,
    fieldConfirmedCount: 4,
    finalConfirmedCount: 4,
    destinationPendingCount: 0,
    linkedOutboundTasks: ["OUT-260410-01"],
    lastUpdated: "2026-04-12 16:22",
    nextAction: "查看淘汰记录",
    sows: [
      {
        id: "sow-1519",
        sowTag: "S-1519",
        parity: 8,
        pen: "Left",
        source: "MANAGER_SELECTED",
        isRecommended: true,
        score: 96,
        reasons: ["高胎龄", "生产性能下降"],
        fieldDecision: "FIELD_CONFIRMED",
        destinationMethod: "SALE",
        linkedTaskId: "OUT-260410-01",
        slotReleaseStatus: "RELEASED"
      }
    ]
  }
];
