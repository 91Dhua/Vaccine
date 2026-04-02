import { useEffect, useMemo, useRef, useState } from "react";
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
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import {
  baselineEvents,
  pigTypeOptions,
  productionLines,
  vaccineCatalog,
  vaccines
} from "../mockData";

const { Title, Text } = Typography;

type PlanType = "MASS" | "ROUTINE";

type PigRuleField = "PIG_TYPE" | "AGE_YEARS" | "PARITY" | "BREED";
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
  { label: "胎次", value: "PARITY" },
  { label: "品种", value: "BREED" }
];

function getOperatorOptions(field: PigRuleField) {
  if (field === "PIG_TYPE" || field === "BREED") {
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
  { label: "即将转舍", value: "PRE_TRANSFER" },
  { label: "生产状态", value: "STATUS" },
  { label: "健康状态异常", value: "HEALTH_ABNORMAL" },
  { label: "日龄", value: "AGE" }
];

/** 跟批免疫豁免规则触发类型：不需要「生产状态」 */
const EXEMPTION_RULE_TYPE_OPTIONS_ROUTINE = EXEMPTION_RULE_TYPE_OPTIONS.filter(
  (o) => o.value !== "STATUS"
);

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
}): string {
  const label =
    r.rule === "PRE_START"
      ? "预计生产任务开始前"
      : r.rule === "POST_END"
        ? "实际生产任务结束后"
        : r.rule === "STATUS"
          ? "生产状态"
          : r.rule === "PRE_TRANSFER"
            ? "即将转舍"
            : r.rule === "HEALTH_ABNORMAL"
              ? "健康状态异常"
              : r.rule === "AGE"
                ? "日龄"
                : String(r.rule ?? "");
  const daysStr = `${r.daysStart ?? 0}-${r.daysEnd ?? 0} 天`;
  if (r.rule === "HEALTH_ABNORMAL") {
    return label;
  }
  if (r.rule === "PRE_TRANSFER") {
    return `${label} ${daysStr} 免打`;
  }
  if (r.rule === "STATUS") {
    return `${label} ${r.statusType || "-"} ${daysStr} 免打`;
  }
  if (r.rule === "PRE_START" || r.rule === "POST_END") {
    const rel = r.rule === "PRE_START" ? "开始前" : "结束后";
    return `${label} ${r.taskType || "-"} ${rel} ${daysStr} 免打`;
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
  const showFieldCol = hasField || Boolean(tip);

  return (
    <div className="exemption-step-block">
      <div className={`exemption-step-row${showFieldCol ? "" : " exemption-step-row--label-only"}`}>
        <div className="exemption-step-label-col">
          <div className="exemption-step-head">
            <span className="exemption-step-index">{step}</span>
            <div className="exemption-step-head-main">
              <div className="exemption-step-title-row">
                {title}
                {required ? <span className="exemption-req">*</span> : null}
              </div>
              {hint ? <div className="exemption-step-hint">{hint}</div> : null}
            </div>
          </div>
        </div>
        {showFieldCol ? (
          <div className="exemption-step-field-col">
            {hasField ? <div className="exemption-step-body">{children}</div> : null}
            {tip ? (
              <div className={`exemption-step-foot-tip${hasField ? "" : " exemption-step-foot-tip--solo"}`}>
                <span aria-hidden>ℹ️</span>
                <span>{tip}</span>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
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

  const handleRuleChange = () => {
    ["taskType", "statusType", "daysStart", "daysEnd"].forEach((key) => {
      form.setFieldValue(["exemptions", field.name, key], undefined);
    });
  };

  const needsSecondStep =
    rule === "PRE_START" || rule === "POST_END" || rule === "STATUS";
  /** 即将转舍 / 日龄：第二步配置起止日龄或天数区间 */
  const needsTransferTimeRange = rule === "PRE_TRANSFER";
  const needsAgeRange = rule === "AGE";

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

        {rule === "HEALTH_ABNORMAL" && (
          <MassExemptionStep
            step={2}
            title="说明"
            hint="健康状态异常时由系统自动判定免打范围，无需填写天数。"
          />
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
      </div>
    </div>
  );
}

/** 接种排期选择器：芯片式展示 + Popover 日期选择 */
function ScheduleDatesPicker({
  value = [],
  onChange
}: {
  value?: Dayjs[];
  onChange?: (val: Dayjs[]) => void;
}) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const dates = Array.isArray(value) ? value.filter((d) => d && dayjs.isDayjs(d)) : [];
  const sortedDates = [...dates].sort((a, b) => a.month() * 31 + a.date() - (b.month() * 31 + b.date()));

  const handleAdd = (d: Dayjs | null) => {
    if (!d) return;
    const key = d.format("MM-DD");
    if (dates.some((x) => x.format("MM-DD") === key)) return;
    onChange?.([...dates, d]);
    setPopoverOpen(false);
  };

  const handleRemove = (idx: number) => {
    const next = dates.filter((_, i) => i !== idx);
    onChange?.(next);
  };

  return (
    <div className="schedule-dates-picker">
      <div className="schedule-dates-card">
        <div className="schedule-dates-chips">
          {sortedDates.length === 0 ? (
            <span className="schedule-dates-empty">暂无接种日期</span>
          ) : (
            sortedDates.map((d, idx) => {
              const originalIdx = dates.findIndex((x) => x.format("MM-DD") === d.format("MM-DD"));
              return (
                <Tag
                  key={d.format("MM-DD")}
                  closable
                  onClose={(e) => {
                    e.preventDefault();
                    handleRemove(originalIdx);
                  }}
                  className="schedule-date-chip"
                >
                  {d.format("MM-DD")}
                </Tag>
              );
            })
          )}
        </div>
        <Popover
          open={popoverOpen}
          onOpenChange={setPopoverOpen}
          trigger="click"
          content={
            <div className="schedule-dates-popover">
              <Text type="secondary" style={{ display: "block", marginBottom: 8, fontSize: 12 }}>
                点击日历中的日期添加
              </Text>
              <Calendar
                fullscreen={false}
                onSelect={(d) => handleAdd(d)}
              />
            </div>
          }
        >
          <Button type="dashed" icon={<PlusOutlined />} className="schedule-dates-add-btn">
            添加日期
          </Button>
        </Popover>
      </div>
      {sortedDates.length > 12 && (
        <Alert
          type="warning"
          showIcon
          message="建议核对防疫强度"
          style={{ marginTop: 8 }}
        />
      )}
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
    enabled: false
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
    exclusion: "无"
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

type RoutinePlanRow = {
  id: string;
  name?: string;
  line: string;
  pigType: string;
  triggerRule: string;
  dispatchTime: string;
  vaccine: string;
  dosage: number;
  dosageUnit: string;
  exclusion?: string;
  exemptions?: any[];
  enabled: boolean;
  workOrdersDispatched?: boolean;
  partialVaccinationProgress?: boolean;
};

function MassPlanForm({
  onSubmit,
  onPreview,
  onBack,
  initialData
}: {
  onSubmit: (values: any) => void;
  onPreview: (values: any) => void;
  onBack?: () => void;
  initialData?: any;
}) {
  const [form] = Form.useForm();
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
        vaccineId: vaccines.find((v) => v.name === initialData.vaccine)?.id,
        dosage: initialData.dosage,
        dosageUnit: initialData.dosageUnit || "毫克",
        remindDays: 3
      });
      simplePigTypeCommittedRef.current = targetValue;
      setAdvancedApplied(false);
      advancedAppliedRef.current = false;
    }
  }, [initialData, form]);

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
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          name: "",
          dosageUnit: "毫克",
          remindDays: 3,
          scheduleDates: [],
          pigRuleLogic: "AND",
          pigRuleConditions: [
            { field: "PIG_TYPE", operator: "IN", value: undefined },
            { field: "AGE_YEARS", operator: "LTE", value: undefined },
            { field: "PARITY", operator: "LTE", value: undefined }
          ],
          simplePigType: undefined
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
          if (pigTypeSelectionEqual(newVal, prev)) return;
          revertingSimpleRef.current = true;
          form.setFieldValue("simplePigType", prev);
          Modal.confirm({
            title: "确认改用简单选择？",
            content:
              "您已启用高级选猪规则。若继续修改常用目标猪群，高级规则中的年龄、胎次等条件将全部清空，仅保留本次选择的猪只类型，且无法恢复本次高级配置。是否确认？",
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
              <Text type="secondary" style={{ fontSize: 12 }}>
                此处仅展示常用猪群。如需多条件精准筛选，请点击右侧「高级设置」。
              </Text>
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
                          content: "取消后将清空日龄、胎次等高级条件，仅保留当前选择的猪只类型。",
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
            {!advancedApplied && (
              <div>
                <Button
                  disabled={!lockedPigTypeValue}
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
          <Col xs={24} md={14}>
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
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={10}>
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
          name="scheduleDates"
          label="接种排期 (年度循环)"
          required
          rules={[
            {
              validator: (_, value) => {
                const valid =
                  Array.isArray(value) &&
                  value.some((d: Dayjs | undefined) => d && dayjs.isDayjs(d));
                if (!valid) return Promise.reject(new Error("请至少选择一个执行日期"));
                return Promise.resolve();
              }
            }
          ]}
          extra="点击「添加日期」从日历中选择，选定的日期将作为每年的固定防疫节点。"
        >
          <ScheduleDatesPicker />
        </Form.Item>
        <Form.Item
          name="remindDays"
          label="任务下发前多久提醒我"
          extra="填写天数，如填 3 表示接种任务下发前 3 天提醒您"
          rules={[{ required: true, message: "请填写提醒天数" }]}
        >
          <InputNumber min={1} addonAfter="天" placeholder="天数" />
        </Form.Item>
        <Form.Item
          label="豁免规则"
          extra="设置免打时间段，如发情 5-7 天、分娩前 5-7 天、日龄 30-45 天等，系统将在此时间段内不安排该猪只接种；过了豁免期后会自动安排补打。"
        >
          <Form.List name="exemptions">
            {(fields, { add, remove }) => (
              <div className="exemptions-block">
                <div className="exemptions-list">
                  {fields.map((field) => (
                    <ExemptionRuleRow
                      key={field.key}
                      field={field}
                      form={form}
                      onRemove={() => remove(field.name)}
                      ruleTypeOptions={EXEMPTION_RULE_TYPE_OPTIONS_ROUTINE}
                    />
                  ))}
                </div>
                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={() => add()}
                  className="exemptions-add-btn"
                >
                  添加
                </Button>
              </div>
            )}
          </Form.List>
        </Form.Item>
      </Form>
      <div className="form-actions form-actions-split">
        <Button onClick={onBack}>返回</Button>
        <Button type="primary" onClick={handlePreview}>
          下一步
        </Button>
      </div>
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
        vaccineId: vacc?.id,
        dosage: vacc?.defaultDosage ?? 1,
        dosageUnit: "毫克",
        remindDays: 3,
        exemptions: Array.isArray(initialData.exemptions) ? initialData.exemptions : []
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
          ]
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
              "您已启用高级选猪规则。若继续修改常用目标猪群，高级规则中的年龄、胎次等条件将全部清空，仅保留本次选择的猪只类型，且无法恢复本次高级配置。是否确认？",
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
              <Text type="secondary" style={{ fontSize: 12 }}>
                此处仅展示常用猪群。如需多条件精准筛选，请点击右侧「高级设置」。
              </Text>
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
                          content: "取消后将清空日龄、胎次等高级条件，仅保留当前选择的猪只类型。",
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
            {!advancedApplied && (
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
        <Alert
          type="info"
          showIcon
          message="系统将根据触发规则与生产节点自动计算下发时间。"
          style={{ marginBottom: 16 }}
        />
        <Row gutter={12}>
          <Col xs={24} md={14}>
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
                onChange={(value) =>
                  setSelectedVaccine(vaccines.find((v) => v.id === value) || null)
                }
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={10}>
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
        <Form.Item
          name="remindDays"
          label="任务下发前多久提醒我"
          extra="填写天数，如填 3 表示接种任务下发前 3 天提醒您"
          rules={[{ required: true, message: "请填写提醒天数" }]}
        >
          <InputNumber min={1} addonAfter="天" placeholder="天数" />
        </Form.Item>
        <Form.Item
          label="豁免规则"
          extra="设置免打时间段，如发情 5-7 天、分娩前 5-7 天、日龄 30-45 天等，系统将在此时间段内不安排该猪只接种；过了豁免期后会自动安排补打。"
        >
          <Form.List name="exemptions">
            {(fields, { add, remove }) => (
              <div className="exemptions-block">
                <div className="exemptions-list">
                  {fields.map((field) => (
                    <ExemptionRuleRow
                      key={field.key}
                      field={field}
                      form={form}
                      onRemove={() => remove(field.name)}
                    />
                  ))}
                </div>
                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={() => add()}
                  className="exemptions-add-btn"
                >
                  添加
                </Button>
              </div>
            )}
          </Form.List>
        </Form.Item>
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
  const [mode, setMode] = useState<"list" | "config" | "preview">("list");
  const [draft, setDraft] = useState<any>(null);
  const [massPlans, setMassPlans] = useState(massPlanList);
  const [routinePlans, setRoutinePlans] = useState<RoutinePlanRow[]>(routinePlanList);
  const [planTab, setPlanTab] = useState<"mass" | "routine">("mass");
  const [massEditMode, setMassEditMode] = useState(false);
  const [routineEditMode, setRoutineEditMode] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);

  const routinePlanDisplayName = (record: { name?: string; line?: string; vaccine?: string }) =>
    record.name?.trim() ||
    [record.line, record.vaccine].filter(Boolean).join(" · ") ||
    "该计划";

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
        content: `「${planName}」的接种任务已下发至执行端，当前无法直接禁用计划。如需中止，请先前往"任务列表"结束相关任务。`
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
        content: `「${planName}」的接种任务已下发至执行端，当前无法直接禁用计划。如需中止，请先前往"任务列表"结束相关任务。`
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
                    scroll={{ x: 1100 }}
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
                        title: "剂量",
                        dataIndex: "dosage",
                        width: 100,
                        render: (_, record) =>
                          `${record.dosage} ${record.dosageUnit || ""}`.trim()
                      },
                      { title: "执行时间", dataIndex: "execute", ellipsis: true, width: 160 },
                      { title: "豁免规则", dataIndex: "exclusion", ellipsis: true },
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
                    scroll={{ x: 1100 }}
                    columns={[
                      { title: "计划名称", dataIndex: "name", ellipsis: true, width: 180 },
                      { title: "适用生产线", dataIndex: "line", ellipsis: true, width: 140 },
                      {
                        title: "目标免疫群体",
                        dataIndex: "pigType",
                        width: 120,
                        render: (text: string) => <Tag>{text}</Tag>
                      },
                      { title: "疫苗", dataIndex: "vaccine", ellipsis: true, width: 140 },
                      {
                        title: "剂量",
                        dataIndex: "dosage",
                        width: 100,
                        render: (_, record) =>
                          `${record.dosage ?? ""} ${record.dosageUnit || ""}`.trim()
                      },
                      { title: "执行时间", dataIndex: "dispatchTime", ellipsis: true },
                      { title: "豁免规则", dataIndex: "exclusion", ellipsis: true },
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

      {mode === "config" && planType === "MASS" && (
        <Card className="section-card">
          <div className="page-title">
            {editingPlanId ? "编辑普免计划" : "配置普免计划"}
          </div>
          <MassPlanForm
            onSubmit={(values) => {
              console.log("Mass plan payload", values);
            }}
            onPreview={(values) => {
              setDraft(values);
              setMode("preview");
            }}
            onBack={() => {
              setMode("list");
              setEditingPlanId(null);
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
              <Text type="secondary">剂量</Text>
              <div className="preview-value">
                {draft?.dosage} {draft?.dosageUnit}
              </div>
            </div>
            <div>
              <Text type="secondary">下发前提醒</Text>
              <div className="preview-value">任务下发前 {draft?.remindDays} 天提醒</div>
            </div>
            <div>
              <Text type="secondary">豁免规则</Text>
              <div className="preview-value">
                {(draft?.exemptions || []).length > 0
                  ? draft.exemptions.map((r: any) => formatMassExemptionRuleLine(r)).join("，")
                  : "无"}
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
                    dosage: draft.dosage,
                    dosageUnit: draft.dosageUnit || "毫克",
                    exclusion:
                      (draft.exemptions || []).length > 0
                        ? draft.exemptions
                            .map((r: any) => formatMassExemptionRuleLine(r))
                            .join("，")
                        : "无",
                    enabled: true
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
              <Text type="secondary">豁免规则</Text>
              <div className="preview-value">
                {(draft?.exemptions || []).length > 0
                  ? draft.exemptions.map((r: any) => formatMassExemptionRuleLine(r)).join("，")
                  : "无"}
              </div>
            </div>
            <div>
              <Text type="secondary">疫苗</Text>
              <div className="preview-value">
                {vaccines.find((v) => v.id === draft?.vaccineId)?.name || draft?.vaccineId}
              </div>
            </div>
            <div>
              <Text type="secondary">剂量</Text>
              <div className="preview-value">
                {draft?.dosage} {draft?.dosageUnit}
              </div>
            </div>
            <div>
              <Text type="secondary">下发前提醒</Text>
              <div className="preview-value">任务下发前 {draft?.remindDays} 天提醒</div>
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
                    dosage: draft.dosage,
                    dosageUnit: draft.dosageUnit || "毫克",
                    exclusion:
                      (draft.exemptions || []).length > 0
                        ? draft.exemptions
                            .map((r: any) => formatMassExemptionRuleLine(r))
                            .join("，")
                        : "无",
                    exemptions: draft.exemptions || [],
                    enabled: true
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
