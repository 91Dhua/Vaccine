import {
  Button,
  Card,
  Cascader,
  Checkbox,
  Col,
  DatePicker,
  Drawer,
  Empty,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Steps,
  Switch,
  Tag,
  Typography
} from "antd";
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  CheckOutlined,
  DeleteOutlined,
  HistoryOutlined,
  MedicineBoxOutlined,
  PlusOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  filterPigsByDiseaseCriteria,
  filterPigsByMedicalTaskCriteria,
  hasStructuredMedicalTaskFilter,
  type DiseaseCriteria,
  type MedicalTaskPigFilterCriteria,
  type MedicalDiseasePig
} from "../medicalTaskDiseaseUtils";
import { treatmentScheduleFieldLabels } from "../medicalTaskTreatmentFormUtils";

const { Title, Text } = Typography;

type MedicalTaskSchemePageProps = {
  scheme: "A" | "B";
};

type TaskKind = "vaccination" | "treatment";
type FlowStage = "home" | "create";
type CreateStep = "drug" | "form" | "confirm";
type CreateSource = "selectedPigs" | "disease";
type DrugCategory = "疫苗" | "兽药" | "保健品" | "消毒用品" | "其他";
type DrugCatalogItem = {
  label: string;
  value: string;
  type: TaskKind;
  category: DrugCategory;
};
type DrugCatalogGroup = {
  label: DrugCategory;
  value: string;
  children: DrugCatalogItem[];
};
type PrescriptionDrugDraft = {
  id: string;
  drugName: string;
  multiDose: boolean;
};
type HealthPigRow = MedicalDiseasePig & {
  checked: boolean;
  currentPrescription: string;
  diagnosisStatus: string;
};
type CreateTargetContext = {
  source: CreateSource;
  criteria: DiseaseCriteria;
  pigs: MedicalDiseasePig[];
};

const healthTabs = [
  { key: "all", label: "全部猪只", count: 128 },
  { key: "urgent", label: "紧急治疗" },
  { key: "priority", label: "优先干预" },
  { key: "observe", label: "常规观察" }
];

const emptyDiseaseCriteria: DiseaseCriteria = { diseases: [], symptoms: [] };
const defaultDiseaseCriteria: DiseaseCriteria = { diseases: ["发烧"], symptoms: ["持续高烧"] };
const emptyPigFilterCriteria: MedicalTaskPigFilterCriteria = {
  penKeyword: "",
  diseases: [],
  symptoms: [],
  diagnosisStatuses: [],
  idSearch: ""
};

const diseaseCatalog = [
  {
    label: "发烧",
    description: "体温异常、精神沉郁，需要优先处理。",
    symptoms: ["持续高烧", "食欲不振", "流涕"]
  },
  {
    label: "腹泻",
    description: "粪便异常或脱水风险，适合批量干预。",
    symptoms: ["水样便", "食欲不振", "消瘦"]
  },
  {
    label: "蓝耳 PRRS",
    description: "疑似呼吸道或繁殖障碍相关标签。",
    symptoms: ["呼吸急促", "发绀", "持续高烧"]
  },
  {
    label: "肢蹄问题",
    description: "跛行、站立困难等影响采食的情况。",
    symptoms: ["跛行", "关节肿胀", "采食下降"]
  }
];

const pigRows: HealthPigRow[] = Array.from({ length: 10 }).map((_, index) => {
  const diseaseSets = [
    { diseases: ["发烧"], symptoms: ["持续高烧", "食欲不振"] },
    { diseases: ["发烧"], symptoms: ["持续高烧", "流涕"] },
    { diseases: ["蓝耳 PRRS"], symptoms: ["呼吸急促", "持续高烧"] },
    { diseases: ["腹泻"], symptoms: ["水样便", "食欲不振"] },
    { diseases: ["发烧"], symptoms: ["流涕"] },
    { diseases: ["肢蹄问题"], symptoms: ["跛行", "采食下降"] },
    { diseases: ["腹泻"], symptoms: ["消瘦"] },
    { diseases: ["蓝耳 PRRS"], symptoms: ["发绀", "持续高烧"] },
    { diseases: ["发烧"], symptoms: ["持续高烧"] },
    { diseases: ["肢蹄问题"], symptoms: ["关节肿胀"] }
  ];
  const tagSet = diseaseSets[index];

  return {
    id: `A0313${14 + index}`,
    pen: index === 8 ? "2-母猪车间-1舍" : "1-后备车间-1舍",
    area: "A1",
    checked: false,
    diseaseTags: tagSet.diseases,
    symptomTags: tagSet.symptoms,
    currentPrescription: index < 2 ? "退热观察处方" : "-",
    diagnosisStatus: index % 3 === 0 ? "紧急治疗" : index % 3 === 1 ? "优先干预" : "常规观察"
  };
});

const healthStatusOptions = Array.from(new Set(pigRows.map((pig) => pig.diagnosisStatus))).map((status) => ({
  label: status,
  value: status
}));
const diseaseOptions = Array.from(new Set(pigRows.flatMap((pig) => pig.diseaseTags))).map((tag) => ({
  label: tag,
  value: tag
}));
const symptomOptions = Array.from(new Set(pigRows.flatMap((pig) => pig.symptomTags))).map((tag) => ({
  label: tag,
  value: tag
}));

