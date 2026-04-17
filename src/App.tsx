import { useState } from "react";
import { Layout, Menu, Typography } from "antd";
import { VaccinePlanPage } from "./components/VaccinePlanPage";
import { VaccineCatalogPage } from "./components/VaccineCatalogPage";
import { VaccineTaskListPage, TaskRow } from "./components/VaccineTaskListPage";
import { VaccineTaskSelectPage } from "./components/VaccineTaskSelectPage";
import { VaccineTaskWizard } from "./components/VaccineTaskWizard";
import { CullingMobilePage, CullingPlanPage, CullingTaskPage } from "./components/culling";
import { MobileVaccinationPage } from "./components/MobileVaccinationPage";
import { MobileSimulationShell } from "./mobileSimulationContext";
import { generateConsoleTaskId } from "./consoleTaskId";
import { vaccineCatalog } from "./mockData";
import {
  buildMobilePigTasksFromBatch,
  resolveTaskVaccinePresentation,
  seedMobileTasksFromConsole,
  type MobileExecutionLog,
  type MobilePigTask
} from "./mobileVaccinationUtils";

const { Content, Sider } = Layout;
const { Title } = Typography;

const SEED_TASKS: TaskRow[] = [
  {
    id: "VT-DEMO-7K2M",
    vaccine: "非瘟灭活疫苗",
    brand: "佰特生物",
    dosageForm: "油佐剂灭活疫苗",
    administrationRoute: "肌内注射",
    dosage: "2 毫克",
    schedule: "2026-02-10",
    doseTimes: 1,
    targetCount: 16,
    status: "未开始",
    creator: "王敏",
    createdAt: "2026-02-09 09:20",
    pigIds: [
      "pig-1000",
      "pig-1001",
      "pig-1002",
      "pig-1003",
      "pig-1004",
      "pig-1005",
      "pig-1006",
      "pig-1007",
      "pig-1008",
      "pig-1009",
      "pig-1010",
      "pig-1011",
      "pig-1012",
      "pig-1013",
      "pig-1014",
      "pig-1015"
    ],
    dosageUnit: "毫克",
    targetPigGroupLabel: "繁育母猪 · A/B 区",
    exemptionHitCount: 1
  },
  {
    id: "VT-DEMO-9P3Q",
    vaccine: "蓝耳二联疫苗",
    brand: "百利",
    dosageForm: "活疫苗（冻干苗）",
    administrationRoute: "肌内注射、皮下注射",
    dosage: "1 毫升",
    schedule: "2026-02-09",
    doseTimes: 2,
    intervalValue: 12,
    intervalUnit: "小时",
    targetCount: 80,
    status: "进行中",
    creator: "李刚",
    createdAt: "2026-02-08 15:10",
    executor: "周婷",
    executedAt: "2026-02-09 14:10",
    dosageUnit: "毫升"
  },
  {
    id: "VT-DEMO-1R4N",
    vaccine: "伪狂犬疫苗",
    brand: "百利",
    dosageForm: "活疫苗（冻干苗）",
    administrationRoute: "肌内注射",
    dosage: "1.5 毫升",
    schedule: "2026-01-20",
    doseTimes: 1,
    targetCount: 150,
    status: "已完成",
    creator: "赵磊",
    createdAt: "2026-01-18 11:30",
    executor: "陈雨",
    executedAt: "2026-01-20 10:10",
    dosageUnit: "毫升"
  }
];

