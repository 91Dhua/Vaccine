export enum PigType {
  Sow = "SOW",
  Boar = "BOAR",
  Piglet = "PIGLET",
  Fattening = "FATTENING",
  Gilt = "GILT"
}

export enum TaskType {
  Routine = "ROUTINE",
  Mass = "MASS",
  Emergency = "EMERGENCY",
  CatchUp = "CATCH_UP"
}

export type ExclusionRuleType = "Pregnancy" | "Lactation";

export interface ExclusionRule {
  type: ExclusionRuleType;
  days: number;
}

export interface Vaccine {
  id: string;
  name: string;
  brand: string;
  defaultDosage: number;
  validAgeMin: number;
  validAgeMax: number;
  currentStock: number;
}
