import { Alert, Button, Checkbox, Input, Modal, Typography } from "antd";
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DownOutlined,
  ExclamationCircleOutlined,
  SearchOutlined,
  UpOutlined,
  UserOutlined
} from "@ant-design/icons";
import { type CSSProperties, useEffect, useState } from "react";

const { Text, Title } = Typography;
type LoginStep =
  | "entry"
  | "success"
  | "phone"
  | "login-methods"
  | "code"
  | "password"
  | "farm-select"
  | "pending-farm-select"
  | "mixed-relation"
  | "incomplete-registration"
  | "register-password"
  | "register-profile"
  | "register-success"
  | "no-permission"
  | "token-mismatch"
  | "forgot-password"
  | "reset-password";

const DEMO_CODE = "246810";
const SAVED_TOKEN_ACCOUNT = "138****1234 / chen****@sentri.cn";
const farmOptions = [
  "华东一场",
  "北京示范场",
  "苏北育肥场",
  "华南育肥一场",
  "西南繁育基地",
  "鲁北母猪场",
  "豫东育肥场",
  "皖南示范场",
  "冀中繁育场",
  "川西合作场",
  "苏中保育场",
  "辽南育肥场"
];
const pendingFarmOptions = ["华东二场", "苏北育肥场", "北京示范场"];
const ADMIN_CONTACT = {
  phone: "13812345678",
  email: "admin@sentri.cn"
};
const testScenarios = [
  { value: "valid", label: "有效 token" },
  { value: "none", label: "无token/token已过期" },
  { value: "multi", label: "多厂区 token" },
  { value: "mixedRelation", label: "已注册+待注册" },
  { value: "multiplePending", label: "多个待注册厂区" },
  { value: "incomplete", label: "单个待注册厂区" }
] as const;
type TestScenarioValue = (typeof testScenarios)[number]["value"];
type NewLoginFlowPageProps = {
  onOpenEntryApplication?: () => void;
};

