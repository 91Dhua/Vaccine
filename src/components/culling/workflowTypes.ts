export type CullingTaskStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "PENDING_CAPACITY_RESOLUTION"
  | "PENDING_DESTINATION_ASSIGNMENT"
  | "DESTINATION_ASSIGNED"
  | "COMPLETED"
  | "CANCELLED";

export type CullingTaskType = "CULLING_REVIEW_TASK" | "CULLING_HANDLING_TASK";

export type FieldDecision =
  | "NOT_REVIEWED"
  | "FIELD_CONFIRMED"
  | "FIELD_CONTESTED"
  | "IDENTITY_REVIEW_REQUIRED";

export type DestinationMethod =
  | "SALE"
  | "TRANSFER_OUT_OF_FARM"
  | "INTERNAL_TRANSFER"
  | "MOVE_TO_HOLDING"
  | "SLAUGHTER_OR_DISPOSAL"
  | "PENDING_OUTBOUND";

export type SlotReleaseStatus =
  | "NOT_RELEASED"
  | "SCHEDULED_RELEASE"
  | "RELEASED"
  | "CANCELLED";

export interface CullingTaskSow {
  id: string;
  sowTag: string;
  parity: number;
  pen: string;
  source: "MANAGER_SELECTED" | "SYSTEM_RECOMMENDED" | "FIELD_ADDED";
  isRecommended?: boolean;
  score?: number;
  reasons: string[];
  fieldDecision: FieldDecision;
  destinationMethod?: DestinationMethod;
  linkedTaskId?: string;
  slotReleaseStatus: SlotReleaseStatus;
}

export interface CullingWorkflowTask {
  id: string;
  taskType: CullingTaskType;
  batch: string;
  productionLine: string;
  status: CullingTaskStatus;
  plannedTarget: number;
  minimumVacancies: number;
  capacityGap: number;
  recommendedCount: number;
  managerSelectedCount: number;
  fieldConfirmedCount: number;
  finalConfirmedCount: number;
  destinationPendingCount: number;
  linkedOutboundTasks: string[];
  lastUpdated: string;
  nextAction: string;
  sows: CullingTaskSow[];
}
