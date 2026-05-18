import type { FormInstance } from "antd/es/form";
import { useMemo } from "react";
import { Col, Form, InputNumber, Row, Select, Switch, Typography } from "antd";
import { vaccineCatalog } from "./mockData";

const { Text } = Typography;

/** 计划配置中的免疫复核（采样 + 合格率阈值），与后续采样任务、审核页对齐 */
export type PlanEffectTrackingFormValues = {
  effectTrackingEnabled: boolean;
  samplingMethod?: "EAR_VEIN" | "FRONT_VENA" | "TAIL_VEIN";
  sampleContainer?: "REAGENT_BAG_BLOOD" | "REAGENT_BAG" | "BLOOD_TUBE";
  samplingIntervalDays: number;
  samplingRatioPercent: number;
  qualificationThresholdPercent: number;
};

/** 写入计划行的 effectTracking 快照（含目标抗体，供列表摘要展示） */
export type PlanEffectTrackingStored = PlanEffectTrackingFormValues & {
  targetAntibody?: string;
};

export type PlanEffectTrackingResultStored = {
  sampledCount: number;
  qualifiedCount: number;
  qualificationRatePercent: number;
  result: "合格" | "不合格";
};

export const PLAN_EFFECT_TRACKING_DEFAULTS: PlanEffectTrackingFormValues = {
  effectTrackingEnabled: false,
  samplingMethod: undefined,
  sampleContainer: undefined,
  samplingIntervalDays: 28,
  samplingRatioPercent: 5,
  qualificationThresholdPercent: 80
};

export const SAMPLING_METHOD_OPTIONS = [
  { label: "耳静脉采血", value: "EAR_VEIN" },
  { label: "前腔静脉采血", value: "FRONT_VENA" },
  { label: "尾静脉采血", value: "TAIL_VEIN" }
] as const;

export const SAMPLE_CONTAINER_OPTIONS = [
  { label: "试剂袋（血）", value: "REAGENT_BAG_BLOOD" },
  { label: "试剂袋", value: "REAGENT_BAG" },
  { label: "采样血管", value: "BLOOD_TUBE" }
] as const;

export function getTargetAntibodyByVaccineId(vaccineId?: string | null): string {
  if (!vaccineId) return "";
  const cat = vaccineCatalog.find((c) => c.vaccineId === vaccineId);
  return cat?.targetAntibody?.trim() ?? "";
}

export function samplingMethodLabel(v?: string): string | undefined {
  return SAMPLING_METHOD_OPTIONS.find((x) => x.value === v)?.label;
}

export function sampleContainerLabel(v?: string): string | undefined {
  return SAMPLE_CONTAINER_OPTIONS.find((x) => x.value === v)?.label;
}

/** 从计划行（含 effectTracking 嵌套）合并表单初值 */
export function mergeEffectTrackingInitial(row: any): PlanEffectTrackingFormValues {
  const et = row?.effectTracking;
  if (!et || typeof et !== "object") {
    return { ...PLAN_EFFECT_TRACKING_DEFAULTS };
  }
  return {
    effectTrackingEnabled: Boolean(et.effectTrackingEnabled),
    samplingMethod: et.samplingMethod,
    sampleContainer: et.sampleContainer,
    samplingIntervalDays:
      et.samplingIntervalDays ?? PLAN_EFFECT_TRACKING_DEFAULTS.samplingIntervalDays,
    samplingRatioPercent:
      et.samplingRatioPercent ?? PLAN_EFFECT_TRACKING_DEFAULTS.samplingRatioPercent,
    qualificationThresholdPercent:
      et.qualificationThresholdPercent ??
      PLAN_EFFECT_TRACKING_DEFAULTS.qualificationThresholdPercent
  };
}

export function buildEffectTrackingPayload(draft: any): PlanEffectTrackingStored {
  const vaccineId = draft?.vaccineId as string | undefined;
  const fromCatalog = getTargetAntibodyByVaccineId(vaccineId);
  const snapshot =
    fromCatalog ||
    String(draft?.effectTracking?.targetAntibody ?? "").trim() ||
    undefined;

  return {
    effectTrackingEnabled: Boolean(draft?.effectTrackingEnabled),
    targetAntibody: snapshot,
    samplingMethod: draft?.samplingMethod,
    sampleContainer: draft?.sampleContainer,
    samplingIntervalDays: Number(
      draft?.samplingIntervalDays ?? PLAN_EFFECT_TRACKING_DEFAULTS.samplingIntervalDays
    ),
    samplingRatioPercent: Number(
      draft?.samplingRatioPercent ?? PLAN_EFFECT_TRACKING_DEFAULTS.samplingRatioPercent
    ),
    qualificationThresholdPercent: Number(
      draft?.qualificationThresholdPercent ??
        PLAN_EFFECT_TRACKING_DEFAULTS.qualificationThresholdPercent
    )
  };
}

/** 列表/预览一行文案 */
export function formatEffectTrackingLine(et: PlanEffectTrackingStored | undefined): string {
  if (!et?.effectTrackingEnabled) return "未开启";
  const ab = et.targetAntibody ? `目标抗体 ${et.targetAntibody} · ` : "";
  const methodText = samplingMethodLabel(et.samplingMethod)
    ? `采样 ${samplingMethodLabel(et.samplingMethod)} · `
    : "";
  const containerText = sampleContainerLabel(et.sampleContainer)
    ? `容器 ${sampleContainerLabel(et.sampleContainer)} · `
    : "";
  return `已开启 · ${ab}${methodText}${containerText}间隔 ${et.samplingIntervalDays} 天 · 抽检 ${et.samplingRatioPercent}% · 合格率阈值 ${et.qualificationThresholdPercent}%`;
}

