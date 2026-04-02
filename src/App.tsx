import { useState } from "react";
import { Layout, Menu, Typography } from "antd";
import { VaccinePlanPage } from "./components/VaccinePlanPage";
import { VaccineCatalogPage } from "./components/VaccineCatalogPage";
import { VaccineTaskListPage, TaskRow } from "./components/VaccineTaskListPage";
import { VaccineTaskSelectPage } from "./components/VaccineTaskSelectPage";
import { VaccineTaskWizard } from "./components/VaccineTaskWizard";

const { Header, Content, Sider } = Layout;
const { Title } = Typography;

export default function App() {
  const [activeKey, setActiveKey] = useState("plan");
  const [taskStep, setTaskStep] = useState<"tasks" | "select" | "form" | "preview">(
    "tasks"
  );
  const [selectedPigs, setSelectedPigs] = useState<string[]>([]);
  const [taskDraft, setTaskDraft] = useState<any>(null);
  const [tasks, setTasks] = useState<TaskRow[]>([
    {
      id: "task-001",
      taskName: "春季普免",
      vaccine: "非瘟灭活疫苗",
      brand: "佰特生物",
      dosage: "2 毫克",
      schedule: "2026-02-10 09:00",
      targetCount: 200,
      status: "未开始",
      creator: "王敏",
      createdAt: "2026-02-09 09:20"
    },
    {
      id: "task-002",
      taskName: "紧急补打",
      vaccine: "蓝耳二联疫苗",
      brand: "百利",
      dosage: "1 毫升",
      schedule: "2026-02-09 14:00",
      targetCount: 80,
      status: "进行中",
      creator: "李刚",
      createdAt: "2026-02-08 15:10",
      executor: "周婷",
      executedAt: "2026-02-09 14:10"
    },
    {
      id: "task-003",
      taskName: "月度免疫",
      vaccine: "伪狂犬疫苗",
      brand: "牧安",
      dosage: "1.5 毫升",
      schedule: "2026-01-20 10:00",
      targetCount: 150,
      status: "已完成",
      creator: "赵磊",
      createdAt: "2026-01-18 11:30",
      executor: "陈雨",
      executedAt: "2026-01-20 10:10"
    }
  ]);

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
          defaultOpenKeys={["immunity"]}
          onClick={(info) => setActiveKey(info.key)}
          items={[
            {
              key: "immunity",
              label: "免疫",
              children: [
                { key: "plan", label: "疫苗计划配置" },
                { key: "task", label: "疫苗任务" }
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
                      const newTask: TaskRow = {
                        id: `task-${Date.now()}`,
                        taskName: `${taskDraft.vaccineName || "疫苗"}接种任务`,
                        vaccine: taskDraft.vaccineName || "-",
                        brand: taskDraft.brand || "-",
                        dosage: `${taskDraft.dosage || ""} ${
                          taskDraft.dosageUnit || ""
                        }`.trim(),
                        schedule: taskDraft.date || "-",
                        targetCount: selectedPigs.length,
                        status: "未开始",
                        creator: "当前用户",
                        createdAt: "2026-02-10 09:00"
                      };
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
