import { Alert, Button, Input, Tag, Typography } from "antd";
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  SafetyCertificateOutlined
} from "@ant-design/icons";
import { useMemo, useState } from "react";

const { Title, Text } = Typography;

type RegisterStep = "invite" | "identity" | "profile" | "success" | "farm-select" | "invalid" | "mismatch";

const INVITED_CONTACT = "13812341234";
const DEMO_CODE = "246810";

const farms = [
  { name: "华东一场", location: "浙江嘉兴", role: "生产主管", status: "刚刚加入" },
  { name: "华南二场", location: "广东清远", role: "区域管理者", status: "已加入" },
  { name: "西南育肥场", location: "四川眉山", role: "场区负责人", status: "已加入" }
];

function maskContact(contact: string) {
  if (contact.includes("@")) {
    const [name, domain] = contact.split("@");
    return `${name.slice(0, 2)}***@${domain}`;
  }
  return `${contact.slice(0, 3)}****${contact.slice(-4)}`;
}

function isValidContact(value: string) {
  return /^1\d{10}$/.test(value) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function EmployeeLoginFlowPage() {
  const [step, setStep] = useState<RegisterStep>("invite");
  const [contact, setContact] = useState(INVITED_CONTACT);
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const maskedContact = useMemo(() => maskContact(INVITED_CONTACT), []);

  const backToConsole = () => {
    window.location.hash = "";
  };

  const clearMessage = () => {
    setError("");
    setNotice("");
  };

  const sendCode = () => {
    clearMessage();
    const normalizedContact = contact.trim();
    if (!normalizedContact) {
      setError("请输入手机号或邮箱。");
      return;
    }
    if (!isValidContact(normalizedContact)) {
      setError("请输入有效的手机号或邮箱。");
      return;
    }
    if (normalizedContact !== INVITED_CONTACT) {
      setError("该手机号/邮箱不在当前厂区的邀请名单中，请确认后重试。");
      return;
    }
    setCodeSent(true);
    setNotice(`验证码已发送至 ${maskedContact}。`);
  };

  const verifyCode = () => {
    clearMessage();
    if (!code.trim()) {
      setError("请输入验证码。");
      return;
    }
    if (!/^\d{6}$/.test(code.trim())) {
      setError("验证码应为 6 位。");
      return;
    }
    if (code.trim() !== DEMO_CODE) {
      setError("验证码不正确，请重新输入。");
      return;
    }
    setStep("profile");
  };

  const submitProfile = () => {
    clearMessage();
    const normalizedName = name.trim();
    if (!normalizedName) {
      setError("请输入姓名。");
      return;
    }
    if (normalizedName.length > 20) {
      setError("姓名不能超过 20 个字符。");
      return;
    }
    setStep("success");
  };

  const renderStep = () => {
    if (step === "invalid") {
      return (
        <div className="employee-register-card employee-register-card--center">
          <div className="employee-register-state-icon employee-register-state-icon--error">
            <ExclamationCircleOutlined />
          </div>
          <Title level={2}>邀请链接不可用</Title>
          <Text type="secondary">邀请链接无效或已过期，请联系管理员重新发送注册链接。</Text>
          <Button type="primary" size="large" block onClick={() => setStep("invite")}>
            返回
          </Button>
        </div>
      );
    }

    if (step === "mismatch") {
      return (
        <div className="employee-register-card employee-register-card--center">
          <div className="employee-register-state-icon employee-register-state-icon--warn">
            <ExclamationCircleOutlined />
          </div>
          <Title level={2}>当前账号与邀请不一致</Title>
          <Text type="secondary">该邀请发送给 {maskedContact}。请切换账号后继续。</Text>
          <Button type="primary" size="large" block onClick={() => setStep("identity")}>
            切换账号
          </Button>
          <Button type="link" block onClick={() => setStep("invite")}>
            返回邀请页
          </Button>
        </div>
      );
    }

    if (step === "success") {
      return (
        <div className="employee-register-card employee-register-card--center">
          <div className="employee-register-state-icon">
            <CheckCircleOutlined />
          </div>
          <Title level={2}>已加入华东一场</Title>
          <Text type="secondary">你的账号已和该厂区绑定。当前在场状态默认为场外，入场后再更新现场状态。</Text>
          <div className="employee-register-summary">
            <div>
              <span>姓名</span>
              <strong>{name.trim() || "王敏"}</strong>
            </div>
            <div>
              <span>登录账号</span>
              <strong>{maskedContact}</strong>
            </div>
            <div>
              <span>厂区</span>
              <strong>华东一场</strong>
            </div>
          </div>
          <Button type="primary" size="large" block>
            进入厂区
          </Button>
          <Button type="link" block onClick={() => setStep("farm-select")}>
            选择其他厂区
          </Button>
        </div>
      );
    }

    if (step === "farm-select") {
      return (
        <div className="employee-register-card">
          <Button type="link" className="employee-register-back" onClick={() => setStep("success")}>
            <ArrowLeftOutlined /> 返回
          </Button>
          <Title level={2}>选择厂区</Title>
          <Text type="secondary">你的账号可以访问多个厂区，选择本次要进入的工作环境。</Text>
          <div className="employee-register-farm-list">
            {farms.map((farm) => (
              <button key={farm.name} type="button" className="employee-register-farm">
                <span>
                  <strong>{farm.name}</strong>
                  <Text type="secondary">{farm.location} · {farm.role}</Text>
                </span>
                <Tag color={farm.status === "刚刚加入" ? "blue" : "default"}>{farm.status}</Tag>
              </button>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="employee-register-card">
        {step !== "invite" ? (
          <Button type="link" className="employee-register-back" onClick={() => {
            clearMessage();
            setStep("invite");
          }}>
            <ArrowLeftOutlined /> 返回
          </Button>
        ) : null}

        {step === "invite" ? (
          <>
            <Text type="secondary" className="employee-register-card__meta">员工邀请</Text>
            <Title level={2}>加入华东一场</Title>
            <Text type="secondary">管理员邀请你加入 Sentri，完成验证后即可进入该厂区的工作台。</Text>
            <div className="employee-register-summary">
              <div>
                <span>厂区</span>
                <strong>华东一场</strong>
              </div>
              <div>
                <span>邀请账号</span>
                <strong>{maskedContact}</strong>
              </div>
            </div>
            <Text type="secondary" className="employee-register-helper">注册链接 7 天内有效。</Text>
            <Button type="primary" size="large" block onClick={() => setStep("identity")}>
              接受邀请 <ArrowRightOutlined />
            </Button>
            <Button type="link" block onClick={() => setStep("invalid")}>
              链接无法使用
            </Button>
          </>
        ) : null}

        {step === "identity" ? (
          <>
            <Text type="secondary" className="employee-register-card__meta">身份验证</Text>
            <Title level={2}>验证你的身份</Title>
            <Text type="secondary">请输入管理员邀请时填写的手机号或邮箱，通过后再输入验证码。</Text>
            <Input
              size="large"
              placeholder="手机号或邮箱"
              value={contact}
              onChange={(event) => {
                setContact(event.target.value);
                setCodeSent(false);
                setCode("");
                clearMessage();
              }}
              onPressEnter={sendCode}
            />
            <Button className="employee-register-secondary-action" block onClick={sendCode}>
              {codeSent ? "重新发送验证码" : "发送验证码"}
            </Button>
            {notice ? <Alert type="success" showIcon message={notice} /> : null}
            {codeSent ? (
              <>
                <Input
                  size="large"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="6 位验证码"
                  value={code}
                  onChange={(event) => {
                    setCode(event.target.value.replace(/\D/g, ""));
                    setError("");
                  }}
                  onPressEnter={verifyCode}
                />
                <Text type="secondary" className="employee-register-helper">演示验证码：{DEMO_CODE}</Text>
              </>
            ) : null}
            {error ? <Alert type="error" showIcon message={error} /> : null}
            <Button type="primary" size="large" block disabled={!codeSent} onClick={verifyCode}>
              验证并继续
            </Button>
            <Button type="link" block onClick={() => setStep("mismatch")}>
              当前设备已登录其他账号
            </Button>
          </>
        ) : null}

        {step === "profile" ? (
          <>
            <Text type="secondary" className="employee-register-card__meta">个人信息</Text>
            <Title level={2}>完善个人信息</Title>
            <Text type="secondary">姓名会展示在当前厂区的员工列表中。</Text>
            <Input
              size="large"
              placeholder="姓名"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                clearMessage();
              }}
              onPressEnter={submitProfile}
            />
            {error ? <Alert type="error" showIcon message={error} /> : null}
            <div className="employee-register-summary employee-register-summary--compact">
              <div>
                <span>已验证账号</span>
                <strong>{maskedContact}</strong>
              </div>
              <div>
                <span>即将加入</span>
                <strong>华东一场</strong>
              </div>
            </div>
            <Button type="primary" size="large" block onClick={submitProfile}>
              完成注册
            </Button>
          </>
        ) : null}
      </div>
    );
  };

  return (
    <main className="employee-register-page">
      <header className="employee-register-topbar">
        <div className="employee-register-brand">
          <span className="employee-register-logo">S</span>
          <span>Sentri</span>
        </div>
        <Button type="text" onClick={backToConsole}>
          <ArrowLeftOutlined /> 返回 Console
        </Button>
      </header>

      <section className="employee-register-panel">
        <div className="employee-register-intro">
          <Tag color="blue">员工注册</Tag>
          <Title level={1}>进入华东一场</Title>
          <Text type="secondary">使用管理员邀请的手机号或邮箱完成验证。</Text>
        </div>
        {renderStep()}
        <div className="employee-register-trust">
          <SafetyCertificateOutlined />
          <span>Logto 验证身份，Sentri 绑定厂区</span>
        </div>
        <Text type="secondary" className="employee-register-footer">
          不是你要加入的厂区？请联系管理员重新发送注册链接。
        </Text>
      </section>
    </main>
  );
}
