import {
  Button,
  Card,
  DatePicker,
  Form,
  InputNumber,
  Select,
  Steps,
  Typography
} from "antd";
import dayjs from "dayjs";
import { useEffect, useMemo } from "react";
import { vaccineCatalog, vaccines } from "../mockData";
import { resolveTaskVaccinePresentation } from "../mobileVaccinationUtils";

const { Title, Text } = Typography;

export type VaccineTaskDraft = {
  vaccineId: string;
  vaccineName: string;
  brand?: string;
  vaccinationMethod?: string;
  dosage: number;
  dosageUnit: "毫克" | "毫升";
  date?: string;
};

interface Props {
  step: "form" | "preview";
  selectedPigs: string[];
  mode?: "create" | "edit" | "supplement";
  payload?: VaccineTaskDraft | null;
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

export function VaccineTaskWizard({
  step,
  selectedPigs,
  mode = "create",
  payload,
  onBack,
  onNext,
  onFinish
}: Props) {
  const [form] = Form.useForm();
  const isSupplement = mode === "supplement";
  const watchedVaccineId = Form.useWatch("vaccineId", form);
  const watchedBrand = Form.useWatch("brand", form);

  const selectedBrandConfig = useMemo(
    () =>
      vaccineCatalog
        .find((item) => item.vaccineId === watchedVaccineId)
        ?.brands.find((brand) => brand.brandNameCn === watchedBrand),
    [watchedBrand, watchedVaccineId]
  );

  const brandOptions =
    vaccineCatalog
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
      date: payload?.date ? dayjs(payload.date) : dayjs("2026-02-09")
    });
  }, [form, payload, step]);

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
              {mode === "edit" ? "编辑接种任务" : isSupplement ? "创建补充接种任务" : "创建接种任务"}
            </Title>
            <Text type="secondary">
              {mode === "edit"
                ? "预览任务变更并确认保存"
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
                <Text type="secondary">任务编号</Text>
                <div className="preview-value">提交后由系统自动分配（如 VT-…）</div>
              </div>
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
                <Text type="secondary">剂型</Text>
                <div className="preview-value">{pres.dosageForm ?? "—"}</div>
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
              <div>
                <Text type="secondary">剂次</Text>
                <div className="preview-value">1 次</div>
              </div>
            </div>
          </div>
        </Card>

        <div className="form-actions">
          <Button onClick={onBack}>上一步</Button>
          <Button type="primary" onClick={onFinish}>
            完成
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
            {mode === "edit" ? "编辑接种任务" : isSupplement ? "创建补充接种任务" : "创建接种任务"}
          </Title>
          <Text type="secondary">
            {mode === "edit"
              ? "调整接种信息并保存任务"
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
          initialValues={{ date: dayjs("2026-02-09"), dosage: 2, dosageUnit: "毫克" }}
        >
          <div className="form-grid">
            <Form.Item
              name="vaccineId"
              label="疫苗"
              rules={[{ required: true, message: "请选择疫苗" }]}
            >
              <Select
                placeholder="选择疫苗"
                options={vaccines.map((v) => ({
                  value: v.id,
                  label: v.name
                }))}
                disabled={isSupplement}
                onChange={() => {
                  form.setFieldsValue({ brand: undefined, vaccinationMethod: undefined });
                }}
              />
            </Form.Item>
            <Form.Item
              name="brand"
              label="品牌(剂型)"
            >
              <Select
                placeholder="选择品牌"
                options={brandOptions}
                disabled={!watchedVaccineId || isSupplement}
                onChange={(brandName) => {
                  const brand = vaccineCatalog
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
                disabled={!watchedBrand || isSupplement}
              />
            </Form.Item>
            <Form.Item
              name="dosage"
              label="剂量"
              rules={[{ required: true, message: "请输入剂量" }]}
            >
              <InputNumber min={0.5} step={0.5} style={{ width: "100%" }} disabled={isSupplement} />
            </Form.Item>
            <Form.Item
              name="dosageUnit"
              label="剂量单位"
              rules={[{ required: true, message: "请选择单位" }]}
            >
              <Select
                disabled={isSupplement}
                options={[
                  { label: "毫克", value: "毫克" },
                  { label: "毫升", value: "毫升" }
                ]}
              />
            </Form.Item>
            <Form.Item name="date" label="接种日期">
              <DatePicker style={{ width: "100%" }} />
            </Form.Item>
          </div>
        </Form>
        <div className="form-actions">
          <Button onClick={onBack}>取消</Button>
          <Button
            type="primary"
            onClick={async () => {
              const values = await form.validateFields();
              const vaccine = vaccines.find((v) => v.id === values.vaccineId);
              onNext?.({
                vaccineId: values.vaccineId,
                dosage: values.dosage,
                dosageUnit: values.dosageUnit,
                date: values.date?.format("YYYY-MM-DD"),
                vaccineName: vaccine?.name || "",
                brand: values.brand,
                vaccinationMethod: values.vaccinationMethod
              });
            }}
          >
            下一步
          </Button>
        </div>
      </Card>
    </div>
  );
}
