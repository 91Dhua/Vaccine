import {
  BankOutlined,
  CheckCircleOutlined,
  DatabaseOutlined,
  LineChartOutlined,
  TeamOutlined
} from '@ant-design/icons'
import './OnboardingCard.css'

interface OnboardingCardProps {
  id: string
  icon: 'building' | 'line-chart' | 'piggy-bank' | 'users'
  title: string
  desc: string
  badge?: 'required' | 'recommended' | null
  isCompleted?: boolean
  isDisabled?: boolean
  onClick?: () => void
}

const iconMap = {
  'building': BankOutlined,
  'line-chart': LineChartOutlined,
  'piggy-bank': DatabaseOutlined,
  'users': TeamOutlined,
}

function OnboardingCard({
  icon,
  title,
  desc,
  badge,
  isCompleted = false,
  isDisabled = false,
  onClick,
}: OnboardingCardProps) {
  const IconComponent = iconMap[icon]

  return (
    <div
      className={`onboarding-card ${isDisabled ? 'disabled' : ''} ${isCompleted ? 'completed' : ''}`}
      onClick={isDisabled ? undefined : onClick}
    >
      {/* 左侧图标 */}
      <div className="card-icon-wrapper">
        <IconComponent />
      </div>

      {/* 中间文字信息 */}
      <div className="card-content">
        <h3 className="card-title">{title}</h3>
        <p className="card-desc">{desc}</p>
      </div>

      {/* 右侧标签/状态 */}
      <div className="card-badge-wrapper">
        {isCompleted ? (
          <div className="card-badge completed-badge">
            <CheckCircleOutlined />
            <span>已完成</span>
          </div>
        ) : badge === 'required' ? (
          <div className="card-badge required-badge">
            <span>必做</span>
          </div>
        ) : badge === 'recommended' ? (
          <div className="card-badge recommended-badge">
            <span>推荐</span>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default OnboardingCard
