import './StepCommon.css'

interface StepCompleteProps {
  onComplete: () => void
}

/**
 * 完成页面
 * 显示初始化完成信息和下一步操作建议
 */
function StepComplete({ onComplete }: StepCompleteProps) {
  return (
    <div className="step-complete">
      <div className="complete-container">
        <div className="complete-icon">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="32" fill="#10B981" />
            <path
              d="M20 32L28 40L44 24"
              stroke="white"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h1>🎉 初始化完成！</h1>
        <p className="complete-description">
          您已经完成了基础配置，现在可以开始使用系统了
        </p>

        <div className="complete-actions">
          <button className="btn btn-large btn-primary" onClick={onComplete}>
            进入 Dashboard
          </button>
        </div>

        <div className="complete-suggestions">
          <h3>接下来您可以：</h3>
          <ul>
            <li>在"猪群管理"中添加更多猪只</li>
            <li>在"人员管理"中添加员工和访客</li>
            <li>在"生产线管理"中创建更多生产线</li>
            <li>在"任务管理"中创建和下发任务</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default StepComplete