export default function App() {
  const [activeKey, setActiveKey] = useState("plan");
  const [taskStep, setTaskStep] = useState<"tasks" | "select" | "form" | "preview">(
    "tasks"
  );
  const [selectedPigs, setSelectedPigs] = useState<string[]>([]);
  const [taskDraft, setTaskDraft] = useState<any>(null);
  const [tasks, setTasks] = useState<TaskRow[]>(SEED_TASKS);
  const [mobilePigTasks, setMobilePigTasks] = useState<MobilePigTask[]>(() =>
    seedMobileTasksFromConsole(SEED_TASKS)
  );
  const [mobileLogs, setMobileLogs] = useState<MobileExecutionLog[]>([]);

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider width={220} className="app-sider">
        <div className="sider-logo">
          <Title level={5} style={{ margin: 0 }}>
            智慧养殖
          </Title>
          <span className="sider-sub">Console</span>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[activeKey]}
          defaultOpenKeys={["immunity", "pig-culling"]}
          onClick={(info) => setActiveKey(info.key)}
          items={[
            {
              key: "immunity",
              label: "免疫",
              children: [
                { key: "plan", label: "疫苗计划配置" },
                { key: "task", label: "疫苗任务" },
                { key: "mobile-vacc", label: "Mobile接种" }
              ]
            },
            {
              key: "pig-culling",
              label: "猪只淘汰",
              children: [
                { key: "culling-plan", label: "淘汰&补充" },
                { key: "culling-task", label: "淘汰任务" },
                { key: "culling-mobile", label: "淘汰mobile" }
              ]
            },
            {
              key: "settings",
              label: "设置",
              children: [{ key: "vaccine-settings", label: "疫苗管理" }]
            }
          ]}
        />
      </Sider>
      <Layout>
        <Content className="app-content">
          {activeKey === "plan" ? (
            <VaccinePlanPage />
          ) : activeKey === "culling-plan" ? (
            <CullingPlanPage />
          ) : activeKey === "culling-task" ? (
            <CullingTaskPage />
          ) : activeKey === "culling-mobile" ? (
            <CullingMobilePage />
          ) : activeKey === "mobile-vacc" ? (
            <MobileSimulationShell>
              <MobileVaccinationPage
                pigTasks={mobilePigTasks}
                setPigTasks={setMobilePigTasks}
                logs={mobileLogs}
                setLogs={setMobileLogs}
              />
            </MobileSimulationShell>
          ) : activeKey === "task" ? (
            <div>
              {taskStep === "tasks" && (
                <VaccineTaskListPage
                  tasks={tasks}
                  onCreateTask={() => setTaskStep("select")}
                />
              )}
              {taskStep === "select" && (
                <VaccineTaskSelectPage
                  selectedPigs={selectedPigs}
                  onSelectionChange={setSelectedPigs}
                  onCreateTask={() => setTaskStep("form")}
                  onBack={() => setTaskStep("tasks")}
                />
              )}
              {taskStep === "form" && (
                <VaccineTaskWizard
                  step="form"
                  selectedPigs={selectedPigs}
                  onBack={() => setTaskStep("select")}
                  onNext={(payload) => {
                    setTaskDraft(payload);
                    setTaskStep("preview");
                  }}
                />
              )}
              {taskStep === "preview" && (
                <VaccineTaskWizard
                  step="preview"
                  selectedPigs={selectedPigs}
                  payload={taskDraft}
                  onBack={() => setTaskStep("form")}
                  onFinish={() => {
                    if (taskDraft) {
                      const dosageUnit = String(taskDraft.dosageUnit || "").trim() || "毫克";
                      const cover = selectedPigs.length;
                      const exemptionHitCount =
                        cover === 0
                          ? 0
                          : Math.min(cover, Math.max(1, Math.ceil(cover * 0.1)));
                      const doseVal = taskDraft.dosage;
                      const dosageStr =
                        doseVal != null && String(doseVal).trim() !== ""
                          ? `${doseVal} ${dosageUnit}`.trim()
                          : "";
                      const brandLine = taskDraft.brand || "-";
                      const pres = resolveTaskVaccinePresentation(
                        String(taskDraft.vaccineName || ""),
                        brandLine === "-" ? "" : brandLine
                      );
                      const vaccineCat = vaccineCatalog.find(
                        (c) => c.nameCn === String(taskDraft.vaccineName || "")
                      );
                      const brandCfg = vaccineCat?.brands.find(
                        (b) => b.brandNameCn === brandLine
                      );
                      const multi = Boolean(taskDraft.multiDose);
                      const newTask: TaskRow = {
                        id: generateConsoleTaskId(),
                        vaccine: taskDraft.vaccineName || "-",
                        brand: brandLine,
                        dosageForm: pres.dosageForm,
                        administrationRoute: pres.administrationRoute,
                        dosage: dosageStr,
                        schedule: taskDraft.date || "-",
                        doseTimes: Number(taskDraft.times) > 0 ? Number(taskDraft.times) : 1,
                        intervalValue:
                          multi && taskDraft.intervalValue != null
                            ? Number(taskDraft.intervalValue)
                            : undefined,
                        intervalUnit:
                          multi && String(taskDraft.intervalUnit ?? "").trim()
                            ? String(taskDraft.intervalUnit).trim()
                            : undefined,
                        immuneIntervalDays: brandCfg?.immuneIntervalDays,
                        targetCount: cover,
                        status: "未开始",
                        creator: "当前用户",
                        createdAt: "2026-02-10 09:00",
                        pigIds: [...selectedPigs],
                        dosageUnit,
                        targetPigGroupLabel: `已选猪只（${cover} 头）`,
                        exemptionHitCount
                      };
                      const pigLines = buildMobilePigTasksFromBatch(
                        newTask,
                        selectedPigs,
                        exemptionHitCount
                      );
                      setMobilePigTasks((prev) => [...pigLines, ...prev]);
                      setTasks((prev) => [newTask, ...prev]);
                    }
                    setTaskDraft(null);
                    setSelectedPigs([]);
                    setTaskStep("tasks");
                  }}
                />
              )}
            </div>
          ) : (
            <VaccineCatalogPage />
          )}
        </Content>
      </Layout>
    </Layout>
  );
}