const whenEnabledRule =
  (message: string) =>
  ({ getFieldValue }: { getFieldValue: (n: string) => unknown }) => ({
    validator(_: unknown, value: unknown) {
      if (!getFieldValue("effectTrackingEnabled")) return Promise.resolve();
      if (
        value === null ||
        value === undefined ||
        value === "" ||
        (Array.isArray(value) && value.length === 0)
      )
        return Promise.reject(new Error(message));
      return Promise.resolve();
    }
  });

export function PlanEffectTrackingSection({ form }: { form: FormInstance }) {
  const enabled = Form.useWatch("effectTrackingEnabled", form);
  const vaccineId = Form.useWatch("vaccineId", form);
  const intervalDays = Form.useWatch("samplingIntervalDays", form);
  const ratioPct = Form.useWatch("samplingRatioPercent", form);
  const thresholdPct = Form.useWatch("qualificationThresholdPercent", form);

  const targetAntibodyText = useMemo(() => getTargetAntibodyByVaccineId(vaccineId), [vaccineId]);

  const exampleLine = useMemo(() => {
    const d = Number(intervalDays ?? PLAN_EFFECT_TRACKING_DEFAULTS.samplingIntervalDays);
    const r = Number(ratioPct ?? PLAN_EFFECT_TRACKING_DEFAULTS.samplingRatioPercent);
    const t = Number(thresholdPct ?? PLAN_EFFECT_TRACKING_DEFAULTS.qualificationThresholdPercent);
    const herd = 200;
    const sampled = Math.max(1, Math.round((herd * r) / 100));
    const minPositive = Math.ceil((sampled * t) / 100);
    return `举例：假设目标群共 ${herd} 头，抽样比例为 ${r}%，则约抽检 ${sampled} 头（${herd}×${r}%≈${sampled}）。接种完成后第 ${d} 天下发采样任务；若实验室回录 ${sampled} 份有效结果，其中阳性样本不少于 ${minPositive} 份（${sampled}×${t}%=${minPositive}，向上取整）即视为达到抗体合格率阈值，系统将不再提示补免。`;
  }, [intervalDays, ratioPct, thresholdPct]);

  return (
    <div className="effect-tracking-block">
      <div className="effect-tracking-block__head">
        <div className="effect-tracking-block__head-left">
          <Text strong>免疫复核</Text>
          <Text type="secondary" className="effect-tracking-block__head-desc">
            接种后按间隔触发采样任务；实验室结果回录后按合格率阈值自动决策是否补免
          </Text>
        </div>
        <Form.Item
          name="effectTrackingEnabled"
          valuePropName="checked"
          className="effect-tracking-block__switch-item"
        >
          <Switch checkedChildren="开" unCheckedChildren="关" />
        </Form.Item>
      </div>

      {enabled && (
        <>
          <div className="effect-tracking-target-ab">
            <Text type="secondary" className="effect-tracking-target-ab__label">
              目标抗体
            </Text>
            <div className="effect-tracking-target-ab__value" aria-readonly>
              {vaccineId
                ? targetAntibodyText || "该疫苗未在疫苗管理中配置目标抗体"
                : "请先选择疫苗"}
            </div>
          </div>

          <Row gutter={[16, 12]}>
            <Col xs={24} md={12}>
              <Form.Item
                name="samplingMethod"
                label="采样方式"
                rules={[whenEnabledRule("请选择采样方式")]}
              >
                <Select placeholder="请选择采样方式" options={SAMPLING_METHOD_OPTIONS as any} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="sampleContainer"
                label="样品容器"
                rules={[whenEnabledRule("请选择样品容器")]}
              >
                <Select placeholder="请选择样品容器" options={SAMPLE_CONTAINER_OPTIONS as any} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item
                name="samplingIntervalDays"
                label="抽检间隔"
                rules={[
                  whenEnabledRule("请输入抽检间隔"),
                  {
                    type: "number",
                    min: 1,
                    max: 365,
                    message: "间隔为 1～365 天"
                  }
                ]}
              >
                <InputNumber min={1} max={365} style={{ width: "100%" }} addonAfter="天" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item
                name="samplingRatioPercent"
                label="抽样比例"
                rules={[
                  whenEnabledRule("请输入抽样比例"),
                  {
                    type: "number",
                    min: 1,
                    max: 100,
                    message: "比例为 1～100%"
                  }
                ]}
              >
                <InputNumber min={1} max={100} style={{ width: "100%" }} addonAfter="%" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item
                name="qualificationThresholdPercent"
                label="抗体合格率阈值"
                rules={[
                  whenEnabledRule("请输入合格率阈值"),
                  {
                    type: "number",
                    min: 1,
                    max: 100,
                    message: "阈值为 1～100%"
                  }
                ]}
              >
                <InputNumber min={1} max={100} style={{ width: "100%" }} addonAfter="%" />
              </Form.Item>
            </Col>
          </Row>

          <div className="effect-tracking-example">
            <Text strong className="effect-tracking-example__title">
              计算说明（示例）
            </Text>
            <Text type="secondary" className="effect-tracking-example__body">
              {exampleLine}
            </Text>
          </div>
        </>
      )}
    </div>
  );
}
