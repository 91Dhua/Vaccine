import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  Alert,
  Badge,
  Button,
  Calendar,
  Card,
  Checkbox,
  DatePicker,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Popover,
  Radio,
  Row,
  Col,
  Select,
  Space,
  Switch,
  Tabs,
  Table,
  Tag,
  Tooltip,
  Typography
} from "antd";
import {
  CalendarOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  LeftOutlined,
  PlusOutlined,
  QuestionCircleOutlined
} from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import {
  baselineEvents,
  pigTypeOptions,
  productionLines,
  vaccineCatalog,
  vaccines
} from "../mockData";
import {
  PlanEffectTrackingSection,
  PLAN_EFFECT_TRACKING_DEFAULTS,
  buildEffectTrackingPayload,
  formatEffectTrackingLine,
  mergeEffectTrackingInitial,
  type PlanEffectTrackingStored
} from "../planEffectTracking";

const { Title, Text, Paragraph } = Typography;

type PlanType = "MASS" | "ROUTINE";

type PigRuleField =
  | "PIG_TYPE"
  | "AGE_YEARS"
  | "WEIGHT_KG"
  | "PARITY"
  | "BREED"
  | "PIG_SOURCE";
type PigRuleOperator =
  | "IN"
  | "NOT_IN"
  | "LTE"
  | "LT"
  | "GTE"
  | "GT"
  | "BETWEEN";

type PigRuleCondition = {
  field: PigRuleField;
  operator: PigRuleOperator;
  value?: any;
};

const PIG_RULE_FIELD_OPTIONS = [
  { label: "猪只类型", value: "PIG_TYPE" },
  { label: "猪只日龄", value: "AGE_YEARS" },
  { label: "体重区间", value: "WEIGHT_KG" },
  { label: "胎次", value: "PARITY" },
  { label: "品种", value: "BREED" },
  { label: "猪只来源", value: "PIG_SOURCE" }
];

/** 猪只来源：自繁 / 购入或外转入场 */
const PIG_SOURCE_OPTIONS = [
  { label: "自繁", value: "SELF_BRED" },
  { label: "购入/外转", value: "PURCHASED_OR_TRANSFER" }
];

function pigSourceLabel(v: string) {
  return PIG_SOURCE_OPTIONS.find((o) => o.value === v)?.label || v;
}

function getOperatorOptions(field: PigRuleField) {
  if (field === "PIG_TYPE" || field === "BREED" || field === "PIG_SOURCE") {
    return [
      { label: "包含", value: "IN" },
      { label: "不包含", value: "NOT_IN" }
    ];
  }
  return [
    { label: "小于", value: "LT" },
    { label: "小于等于", value: "LTE" },
    { label: "大于", value: "GT" },
    { label: "大于等于", value: "GTE" },
    { label: "介于", value: "BETWEEN" }
  ];
}

function estimateCoverage(conditions: PigRuleCondition[]) {
  // 纯前端 UI 预估：用于即时反馈（非真实计算）
  let base = 2000;
  for (const c of conditions) {
    if (!c?.field || !c?.operator) continue;
    if (c.field === "PIG_TYPE") {
      const cnt = Array.isArray(c.value) ? c.value.length : c.value ? 1 : 0;
      if (cnt >= 2) base = Math.round(base * 0.75);
      if (cnt === 1) base = Math.round(base * 0.55);
    }
    if (c.field === "BREED") {
      const cnt = Array.isArray(c.value) ? c.value.length : c.value ? 1 : 0;
      if (cnt >= 2) base = Math.round(base * 0.85);
      if (cnt === 1) base = Math.round(base * 0.92);
    }
    if (c.field === "AGE_YEARS") {
      if (c.operator === "LTE" && typeof c.value === "number") {
        // 日龄通常数值更大，缩放系数做一下归一化
        base = Math.round(base * Math.min(0.9, 0.2 + c.value / 200));
      }
      if (c.operator === "BETWEEN" && Array.isArray(c.value)) {
        base = Math.round(base * 0.55);
      }
    }
    if (c.field === "PARITY") {
      if (c.operator === "LTE" && typeof c.value === "number") {
        base = Math.round(base * Math.min(0.95, 0.35 + c.value / 20));
      }
      if (c.operator === "BETWEEN" && Array.isArray(c.value)) {
        base = Math.round(base * 0.65);
      }
    }
    if (c.field === "WEIGHT_KG") {
      if (c.operator === "BETWEEN" && Array.isArray(c.value)) {
        base = Math.round(base * 0.75);
      } else if (typeof c.value === "number") {
        base = Math.round(base * Math.min(0.92, 0.45 + c.value / 300));
      }
    }
    if (c.field === "PIG_SOURCE") {
      const cnt = Array.isArray(c.value) ? c.value.length : c.value ? 1 : 0;
      if (cnt >= 1) base = Math.round(base * 0.88);
    }
  }
  return Math.max(0, Math.min(base, 999999));
}

function extractPigTypeValues(conditions: PigRuleCondition[]) {
  const c = conditions.find((x) => x?.field === "PIG_TYPE");
  if (!c) return [];
  if (Array.isArray(c.value)) return c.value.filter(Boolean);
  return c.value ? [c.value] : [];
}

const SIMPLE_PIG_GROUP_OPTIONS = [
  {
    label: "生产母猪",
    value: pigTypeOptions.find((o) => o.label === "生产母猪")?.value || "SOW"
  },
  {
    label: "生产公猪",
    value: pigTypeOptions.find((o) => o.label === "生产公猪")?.value || "BOAR"
  },
  {
    label: "育种母猪",
    value: pigTypeOptions.find((o) => o.label === "后备母猪")?.value || "GILT"
  },
  // 系统当前没有“育种公猪”独立枚举，先映射到生产公猪
  {
    label: "育种公猪",
    value: pigTypeOptions.find((o) => o.label === "生产公猪")?.value || "BOAR"
  },
  {
    label: "商品猪",
    value: pigTypeOptions.find((o) => o.label === "育肥猪")?.value || "FATTENING"
  }
];

const BREED_OPTIONS = [
  { label: "长白", value: "长白" },
  { label: "大白", value: "大白" },
  { label: "杜洛克", value: "杜洛克" },
  { label: "二元", value: "二元" },
  { label: "三元", value: "三元" }
];

function normalizePigTypeSelection(val: any, multi: boolean) {
  if (multi) {
    const arr = Array.isArray(val) ? val : val ? [val] : [];
    return arr.filter(Boolean);
  }
  return val ? [val] : [];
}

function buildSimpleOnlyPigRuleConditions(
  pigTypeValues: string[] | string | undefined | null,
  allowPigTypeMulti: boolean
): PigRuleCondition[] {
  if (allowPigTypeMulti) {
    const arr = Array.isArray(pigTypeValues)
      ? pigTypeValues.filter(Boolean)
      : pigTypeValues
        ? [pigTypeValues]
        : [];
    return [
      { field: "PIG_TYPE", operator: "IN", value: arr },
      { field: "AGE_YEARS", operator: "LTE", value: undefined },
      { field: "PARITY", operator: "LTE", value: undefined }
    ];
  }
  const v = Array.isArray(pigTypeValues) ? pigTypeValues[0] : pigTypeValues;
  return [
    { field: "PIG_TYPE", operator: "IN", value: v },
    { field: "AGE_YEARS", operator: "LTE", value: undefined },
    { field: "PARITY", operator: "LTE", value: undefined }
  ];
}

function pigTypeSelectionEqual(a?: string, b?: string) {
  return (a || undefined) === (b || undefined);
}

function ensurePigTypeCondition(
  prev: PigRuleCondition[],
  pigTypeValues: string[] | string,
  allowPigTypeMulti: boolean
) {
  const next = Array.isArray(prev) ? [...prev] : [];
  const idx = next.findIndex((c) => c?.field === "PIG_TYPE");
  const value = allowPigTypeMulti
    ? Array.isArray(pigTypeValues)
      ? pigTypeValues
      : pigTypeValues
        ? [pigTypeValues]
        : []
    : Array.isArray(pigTypeValues)
      ? pigTypeValues[0]
      : pigTypeValues;

  const cond: PigRuleCondition = { field: "PIG_TYPE", operator: "IN", value };
  if (idx >= 0) next[idx] = { ...next[idx], ...cond };
  else next.unshift(cond);
  return next;
}

function summarizePigRuleConditions(conditions: PigRuleCondition[], logic?: string) {
  const tags: string[] = [];
  const toOpLabel = (op: PigRuleOperator) => {
    switch (op) {
      case "LT":
        return "<";
      case "LTE":
        return "≤";
      case "GT":
        return ">";
      case "GTE":
        return "≥";
      case "BETWEEN":
        return "介于";
      case "IN":
        return "包含";
      case "NOT_IN":
        return "不包含";
      default:
        return op;
    }
  };

  for (const c of conditions || []) {
    if (!c?.field || c.field === "PIG_TYPE") continue;
    if (c.field === "AGE_YEARS") {
      if (c.operator === "BETWEEN" && Array.isArray(c.value)) {
        const a = c.value?.[0];
        const b = c.value?.[1];
        if (a != null && b != null) tags.push(`日龄 ${a}~${b} 天`);
      } else if (c.value != null && c.value !== "") {
        tags.push(`日龄 ${toOpLabel(c.operator)} ${c.value} 天`);
      }
    }
    if (c.field === "PARITY") {
      if (c.operator === "BETWEEN" && Array.isArray(c.value)) {
        const a = c.value?.[0];
        const b = c.value?.[1];
        if (a != null && b != null) tags.push(`胎次 ${a}~${b}`);
      } else if (c.value != null && c.value !== "") {
        tags.push(`胎次 ${toOpLabel(c.operator)} ${c.value}`);
      }
    }
    if (c.field === "BREED") {
      const vals = Array.isArray(c.value) ? c.value.filter(Boolean) : c.value ? [c.value] : [];
      if (vals.length > 0) {
        tags.push(`品种 ${toOpLabel(c.operator)} ${vals.join("、")}`);
      }
    }
    if (c.field === "WEIGHT_KG") {
      if (c.operator === "BETWEEN" && Array.isArray(c.value)) {
        const a = c.value?.[0];
        const b = c.value?.[1];
        if (a != null && b != null) tags.push(`体重 ${a}~${b} kg`);
      } else if (c.value != null && c.value !== "") {
        tags.push(`体重 ${toOpLabel(c.operator)} ${c.value} kg`);
      }
    }
    if (c.field === "PIG_SOURCE") {
      const raw = Array.isArray(c.value) ? c.value.filter(Boolean) : c.value ? [c.value] : [];
      const vals = raw.map((x) => pigSourceLabel(String(x)));
      if (vals.length > 0) {
        tags.push(`来源 ${toOpLabel(c.operator)} ${vals.join("、")}`);
      }
    }
  }

  return {
    tags,
    logicLabel: logic === "OR" ? "任一 (OR)" : "全部 (AND)"
  };
}

function parseRuleTextToConditions(input: string, allowPigTypeMulti: boolean) {
  const txt = String(input || "").trim();
  if (!txt) return null;

  const next: PigRuleCondition[] = [];

  // 猪只类型（生产母猪/生产公猪/仔猪/育肥猪/后备母猪）
  const pigTypeHits = pigTypeOptions
    .filter((o) => txt.includes(o.label))
    .map((o) => o.value);
  if (pigTypeHits.length) {
    next.push({
      field: "PIG_TYPE",
      operator: "IN",
      value: allowPigTypeMulti ? Array.from(new Set(pigTypeHits)) : pigTypeHits[0]
    });
  }

  // 日龄：如 “日龄30天以内”“30天以下”“日龄<=30”
  const ageM = txt.match(/(?:日龄\s*)?(\d+(?:\.\d+)?)\s*(天|日)/);
  if (ageM) {
    next.push({
      field: "AGE_YEARS",
      operator: "LTE",
      value: Number(ageM[1])
    });
  }

  // 胎次：如 “胎次<=8”“胎次小于等于8”
  const parityM = txt.match(/胎次\s*(<=|小于等于|≤|小于|<|大于等于|>=|≥|大于|>)\s*(\d+)/);
  if (parityM) {
    const raw = parityM[1];
    const v = Number(parityM[2]);
    const op =
      raw === "<=" || raw === "小于等于" || raw === "≤"
        ? "LTE"
        : raw === "<" || raw === "小于"
          ? "LT"
          : raw === ">=" || raw === "大于等于" || raw === "≥"
            ? "GTE"
            : "GT";
    next.push({ field: "PARITY", operator: op as PigRuleOperator, value: v });
  } else {
    const parityLoose = txt.match(/胎次.*?(\d+)/);
    if (parityLoose) {
      next.push({ field: "PARITY", operator: "LTE", value: Number(parityLoose[1]) });
    }
  }

  if (next.length === 0) return null;
  return next;
}

function PigRuleBuilder({
  form,
  allowPigTypeMulti,
  lockedPigTypeValue
}: {
  form: any;
  allowPigTypeMulti: boolean;
  lockedPigTypeValue?: string;
}) {
  const conditions: PigRuleCondition[] = Form.useWatch("pigRuleConditions", form) || [];

  const coverage = useMemo(() => estimateCoverage(conditions), [conditions]);

  return (
    <Card
      size="small"
      style={{ background: "#F7F8FA", borderColor: "#E6E8EC" }}
      bodyStyle={{ padding: 16 }}
    >
      <div style={{ marginBottom: 12 }}>
        <Text strong>高级设置（选猪规则）</Text>
      </div>

      <Card size="small" bodyStyle={{ padding: 12 }} style={{ borderColor: "#E6E8EC" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <Text type="secondary">满足以下</Text>
          <Form.Item name="pigRuleLogic" noStyle initialValue="AND">
            <Select
              style={{ width: 160 }}
              options={[
                { label: "全部 (AND)", value: "AND" },
                { label: "任一 (OR)", value: "OR" }
              ]}
            />
          </Form.Item>
          <Text type="secondary">条件</Text>
        </div>

        <Form.List name="pigRuleConditions">
          {(fields, { add, remove }) => (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {fields.map((field) => {
                const f: PigRuleField | undefined = form.getFieldValue([
                  "pigRuleConditions",
                  field.name,
                  "field"
                ]);
                const op: PigRuleOperator | undefined = form.getFieldValue([
                  "pigRuleConditions",
                  field.name,
                  "operator"
                ]);

                // 猪只类型：锁定展示（不允许在高级设置中编辑）
                if (f === "PIG_TYPE" && lockedPigTypeValue) {
                  return (
                    <div
                      key={field.key}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "160px 140px 1fr 40px",
                        gap: 12,
                        alignItems: "center",
                        background: "#fff",
                        border: "1px solid #E6E8EC",
                        borderRadius: 10,
                        padding: "10px 12px"
                      }}
                    >
                      <div>
                        <Text type="secondary">猪只类型</Text>
                      </div>
                      <div>
                        <Text type="secondary">固定</Text>
                      </div>
                      <div>
                        <Tag color="blue" style={{ marginInlineEnd: 0 }}>
                          {pigTypeOptions.find((o) => o.value === lockedPigTypeValue)?.label ||
                            lockedPigTypeValue}
                        </Tag>
                        <Text type="secondary" style={{ marginLeft: 8 }}>
                          （在外部选择）
                        </Text>
                      </div>
                      <div />
                    </div>
                  );
                }

                const valueNode =
                  f === "PIG_TYPE" ? (
                    <Form.Item
                      {...field}
                      name={[field.name, "value"]}
                      rules={[{ required: true, message: "请选择类型" }]}
                      noStyle
                    >
                      <Select
                        mode={allowPigTypeMulti ? "multiple" : undefined}
                        allowClear
                        showSearch
                        options={pigTypeOptions}
                        optionFilterProp="label"
                        placeholder="选择"
                        style={{ minWidth: 280 }}
                      />
                    </Form.Item>
                  ) : f === "BREED" ? (
                    <Form.Item
                      {...field}
                      name={[field.name, "value"]}
                      rules={[{ required: true, message: "请选择品种" }]}
                      noStyle
                    >
                      <Select
                        mode="multiple"
                        allowClear
                        showSearch
                        options={BREED_OPTIONS}
                        optionFilterProp="label"
                        placeholder="选择品种"
                        style={{ minWidth: 280 }}
                      />
                    </Form.Item>
                  ) : f === "PIG_SOURCE" ? (
                    <Form.Item
                      {...field}
                      name={[field.name, "value"]}
                      rules={[{ required: true, message: "请选择猪只来源" }]}
                      noStyle
                    >
                      <Select
                        mode="multiple"
                        allowClear
                        options={PIG_SOURCE_OPTIONS}
                        placeholder="选择来源"
                        style={{ minWidth: 280 }}
                      />
                    </Form.Item>
                  ) : op === "BETWEEN" ? (
                    <Space>
                      <Form.Item
                        {...field}
                        name={[field.name, "value", 0]}
                        rules={[{ required: true, message: "请输入范围" }]}
                        noStyle
                      >
                        <InputNumber min={0} placeholder="最小" style={{ width: 140 }} />
                      </Form.Item>
                      <Text type="secondary">~</Text>
                      <Form.Item
                        {...field}
                        name={[field.name, "value", 1]}
                        rules={[{ required: true, message: "请输入范围" }]}
                        noStyle
                      >
                        <InputNumber min={0} placeholder="最大" style={{ width: 140 }} />
                      </Form.Item>
                      {f === "AGE_YEARS" && <Text type="secondary">天</Text>}
                      {f === "WEIGHT_KG" && <Text type="secondary">kg</Text>}
                    </Space>
                  ) : (
                    <Space>
                      <Form.Item
                        {...field}
                        name={[field.name, "value"]}
                        rules={[{ required: true, message: "请输入数值" }]}
                        noStyle
                      >
                        <InputNumber min={0} placeholder="数值" style={{ width: 180 }} />
                      </Form.Item>
                      {f === "AGE_YEARS" && <Text type="secondary">天</Text>}
                      {f === "WEIGHT_KG" && <Text type="secondary">kg</Text>}
                    </Space>
                  );

                return (
                  <div
                    key={field.key}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "160px 140px 1fr 40px",
                      gap: 12,
                      alignItems: "center",
                      background: "#fff",
                      border: "1px solid #E6E8EC",
                      borderRadius: 10,
                      padding: "10px 12px"
                    }}
                  >
                    <Form.Item
                      {...field}
                      name={[field.name, "field"]}
                      rules={[{ required: true, message: "请选择字段" }]}
                      noStyle
                    >
                      <Select
                        options={
                          lockedPigTypeValue
                            ? PIG_RULE_FIELD_OPTIONS.filter((x) => x.value !== "PIG_TYPE")
                            : PIG_RULE_FIELD_OPTIONS
                        }
                        placeholder="选择字段"
                        onChange={() => {
                          // 字段变更：重置操作符与值
                          form.setFieldValue(
                            ["pigRuleConditions", field.name, "operator"],
                            undefined
                          );
                          form.setFieldValue(
                            ["pigRuleConditions", field.name, "value"],
                            undefined
                          );
                        }}
                      />
                    </Form.Item>

                    <Form.Item
                      {...field}
                      name={[field.name, "operator"]}
                      rules={[{ required: true, message: "请选择关系" }]}
                      noStyle
                    >
                      <Select
                        placeholder="关系"
                        options={f ? getOperatorOptions(f) : []}
                        onChange={() => {
                          // 操作符变更：重置值
                          form.setFieldValue(
                            ["pigRuleConditions", field.name, "value"],
                            undefined
                          );
                        }}
                      />
                    </Form.Item>

                    {valueNode}

                    <Button type="text" danger onClick={() => remove(field.name)}>
                      🗑️
                    </Button>
                  </div>
                );
              })}

              <Button
                type="dashed"
                block
                onClick={() =>
                  add(
                    lockedPigTypeValue
                      ? { field: "AGE_YEARS", operator: "LTE", value: undefined }
                      : {
                          field: "PIG_TYPE",
                          operator: "IN",
                          value: allowPigTypeMulti ? [] : undefined
                        }
                  )
                }
              >
                + 添加筛选条件
              </Button>
            </div>
          )}
        </Form.List>
      </Card>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 8,
              background: "#2BA471",
              display: "inline-block"
            }}
          />
          <Text>
            当前规则预计涵盖 <Text strong>{coverage.toLocaleString()}</Text> 头猪只
          </Text>
        </div>
        <Tooltip
          title={
            <div style={{ maxWidth: 360 }}>
              <Text strong>快照计算</Text>
              <div style={{ marginTop: 6 }}>
                系统将在计划执行日 (T=0) 凌晨 00:00 进行快照计算。
              </div>
              <div style={{ marginTop: 6 }}>
                执行时处于 [用药中] 或 [异常] 状态的猪只将被自动移入待办挂起池，由人工复核。
              </div>
            </div>
          }
        >
          <Button type="text">ℹ️</Button>
        </Tooltip>
      </div>
    </Card>
  );
}

