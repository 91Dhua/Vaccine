import { Alert, Button, Input, Modal, Tag, Typography } from "antd";
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined
} from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";

const { Title, Text } = Typography;

type RegisterStep = "invite" | "password" | "profile" | "success" | "entry-application";

const INVITED_CONTACT = "13812341234";
const DEMO_CODE = "246810";
function maskContact(contact: string) {
  if (contact.includes("@")) {
    const [name, domain] = contact.split("@");
    return `${name.slice(0, 2)}****@${domain}`;
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
  const [verifiedContact, setVerifiedContact] = useState(INVITED_CONTACT);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [identityNumber, setIdentityNumber] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [contactAdminOpen, setContactAdminOpen] = useState(false);
  const [codeCountdown, setCodeCountdown] = useState(0);
  const maskedContact = useMemo(() => maskContact(verifiedContact), [verifiedContact]);

  useEffect(() => {
    if (codeCountdown <= 0) return undefined;
    const timer = window.setTimeout(() => {
      setCodeCountdown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [codeCountdown]);

  const backToConsole = () => {
    window.location.hash = "";
  };

  const clearMessage = () => {
    setError("");
    setNotice("");
  };

  const sendCode = () => {
    if (codeCountdown > 0) return;
    clearMessage();
    const normalizedContact = contact.replace(/\s/g, "");
    if (!normalizedContact) {
      setError("请输入手机号或邮箱。");
      return;
    }
    if (!isValidContact(normalizedContact)) {
      setError("邀请链接中的手机号/邮箱不可用，请联系管理员重新发送注册链接。");
      return;
    }
    setVerifiedContact(normalizedContact);
    setCodeSent(true);
    setCodeCountdown(60);
    setNotice(`验证码已发送至 ${maskContact(normalizedContact)}，请注意查收。`);
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
    setStep("password");
  };

  const submitPassword = () => {
    clearMessage();
    if (!password) {
      setError("请输入密码。");
      return;
    }
    if (password.length < 8 || password.length > 32) {
      setError("密码长度需为 8-32 位。");
      return;
    }
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setError("密码需同时包含字母和数字。");
      return;
    }
    if (!confirmPassword) {
      setError("请再次输入密码。");
      return;
    }
    if (password !== confirmPassword) {
      setError("两次输入的密码不一致。");
      return;
    }
    setStep("profile");
  };

  const submitProfile = () => {
    clearMessage();
    const normalizedLastName = lastName.trim();
    const normalizedFirstName = firstName.trim();
    if (!normalizedLastName) {
      setError("请输入姓。");
      return;
    }
    if (!normalizedFirstName) {
      setError("请输入名。");
      return;
    }
    if (`${normalizedLastName}${normalizedFirstName}`.length > 20) {
      setError("姓名不能超过 20 个字符。");
      return;
    }
    if (!identityNumber.trim()) {
      setError("请输入证件号码。");
      return;
    }
    if (!/^[0-9A-Za-z]{6,20}$/.test(identityNumber.trim())) {
      setError("请输入有效的证件号码。");
      return;
    }
    setStep("success");
  };

  const renderStep = () => {
    if (step === "success") {
      return (
        <div className="employee-register-card employee-register-card--center">
          <Button type="link" className="employee-register-back" onClick={() => setStep("profile")}>
            <ArrowLeftOutlined /> 返回
          </Button>
          <div className="employee-register-state-icon">
            <CheckCircleOutlined />
          </div>
          <Title level={2}>已加入华东一场</Title>
          <Text type="secondary">如需入场请填写入场申请表</Text>
          <div className="employee-register-display-fields">
            <div className="employee-register-display-field">
              <label>姓名</label>
              <strong>{`${lastName.trim()}${firstName.trim()}` || "王敏"}</strong>
            </div>
            <div className="employee-register-display-field">
              <label>登录账号</label>
              <strong>{maskedContact}</strong>
            </div>
            <div className="employee-register-display-field">
              <label>厂区</label>
              <strong className="employee-register-farm-value">
                华东一场
                <Tag color="blue">新加入</Tag>
              </strong>
            </div>
          </div>
          <Button type="primary" size="large" block onClick={() => setStep("entry-application")}>
            填写入场申请
          </Button>
        </div>
      );
    }

    if (step === "entry-application") {
      return (
        <div className="employee-register-card">
          <Button type="link" className="employee-register-back" onClick={() => setStep("success")}>
            <ArrowLeftOutlined /> 返回
          </Button>
          <Text type="secondary" className="employee-register-card__meta">入场申请</Text>
          <Input size="large" placeholder="到访开始时间" />
          <Input size="large" placeholder="预计离场时间" />
          <Input.TextArea rows={3} placeholder="入场事由" />
          <Button type="primary" size="large" block onClick={backToConsole}>
            提交申请
          </Button>
        </div>
      );
    }

    return (
      <div className="employee-register-card">
        {step !== "invite" ? (
          <Button type="link" className="employee-register-back" onClick={() => {
            clearMessage();
            setStep(step === "profile" ? "password" : "invite");
          }}>
            <ArrowLeftOutlined /> 返回
          </Button>
        ) : null}

        {step === "invite" ? (
          <>
            <div className="employee-register-readonly-field">
              <span>手机号/邮箱</span>
              <strong>{maskContact(contact)}</strong>
            </div>
            <div className="employee-register-readonly-field">
              <span>厂区信息</span>
              <strong>华东一场</strong>
            </div>
            <div className="employee-register-code-input">
              <Input
                size="large"
                inputMode="numeric"
                maxLength={6}
                placeholder="请输入验证码"
                value={code}
                onChange={(event) => {
                  setCode(event.target.value.replace(/\D/g, ""));
                  setError("");
                }}
                onPressEnter={verifyCode}
              />
              <Button disabled={codeCountdown > 0} onClick={sendCode}>
                {codeCountdown > 0 ? `${codeCountdown}s后重新获取` : codeSent ? "重新获取" : "获取验证码"}
              </Button>
            </div>
            {notice ? <Alert type="success" showIcon message={notice} /> : null}
            {error ? <Alert type="error" showIcon message={error} /> : null}
            <Text type="secondary" className="employee-register-helper">演示验证码：{DEMO_CODE}</Text>
            <Button type="primary" size="large" block onClick={verifyCode}>
              登陆 <ArrowRightOutlined />
            </Button>
          </>
        ) : null}

        {step === "password" ? (
          <>
            <Text type="secondary" className="employee-register-card__meta">设置密码</Text>
            <Text type="secondary">后续可使用手机号/邮箱和密码登录账号。</Text>
            <Input.Password
              size="large"
              placeholder="请输入密码"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                clearMessage();
              }}
              onPressEnter={() => {
                const confirmInput = document.querySelector<HTMLInputElement>("[data-employee-confirm-password-input]");
                confirmInput?.focus();
              }}
            />
            <Input.Password
              size="large"
              data-employee-confirm-password-input
              placeholder="请再次输入密码"
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                clearMessage();
              }}
              onPressEnter={submitPassword}
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
            <Button type="primary" size="large" block onClick={submitPassword}>
              下一步 <ArrowRightOutlined />
            </Button>
          </>
        ) : null}

        {step === "profile" ? (
          <>
            <Text type="secondary" className="employee-register-card__meta">个人信息</Text>
            <Text type="secondary">姓名和证件号码会用于当前厂区的员工档案。</Text>
            <Input
              size="large"
              placeholder="姓"
              value={lastName}
              onChange={(event) => {
                setLastName(event.target.value);
                clearMessage();
              }}
            />
            <Input
              size="large"
              placeholder="名"
              value={firstName}
              onChange={(event) => {
                setFirstName(event.target.value);
                clearMessage();
              }}
              onPressEnter={() => {
                const identityInput = document.querySelector<HTMLInputElement>("[data-employee-identity-input]");
                identityInput?.focus();
              }}
            />
            <Input
              size="large"
              data-employee-identity-input
              placeholder="证件号码"
              value={identityNumber}
              onChange={(event) => {
                setIdentityNumber(event.target.value);
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
      <div className="employee-register-device">
        <div className="employee-register-device__bar" />
        <div className="employee-register-screen">
          <header className="employee-register-topbar">
            <div className="employee-register-brand">
              <span className="employee-register-logo">S</span>
              <span>Sentri</span>
            </div>
            <Button type="text" onClick={backToConsole}>
              <ArrowLeftOutlined /> 返回
            </Button>
          </header>

          <section className="employee-register-panel">
            {step !== "success" ? (
              <div className="employee-register-intro">
                <Tag color="blue">员工注册</Tag>
              </div>
            ) : null}
            {renderStep()}
            {step !== "success" ? (
              <Text type="secondary" className="employee-register-footer">
                不是你要加入的厂区？请
                <button
                  type="button"
                  className="employee-register-contact-link"
                  onClick={() => setContactAdminOpen(true)}
                >
                  联系管理员
                </button>
                重新发送注册链接。
              </Text>
            ) : null}
          </section>
        </div>
      </div>
      <Modal
        title="联系管理员"
        open={contactAdminOpen}
        width={360}
        centered
        footer={null}
        onCancel={() => setContactAdminOpen(false)}
      >
        <div className="employee-register-admin-contact">
          <div>
            <span>邮箱</span>
            <strong>admin@sentri.cn</strong>
          </div>
          <div>
            <span>联系电话</span>
            <strong>13812345678</strong>
          </div>
        </div>
      </Modal>
    </main>
  );
}
