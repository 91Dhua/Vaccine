import {
  buildTreatmentHomeCard,
  executeTreatmentDose,
  mockTreatmentTask
} from "./mobileTreatmentTaskUtils";

const card = buildTreatmentHomeCard(mockTreatmentTask);

if (card.title !== "治疗任务") {
  throw new Error("治疗任务首页卡标题应为治疗任务");
}

if (card.pendingDoseIndex !== 0 || card.pendingDoseLabel !== "1/3 剂次") {
  throw new Error("治疗任务应默认从第 1 剂次开始执行");
}

if (card.pendingHeads !== 20 || card.totalHeads !== 20) {
  throw new Error("治疗任务首页卡应汇总当前剂次待治疗头数");
}

const afterExecute = executeTreatmentDose(mockTreatmentTask, 0, ["pig-000001", "pig-000002"]);
const afterCard = buildTreatmentHomeCard(afterExecute);

if (afterCard.doneHeads !== 2 || afterCard.pendingHeads !== 18) {
  throw new Error("执行治疗后首页卡应更新已治疗与待治疗数量");
}
