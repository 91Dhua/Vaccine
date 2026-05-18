import { useState } from "react";
import dayjs from "dayjs";
import { Layout, Menu, Modal, Radio, Typography, message } from "antd";
import { VaccinePlanPage } from "./components/VaccinePlanPage";
import { VaccineCatalogPage } from "./components/VaccineCatalogPage";
import { VaccineTaskListPage, TaskRow } from "./components/VaccineTaskListPage";
import { VaccineTaskSelectPage } from "./components/VaccineTaskSelectPage";
import { VaccineTaskWizard, type VaccineTaskDraft } from "./components/VaccineTaskWizard";
import { VaccineTaskDetailPage } from "./components/VaccineTaskDetailPage";
import {
  ReviewSamplingManagementPage,
  buildSeedReviewSamplingTasks,
  type ReviewSamplingSampleRow,
  type ReviewSamplingTaskRow
} from "./components/ReviewSamplingManagementPage";
import { CullingPlanPage, CullingTaskDetailPage } from "./components/culling";
import { MobileVaccinationPage } from "./components/MobileVaccinationPage";
import { MobileSimulationShell } from "./mobileSimulationContext";
import { generateConsoleTaskId } from "./consoleTaskId";
import { vaccineCatalog } from "./mockData";
import { getPigMobileMeta } from "./pigMeta";
import {
  buildMobilePigTasksFromBatch,
  resolveTaskVaccinePresentation,
  seedMobileTasksFromConsole,
  type MobileExecutionLog,
  type MobilePigTask
} from "./mobileVaccinationUtils";
import type { PlanEffectTrackingStored } from "./planEffectTracking";

const { Content, Sider } = Layout;
const { Title } = Typography;

