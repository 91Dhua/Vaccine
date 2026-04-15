import {
  Alert,
  Button,
  Card,
  DatePicker,
  Form,
  InputNumber,
  Select,
  Space,
  Steps,
  Switch,
  Typography
} from "antd";
import dayjs from "dayjs";
import { vaccineCatalog, vaccines } from "../mockData";
import { resolveTaskVaccinePresentation } from "../mobileVaccinationUtils";

const { Title, Text } = Typography;

interface Props {
  step: "form" | "preview";
  selectedPigs: string[];
  payload?: any;
  onBack: () => void;
  onNext?: (payload: any) => void;
  onFinish?: () => void;
}

export function VaccineTaskWizard({
  step,
  selectedPigs,
  payload,
  onBack,
  onNext,
  onFinish
}: Props) {
  const [form] = Form.useForm();
  const multiDose = Form.useWatch("multiDose", form);
  const watchedDate = Form.useWatch("date", form);
  const watchedDosage = Form.useWatch("dosage", form);
  const watchedDosageUnit = Form.useWatch("dosageUnit", form);
  const watchedVaccineId = Form.useWatch("vaccineId", form);
  const watchedTimes = Form.useWatch("times", form);
  const watchedIntervalValue = Form.useWatch("intervalValue", form);
  const watchedIntervalUnit = Form.useWatch("intervalUnit", form);
  const watchedBrand = Form.useWatch("brand", form);

  const brandOptions =
    vaccineCatalog
      .find((item) => item.vaccineId === watchedVaccineId)
      ?.brands.map((brand) => ({
        label: brand.brandNameCn,
        value: brand.brandNameCn
      })) || [];

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
              创建接种任务
            </Title>
            <Text type="secondary">预览任务明细并确认提交</Text>
          </div>
        </div>

      <Steps
        current={2}
        items={[{ title: "选择猪只" }, { title: "选择疫苗" }, { title: "确认接种" }]}
      />

        <Card className="section-card" style={{ marginTop: 16 }}>
          <div className="confirm-card">
            <div className="confirm-title">选择治疗猪只</div>
            <div className="confirm-row">
              <div className="confirm-left">
                <div className="confirm-dot">✓</div>
                <div>
                  <div className="confirm-main">确认猪只</div>
                  <div className="confirm-sub">
                    检查已选择猪只列表，可添加或删除需要进行接种的猪只。
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
                <Text type="secondary">接种途径</Text>
                <div className="preview-value">{pres.administrationRoute ?? "—"}</div>
              </div>
              <div>
                <Text type="secondary">剂量</Text>
                <div className="preview-value">
                  {payload?.dosage} {payload?.dosageUnit || "毫克"}
                </div>
              </div>
              <div>
                <Text type="secondary">剂次</Text>
                <div className="preview-value">{payload?.times || 1} 次</div>
              </div>
              <div>
                <Text type="secondary">间隔</Text>
                <div className="preview-value">
                  {payload?.multiDose
                    ? `${payload?.intervalValue ?? "—"} ${payload?.intervalUnit ?? ""}`.trim()
                    : "—"}
                </div>
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
            创建接种任务
          </Title>
          <Text type="secondary">填写接种信息并生成任务</Text>
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
          initialValues={{ date: dayjs("2026-02-09"), dosage: 2, dosageUnit: "毫克", times: 1 }}
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
                onChange={() => {
                  form.setFieldsValue({ brand: undefined });
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
                disabled={!watchedVaccineId}
              />
            </Form.Item>
            <Form.Item
              name="dosage"
              label="剂量"
              rules={[{ required: true, message: "请输入剂量" }]}
            >
              <InputNumber min={0.5} step={0.5} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item
              name="dosageUnit"
              label="剂量单位"
              rules={[{ required: true, message: "请选择单位" }]}
            >
              <Select
                options={[
                  { label: "毫克", value: "毫克" },
                  { label: "毫升", value: "毫升" }
                ]}
              />
            </Form.Item>
            <Form.Item name="date" label="接种日期">
              <DatePicker style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="times" label="剂次">
              <InputNumber min={1} addonAfter="次" style={{ width: "100%" }} />
            </Form.Item>
          </div>
          <Form.Item label="多次接种" name="multiDose" valuePropName="checked">
            <Switch />
          </Form.Item>
          {multiDose && (
            <div className="form-grid">
              <Form.Item
                name="intervalValue"
                label="间隔时间"
                rules={[{ required: true, message: "请输入间隔时间" }]}
              >
                <InputNumber min={1} style={{ width: "100%" }} />
              </Form.Item>
              <Form.Item
                name="intervalUnit"
                label="间隔时间单位"
                rules={[{ required: true, message: "请选择单位" }]}
              >
                <Select
                  options={[
                    { label: "小时", value: "小时" },
                    { label: "天", value: "天" }
                  ]}
                />
              </Form.Item>
            </div>
          )}
          <Alert
            type="info"
            showIcon
            message={`系统将从 ${watchedDate?.format("YYYY-MM-DD") || "2026-02-09"} 起，给选中猪只下发${watchedDosage || 2}${watchedDosageUnit || "毫克"}的${
              vaccines.find((v) => v.id === watchedVaccineId)?.name || "疫苗"
            }${watchedBrand ? `（${watchedBrand}）` : ""}接种任务，任务共执行${watchedTimes || 1}次${
              multiDose
                ? `，每${watchedIntervalValue || 2}${watchedIntervalUnit || "小时"}一次`
                : ""
            }。`}
            style={{ marginTop: 12 }}
          />
        </Form>
        <div className="form-actions">
          <Button onClick={onBack}>取消</Button>
          <Button
            type="primary"
            onClick={async () => {
              const values = await form.validateFields();
              const vaccine = vaccines.find((v) => v.id === values.vaccineId);
              onNext?.({
                ...values,
                date: values.date?.format("YYYY-MM-DD"),
                vaccineName: vaccine?.name || "",
                brand: values.brand
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
