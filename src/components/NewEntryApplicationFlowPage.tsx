import {
  CheckCircleOutlined,
  LinkOutlined,
  MobileOutlined,
  UserSwitchOutlined
} from "@ant-design/icons";
import { Card, Tag, Typography } from "antd";
import "./NewEntryApplicationFlowPage.css";

const { Title, Text } = Typography;

const flowSteps = [
  {
    icon: <LinkOutlined />,
    title: "发送入场申请链接",
    description: "Console 管理员向访客发送厂区长期复用的入场申请链接。"
  },
  {
    icon: <UserSwitchOutlined />,
    title: "访客填写申请信息",
    description: "访客提交姓名、手机号、邮箱、预计到访时间与预计离场时间。"
  },
  {
    icon: <CheckCircleOutlined />,
    title: "Console 审核申请",
    description: "管理员在入场申请列表中确认申请信息，审核通过后访客才可进入采样流程。"
  },
  {
    icon: <MobileOutlined />,
    title: "扫码完成入场采样",
    description: "访客扫描带有厂区与采样点信息的二维码，确认身份后执行采样流程。"
  }
];

export function NewEntryApplicationFlowPage() {
  return (
    <main className="entry-flow-page">
      <section className="entry-flow-header">
        <div>
          <Tag color="blue">设置</Tag>
          <Title level={1}>新入场申请流程</Title>
          <Text type="secondary">
            管理访客入场申请、审核与入场采样前的身份确认流程。
          </Text>
        </div>
      </section>

      <section className="entry-flow-grid">
        {flowSteps.map((step, index) => (
          <Card key={step.title} className="entry-flow-card" bordered={false}>
            <div className="entry-flow-step-index">{index + 1}</div>
            <div className="entry-flow-step-icon">{step.icon}</div>
            <Title level={4}>{step.title}</Title>
            <Text type="secondary">{step.description}</Text>
          </Card>
        ))}
      </section>
    </main>
  );
}
