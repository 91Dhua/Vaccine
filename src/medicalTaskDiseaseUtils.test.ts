import {
  filterPigsByDiseaseCriteria,
  filterPigsByMedicalTaskCriteria,
  type MedicalDiseasePig
} from "./medicalTaskDiseaseUtils";

const pigs: MedicalDiseasePig[] = [
  {
    id: "A031314",
    area: "A1",
    pen: "1-后备车间-1舍",
    diseaseTags: ["发烧"],
    symptomTags: ["持续高烧", "食欲不振"]
  },
  {
    id: "A031315",
    area: "A1",
    pen: "1-后备车间-1舍",
    diseaseTags: ["发烧"],
    symptomTags: ["流涕"]
  },
  {
    id: "A031316",
    area: "A1",
    pen: "1-后备车间-1舍",
    diseaseTags: ["腹泻"],
    symptomTags: ["食欲不振"]
  }
];

const matched = filterPigsByDiseaseCriteria(pigs, {
  diseases: ["发烧"],
  symptoms: ["持续高烧"]
});

if (matched.length !== 1 || matched[0].id !== "A031314") {
  throw new Error("按疾病创建应只匹配同时带有所选疾病与症状标签的猪只");
}

const diseaseOnly = filterPigsByDiseaseCriteria(pigs, {
  diseases: ["发烧"],
  symptoms: []
});

if (diseaseOnly.length !== 2) {
  throw new Error("未选择症状时，应匹配带有所选疾病标签的全部猪只");
}

const consolePigs: Array<MedicalDiseasePig & { diagnosisStatus: string }> = [
  ...pigs,
  {
    id: "A031317",
    area: "B2",
    pen: "2-母猪车间-1舍",
    diseaseTags: ["发烧"],
    symptomTags: ["持续高烧"],
    diagnosisStatus: "紧急治疗"
  }
].map((pig, index) => ({
  ...pig,
  diagnosisStatus: index === 1 ? "优先干预" : "紧急治疗"
}));

const noCriteriaResult = filterPigsByMedicalTaskCriteria(consolePigs, {
  penKeyword: "",
  diseases: [],
  symptoms: [],
  diagnosisStatuses: [],
  idSearch: "A031314"
});

if (noCriteriaResult.length !== 0) {
  throw new Error("Console 选猪页未使用结构化筛选条件时不应仅凭 ID 搜索展示猪只");
}

const filteredByCriteriaAndSearch = filterPigsByMedicalTaskCriteria(consolePigs, {
  penKeyword: "母猪车间",
  diseases: ["发烧"],
  symptoms: ["持续高烧"],
  diagnosisStatuses: ["紧急治疗"],
  idSearch: "317"
});

if (filteredByCriteriaAndSearch.length !== 1 || filteredByCriteriaAndSearch[0].id !== "A031317") {
  throw new Error("Console 选猪页应先按结构化条件筛选，再用 ID 搜索缩小结果");
}
