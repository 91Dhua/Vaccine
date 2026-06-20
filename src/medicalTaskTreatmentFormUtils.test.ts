import { treatmentScheduleFieldLabels } from "./medicalTaskTreatmentFormUtils";

const singleDoseFields = treatmentScheduleFieldLabels(false);

if (singleDoseFields.includes("剂次")) {
  throw new Error("未打开多次用药时，不应展示剂次字段");
}

if (singleDoseFields.length !== 0) {
  throw new Error("未打开多次用药时，不应展示疗程配置字段");
}

const multiDoseFields = treatmentScheduleFieldLabels(true);

if (multiDoseFields.join("、") !== "剂次、间隔时间、间隔时间单位") {
  throw new Error("打开多次用药后，应同时展示剂次、间隔时间和间隔时间单位");
}