type WorkspaceMode = "console" | "mobile";
type VaccineTaskFlowMode = "create" | "edit" | "supplement" | "quickSupplement";
type VaccineSupplementContext = {
  sourceTaskId: string;
  mode: "pending-only" | "review-full";
} | null;
const SEED_REVIEW_CONFIG: PlanEffectTrackingStored = {
  effectTrackingEnabled: true,
  targetAntibody: "非洲猪瘟病毒抗体",
  samplingMethod: "EAR_VEIN",
  sampleContainer: "BLOOD_TUBE",
  samplingIntervalDays: 28,
  samplingRatioPercent: 5,
  qualificationThresholdPercent: 80
};

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
    exemptionHitCount: 1,
    effectTracking: SEED_REVIEW_CONFIG
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
    dosageUnit: "毫升",
    effectTracking: {
      effectTrackingEnabled: true,
      targetAntibody: "蓝耳病毒抗体",
      samplingMethod: "FRONT_VENA",
      sampleContainer: "REAGENT_BAG_BLOOD",
      samplingIntervalDays: 21,
      samplingRatioPercent: 8,
      qualificationThresholdPercent: 85
    }
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
    targetCount: 12,
    status: "已完成",
    creator: "赵磊",
    createdAt: "2026-01-18 11:30",
    executor: "陈雨",
    executedAt: "2026-01-20 10:10",
    dosageUnit: "毫升",
    pigIds: [
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
    targetPigGroupLabel: "生产一区母猪车间",
    exemptionHitCount: 2,
    planName: "冬季伪狂犬加强计划",
    planType: "普免计划",
    planCreatedAt: "2026-01-10 08:30",
    planStatus: "启用中",
    effectTracking: {
      effectTrackingEnabled: true,
      targetAntibody: "伪狂犬病毒抗体",
      samplingMethod: "TAIL_VEIN",
      sampleContainer: "REAGENT_BAG",
      samplingIntervalDays: 30,
      samplingRatioPercent: 10,
      qualificationThresholdPercent: 90
    },
    effectTrackingResult: {
      sampledCount: 20,
      qualifiedCount: 14,
      qualificationRatePercent: 70,
      result: "不合格"
    }
  },
  {
    id: "VT-DEMO-6H5C",
    vaccine: "圆环病毒疫苗",
    brand: "硕腾",
    dosageForm: "灭活疫苗",
    administrationRoute: "肌内注射",
    dosage: "2 毫升",
    schedule: "2026-01-26",
    doseTimes: 1,
    targetCount: 10,
    status: "已完成",
    creator: "徐倩",
    createdAt: "2026-01-24 16:20",
    executor: "陈晓",
    executedAt: "2026-01-26 09:40",
    dosageUnit: "毫升",
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
      "pig-1009"
    ],
    targetPigGroupLabel: "生产一区母猪车间",
    exemptionHitCount: 1,
    planName: "圆环免疫抽检计划",
    planType: "普免计划",
    planCreatedAt: "2026-01-18 14:00",
    planStatus: "启用中",
    effectTracking: {
      effectTrackingEnabled: true,
      targetAntibody: "圆环病毒抗体",
      samplingMethod: "EAR_VEIN",
      sampleContainer: "BLOOD_TUBE",
      samplingIntervalDays: 21,
      samplingRatioPercent: 10,
      qualificationThresholdPercent: 85
    }
  },
  {
    id: "VT-DEMO-3L8N",
    vaccine: "蓝耳灭活疫苗",
    brand: "勃林格",
    dosageForm: "灭活疫苗",
    administrationRoute: "肌内注射",
    dosage: "2 毫升",
    schedule: "2026-02-03",
    doseTimes: 1,
    targetCount: 8,
    status: "已完成",
    creator: "孙晴",
    createdAt: "2026-02-01 10:15",
    executor: "顾晨",
    executedAt: "2026-02-03 13:20",
    dosageUnit: "毫升",
    pigIds: [
      "pig-1008",
      "pig-1009",
      "pig-1010",
      "pig-1011",
      "pig-1012",
      "pig-1013",
      "pig-1014",
      "pig-1015"
    ],
    targetPigGroupLabel: "生产一区母猪车间",
    exemptionHitCount: 1,
    planName: "蓝耳春季复核计划",
    planType: "跟批免疫",
    planCreatedAt: "2026-01-28 09:10",
    planStatus: "启用中",
    effectTracking: {
      effectTrackingEnabled: true,
      targetAntibody: "蓝耳病毒抗体",
      samplingMethod: "FRONT_VENA",
      sampleContainer: "REAGENT_BAG_BLOOD",
      samplingIntervalDays: 14,
      samplingRatioPercent: 8,
      qualificationThresholdPercent: 80
    }
  },
  {
    id: "VT-DEMO-5Q2W",
    vaccine: "猪瘟活疫苗",
    brand: "海利",
    dosageForm: "活疫苗",
    administrationRoute: "肌内注射",
    dosage: "1 毫升",
    doseTimes: 1,
    schedule: "2026-02-06",
    targetCount: 6,
    status: "已完成",
    creator: "林悦",
    createdAt: "2026-02-04 15:40",
    executor: "徐亮",
    executedAt: "2026-02-06 11:00",
    dosageUnit: "毫升",
    pigIds: [
      "pig-1000",
      "pig-1002",
      "pig-1004",
      "pig-1006",
      "pig-1008",
      "pig-1010"
    ],
    targetPigGroupLabel: "生产一区母猪车间",
    exemptionHitCount: 0,
    planName: "猪瘟季度监测计划",
    planType: "普免计划",
    planCreatedAt: "2026-02-01 08:20",
    planStatus: "启用中",
    effectTracking: {
      effectTrackingEnabled: true,
      targetAntibody: "猪瘟病毒抗体",
      samplingMethod: "TAIL_VEIN",
      sampleContainer: "BLOOD_TUBE",
      samplingIntervalDays: 18,
      samplingRatioPercent: 6,
      qualificationThresholdPercent: 78
    }
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
  const [supplementContext, setSupplementContext] = useState<VaccineSupplementContext>(null);
  const [tasks, setTasks] = useState<TaskRow[]>(SEED_TASKS);
  const [reviewSamplingTasks, setReviewSamplingTasks] = useState<ReviewSamplingTaskRow[]>(() =>
    buildSeedReviewSamplingTasks(SEED_TASKS)
  );
  const [mobilePigTasks, setMobilePigTasks] = useState<MobilePigTask[]>(() =>
    seedMobileTasksFromConsole(SEED_TASKS)
  );
  const [mobileLogs, setMobileLogs] = useState<MobileExecutionLog[]>([]);
  const activeKey = workspaceMode === "console" ? consoleActiveKey : "mobile-vacc";
  const tasksWithSupplementState = tasks.map((task) => {
    const isCompleted = task.status === "已完成";
    const childTasks = tasks.filter((item) => item.supplementSourceTaskId === task.id);
    const pendingSupplementTask = childTasks.find((item) => item.supplementMode === "pending-only");
    const reviewSupplementTask = childTasks.find((item) => item.supplementMode === "review-full");
    const hasPendingIssue =
      isCompleted && mobilePigTasks.some((pigTask) => pigTask.taskId === task.id && pigTask.status !== "completed");
    const hasReviewIssue = isCompleted && task.effectTrackingResult?.result === "不合格";

    const currentPendingReason =
      hasPendingIssue &&
      !reviewSupplementTask &&
      !(pendingSupplementTask && pendingSupplementTask.status === "已完成");
    const currentReviewReason =
      hasReviewIssue && !(reviewSupplementTask && reviewSupplementTask.status === "已完成");

    const pendingUnhandled = currentPendingReason && !pendingSupplementTask;
    const reviewUnhandled = currentReviewReason && !reviewSupplementTask;
    const hasUnhandled = pendingUnhandled || reviewUnhandled;

    const processing =
      !hasUnhandled &&
      ((currentPendingReason && !!pendingSupplementTask && pendingSupplementTask.status !== "已完成") ||
        (currentReviewReason && !!reviewSupplementTask && reviewSupplementTask.status !== "已完成"));

    const completed =
      !hasUnhandled &&
      !processing &&
      ((hasPendingIssue && (!!reviewSupplementTask || pendingSupplementTask?.status === "已完成")) ||
        (hasReviewIssue && reviewSupplementTask?.status === "已完成"));

    const supplementStatus: TaskRow["supplementStatus"] = hasUnhandled
      ? "需补打"
      : processing
        ? "补打处理中"
        : completed
          ? "补打已完成"
          : undefined;

    const supplementReason =
      supplementStatus === "需补打" || supplementStatus === "补打处理中"
        ? [currentPendingReason ? "未接种" : null, currentReviewReason ? "复核不合格" : null]
            .filter(Boolean)
            .join("、") || undefined
        : supplementStatus === "补打已完成"
          ? hasReviewIssue && reviewSupplementTask?.status === "已完成"
            ? "复核不合格"
            : hasPendingIssue && (pendingSupplementTask?.status === "已完成" || reviewSupplementTask?.status === "已完成")
              ? "未接种"
              : undefined
          : undefined;

    const arrangedSupplementPigIds = Array.from(
      new Set(
        childTasks.flatMap((item) => (item.pigIds && item.pigIds.length > 0 ? item.pigIds : []))
      )
    );
    const hasPendingSupplementCoveredByReview =
      hasPendingIssue && !!reviewSupplementTask && !pendingSupplementTask;

    return {
      ...task,
      needsSupplement: supplementStatus === "需补打",
      supplementStatus,
      supplementReason,
      hasPendingSupplementNeed: currentPendingReason,
      hasReviewSupplementNeed: currentReviewReason,
      hasPendingSupplementCoveredByReview,
      arrangedSupplementPigIds
    };
  });
  const activeTask = tasksWithSupplementState.find((task) => task.id === activeTaskId) || null;
  const consoleMenuItems = [
    {
      key: "immunity",
      label: "免疫",
      children: [
        { key: "plan", label: "疫苗计划配置" },
        { key: "task", label: "疫苗任务" },
        { key: "review-sampling", label: "免疫复核采样" }
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
          ) : activeKey === "review-sampling" ? (
            <ReviewSamplingManagementPage
              tasks={tasksWithSupplementState}
              reviewTasks={reviewSamplingTasks}
              onOpenVaccinationTask={(taskId) => {
                setActiveTaskId(taskId);
                setTaskStep("detail");
                setConsoleActiveKey("task");
              }}
              onSubmitResults={(reviewTaskId, samples, measurementUnit) => {
                const linkedReviewTask = reviewSamplingTasks.find((item) => item.id === reviewTaskId);
                if (!linkedReviewTask) return;
                const qualifiedCount = samples.filter((item) => item.result === "阳性").length;
                const sampledCount = samples.length;
                const qualificationRatePercent = sampledCount > 0 ? Math.round((qualifiedCount / sampledCount) * 100) : 0;
                const result = qualificationRatePercent >= linkedReviewTask.thresholdPercent ? "合格" : "不合格";

                setReviewSamplingTasks((prev) =>
                  prev.map((task) =>
                    task.id === reviewTaskId
                      ? {
                          ...task,
                          status: "已检测",
                          measurementUnit,
                          samples,
                          positiveCount: qualifiedCount,
                          negativeCount: sampledCount - qualifiedCount,
                          qualificationRatePercent,
                          result
                        }
                      : task
                  )
                );
                if (linkedReviewTask.vaccinationTaskId) {
                  setTasks((prev) =>
                    prev.map((task) =>
                      task.id === linkedReviewTask.vaccinationTaskId
                        ? {
                            ...task,
                            effectTrackingResult: {
                              sampledCount,
                              qualifiedCount,
                              qualificationRatePercent,
                              result
                            }
                          }
                        : task
                    )
                  );
                }
              }}
              onCreateAntibodySamplingTask={({ pigIds, targetAntibody, samplingMethod, sampleContainer, thresholdPercent }) => {
                const reviewTaskId = `RS-MAN-${generateConsoleTaskId().replace(/^VT-/, "")}`;
                const createdAt = dayjs().format("YYYY-MM-DD HH:mm");
                const samples: ReviewSamplingSampleRow[] = pigIds.map((pigId, index) => {
                  const meta = getPigMobileMeta(pigId);
                  return {
                    id: `${reviewTaskId}-sample-${index + 1}`,
                    sampleId: `${reviewTaskId}-${String(index + 1).padStart(2, "0")}`,
                    pigId,
                    earTag: meta.earTag,
                    roomLabel: meta.roomLabel,
                    stallNo: meta.stallNo,
                    targetAntibody
                  };
                });

                setReviewSamplingTasks((prev) => [
                  {
                    id: reviewTaskId,
                    vaccinationTaskId: "",
                    vaccinationTaskType: "原始接种",
                    targetAntibody,
                    sampledCount: pigIds.length,
                    thresholdPercent,
                    createdAt,
                    status: "待采样",
                    samplingMethod,
                    sampleContainer,
                    measurementUnit: "S/P值",
                    samples
                  },
                  ...prev
                ]);
              }}
            />
          ) : activeKey === "task" ? (
            <div>
              {taskStep === "tasks" && (
                <VaccineTaskListPage
                  tasks={tasksWithSupplementState}
                  onCreateTask={() => {
                    setTaskFlowMode("create");
                    setEditingTaskId(null);
                    setSupplementContext(null);
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
                            date: activeTask.schedule,
                            effectTracking: activeTask.effectTracking
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
                    activeTask.supplementStatus === "需补打"
                      ? ({ pigIds, mode }) => {
                          const dosageValue = Number(String(activeTask.dosage).replace(/[^\d.]/g, "")) || 1;
                          const arrangedPigIds = new Set(activeTask.arrangedSupplementPigIds || []);
                          const finalPigIds =
                            mode === "review-full"
                              ? pigIds.filter((pigId) => !arrangedPigIds.has(pigId))
                              : pigIds;
                          const startSupplementFlow = (targetPigIds: string[]) => {
                            setTaskFlowMode("quickSupplement");
                            setEditingTaskId(null);
                            setSupplementContext({
                              sourceTaskId: activeTask.id,
                              mode
                            });
                            setTaskDraft({
                              vaccineId:
                                vaccineCatalog.find((item) => item.nameCn === activeTask.vaccine)?.vaccineId || "",
                              vaccineName: activeTask.vaccine,
                              brand: activeTask.brand === "-" ? undefined : activeTask.brand,
                              vaccinationMethod: activeTask.administrationRoute,
                              dosage: dosageValue,
                              dosageUnit: activeTask.dosage.includes("毫升") ? "毫升" : "毫克",
                              date: dayjs().format("YYYY-MM-DD"),
                              effectTracking: activeTask.effectTracking
                            });
                            setSelectedPigs(targetPigIds);
                            setTaskStep("preview");
                          };

                          if (mode === "review-full" && arrangedPigIds.size > 0) {
                            if (finalPigIds.length === 0) {
                              message.info("已安排补打的猪只已覆盖本次重新接种范围。");
                              return;
                            }
                            Modal.confirm({
                              title: "确认重新接种",
                              content: `该任务下已有部分猪只被安排补充接种，这些猪只不会再次加入本次重新接种任务。本次将为剩余 ${finalPigIds.length} 头猪创建重新接种任务。`,
                              okText: "确认创建",
                              cancelText: "取消",
                              onOk: () => startSupplementFlow(finalPigIds)
                            });
                            return;
                          }

                          startSupplementFlow(finalPigIds);
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
                        setSupplementContext(null);
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
                    if (editingTaskId || taskFlowMode === "supplement" || taskFlowMode === "quickSupplement") {
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
                  quickSupplementType={supplementContext?.mode ?? null}
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
                  quickSupplementType={supplementContext?.mode ?? null}
                  onBack={() => setTaskStep(taskFlowMode === "quickSupplement" ? "detail" : "form")}
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
                        exemptionHitCount,
                        effectTracking: taskDraft.effectTracking,
                        supplementSourceTaskId: supplementContext?.sourceTaskId,
                        supplementMode: supplementContext?.mode
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
                    setSupplementContext(null);
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