function isValidAccount(value: string) {
  return /^1\d{10}$/.test(value) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isAccountInEmployeeList(value: string) {
  return !value.includes("unknown");
}

export function NewLoginFlowPage({ onOpenEntryApplication }: NewLoginFlowPageProps) {
  const initialToken = window.localStorage.getItem("sentri_console_token");
  const [step, setStep] = useState<LoginStep>(() => {
    if (!initialToken || initialToken === "expired") return "phone";
    if (initialToken === "multi") return "farm-select";
    if (initialToken === "incomplete") return "pending-farm-select";
    if (initialToken === "mismatch") return "token-mismatch";
    return "success";
  });
  const [account, setAccount] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [identityNumber, setIdentityNumber] = useState("");
  const [farmChoices, setFarmChoices] = useState<string[]>(farmOptions);
  const [selectedFarm, setSelectedFarm] = useState(farmOptions[0]);
  const [farmSearch, setFarmSearch] = useState("");
  const [showAllFarms, setShowAllFarms] = useState(false);
  const [selectedPendingFarms, setSelectedPendingFarms] = useState<string[]>([pendingFarmOptions[0]]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [codeCountdown, setCodeCountdown] = useState(0);
  const [farmCountdown, setFarmCountdown] = useState(initialToken === "multi" ? 5 : 0);
  const [autoEnterLastFarm, setAutoEnterLastFarm] = useState(initialToken === "multi");
  const [testPanelOpen, setTestPanelOpen] = useState(false);
  const [testScenarioLabel, setTestScenarioLabel] = useState("");
  const [selectedTestScenario, setSelectedTestScenario] = useState<TestScenarioValue | "">("");
  const [skipRegisterPassword, setSkipRegisterPassword] = useState(false);
  const [savedAccountLabel, setSavedAccountLabel] = useState(SAVED_TOKEN_ACCOUNT);

  useEffect(() => {
    if (codeCountdown <= 0) return undefined;
    const timer = window.setTimeout(() => {
      setCodeCountdown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [codeCountdown]);

  useEffect(() => {
    if (!autoEnterLastFarm || step !== "farm-select") return undefined;
    if (farmCountdown <= 0) {
      enterConsole();
      return undefined;
    }
    const timer = window.setTimeout(() => {
      setFarmCountdown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [autoEnterLastFarm, farmCountdown, step]);

  const clearMessage = () => {
    setError("");
    setNotice("");
  };

  const enterConsole = () => {
    window.location.hash = "";
  };

  const switchAccount = () => {
    window.localStorage.removeItem("sentri_console_token");
    resetLoginForm("phone");
  };

  const continueRegistration = () => {
    setStep("pending-farm-select");
  };

  const resolveLoginResult = (scenario: string | null) => {
    clearMessage();
    if (!scenario || scenario === "expired") {
      setStep("phone");
      return;
    }
    if (scenario === "multi") {
      setAutoEnterLastFarm(window.localStorage.getItem("sentri_console_token") === "multi");
      setFarmCountdown(5);
      setStep("farm-select");
      return;
    }
    if (scenario === "incomplete") {
      setStep("pending-farm-select");
      return;
    }
    if (scenario === "mismatch") {
      setStep("token-mismatch");
      return;
    }
    setStep("success");
  };

  const checkStoredToken = () => {
    resolveLoginResult(window.localStorage.getItem("sentri_console_token"));
  };

  const applyTestScenario = (scenario: TestScenarioValue, label: string) => {
    clearMessage();
    setAccount("");
    setCode("");
    setPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setLastName("");
    setFirstName("");
    setIdentityNumber("");
    setSelectedPendingFarms([pendingFarmOptions[0]]);
    setSkipRegisterPassword(false);
    setFarmChoices(farmOptions);
    setSelectedFarm(farmOptions[0]);
    setFarmSearch("");
    setShowAllFarms(false);
    setAutoEnterLastFarm(false);
    setFarmCountdown(0);
    setCodeSent(false);
    setCodeCountdown(0);
    if (scenario === "none") {
      window.localStorage.removeItem("sentri_console_token");
    } else {
      window.localStorage.setItem("sentri_console_token", scenario);
    }
    setSavedAccountLabel(scenario === "multi" ? "multi****@sentri.cn" : SAVED_TOKEN_ACCOUNT);
    setTestScenarioLabel(label);
    setSelectedTestScenario(scenario);
    if (scenario === "valid") {
      setStep("success");
    } else {
      setStep("phone");
    }
    setTestPanelOpen(false);
  };

  const useTestAccount = (nextAccount: string, nextStep: LoginStep) => {
    clearMessage();
    setAccount(nextAccount);
    setCode("");
    setPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setLastName("");
    setFirstName("");
    setIdentityNumber("");
    setFarmChoices(farmOptions);
    setSelectedFarm(farmOptions[0]);
    setFarmSearch("");
    setShowAllFarms(false);
    setSelectedPendingFarms([pendingFarmOptions[0]]);
    setSkipRegisterPassword(false);
    setAutoEnterLastFarm(false);
    setFarmCountdown(0);
    setCodeSent(false);
    setCodeCountdown(0);
    setSelectedTestScenario("");
    setTestScenarioLabel("");
    setStep(nextStep);
    setTestPanelOpen(false);
  };

  const sendCode = () => {
    if (codeCountdown > 0) return;
    clearMessage();
    if (!isValidAccount(account.trim())) {
      setError("请输入正确的手机号或邮箱。");
      return;
    }
    setCodeSent(true);
    setCodeCountdown(60);
    setNotice("验证码已发送，请注意查收。");
  };

  const sendResetCode = () => {
    if (codeCountdown > 0) return;
    clearMessage();
    const normalizedAccount = account.trim();
    if (!isValidAccount(normalizedAccount)) {
      setError("请输入正确的手机号或邮箱。");
      return;
    }
    if (!isAccountInEmployeeList(normalizedAccount)) {
      setError("该手机号或邮箱未添加到员工列表，请联系管理员确认。");
      return;
    }
    setCodeSent(true);
    setCodeCountdown(60);
    setNotice("验证码已发送，请注意查收。");
  };

  const resetLoginForm = (nextStep: LoginStep) => {
    clearMessage();
    setCode("");
    setPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setCodeSent(false);
    setCodeCountdown(0);
    setStep(nextStep);
  };

  const routeAfterIdentityVerified = (normalizedAccount: string) => {
    setSavedAccountLabel(normalizedAccount);
    if (selectedTestScenario === "multi") {
      setFarmChoices(farmOptions);
      setSelectedFarm(farmOptions[0]);
      setFarmSearch("");
      setShowAllFarms(false);
      setAutoEnterLastFarm(true);
      setFarmCountdown(5);
      setStep("farm-select");
      return;
    }
    if (selectedTestScenario === "mixedRelation") {
      setSkipRegisterPassword(true);
      setStep("mixed-relation");
      return;
    }
    if (selectedTestScenario === "multiplePending") {
      setSelectedPendingFarms([pendingFarmOptions[0], pendingFarmOptions[1]]);
      setStep("pending-farm-select");
      return;
    }
    if (selectedTestScenario === "incomplete") {
      setSelectedPendingFarms([pendingFarmOptions[0]]);
      setStep("pending-farm-select");
      return;
    }
    if (selectedTestScenario === "none") {
      setStep("success");
      return;
    }
    if (normalizedAccount.includes("mixed") || normalizedAccount === "13812340005") {
      setSkipRegisterPassword(true);
      setStep("mixed-relation");
      return;
    }
    if (normalizedAccount === "13812340006") {
      setSelectedPendingFarms([pendingFarmOptions[0], pendingFarmOptions[1]]);
      setStep("pending-farm-select");
      return;
    }
    if (normalizedAccount.includes("new") || normalizedAccount === "13812340003") {
      setStep("pending-farm-select");
      return;
    }
    if (normalizedAccount.includes("unknown") || normalizedAccount === "13812340004") {
      setStep("no-permission");
      return;
    }
    if (normalizedAccount.includes("multi") || normalizedAccount === "13812340002") {
      setFarmChoices(farmOptions);
      setSelectedFarm(farmOptions[0]);
      setFarmSearch("");
      setShowAllFarms(false);
      setAutoEnterLastFarm(false);
      setFarmCountdown(0);
      setStep("farm-select");
      return;
    }
    setStep("success");
  };

  const finishPhoneVerification = () => {
    clearMessage();
    const normalizedAccount = account.trim();
    if (!isValidAccount(normalizedAccount)) {
      setError("请输入正确的手机号。");
      return;
    }
    if (!codeSent) {
      setError("请先获取验证码。");
      return;
    }
    if (code !== DEMO_CODE) {
      setError("验证码不正确，请重新输入。");
      return;
    }
    routeAfterIdentityVerified(normalizedAccount);
  };

  const submitRegisterPassword = () => {
    clearMessage();
    if (selectedPendingFarms.length === 0) {
      setError("请选择要加入的厂区。");
      return;
    }
    if (newPassword.length < 8 || newPassword.length > 32) {
      setError("密码长度需为 8-32 位。");
      return;
    }
    if (!/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      setError("密码需同时包含字母和数字。");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("两次输入的密码不一致。");
      return;
    }
    setStep("register-profile");
  };

  const submitRegisterProfile = () => {
    clearMessage();
    const name = `${lastName.trim()}${firstName.trim()}`;
    if (!lastName.trim()) {
      setError("请输入姓。");
      return;
    }
    if (!firstName.trim()) {
      setError("请输入名。");
      return;
    }
    if (name.length > 20) {
      setError("姓名不能超过 20 个字符。");
      return;
    }
    if (!identityNumber.trim()) {
      setError("请输入证件号码。");
      return;
    }
    setStep("register-success");
  };

  const finishLogin = () => {
    clearMessage();
    const normalizedAccount = account.trim();
    if (!isValidAccount(normalizedAccount)) {
      setError("请输入正确的手机号或邮箱。");
      return;
    }
    if (step === "code") {
      if (!codeSent) {
        setError("请先获取验证码。");
        return;
      }
      if (code !== DEMO_CODE) {
        setError("验证码不正确，请重新输入。");
        return;
      }
    }
    if (step === "password") {
      if (!password) {
        setError("请输入密码。");
        return;
      }
      if (normalizedAccount.includes("unknown")) {
        setError("未找到该账号，请确认手机号或邮箱是否正确。");
        return;
      }
      if (password !== "sentri123") {
        setError("账号或密码不正确，请重新输入。");
        return;
      }
    }
    if (normalizedAccount.includes("multi")) {
      window.localStorage.setItem("sentri_console_token", "multi");
      setSavedAccountLabel(normalizedAccount);
      setFarmChoices(farmOptions);
      setSelectedFarm(farmOptions[0]);
      setFarmSearch("");
      setShowAllFarms(false);
      setAutoEnterLastFarm(false);
      setFarmCountdown(0);
      resolveLoginResult("multi");
      return;
    }
    if (normalizedAccount.includes("new")) {
      setStep("pending-farm-select");
      return;
    }
    if (normalizedAccount.includes("mixed")) {
      setStep("mixed-relation");
      return;
    }
    window.localStorage.setItem("sentri_console_token", "valid");
    setSavedAccountLabel(normalizedAccount);
    resolveLoginResult("valid");
  };

  const finishResetPassword = () => {
    clearMessage();
    if (newPassword.length < 8 || newPassword.length > 32) {
      setError("新密码长度需为 8-32 位。");
      return;
    }
    if (!/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      setError("新密码需同时包含字母和数字。");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("两次输入的新密码不一致。");
      return;
    }
    setPassword("");
    setCode("");
    setNewPassword("");
    setConfirmPassword("");
    setCodeSent(false);
    setCodeCountdown(0);
    if (account.trim().includes("multi")) {
      window.localStorage.setItem("sentri_console_token", "multi");
      setSavedAccountLabel(account.trim());
      resolveLoginResult("multi");
      return;
    }
    window.localStorage.setItem("sentri_console_token", "valid");
    setSavedAccountLabel(account.trim());
    resolveLoginResult("valid");
  };

  const goResetPasswordStep = () => {
    clearMessage();
    if (!codeSent) {
      setError("请先获取验证码。");
      return;
    }
    if (code !== DEMO_CODE) {
      setError("验证码不正确，请重新输入。");
      return;
    }
    setStep("reset-password");
  };

  const renderCardContent = () => {
    if (step === "success") {
      return (
        <>
          <ResultIcon tone="success" />
          <Title level={2}>继续使用 Sentri</Title>
          <Text type="secondary" className="new-login-copy">
            已识别到本机保存的登录状态，请确认当前账号。
          </Text>
          <div className="new-login-account-pill" aria-label="当前登录账号">
            <UserOutlined />
            <span>{savedAccountLabel}</span>
          </div>
          <Button type="primary" size="large" block className="new-login-submit" onClick={enterConsole}>
            继续登陆
          </Button>
          <Button size="large" block className="new-login-secondary-action" onClick={switchAccount}>
            不是你？换个账号登录
          </Button>
        </>
      );
    }

    if (step === "farm-select") {
      const normalizedFarmSearch = showAllFarms ? farmSearch.trim() : "";
      const frequentFarms = farmChoices.slice(0, 3);
      const filteredFarms = farmChoices.filter((farm) => farm.includes(normalizedFarmSearch));
      const isLargeFarmList = farmChoices.length > 10;
      const visibleFarms = normalizedFarmSearch
        ? filteredFarms
        : isLargeFarmList && !showAllFarms
          ? frequentFarms
          : farmChoices;
      const hiddenFarmCount = Math.max(0, farmChoices.length - frequentFarms.length);
      const chooseFarm = (farm: string) => {
        setSelectedFarm(farm);
        if (farm !== farmChoices[0]) {
          setAutoEnterLastFarm(false);
          setFarmCountdown(0);
        }
      };

      return (
        <>
          <ResultIcon tone="success" />
          <Title level={2}>选择厂区</Title>
          <Text type="secondary" className="new-login-copy">
            当前账号可进入多个厂区，请选择本次要进入的厂区。
          </Text>
          <div className="new-login-farm-heading">
            <span>{normalizedFarmSearch ? "搜索结果" : isLargeFarmList && !showAllFarms ? "推荐厂区" : "全部厂区"}</span>
            <em>{farmChoices.length} 个</em>
          </div>
          {showAllFarms ? (
            <Input
              size="large"
              prefix={<SearchOutlined />}
              placeholder="搜索厂区"
              value={farmSearch}
              onChange={(event) => setFarmSearch(event.target.value)}
              allowClear
            />
          ) : null}
          <div className="new-login-farm-list">
            {visibleFarms.map((farm) => (
              <button
                key={farm}
                type="button"
                className={selectedFarm === farm ? "is-active" : ""}
                onClick={() => chooseFarm(farm)}
              >
                <span>
                  {farm}
                  {frequentFarms.includes(farm) ? <em>推荐</em> : null}
                </span>
                {selectedFarm === farm ? <CheckCircleOutlined /> : null}
              </button>
            ))}
            {visibleFarms.length === 0 ? (
              <div className="new-login-farm-empty">未找到匹配厂区</div>
            ) : null}
          </div>
          {!normalizedFarmSearch && isLargeFarmList ? (
            <Button
              size="large"
              className="new-login-farm-more"
              onClick={() => {
                setFarmSearch("");
                setShowAllFarms((current) => !current);
              }}
            >
              {showAllFarms ? (
                <>
                  收起厂区 <UpOutlined />
                </>
              ) : (
                <>
                  更多厂区（{hiddenFarmCount}） <DownOutlined />
                </>
              )}
            </Button>
          ) : null}
          {autoEnterLastFarm ? (
            <div className="new-login-countdown-action">
              <Button
                type="primary"
                size="large"
                block
                className="new-login-submit new-login-submit--countdown"
                style={{ "--login-progress": `${(5 - farmCountdown) * 20}%` } as CSSProperties}
                onClick={enterConsole}
              >
                {farmCountdown}s 后进入上次登录的厂区
              </Button>
            </div>
          ) : (
            <Button type="primary" size="large" block className="new-login-submit" onClick={enterConsole}>
              进入厂区
            </Button>
          )}
        </>
      );
    }

    if (step === "incomplete-registration") {
      return (
        <>
          <ResultIcon tone="warning" />
          <Title level={2}>注册未完成</Title>
          <Text type="secondary" className="new-login-copy">
            当前账号已验证身份，但还未完成员工信息或厂区绑定。
          </Text>
          <div className="new-login-option-list">
            <Button type="primary" size="large" block className="new-login-submit" onClick={continueRegistration}>继续完成注册</Button>
            <Button size="large" block onClick={() => resetLoginForm("login-methods")}>换账号登录</Button>
          </div>
        </>
      );
    }

    if (step === "phone") {
      return (
        <>
          <div className="new-login-card-logo">
            <span className="new-login-logo new-login-logo--large">S</span>
          </div>
          <Title level={2}>验证手机号/邮箱</Title>
          <Text type="secondary" className="new-login-copy">
            输入手机号或邮箱，系统会查询员工与厂区关系。
          </Text>
          <Input
            size="large"
            placeholder="手机号/邮箱"
            value={account}
            onChange={(event) => {
              setAccount(event.target.value.trim());
              setCodeSent(false);
              setCodeCountdown(0);
              clearMessage();
            }}
          />
          <div className="new-login-code-row">
            <Input
              size="large"
              placeholder="验证码"
              value={code}
              maxLength={6}
              onChange={(event) => {
                setCode(event.target.value.replace(/\D/g, ""));
                clearMessage();
              }}
            />
            <Button disabled={codeCountdown > 0} onClick={sendCode}>
              {codeCountdown > 0 ? `${codeCountdown}s后重试` : codeSent ? "重新获取" : "获取验证码"}
            </Button>
          </div>
          {notice ? <Alert type="success" showIcon message={notice} /> : null}
          {error ? <Alert type="error" showIcon message={error} /> : null}
          <Text type="secondary" className="new-login-helper">演示验证码：{DEMO_CODE}</Text>
          <Button type="primary" size="large" block className="new-login-submit" onClick={finishPhoneVerification}>
            继续
          </Button>
        </>
      );
    }

    if (step === "token-mismatch") {
      return (
        <>
          <ResultIcon tone="warning" />
          <Title level={2}>当前设备已登录</Title>
          <Text type="secondary" className="new-login-copy">
            当前设备保存的登录账号与输入手机号不一致。请进入系统后退出当前账号，再使用新的手机号重新登录。
          </Text>
          <div className="new-login-account-pill">
            <UserOutlined />
            <span>{SAVED_TOKEN_ACCOUNT}</span>
          </div>
          <Button type="primary" size="large" block className="new-login-submit" onClick={enterConsole}>
            进入 Sentri
          </Button>
        </>
      );
    }

    if (step === "mixed-relation") {
      return (
        <>
          <ResultIcon tone="success" />
          <Title level={2}>注册成功</Title>
          <Text type="secondary" className="new-login-copy">
            已有厂区可进入，也可继续注册其他厂区。
          </Text>
          <div className="new-login-farm-list">
            <button type="button" className="is-active" onClick={() => setSelectedFarm(farmOptions[0])}>
              <span>{farmOptions[0]}</span>
              <CheckCircleOutlined />
            </button>
          </div>
          <Button type="primary" size="large" block className="new-login-submit" onClick={enterConsole}>
            进入厂区
          </Button>
          <Button size="large" block className="new-login-secondary-action" onClick={() => {
            setSkipRegisterPassword(true);
            setStep("pending-farm-select");
          }}>
            继续注册其他厂区
          </Button>
        </>
      );
    }

    if (step === "pending-farm-select") {
      return (
        <>
          <BackButton onClick={() => setStep("phone")} />
          <Title level={2}>选择待加入厂区</Title>
          <Text type="secondary" className="new-login-copy">
            该手机号存在待注册员工记录，可选择一个或多个厂区完成绑定。
          </Text>
          <Checkbox.Group
            className="new-login-checkbox-list"
            value={selectedPendingFarms}
            onChange={(values) => setSelectedPendingFarms(values.map(String))}
          >
            {pendingFarmOptions.map((farm) => (
              <Checkbox key={farm} value={farm}>
                {farm}
              </Checkbox>
            ))}
          </Checkbox.Group>
          {error ? <Alert type="error" showIcon message={error} /> : null}
          <Button type="primary" size="large" block className="new-login-submit" onClick={() => {
            if (selectedPendingFarms.length === 0) {
              setError("请选择要加入的厂区。");
              return;
            }
            clearMessage();
            setStep(skipRegisterPassword ? "register-success" : "register-password");
          }}>
            下一步
          </Button>
        </>
      );
    }

    if (step === "register-password") {
      return (
        <>
          <BackButton onClick={() => setStep("pending-farm-select")} />
          <Title level={2}>设置密码</Title>
          <Text type="secondary" className="new-login-copy">后续可使用手机号和密码登录 Sentri。</Text>
          <Input.Password size="large" placeholder="请输入密码" value={newPassword} onChange={(event) => {
            setNewPassword(event.target.value);
            clearMessage();
          }} />
          <Input.Password size="large" placeholder="请再次输入密码" value={confirmPassword} onChange={(event) => {
            setConfirmPassword(event.target.value);
            clearMessage();
          }} />
          {error ? <Alert type="error" showIcon message={error} /> : null}
          <Button type="primary" size="large" block className="new-login-submit" onClick={submitRegisterPassword}>
            下一步
          </Button>
        </>
      );
    }

    if (step === "register-profile") {
      return (
        <>
          <BackButton onClick={() => setStep("register-password")} />
          <Title level={2}>完善个人信息</Title>
          <Text type="secondary" className="new-login-copy">姓名和证件号码会用于员工档案。</Text>
          <Input size="large" placeholder="姓" value={lastName} onChange={(event) => {
            setLastName(event.target.value);
            clearMessage();
          }} />
          <Input size="large" placeholder="名" value={firstName} onChange={(event) => {
            setFirstName(event.target.value);
            clearMessage();
          }} />
          <Input size="large" placeholder="证件号码" value={identityNumber} onChange={(event) => {
            setIdentityNumber(event.target.value);
            clearMessage();
          }} />
          {error ? <Alert type="error" showIcon message={error} /> : null}
          <Button type="primary" size="large" block className="new-login-submit" onClick={submitRegisterProfile}>
            完成注册
          </Button>
        </>
      );
    }

    if (step === "register-success") {
      return (
        <>
          <ResultIcon tone="success" />
          <Title level={2}>注册完成</Title>
          <Text type="secondary" className="new-login-copy">
            已完成账号与厂区员工关系绑定，默认在场状态为场外/休假。
          </Text>
          <div className="new-login-summary-list">
            <div><span>姓名</span><strong>{`${lastName}${firstName}` || "王敏"}</strong></div>
            <div><span>手机号</span><strong>{account || "13812341234"}</strong></div>
            <div><span>已绑定厂区</span><strong>{selectedPendingFarms.join("、")}</strong></div>
          </div>
          <Button type="primary" size="large" block className="new-login-submit" onClick={() => {
            if (selectedPendingFarms.length > 1) {
              setFarmChoices(selectedPendingFarms);
              setSelectedFarm(selectedPendingFarms[0]);
              setFarmSearch("");
              setShowAllFarms(false);
              setAutoEnterLastFarm(false);
              setFarmCountdown(0);
              setStep("farm-select");
              return;
            }
            enterConsole();
          }}>
            完成注册，进入 Sentri
          </Button>
          <Button size="large" block className="new-login-secondary-action" onClick={onOpenEntryApplication}>
            填写入场申请
          </Button>
        </>
      );
    }

    if (step === "no-permission") {
      return (
        <>
          <ResultIcon tone="error" />
          <Title level={2}>暂无员工权限</Title>
          <Text type="secondary" className="new-login-copy">
            当前手机号暂无员工权限，请联系管理员添加员工。
          </Text>
          <div className="new-login-summary-list">
            <div><span>管理员电话</span><strong>{ADMIN_CONTACT.phone}</strong></div>
            <div><span>管理员邮箱</span><strong>{ADMIN_CONTACT.email}</strong></div>
          </div>
          <Button type="primary" size="large" block className="new-login-submit" onClick={() => resetLoginForm("phone")}>
            返回
          </Button>
        </>
      );
    }

    if (step === "login-methods") {
      return (
        <>
          <BackButton onClick={() => setStep("entry")} />
          <div className="new-login-main-content">
            <Title level={2}>选择登录方式</Title>
            <Text type="secondary" className="new-login-copy">
              请使用手机号或邮箱完成身份验证。
            </Text>
          </div>
          <div className="new-login-bottom-actions">
            <div className="new-login-option-list">
              <Button size="large" block onClick={() => resetLoginForm("code")}>
                验证码登录
              </Button>
              <Button size="large" block onClick={() => resetLoginForm("password")}>
                密码登录
              </Button>
            </div>
          </div>
        </>
      );
    }

    if (step === "code") {
      return (
        <>
          <BackButton onClick={() => resetLoginForm("login-methods")} />
          <Title level={2}>验证码登录</Title>
          <Text type="secondary" className="new-login-copy">输入手机号或邮箱，获取验证码后完成登录。</Text>
          <Input size="large" placeholder="手机号/邮箱" value={account} onChange={(event) => {
            setAccount(event.target.value);
            setCodeSent(false);
            setCodeCountdown(0);
            clearMessage();
          }} />
          <div className="new-login-code-row">
            <Input
              size="large"
              placeholder="验证码"
              value={code}
              maxLength={6}
              onChange={(event) => {
                setCode(event.target.value.replace(/\D/g, ""));
                clearMessage();
              }}
            />
            <Button disabled={codeCountdown > 0} onClick={sendCode}>
              {codeCountdown > 0 ? `${codeCountdown}s后重试` : codeSent ? "重新获取" : "获取验证码"}
            </Button>
          </div>
          {notice ? <Alert type="success" showIcon message={notice} /> : null}
          {error ? <Alert type="error" showIcon message={error} /> : null}
          <Text type="secondary" className="new-login-helper">演示验证码：{DEMO_CODE}</Text>
          <Button type="primary" size="large" block className="new-login-submit" onClick={finishLogin}>
            登录
          </Button>
        </>
      );
    }

    if (step === "password") {
      return (
        <>
          <BackButton onClick={() => resetLoginForm("login-methods")} />
          <Title level={2}>密码登录</Title>
          <Text type="secondary" className="new-login-copy">使用手机号或邮箱，以及已设置的密码登录。</Text>
          <Input size="large" placeholder="手机号/邮箱" value={account} onChange={(event) => {
            setAccount(event.target.value);
            clearMessage();
          }} />
          <Input.Password
            size="large"
            placeholder="密码"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              clearMessage();
            }}
          />
          {error ? <Alert type="error" showIcon message={error} /> : null}
          {notice ? <Alert type="success" showIcon message={notice} /> : null}
          <Text type="secondary" className="new-login-helper">演示密码：sentri123</Text>
          <Button type="link" className="new-login-forgot" onClick={() => resetLoginForm("forgot-password")}>
            忘记密码？
          </Button>
          <Button type="primary" size="large" block className="new-login-submit" onClick={finishLogin}>
            登录
          </Button>
        </>
      );
    }

    if (step === "forgot-password") {
      return (
        <>
          <BackButton onClick={() => resetLoginForm("password")} />
          <Title level={2}>找回密码</Title>
          <Text type="secondary" className="new-login-copy">
            输入已添加到员工列表的手机号或邮箱，获取验证码。
          </Text>
          <Input size="large" placeholder="手机号/邮箱" value={account} onChange={(event) => {
            setAccount(event.target.value);
            setCodeSent(false);
            setCodeCountdown(0);
            clearMessage();
          }} />
          <div className="new-login-code-row">
            <Input
              size="large"
              placeholder="验证码"
              value={code}
              maxLength={6}
              onChange={(event) => {
                setCode(event.target.value.replace(/\D/g, ""));
                clearMessage();
              }}
            />
            <Button disabled={codeCountdown > 0} onClick={sendResetCode}>
              {codeCountdown > 0 ? `${codeCountdown}s后重试` : codeSent ? "重新获取" : "获取验证码"}
            </Button>
          </div>
          {notice ? <Alert type="success" showIcon message={notice} /> : null}
          {error ? <Alert type="error" showIcon message={error} /> : null}
          <Text type="secondary" className="new-login-helper">演示验证码：{DEMO_CODE}</Text>
          <Button type="primary" size="large" block className="new-login-submit" onClick={goResetPasswordStep}>
            下一步
          </Button>
        </>
      );
    }

    if (step === "reset-password") {
      return (
        <>
          <BackButton onClick={() => setStep("forgot-password")} />
          <Title level={2}>设置新密码</Title>
          <Text type="secondary" className="new-login-copy">
            请设置一个新的登录密码。
          </Text>
          <Input.Password
            size="large"
            placeholder="新密码"
            value={newPassword}
            onChange={(event) => {
              setNewPassword(event.target.value);
              clearMessage();
            }}
          />
          <Input.Password
            size="large"
            placeholder="确认新密码"
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              clearMessage();
            }}
          />
          {error ? <Alert type="error" showIcon message={error} /> : null}
          <Button type="primary" size="large" block className="new-login-submit" onClick={finishResetPassword}>
            重置密码
          </Button>
        </>
      );
    }

    return (
      <>
        <div className="new-login-card-logo">
          <span className="new-login-logo new-login-logo--large">S</span>
        </div>
        <Title level={2}>欢迎使用 Sentri</Title>
        <Text className="new-login-subtitle">智能集成，养殖生产一体化管理系统</Text>
        <Text type="secondary" className="new-login-copy">
          系统将优先识别本机登录状态，无法识别时可使用其他方式登录。
        </Text>
        <Button type="primary" size="large" block className="new-login-submit" onClick={checkStoredToken}>
          继续登录
        </Button>
        <Text type="secondary" className="new-login-footnote">
          将优先使用本机已保存的登录状态。
        </Text>
        {testScenarioLabel ? (
          <Text type="secondary" className="new-login-test-current">
            当前测试场景：{testScenarioLabel}
          </Text>
        ) : null}
      </>
    );
  };

  return (
    <>
      <main className="new-login-page">
        <div className="new-login-brand" aria-label="Sentri">
          <span className="new-login-logo">S</span>
        </div>
        <div className="new-login-language" aria-label="当前语言">
          <span>🇨🇳</span>
        </div>

        <section className="new-login-card" aria-label="Sentri 登录">
          {renderCardContent()}
        </section>
        <Button className="new-login-test-trigger" onClick={() => setTestPanelOpen(true)}>
          测试场景
        </Button>
      </main>
      <Modal
        title="测试场景"
        open={testPanelOpen}
        width={460}
        centered
        footer={null}
        onCancel={() => setTestPanelOpen(false)}
      >
        <div className="new-login-test-panel">
          <Text type="secondary">选择测试场景后统一从手机号/邮箱验证开始，验证码通过后进入对应员工关系分支。</Text>
          <div className="new-login-test-section">
            <strong>流程场景</strong>
            <div className="new-login-test-grid">
              {testScenarios.map((scenario) => (
                <Button
                  key={scenario.value}
                  className={testScenarioLabel === scenario.label ? "is-active" : ""}
                  onClick={() => applyTestScenario(scenario.value, scenario.label)}
                >
                  {testScenarioLabel === scenario.label ? `已选择：${scenario.label}` : scenario.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="new-login-test-section">
            <strong>测试账号</strong>
            <div className="new-login-test-list">
              <button type="button" onClick={() => useTestAccount("13812340001", "phone")}>
                <span>13812340001</span>
                <em>正常登录</em>
              </button>
              <button type="button" onClick={() => useTestAccount("13812340002", "phone")}>
                <span>13812340002</span>
                <em>多厂区</em>
              </button>
              <button type="button" onClick={() => useTestAccount("13812340003", "phone")}>
                <span>13812340003</span>
                <em>单个待注册厂区</em>
              </button>
              <button type="button" onClick={() => useTestAccount("13812340004", "phone")}>
                <span>13812340004</span>
                <em>账号不存在</em>
              </button>
              <button type="button" onClick={() => useTestAccount("13812340005", "phone")}>
                <span>13812340005</span>
                <em>已注册+待注册</em>
              </button>
              <button type="button" onClick={() => useTestAccount("13812340006", "phone")}>
                <span>13812340006</span>
                <em>多个待注册厂区</em>
              </button>
            </div>
            <Text type="secondary" className="new-login-test-hint">
              演示密码：sentri123；演示验证码：{DEMO_CODE}
            </Text>
          </div>
        </div>
      </Modal>
    </>
  );
}

function ResultIcon({ tone }: { tone: "success" | "error" | "warning" }) {
  return (
    <div className={`new-login-result-icon is-${tone}`}>
      {tone === "success" ? <CheckCircleOutlined /> : tone === "error" ? <CloseCircleOutlined /> : <ExclamationCircleOutlined />}
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <Button type="link" className="new-login-back" onClick={onClick}>
      <ArrowLeftOutlined /> 返回
    </Button>
  );
}