const drugCatalogOptions: DrugCatalogGroup[] = [
  {
    label: "疫苗",
    value: "疫苗",
    children: [
      { label: "猪瘟灭活疫苗", value: "vaccine-csf", type: "vaccination", category: "疫苗" },
      { label: "非瘟灭活疫苗", value: "vaccine-asf", type: "vaccination", category: "疫苗" },
      { label: "蓝耳二联疫苗", value: "vaccine-prrs", type: "vaccination", category: "疫苗" }
    ]
  },
  {
    label: "兽药",
    value: "兽药",
    children: [
      { label: "阿斯匹林", value: "drug-aspirin", type: "treatment", category: "兽药" },
      { label: "阿莫西林注射液", value: "drug-amoxicillin", type: "treatment", category: "兽药" },
      { label: "氟尼辛葡甲胺注射液", value: "drug-flunixin", type: "treatment", category: "兽药" },
      { label: "头孢噻呋钠", value: "drug-ceftiofur", type: "treatment", category: "兽药" }
    ]
  },
  {
    label: "保健品",
    value: "保健品",
    children: [
      { label: "复合维生素", value: "health-vitamin", type: "treatment", category: "保健品" },
      { label: "电解多维", value: "health-electrolyte", type: "treatment", category: "保健品" },
      { label: "益生菌", value: "health-probiotics", type: "treatment", category: "保健品" }
    ]
  },
  {
    label: "消毒用品",
    value: "消毒用品",
    children: [
      { label: "戊二醛消毒液", value: "disinfectant-glutaraldehyde", type: "treatment", category: "消毒用品" },
      { label: "过硫酸氢钾复合盐", value: "disinfectant-peroxymonosulfate", type: "treatment", category: "消毒用品" },
      { label: "聚维酮碘", value: "disinfectant-povidone-iodine", type: "treatment", category: "消毒用品" }
    ]
  },
  {
    label: "其他",
    value: "其他",
    children: [
      { label: "耳标清洁剂", value: "other-ear-tag-cleaner", type: "treatment", category: "其他" },
      { label: "采样辅助用品", value: "other-sampling-supplies", type: "treatment", category: "其他" }
    ]
  }
];

const drugOptions = drugCatalogOptions.flatMap((group) => group.children);

function getDrugPath(drugValue: string) {
  const group = drugCatalogOptions.find((item) => item.children.some((child) => child.value === drugValue));
  return group ? [group.value, drugValue] : [drugCatalogOptions[0].value, drugCatalogOptions[0].children[0].value];
}