const TASK_OPTIONS = [
  { label: "查情", value: "查情" },
  { label: "分娩", value: "分娩" },
  { label: "育肥", value: "育肥" },
  { label: "哺乳", value: "哺乳" },
  { label: "配种", value: "配种" },
  { label: "保育", value: "保育" },
  { label: "仔猪处理", value: "仔猪处理" },
  { label: "产后检查", value: "产后检查" }
];

const STATUS_OPTIONS = [
  { label: "已发情", value: "已发情" },
  { label: "已配种", value: "已配种" },
  { label: "已妊娠", value: "已妊娠" },
  { label: "泌乳期", value: "泌乳期" },
  { label: "空怀", value: "空怀" },
  { label: "成长期", value: "成长期" },
  { label: "哺乳期", value: "哺乳期" }
];

/** 普免豁免规则第一步：触发类型（与转舍计划交互一致的分步结构） */
const EXEMPTION_RULE_TYPE_OPTIONS = [
  { label: "预计生产任务开始前", value: "PRE_START" },
  { label: "实际生产任务结束后", value: "POST_END" },
  { label: "转舍后", value: "POST_TRANSFER" },
  { label: "入厂后", value: "POST_ENTRY" },
  { label: "生产状态", value: "STATUS" },
  { label: "疾病", value: "DISEASE" },
  { label: "症状", value: "SYMPTOM" }
];

/** 跟批免疫豁免规则触发类型：以转舍/入厂和疾病症状为主 */
const EXEMPTION_RULE_TYPE_OPTIONS_ROUTINE = [
  { label: "转舍后", value: "POST_TRANSFER" },
  { label: "入厂后", value: "POST_ENTRY" },
  { label: "疾病", value: "DISEASE" },
  { label: "症状", value: "SYMPTOM" }
];

const SYMPTOM_GROUPS = [
  { title: "生殖系统", items: ["乳腺炎", "阴茎异常", "直肠脱出", "外阴肿胀", "阴道感染", "子宫脱垂"] },
  { title: "常见症状", items: ["虚弱", "食欲不振", "生长缓慢", "粘膜苍白", "异常运动", "姿势异常", "震颤"] },
  { title: "四肢", items: ["异常站姿", "关节肿胀", "跛行", "蹄过长", "蹄壳脱落", "蹄部水疱"] },
  { title: "眼睛", items: ["发红", "分泌物", "肿胀"] },
  { title: "皮肤", items: ["皮疹", "溃疡", "疥癣", "肿胀", "疤痕", "颜色变化"] }
];

const DISEASE_GROUPS = [
  { title: "呼吸系统疾病", items: ["猪繁殖与呼吸综合征", "猪流感", "猪支原体肺炎", "巴氏杆菌病", "包涵体鼻炎"] },
  { title: "胃肠道疾病", items: ["传染性胃肠炎", "轮状病毒感染", "增生性肠炎", "沙门氏菌病", "猪痢疾"] },
  { title: "繁殖与新生仔猪疾病", items: ["乳房炎-子宫炎-无乳综合征", "布鲁氏菌病", "伪狂犬病", "木乃伊胎"] },
  { title: "全身性疾病", items: ["非洲猪瘟", "败血症", "猪圆环病毒相关疾病", "放线菌病"] },
  { title: "营养与代谢疾病", items: ["维生素缺乏症", "贫血", "骨软骨病", "佝偻病"] }
];

/**
 * 第二步下拉选项：选择「预计生产任务开始前 / 实际生产任务结束后 / 生产状态」后出现。
 * 与转舍计划「生产任务 → 子项」联动一致；具体选项待产品确认后可替换下列常量。
 */
const EXEMPTION_SECOND_OPTIONS_PRE_POST = TASK_OPTIONS;
const EXEMPTION_SECOND_OPTIONS_STATUS = STATUS_OPTIONS;

function exemptionSecondSelectPlaceholder(rule: string | undefined): string {
  if (rule === "PRE_START" || rule === "POST_END") return "请选择生产任务";
  if (rule === "STATUS") return "请选择生产状态";
  return "请选择";
}

/** 普免豁免规则预览 / 列表摘要（一步 + 二步下拉 + 时间段） */
function formatMassExemptionRuleLine(r: {
  rule?: string;
  taskType?: string;
  statusType?: string;
  daysStart?: number;
  daysEnd?: number;
  conditionItems?: string[];
}): string {
  const label =
    r.rule === "PRE_START"
      ? "预计生产任务开始前"
      : r.rule === "POST_END"
        ? "实际生产任务结束后"
        : r.rule === "POST_TRANSFER"
          ? "转舍后"
          : r.rule === "POST_ENTRY"
            ? "入厂后"
        : r.rule === "STATUS"
          ? "生产状态"
          : r.rule === "DISEASE"
            ? "疾病"
            : r.rule === "SYMPTOM"
              ? "症状"
            : r.rule === "AGE"
              ? "日龄"
              : String(r.rule ?? "");
  const daysStr = `${r.daysStart ?? 0}-${r.daysEnd ?? 0} 天`;
  if (r.rule === "DISEASE" || r.rule === "SYMPTOM") {
    const items = Array.isArray(r.conditionItems) ? r.conditionItems.filter(Boolean) : [];
    return items.length > 0 ? `${label}（${items.join("、")}）` : label;
  }
  if (r.rule === "STATUS") {
    return `${label} ${r.statusType || "-"} ${daysStr} 免打`;
  }
  if (r.rule === "PRE_START" || r.rule === "POST_END") {
    const rel = r.rule === "PRE_START" ? "开始前" : "结束后";
    return `${label} ${r.taskType || "-"} ${rel} ${daysStr} 免打`;
  }
  if (r.rule === "POST_TRANSFER" || r.rule === "POST_ENTRY" || r.rule === "AGE") {
    return `${label} ${daysStr} 免打`;
  }
  return `${label} ${daysStr} 免打`;
}

/**
 * 普免豁免单步：Fluent 式左右分栏（左：标题+说明，右：控件铺满剩余宽度）
 */
