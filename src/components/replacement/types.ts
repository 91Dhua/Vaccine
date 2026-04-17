export type ReplacementTaskStatus =
  | "DRAFT"
  | "READY_FOR_MOBILE"
  | "PENDING_FIELD_VERIFICATION"
  | "PENDING_MANAGER_CONFIRMATION"
  | "PENDING_TRANSFER"
  | "ACTIVE_IN_BATCH";

export type EligibilityStatus = "ELIGIBLE" | "WARNING" | "BLOCKED";

export type CandidateSource = "internal" | "purchased" | "quarantine";

export interface ReplacementBatch {
  id: string;
  name: string;
  productionLine: string;
  targetSowCount: number;
  currentSowCount: number;
  confirmedCulling: number;
  confirmedRemoved: number;
  deceased: number;
  otherExcluded: number;
  targetUnit: string;
  freeSlots: number;
  sourceAreas: string[];
}

export interface ReplacementCandidate {
  id: string;
  earTag: string;
  ageDays: number;
  weightKg: number;
  bodyCondition: number;
  estrusStatus: string;
  healthStatus: string;
  vaccinationStatus: string;
  location: string;
  source: CandidateSource;
  score: number;
  recommended: boolean;
  eligibility: EligibilityStatus;
  blockers: string[];
  reasons: string[];
}

export interface ReplacementPlanState {
  status: ReplacementTaskStatus;
  selectedCandidateIds: string[];
  mobileTaskId?: string;
  transferTaskId?: string;
  confirmedAt?: string;
}
