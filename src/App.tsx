import { useState } from "react";
import { Layout, Menu, Radio, Typography } from "antd";
import { VaccinePlanPage } from "./components/VaccinePlanPage";
import { VaccineCatalogPage } from "./components/VaccineCatalogPage";
import { VaccineTaskListPage, TaskRow } from "./components/VaccineTaskListPage";
import { VaccineTaskSelectPage } from "./components/VaccineTaskSelectPage";
import { VaccineTaskWizard, type VaccineTaskDraft } from "./components/VaccineTaskWizard";
import { VaccineTaskDetailPage } from "./components/VaccineTaskDetailPage";
import { CullingPlanPage, CullingTaskDetailPage } from "./components/culling";
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

type WorkspaceMode = "console" | "mobile";
type VaccineTaskFlowMode = "create" | "edit" | "supplement";
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
    status: "待接种",
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
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>("console");
  const [consoleActiveKey, setConsoleActiveKey] = useState("plan");
  const [taskStep, setTaskStep] = useState<"tasks" | "select" | "form" | "preview" | "detail">(
    "tasks"
  );
  const [taskFlowMode, setTaskFlowMode] = useState<VaccineTaskFlowMode>("create");
  const [selectedPigs, setSelectedPigs] = useState<string[]>([]);
  const [taskDraft, setTaskDraft] = useState<VaccineTaskDraft | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TaskRow[]>(SEED_TASKS);
  const [mobilePigTasks, setMobilePigTasks] = useState<MobilePigTask[]>(() =>
    seedMobileTasksFromConsole(SEED_TASKS)
  );
  const [mobileLogs, setMobileLogs] = useState<MobileExecutionLog[]>([]);
  const activeKey = workspaceMode === "console" ? consoleActiveKey : "mobile-vacc";
  const tasksWithSupplementState = tasks.map((task) => ({
    ...task,
    needsSupplement:
      task.status === "已完成" &&
      mobilePigTasks.some((pigTask) => pigTask.taskId === task.id && pigTask.status !== "completed")
  }));
  const activeTask = tasks.find((task) => task.id === activeTaskId) || null;
  const consoleMenuItems = [
    {
      key: "immunity",
      label: "免疫",
      children: [
        { key: "plan", label: "疫苗计划配置" },
        { key: "task", label: "疫苗任务" }
      ]
    },
    {
      key: "pig-culling",
      label: "淘汰&留种",
      children: [{ key: "culling-plan", label: "母猪淘汰&后备留种" }]
    },
    {
      key: "settings",
      label: "设置",
      children: [{ key: "vaccine-settings", label: "疫苗管理" }]
    }
  ];

  return (
    <Layout className={`app-shell app-shell--${workspaceMode}`} style={{ minHeight: "100vh" }}>
      <Sider width={220} className="app-sider">
        <div className="sider-logo">
          <Title level={5} style={{ margin: 0 }}>
            智慧养殖
          </Title>
          <span className="sider-sub">{workspaceMode === "console" ? "Console" : "Mobile"}</span>
          <Radio.Group
            className="workspace-mode-switch"
            optionType="button"
            buttonStyle="solid"
            value={workspaceMode}
            onChange={(event) => setWorkspaceMode(event.target.value)}
          >
            <Radio.Button value="console">Console</Radio.Button>
            <Radio.Button value="mobile">Mobile</Radio.Button>
          </Radio.Group>
        </div>
        {workspaceMode === "console" ? (
          <Menu
            mode="inline"
            selectedKeys={[activeKey]}
            defaultOpenKeys={["immunity", "pig-culling"]}
            onClick={(info) => setConsoleActiveKey(info.key)}
            items={consoleMenuItems}
          />
        ) : null}
      </Sider>
      <Layout>
        <Content className="app-content">
          {activeKey === "plan" ? (
            <VaccinePlanPage />
          ) : activeKey === "culling-plan" ? (
            <CullingPlanPage onOpenTaskDetail={() => setConsoleActiveKey("culling-detail")} />
          ) : activeKey === "culling-detail" ? (
            <CullingTaskDetailPage onBack={() => setConsoleActiveKey("culling-plan")} />
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
                  tasks={tasksWithSupplementState}
                  onCreateTask={() => {
                    setTaskFlowMode("create");
                    setEditingTaskId(null);
                    setTaskDraft(null);
                    setSelectedPigs([]);
                    setActiveTaskId(null);
                    setTaskStep("select");
                  }}
                  onViewTask={(taskId) => {
                    setTaskFlowMode("create");
                    setEditingTaskId(null);
                    setActiveTaskId(taskId);
                    setTaskStep("detail");
                  }}
                  onDeleteTask={(taskId) => {
                    setTasks((prev) => prev.filter((task) => task.id !== taskId));
                    setMobilePigTasks((prev) =>
                      prev.filter((task) => task.taskId !== taskId && task.batchId !== taskId)
                    );
                    if (activeTaskId === taskId) {
                      setActiveTaskId(null);
                    }
                  }}
                />
              )}
              {taskStep === "detail" && activeTask ? (
                <VaccineTaskDetailPage
                  task={activeTask}
                  pigTasks={mobilePigTasks.filter((task) => task.taskId === activeTask.id)}
                  logs={mobileLogs.filter((log) => log.pigTaskId.startsWith(`${activeTask.id}__`))}
                  onBack={() => setTaskStep("tasks")}
                  onEdit={
                    activeTask.status === "待接种"
                      ? () => {
                          setTaskFlowMode("edit");
                          setEditingTaskId(activeTask.id);
                          setTaskDraft({
                            vaccineId:
                              vaccineCatalog.find((item) => item.nameCn === activeTask.vaccine)?.vaccineId || "",
                            vaccineName: activeTask.vaccine,
                            brand: activeTask.brand === "-" ? undefined : activeTask.brand,
                            vaccinationMethod: activeTask.administrationRoute,
                            dosage: Number(String(activeTask.dosage).replace(/[^\d.]/g, "")) || 1,
                            dosageUnit: activeTask.dosage.includes("毫升") ? "毫升" : "毫克",
                            date: activeTask.schedule
                          });
                          setSelectedPigs(
                            activeTask.pigIds && activeTask.pigIds.length > 0
                              ? activeTask.pigIds
                              : mobilePigTasks
                                  .filter((task) => task.taskId === activeTask.id)
                                  .map((task) => task.pigId)
                          );
                          setTaskStep("select");
                        }
                      : undefined
                  }
                  onSupplement={
                    activeTask.status === "已完成"
                      ? (pigIds) => {
                          const dosageValue = Number(String(activeTask.dosage).replace(/[^\d.]/g, "")) || 1;
                          setTaskFlowMode("supplement");
                          setEditingTaskId(null);
                          setTaskDraft({
                            vaccineId:
                              vaccineCatalog.find((item) => item.nameCn === activeTask.vaccine)?.vaccineId || "",
                            vaccineName: activeTask.vaccine,
                            brand: activeTask.brand === "-" ? undefined : activeTask.brand,
                            vaccinationMethod: activeTask.administrationRoute,
                            dosage: dosageValue,
                            dosageUnit: activeTask.dosage.includes("毫升") ? "毫升" : "毫克",
                            date: undefined
                          });
                          setSelectedPigs(pigIds);
                          setTaskStep("select");
                        }
                      : undefined
                  }
                  onDelete={
                    activeTask.status === "待接种"
                      ? () => {
                          setTasks((prev) => prev.filter((task) => task.id !== activeTask.id));
                          setMobilePigTasks((prev) =>
                            prev.filter((task) => task.taskId !== activeTask.id && task.batchId !== activeTask.id)
                          );
                          setActiveTaskId(null);
                          setTaskStep("tasks");
                        }
                      : undefined
                  }
                />
              ) : null}
              {taskStep === "select" && (
                <VaccineTaskSelectPage
                  selectedPigs={selectedPigs}
                  onSelectionChange={setSelectedPigs}
                  onCreateTask={() => setTaskStep("form")}
                  onBack={() => {
                    if (editingTaskId || taskFlowMode === "supplement") {
                      setTaskStep("detail");
                    } else {
                      setTaskStep("tasks");
                    }
                  }}
                />
              )}
              {taskStep === "form" && (
                <VaccineTaskWizard
                  step="form"
                  selectedPigs={selectedPigs}
                  mode={taskFlowMode}
                  payload={taskDraft}
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
                  mode={taskFlowMode}
                  payload={taskDraft}
                  onBack={() => setTaskStep("form")}
                  onFinish={() => {
                    if (taskDraft) {
                      const editingTask = editingTaskId
                        ? tasks.find((task) => task.id === editingTaskId)
                        : undefined;
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
                      const newTask: TaskRow = {
                        id: editingTaskId || generateConsoleTaskId(),
                        vaccine: taskDraft.vaccineName || "-",
                        brand: brandLine,
                        dosageForm: pres.dosageForm,
                        administrationRoute: taskDraft.vaccinationMethod || pres.administrationRoute,
                        dosage: dosageStr,
                        schedule: taskDraft.date || "-",
                        doseTimes: 1,
                        immuneIntervalDays: brandCfg?.immuneIntervalDays,
                        targetCount: cover,
                        status: "待接种",
                        creator: editingTask?.creator || "当前用户",
                        createdAt: editingTask?.createdAt || "2026-02-10 09:00",
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
                      if (editingTaskId) {
                        setMobilePigTasks((prev) => [
                          ...pigLines,
                          ...prev.filter((task) => task.taskId !== editingTaskId && task.batchId !== editingTaskId)
                        ]);
                        setTasks((prev) =>
                          prev.map((task) => (task.id === editingTaskId ? newTask : task))
                        );
                        setActiveTaskId(editingTaskId);
                        setTaskStep("detail");
                      } else {
                        setMobilePigTasks((prev) => [...pigLines, ...prev]);
                        setTasks((prev) => [newTask, ...prev]);
                        setTaskStep("tasks");
                      }
                    }
                    setTaskDraft(null);
                    setSelectedPigs([]);
                    setEditingTaskId(null);
                    setTaskFlowMode("create");
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