function MassExemptionStep({
  step,
  title,
  required,
  hint,
  tip,
  children
}: {
  step: number;
  title: string;
  required?: boolean;
  hint?: string;
  tip?: string;
  children?: ReactNode;
}) {
  const hasField = children != null;
  const showFieldCol = hasField;

  return (
    <div className="exemption-step-block">
      <div className={`exemption-step-row${showFieldCol ? "" : " exemption-step-row--label-only"}`}>
        <div className="exemption-step-label-col">
          <div className="exemption-step-head">
            <div className="exemption-step-head-main">
              <div className="exemption-step-title-row">
                {title}
                {required ? <span className="exemption-req">*</span> : null}
              </div>
            </div>
          </div>
        </div>
        {showFieldCol ? (
          <div className="exemption-step-field-col">
            {hasField ? <div className="exemption-step-body">{children}</div> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ExemptionConditionModal({
  open,
  title,
  groups,
  value,
  onOk,
  onCancel
}: {
  open: boolean;
  title: string;
  groups: { title: string; items: string[] }[];
  value: string[];
  onOk: (vals: string[]) => void;
  onCancel: () => void;
}) {
  const [selected, setSelected] = useState<string[]>(value || []);
  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    if (open) {
      setSelected(Array.isArray(value) ? value : []);
      setKeyword("");
    }
  }, [open, value]);

  const toggle = (item: string) => {
    setSelected((prev) => (prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]));
  };

  const filteredGroups = groups
    .map((g) => ({
      ...g,
      items: g.items.filter((x) => !keyword.trim() || x.includes(keyword.trim()))
    }))
    .filter((g) => g.items.length > 0);

  return (
    <Modal
      title={title}
      open={open}
      onCancel={onCancel}
      onOk={() => onOk(selected)}
      okText="确认"
      cancelText="取消"
      width={760}
      destroyOnClose
      className="exemption-condition-modal"
    >
      <Input
        allowClear
        placeholder={`搜索${title}`}
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        style={{ marginBottom: 12 }}
      />
      <div className="exemption-condition-groups">
        {filteredGroups.map((group) => (
          <div key={group.title} className="exemption-condition-group">
            <div className="exemption-condition-group-title">{group.title}</div>
            <div className="exemption-condition-tags">
              {group.items.map((item) => {
                const active = selected.includes(item);
                return (
                  <Button
                    key={item}
                    size="small"
                    type={active ? "primary" : "default"}
                    className={`exemption-condition-tag${active ? " is-active" : ""}`}
                    onClick={() => toggle(item)}
                  >
                    {item}
                  </Button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

/** 豁免规则表单项标签旁「?」气泡：补充配置示例 */
const EXEMPTION_RULES_TOOLTIP =
  "可设置免打时间段，例如：发情 5–7 天、分娩前 5–7 天、患病中等。";

const EXEMPTION_RULES_EXTRA = "豁免期内自动跳过接种，待状态恢复后系统自动安排补打。";

function exemptionRulesFormLabel() {
  return (
    <span className="exemption-rules-form-label">
      豁免规则
      <Tooltip title={EXEMPTION_RULES_TOOLTIP}>
        <QuestionCircleOutlined className="exemption-rules-help-icon" aria-label="豁免规则说明" />
      </Tooltip>
    </span>
  );
}

/** 豁免规则单行 */
function ExemptionRuleRow({
  field,
  form,
  onRemove,
  ruleTypeOptions
}: {
  field: { name: number; key: string | number };
  form: any;
  onRemove: () => void;
  ruleTypeOptions?: { label: string; value: string }[];
}) {
  const rule = Form.useWatch(["exemptions", field.name, "rule"], form);
  const conditionItems =
    (Form.useWatch(["exemptions", field.name, "conditionItems"], form) as string[] | undefined) || [];
  const [conditionModalOpen, setConditionModalOpen] = useState(false);

  const handleRuleChange = () => {
    ["taskType", "statusType", "daysStart", "daysEnd", "conditionItems"].forEach((key) => {
      form.setFieldValue(["exemptions", field.name, key], undefined);
    });
  };

  const needsSecondStep =
    rule === "PRE_START" || rule === "POST_END" || rule === "STATUS";
  /** 转舍后 / 入厂后 / 日龄：第二步配置起止日龄或天数区间 */
  const needsTransferTimeRange = rule === "POST_TRANSFER" || rule === "POST_ENTRY";
  const needsAgeRange = rule === "AGE";
  const needsConditionPicker = rule === "DISEASE" || rule === "SYMPTOM";

  const daysRangeInputs = (
    <span className="exemption-days-range">
      <Form.Item
        {...field}
        name={[field.name, "daysStart"]}
        rules={[{ required: true, message: "请输入开始天数" }]}
        noStyle
      >
        <InputNumber min={0} placeholder="开始" style={{ width: 80 }} />
      </Form.Item>
      <span className="exemption-days-sep">至</span>
      <Form.Item
        {...field}
        name={[field.name, "daysEnd"]}
        rules={[{ required: true, message: "请输入结束天数" }]}
        noStyle
      >
        <InputNumber min={0} placeholder="结束" style={{ width: 80 }} />
      </Form.Item>
      <span className="exemption-days-unit">天</span>
    </span>
  );

  const ageRangeInputs = (
    <span className="exemption-days-range">
      <Form.Item
        {...field}
        name={[field.name, "daysStart"]}
        rules={[{ required: true, message: "请输入开始日龄" }]}
        noStyle
      >
        <InputNumber min={0} placeholder="开始日龄" style={{ width: 96 }} />
      </Form.Item>
      <span className="exemption-days-sep">至</span>
      <Form.Item
        {...field}
        name={[field.name, "daysEnd"]}
        rules={[{ required: true, message: "请输入结束日龄" }]}
        noStyle
      >
        <InputNumber min={0} placeholder="结束日龄" style={{ width: 96 }} />
      </Form.Item>
      <span className="exemption-days-unit">天</span>
    </span>
  );

  return (
    <div className="exemption-rule-row">
      <Tooltip title="删除">
        <Button
          type="text"
          danger
          size="small"
          className="exemption-rule-delete"
          icon={<DeleteOutlined />}
          aria-label="删除"
          onClick={onRemove}
        />
      </Tooltip>
      <div className="exemption-rule-content">
        <MassExemptionStep
          step={1}
          title="触发规则"
          required
          hint="指定系统计算免打时间所依据的参考类型。"
        >
          <Form.Item
            {...field}
            name={[field.name, "rule"]}
            rules={[{ required: true, message: "请选择触发规则" }]}
            noStyle
          >
            <Select
              className="exemption-rule-select"
              placeholder="请选择触发规则"
              onChange={handleRuleChange}
              options={ruleTypeOptions || EXEMPTION_RULE_TYPE_OPTIONS}
            />
          </Form.Item>
        </MassExemptionStep>

        {needsSecondStep && (
          <MassExemptionStep
            step={2}
            title="免打条件与时间段"
            required
            hint="先选择生产任务或生产状态，再填写免打天数区间。"
            tip="「0 天」表示从基准日当天起算。"
          >
            <div className="exemption-step-inline-controls">
              {rule === "PRE_START" && (
                <>
                  <Form.Item
                    {...field}
                    name={[field.name, "taskType"]}
                    rules={[{ required: true, message: "请选择生产任务" }]}
                    noStyle
                  >
                    <Select
                      style={{ minWidth: 140 }}
                      placeholder={exemptionSecondSelectPlaceholder(rule)}
                      options={EXEMPTION_SECOND_OPTIONS_PRE_POST}
                    />
                  </Form.Item>
                  <span className="exemption-fixed-text">开始前</span>
                  {daysRangeInputs}
                </>
              )}
              {rule === "POST_END" && (
                <>
                  <Form.Item
                    {...field}
                    name={[field.name, "taskType"]}
                    rules={[{ required: true, message: "请选择生产任务" }]}
                    noStyle
                  >
                    <Select
                      style={{ minWidth: 140 }}
                      placeholder={exemptionSecondSelectPlaceholder(rule)}
                      options={EXEMPTION_SECOND_OPTIONS_PRE_POST}
                    />
                  </Form.Item>
                  <span className="exemption-fixed-text">结束后</span>
                  {daysRangeInputs}
                </>
              )}
              {rule === "STATUS" && (
                <>
                  <Form.Item
                    {...field}
                    name={[field.name, "statusType"]}
                    rules={[{ required: true, message: "请选择生产状态" }]}
                    noStyle
                  >
                    <Select
                      style={{ minWidth: 160 }}
                      placeholder={exemptionSecondSelectPlaceholder(rule)}
                      options={EXEMPTION_SECOND_OPTIONS_STATUS}
                    />
                  </Form.Item>
                  {daysRangeInputs}
                </>
              )}
            </div>
          </MassExemptionStep>
        )}

        {needsTransferTimeRange && (
          <MassExemptionStep
            step={2}
            title="免打时间段"
            required
            hint="按生产事件起算的天数区间，无额外关联条件。"
            tip="「0 天」表示从基准日当天起算。"
          >
            <div className="exemption-step-inline-controls">{daysRangeInputs}</div>
          </MassExemptionStep>
        )}

        {needsAgeRange && (
          <MassExemptionStep
            step={2}
            title="免打日龄区间"
            required
            hint="猪只日龄处于该区间内时免打；日龄为出生后累计天数。"
            tip="与生产任务日龄口径一致。"
          >
            <div className="exemption-step-inline-controls">{ageRangeInputs}</div>
          </MassExemptionStep>
        )}
        {needsConditionPicker && (
          <MassExemptionStep step={2} title={rule === "DISEASE" ? "疾病筛选" : "症状筛选"} required>
            <div className="exemption-condition-picker">
              <Form.Item
                {...field}
                name={[field.name, "conditionItems"]}
                className="exemption-condition-field"
                rules={[
                  {
                    validator: (_, value) => {
                      if (Array.isArray(value) && value.length > 0) return Promise.resolve();
                      return Promise.reject(new Error(`请至少选择一个${rule === "DISEASE" ? "疾病" : "症状"}`));
                    }
                  }
                ]}
                style={{ marginBottom: 4 }}
              >
                <span className="exemption-condition-field-anchor" aria-hidden />
              </Form.Item>
              <div className="exemption-condition-picker-toolbar">
                <Button
                  type="default"
                  className="exemption-condition-select-btn"
                  onClick={() => setConditionModalOpen(true)}
                >
                  选择{rule === "DISEASE" ? "疾病" : "症状"}
                </Button>
                <span className="exemption-condition-picker-count">
                  已选 {conditionItems.length} 项
                </span>
              </div>
              {conditionItems.length > 0 && (
                <div className="exemption-condition-selected">
                  {conditionItems.map((item) => (
                    <Tag
                      key={item}
                      closable
                      className="exemption-condition-chip"
                      onClose={(e) => {
                        e.preventDefault();
                        form.setFieldValue(
                          ["exemptions", field.name, "conditionItems"],
                          conditionItems.filter((x) => x !== item)
                        );
                      }}
                    >
                      {item}
                    </Tag>
                  ))}
                </div>
              )}
            </div>
          </MassExemptionStep>
        )}
      </div>
      <ExemptionConditionModal
        open={conditionModalOpen}
        title={rule === "DISEASE" ? "添加疾病" : "添加症状"}
        groups={rule === "DISEASE" ? DISEASE_GROUPS : SYMPTOM_GROUPS}
        value={conditionItems}
        onCancel={() => setConditionModalOpen(false)}
        onOk={(vals) => {
          form.setFieldValue(["exemptions", field.name, "conditionItems"], vals);
          setConditionModalOpen(false);
        }}
      />
    </div>
  );
}

/** 普免排期 — 重复规则（用于年度 MM-DD 节点展开） */
type ScheduleRecurrenceFrequency = "DAY" | "WEEK" | "MONTH" | "YEAR";

type ScheduleRecurrenceRule = {
  frequency: ScheduleRecurrenceFrequency;
  interval: number;
  /** 周重复：0–6，0=周日 */
  byWeekday?: number[];
  /** 月/年固定「几日」 */
  byMonthDay?: number[];
  /** 年重复：在哪些月份（1–12） */
  byMonth?: number[];
  /** 月/年：按号 或 第 N 个星期几 */
  monthMode?: "date" | "relative";
  /** 第几个（1–4 或 5=最后一个） */
  bySetPos?: 1 | 2 | 3 | 4 | 5;
  byDay?: number;
};

const SCHEDULE_RECURRENCE_MAX_DATES = 120;

const WEEKDAY_LABELS = ["日", "一", "二", "三", "四", "五", "六"];

function defaultScheduleRecurrence(): ScheduleRecurrenceRule {
  return {
    frequency: "WEEK",
    interval: 1,
    byWeekday: [1],
    monthMode: "date",
    byMonthDay: [1],
    byMonth: [1],
    bySetPos: 1,
    byDay: 1
  };
}

/** 普免快捷重复：每月 / 每季度 / 每年；CUSTOM 表示弹窗高级规则 */
type ScheduleRepeatPreset = "MONTHLY" | "QUARTERLY" | "YEARLY" | "CUSTOM";

type ScheduleRepeatEndMode = "never" | "on_date";

function presetToRule(preset: ScheduleRepeatPreset, anchor: Dayjs | undefined): ScheduleRecurrenceRule {
  const day = anchor?.date() ?? 1;
  const month = anchor ? anchor.month() + 1 : 1;
  const base = { monthMode: "date" as const, bySetPos: 1 as const, byDay: 1 };
  switch (preset) {
    case "MONTHLY":
      return { ...base, frequency: "MONTH", interval: 1, byMonthDay: [day], byMonth: [1] };
    case "QUARTERLY":
      return { ...base, frequency: "MONTH", interval: 3, byMonthDay: [day], byMonth: [1] };
    case "YEARLY":
      return { ...base, frequency: "YEAR", interval: 1, byMonthDay: [day], byMonth: [month] };
    default:
      return defaultScheduleRecurrence();
  }
}

/** 自首次接种日起，到结束日为止（可跨年） */
function expandFromAnchorUntilEnd(rule: ScheduleRecurrenceRule, anchor: Dayjs, endDate: Dayjs): Dayjs[] {
  const start = anchor.startOf("day");
  const end = endDate.endOf("day");
  if (end.isBefore(start, "day")) return [];
  const out: Dayjs[] = [];
  for (let y = start.year(); y <= end.year() && out.length < SCHEDULE_RECURRENCE_MAX_DATES; y++) {
    const chunk = expandScheduleRecurrenceFromStart(rule, anchor, y);
    for (const d of chunk) {
      if (!d.isBefore(start, "day") && !d.isAfter(end, "day")) out.push(d);
    }
  }
  return dedupeSortDates(out).slice(0, SCHEDULE_RECURRENCE_MAX_DATES);
}

function parseScheduleEndDate(raw: unknown): Dayjs | undefined {
  if (raw == null || raw === "") return undefined;
  if (dayjs.isDayjs(raw)) return raw.isValid() ? raw : undefined;
  const x = dayjs(raw as string | number | Date);
  return x.isValid() ? x : undefined;
}

function expandMassPlanScheduleDates(
  rule: ScheduleRecurrenceRule | null | undefined,
  anchor: Dayjs | undefined,
  endMode: ScheduleRepeatEndMode | undefined,
  endDate: unknown,
  calendarYear: number
): Dayjs[] {
  if (!rule || !anchor) return [];
  if (endMode === "on_date") {
    const ed = parseScheduleEndDate(endDate);
    if (ed) return expandFromAnchorUntilEnd(rule, anchor, ed);
  }
  return expandScheduleRecurrenceFromStart(rule, anchor, calendarYear);
}

function nthWeekdayOfMonth(
  year: number,
  month: number,
  pos: number,
  weekday: number
): Dayjs | null {
  if (pos === 5) {
    let d = dayjs(`${year}-${String(month).padStart(2, "0")}-01`).endOf("month");
    while (d.day() !== weekday) d = d.subtract(1, "day");
    return d;
  }
  let d = dayjs(`${year}-${String(month).padStart(2, "0")}-01`);
  while (d.day() !== weekday) d = d.add(1, "day");
  d = d.add(pos - 1, "week");
  if (d.month() + 1 !== month) return null;
  return d;
}

function dedupeSortDates(arr: Dayjs[]): Dayjs[] {
  const seen = new Set<string>();
  const out: Dayjs[] = [];
  for (const d of [...arr].sort((a, b) => a.valueOf() - b.valueOf())) {
    const k = d.format("MM-DD");
    if (!seen.has(k)) {
      seen.add(k);
      out.push(d);
    }
  }
  return out;
}

/** 普免计划在某日的接种任务（列表聚合或表单预览） */
type PlanDayMassTask = {
  planId: string;
  planName: string;
  vaccine: string;
  pigType?: string;
  enabled: boolean;
};

function parseMassExecuteToDates(execute: string | undefined, year: number): Dayjs[] {
  const raw = String(execute || "").trim();
  if (!raw) return [];
  const parts = raw.split("/").map((s) => s.trim()).filter(Boolean);
  const out: Dayjs[] = [];
  for (const md of parts) {
    if (!/^\d{2}-\d{2}$/.test(md)) continue;
    const d = dayjs(`${year}-${md}`);
    if (d.isValid() && d.year() === year) out.push(d);
  }
  return dedupeSortDates(out);
}

function buildMassPlansYearIndex(plans: any[], year: number): Map<string, PlanDayMassTask[]> {
  const map = new Map<string, PlanDayMassTask[]>();
  for (const p of plans) {
    const dates = parseMassExecuteToDates(p.execute, year);
    const entry: PlanDayMassTask = {
      planId: String(p.id ?? ""),
      planName: String(p.name || "未命名计划"),
      vaccine: String(p.vaccine || ""),
      pigType: p.pigType ? String(p.pigType) : undefined,
      enabled: p.enabled !== false
    };
    for (const d of dates) {
      const k = d.format("YYYY-MM-DD");
      const cur = map.get(k) || [];
      if (!cur.some((x) => x.planId === entry.planId)) cur.push(entry);
      map.set(k, cur);
    }
  }
  for (const [k, arr] of map) {
    arr.sort((a, b) => a.planName.localeCompare(b.planName, "zh-Hans-CN"));
    map.set(k, arr);
  }
  return map;
}

/** 普免表单当前排期展开为「日期 → 任务」索引（与列表聚合结构一致） */
function buildDraftMassDayMap(
  getFieldValue: (name: string) => unknown,
  scheduleYear: number,
  draftPreviewMeta: { vaccineName: string; planName?: string },
  generated: Dayjs[]
): Map<string, PlanDayMassTask[]> {
  const vaccineName = draftPreviewMeta.vaccineName.trim() || "接种任务";
  const planName = draftPreviewMeta.planName?.trim() || "当前计划";
  const dates: Dayjs[] = [];
  const re = getFieldValue("scheduleRepeatEnabled") as boolean | undefined;
  if (re) {
    dates.push(...generated);
  } else {
    const sd = getFieldValue("scheduleDates") as unknown[] | undefined;
    for (const x of sd || []) {
      const c = coerceDayjs(x);
      if (c && c.year() === scheduleYear) dates.push(c);
    }
  }
  const map = new Map<string, PlanDayMassTask[]>();
  for (const d of dates) {
    if (d.year() !== scheduleYear) continue;
    const k = d.format("YYYY-MM-DD");
    map.set(k, [
      {
        planId: "__draft__",
        planName,
        vaccine: vaccineName,
        enabled: true
      }
    ]);
  }
  return map;
}

function accentHueFromId(id: string): number {
  let h = 216;
  for (let i = 0; i < id.length; i++) h = (h * 33 + id.charCodeAt(i)) >>> 0;
  return h % 360;
}

function buildMonthWeekRows(year: number, month: number): (number | null)[][] {
  const first = dayjs(`${year}-${String(month).padStart(2, "0")}-01`);
  const dim = first.daysInMonth();
  const startPad = (first.day() + 6) % 7;
  const flat: (number | null)[] = [];
  for (let i = 0; i < startPad; i++) flat.push(null);
  for (let d = 1; d <= dim; d++) flat.push(d);
  while (flat.length < 42) flat.push(null);
  const rows: (number | null)[][] = [];
  for (let r = 0; r < 6; r++) rows.push(flat.slice(r * 7, r * 7 + 7));
  while (rows.length > 0 && rows[rows.length - 1].every((c) => c == null)) {
    rows.pop();
  }
  return rows;
}

const ANNUAL_CAL_WEEKDAY_LABELS = ["一", "二", "三", "四", "五", "六", "日"];
const CHINESE_WEEKDAY_SUN0 = ["日", "一", "二", "三", "四", "五", "六"];

function formatPlanCalDayLabel(isoDate: string): string {
  const d = dayjs(isoDate);
  if (!d.isValid()) return isoDate;
  return `${d.month() + 1}月${d.date()}日 周${CHINESE_WEEKDAY_SUN0[d.day()]}`;
}

const ANNUAL_CAL_MONTH_LABELS = [
  "一月",
  "二月",
  "三月",
  "四月",
  "五月",
  "六月",
  "七月",
  "八月",
  "九月",
  "十月",
  "十一月",
  "十二月"
];

/** 将重复规则展开为指定公历年内的接种节点（MM-DD 循环展示） */
function expandScheduleRecurrence(
  rule: ScheduleRecurrenceRule | null | undefined,
  year: number
): Dayjs[] {
  if (!rule || !rule.interval || rule.interval < 1) return [];
  const y = year;

  switch (rule.frequency) {
    case "DAY": {
      const out: Dayjs[] = [];
      let d = dayjs(`${y}-01-01`);
      const end = dayjs(`${y}-12-31`);
      const step = rule.interval;
      while ((d.isBefore(end) || d.isSame(end, "day")) && out.length < SCHEDULE_RECURRENCE_MAX_DATES) {
        out.push(d);
        d = d.add(step, "day");
      }
      return dedupeSortDates(out);
    }
    case "WEEK": {
      const weekdays =
        rule.byWeekday && rule.byWeekday.length > 0
          ? [...new Set(rule.byWeekday)].sort((a, b) => a - b)
          : [1];
      const interval = rule.interval;
      const out: Dayjs[] = [];
      for (const wd of weekdays) {
        let d = dayjs(`${y}-01-01`);
        while (d.day() !== wd) d = d.add(1, "day");
        let weekIdx = 0;
        while (d.year() === y && out.length < SCHEDULE_RECURRENCE_MAX_DATES) {
          if (weekIdx % interval === 0) out.push(d);
          d = d.add(7, "day");
          weekIdx++;
        }
      }
      return dedupeSortDates(out).slice(0, SCHEDULE_RECURRENCE_MAX_DATES);
    }
    case "MONTH": {
      const interval = rule.interval;
      const mode = rule.monthMode || "date";
      const out: Dayjs[] = [];
      if (mode === "date") {
        const days = rule.byMonthDay?.length ? rule.byMonthDay : [1];
        for (let m = 0; m < 12; m += interval) {
          const base = dayjs(`${y}-${String(m + 1).padStart(2, "0")}-01`);
          if (base.year() !== y) continue;
          for (const md of days) {
            const dim = base.daysInMonth();
            const dd = Math.min(md, dim);
            out.push(base.date(dd));
          }
        }
      } else {
        const pos = rule.bySetPos || 1;
        const wday = rule.byDay ?? 1;
        for (let m = 0; m < 12; m += interval) {
          const dt = nthWeekdayOfMonth(y, m + 1, pos, wday);
          if (dt) out.push(dt);
        }
      }
      return dedupeSortDates(out).slice(0, SCHEDULE_RECURRENCE_MAX_DATES);
    }
    case "YEAR": {
      const months = rule.byMonth?.length ? [...new Set(rule.byMonth)].sort((a, b) => a - b) : [1];
      const out: Dayjs[] = [];
      const mode = rule.monthMode || "date";
      for (const month of months) {
        if (mode === "date") {
          const days = rule.byMonthDay?.length ? rule.byMonthDay : [1];
          const base = dayjs(`${y}-${String(month).padStart(2, "0")}-01`);
          if (base.year() !== y) continue;
          for (const md of days) {
            const dim = base.daysInMonth();
            const dd = Math.min(md, dim);
            out.push(base.date(dd));
          }
        } else {
          const pos = rule.bySetPos || 1;
          const wday = rule.byDay ?? 1;
          const dt = nthWeekdayOfMonth(y, month, pos, wday);
          if (dt) out.push(dt);
        }
      }
      return dedupeSortDates(out).slice(0, SCHEDULE_RECURRENCE_MAX_DATES);
    }
    default:
      return [];
  }
}

/** 将用户选的首次接种日对齐到「本年度」公历年（日历可能点到其他年份，仍按本年度 MM-DD 参与排期） */
function alignStartToPlanYear(start: Dayjs, planYear: number): Dayjs {
  const s = start.startOf("day");
  return s.year() === planYear ? s : s.year(planYear).startOf("day");
}

/** 以首次接种日期为锚点，生成本年度接种时间点（含首次） */
function expandScheduleRecurrenceFromStart(
  rule: ScheduleRecurrenceRule | null | undefined,
  start: Dayjs,
  year: number
): Dayjs[] {
  if (!rule || !rule.interval || rule.interval < 1) return [];
  const y = year;
  const startDay = alignStartToPlanYear(start, y);
  const yearEnd = dayjs(`${y}-12-31`).endOf("day");

  const out: Dayjs[] = [];

  const pushIfInRange = (d: Dayjs | null) => {
    if (!d) return;
    const day = d.startOf("day");
    if (day.isBefore(startDay, "day")) return;
    if (day.isAfter(yearEnd, "day")) return;
    out.push(day);
  };

  if (rule.frequency === "DAY") {
    let d = startDay;
    while ((d.isBefore(yearEnd) || d.isSame(yearEnd, "day")) && out.length < SCHEDULE_RECURRENCE_MAX_DATES) {
      out.push(d);
      d = d.add(rule.interval, "day");
    }
    return dedupeSortDates(out);
  }

  if (rule.frequency === "WEEK") {
    const weekdays =
      rule.byWeekday && rule.byWeekday.length > 0
        ? [...new Set(rule.byWeekday)].sort((a, b) => a - b)
        : [startDay.day()];
    const stepWeeks = rule.interval;

    for (const wd of weekdays) {
      let d = startDay;
      while (d.day() !== wd) d = d.add(1, "day");
      while ((d.isBefore(yearEnd) || d.isSame(yearEnd, "day")) && out.length < SCHEDULE_RECURRENCE_MAX_DATES) {
        out.push(d);
        d = d.add(stepWeeks * 7, "day");
      }
    }
    return dedupeSortDates(out);
  }

  if (rule.frequency === "MONTH") {
    const interval = rule.interval;
    const mode = rule.monthMode || "date";
    const startMonthIndex = startDay.month(); // 0-11
    if (mode === "date") {
      const days = rule.byMonthDay?.length ? rule.byMonthDay : [startDay.date()];
      for (let m = startMonthIndex; m < 12 && out.length < SCHEDULE_RECURRENCE_MAX_DATES; m += interval) {
        const base = dayjs(`${y}-${String(m + 1).padStart(2, "0")}-01`);
        for (const md of days) {
          const dd = Math.min(Math.max(1, md), base.daysInMonth());
          pushIfInRange(base.date(dd));
        }
      }
    } else {
      const pos = rule.bySetPos || 1;
      const wday = rule.byDay ?? startDay.day();
      for (let m = startMonthIndex; m < 12 && out.length < SCHEDULE_RECURRENCE_MAX_DATES; m += interval) {
        pushIfInRange(nthWeekdayOfMonth(y, m + 1, pos, wday));
      }
    }
    return dedupeSortDates(out);
  }

  if (rule.frequency === "YEAR") {
    const mode = rule.monthMode || "date";
    const months = rule.byMonth?.length ? [...new Set(rule.byMonth)].sort((a, b) => a - b) : [startDay.month() + 1];
    if (mode === "date") {
      const days = rule.byMonthDay?.length ? rule.byMonthDay : [startDay.date()];
      for (const month of months) {
        const base = dayjs(`${y}-${String(month).padStart(2, "0")}-01`);
        for (const md of days) {
          const dd = Math.min(Math.max(1, md), base.daysInMonth());
          pushIfInRange(base.date(dd));
        }
      }
    } else {
      const pos = rule.bySetPos || 1;
      const wday = rule.byDay ?? startDay.day();
      for (const month of months) {
        pushIfInRange(nthWeekdayOfMonth(y, month, pos, wday));
      }
    }
    return dedupeSortDates(out);
  }

  return [];
}

function describeScheduleRecurrence(rule: ScheduleRecurrenceRule | null | undefined): string {
  if (!rule || !rule.interval) return "";
  const { frequency, interval } = rule;
  const unit =
    frequency === "DAY"
      ? "天"
      : frequency === "WEEK"
        ? "周"
        : frequency === "MONTH"
          ? "个月"
          : "年";
  let head = "";
  if (frequency === "DAY") head = `每 ${interval} 天重复一次`;
  else if (frequency === "WEEK") {
    const days =
      rule.byWeekday && rule.byWeekday.length
        ? rule.byWeekday
            .slice()
            .sort((a, b) => a - b)
            .map((d) => `周${WEEKDAY_LABELS[d]}`)
            .join("、")
        : "";
    head = `每 ${interval} 周${days ? ` · ${days}` : ""}`;
  } else if (frequency === "MONTH") {
    head =
      (rule.monthMode || "date") === "date"
        ? `每 ${interval} 个月 · 每月 ${(rule.byMonthDay || [1]).join("、")} 日`
        : `每 ${interval} 个月 · ${rule.bySetPos === 5 ? "最后一个" : `第 ${rule.bySetPos} 个`}星期${WEEKDAY_LABELS[rule.byDay ?? 1]}`;
  } else {
    const mo = (rule.byMonth || [1]).map((m) => `${m} 月`).join("、");
    head =
      (rule.monthMode || "date") === "date"
        ? `每 ${interval} 年 · ${mo} · ${(rule.byMonthDay || [1]).join("、")} 日`
        : `每 ${interval} 年 · ${mo} · ${rule.bySetPos === 5 ? "最后一个" : `第 ${rule.bySetPos} 个`}星期${WEEKDAY_LABELS[rule.byDay ?? 1]}`;
  }
  return head;
}

/** 首次接种日期选择器：单日期 + Popover 日历 */
function ScheduleDatesPicker({
  value = [],
  onChange,
  disabled
}: {
  value?: Dayjs[];
  onChange?: (val: Dayjs[]) => void;
  disabled?: boolean;
}) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const dates = Array.isArray(value)
    ? value.map((d) => coerceDayjs(d)).filter((d): d is Dayjs => !!d)
    : [];
  const singleDate = dates[0];

  const handleSelect = (d: Dayjs | null) => {
    if (!d) return;
    const picked = dayjs(d.valueOf());
    if (picked.startOf("day").isBefore(dayjs().startOf("day"))) return;
    onChange?.([picked]);
    setPopoverOpen(false);
  };

  const handleClear = () => {
    onChange?.([]);
  };

  const disabledDate = (current: Dayjs) =>
    current.startOf("day").isBefore(dayjs().startOf("day"));

  return (
    <div className="schedule-dates-picker">
      <div className="schedule-dates-card">
        <div className="schedule-dates-chips">
          {!singleDate ? (
            <span className="schedule-dates-empty">请选择首次接种日期</span>
          ) : (
            <Tag
              key={singleDate.format("MM-DD")}
              closable={!disabled}
              onClose={(e) => {
                e.preventDefault();
                if (disabled) return;
                handleClear();
              }}
              className="schedule-date-chip"
            >
              {singleDate.format("MM-DD")}
            </Tag>
          )}
        </div>
        <Popover
          open={disabled ? false : popoverOpen}
          onOpenChange={(open) => {
            if (!disabled) setPopoverOpen(open);
          }}
          trigger="click"
          content={
            <div className="schedule-dates-popover">
              <Text type="secondary" style={{ display: "block", marginBottom: 8, fontSize: 12 }}>
                仅可选择今天及之后的日期
              </Text>
              <Calendar
                fullscreen={false}
                defaultValue={dayjs()}
                disabledDate={disabledDate}
                onSelect={(d) => handleSelect(d)}
              />
            </div>
          }
        >
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            className="schedule-dates-add-btn"
            disabled={disabled}
          >
            选择日期
          </Button>
        </Popover>
      </div>
    </div>
  );
}

function ScheduleRecurrenceModal({
  open,
  initialRule,
  anchorDate,
  onOk,
  onCancel
}: {
  open: boolean;
  initialRule: ScheduleRecurrenceRule;
  /** 与配置页一致：有则按「自首次接种日」展开；无则提示为公历年初参考 */
  anchorDate?: Dayjs | null;
  onOk: (rule: ScheduleRecurrenceRule) => void;
  onCancel: () => void;
}) {
  const [rule, setRule] = useState<ScheduleRecurrenceRule>(initialRule);

  useEffect(() => {
    if (open) setRule({ ...initialRule });
  }, [open, initialRule]);

  const summary = useMemo(() => {
    const y = dayjs().year();
    const desc = describeScheduleRecurrence(rule);
    let preview: string;

    if (anchorDate && anchorDate.isValid()) {
      const sample = expandScheduleRecurrenceFromStart(rule, anchorDate, y);
      if (sample.length > 0) {
        preview = `与配置页相同，自首次接种日起本年度共 ${sample.length} 个节点：${sample
          .slice(0, 8)
          .map((d) => d.format("MM-DD"))
          .join("、")}${sample.length > 8 ? "…" : ""}`;
      } else {
        preview = `与配置页相同：自首次接种日（${anchorDate.format("YYYY-MM-DD")}）起，本年度内无符合规则的节点（0 次）。请调整规则或首次接种日期。`;
      }
    } else {
      const sample = expandScheduleRecurrence(rule, y);
      preview =
        sample.length > 0
          ? `未选首次接种日时，以下为按公历年初参考（选日期后将按首次接种日重算，可能与下表不同）：本年度参考 ${sample.length} 个节点：${sample
              .slice(0, 8)
              .map((d) => d.format("MM-DD"))
              .join("、")}${sample.length > 8 ? "…" : ""}`
          : "当前规则在本年度（按年初参考）未生成日期，请检查选项。";
    }
    return { desc, preview };
  }, [rule, anchorDate]);

  const setFreq = (frequency: ScheduleRecurrenceFrequency) => {
    setRule((r) => {
      const next = { ...r, frequency };
      if (frequency === "WEEK" && (!next.byWeekday || next.byWeekday.length === 0)) {
        next.byWeekday = [1];
      }
      if (frequency === "MONTH" || frequency === "YEAR") {
        if (!next.monthMode) next.monthMode = "date";
        if (frequency === "YEAR" && (!next.byMonth || next.byMonth.length === 0)) next.byMonth = [1];
        if ((next.monthMode === "date" || frequency === "MONTH") && (!next.byMonthDay || next.byMonthDay.length === 0))
          next.byMonthDay = [1];
      }
      return next;
    });
  };

  return (
    <Modal
      title={
        <Space>
          <CalendarOutlined />
          <span>自定义重复</span>
        </Space>
      }
      open={open}
      onCancel={onCancel}
      onOk={() => {
        if (rule.frequency === "WEEK" && (!rule.byWeekday || rule.byWeekday.length === 0)) {
          message.warning("请至少选择一个星期");
          return;
        }
        if (rule.frequency === "YEAR" && (!rule.byMonth || rule.byMonth.length === 0)) {
          message.warning("请至少选择一个月份");
          return;
        }
        const mode = rule.monthMode || "date";
        if (
          (rule.frequency === "MONTH" || rule.frequency === "YEAR") &&
          mode === "date" &&
          (!rule.byMonthDay || rule.byMonthDay.length === 0)
        ) {
          message.warning("请至少选择一个日期");
          return;
        }
        onOk(rule);
      }}
      width={520}
      className="schedule-recurrence-modal"
      okText="确定"
      cancelText="取消"
      destroyOnClose
    >
      <div className="schedule-recurrence-modal-body">
        <div className="schedule-recurrence-row">
          <Text>频率</Text>
          <Select
            value={rule.frequency}
            onChange={(v) => setFreq(v as ScheduleRecurrenceFrequency)}
            style={{ width: 160 }}
            options={[
              { label: "天", value: "DAY" },
              { label: "周", value: "WEEK" },
              { label: "月", value: "MONTH" },
              { label: "年", value: "YEAR" }
            ]}
          />
        </div>
        <div className="schedule-recurrence-row">
          <Text>每</Text>
          <InputNumber
            min={1}
            max={999}
            value={rule.interval}
            onChange={(v) => setRule((r) => ({ ...r, interval: v || 1 }))}
          />
          <Text type="secondary">
            {rule.frequency === "DAY"
              ? "天"
              : rule.frequency === "WEEK"
                ? "周"
                : rule.frequency === "MONTH"
                  ? "个月"
                  : "年"}
          </Text>
        </div>

        {rule.frequency === "WEEK" && (
          <div className="schedule-recurrence-block">
            <Text type="secondary" className="schedule-recurrence-label">
              在每周的
            </Text>
            <Checkbox.Group
              value={rule.byWeekday}
              onChange={(vals) =>
                setRule((r) => ({ ...r, byWeekday: vals as number[] }))
              }
            >
              <Row gutter={[8, 8]}>
                {WEEKDAY_LABELS.map((lb, i) => (
                  <Col key={i}>
                    <Checkbox value={i}>周{lb}</Checkbox>
                  </Col>
                ))}
              </Row>
            </Checkbox.Group>
          </div>
        )}

        {(rule.frequency === "MONTH" || rule.frequency === "YEAR") && (
          <>
            {rule.frequency === "YEAR" && (
              <div className="schedule-recurrence-block">
                <Text type="secondary" className="schedule-recurrence-label">
                  月份
                </Text>
                <Checkbox.Group
                  value={rule.byMonth}
                  onChange={(vals) =>
                    setRule((r) => ({
                      ...r,
                      byMonth: (vals as number[]).length ? (vals as number[]) : [1]
                    }))
                  }
                >
                  <div className="schedule-recurrence-month-grid">
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <Checkbox key={m} value={m} className="schedule-recurrence-month-cell">
                        {m} 月
                      </Checkbox>
                    ))}
                  </div>
                </Checkbox.Group>
              </div>
            )}
            <div className="schedule-recurrence-row">
              <Text>日期方式</Text>
              <Radio.Group
                value={rule.monthMode || "date"}
                onChange={(e) =>
                  setRule((r) => ({ ...r, monthMode: e.target.value }))
                }
              >
                <Radio value="date">每月几号</Radio>
                <Radio value="relative">第 N 个星期几</Radio>
              </Radio.Group>
            </div>
            {(rule.monthMode || "date") === "date" ? (
              <div className="schedule-recurrence-block">
                <Text type="secondary" className="schedule-recurrence-label">
                  日期（可多选）
                </Text>
                <Checkbox.Group
                  value={rule.byMonthDay}
                  onChange={(vals) =>
                    setRule((r) => ({
                      ...r,
                      byMonthDay: (vals as number[]).length ? (vals as number[]) : [1]
                    }))
                  }
                >
                  <div className="schedule-recurrence-day-grid">
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <Checkbox key={d} value={d} className="schedule-recurrence-day-cell">
                        {d}
                      </Checkbox>
                    ))}
                  </div>
                </Checkbox.Group>
              </div>
            ) : (
              <div className="schedule-recurrence-row schedule-recurrence-row-wrap">
                <Space wrap>
                  <Select
                    value={rule.bySetPos || 1}
                    onChange={(v) =>
                      setRule((r) => ({ ...r, bySetPos: v as 1 | 2 | 3 | 4 | 5 }))
                    }
                    style={{ width: 140 }}
                    options={[
                      { label: "第一个", value: 1 },
                      { label: "第二个", value: 2 },
                      { label: "第三个", value: 3 },
                      { label: "第四个", value: 4 },
                      { label: "最后一个", value: 5 }
                    ]}
                  />
                  <Select
                    value={rule.byDay ?? 1}
                    onChange={(v) => setRule((r) => ({ ...r, byDay: v }))}
                    style={{ width: 120 }}
                    options={WEEKDAY_LABELS.map((lb, i) => ({
                      label: `星期${lb}`,
                      value: i
                    }))}
                  />
                </Space>
              </div>
            )}
          </>
        )}

        <div className="schedule-recurrence-summary">
          <Text type="secondary">{summary.desc}</Text>
          <Paragraph type="secondary" style={{ marginBottom: 0, marginTop: 8, fontSize: 12 }}>
            {summary.preview}
          </Paragraph>
        </div>
      </div>
    </Modal>
  );
}

/** 表单里可能是 Dayjs、ISO 字符串等，统一为可计算的 Dayjs */
function coerceDayjs(d: unknown): Dayjs | undefined {
  if (d == null || d === "") return undefined;
  if (dayjs.isDayjs(d)) return d.isValid() ? d : undefined;
  if (typeof d === "object" && d !== null && typeof (d as { valueOf?: () => unknown }).valueOf === "function") {
    const n = (d as { valueOf: () => unknown }).valueOf();
    if (typeof n === "number" && Number.isFinite(n)) {
      const x = dayjs(n);
      return x.isValid() ? x : undefined;
    }
  }
  const x = dayjs(d as string | number | Date);
  return x.isValid() ? x : undefined;
}

/** 与当前表单字段 scheduleDates 对应的最早执行日（首次接种锚点）。Form.Item 会覆盖子组件 onChange，不能依赖单独字段同步首次日期。 */
function anchorFromScheduleDates(value: unknown): Dayjs | undefined {
  if (!Array.isArray(value)) return undefined;
  const valid = value.map(coerceDayjs).filter((d): d is Dayjs => !!d);
  if (!valid.length) return undefined;
  return [...valid].sort((a, b) => a.valueOf() - b.valueOf())[0];
}

function scheduleDatesArrayEqual(a: Dayjs[] | undefined, b: Dayjs[]): boolean {
  if (!a || a.length !== b.length) return false;
  const key = (xs: Dayjs[]) =>
    xs
      .map(coerceDayjs)
      .filter((d): d is Dayjs => !!d)
      .map((d) => d.format("YYYY-MM-DD"))
      .sort()
      .join("\0");
  return key(a) === key(b);
}

/** 快捷频率：CUSTOM 时不选中任何一项，与高级自定义一致 */
function ScheduleRepeatPresetRadio({
  value,
  onChange,
  ...rest
}: {
  value?: ScheduleRepeatPreset;
  onChange?: React.ComponentProps<typeof Radio.Group>["onChange"];
}) {
  const display = value === "CUSTOM" ? undefined : value;
  return (
    <Radio.Group
      {...rest}
      optionType="button"
      buttonStyle="solid"
      className="mass-schedule-preset-radios"
      value={display}
      onChange={onChange}
    >
      <Radio.Button value="MONTHLY">每月</Radio.Button>
      <Radio.Button value="QUARTERLY">每季度</Radio.Button>
      <Radio.Button value="YEARLY">每年</Radio.Button>
    </Radio.Group>
  );
}

function AnnualVaccinationYearView({
  year,
  dayMap,
  headerRight,
  footNote,
  onOpenPlanReadonly
}: {
  year: number;
  dayMap: Map<string, PlanDayMassTask[]>;
  headerRight?: ReactNode;
  footNote?: ReactNode;
  onOpenPlanReadonly?: (planId: string) => void;
}) {
  const today = dayjs().format("YYYY-MM-DD");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const stats = useMemo(() => {
    let days = 0;
    let hits = 0;
    for (const [, arr] of dayMap) {
      days++;
      hits += arr.length;
    }
    return { days, hits };
  }, [dayMap]);

  useEffect(() => {
    setSelectedKey(null);
  }, [year, dayMap]);

  const selectedTasks = selectedKey ? dayMap.get(selectedKey) : undefined;

  return (
    <div className="plan-annual-cal plan-annual-cal--year-at-a-glance">
      <div className="plan-annual-cal-head plan-annual-cal-head--dense">
        <div className="plan-annual-cal-head-text">
          <span className="plan-annual-cal-kicker-inline">Schedule</span>
          <div className="plan-annual-cal-head-meta-row">
            <span className="plan-annual-cal-meta-year">{year}</span>
            <span className="plan-annual-cal-meta-chips" aria-label="统计">
              <span className="plan-annual-cal-chip">
                <span className="plan-annual-cal-chip-value">{stats.days}</span>
                <span className="plan-annual-cal-chip-label">接种日</span>
              </span>
              <span className="plan-annual-cal-chip">
                <span className="plan-annual-cal-chip-value">{stats.hits}</span>
                <span className="plan-annual-cal-chip-label">节点</span>
              </span>
            </span>
            <span className="plan-annual-cal-head-hint">点击日期 · 右侧查看任务</span>
          </div>
        </div>
        {headerRight ? <div className="plan-annual-cal-head-right">{headerRight}</div> : null}
      </div>

      <div className="plan-annual-cal-shell">
        <div className="plan-annual-cal-main">
          <div className="plan-annual-cal-months plan-annual-cal-months--grid-3x4">
            {ANNUAL_CAL_MONTH_LABELS.map((label, idx) => {
              const month = idx + 1;
              const rows = buildMonthWeekRows(year, month);
              return (
                <div key={month} className="plan-annual-cal-month plan-annual-cal-month--dense">
                  <div className="plan-annual-cal-month-name">{label}</div>
                  <div className="plan-annual-cal-wd-row" aria-hidden>
                    {ANNUAL_CAL_WEEKDAY_LABELS.map((w) => (
                      <div key={w} className="plan-annual-cal-wd">
                        {w}
                      </div>
                    ))}
                  </div>
                  <div className="plan-annual-cal-weeks plan-annual-cal-weeks--dense">
                    {rows.map((row, ri) => (
                      <div key={ri} className="plan-annual-cal-days-row">
                        {row.map((dn, cellIdx) => {
                          if (dn == null) {
                            return (
                              <div
                                key={`e-${cellIdx}`}
                                className="plan-annual-cal-cell plan-annual-cal-cell--empty"
                              />
                            );
                          }
                          const cellKey = `${year}-${String(month).padStart(2, "0")}-${String(dn).padStart(2, "0")}`;
                          const items = dayMap.get(cellKey);
                          const has = items && items.length > 0;
                          const cellClass = [
                            "plan-annual-cal-cell",
                            has ? "plan-annual-cal-cell--has" : "",
                            cellKey === today ? "plan-annual-cal-cell--today" : "",
                            selectedKey === cellKey ? "plan-annual-cal-cell--selected" : ""
                          ]
                            .filter(Boolean)
                            .join(" ");

                          return (
                            <div key={cellKey} className="plan-annual-cal-cell-wrap">
                              <button
                                type="button"
                                className="plan-annual-cal-cell-hit"
                                onClick={() => setSelectedKey(cellKey)}
                                aria-pressed={selectedKey === cellKey}
                                aria-label={`${month}月${dn}日`}
                              >
                                <div className={cellClass}>
                                  <div className="plan-annual-cal-cell-num">{dn}</div>
                                  {has ? (
                                    <div className="plan-annual-cal-cell-dots" aria-hidden>
                                      {items.slice(0, 3).map((it) => (
                                        <span
                                          key={it.planId}
                                          className={`plan-annual-cal-dot${it.enabled ? "" : " plan-annual-cal-dot--off"}`}
                                          style={{
                                            background: `hsl(${accentHueFromId(it.planId)} 56% 52%)`
                                          }}
                                        />
                                      ))}
                                    </div>
                                  ) : null}
                                </div>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <aside className="plan-annual-cal-sidebar" aria-live="polite">
          {!selectedKey ? (
            <div className="plan-annual-cal-detail plan-annual-cal-detail--empty">
              <div className="plan-annual-cal-detail-illus" aria-hidden />
              <div className="plan-annual-cal-detail-title">当日任务</div>
              <Paragraph type="secondary" className="plan-annual-cal-detail-hint" style={{ marginBottom: 0 }}>
                在左侧网格中点选日期，此处展示该日的普免接种任务与状态。
              </Paragraph>
            </div>
          ) : (
            <div className="plan-annual-cal-detail">
              <div className="plan-annual-cal-detail-kicker">已选日期</div>
              <div className="plan-annual-cal-detail-date">
                {formatPlanCalDayLabel(selectedKey)}
              </div>
              <div className="plan-annual-cal-detail-date-sub">{selectedKey}</div>
              {!selectedTasks || selectedTasks.length === 0 ? (
                <Paragraph type="secondary" className="plan-annual-cal-detail-empty-msg" style={{ marginBottom: 0 }}>
                  该日暂无普免排期。
                </Paragraph>
              ) : (
                <ul className="plan-annual-cal-detail-list">
                  {selectedTasks.map((it) => (
                    <li key={it.planId} className="plan-annual-cal-detail-card">
                      <div className="plan-annual-cal-detail-card-head">
                        <span
                          className="plan-annual-cal-detail-swatch"
                          style={{
                            background: `hsl(${accentHueFromId(it.planId)} 56% 52%)`
                          }}
                        />
                        <span className="plan-annual-cal-detail-name">{it.planName}</span>
                        <Tooltip title="在配置页查看（只读）">
                          <Button
                            type="text"
                            size="small"
                            className="plan-annual-cal-detail-view-btn"
                            icon={<EyeOutlined />}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onOpenPlanReadonly?.(it.planId);
                            }}
                            aria-label="在配置页查看计划"
                          />
                        </Tooltip>
                        <span
                          className={
                            it.enabled
                              ? "plan-annual-cal-status plan-annual-cal-status--on"
                              : "plan-annual-cal-status plan-annual-cal-status--off"
                          }
                        >
                          {it.enabled ? "启用" : "停用"}
                        </span>
                      </div>
                      <div className="plan-annual-cal-detail-body">
                        <div className="plan-annual-cal-detail-field">
                          <span className="plan-annual-cal-detail-field-label">疫苗</span>
                          <span className="plan-annual-cal-detail-field-value">{it.vaccine || "—"}</span>
                        </div>
                        {it.pigType ? (
                          <div className="plan-annual-cal-detail-field">
                            <span className="plan-annual-cal-detail-field-label">目标群体</span>
                            <span className="plan-annual-cal-detail-field-value">{it.pigType}</span>
                          </div>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </aside>
      </div>
      {footNote ? <div className="plan-annual-cal-foot">{footNote}</div> : null}
    </div>
  );
}

/** 接种排期：是否重复 + 自定义规则 + 芯片展示
 *  排期字段嵌套在无 name 的 Form.Item 下时，useWatch 可能不触发重渲染；且 setFieldValue 不会走 onValuesChange。
 *  由父级传入 scheduleFieldsTick + bump，与 getFieldValue 组合保证预览与展开同步。 */
function MassScheduleDatesSection({
  scheduleFieldsTick,
  bumpScheduleFields,
  calendarYear: calendarYearProp,
  draftPreviewMeta,
  onOpenAnnualCalendar,
  readOnly
}: {
  scheduleFieldsTick: number;
  bumpScheduleFields: () => void;
  calendarYear?: number;
  draftPreviewMeta?: { vaccineName: string; planName?: string };
  onOpenAnnualCalendar?: (payload: { year: number; dayMap: Map<string, PlanDayMassTask[]> }) => void;
  readOnly?: boolean;
}) {
  const form = Form.useFormInstance();
  const [modalOpen, setModalOpen] = useState(false);

  const scheduleYear = calendarYearProp ?? dayjs().year();

  const repeatEnabled = form.getFieldValue("scheduleRepeatEnabled") as boolean | undefined;
  const recurrence = form.getFieldValue("scheduleRecurrence") as
    | ScheduleRecurrenceRule
    | null
    | undefined;

  const anchorDate = useMemo(() => {
    void scheduleFieldsTick;
    return anchorFromScheduleDates(form.getFieldValue("scheduleDates"));
  }, [scheduleFieldsTick, form]);

  useEffect(() => {
    void scheduleFieldsTick;
    if (readOnly) return;
    const re = form.getFieldValue("scheduleRepeatEnabled") as boolean | undefined;
    if (!re) return;
    const anchor = anchorFromScheduleDates(form.getFieldValue("scheduleDates"));
    const preset = form.getFieldValue("scheduleRepeatPreset") as ScheduleRepeatPreset | undefined;
    let rec = form.getFieldValue("scheduleRecurrence") as ScheduleRecurrenceRule | null | undefined;

    if (preset && preset !== "CUSTOM" && anchor) {
      const nextRule = presetToRule(preset, anchor);
      if (JSON.stringify(rec) !== JSON.stringify(nextRule)) {
        form.setFieldValue("scheduleRecurrence", nextRule);
        bumpScheduleFields();
        return;
      }
      rec = nextRule;
    }

    if (!rec || !anchor) return;
    const endMode = form.getFieldValue("scheduleRepeatEndMode") as ScheduleRepeatEndMode | undefined;
    const endDate = form.getFieldValue("scheduleRepeatEndDate");
    const next = expandMassPlanScheduleDates(rec, anchor, endMode, endDate, scheduleYear);
    if (!next.length) return;
    const cur = form.getFieldValue("scheduleDates") as Dayjs[] | undefined;
    if (scheduleDatesArrayEqual(cur, next)) return;
    form.setFieldValue("scheduleDates", next);
    bumpScheduleFields();
  }, [scheduleFieldsTick, scheduleYear, form, bumpScheduleFields, readOnly]);

  const ruleForModal =
    (form.getFieldValue("scheduleRecurrence") as ScheduleRecurrenceRule | null | undefined) ||
    defaultScheduleRecurrence();
  const generated = useMemo(() => {
    void scheduleFieldsTick;
    const re = form.getFieldValue("scheduleRepeatEnabled") as boolean | undefined;
    const rec = form.getFieldValue("scheduleRecurrence") as ScheduleRecurrenceRule | null | undefined;
    const anchor = anchorFromScheduleDates(form.getFieldValue("scheduleDates"));
    if (!re || !rec || !anchor) return [];
    const endMode = form.getFieldValue("scheduleRepeatEndMode") as ScheduleRepeatEndMode | undefined;
    const endDate = form.getFieldValue("scheduleRepeatEndDate");
    return expandMassPlanScheduleDates(rec, anchor, endMode, endDate, scheduleYear);
  }, [scheduleFieldsTick, scheduleYear, form]);
  const afterFirstPreview = useMemo(() => {
    void scheduleFieldsTick;
    const anchor = anchorFromScheduleDates(form.getFieldValue("scheduleDates"));
    if (!anchor) return [];
    const firstKey = anchor.format("YYYY-MM-DD");
    return generated.filter((d) => d.format("YYYY-MM-DD") !== firstKey).slice(0, 6);
  }, [generated, scheduleFieldsTick, form]);

  const presetField = form.getFieldValue("scheduleRepeatPreset") as ScheduleRepeatPreset | undefined;
  const endModeField = form.getFieldValue("scheduleRepeatEndMode") as ScheduleRepeatEndMode | undefined;
  const endDateParsed = parseScheduleEndDate(form.getFieldValue("scheduleRepeatEndDate"));
  const planCountPhrase =
    endModeField === "on_date" && endDateParsed
      ? `计划共 ${generated.length} 次（截至 ${endDateParsed.format("YYYY-MM-DD")}）`
      : `本年度计划执行 ${generated.length} 次`;

  const endDateMin = useMemo(() => {
    const t = dayjs().startOf("day");
    const a = anchorDate?.startOf("day");
    if (!a) return t;
    return a.isAfter(t) ? a : t;
  }, [anchorDate]);

  return (
    <div className="mass-schedule-dates-section">
      <Form.Item
        name="scheduleDates"
        noStyle
        rules={[
          {
            validator: (_, value) => {
              if (!Array.isArray(value) || !value.some((d: Dayjs | undefined) => !!coerceDayjs(d))) {
                return Promise.reject(new Error("请至少选择一个执行日期"));
              }
              const first = anchorFromScheduleDates(value);
              if (!first) return Promise.reject(new Error("请至少选择一个执行日期"));
              if (first.startOf("day").isBefore(dayjs().startOf("day"))) {
                return Promise.reject(new Error("首次接种日期不能早于今天"));
              }
              return Promise.resolve();
            }
          }
        ]}
      >
        <ScheduleDatesPicker disabled={readOnly} />
      </Form.Item>
      <div className="mass-schedule-repeat-toolbar">
        <div className="mass-schedule-repeat-row">
          <span className="mass-schedule-repeat-label">是否重复</span>
          <Form.Item name="scheduleRepeatEnabled" valuePropName="checked" noStyle>
            <Switch
              onChange={(checked) => {
                if (checked) {
                  form.setFieldValue("scheduleRepeatPreset", "MONTHLY");
                  const anchor = anchorFromScheduleDates(form.getFieldValue("scheduleDates"));
                  form.setFieldValue("scheduleRecurrence", presetToRule("MONTHLY", anchor));
                  bumpScheduleFields();
                }
              }}
            />
          </Form.Item>
        </div>
        {repeatEnabled && (
          <div className="mass-schedule-repeat-options">
            <div className="mass-schedule-preset-row">
              <Text type="secondary" className="mass-schedule-preset-label">
                重复频率
              </Text>
              <Space wrap align="center">
                <Form.Item
                  name="scheduleRepeatPreset"
                  noStyle
                  getValueFromEvent={(e) => (e as { target: { value: ScheduleRepeatPreset } }).target.value}
                >
                  <ScheduleRepeatPresetRadio />
                </Form.Item>
                <Button
                  type="default"
                  size="small"
                  icon={<CalendarOutlined />}
                  disabled={readOnly}
                  className={
                    presetField === "CUSTOM"
                      ? "mass-schedule-custom-btn mass-schedule-custom-btn--active"
                      : "mass-schedule-custom-btn"
                  }
                  onClick={() => setModalOpen(true)}
                >
                  高级自定义
                </Button>
              </Space>
            </div>
            {presetField === "CUSTOM" && recurrence && (
              <div className="mass-schedule-advanced-rule-card">
                <div className="mass-schedule-advanced-rule-card-head">
                  <Text strong className="mass-schedule-advanced-rule-card-title">
                    高级自定义规则
                  </Text>
                  <Tag bordered={false} color="processing">
                    已生效
                  </Tag>
                </div>
                <Paragraph type="secondary" className="mass-schedule-advanced-rule-card-body" style={{ marginBottom: 0 }}>
                  {describeScheduleRecurrence(recurrence)}
                </Paragraph>
              </div>
            )}
            <Row gutter={[16, 12]}>
              <Col xs={24} sm={12}>
                <Form.Item label="结束重复" name="scheduleRepeatEndMode">
                  <Select
                    placeholder="选择结束方式"
                    options={[
                      { label: "永不", value: "never" },
                      { label: "于日期", value: "on_date" }
                    ]}
                    onChange={(v) => {
                      if (v === "never") form.setFieldValue("scheduleRepeatEndDate", undefined);
                      bumpScheduleFields();
                    }}
                  />
                </Form.Item>
              </Col>
              {endModeField === "on_date" && (
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="结束日期"
                    name="scheduleRepeatEndDate"
                    rules={[{ required: true, message: "请选择结束日期" }]}
                  >
                    <DatePicker
                      style={{ width: "100%" }}
                      format="YYYY-MM-DD"
                      disabledDate={(d) => d.startOf("day").isBefore(endDateMin)}
                      onChange={() => bumpScheduleFields()}
                    />
                  </Form.Item>
                </Col>
              )}
            </Row>
            {recurrence && presetField !== "CUSTOM" && (
              <div className="mass-schedule-rule-summary">
                <Text type="secondary">{describeScheduleRecurrence(recurrence)}</Text>
              </div>
            )}
            {recurrence != null && anchorDate && (
              <div className="mass-schedule-rule-summary">
                <Text>
                  首次接种定于 <Text code>[{anchorDate.format("YYYY-MM-DD")}]</Text>。
                  {planCountPhrase}，后续接种时间点预览：
                  {afterFirstPreview.length > 0
                    ? ` ${afterFirstPreview.map((d) => d.format("MM-DD")).join("、")}${generated.length - 1 > afterFirstPreview.length ? " ..." : ""}`
                    : " -"}
                </Text>
              </div>
            )}
          </div>
        )}
      </div>
      <ScheduleRecurrenceModal
        open={modalOpen}
        initialRule={ruleForModal}
        anchorDate={anchorDate}
        onCancel={() => setModalOpen(false)}
        onOk={(next) => {
          form.setFieldsValue({
            scheduleRecurrence: next,
            scheduleRepeatPreset: "CUSTOM"
          });
          setModalOpen(false);
          bumpScheduleFields();
        }}
      />
      {!readOnly && draftPreviewMeta && onOpenAnnualCalendar ? (
        <div className="mass-schedule-annual-nav">
          <Button
            type="default"
            icon={<CalendarOutlined />}
            className="mass-schedule-annual-nav-btn"
            onClick={() =>
              onOpenAnnualCalendar({
                year: scheduleYear,
                dayMap: buildDraftMassDayMap(
                  (n) => form.getFieldValue(n),
                  scheduleYear,
                  draftPreviewMeta,
                  generated
                )
              })
            }
          >
            在年度日历中查看
          </Button>
          <Text type="secondary" className="mass-schedule-annual-nav-hint">
            跳转全屏日历，点击日期在右侧查看本表单下的排期任务。
          </Text>
        </div>
      ) : null}
    </div>
  );
}

const massPlanList = [
  {
    id: "mass-001",
    name: "2024 秋季普免",
    pigType: "生产母猪",
    cycle: "每年",
    execute: "10-01/12-15",
    vaccine: "非瘟灭活疫苗",
    dosage: 2,
    dosageUnit: "毫克",
    exclusion: "分娩结束后 5-7 天",
    enabled: true,
    /** 接种任务已下发至执行端，禁止关闭启用 */
    workOrdersDispatched: true
  },
  {
    id: "mass-002",
    name: "季度普免",
    pigType: "仔猪",
    cycle: "每季度",
    execute: "01-01/04-01/07-01/10-01",
    vaccine: "蓝耳二联疫苗",
    dosage: 1,
    dosageUnit: "毫克",
    exclusion: "哺乳期前 7 天",
    enabled: true,
    /** 已有部分猪只完成接种，关闭启用需二次确认 */
    partialVaccinationProgress: true
  },
  {
    id: "mass-003",
    name: "春季普免",
    pigType: "生产母猪",
    cycle: "每年",
    execute: "04-01/10-01",
    vaccine: "伪狂犬疫苗",
    dosage: 1.5,
    dosageUnit: "毫克",
    exclusion: "无",
    enabled: false,
    effectTracking: {
      effectTrackingEnabled: true,
      targetAntibody: "伪狂犬病毒 gE 抗体",
      samplingMethod: "EAR_VEIN",
      sampleContainer: "BLOOD_TUBE",
      samplingIntervalDays: 28,
      samplingRatioPercent: 8,
      qualificationThresholdPercent: 80
    } satisfies PlanEffectTrackingStored
  },
  {
    id: "mass-004",
    name: "重点区补免",
    pigType: "生产公猪",
    cycle: "每年",
    execute: "01-01/10-01",
    vaccine: "圆环疫苗",
    dosage: 1,
    dosageUnit: "毫克",
    exclusion: "无",
    enabled: true
  }
];

const routinePlanList = [
  {
    id: "routine-001",
    name: "保育线仔猪跟批免疫",
    line: "一线-保育",
    pigType: "仔猪",
    triggerRule: "预计生产任务开始前",
    dispatchTime: "查情 开始前 3天",
    vaccine: "蓝耳二联疫苗",
    dosage: 1,
    dosageUnit: "毫克",
    enabled: true,
    workOrdersDispatched: true,
    exclusion: "无",
    effectTracking: {
      effectTrackingEnabled: true,
      targetAntibody: "猪繁殖与呼吸综合征病毒抗体",
      samplingMethod: "FRONT_VENA",
      sampleContainer: "REAGENT_BAG_BLOOD",
      samplingIntervalDays: 21,
      samplingRatioPercent: 5,
      qualificationThresholdPercent: 80
    } satisfies PlanEffectTrackingStored
  },
  {
    id: "routine-002",
    name: "繁育线母猪跟批免疫",
    line: "三线-繁育",
    pigType: "生产母猪",
    triggerRule: "生产状态",
    dispatchTime: "已妊娠 10天",
    vaccine: "非瘟灭活疫苗",
    dosage: 2,
    dosageUnit: "毫克",
    enabled: true,
    partialVaccinationProgress: true,
    exclusion: "无"
  }
];

const VACCINATION_METHOD_OPTIONS = [
  { label: "肌肉注射", value: "肌肉注射" },
  { label: "皮下注射", value: "皮下注射" },
  { label: "滴鼻", value: "滴鼻" },
  { label: "饮水", value: "饮水" },
  { label: "喷雾", value: "喷雾" }
];

const ROUTE_TO_METHOD_LABEL: Record<string, string> = {
  IM: "肌肉注射",
  SC: "皮下注射",
  滴鼻: "滴鼻",
  饮水: "饮水",
  喷雾: "喷雾"
};

function parseBrandStandardDosage(standardDosage?: string): {
  dosage?: number;
  dosageUnit?: "毫克" | "毫升";
} {
  if (!standardDosage) return {};
  const text = String(standardDosage);
  const m = text.match(/(\d+(?:\.\d+)?)\s*(mg|ml|毫克|毫升)/i);
  if (!m) return {};
  const dosage = Number(m[1]);
  if (!Number.isFinite(dosage)) return {};
  const unitRaw = m[2].toLowerCase();
  const dosageUnit = unitRaw === "mg" || unitRaw === "毫克" ? "毫克" : "毫升";
  return { dosage, dosageUnit };
}

function resolveVaccineBrandAutofill(vaccineId?: string, brandName?: string): {
  vaccinationMethod?: string;
  dosage?: number;
  dosageUnit?: "毫克" | "毫升";
} {
  if (!vaccineId || !brandName) return {};
  const cat = vaccineCatalog.find((x) => x.vaccineId === vaccineId);
  const brand = cat?.brands.find((b) => b.brandNameCn === brandName);
  if (!brand) return {};
  const route = brand.administrationRoutes?.[0];
  const vaccinationMethod = route ? ROUTE_TO_METHOD_LABEL[route] || route : undefined;
  const dosage = parseBrandStandardDosage(brand.standardDosage);
  return {
    vaccinationMethod,
    dosage: dosage.dosage,
    dosageUnit: dosage.dosageUnit
  };
}

type RoutinePlanRow = {
  id: string;
  name?: string;
  line: string;
  pigType: string;
  triggerRule: string;
  dispatchTime: string;
  vaccine: string;
  vaccineBrand?: string;
  vaccinationMethod?: string;
  dosage: number;
  dosageUnit: string;
  exclusion?: string;
  exemptions?: any[];
  enabled: boolean;
  workOrdersDispatched?: boolean;
  partialVaccinationProgress?: boolean;
  effectTracking?: PlanEffectTrackingStored;
};

function MassPlanForm({
  onSubmit,
  onPreview,
  onBack,
  initialData,
  onOpenAnnualCalendar,
  readOnly
}: {
  onSubmit: (values: any) => void;
  onPreview: (values: any) => void;
  onBack?: () => void;
  initialData?: any;
  onOpenAnnualCalendar?: (payload: { year: number; dayMap: Map<string, PlanDayMassTask[]> }) => void;
  readOnly?: boolean;
}) {
  const [form] = Form.useForm();
  const [scheduleFieldsTick, setScheduleFieldsTick] = useState(0);
  const bumpScheduleFields = useCallback(() => {
    setScheduleFieldsTick((n) => n + 1);
  }, []);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [advancedApplied, setAdvancedApplied] = useState(false);
  const advancedAppliedRef = useRef(false);
  const simplePigTypeCommittedRef = useRef<string | undefined>(undefined);
  const revertingSimpleRef = useRef(false);
  const pigRuleLogic = Form.useWatch("pigRuleLogic", form);
  const pigRuleConditions = Form.useWatch("pigRuleConditions", form) || [];
  const advancedSummary = useMemo(
    () => summarizePigRuleConditions(pigRuleConditions, pigRuleLogic),
    [pigRuleConditions, pigRuleLogic]
  );
  const lockedPigTypeValue = Form.useWatch("simplePigType", form);
  const scheduleRepeatEnabledWatch = Form.useWatch("scheduleRepeatEnabled", form);
  const vaccineIdWatch = Form.useWatch("vaccineId", form);
  const planNameWatch = Form.useWatch("name", form);
  const draftVaccineName = useMemo(
    () => vaccines.find((v) => v.id === vaccineIdWatch)?.name || "",
    [vaccineIdWatch]
  );
  const scheduleDraftPreviewMeta = useMemo(
    () => ({
      vaccineName: draftVaccineName,
      planName: typeof planNameWatch === "string" ? planNameWatch : undefined
    }),
    [draftVaccineName, planNameWatch]
  );

  useEffect(() => {
    advancedAppliedRef.current = advancedApplied;
  }, [advancedApplied]);

  useEffect(() => {
    if (initialData) {
      const label =
        (initialData as { pigType?: string }).pigType ??
        (Array.isArray((initialData as { pigTypes?: string[] }).pigTypes)
          ? (initialData as { pigTypes: string[] }).pigTypes[0]
          : undefined);
      const targetValue = label
        ? pigTypeOptions.find((o) => o.label === label)?.value
        : undefined;
      const scheduleDates = (initialData.execute || "")
        .split("/")
        .filter(Boolean)
        .map((md: string) => dayjs(`${dayjs().year()}-${md}`));
      form.setFieldsValue({
        name: initialData.name,
        pigRuleLogic: "AND",
        pigRuleConditions: [
          { field: "PIG_TYPE", operator: "IN", value: targetValue },
          { field: "AGE_YEARS", operator: "LTE", value: undefined },
          { field: "PARITY", operator: "LTE", value: undefined }
        ],
        simplePigType: targetValue,
        scheduleDates,
        scheduleRepeatEnabled: false,
        scheduleRecurrence: null,
        scheduleRepeatPreset: "MONTHLY",
        scheduleRepeatEndMode: "never",
        scheduleRepeatEndDate: undefined,
        vaccineBrand: initialData.vaccineBrand,
        vaccinationMethod: initialData.vaccinationMethod || "肌肉注射",
        vaccineId: vaccines.find((v) => v.name === initialData.vaccine)?.id,
        dosage: initialData.dosage,
        dosageUnit: initialData.dosageUnit || "毫克",
        ...mergeEffectTrackingInitial(initialData)
      });
      bumpScheduleFields();
      simplePigTypeCommittedRef.current = targetValue;
      setAdvancedApplied(false);
      advancedAppliedRef.current = false;
    }
  }, [initialData, form, bumpScheduleFields]);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    onSubmit(values);
  };

  const handlePreview = async () => {
    const values = await form.validateFields();
    if (!advancedApplied) {
      const selected = normalizePigTypeSelection(values.simplePigType, false)[0];
      const nextConds = ensurePigTypeCondition(
        values.pigRuleConditions || [],
        selected,
        false
      );
      form.setFieldValue("pigRuleConditions", nextConds);
      values.pigRuleConditions = nextConds;
    }
    const validDates = (values.scheduleDates || []).filter(
      (d: Dayjs | undefined) => d && dayjs.isDayjs(d)
    );
    onPreview({
      ...values,
      scheduleDates: validDates.map((d: Dayjs) => d.format("MM-DD"))
    });
  };

  return (
    <div>
      {readOnly ? (
        <Alert
          type="info"
          showIcon
          className="mass-plan-readonly-banner"
          message="只读查看：所有字段已锁定，无法修改或保存。"
          style={{ marginBottom: 16 }}
        />
      ) : null}
      <Form
        form={form}
        disabled={readOnly}
        layout="vertical"
        initialValues={{
          name: "",
          vaccineBrand: undefined,
          vaccinationMethod: "肌肉注射",
          dosageUnit: "毫克",
          scheduleDates: [],
          scheduleRepeatEnabled: false,
          scheduleRecurrence: null,
          scheduleRepeatPreset: "MONTHLY",
          scheduleRepeatEndMode: "never",
          scheduleRepeatEndDate: undefined,
          pigRuleLogic: "AND",
          pigRuleConditions: [
            { field: "PIG_TYPE", operator: "IN", value: undefined },
            { field: "AGE_YEARS", operator: "LTE", value: undefined },
            { field: "PARITY", operator: "LTE", value: undefined }
          ],
          simplePigType: undefined,
          ...PLAN_EFFECT_TRACKING_DEFAULTS
        }}
        onValuesChange={(changed) => {
          if (readOnly) return;
          if (
            "scheduleDates" in changed ||
            "scheduleRecurrence" in changed ||
            "scheduleRepeatEnabled" in changed ||
            "scheduleRepeatPreset" in changed ||
            "scheduleRepeatEndMode" in changed ||
            "scheduleRepeatEndDate" in changed
          ) {
            bumpScheduleFields();
          }
          if (!("simplePigType" in changed)) return;
          if (revertingSimpleRef.current) {
            revertingSimpleRef.current = false;
            return;
          }
          const newVal = changed.simplePigType as string | undefined;
          if (!advancedAppliedRef.current) {
            simplePigTypeCommittedRef.current = newVal;
            return;
          }
          const prev = simplePigTypeCommittedRef.current;
          if (pigTypeSelectionEqual(newVal, prev)) return;
          revertingSimpleRef.current = true;
          form.setFieldValue("simplePigType", prev);
          Modal.confirm({
            title: "确认改用简单选择？",
            content:
              "您已启用高级选猪规则。若继续修改常用目标猪群，高级规则中的日龄、体重、胎次、品种、来源等条件将全部清空，仅保留本次选择的猪只类型，且无法恢复本次高级配置。是否确认？",
            okText: "确认切换",
            cancelText: "取消",
            onOk: () => {
              setAdvancedApplied(false);
              advancedAppliedRef.current = false;
              simplePigTypeCommittedRef.current = newVal;
              form.setFieldsValue({
                simplePigType: newVal,
                pigRuleLogic: "AND",
                pigRuleConditions: buildSimpleOnlyPigRuleConditions(newVal, false)
              });
            }
          });
        }}
      >
        <Form.Item
          name="name"
          label="计划名称"
          rules={[{ required: true, message: "请输入计划名称" }]}
        >
          <Input placeholder="请输入计划名称" maxLength={30} showCount />
        </Form.Item>
        <Form.Item
          label="目标猪群"
          required
          style={{ marginBottom: 12 }}
        >
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <Form.Item
                name="simplePigType"
                style={{ marginBottom: 0 }}
                rules={[
                  {
                    validator: async (_, val) => {
                      if (advancedApplied) return;
                      if (!val) throw new Error("请选择目标猪群");
                    }
                  }
                ]}
              >
                <Select
                  allowClear
                  showSearch
                  options={SIMPLE_PIG_GROUP_OPTIONS}
                  optionFilterProp="label"
                  placeholder="选择目标猪群（常用）"
                />
              </Form.Item>
              {lockedPigTypeValue && !advancedApplied && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  如需多条件精准筛选，请点击右侧「高级设置」。
                </Text>
              )}
              {advancedApplied && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <Text type="secondary">已应用高级条件（{advancedSummary.logicLabel}）</Text>
                    <Tooltip
                      title="高级条件只会在当前猪只类型下进一步筛选。"
                    >
                      <Text type="secondary">ℹ️</Text>
                    </Tooltip>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {advancedSummary.tags.length > 0 ? (
                      advancedSummary.tags.map((t) => (
                        <Tag key={t}>{t}</Tag>
                      ))
                    ) : (
                      <Tag>暂无额外条件</Tag>
                    )}
                    <Button
                      size="small"
                      type="link"
                      disabled={readOnly || !lockedPigTypeValue}
                      onClick={() => {
                        if (lockedPigTypeValue) {
                          const next = ensurePigTypeCondition(
                            form.getFieldValue("pigRuleConditions") || [],
                            lockedPigTypeValue,
                            false
                          );
                          form.setFieldValue("pigRuleConditions", next);
                        }
                        setAdvancedOpen(true);
                      }}
                    >
                      修改高级设置
                    </Button>
                    <Button
                      size="small"
                      type="link"
                      danger
                      disabled={readOnly}
                      onClick={() => {
                        Modal.confirm({
                          title: "取消使用高级设置？",
                          content: "取消后将清空日龄、体重、胎次、品种、来源等高级条件，仅保留当前选择的猪只类型。",
                          okText: "取消高级设置",
                          cancelText: "保留",
                          onOk: () => {
                            setAdvancedApplied(false);
                            advancedAppliedRef.current = false;
                            const v = form.getFieldValue("simplePigType");
                            form.setFieldsValue({
                              pigRuleLogic: "AND",
                              pigRuleConditions: buildSimpleOnlyPigRuleConditions(v, false)
                            });
                          }
                        });
                      }}
                    >
                      取消使用高级设置
                    </Button>
                  </div>
                </div>
              )}
            </div>
            {lockedPigTypeValue && !advancedApplied && (
              <div>
                <Button
                  disabled={readOnly || !lockedPigTypeValue}
                  onClick={() => {
                    const locked = form.getFieldValue("simplePigType") as
                      | string
                      | undefined;
                    // 打开高级设置时，强制把猪只类型注入到规则里（且锁定）
                    if (locked) {
                      const next = ensurePigTypeCondition(
                        form.getFieldValue("pigRuleConditions") || [],
                        locked,
                        false
                      );
                      form.setFieldValue("pigRuleConditions", next);
                    }
                    setAdvancedOpen(true);
                  }}
                >
                  高级设置
                </Button>
              </div>
            )}
          </div>

          <Form.Item
            name="pigRuleConditions"
            rules={[
              {
                validator: (_, val) => {
                  const conditions: PigRuleCondition[] = Array.isArray(val) ? val : [];
                  const pigTypeVals = extractPigTypeValues(conditions);
                  if (!pigTypeVals.length)
                    return Promise.reject(new Error("请至少选择一个猪只类型"));
                  return Promise.resolve();
                }
              }
            ]}
            style={{ margin: 0 }}
          >
            <div />
          </Form.Item>

          <Modal
            title="高级设置（选猪规则）"
            open={advancedOpen && !readOnly}
            onCancel={() => setAdvancedOpen(false)}
            okText="应用规则"
            cancelText="取消"
            width={860}
            destroyOnClose
            onOk={() => {
              if (readOnly) return;
              const locked = form.getFieldValue("simplePigType") as
                | string
                | undefined;
              if (locked) {
                const next = ensurePigTypeCondition(
                  form.getFieldValue("pigRuleConditions") || [],
                  locked,
                  false
                );
                form.setFieldValue("pigRuleConditions", next);
              }
              form.setFieldValue("simplePigType", locked);
              simplePigTypeCommittedRef.current = locked;
              setAdvancedApplied(true);
              advancedAppliedRef.current = true;
              setAdvancedOpen(false);
            }}
          >
            <PigRuleBuilder
              form={form}
              allowPigTypeMulti={false}
              lockedPigTypeValue={lockedPigTypeValue}
            />
          </Modal>
        </Form.Item>
        <Row gutter={12}>
          <Col xs={24} md={6}>
            <Form.Item
              name="vaccineId"
              label="选择疫苗"
              rules={[{ required: true, message: "请选择疫苗" }]}
            >
              <Select
                options={vaccines.map((v) => ({
                  value: v.id,
                  label: v.name
                }))}
                onChange={() => {
                  form.setFieldsValue({
                    vaccineBrand: undefined
                  });
                }}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item
              noStyle
              shouldUpdate={(prev, cur) => prev.vaccineId !== cur.vaccineId}
            >
              {() => {
                const vaccineId = form.getFieldValue("vaccineId") as string | undefined;
                const brandOptions =
                  vaccineCatalog
                    .find((x) => x.vaccineId === vaccineId)
                    ?.brands.map((b) => ({ label: b.brandNameCn, value: b.brandNameCn })) || [];
                return (
                  <Form.Item
                    name="vaccineBrand"
                    label="疫苗品牌"
                    rules={[{ required: true, message: "请选择疫苗品牌" }]}
                  >
                    <Select
                      disabled={!vaccineId}
                      placeholder={vaccineId ? "请选择品牌" : "请先选择疫苗"}
                      options={brandOptions}
                      onChange={(brandName) => {
                        const next = resolveVaccineBrandAutofill(vaccineId, brandName);
                        form.setFieldsValue({
                          ...(next.vaccinationMethod
                            ? { vaccinationMethod: next.vaccinationMethod }
                            : {}),
                          ...(next.dosage != null ? { dosage: next.dosage } : {}),
                          ...(next.dosageUnit ? { dosageUnit: next.dosageUnit } : {})
                        });
                      }}
                    />
                  </Form.Item>
                );
              }}
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item
              name="vaccinationMethod"
              label="接种方式"
              rules={[{ required: true, message: "请选择接种方式" }]}
            >
              <Select options={VACCINATION_METHOD_OPTIONS} />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item label="剂量" required>
              <Space>
                <Form.Item
                  name="dosage"
                  rules={[{ required: true, message: "请输入剂量" }]}
                  noStyle
                >
                  <InputNumber min={0.5} step={0.5} />
                </Form.Item>
                <Form.Item
                  name="dosageUnit"
                  rules={[{ required: true, message: "请选择单位" }]}
                  noStyle
                >
                  <Select
                    style={{ width: 120 }}
                    options={[
                      { label: "毫克", value: "毫克" },
                      { label: "毫升", value: "毫升" }
                    ]}
                  />
                </Form.Item>
              </Space>
            </Form.Item>
          </Col>
        </Row>
        <Form.Item
          label="首次接种日期"
          required
          extra={
            scheduleRepeatEnabledWatch
              ? undefined
              : "请先选择首次接种日期，开启重复后可按规则生成后续节点。"
          }
        >
          <MassScheduleDatesSection
            scheduleFieldsTick={scheduleFieldsTick}
            bumpScheduleFields={bumpScheduleFields}
            calendarYear={dayjs().year()}
            draftPreviewMeta={scheduleDraftPreviewMeta}
            onOpenAnnualCalendar={onOpenAnnualCalendar}
            readOnly={readOnly}
          />
        </Form.Item>
        <PlanEffectTrackingSection form={form} />
      </Form>
      {readOnly ? (
        <div className="form-actions">
          <Button onClick={onBack}>返回</Button>
        </div>
      ) : (
        <div className="form-actions form-actions-split">
          <Button onClick={onBack}>返回</Button>
          <Button type="primary" onClick={handlePreview}>
            下一步
          </Button>
        </div>
      )}
    </div>
  );
}

const TRIGGER_LABEL_TO_VALUE: Record<string, string> = {
  预计生产任务开始前: "PRE_START",
  实际生产任务结束后: "POST_END",
  生产状态: "STATUS",
  日龄: "AGE"
};

/** 跟批计划 productionLine 为多选 value；列表/预览用顿号拼接展示 */
function formatRoutineProductionLineDisplay(
  productionLine: string | string[] | undefined
): string {
  const vals = Array.isArray(productionLine)
    ? productionLine
    : productionLine
      ? [productionLine]
      : [];
  return vals
    .map((v) => productionLines.find((p) => p.value === v)?.label || v)
    .filter(Boolean)
    .join("、");
}

function parseRoutineLineToValues(lineStored: string | undefined): string[] {
  const raw = String(lineStored || "").trim();
  if (!raw) return [];
  const labels = raw
    .split(/[、,，;；]\s*/)
    .map((x) => x.trim())
    .filter(Boolean);
  const fromParts = labels
    .map((lb) => productionLines.find((p) => p.label === lb)?.value)
    .filter((v): v is string => Boolean(v));
  if (fromParts.length > 0) return fromParts;
  const single = productionLines.find((p) => p.label === raw)?.value;
  return single ? [single] : [];
}

function RoutinePlanForm({
  onSubmit,
  onBack,
  initialData
}: {
  onSubmit: (values: any) => void;
  onBack?: () => void;
  initialData?: any;
}) {
  const [form] = Form.useForm();
  const [selectedVaccine, setSelectedVaccine] = useState<any>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [advancedApplied, setAdvancedApplied] = useState(false);
  const advancedAppliedRef = useRef(false);
  const simplePigTypeCommittedRef = useRef<string | undefined>(undefined);
  const revertingSimpleRef = useRef(false);
  const selectedVaccineId = Form.useWatch("vaccineId", form);
  const pigRuleLogic = Form.useWatch("pigRuleLogic", form);
  const pigRuleConditions = Form.useWatch("pigRuleConditions", form) || [];
  const advancedSummary = useMemo(
    () => summarizePigRuleConditions(pigRuleConditions, pigRuleLogic),
    [pigRuleConditions, pigRuleLogic]
  );
  const lockedPigTypeValue = Form.useWatch("simplePigType", form);
  /** 不可在 Form.List 的 map 内调用 useWatch，否则行数变化会违反 Hooks 规则导致白屏 */
  const dispatchesWatch = (Form.useWatch("dispatches", form) || []) as any[];

  useEffect(() => {
    advancedAppliedRef.current = advancedApplied;
  }, [advancedApplied]);

  useEffect(() => {
    if (initialData) {
      const triggerRuleVal =
        TRIGGER_LABEL_TO_VALUE[initialData.triggerRule] ||
        initialData.triggerRule;
      const productionLineValues = parseRoutineLineToValues(initialData.line);
      const pigOpt = pigTypeOptions.find((p) => p.label === initialData.pigType);
      const vacc = vaccines.find((v) => v.name === initialData.vaccine);

      const dt = String(initialData.dispatchTime || "");
      const segs = dt
        .split(/[；;]\s*/)
        .map((x) => x.trim())
        .filter(Boolean);
      const dispatchSegs = segs.length ? segs : dt ? [dt.trim()] : [];
      const dispatches = dispatchSegs.length
        ? dispatchSegs.map((seg) => {
            let taskType: string | undefined;
            let statusType: string | undefined;
            let offsetDays: number | undefined;

            if (triggerRuleVal === "PRE_START") {
              const m = seg.match(/^(.+?)\s*开始前\s*(\d+)/);
              if (m) {
                taskType = m[1].trim();
                offsetDays = parseInt(m[2], 10);
              }
            } else if (triggerRuleVal === "POST_END") {
              const m = seg.match(/^(.+?)\s*结束后\s*(\d+)/);
              if (m) {
                taskType = m[1].trim();
                offsetDays = parseInt(m[2], 10);
              }
            } else if (triggerRuleVal === "STATUS") {
              const m = seg.match(/^(.+?)\s*(\d+)/);
              if (m) {
                statusType = m[1].trim();
                offsetDays = parseInt(m[2], 10);
              }
            } else if (triggerRuleVal === "AGE") {
              const m = seg.match(/(\d+)/);
              if (m) offsetDays = parseInt(m[1], 10);
            }

            return {
              triggerRule: triggerRuleVal,
              taskType,
              statusType,
              offsetDays
            };
          })
        : [{ triggerRule: triggerRuleVal }];

      form.setFieldsValue({
        name: initialData.name,
        productionLine: productionLineValues,
        pigRuleLogic: "AND",
        pigRuleConditions: [
          { field: "PIG_TYPE", operator: "IN", value: pigOpt?.value },
          { field: "AGE_YEARS", operator: "LTE", value: undefined },
          { field: "PARITY", operator: "LTE", value: undefined }
        ],
        simplePigType: pigOpt?.value,
        dispatches,
        vaccineBrand: initialData.vaccineBrand,
        vaccinationMethod: initialData.vaccinationMethod || "肌肉注射",
        vaccineId: vacc?.id,
        dosage: initialData.dosage ?? vacc?.defaultDosage ?? 1,
        dosageUnit: initialData.dosageUnit || "毫克",
        exemptions: Array.isArray(initialData.exemptions) ? initialData.exemptions : [],
        ...mergeEffectTrackingInitial(initialData)
      });
      if (vacc) setSelectedVaccine(vacc);
      simplePigTypeCommittedRef.current = pigOpt?.value;
      setAdvancedApplied(false);
      advancedAppliedRef.current = false;
    }
  }, [initialData, form]);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (!advancedApplied) {
      const selected = normalizePigTypeSelection(values.simplePigType, false)[0];
      const nextConds = ensurePigTypeCondition(
        values.pigRuleConditions || [],
        selected,
        false
      );
      form.setFieldValue("pigRuleConditions", nextConds);
      values.pigRuleConditions = nextConds;
    }
    const vaccineMeta = vaccineCatalog.find(
      (item) => item.vaccineId === values.vaccineId
    );
    const isAgeReference = vaccineMeta?.referenceType === "日龄";
    const dispatches = Array.isArray(values.dispatches) ? values.dispatches : [];
    const outOfRange =
      isAgeReference &&
      dispatches.some((d: any) => {
        const offsetDays = Number(d?.offsetDays ?? 0);
        const isStatusTrigger = d?.triggerRule === "STATUS";
        const isAgeTrigger = d?.triggerRule === "AGE";
        if (isStatusTrigger || isAgeTrigger) return false;
        return (
          offsetDays < (vaccineMeta?.minValue ?? 0) ||
          offsetDays > (vaccineMeta?.maxValue ?? Infinity)
        );
      });

    if (outOfRange) {
      Modal.confirm({
        title: "接种日龄超出建议范围",
        content: `该疫苗建议接种日龄为 ${vaccineMeta?.minValue} - ${vaccineMeta?.maxValue} 天，当前部分下发时间点超出该范围。是否继续保存？`,
        okText: "继续保存",
        cancelText: "返回修改",
        onOk: () => onSubmit(values)
      });
      return;
    }

    onSubmit(values);
  };

  return (
    <div>
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          dosageUnit: "毫克",
          name: "",
          vaccineBrand: undefined,
          vaccinationMethod: "肌肉注射",
          productionLine: [],
          pigRuleLogic: "AND",
          pigRuleConditions: [
            { field: "PIG_TYPE", operator: "IN", value: undefined },
            { field: "AGE_YEARS", operator: "LTE", value: undefined },
            { field: "PARITY", operator: "LTE", value: undefined }
          ],
          simplePigType: undefined,
          exemptions: [],
          dispatches: [
            {
              triggerRule: undefined,
              taskType: undefined,
              statusType: undefined,
              offsetDays: undefined
            }
          ],
          ...PLAN_EFFECT_TRACKING_DEFAULTS
        }}
        onValuesChange={(changed) => {
          if (!("simplePigType" in changed)) return;
          if (revertingSimpleRef.current) {
            revertingSimpleRef.current = false;
            return;
          }
          const newVal = changed.simplePigType as string | undefined;
          if (!advancedAppliedRef.current) {
            simplePigTypeCommittedRef.current = newVal;
            return;
          }
          const prev = simplePigTypeCommittedRef.current;
          if (newVal === prev) return;
          revertingSimpleRef.current = true;
          form.setFieldValue("simplePigType", prev);
          Modal.confirm({
            title: "确认改用简单选择？",
            content:
              "您已启用高级选猪规则。若继续修改常用目标猪群，高级规则中的日龄、体重、胎次、品种、来源等条件将全部清空，仅保留本次选择的猪只类型，且无法恢复本次高级配置。是否确认？",
            okText: "确认切换",
            cancelText: "取消",
            onOk: () => {
              setAdvancedApplied(false);
              advancedAppliedRef.current = false;
              simplePigTypeCommittedRef.current = newVal;
              form.setFieldsValue({
                simplePigType: newVal,
                pigRuleLogic: "AND",
                pigRuleConditions: buildSimpleOnlyPigRuleConditions(newVal, false)
              });
            }
          });
        }}
      >
        <Form.Item
          name="name"
          label="计划名称"
          rules={[{ required: true, message: "请输入计划名称" }]}
        >
          <Input placeholder="请输入计划名称" maxLength={30} showCount />
        </Form.Item>
        <Form.Item
          name="productionLine"
          label="适用生产线"
          rules={[
            { required: true, message: "请选择适用生产线" },
            {
              validator: (_, val) => {
                const arr = Array.isArray(val) ? val : val ? [val] : [];
                if (arr.length === 0) {
                  return Promise.reject(new Error("请至少选择一条生产线"));
                }
                return Promise.resolve();
              }
            }
          ]}
        >
          <Select
            mode="multiple"
            allowClear
            placeholder="请选择适用生产线（可多选）"
            options={productionLines}
            maxTagCount="responsive"
            optionFilterProp="label"
            showSearch
          />
        </Form.Item>
        <Form.Item label="目标猪群" required style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <Form.Item
                name="simplePigType"
                style={{ marginBottom: 0 }}
                rules={[
                  {
                    validator: async (_, val) => {
                      if (advancedApplied) return;
                      if (!val) throw new Error("请选择目标猪群");
                    }
                  }
                ]}
              >
                <Select
                  allowClear
                  showSearch
                  options={SIMPLE_PIG_GROUP_OPTIONS}
                  optionFilterProp="label"
                  placeholder="选择目标猪群（常用）"
                />
              </Form.Item>
              {lockedPigTypeValue && !advancedApplied && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  如需多条件精准筛选，请点击右侧「高级设置」。
                </Text>
              )}
              {advancedApplied && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <Text type="secondary">已应用高级条件（{advancedSummary.logicLabel}）</Text>
                    <Tooltip title="高级条件只会在当前猪只类型下进一步筛选。">
                      <Text type="secondary">ℹ️</Text>
                    </Tooltip>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {advancedSummary.tags.length > 0 ? (
                      advancedSummary.tags.map((t) => <Tag key={t}>{t}</Tag>)
                    ) : (
                      <Tag>暂无额外条件</Tag>
                    )}
                    <Button
                      size="small"
                      type="link"
                      disabled={!lockedPigTypeValue}
                      onClick={() => {
                        if (lockedPigTypeValue) {
                          const next = ensurePigTypeCondition(
                            form.getFieldValue("pigRuleConditions") || [],
                            lockedPigTypeValue,
                            false
                          );
                          form.setFieldValue("pigRuleConditions", next);
                        }
                        setAdvancedOpen(true);
                      }}
                    >
                      修改高级设置
                    </Button>
                    <Button
                      size="small"
                      type="link"
                      danger
                      onClick={() => {
                        Modal.confirm({
                          title: "取消使用高级设置？",
                          content: "取消后将清空日龄、体重、胎次、品种、来源等高级条件，仅保留当前选择的猪只类型。",
                          okText: "取消高级设置",
                          cancelText: "保留",
                          onOk: () => {
                            setAdvancedApplied(false);
                            advancedAppliedRef.current = false;
                            const v = form.getFieldValue("simplePigType");
                            form.setFieldsValue({
                              pigRuleLogic: "AND",
                              pigRuleConditions: buildSimpleOnlyPigRuleConditions(v, false)
                            });
                          }
                        });
                      }}
                    >
                      取消使用高级设置
                    </Button>
                  </div>
                </div>
              )}
            </div>
            {lockedPigTypeValue && !advancedApplied && (
              <div>
                <Button
                  disabled={!lockedPigTypeValue}
                  onClick={() => {
                    const locked = form.getFieldValue("simplePigType") as
                      | string
                      | undefined;
                    if (locked) {
                      const next = ensurePigTypeCondition(
                        form.getFieldValue("pigRuleConditions") || [],
                        locked,
                        false
                      );
                      form.setFieldValue("pigRuleConditions", next);
                    }
                    setAdvancedOpen(true);
                  }}
                >
                  高级设置
                </Button>
              </div>
            )}
          </div>

          <Form.Item
            name="pigRuleConditions"
            rules={[
              {
                validator: (_, val) => {
                  const conditions: PigRuleCondition[] = Array.isArray(val) ? val : [];
                  const pigTypeVals = extractPigTypeValues(conditions);
                  if (!pigTypeVals.length)
                    return Promise.reject(new Error("请选择目标猪只类型"));
                  return Promise.resolve();
                }
              }
            ]}
            style={{ margin: 0 }}
          >
            <div />
          </Form.Item>

          <Modal
            title="高级设置（选猪规则）"
            open={advancedOpen}
            onCancel={() => setAdvancedOpen(false)}
            okText="应用规则"
            cancelText="取消"
            width={860}
            destroyOnClose
            onOk={() => {
              const locked = form.getFieldValue("simplePigType") as
                | string
                | undefined;
              if (locked) {
                const next = ensurePigTypeCondition(
                  form.getFieldValue("pigRuleConditions") || [],
                  locked,
                  false
                );
                form.setFieldValue("pigRuleConditions", next);
              }
              form.setFieldValue("simplePigType", locked);
              simplePigTypeCommittedRef.current = locked;
              setAdvancedApplied(true);
              advancedAppliedRef.current = true;
              setAdvancedOpen(false);
            }}
          >
            <PigRuleBuilder
              form={form}
              allowPigTypeMulti={false}
              lockedPigTypeValue={lockedPigTypeValue}
            />
          </Modal>
        </Form.Item>
        <Row gutter={12}>
          <Col xs={24} md={6}>
            <Form.Item
              name="vaccineId"
              label="选择疫苗"
              rules={[{ required: true, message: "请选择疫苗" }]}
            >
              <Select
                options={vaccines.map((v) => ({
                  value: v.id,
                  label: v.name
                }))}
                onChange={(value) => {
                  setSelectedVaccine(vaccines.find((v) => v.id === value) || null);
                  form.setFieldsValue({
                    vaccineBrand: undefined
                  });
                }}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item
              noStyle
              shouldUpdate={(prev, cur) => prev.vaccineId !== cur.vaccineId}
            >
              {() => {
                const vaccineId = form.getFieldValue("vaccineId") as string | undefined;
                const brandOptions =
                  vaccineCatalog
                    .find((x) => x.vaccineId === vaccineId)
                    ?.brands.map((b) => ({ label: b.brandNameCn, value: b.brandNameCn })) || [];
                return (
                  <Form.Item
                    name="vaccineBrand"
                    label="疫苗品牌"
                    rules={[{ required: true, message: "请选择疫苗品牌" }]}
                  >
                    <Select
                      disabled={!vaccineId}
                      placeholder={vaccineId ? "请选择品牌" : "请先选择疫苗"}
                      options={brandOptions}
                      onChange={(brandName) => {
                        const next = resolveVaccineBrandAutofill(vaccineId, brandName);
                        form.setFieldsValue({
                          ...(next.vaccinationMethod
                            ? { vaccinationMethod: next.vaccinationMethod }
                            : {}),
                          ...(next.dosage != null ? { dosage: next.dosage } : {}),
                          ...(next.dosageUnit ? { dosageUnit: next.dosageUnit } : {})
                        });
                      }}
                    />
                  </Form.Item>
                );
              }}
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item
              name="vaccinationMethod"
              label="接种方式"
              rules={[{ required: true, message: "请选择接种方式" }]}
            >
              <Select options={VACCINATION_METHOD_OPTIONS} />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item label="剂量" required>
              <Space>
                <Form.Item
                  name="dosage"
                  rules={[{ required: true, message: "请输入剂量" }]}
                  noStyle
                >
                  <InputNumber min={0.5} step={0.5} />
                </Form.Item>
                <Form.Item
                  name="dosageUnit"
                  rules={[{ required: true, message: "请选择单位" }]}
                  noStyle
                >
                  <Select
                    style={{ width: 120 }}
                    options={[
                      { label: "毫克", value: "毫克" },
                      { label: "毫升", value: "毫升" }
                    ]}
                  />
                </Form.Item>
              </Space>
            </Form.Item>
          </Col>
        </Row>
        <Form.Item
          label={
            <Space size={6}>
              <span>下发接种任务时间</span>
              <Text type="secondary">(可多次)</Text>
            </Space>
          }
          required
          extra="可为同一猪群与同一疫苗设置多次下发时间。"
        >
          <Form.List name="dispatches">
            {(fields, { add, remove }) => (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {fields.map((field, idx) => {
                  const tr = dispatchesWatch[field.name]?.triggerRule;
                  return (
                    <div
                      key={field.key}
                      className="dispatch-rule-row"
                      style={{ marginBottom: 0 }}
                    >
                      <div className="dispatch-rule-content" style={{ width: "100%" }}>
                        <Form.Item
                          {...field}
                          name={[field.name, "triggerRule"]}
                          rules={[{ required: true, message: "请选择触发规则" }]}
                          noStyle
                        >
                          <Select
                            style={{ width: 200 }}
                            placeholder="选择规则"
                            onChange={() => {
                              ["taskType", "statusType", "offsetDays"].forEach((k) =>
                                form.setFieldValue(
                                  ["dispatches", field.name, k],
                                  undefined
                                )
                              );
                            }}
                            options={[
                              { label: "预计生产任务开始前", value: "PRE_START" },
                              { label: "实际生产任务结束后", value: "POST_END" },
                              { label: "生产状态", value: "STATUS" }
                            ]}
                          />
                        </Form.Item>

                        {tr === "PRE_START" && (
                          <>
                            <Form.Item
                              {...field}
                              name={[field.name, "taskType"]}
                              rules={[{ required: true, message: "请选择生产任务" }]}
                              noStyle
                            >
                              <Select
                                style={{ width: 140 }}
                                placeholder="生产任务"
                                options={TASK_OPTIONS}
                              />
                            </Form.Item>
                            <span className="exemption-fixed-text">开始前</span>
                            <Form.Item
                              {...field}
                              name={[field.name, "offsetDays"]}
                              rules={[{ required: true, message: "请输入天数" }]}
                              noStyle
                            >
                              <InputNumber
                                min={0}
                                addonAfter="天"
                                placeholder="天数"
                                style={{ width: 120 }}
                              />
                            </Form.Item>
                          </>
                        )}

                        {tr === "POST_END" && (
                          <>
                            <Form.Item
                              {...field}
                              name={[field.name, "taskType"]}
                              rules={[{ required: true, message: "请选择生产任务" }]}
                              noStyle
                            >
                              <Select
                                style={{ width: 140 }}
                                placeholder="生产任务"
                                options={TASK_OPTIONS}
                              />
                            </Form.Item>
                            <span className="exemption-fixed-text">结束后</span>
                            <Form.Item
                              {...field}
                              name={[field.name, "offsetDays"]}
                              rules={[{ required: true, message: "请输入天数" }]}
                              noStyle
                            >
                              <InputNumber
                                min={0}
                                addonAfter="天"
                                placeholder="天数"
                                style={{ width: 120 }}
                              />
                            </Form.Item>
                          </>
                        )}

                        {tr === "STATUS" && (
                          <>
                            <Form.Item
                              {...field}
                              name={[field.name, "statusType"]}
                              rules={[{ required: true, message: "请选择生产状态" }]}
                              noStyle
                            >
                              <Select
                                style={{ width: 120 }}
                                placeholder="生产状态"
                                options={STATUS_OPTIONS}
                              />
                            </Form.Item>
                            <Form.Item
                              {...field}
                              name={[field.name, "offsetDays"]}
                              rules={[{ required: true, message: "请输入天数" }]}
                              noStyle
                            >
                              <InputNumber
                                min={0}
                                addonAfter="天"
                                placeholder="天数"
                                style={{ width: 120 }}
                              />
                            </Form.Item>
                          </>
                        )}

                        {tr === "AGE" && (
                          <span className="exemption-age-block">
                            <span className="exemption-age-label">日龄</span>
                            <Form.Item
                              {...field}
                              name={[field.name, "offsetDays"]}
                              rules={[{ required: true, message: "请输入日龄" }]}
                              noStyle
                            >
                              <InputNumber
                                min={0}
                                addonAfter="天"
                                placeholder="日龄"
                                style={{ width: 120 }}
                              />
                            </Form.Item>
                          </span>
                        )}

                        <Button
                          type="text"
                          danger
                          className="dispatch-rule-remove"
                          onClick={() => remove(field.name)}
                          disabled={fields.length <= 1}
                          aria-label="删除"
                        >
                          🗑️
                        </Button>
                        {idx === fields.length - 1 && (
                          <Button
                            type="text"
                            icon={<PlusOutlined />}
                            onClick={() =>
                              add({
                                triggerRule: tr,
                                taskType: undefined,
                                statusType: undefined,
                                offsetDays: undefined
                              })
                            }
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Form.List>
        </Form.Item>
        <PlanEffectTrackingSection form={form} />
        {selectedVaccine && (
          <Alert
            type="warning"
            showIcon
            message={`该疫苗最佳接种区间为 ${selectedVaccine.validAgeMin} - ${selectedVaccine.validAgeMax} 日龄，系统将以此区间为风控依据。`}
          />
        )}
      </Form>
      <div className="form-actions form-actions-split">
        <Button onClick={onBack}>返回</Button>
        <Button type="primary" onClick={handleSubmit}>
          下一步
        </Button>
      </div>
    </div>
  );
}

export function VaccinePlanPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [planType, setPlanType] = useState<PlanType | null>(null);
  const [mode, setMode] = useState<"list" | "config" | "preview" | "annual-calendar">("list");
  const [draft, setDraft] = useState<any>(null);
  const [massPlans, setMassPlans] = useState<any[]>(massPlanList);
  const [routinePlans, setRoutinePlans] = useState<RoutinePlanRow[]>(routinePlanList);
  const [annualCalYear, setAnnualCalYear] = useState(() => dayjs().year());
  const [annualCalOverlay, setAnnualCalOverlay] = useState<{
    year: number;
    dayMap: Map<string, PlanDayMassTask[]>;
  } | null>(null);
  const [annualCalReturn, setAnnualCalReturn] = useState<"list" | "config">("list");
  const [planTab, setPlanTab] = useState<"mass" | "routine">("mass");
  const [massEditMode, setMassEditMode] = useState(false);
  const [routineEditMode, setRoutineEditMode] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [readonlyMassConfig, setReadonlyMassConfig] = useState(false);
  const massConfigBackToAnnualCalRef = useRef(false);
  const massCalEyePrevEditingIdRef = useRef<string | null>(null);

  const routinePlanDisplayName = (record: { name?: string; line?: string; vaccine?: string }) =>
    record.name?.trim() ||
    [record.line, record.vaccine].filter(Boolean).join(" · ") ||
    "该计划";

  const annualDayMap = useMemo(
    () => buildMassPlansYearIndex(massPlans, annualCalYear),
    [massPlans, annualCalYear]
  );

  const annualEffectiveYear = annualCalOverlay?.year ?? annualCalYear;
  const annualEffectiveDayMap = useMemo(() => {
    if (annualCalOverlay) return annualCalOverlay.dayMap;
    return annualDayMap;
  }, [annualCalOverlay, annualDayMap]);

  const exitAnnualCalendar = useCallback(() => {
    setAnnualCalOverlay(null);
    setMode(annualCalReturn);
  }, [annualCalReturn]);

  const annualYearOptions = useMemo(() => {
    const base = dayjs().year();
    const opts: { value: number; label: string }[] = [];
    for (let dy = -2; dy <= 5; dy++) {
      const y = base + dy;
      opts.push({ value: y, label: `${y} 年` });
    }
    return opts;
  }, []);

  const handleMassEnabledChange = (record: any, checked: boolean) => {
    if (checked) {
      setMassPlans((prev) =>
        prev.map((item) => (item.id === record.id ? { ...item, enabled: true } : item))
      );
      return;
    }
    const planName = String(record.name || "该计划");
    if (record.workOrdersDispatched) {
      Modal.warning({
        title: "无法禁用",
        content: `「${planName}」计划的接种任务已下发至执行端。禁用计划后，系统将不再生成新的接种任务，已下发至执行端的任务不受影响。`
      });
      return;
    }
    if (record.partialVaccinationProgress) {
      Modal.confirm({
        title: "确认禁用",
        content: `「${planName}」已有部分猪只完成接种。禁用后，系统将不再下发后续任务，已生成的接种记录不受影响。`,
        okText: "确认禁用",
        cancelText: "取消",
        onOk: () =>
          setMassPlans((prev) =>
            prev.map((item) => (item.id === record.id ? { ...item, enabled: false } : item))
          )
      });
      return;
    }
    setMassPlans((prev) =>
      prev.map((item) => (item.id === record.id ? { ...item, enabled: false } : item))
    );
  };

  const handleRoutineEnabledChange = (record: any, checked: boolean) => {
    if (checked) {
      setRoutinePlans((prev) =>
        prev.map((item) => (item.id === record.id ? { ...item, enabled: true } : item))
      );
      return;
    }
    const planName = routinePlanDisplayName(record);
    if (record.workOrdersDispatched) {
      Modal.warning({
        title: "无法禁用",
        content: `「${planName}」计划的接种任务已下发至执行端。禁用计划后，系统将不再生成新的接种任务，已下发至执行端的任务不受影响。`
      });
      return;
    }
    if (record.partialVaccinationProgress) {
      Modal.confirm({
        title: "确认禁用",
        content: `「${planName}」已有部分猪只完成接种。禁用后，系统将不再下发后续任务，已生成的接种记录不受影响。`,
        okText: "确认禁用",
        cancelText: "取消",
        onOk: () =>
          setRoutinePlans((prev) =>
            prev.map((item) => (item.id === record.id ? { ...item, enabled: false } : item))
          )
      });
      return;
    }
    setRoutinePlans((prev) =>
      prev.map((item) => (item.id === record.id ? { ...item, enabled: false } : item))
    );
  };

  return (
    <div>
      {mode === "list" && (
        <div className="page-header">
          <div>
            <Title level={4} style={{ margin: 0 }}>
              疫苗计划配置
            </Title>
            <Text type="secondary">管理普免与跟批免疫 SOP 计划</Text>
          </div>
          <div className="header-actions">
            <Button
              className="ghost-btn"
              icon={<CalendarOutlined />}
              onClick={() => {
                setAnnualCalReturn("list");
                setAnnualCalOverlay(null);
                setMode("annual-calendar");
              }}
            >
              年度接种日历
            </Button>
            <Button type="primary" onClick={() => setCreateOpen(true)}>
              创建疫苗计划
            </Button>
          </div>
        </div>
      )}

      {mode === "list" && (
        <Card className="section-card">
          <Tabs
            defaultActiveKey="mass"
            activeKey={planTab}
            onChange={(key) => setPlanTab(key as "mass" | "routine")}
            tabBarExtraContent={
              <Button
                className="ghost-btn"
                onClick={() =>
                  planTab === "mass"
                    ? setMassEditMode((v) => !v)
                    : setRoutineEditMode((v) => !v)
                }
              >
                {planTab === "mass" ? (massEditMode ? "取消编辑" : "编辑") : (routineEditMode ? "取消编辑" : "编辑")}
              </Button>
            }
            items={[
              {
                key: "mass",
                label: "普免计划",
                children: (
                  <Table
                    rowKey="id"
                    dataSource={massPlans}
                    pagination={false}
                    size="middle"
                    className="vaccine-plan-table"
                    scroll={{ x: 1320 }}
                    columns={[
                      { title: "计划名称", dataIndex: "name", ellipsis: true, width: 160 },
                      {
                        title: "目标免疫群体",
                        dataIndex: "pigType",
                        width: 120,
                        render: (text: string) => <Tag>{text}</Tag>
                      },
                      { title: "疫苗", dataIndex: "vaccine", ellipsis: true, width: 140 },
                      {
                        title: "品牌",
                        dataIndex: "vaccineBrand",
                        ellipsis: true,
                        width: 120,
                        render: (v: string) => v || "-"
                      },
                      {
                        title: "接种方式",
                        dataIndex: "vaccinationMethod",
                        width: 110,
                        render: (v: string) => v || "-"
                      },
                      {
                        title: "剂量",
                        dataIndex: "dosage",
                        width: 100,
                        render: (_, record) =>
                          `${record.dosage} ${record.dosageUnit || ""}`.trim()
                      },
                      { title: "执行时间", dataIndex: "execute", ellipsis: true, width: 160 },
                      {
                        title: "效果追踪",
                        key: "effectTracking",
                        width: 220,
                        ellipsis: true,
                        render: (_: unknown, record: any) =>
                          formatEffectTrackingLine(record.effectTracking)
                      },
                      {
                        title: "启用",
                        dataIndex: "enabled",
                        width: 88,
                        align: "center",
                        fixed: "right",
                        render: (_, record) =>
                          massEditMode ? (
                            <Button
                              type="text"
                              icon={<EditOutlined />}
                              className="icon-btn"
                              onClick={() => {
                                massCalEyePrevEditingIdRef.current = null;
                                massConfigBackToAnnualCalRef.current = false;
                                setReadonlyMassConfig(false);
                                setEditingPlanId(record.id);
                                setPlanType("MASS");
                                setMode("config");
                              }}
                            />
                          ) : (
                            <Switch
                              checked={record.enabled}
                              onChange={(checked) =>
                                handleMassEnabledChange(record, checked)
                              }
                            />
                          )
                      }
                    ]}
                  />
                )
              },
              {
                key: "routine",
                label: "跟批免疫计划",
                children: (
                  <Table
                    rowKey="id"
                    dataSource={routinePlans}
                    pagination={false}
                    size="middle"
                    className="vaccine-plan-table"
                    scroll={{ x: 1320 }}
                    columns={[
                      { title: "计划名称", dataIndex: "name", ellipsis: true, width: 180 },
                      { title: "适用生产线", dataIndex: "line", ellipsis: true, width: 140 },
                      {
                        title: "效果追踪",
                        key: "effectTracking",
                        width: 220,
                        ellipsis: true,
                        render: (_: unknown, record: RoutinePlanRow) =>
                          formatEffectTrackingLine(record.effectTracking)
                      },
                      {
                        title: "目标免疫群体",
                        dataIndex: "pigType",
                        width: 120,
                        render: (text: string) => <Tag>{text}</Tag>
                      },
                      { title: "疫苗", dataIndex: "vaccine", ellipsis: true, width: 140 },
                      {
                        title: "品牌",
                        dataIndex: "vaccineBrand",
                        ellipsis: true,
                        width: 120,
                        render: (v: string) => v || "-"
                      },
                      {
                        title: "接种方式",
                        dataIndex: "vaccinationMethod",
                        width: 110,
                        render: (v: string) => v || "-"
                      },
                      {
                        title: "剂量",
                        dataIndex: "dosage",
                        width: 100,
                        render: (_, record) =>
                          `${record.dosage ?? ""} ${record.dosageUnit || ""}`.trim()
                      },
                      { title: "执行时间", dataIndex: "dispatchTime", ellipsis: true },
                      {
                        title: "启用",
                        dataIndex: "enabled",
                        width: 88,
                        align: "center",
                        fixed: "right",
                        render: (_, record) =>
                          routineEditMode ? (
                            <Button
                              type="text"
                              icon={<EditOutlined />}
                              className="icon-btn"
                              onClick={() => {
                                setEditingPlanId(record.id);
                                setPlanType("ROUTINE");
                                setMode("config");
                              }}
                            />
                          ) : (
                            <Switch
                              checked={record.enabled}
                              onChange={(checked) =>
                                handleRoutineEnabledChange(record, checked)
                              }
                            />
                          )
                      }
                    ]}
                  />
                )
              }
            ]}
          />
        </Card>
      )}

      {mode === "annual-calendar" && (
        <Card className="section-card plan-annual-cal-card plan-annual-cal-card--fit">
          <div className="plan-annual-cal-page-toolbar plan-annual-cal-page-toolbar--premium">
            <div className="plan-annual-cal-toolbar-main">
              <Button
                type="text"
                className="plan-annual-cal-back-btn"
                icon={<LeftOutlined />}
                onClick={exitAnnualCalendar}
              >
                返回
              </Button>
              <div className="plan-annual-cal-toolbar-heading">
                <span className="plan-annual-cal-toolbar-eyebrow">年度全景</span>
                <Title level={5} className="plan-annual-cal-toolbar-title">
                  普免接种日历
                </Title>
              </div>
            </div>
            {annualCalOverlay ? (
              <span className="plan-annual-cal-preview-pill">表单预览</span>
            ) : null}
          </div>
          <div className="plan-annual-cal-card-body-grow">
            <AnnualVaccinationYearView
              year={annualEffectiveYear}
              dayMap={annualEffectiveDayMap}
              onOpenPlanReadonly={(planId) => {
                massCalEyePrevEditingIdRef.current = editingPlanId;
                massConfigBackToAnnualCalRef.current = true;
                setReadonlyMassConfig(true);
                setEditingPlanId(planId);
                setPlanType("MASS");
                setMode("config");
              }}
              headerRight={
                annualCalOverlay ? (
                  <Text type="secondary">{annualEffectiveYear} 年</Text>
                ) : (
                  <Select
                    size="small"
                    value={annualCalYear}
                    onChange={(v) => setAnnualCalYear(Number(v))}
                    options={annualYearOptions}
                    className="plan-annual-cal-year-select"
                    popupMatchSelectWidth={false}
                    aria-label="选择公历年"
                  />
                )
              }
              footNote={
                <Text type="secondary" className="plan-annual-cal-foot-text">
                  仅汇总「普免计划」中配置的固定日历排期；跟批免疫由生产事件触发，请见计划列表。
                </Text>
              }
            />
          </div>
        </Card>
      )}

      {mode === "config" && planType === "MASS" && (
        <Card className="section-card">
          <div className="page-title">
            {readonlyMassConfig
              ? "查看普免计划"
              : editingPlanId
                ? "编辑普免计划"
                : "配置普免计划"}
          </div>
          <MassPlanForm
            readOnly={readonlyMassConfig}
            onSubmit={(values) => {
              console.log("Mass plan payload", values);
            }}
            onPreview={(values) => {
              setDraft(values);
              setMode("preview");
            }}
            onBack={() => {
              if (readonlyMassConfig && massConfigBackToAnnualCalRef.current) {
                massConfigBackToAnnualCalRef.current = false;
                const prevId = massCalEyePrevEditingIdRef.current;
                massCalEyePrevEditingIdRef.current = null;
                setReadonlyMassConfig(false);
                setEditingPlanId(prevId);
                setMode("annual-calendar");
                return;
              }
              massCalEyePrevEditingIdRef.current = null;
              massConfigBackToAnnualCalRef.current = false;
              setReadonlyMassConfig(false);
              setMode("list");
              setEditingPlanId(null);
            }}
            onOpenAnnualCalendar={(payload) => {
              setAnnualCalReturn("config");
              setAnnualCalOverlay(payload);
              setMode("annual-calendar");
            }}
            initialData={
              editingPlanId
                ? massPlans.find((p) => p.id === editingPlanId)
                : undefined
            }
          />
        </Card>
      )}

      {mode === "config" && planType === "ROUTINE" && (
        <Card className="section-card">
          <div className="page-title">
            {editingPlanId ? "编辑跟批免疫计划" : "配置跟批免疫计划"}
          </div>
          <RoutinePlanForm
            onSubmit={(values) => {
              setDraft(values);
              setMode("preview");
            }}
            onBack={() => {
              setMode("list");
              setEditingPlanId(null);
            }}
            initialData={
              editingPlanId
                ? routinePlans.find((p) => p.id === editingPlanId)
                : undefined
            }
          />
        </Card>
      )}

      {mode === "preview" && planType === "MASS" && (
        <Card className="section-card">
          <div className="page-title">普免计划预览</div>
          <div className="preview-grid">
            <div>
              <Text type="secondary">计划名称</Text>
              <div className="preview-value">{draft?.name || "-"}</div>
            </div>
            <div>
              <Text type="secondary">目标免疫群体</Text>
              <div className="preview-value">
                {(() => {
                  const v = extractPigTypeValues(draft?.pigRuleConditions || [])[0];
                  return (
                    pigTypeOptions.find((o) => o.value === v)?.label || v || "-"
                  );
                })()}
              </div>
            </div>
            <div>
              <Text type="secondary">执行时间</Text>
              <div className="preview-value">
                {(draft?.scheduleDates || []).join("/")}
              </div>
            </div>
            <div>
              <Text type="secondary">疫苗</Text>
              <div className="preview-value">{draft?.vaccineId}</div>
            </div>
            <div>
              <Text type="secondary">疫苗品牌</Text>
              <div className="preview-value">{draft?.vaccineBrand || "-"}</div>
            </div>
            <div>
              <Text type="secondary">接种方式</Text>
              <div className="preview-value">{draft?.vaccinationMethod || "-"}</div>
            </div>
            <div>
              <Text type="secondary">剂量</Text>
              <div className="preview-value">
                {draft?.dosage} {draft?.dosageUnit}
              </div>
            </div>
            <div>
              <Text type="secondary">效果追踪</Text>
              <div className="preview-value">
                {formatEffectTrackingLine(buildEffectTrackingPayload(draft))}
              </div>
            </div>
          </div>
          <div className="form-actions">
            <Button onClick={() => setMode("config")}>返回修改</Button>
            <Button
              type="primary"
              onClick={() => {
                if (draft) {
                  const pigTypeLabel =
                    extractPigTypeValues(draft?.pigRuleConditions || [])
                      .map((val: string) => pigTypeOptions.find((o) => o.value === val)?.label)
                      .filter(Boolean)[0] || "";
                  const planPayload = {
                    name: draft.name,
                    cycle: "每年",
                    pigType: pigTypeLabel,
                    execute: Array.isArray(draft.scheduleDates)
                      ? draft.scheduleDates
                          .filter((d: any) => d && dayjs.isDayjs(d))
                          .map((d: Dayjs) => d.format("MM-DD"))
                          .join("/")
                      : (draft.scheduleDates || []).join("/"),
                    vaccine:
                      vaccines.find((v) => v.id === draft.vaccineId)?.name || "",
                    vaccineBrand: draft.vaccineBrand || "",
                    vaccinationMethod: draft.vaccinationMethod || "肌肉注射",
                    dosage: draft.dosage,
                    dosageUnit: draft.dosageUnit || "毫克",
                    exclusion: "后端强制规则",
                    enabled: true,
                    effectTracking: buildEffectTrackingPayload(draft)
                  };
                  if (editingPlanId) {
                    setMassPlans((prev) =>
                      prev.map((p) =>
                        p.id === editingPlanId
                          ? { ...p, ...planPayload }
                          : p
                      )
                    );
                  } else {
                    setMassPlans((prev) => [
                      { id: `mass-${Date.now()}`, ...planPayload },
                      ...prev
                    ]);
                  }
                }
                setMode("list");
                setPlanType(null);
                setEditingPlanId(null);
              }}
            >
              完成
            </Button>
          </div>
        </Card>
      )}

      {mode === "preview" && planType === "ROUTINE" && (
        <Card className="section-card">
          <div className="page-title">跟批免疫计划预览</div>
          <div className="preview-grid">
            <div>
              <Text type="secondary">计划名称</Text>
              <div className="preview-value">
                {draft?.name || "-"}
              </div>
            </div>
            <div>
              <Text type="secondary">适用生产线</Text>
              <div className="preview-value">
                {formatRoutineProductionLineDisplay(draft?.productionLine) || "-"}
              </div>
            </div>
            <div>
              <Text type="secondary">目标免疫群体</Text>
              <div className="preview-value">
                {(() => {
                  const vals = extractPigTypeValues(draft?.pigRuleConditions || []);
                  const first = vals[0];
                  return (
                    pigTypeOptions.find((p) => p.value === first)?.label ||
                    first ||
                    "-"
                  );
                })()}
              </div>
            </div>
            <div>
              <Text type="secondary">触发规则</Text>
              <div className="preview-value">
                {Array.isArray(draft?.dispatches) && draft.dispatches.length > 0
                  ? Array.from(
                      new Set(
                        draft.dispatches.map((d: any) =>
                          d?.triggerRule === "STATUS"
                            ? "生产状态"
                            : d?.triggerRule === "PRE_START"
                              ? "预计生产任务开始前"
                              : d?.triggerRule === "POST_END"
                                ? "实际生产任务结束后"
                                : d?.triggerRule === "AGE"
                                  ? "日龄"
                                  : "-"
                        )
                      )
                    ).join(" / ")
                  : "-"}
              </div>
            </div>
            <div>
              <Text type="secondary">下发时间</Text>
              <div className="preview-value">
                {Array.isArray(draft?.dispatches) && draft.dispatches.length > 0
                  ? draft.dispatches
                      .map((d: any) => {
                        if (d?.triggerRule === "STATUS")
                          return `${d?.statusType || "-"} ${d?.offsetDays ?? 0} 天`;
                        if (d?.triggerRule === "AGE")
                          return `日龄 ${d?.offsetDays ?? 0} 天`;
                        if (d?.triggerRule === "PRE_START")
                          return `${d?.taskType || "-"} 开始前 ${d?.offsetDays ?? 0} 天`;
                        if (d?.triggerRule === "POST_END")
                          return `${d?.taskType || "-"} 结束后 ${d?.offsetDays ?? 0} 天`;
                        return "-";
                      })
                      .join("；")
                  : "-"}
              </div>
            </div>
            <div>
              <Text type="secondary">疫苗</Text>
              <div className="preview-value">
                {vaccines.find((v) => v.id === draft?.vaccineId)?.name || draft?.vaccineId}
              </div>
            </div>
            <div>
              <Text type="secondary">疫苗品牌</Text>
              <div className="preview-value">{draft?.vaccineBrand || "-"}</div>
            </div>
            <div>
              <Text type="secondary">接种方式</Text>
              <div className="preview-value">{draft?.vaccinationMethod || "-"}</div>
            </div>
            <div>
              <Text type="secondary">剂量</Text>
              <div className="preview-value">
                {draft?.dosage} {draft?.dosageUnit}
              </div>
            </div>
            <div>
              <Text type="secondary">效果追踪</Text>
              <div className="preview-value">
                {formatEffectTrackingLine(buildEffectTrackingPayload(draft))}
              </div>
            </div>
          </div>
          <div className="form-actions">
            <Button onClick={() => setMode("config")}>返回修改</Button>
            <Button
              type="primary"
              onClick={() => {
                if (draft) {
                  const lineLabel = formatRoutineProductionLineDisplay(
                    draft.productionLine
                  );
                  const pigOpt = pigTypeOptions.find(
                    (p) => p.value === draft.simplePigType
                  );
                  const vacc = vaccines.find((v) => v.id === draft.vaccineId);
                  const dispatches = Array.isArray(draft.dispatches)
                    ? draft.dispatches
                    : [];
                  const triggerLabel =
                    dispatches.length > 1
                      ? "多次下发"
                      : dispatches[0]?.triggerRule === "PRE_START"
                        ? "预计生产任务开始前"
                        : dispatches[0]?.triggerRule === "POST_END"
                          ? "实际生产任务结束后"
                          : dispatches[0]?.triggerRule === "STATUS"
                            ? "生产状态"
                            : dispatches[0]?.triggerRule === "AGE"
                              ? "日龄"
                              : "";
                  const dispatchTime = dispatches.length
                    ? dispatches
                        .map((d: any) => {
                          if (d?.triggerRule === "PRE_START")
                            return `${d?.taskType || "-"} 开始前 ${d?.offsetDays ?? 0} 天`;
                          if (d?.triggerRule === "POST_END")
                            return `${d?.taskType || "-"} 结束后 ${d?.offsetDays ?? 0} 天`;
                          if (d?.triggerRule === "STATUS")
                            return `${d?.statusType || "-"} ${d?.offsetDays ?? 0} 天`;
                          if (d?.triggerRule === "AGE")
                            return `${d?.offsetDays ?? 0} 天`;
                          return "-";
                        })
                        .join("；")
                    : "";

                  const planPayload: Omit<
                    RoutinePlanRow,
                    "id" | "workOrdersDispatched" | "partialVaccinationProgress"
                  > = {
                    name: draft.name,
                    line: lineLabel,
                    pigType: pigOpt?.label || "-",
                    triggerRule: triggerLabel,
                    dispatchTime,
                    vaccine: vacc?.name || "",
                    vaccineBrand: draft.vaccineBrand || "",
                    vaccinationMethod: draft.vaccinationMethod || "肌肉注射",
                    dosage: draft.dosage,
                    dosageUnit: draft.dosageUnit || "毫克",
                    exclusion: "后端强制规则",
                    exemptions: [],
                    enabled: true,
                    effectTracking: buildEffectTrackingPayload(draft)
                  };
                  if (editingPlanId) {
                    setRoutinePlans((prev) =>
                      prev.map((p) =>
                        p.id === editingPlanId
                          ? { ...p, ...planPayload }
                          : p
                      )
                    );
                  } else {
                    setRoutinePlans((prev) => [
                      {
                        id: `routine-${Date.now()}`,
                        ...planPayload,
                        workOrdersDispatched: false,
                        partialVaccinationProgress: false
                      },
                      ...prev
                    ]);
                  }
                }
                setMode("list");
                setPlanType(null);
                setEditingPlanId(null);
              }}
            >
              完成
            </Button>
          </div>
        </Card>
      )}

      <Modal
        title="创建疫苗计划"
        open={createOpen}
        onCancel={() => {
          setCreateOpen(false);
          setPlanType(null);
          setMode("list");
        }}
        footer={null}
        width={820}
        destroyOnClose
      >
        <div className="plan-type-select">
          <Radio.Group
            onChange={(e) => setPlanType(e.target.value)}
            value={planType}
          >
            <Space direction="vertical" size={16}>
              <Radio value="MASS">
                <div className="type-card">
                  <div className="type-title">普免</div>
                  <div className="type-desc">
                    适用于全年周期性的统一免疫计划，可配置周期和豁免规则。
                  </div>
                </div>
              </Radio>
              <Radio value="ROUTINE">
                <div className="type-card">
                  <div className="type-title">跟批免疫</div>
                  <div className="type-desc">
                    适用于 SOP 标准化程序，按生产线与基准事件自动触发。
                  </div>
                </div>
              </Radio>
            </Space>
          </Radio.Group>
          <div className="form-actions">
            <Button onClick={() => setCreateOpen(false)}>取消</Button>
            <Button
              type="primary"
              disabled={!planType}
              onClick={() => {
                setCreateOpen(false);
                massCalEyePrevEditingIdRef.current = null;
                massConfigBackToAnnualCalRef.current = false;
                setReadonlyMassConfig(false);
                setEditingPlanId(null);
                setMode("config");
              }}
            >
              开始配置
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
