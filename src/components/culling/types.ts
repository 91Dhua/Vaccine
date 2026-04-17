export type CullingTargetMode = "percentage" | "number";

export type CullingReason =
  | "HIGH_PARITY"
  | "LOW_PERFORMANCE"
  | "RETURN_TO_ESTRUS"
  | "EMPTY_OR_NOT_PREGNANT"
  | "HEALTH_RISK"
  | "LEG_OR_FOOT"
  | "MANAGER_DECISION";

export interface CullingSowRow {
  id: string;
  sowTag: string;
  parity: number;
  source: "Batch" | "Recommended";
  pen: string;
  status: string;
  reason?: CullingReason;
  dystociaHistoryCount: number;
  averageLitterSize: number;
  teatCount: number;
  returnToEstrusCount: number;
  diseaseTags: string[];
  isRecommended?: boolean;
  cullingPriorityScore?: number;
  scoreReasons?: string[];
}
