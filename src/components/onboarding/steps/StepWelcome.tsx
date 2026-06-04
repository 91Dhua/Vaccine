import './StepCommon.css'
import './StepWelcome.css'
import OnboardingCard from './OnboardingCard'

interface StepWelcomeProps {
  onGoToStep: (stepId: string) => void
  stepCompleted: (stepId: string) => boolean
  steps: Array<{ id: string; title: string }>
}

/**
 * 欢迎页：建立心理预期，说明只需几分钟
 * 重构为垂直列表布局，支持状态流转
 */
function StepWelcome({ onGoToStep, stepCompleted }: StepWelcomeProps) {
  // 获取实际的完成状态
  const step1Completed = stepCompleted('zone-config')
  const isStructureCompleted = step1Completed
  const step2Enabled = step1Completed
  const step3Enabled = step1Completed
  const step4Enabled = step1Completed

  const stepConfigs = [
    {
      id: 'zone-config',
      icon: 'building' as const,
      title: '还原猪场结构',
      desc: '像搭积木一样，快速复刻您的栋舍分布。',
      badge: 'required' as const,
      enabled: true,
      completed: step1Completed,
    },
    {
      id: 'production-line',
      icon: 'line-chart' as const,
      title: '定制生产计划',
      desc: '设置批次与节律，让生产流转井井有条。',
      badge: 'recommended' as const,
      enabled: step2Enabled,
      completed: stepCompleted('production-line'),
    },
    {
      id: 'add-pigs',
      icon: 'piggy-bank' as const,
      title: '猪只档案上云',
      desc: '批量导入或扫码，建立每一头猪的数字身份证。',
      badge: 'recommended' as const,
      enabled: step3Enabled,
      completed: stepCompleted('add-pigs'),
    },
    {
      id: 'invite-members',
      icon: 'users' as const,
      title: '邀请同事协作',
      desc: '全员数据同步，告别纸笔记录的繁琐。',
      badge: null,
      enabled: step4Enabled,
      completed: stepCompleted('invite-members'),
    },
  ]

  const handleCardClick = (stepId: string, enabled: boolean) => {
    if (!enabled) return
    onGoToStep(stepId)
  }

  const handleSkip = () => {
    // 跳过其他步骤，直接进入系统
    // 这里可以导航到主页面
    console.log('跳过其他步骤，直接进入 Sentri')
  }

  return (
    <div className="step-content step-welcome-content welcome-fullscreen">
      <div className="welcome-container-new">
        <div className="welcome-header">
        <div className="welcome-icon">
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
              <circle cx="40" cy="40" r="40" fill="url(#welcome-gradient)" />
              <path
                d="M25 40L35 50L55 30"
                stroke="white"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            <defs>
              <linearGradient id="welcome-gradient" x1="0" y1="0" x2="80" y2="80">
                  <stop offset="0%" stopColor="#646cff" />
                  <stop offset="100%" stopColor="#535bf2" />
              </linearGradient>
            </defs>
          </svg>
          </div>
          <h1 className="welcome-title">欢迎来到SENTRI-您的"云端猪场"</h1>
          <p className="welcome-subtitle">3分钟，搭建您的智慧养殖中台</p>
        </div>
        
        {/* 垂直列表布局 */}
        <div className="welcome-features-vertical">
          {stepConfigs.map((config) => (
            <OnboardingCard
              key={config.id}
              id={config.id}
              icon={config.icon}
              title={config.title}
              desc={config.desc}
              badge={config.completed ? null : config.badge}
              isCompleted={config.completed}
              isDisabled={!config.enabled}
              onClick={() => handleCardClick(config.id, config.enabled)}
            />
          ))}
        </div>

        {/* 提示文案 */}
        <div className="welcome-hint-text">
          点击卡片可随时调整已配置的内容
        </div>

        {/* 跳过按钮 - 仅在 State B 显示 */}
        {isStructureCompleted && (
          <div className="welcome-skip-section">
            <button className="welcome-skip-btn" onClick={handleSkip}>
              稍后完成其他步骤，直接进入 Sentri →
        </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default StepWelcome