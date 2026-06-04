import type { OnboardingStep } from './OnboardingFlow'
import './StepIndicator.css'

interface StepIndicatorProps {
  steps: OnboardingStep[]
  currentIndex: number
  skippedSteps: Set<number>
}

/**
 * 步骤指示器组件
 * 显示所有步骤的进度状态
 */
function StepIndicator({ steps, currentIndex, skippedSteps }: StepIndicatorProps) {
  return (
    <div className="step-indicator">
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex
        const isCurrent = index === currentIndex
        const isSkipped = skippedSteps.has(index)
        
        return (
          <div
            key={step.id}
            className={`step-item ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''} ${isSkipped ? 'skipped' : ''}`}
          >
            <div className="step-number">
              {isSkipped ? (
                <span className="skip-icon">—</span>
              ) : isCompleted ? (
                <span className="check-icon">✓</span>
              ) : (
                <span>{index + 1}</span>
              )}
            </div>
            <div className="step-info">
              <div className="step-title">{step.title}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default StepIndicator