function HealthDiagnosisHome({
  scheme,
  onCreate,
  taskKind,
  onTaskKindChange,
  onConfirmTaskKind
}: {
  scheme: "A" | "B";
  onCreate: (context: CreateTargetContext) => void;
  taskKind?: TaskKind;
  onTaskKindChange?: (kind: TaskKind) => void;
  onConfirmTaskKind?: () => void;
}) {
  const [taskTypeOpen, setTaskTypeOpen] = useState(false);
  const [diseaseDrawerOpen, setDiseaseDrawerOpen] = useState(false);
  const [criteria, setCriteria] = useState<DiseaseCriteria>(defaultDiseaseCriteria);
  const [pigFilter, setPigFilter] = useState<MedicalTaskPigFilterCriteria>(emptyPigFilterCriteria);
  const [selectedPigIds, setSelectedPigIds] = useState<string[]>([]);
  const hasStructuredFilter = hasStructuredMedicalTaskFilter(pigFilter);
  const filteredPigs = useMemo(() => filterPigsByMedicalTaskCriteria(pigRows, pigFilter), [pigFilter]);
  const selectedPigs = useMemo(
    () => filteredPigs.filter((pig) => selectedPigIds.includes(pig.id)),
    [filteredPigs, selectedPigIds]
  );
  const selectedCount = selectedPigs.length;
  const matchedPigs = useMemo(() => filterPigsByDiseaseCriteria(pigRows, criteria), [criteria]);
  const availableSymptoms = useMemo(() => {
    const selectedDisease = diseaseCatalog.find((item) => item.label === criteria.diseases[0]);
    return selectedDisease?.symptoms ?? diseaseCatalog.flatMap((item) => item.symptoms);
  }, [criteria.diseases]);

  const updatePigFilter = <K extends keyof MedicalTaskPigFilterCriteria>(
    key: K,
    value: MedicalTaskPigFilterCriteria[K]
  ) => {
    setPigFilter((prev) => ({ ...prev, [key]: value }));
    setSelectedPigIds([]);
  };

  const togglePigSelected = (pigId: string, checked: boolean) => {
    setSelectedPigIds((prev) => {
      const set = new Set(prev);
      if (checked) set.add(pigId);
      else set.delete(pigId);
      return Array.from(set);
    });
  };

  const allFilteredSelected =
    filteredPigs.length > 0 && filteredPigs.every((pig) => selectedPigIds.includes(pig.id));
  const partFilteredSelected =
    !allFilteredSelected && filteredPigs.some((pig) => selectedPigIds.includes(pig.id));

  const toggleAllFiltered = (checked: boolean) => {
    setSelectedPigIds(checked ? filteredPigs.map((pig) => pig.id) : []);
  };

  const continueAfterTargetPicked = (context: CreateTargetContext) => {
    onCreate(context);
    if (scheme === "A") {
      setTaskTypeOpen(true);
    }
  };

  const startWithSelectedPigs = () => {
    if (!selectedPigs.length) return;
    continueAfterTargetPicked({
      source: "selectedPigs",
      criteria: emptyDiseaseCriteria,
      pigs: selectedPigs
    });
  };

  const pickDisease = (disease: string) => {
    const selectedDisease = diseaseCatalog.find((item) => item.label === disease);
    setCriteria({
      diseases: [disease],
      symptoms: selectedDisease?.symptoms.includes(criteria.symptoms[0]) ? criteria.symptoms : []
    });
  };

  const toggleSymptom = (symptom: string, checked: boolean) => {
    setCriteria((prev) => ({
      ...prev,
      symptoms: checked
        ? Array.from(new Set([...prev.symptoms, symptom]))
        : prev.symptoms.filter((item) => item !== symptom)
    }));
  };

  const confirmDiseaseTarget = () => {
    setDiseaseDrawerOpen(false);
    continueAfterTargetPicked({
      source: "disease",
      criteria,
      pigs: matchedPigs
    });
  };

  const confirmTaskType = () => {
    setTaskTypeOpen(false);
    onConfirmTaskKind?.();
  };

  return (
    <div>
      <div className="medical-health-head">
        <div>
          <Title level={3}>健康诊疗</Title>
          <Text type="secondary">首页 · 健康诊疗</Text>
        </div>
        <Button type="primary" className="medical-health-primary" onClick={() => setDiseaseDrawerOpen(true)}>
          按疾病创建任务
        </Button>
      </div>

      <Card className="medical-health-card">
        <div className="medical-health-tabs">
          {healthTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`medical-health-tab${tab.key === "all" ? " is-active" : ""}`}
            >
              {tab.label}
              {tab.count ? <span>{tab.count}</span> : null}
            </button>
          ))}
        </div>

        <div className="medical-health-filter">
          <div className="medical-health-filter-grid">
            <label className="medical-health-filter-field">
              <Text type="secondary">栏位/舍</Text>
              <Input
                placeholder="输入栏位或舍名称"
                allowClear
                value={pigFilter.penKeyword}
                onChange={(event) => updatePigFilter("penKeyword", event.target.value)}
              />
            </label>
            <label className="medical-health-filter-field">
              <Text type="secondary">疾病标签</Text>
              <Select
                mode="multiple"
                allowClear
                placeholder="选择疾病"
                value={pigFilter.diseases}
                options={diseaseOptions}
                onChange={(value) => updatePigFilter("diseases", value)}
              />
            </label>
            <label className="medical-health-filter-field">
              <Text type="secondary">症状标签</Text>
              <Select
                mode="multiple"
                allowClear
                placeholder="选择症状"
                value={pigFilter.symptoms}
                options={symptomOptions}
                onChange={(value) => updatePigFilter("symptoms", value)}
              />
            </label>
            <label className="medical-health-filter-field">
              <Text type="secondary">健康诊疗状态</Text>
              <Select
                mode="multiple"
                allowClear
                placeholder="选择状态"
                value={pigFilter.diagnosisStatuses}
                options={healthStatusOptions}
                onChange={(value) => updatePigFilter("diagnosisStatuses", value)}
              />
            </label>
            <label className="medical-health-filter-field medical-health-filter-field--search">
              <Text type="secondary">猪只ID搜索</Text>
              <Input
                placeholder="在筛选结果中搜索 ID"
                allowClear
                value={pigFilter.idSearch}
                onChange={(event) => updatePigFilter("idSearch", event.target.value)}
              />
            </label>
            <Button
              className="medical-health-reset-btn"
              onClick={() => {
                setPigFilter(emptyPigFilterCriteria);
                setSelectedPigIds([]);
              }}
            >
              重置
            </Button>
          </div>
        </div>

        {hasStructuredFilter ? (
          <>
            {selectedCount > 0 ? (
              <div className="medical-health-selected-bar">
                <div>
                  <Checkbox
                    checked={allFilteredSelected}
                    indeterminate={partFilteredSelected}
                    onChange={(event) => toggleAllFiltered(event.target.checked)}
                  />
                  <Text strong>{selectedCount} 已选中</Text>
                  <Text type="secondary">共匹配 {filteredPigs.length} 头</Text>
                </div>
                <Button
                  className="medical-health-create-selected"
                  onClick={startWithSelectedPigs}
                >
                  {scheme === "A" ? "为选中猪只创建任务" : "为选中猪只选择药品"}
                </Button>
              </div>
            ) : null}

            {filteredPigs.length ? (
              <>
                <div className="medical-health-table-head">
                  <span />
                  <Text type="secondary">猪只ID</Text>
                  <Text type="secondary">栏位</Text>
                  <Text type="secondary">疾病</Text>
                  <Text type="secondary">症状</Text>
                  <Text type="secondary">当前处方</Text>
                  <Text type="secondary">健康诊疗</Text>
                </div>

                <div className="medical-health-list">
                  {filteredPigs.map((pig) => (
                    <div className="medical-health-row" key={pig.id}>
                      <Checkbox
                        checked={selectedPigIds.includes(pig.id)}
                        onChange={(event) => togglePigSelected(pig.id, event.target.checked)}
                      />
                      <Text>{pig.id}</Text>
                      <div>
                        <Text>{pig.area}</Text>
                        <Text type="secondary">{pig.pen}</Text>
                      </div>
                      <div className="medical-health-row-tags">
                        {pig.diseaseTags.map((tag) => <Tag key={tag}>{tag}</Tag>)}
                      </div>
                      <div className="medical-health-row-tags">
                        {pig.symptomTags.map((tag) => <Tag color="gold" key={tag}>{tag}</Tag>)}
                      </div>
                      <Text type="secondary">{pig.currentPrescription}</Text>
                      <Text>{pig.diagnosisStatus}</Text>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <Empty
                className="medical-health-empty"
                description="没有匹配当前条件的猪只，请调整筛选条件"
              />
            )}
          </>
        ) : (
          <Empty
            className="medical-health-empty"
            description="请先使用栏位、疾病、症状或健康诊疗状态筛选猪只"
          />
        )}
      </Card>

      <Drawer
        className="medical-disease-drawer"
        title="疾病与症状"
        open={diseaseDrawerOpen}
        onClose={() => setDiseaseDrawerOpen(false)}
        width={900}
        footer={
          <div className="medical-disease-drawer-footer">
            <Text type="secondary">
              已匹配 <Text strong>{matchedPigs.length}</Text> 头猪
            </Text>
            <Space>
              <Button onClick={() => setDiseaseDrawerOpen(false)}>取消</Button>
              <Button type="primary" disabled={matchedPigs.length === 0} onClick={confirmDiseaseTarget}>
                确认
              </Button>
            </Space>
          </div>
        }
      >
        <div className="medical-disease-drawer-grid">
          <Card className="medical-disease-panel" title="疾病">
            <div className="medical-disease-option-list">
              {diseaseCatalog.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className={`medical-disease-option${criteria.diseases.includes(item.label) ? " is-active" : ""}`}
                  onClick={() => pickDisease(item.label)}
                >
                  <Text strong>{item.label}</Text>
                  <Text type="secondary">{item.description}</Text>
                </button>
              ))}
            </div>
          </Card>

          <Card className="medical-disease-panel" title="症状">
            <div className="medical-disease-symptom-list">
              {availableSymptoms.map((symptom) => (
                <Checkbox
                  key={symptom}
                  checked={criteria.symptoms.includes(symptom)}
                  onChange={(event) => toggleSymptom(symptom, event.target.checked)}
                >
                  {symptom}
                </Checkbox>
              ))}
            </div>
          </Card>
        </div>

        <Card className="medical-disease-result-card" title="自动筛选结果">
          <div className="medical-disease-result-head">
            <div>
              <Text type="secondary">筛选条件</Text>
              <div className="medical-disease-tags">
                {criteria.diseases.map((tag) => <Tag color="green" key={tag}>{tag}</Tag>)}
                {criteria.symptoms.map((tag) => <Tag color="gold" key={tag}>{tag}</Tag>)}
              </div>
            </div>
            <Text strong>{matchedPigs.length} 头</Text>
          </div>
          <div className="medical-disease-result-list">
            {matchedPigs.slice(0, 6).map((pig) => (
              <div className="medical-disease-result-row" key={pig.id}>
                <Text strong>{pig.id}</Text>
                <Text type="secondary">{pig.area} · {pig.pen}</Text>
                <div className="medical-disease-tags">
                  {pig.diseaseTags.map((tag) => <Tag key={tag}>{tag}</Tag>)}
                  {pig.symptomTags.map((tag) => <Tag color="gold" key={tag}>{tag}</Tag>)}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </Drawer>

      {scheme === "A" ? (
        <Modal
          className="medical-task-modal"
          title="选择任务类型"
          open={taskTypeOpen}
          onCancel={() => setTaskTypeOpen(false)}
          footer={[
            <Button key="cancel" onClick={() => setTaskTypeOpen(false)}>
              取消
            </Button>,
            <Button key="next" type="primary" onClick={confirmTaskType}>
              下一步
            </Button>
          ]}
          width={560}
          destroyOnHidden
        >
          <div className="medical-task-type-list medical-task-type-list--modal">
            <TaskTypeCard
              active={taskKind === "vaccination"}
              kind="vaccination"
              onClick={() => onTaskKindChange?.("vaccination")}
            />
            <TaskTypeCard
              active={taskKind === "treatment"}
              kind="treatment"
              onClick={() => onTaskKindChange?.("treatment")}
            />
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function SelectedPigSummary({ context }: { context: CreateTargetContext }) {
  const isDiseaseSource = context.source === "disease";

  return (
    <Card className="section-card medical-task-card" title="治疗对象">
      <Space direction="vertical" size={10} className="medical-task-summary">
        <div>
          <Text type="secondary">创建方式</Text>
          <Text strong>{isDiseaseSource ? "按疾病批量创建" : "按选中猪只创建"}</Text>
        </div>
        <div>
          <Text type="secondary">目标猪只</Text>
          <Text strong>{context.pigs.length} 头</Text>
        </div>
        <div>
          <Text type="secondary">来源</Text>
          <Text strong>
            {isDiseaseSource
              ? `健康诊疗 · ${context.criteria.diseases.join("、") || "疾病标签"}`
              : "健康诊疗 · 手动勾选"}
          </Text>
        </div>
        {isDiseaseSource ? (
          <div>
            <Text type="secondary">疾病与症状</Text>
            <div className="medical-disease-tags">
              {context.criteria.diseases.map((tag) => <Tag color="green" key={tag}>{tag}</Tag>)}
              {context.criteria.symptoms.map((tag) => <Tag color="gold" key={tag}>{tag}</Tag>)}
            </div>
          </div>
        ) : null}
      </Space>
    </Card>
  );
}

function TaskTypeCard({
  active,
  kind,
  onClick
}: {
  active: boolean;
  kind: TaskKind;
  onClick: () => void;
}) {
  const isVaccination = kind === "vaccination";

  return (
    <button
      type="button"
      className={`medical-task-type-card${active ? " is-active" : ""}`}
      onClick={onClick}
    >
      <span className="medical-task-type-icon">
        {active ? <CheckOutlined /> : <MedicineBoxOutlined />}
      </span>
      <span>
        <Text strong>{isVaccination ? "疫苗接种任务" : "治疗用药任务"}</Text>
        <Text type="secondary">
          {isVaccination
            ? "给这批猪安排疫苗接种。"
            : "给这批猪安排治疗用药。"}
        </Text>
      </span>
    </button>
  );
}

function VaccinationForm({
  drugName = "非瘟灭活疫苗",
  drugField
}: {
  drugName?: string;
  drugField?: ReactNode | null;
}) {
  const [reviewEnabled, setReviewEnabled] = useState(false);

  return (
    <div className="medical-vaccination-form">
      <div className="medical-vaccination-section">
        <div className="medical-vaccination-section-head">
          <div>
            <Title level={5}>接种信息</Title>
            <Text type="secondary">填写本次接种的疫苗、方式、剂量与执行日期。</Text>
          </div>
          <Tag color="green">疫苗接种任务</Tag>
        </div>
        <div className="medical-vaccination-grid">
          {drugField !== undefined ? drugField : (
            <label>
              <Text type="secondary">疫苗</Text>
              <Select value={drugName} options={[{ label: drugName, value: drugName }]} />
            </label>
          )}
          <label>
            <Text type="secondary">品牌/剂型</Text>
            <Select
              value="佰特生物 · 油佐剂灭活疫苗"
              options={[{ label: "佰特生物 · 油佐剂灭活疫苗", value: "佰特生物 · 油佐剂灭活疫苗" }]}
            />
          </label>
          <label>
            <Text type="secondary">接种方式</Text>
            <Select value="肌内注射" options={[{ label: "肌内注射", value: "肌内注射" }]} />
          </label>
          <label>
            <Text type="secondary">接种日期</Text>
            <DatePicker value={dayjs("2026-02-10")} suffixIcon={<CalendarOutlined />} />
          </label>
          <label>
            <Text type="secondary">剂量</Text>
            <InputNumber value={2} min={0.5} step={0.5} addonAfter="毫升" />
          </label>
        </div>
      </div>

      <div className="medical-vaccination-section">
        <div className="medical-vaccination-review-head">
          <div>
            <Title level={5}>免疫复核</Title>
            <Text type="secondary">打开后，接种完成会按配置生成复核采样任务。</Text>
          </div>
          <Switch checked={reviewEnabled} onChange={setReviewEnabled} />
        </div>

        {reviewEnabled ? (
          <div className="medical-vaccination-grid medical-vaccination-review-grid">
            <label>
              <Text type="secondary">目标抗体</Text>
              <Input value="非洲猪瘟病毒抗体" readOnly />
            </label>
            <label>
              <Text type="secondary">采样方式</Text>
              <Select
                placeholder="请选择采样方式"
                options={[
                  { label: "耳缘静脉采血", value: "EAR_VEIN" },
                  { label: "前腔静脉采血", value: "FRONT_VENA" },
                  { label: "尾静脉采血", value: "TAIL_VEIN" }
                ]}
              />
            </label>
            <label>
              <Text type="secondary">样品容器</Text>
              <Select
                placeholder="请选择样品容器"
                options={[
                  { label: "采样血管", value: "BLOOD_TUBE" },
                  { label: "试剂袋", value: "REAGENT_BAG" },
                  { label: "试剂袋-血样", value: "REAGENT_BAG_BLOOD" }
                ]}
              />
            </label>
            <label>
              <Text type="secondary">抽检间隔</Text>
              <InputNumber value={28} min={1} max={365} addonAfter="天" />
            </label>
            <label>
              <Text type="secondary">抽样比例</Text>
              <InputNumber value={5} min={1} max={100} addonAfter="%" />
            </label>
            <label>
              <Text type="secondary">抗体合格率阈值</Text>
              <InputNumber value={80} min={1} max={100} addonAfter="%" />
            </label>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TaskConfigShell({
  topContent,
  children,
  actions
}: {
  topContent?: ReactNode;
  children: ReactNode;
  actions: ReactNode;
}) {
  return (
    <div className="medical-task-config-shell">
      {topContent ? <div className="medical-task-config-top">{topContent}</div> : null}
      <div className="medical-task-config-body">{children}</div>
      <div className="medical-task-step-actions medical-task-config-actions">
        {actions}
      </div>
    </div>
  );
}

function VaccinationFormStep({
  drugName,
  onBack,
  onNext
}: {
  drugName?: string;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <TaskConfigShell
      actions={(
        <>
          <Button onClick={onBack}>上一步</Button>
          <Button type="primary" onClick={onNext}>下一步</Button>
        </>
      )}
    >
      <VaccinationForm drugName={drugName} />
    </TaskConfigShell>
  );
}

function PrescriptionDrugBlock({
  item,
  index,
  canDelete,
  drugField,
  onToggleMultiDose,
  onDelete
}: {
  item: PrescriptionDrugDraft;
  index: number;
  canDelete: boolean;
  drugField?: ReactNode | null;
  onToggleMultiDose: (id: string, checked: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const scheduleFieldLabels = treatmentScheduleFieldLabels(item.multiDose);

  return (
    <div className="medical-prescription-drug">
      <div className="medical-prescription-drug-head">
        <div>
          <Title level={5}>药物 {index + 1}</Title>
          <Text type="secondary">填写本药物的给药方式、剂量与治疗时间。</Text>
        </div>
        <Button
          type="text"
          icon={<DeleteOutlined />}
          disabled={!canDelete}
          onClick={() => onDelete(item.id)}
        >
          删除
        </Button>
      </div>

      <div className="medical-prescription-grid">
        {drugField !== undefined ? drugField : (
          <label>
            <Text type="secondary">药物</Text>
            <Select
              value={item.drugName}
              options={[
                { label: "阿莫西林注射液", value: "阿莫西林注射液" },
                { label: "氟尼辛葡甲胺注射液", value: "氟尼辛葡甲胺注射液" },
                { label: "头孢噻呋钠", value: "头孢噻呋钠" }
              ]}
            />
          </label>
        )}
        <label>
          <Text type="secondary">品牌/剂型</Text>
          <Select value="华牧 · 注射液" options={[{ label: "华牧 · 注射液", value: "华牧 · 注射液" }]} />
        </label>
        <label>
          <Text type="secondary">治疗方式</Text>
          <Select
            value="肌内注射"
            options={[
              { label: "肌内注射", value: "肌内注射" },
              { label: "饮水", value: "饮水" },
              { label: "拌料", value: "拌料" }
            ]}
          />
        </label>
        <label>
          <Text type="secondary">剂量</Text>
          <InputNumber value={5} min={0.5} step={0.5} />
        </label>
        <label>
          <Text type="secondary">剂量单位</Text>
          <Select
            value="毫升"
            options={[
              { label: "毫升", value: "毫升" },
              { label: "毫克", value: "毫克" },
              { label: "克", value: "克" }
            ]}
          />
        </label>
        <label>
          <Text type="secondary">治疗开始日期</Text>
          <DatePicker value={dayjs("2026-02-10")} suffixIcon={<CalendarOutlined />} />
        </label>
        <label className="medical-prescription-switch-field">
          <Text type="secondary">多次用药</Text>
          <Switch checked={item.multiDose} onChange={(checked) => onToggleMultiDose(item.id, checked)} />
        </label>
        {item.multiDose ? (
          <>
            {scheduleFieldLabels.includes("剂次") ? (
              <label>
                <Text type="secondary">剂次</Text>
                <div className="medical-prescription-unit-input">
                  <InputNumber value={2} min={2} />
                  <span>次</span>
                </div>
              </label>
            ) : null}
            <label>
              <Text type="secondary">间隔时间</Text>
              <InputNumber value={12} min={1} />
            </label>
            <label>
              <Text type="secondary">间隔时间单位</Text>
              <Select
                value="小时"
                options={[
                  { label: "小时", value: "小时" },
                  { label: "天", value: "天" },
                  { label: "周", value: "周" }
                ]}
              />
            </label>
          </>
        ) : null}
      </div>
    </div>
  );
}

function TreatmentForm({
  drugName = "阿莫西林注射液",
  drugField
}: {
  drugName?: string;
  drugField?: ReactNode | null;
}) {
  const [drugs, setDrugs] = useState<PrescriptionDrugDraft[]>([
    { id: "drug-1", drugName, multiDose: false }
  ]);

  useEffect(() => {
    setDrugs((prev) => {
      const [first, ...rest] = prev;
      return [{ ...(first || { id: "drug-1", multiDose: false }), drugName }, ...rest];
    });
  }, [drugName]);

  const addDrug = () => {
    setDrugs((prev) => [
      ...prev,
      {
        id: `drug-${prev.length + 1}-${Date.now()}`,
        drugName: "氟尼辛葡甲胺注射液",
        multiDose: false
      }
    ]);
  };

  const toggleMultiDose = (id: string, checked: boolean) => {
    setDrugs((prev) => prev.map((item) => (item.id === id ? { ...item, multiDose: checked } : item)));
  };

  const deleteDrug = (id: string) => {
    setDrugs((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== id) : prev));
  };

  return (
    <div className="medical-prescription-form">
      <div className="medical-prescription-list-head">
        <div>
          <Title level={5}>处方药物</Title>
          <Text type="secondary">一份处方可以包含多个药物，按需要继续添加。</Text>
        </div>
      </div>
      <div className="medical-prescription-list">
        {drugs.map((item, index) => (
          <PrescriptionDrugBlock
            key={item.id}
            item={item}
            index={index}
            canDelete={drugs.length > 1}
            drugField={index === 0 ? drugField : undefined}
            onToggleMultiDose={toggleMultiDose}
            onDelete={deleteDrug}
          />
        ))}
      </div>
      <div className="medical-prescription-field-actions">
        <Button icon={<HistoryOutlined />}>历史处方</Button>
        <Button type="primary" ghost icon={<PlusOutlined />} onClick={addDrug}>
          添加药物
        </Button>
      </div>
    </div>
  );
}

function TreatmentFormStep({
  drugName,
  onBack,
  onNext
}: {
  drugName?: string;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <TaskConfigShell
      actions={(
        <>
          <Button onClick={onBack}>上一步</Button>
          <Button type="primary" onClick={onNext}>下一步</Button>
        </>
      )}
    >
      <TreatmentForm drugName={drugName} />
    </TaskConfigShell>
  );
}

function TaskPreview({
  kind,
  context,
  onBack
}: {
  kind: TaskKind;
  context: CreateTargetContext;
  onBack: () => void;
}) {
  const isVaccination = kind === "vaccination";
  const countText = `${context.pigs.length} 头`;

  return (
    <Card className="section-card medical-task-card medical-task-step-card" title="确认信息">
      <Space direction="vertical" size={10} className="medical-task-summary">
        <div>
          <Text type="secondary">任务类型</Text>
          <Text strong>{isVaccination ? "疫苗接种任务" : "治疗用药任务"}</Text>
        </div>
        <div>
          <Text type="secondary">{isVaccination ? "接种内容" : "治疗内容"}</Text>
          <Text strong>{isVaccination ? "非瘟灭活疫苗 · 肌内注射 · 2 毫升" : "阿莫西林注射液 · 肌内注射 · 5 毫升"}</Text>
        </div>
        <div>
          <Text type="secondary">执行时间</Text>
          <Text strong>{isVaccination ? "2026-02-10" : "2026-02-10 起，连续 3 天"}</Text>
        </div>
        <div>
          <Text type="secondary">目标猪只</Text>
          <Text strong>{countText}</Text>
        </div>
        {context.source === "disease" ? (
          <div>
            <Text type="secondary">筛选标签</Text>
            <Text strong>
              {[...context.criteria.diseases, ...context.criteria.symptoms].join("、")}
            </Text>
          </div>
        ) : null}
      </Space>
      <div className="medical-task-step-actions">
        <Button onClick={onBack}>上一步</Button>
        <Button type="primary">确认下发</Button>
      </div>
    </Card>
  );
}

function CreateHeader({
  title,
  description,
  onBack
}: {
  title: string;
  description: string;
  onBack: () => void;
}) {
  return (
    <div className="page-header">
      <div>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={onBack} className="medical-task-back-btn">
          返回健康诊疗
        </Button>
        <Title level={4} style={{ margin: 0 }}>
          {title}
        </Title>
        <Text type="secondary">{description}</Text>
      </div>
    </div>
  );
}

function CreateStepBar({ scheme, step }: { scheme: "A" | "B"; step: CreateStep }) {
  const schemeBItems = [
    { title: "选择猪只/疾病" },
    { title: "选择药品并填写信息" },
    { title: "确认下发" }
  ];
  const schemeBCurrent = step === "confirm" ? 2 : 1;
  const current =
    scheme === "B"
      ? schemeBCurrent
      : step === "drug"
        ? 1
        : step === "form"
          ? 2
          : 3;

  return (
    <Steps
      current={current}
      items={
        scheme === "B"
          ? schemeBItems
          : [
              { title: "选择猪只/疾病" },
              { title: "选择任务类型" },
              { title: "填写任务信息" },
              { title: "确认下发" }
            ]
      }
      style={{ marginBottom: 16 }}
    />
  );
}

function CreateTargetStrip({ context }: { context: CreateTargetContext }) {
  const isDiseaseSource = context.source === "disease";

  return (
    <div className="medical-create-target-strip">
      <div className="medical-create-target-strip__item">
        <Text type="secondary">创建对象</Text>
        <Text strong>{isDiseaseSource ? "按疾病批量创建" : "按选中猪只创建"}</Text>
      </div>
      <div className="medical-create-target-strip__item">
        <Text type="secondary">目标猪只</Text>
        <Text strong>{context.pigs.length} 头</Text>
      </div>
      <div className="medical-create-target-strip__item medical-create-target-strip__item--wide">
        <Text type="secondary">来源</Text>
        {isDiseaseSource ? (
          <div className="medical-create-target-tags">
            {context.criteria.diseases.map((tag) => <Tag color="green" key={tag}>{tag}</Tag>)}
            {context.criteria.symptoms.map((tag) => <Tag color="gold" key={tag}>{tag}</Tag>)}
          </div>
        ) : (
          <Text strong>健康诊疗 · 手动勾选</Text>
        )}
      </div>
    </div>
  );
}

function StepLayout({
  summary,
  children
}: {
  summary: ReactNode;
  children: ReactNode;
}) {
  return (
    <Row gutter={[16, 16]} className="medical-task-step-layout">
      <Col xs={24} lg={6} xl={5}>
        {summary}
      </Col>
      <Col xs={24} lg={18} xl={19}>
        {children}
      </Col>
    </Row>
  );
}

function SchemeBDrugStep({
  drug,
  setDrug,
  kind,
  drugName,
  onBack,
  onNext
}: {
  drug: string;
  setDrug: (drug: string) => void;
  kind: TaskKind;
  drugName: string;
  onBack: () => void;
  onNext: () => void;
}) {
  const isVaccination = kind === "vaccination";
  const drugPicker = (
    <label>
      <Text type="secondary">药品类型 / 药品</Text>
      <Cascader
        allowClear={false}
        value={getDrugPath(drug)}
        onChange={(value) => {
          const selectedValue = value[value.length - 1];
          if (typeof selectedValue === "string") {
            setDrug(selectedValue);
          }
        }}
        options={drugCatalogOptions}
        placeholder="请选择药品类型与药品"
        displayRender={(labels) => labels.join(" / ")}
      />
    </label>
  );

  return (
    <TaskConfigShell
      topContent={drugPicker}
      actions={(
        <>
        <Button onClick={onBack}>取消</Button>
        <Button type="primary" onClick={onNext}>下一步</Button>
        </>
      )}
    >
      {isVaccination ? (
        <VaccinationForm drugName={drugName} drugField={null} />
      ) : (
        <TreatmentForm drugName={drugName} drugField={null} />
      )}
    </TaskConfigShell>
  );
}

function FormStep({
  kind,
  drugName,
  onBack,
  onNext
}: {
  kind: TaskKind;
  drugName?: string;
  onBack: () => void;
  onNext: () => void;
}) {
  if (kind === "vaccination") {
    return (
      <VaccinationFormStep
        drugName={drugName}
        onBack={onBack}
        onNext={onNext}
      />
    );
  }

  return <TreatmentFormStep drugName={drugName} onBack={onBack} onNext={onNext} />;
}

function ConfirmStep({
  context,
  kind,
  onBack
}: {
  context: CreateTargetContext;
  kind: TaskKind;
  onBack: () => void;
}) {
  return (
    <StepLayout summary={<SelectedPigSummary context={context} />}>
      <TaskPreview kind={kind} context={context} onBack={onBack} />
    </StepLayout>
  );
}

function MedicalCreateFlow({
  scheme,
  source,
  context,
  step,
  kind,
  drug,
  setDrug,
  onBackHome,
  onStepChange
}: {
  scheme: "A" | "B";
  source: CreateSource;
  context: CreateTargetContext;
  step: CreateStep;
  kind: TaskKind;
  drug: string;
  setDrug: (drug: string) => void;
  onBackHome: () => void;
  onStepChange: (step: CreateStep) => void;
}) {
  const selectedDrug = useMemo(() => drugOptions.find((item) => item.value === drug) || drugOptions[0], [drug]);
  const resolvedKind = scheme === "A" ? kind : selectedDrug.type;

  return (
    <div>
      <CreateHeader
        title={scheme === "A" ? "创建医疗任务" : "按药品创建任务"}
        description={scheme === "A" ? "任务类型已选择，继续填写任务信息。" : "先选择药品，再按步骤填写对应信息。"}
        onBack={onBackHome}
      />
      <CreateStepBar scheme={scheme} step={step} />
      <CreateTargetStrip context={context} />

      {step === "drug" ? (
        <SchemeBDrugStep
          drug={drug}
          setDrug={setDrug}
          kind={selectedDrug.type}
          drugName={selectedDrug.label}
          onBack={onBackHome}
          onNext={() => onStepChange("confirm")}
        />
      ) : null}
      {step === "form" ? (
        <FormStep
          kind={resolvedKind}
          drugName={scheme === "B" ? selectedDrug.label : undefined}
          onBack={() => (scheme === "A" ? onBackHome() : onStepChange("drug"))}
          onNext={() => onStepChange("confirm")}
        />
      ) : null}
      {step === "confirm" ? (
        <ConfirmStep context={context} kind={resolvedKind} onBack={() => onStepChange(scheme === "A" ? "form" : "drug")} />
      ) : null}
    </div>
  );
}

export function MedicalTaskSchemePage({ scheme }: MedicalTaskSchemePageProps) {
  const [stage, setStage] = useState<FlowStage>("home");
  const [step, setStep] = useState<CreateStep>(scheme === "A" ? "form" : "drug");
  const [targetContext, setTargetContext] = useState<CreateTargetContext>({
    source: "selectedPigs",
    criteria: emptyDiseaseCriteria,
    pigs: pigRows.filter((pig) => pig.checked)
  });
  const [kind, setKind] = useState<TaskKind>("treatment");
  const [drug, setDrug] = useState("drug-amoxicillin");

  useEffect(() => {
    setStage("home");
    setStep(scheme === "A" ? "form" : "drug");
    setTargetContext({
      source: "selectedPigs",
      criteria: emptyDiseaseCriteria,
      pigs: pigRows.filter((pig) => pig.checked)
    });
    setKind("treatment");
    setDrug("drug-amoxicillin");
  }, [scheme]);

  useEffect(() => {
    document.querySelector<HTMLElement>(".app-content")?.scrollTo({ top: 0, left: 0 });
    window.scrollTo({ top: 0, left: 0 });
  }, [stage, step]);

  const startCreate = (context: CreateTargetContext) => {
    setTargetContext(context);
    setKind("treatment");
    setDrug("drug-amoxicillin");
    if (scheme === "A") {
      setStep("form");
      return;
    }
    setStep("drug");
    setStage("create");
  };

  const confirmTaskKind = () => {
    setStep("form");
    setStage("create");
  };

  if (stage === "home") {
    return (
      <div className="medical-task-page">
        <HealthDiagnosisHome
          scheme={scheme}
          onCreate={startCreate}
          taskKind={kind}
          onTaskKindChange={setKind}
          onConfirmTaskKind={confirmTaskKind}
        />
      </div>
    );
  }

  return (
    <div className="medical-task-page">
      <MedicalCreateFlow
        scheme={scheme}
        source={targetContext.source}
        context={targetContext}
        step={step}
        kind={kind}
        drug={drug}
        setDrug={setDrug}
        onBackHome={() => setStage("home")}
        onStepChange={setStep}
      />
    </div>
  );
}
