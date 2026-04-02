import { useState } from "react";
import {
  Alert,
  Card,
  Checkbox,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Select,
  Tabs,
  Typography
} from "antd";
import { baselineEvents, pigTypeOptions, productionLines, vaccines } from "../mockData";
import { PigType, Vaccine } from "../types";

const { Text, Title } = Typography;

const cycleOptions = [
  { label: "每年", value: "YEARLY" },
  { label: "每半年", value: "HALF_YEAR" },
  { label: "每季度", value: "QUARTER" }
];

const halfYearOptions = [
  { label: "01-01", value: "01-01" },
  { label: "07-01", value: "07-01" }
];

const quarterOptions = [
  { label: "01-01", value: "01-01" },
  { label: "04-01", value: "04-01" },
  { label: "07-01", value: "07-01" },
  { label: "10-01", value: "10-01" }
];

export function VaccinePlanConfig() {
  const [massForm] = Form.useForm();
  const [routineForm] = Form.useForm();
  const [selectedVaccine, setSelectedVaccine] = useState<Vaccine | null>(null);

  const cycle = Form.useWatch("cycle", massForm);
  const pregnancyEnabled = Form.useWatch(["exclusion", "pregnancy", "enabled"], massForm);
  const lactationEnabled = Form.useWatch(["exclusion", "lactation", "enabled"], massForm);

  return (
    <Card>
      <Title level={4} style={{ marginBottom: 16 }}>
        疫苗计划配置
      </Title>
      <Tabs
        items={[
          {
            key: "mass",
            label: "全群普免计划",
            children: (
              <Form
                form={massForm}
                layout="vertical"
                initialValues={{ cycle: "YEARLY" }}
              >
                <Form.Item
                  name="targetPigTypes"
                  label="目标免疫群体"
                  rules={[{ required: true, message: "请选择目标免疫群体" }]}
                >
                  <Select
                    mode="multiple"
                    options={pigTypeOptions}
                    placeholder="选择目标猪群"
                  />
                </Form.Item>
                <Form.Item
                  name="cycle"
                  label="循环周期"
                  rules={[{ required: true, message: "请选择循环周期" }]}
                >
                  <Select options={cycleOptions} />
                </Form.Item>
                {cycle === "YEARLY" && (
                  <Form.Item
                    name="executeDate"
                    label="执行时间 (月-日)"
                    rules={[{ required: true, message: "请选择日期" }]}
                  >
                    <DatePicker format="MM-DD" placeholder="例如 10-01" />
                  </Form.Item>
                )}
                {cycle === "HALF_YEAR" && (
                  <Form.Item
                    name="executeOption"
                    label="执行时间"
                    rules={[{ required: true, message: "请选择执行月份" }]}
                  >
                    <Select
                      mode="multiple"
                      options={halfYearOptions}
                      placeholder="每半年计划日"
                    />
                  </Form.Item>
                )}
                {cycle === "QUARTER" && (
                  <Form.Item
                    name="executeOption"
                    label="执行时间"
                    rules={[{ required: true, message: "请选择执行月份" }]}
                  >
                    <Select
                      mode="multiple"
                      options={quarterOptions}
                      placeholder="每季度计划日"
                    />
                  </Form.Item>
                )}
                <Form.Item
                  name="vaccineId"
                  label="疫苗配置"
                  rules={[{ required: true, message: "请选择疫苗" }]}
                >
                  <Select
                    options={vaccines.map((v) => ({
                      value: v.id,
                      label: `${v.name} (${v.brand})`
                    }))}
                  />
                </Form.Item>
                <Form.Item
                  name="dosage"
                  label="剂量 (ml)"
                  rules={[{ required: true, message: "请输入剂量" }]}
                >
                  <InputNumber min={0.5} step={0.5} />
                </Form.Item>
                <Form.Item label="豁免规则">
                  <Form.Item
                    name={["exclusion", "pregnancy", "enabled"]}
                    valuePropName="checked"
                  >
                    <Checkbox>跳过临产前</Checkbox>
                  </Form.Item>
                  <Form.Item
                    name={["exclusion", "pregnancy", "days"]}
                    style={{ marginLeft: 12 }}
                  >
                    <InputNumber
                      min={1}
                      max={60}
                      addonAfter="天"
                      disabled={!pregnancyEnabled}
                    />
                  </Form.Item>
                  <Form.Item
                    name={["exclusion", "lactation", "enabled"]}
                    valuePropName="checked"
                  >
                    <Checkbox>跳过哺乳期前</Checkbox>
                  </Form.Item>
                  <Form.Item
                    name={["exclusion", "lactation", "days"]}
                    style={{ marginLeft: 12 }}
                  >
                    <InputNumber
                      min={1}
                      max={60}
                      addonAfter="天"
                      disabled={!lactationEnabled}
                    />
                  </Form.Item>
                </Form.Item>
              </Form>
            )
          },
          {
            key: "routine",
            label: "跟批免疫程序",
            children: (
              <Form form={routineForm} layout="vertical">
                <Form.Item
                  name="name"
                  label="计划名称"
                  rules={[{ required: true, message: "请输入计划名称" }]}
                >
                  <Input placeholder="例如：保育阶段免疫 SOP" />
                </Form.Item>
                <Form.Item
                  name="productionLine"
                  label="适用生产线"
                  rules={[{ required: true, message: "请选择生产线" }]}
                >
                  <Select options={productionLines} />
                </Form.Item>
                <Form.Item
                  name="pigType"
                  label="猪只类型"
                  rules={[{ required: true, message: "请选择猪只类型" }]}
                >
                  <Select options={pigTypeOptions} />
                </Form.Item>
                <Form.Item
                  name="baselineEvent"
                  label="基准事件"
                  rules={[{ required: true, message: "请选择基准事件" }]}
                >
                  <Select options={baselineEvents} />
                </Form.Item>
                <Form.Item
                  name="targetDays"
                  label="目标执行时间"
                  rules={[{ required: true, message: "请输入目标日龄" }]}
                >
                  <InputNumber min={1} addonAfter="天/日龄" />
                </Form.Item>
                <Alert
                  type="info"
                  showIcon
                  message="此处填写的为目标日龄，系统将自动根据疫苗最佳接种区间进行拆单计算。"
                  style={{ marginBottom: 16 }}
                />
                <Form.Item
                  name="vaccineId"
                  label="疫苗配置"
                  rules={[{ required: true, message: "请选择疫苗" }]}
                >
                  <Select
                    options={vaccines.map((v) => ({
                      value: v.id,
                      label: `${v.name} (${v.brand})`
                    }))}
                    onChange={(value) =>
                      setSelectedVaccine(vaccines.find((v) => v.id === value) || null)
                    }
                  />
                </Form.Item>
                {selectedVaccine && (
                  <Alert
                    type="warning"
                    showIcon
                    message={`该疫苗最佳接种区间为 ${selectedVaccine.validAgeMin} - ${selectedVaccine.validAgeMax} 日龄，系统将以此区间为风控依据。`}
                  />
                )}
              </Form>
            )
          }
        ]}
      />
    </Card>
  );
}
