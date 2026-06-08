import {
  Button,
  Card,
  DatePicker,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Steps,
  Typography
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { vaccineCatalog, vaccines } from "../mockData";
import type { VaccineCategory } from "../mockData";
import type { Vaccine } from "../types";
import { resolveTaskVaccinePresentation } from "../mobileVaccinationUtils";
import {
  buildEffectTrackingPayload,
  formatEffectTrackingLine,
  PlanEffectTrackingSection,
  PLAN_EFFECT_TRACKING_DEFAULTS,
  type PlanEffectTrackingStored
} from "../planEffectTracking";

const { Title, Text } = Typography;

export type VaccineTaskDraft = {
  vaccineId: string;
  vaccineName: string;
  brand?: string;
  vaccinationMethod?: string;
  dosage: number;
  dosageUnit: "毫克" | "毫升";
  date?: string;
  effectTracking?: PlanEffectTrackingStored;
};

interface Props {
  step: "form" | "preview";
  selectedPigs: string[];
  mode?: "create" | "edit" | "supplement" | "quickSupplement";
  payload?: VaccineTaskDraft | null;
  quickSupplementType?: "pending-only" | "review-full" | null;
  onBack: () => void;
  onNext?: (payload: VaccineTaskDraft) => void;
  onFinish?: () => void;
}

const ROUTE_TO_METHOD_LABEL: Record<string, string> = {
  IM: "肌内注射",
  SC: "皮下注射",
  滴鼻: "滴鼻",
  饮水: "饮水",
  喷雾: "喷雾"
};

const vaccineDosageFormOptions = [
  { label: "活疫苗（冻干苗）", value: "活疫苗（冻干苗）" },
  { label: "油佐剂灭活疫苗", value: "油佐剂灭活疫苗" },
  { label: "水佐剂灭活疫苗", value: "水佐剂灭活疫苗" },
  { label: "灭活疫苗", value: "灭活疫苗" }
];

const vaccineRouteOptions = [
  { label: "肌肉注射(IM)", value: "IM" },
  { label: "皮下注射(SC)", value: "SC" },
  { label: "滴鼻", value: "滴鼻" },
  { label: "饮水", value: "饮水" },
  { label: "喷雾", value: "喷雾" }
];

const vaccineTypeOptions = [
  { label: "病毒性", value: "病毒性" },
  { label: "细菌性", value: "细菌性" },
  { label: "寄生虫", value: "寄生虫" }
] as const;

export function VaccineTaskWizard({
  step,
  selectedPigs,
  mode = "create",
  payload,
  quickSupplementType = null,
  onBack,
  onNext,
  onFinish
}: Props) {
  const [form] = Form.useForm();
  const [createDrugForm] = Form.useForm();
  const [localVaccines, setLocalVaccines] = useState<Vaccine[]>(vaccines);
  const [localVaccineCatalog, setLocalVaccineCatalog] = useState<VaccineCategory[]>(vaccineCatalog);
  const [createDrugOpen, setCreateDrugOpen] = useState(false);
  const isSupplement = mode === "supplement";
  const isQuickSupplement = mode === "quickSupplement";
  const isReviewRevaccination = isQuickSupplement && quickSupplementType === "review-full";
  const shouldManuallySelectDate = isQuickSupplement;
  const lockPrefilledTaskInfo = isSupplement || isQuickSupplement;
  const watchedVaccineId = Form.useWatch("vaccineId", form);
  const watchedBrand = Form.useWatch("brand", form);

  const selectedBrandConfig = useMemo(
    () =>
      localVaccineCatalog
        .find((item) => item.vaccineId === watchedVaccineId)
        ?.brands.find((brand) => brand.brandNameCn === watchedBrand),
    [localVaccineCatalog, watchedBrand, watchedVaccineId]
  );

  const brandOptions =
    localVaccineCatalog
      .find((item) => item.vaccineId === watchedVaccineId)
      ?.brands.map((brand) => ({
        label: brand.brandNameCn,
        value: brand.brandNameCn
      })) || [];

  const vaccinationMethodOptions =
    selectedBrandConfig?.administrationRoutes?.map((route) => ({
      label: ROUTE_TO_METHOD_LABEL[route] || route,
      value: ROUTE_TO_METHOD_LABEL[route] || route
    })) || [];

  useEffect(() => {
    if (step !== "form") return;
    form.setFieldsValue({
      vaccineId: payload?.vaccineId,
      brand: payload?.brand,
      vaccinationMethod: payload?.vaccinationMethod,
      dosage: payload?.dosage ?? 2,
      dosageUnit: payload?.dosageUnit ?? "毫克",
      date: payload?.date ? dayjs(payload.date) : shouldManuallySelectDate ? undefined : dayjs("2026-02-09"),
      effectTrackingEnabled:
        payload?.effectTracking?.effectTrackingEnabled ??
        PLAN_EFFECT_TRACKING_DEFAULTS.effectTrackingEnabled,
      samplingMethod:
        payload?.effectTracking?.samplingMethod ?? PLAN_EFFECT_TRACKING_DEFAULTS.samplingMethod,
      sampleContainer:
        payload?.effectTracking?.sampleContainer ?? PLAN_EFFECT_TRACKING_DEFAULTS.sampleContainer,
      samplingIntervalDays:
        payload?.effectTracking?.samplingIntervalDays ??
        PLAN_EFFECT_TRACKING_DEFAULTS.samplingIntervalDays,
      samplingRatioPercent:
        payload?.effectTracking?.samplingRatioPercent ??
        PLAN_EFFECT_TRACKING_DEFAULTS.samplingRatioPercent,
      qualificationThresholdPercent:
        payload?.effectTracking?.qualificationThresholdPercent ??
        PLAN_EFFECT_TRACKING_DEFAULTS.qualificationThresholdPercent
    });
  }, [form, payload, shouldManuallySelectDate, step]);

  const openCreateDrugModal = () => {
    setCreateDrugOpen(true);
    createDrugForm.setFieldsValue({
      productNameCn: undefined,
      productNameEn: undefined,
      brandNameCn: undefined,
      brandNameEn: undefined,
      dosageForm: undefined,
      standardDosage: undefined,
      durationOfImmunity: undefined,
      withdrawalPeriodDays: undefined,
      immuneIntervalDays: undefined,
      administrationRoutes: ["IM"],
      vaccineType: "病毒性"
    });
  };

  const createVaccineDrug = async () => {
    const values = await createDrugForm.validateFields();
    const now = Date.now();
    const vaccineId = `VAC-CUSTOM-${now}`;
    const brandName = String(values.brandNameCn || "").trim();
    const productName = String(values.productNameCn || "").trim();
    const routes = Array.isArray(values.administrationRoutes) ? values.administrationRoutes : [];
    const newVaccine: Vaccine = {
      id: vaccineId,
      name: productName,
      brand: brandName,
      defaultDosage: Number.parseFloat(String(values.standardDosage || "2")) || 2,
      validAgeMin: 0,
      validAgeMax: 999,
      currentStock: 0
    };
    const newCatalog: VaccineCategory = {
      id: `vac-custom-${now}`,
      vaccineId,
      nameCn: productName,
      nameEn: String(values.productNameEn || "").trim(),
      targetAntibody: `${productName}抗体`,
      brands: [
        {
          id: `brand-custom-${now}`,
          brandNameCn: brandName,
          brandNameEn: String(values.brandNameEn || "").trim(),
          dosageForm: values.dosageForm,
          standardDosage: values.standardDosage,
          durationOfImmunity: values.durationOfImmunity,
          withdrawalPeriodDays: values.withdrawalPeriodDays,
          immuneIntervalDays: values.immuneIntervalDays,
          administrationRoutes: routes,
          targetPathogen: values.vaccineType
        }
      ]
    };

    setLocalVaccines((prev) => [newVaccine, ...prev]);
    setLocalVaccineCatalog((prev) => [newCatalog, ...prev]);
    const defaultMethod = routes[0] ? ROUTE_TO_METHOD_LABEL[routes[0]] || routes[0] : undefined;
    form.setFieldsValue({
      vaccineId,
      brand: brandName,
      vaccinationMethod: defaultMethod
    });
    setCreateDrugOpen(false);
    createDrugForm.resetFields();
  };

  if (step === "preview") {
    const brandLine = String(payload?.brand ?? "").trim();
    const brandForResolve = brandLine && brandLine !== "-" ? brandLine : "";
    const pres = resolveTaskVaccinePresentation(
      String(payload?.vaccineName ?? "").trim(),
      brandForResolve
    );

    return (
      <div>
        <div className="page-header">
          <div>
          <Title level={4} style={{ margin: 0 }}>
              {mode === "edit"
                ? "编辑接种任务"
                : isQuickSupplement
                  ? isReviewRevaccination
                    ? "重新接种"
                    : "快捷补打"
                  : isSupplement
                    ? "创建补充接种任务"
                    : "创建接种任务"}
            </Title>
            <Text type="secondary">
              {mode === "edit"
                ? "预览任务变更并确认保存"
                : isQuickSupplement
                  ? isReviewRevaccination
                    ? "已自动带入本次重新接种的目标猪只与原任务接种信息，确认后可直接重新接种。"
                    : "已自动带入未接种猪只与原任务接种信息，确认后可直接完成补打。"
                : isSupplement
                  ? "基于原任务补充创建一条新的接种任务"
                  : "预览任务明细并确认提交"}
            </Text>
          </div>
        </div>

      <Steps
        current={2}
        items={[{ title: "选择猪只" }, { title: "选择疫苗" }, { title: "确认接种" }]}
      />

        <Card className="section-card" style={{ marginTop: 16 }}>
          <div className="confirm-card">
            <div className="confirm-title">选择接种猪只</div>
            <div className="confirm-row">
              <div className="confirm-left">
                <div className="confirm-dot">✓</div>
                <div>
                  <div className="confirm-main">确认猪只</div>
                  <div className="confirm-sub">
                    查看当前已选择猪只列表。如需增删猪只，请返回上一步进行修改。
                  </div>
                </div>
              </div>
              <div className="confirm-count">已选 {selectedPigs.length} 头</div>
            </div>
          </div>

          <div className="confirm-card">
            <div className="confirm-title">接种信息</div>
            <div className="preview-grid">
              <div>
                <Text type="secondary">接种日期</Text>
                <div className="preview-value">{payload?.date}</div>
              </div>
              <div>
                <Text type="secondary">疫苗</Text>
                <div className="preview-value">{payload?.vaccineName}</div>
              </div>
              <div>
                <Text type="secondary">品牌</Text>
                <div className="preview-value">{payload?.brand}</div>
              </div>
              <div>
                <Text type="secondary">接种方式</Text>
                <div className="preview-value">
                  {payload?.vaccinationMethod || pres.administrationRoute || "—"}
                </div>
              </div>
              <div>
                <Text type="secondary">剂量</Text>
                <div className="preview-value">
                  {payload?.dosage} {payload?.dosageUnit || "毫克"}
                </div>
              </div>
            </div>
          </div>

          {payload?.effectTracking?.effectTrackingEnabled ? (
            <div className="confirm-card">
              <div className="confirm-title">免疫复核设置</div>
              <div className="preview-grid">
                <div>
                  <Text type="secondary">是否启用复核</Text>
                  <div className="preview-value">是</div>
                </div>
                <div>
                  <Text type="secondary">复核配置</Text>
                  <div className="preview-value">{formatEffectTrackingLine(payload.effectTracking)}</div>
                </div>
              </div>
            </div>
          ) : null}
        </Card>

        <div className="form-actions">
          <Button onClick={onBack}>上一步</Button>
          <Button type="primary" onClick={onFinish}>
            {isQuickSupplement ? (isReviewRevaccination ? "确认接种" : "完成补打") : "完成"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <Title level={4} style={{ margin: 0 }}>
            {mode === "edit"
              ? "编辑接种任务"
              : isQuickSupplement
                ? isReviewRevaccination
                  ? "重新接种"
                  : "快捷补打"
                : isSupplement
                  ? "创建补充接种任务"
                  : "创建接种任务"}
          </Title>
          <Text type="secondary">
            {mode === "edit"
              ? "调整接种信息并保存任务"
              : isQuickSupplement
                ? isReviewRevaccination
                  ? "已自动带入原任务的接种信息，用户只需确认新的接种日期并发起重新接种"
                  : "已自动带入原任务的接种信息，用户只需确认新的接种日期"
              : isSupplement
                ? "沿用原任务的接种信息，只需选择新的接种日期"
                : "填写接种信息并生成任务"}
          </Text>
        </div>
      </div>

      <Steps
        current={1}
        items={[{ title: "选择猪只" }, { title: "选择疫苗" }, { title: "确认接种" }]}
      />

      <Card className="section-card" style={{ marginTop: 16 }}>
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            date: dayjs("2026-02-09"),
            dosage: 2,
            dosageUnit: "毫克",
            ...PLAN_EFFECT_TRACKING_DEFAULTS
          }}
        >
          <div className="form-grid">
            <Form.Item
              name="vaccineId"
              label="疫苗"
              rules={[{ required: true, message: "请选择疫苗" }]}
            >
              <Select
                placeholder="选择疫苗"
                options={localVaccines.map((v) => ({
                  value: v.id,
                  label: v.name
                }))}
                dropdownRender={(menu) => (
                  <>
                    {menu}
                    <Divider style={{ margin: "8px 0" }} />
                    <Button
                      type="text"
                      icon={<PlusOutlined />}
                      block
                      className="vaccine-task-create-drug-btn"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={openCreateDrugModal}
                    >
                      创建药品
                    </Button>
                  </>
                )}
                disabled={lockPrefilledTaskInfo}
                onChange={() => {
                  form.setFieldsValue({ brand: undefined, vaccinationMethod: undefined });
                }}
              />
            </Form.Item>
            <Form.Item
              name="brand"
              label="品牌"
            >
              <Select
                placeholder="选择品牌"
                options={brandOptions}
                disabled={!watchedVaccineId || lockPrefilledTaskInfo}
                onChange={(brandName) => {
                  const brand = localVaccineCatalog
                    .find((item) => item.vaccineId === watchedVaccineId)
                    ?.brands.find((item) => item.brandNameCn === brandName);
                  const defaultMethod = brand?.administrationRoutes?.[0]
                    ? ROUTE_TO_METHOD_LABEL[brand.administrationRoutes[0]] || brand.administrationRoutes[0]
                    : undefined;
                  form.setFieldsValue({
                    vaccinationMethod: defaultMethod
                  });
                }}
              />
            </Form.Item>
            <Form.Item
              name="vaccinationMethod"
              label="接种方式"
              rules={[{ required: true, message: "请选择接种方式" }]}
            >
              <Select
                placeholder={watchedBrand ? "选择接种方式" : "请先选择品牌"}
                options={vaccinationMethodOptions}
                disabled={!watchedBrand || lockPrefilledTaskInfo}
              />
            </Form.Item>
            <Form.Item
              name="dosage"
              label="剂量"
              rules={[{ required: true, message: "请输入剂量" }]}
            >
              <InputNumber min={0.5} step={0.5} style={{ width: "100%" }} disabled={lockPrefilledTaskInfo} />
            </Form.Item>
            <Form.Item
              name="dosageUnit"
              label="剂量单位"
              rules={[{ required: true, message: "请选择单位" }]}
            >
              <Select
                disabled={lockPrefilledTaskInfo}
                options={[
                  { label: "毫克", value: "毫克" },
                  { label: "毫升", value: "毫升" }
                ]}
              />
            </Form.Item>
            <Form.Item
              name="date"
              label="接种日期"
              rules={[{ required: true, message: "请选择接种日期" }]}
            >
              <DatePicker style={{ width: "100%" }} />
            </Form.Item>
          </div>

          {!lockPrefilledTaskInfo ? <PlanEffectTrackingSection form={form} /> : null}
        </Form>
        <div className="form-actions">
          <Button onClick={onBack}>取消</Button>
          <Button
            type="primary"
            onClick={async () => {
              const values = await form.validateFields();
              const vaccine = localVaccines.find((v) => v.id === values.vaccineId);
              onNext?.({
                vaccineId: values.vaccineId,
                dosage: values.dosage,
                dosageUnit: values.dosageUnit,
                date: values.date?.format("YYYY-MM-DD"),
                vaccineName: vaccine?.name || "",
                brand: values.brand,
                vaccinationMethod: values.vaccinationMethod,
                effectTracking: buildEffectTrackingPayload(values)
              });
            }}
          >
            下一步
          </Button>
        </div>
      </Card>
      <Modal
        title="添加药品"
        open={createDrugOpen}
        onCancel={() => {
          setCreateDrugOpen(false);
          createDrugForm.resetFields();
        }}
        onOk={createVaccineDrug}
        okText="添加"
        cancelText="取消"
        width={560}
        destroyOnClose
        className="compact-modal"
      >
        <Form form={createDrugForm} layout="vertical">
          <Form.Item
            name="productNameCn"
            label="产品名称(中文)"
            rules={[{ required: true, message: "请输入产品中文名称" }]}
          >
            <Input placeholder="如：非瘟灭活疫苗、蓝耳二联疫苗、圆环病毒疫苗" />
          </Form.Item>
          <Form.Item
            name="productNameEn"
            label="产品名称(英文)"
            rules={[{ required: true, message: "请输入产品英文名称" }]}
          >
            <Input placeholder="如：ASF Inactivated Vaccine、PRRS Vaccine、PCV2 Vaccine" />
          </Form.Item>
          <Form.Item label="药品类型">
            <Input value="疫苗" disabled />
          </Form.Item>
          <Form.Item
            name="brandNameCn"
            label="品牌名称(中文)"
            rules={[{ required: true, message: "请输入中文品牌名" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="brandNameEn"
            label="品牌名称(英文)"
            rules={[{ required: true, message: "请输入英文品牌名" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="dosageForm" label="剂型" rules={[{ required: true, message: "请选择剂型" }]}>
            <Select options={vaccineDosageFormOptions} />
          </Form.Item>
          <Form.Item name="standardDosage" label="单次剂量">
            <Input placeholder="如 2 ml/头" />
          </Form.Item>
          <Form.Item name="durationOfImmunity" label="免疫有效期">
            <Input placeholder="如 6 个月" />
          </Form.Item>
          <Form.Item name="withdrawalPeriodDays" label="休药期(天)">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="immuneIntervalDays" label="免疫间隔期(天)">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            name="administrationRoutes"
            label="接种方式"
            rules={[{ required: true, message: "请选择接种方式" }]}
          >
            <Select mode="multiple" placeholder="可多选" options={vaccineRouteOptions} />
          </Form.Item>
          <Form.Item name="vaccineType" label="疫苗类型">
            <Select options={[...vaccineTypeOptions]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
