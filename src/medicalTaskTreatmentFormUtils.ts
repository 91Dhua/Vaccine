export type TreatmentScheduleFieldLabel = "剂次" | "间隔时间" | "间隔时间单位";

export function treatmentScheduleFieldLabels(multiDose: boolean): TreatmentScheduleFieldLabel[] {
  return multiDose ? ["剂次", "间隔时间", "间隔时间单位"] : [];
}
