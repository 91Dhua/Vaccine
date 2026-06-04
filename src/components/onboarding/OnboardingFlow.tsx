import { type ComponentType, useState } from 'react'
import StepWelcome from './steps/StepWelcome'
import StepZoneConfig from './steps/StepZoneConfig'
import StepProductionLine from './steps/StepProductionLine'
import StepAddPigs from './steps/StepAddPigs'
import StepInviteMembers from './steps/StepInviteMembers'
import StepComplete from './steps/StepComplete'
import './OnboardingFlow.css'

/**
 * 初始化流程主组件
 * 参考 Salesforce, HubSpot 等 ToB SaaS 的 Onboarding 设计
 */
export interface OnboardingStep {
  id: string
  title: string
    description: string
    skippable: boolean
  component: ComponentType<{
    onNext: () => void
    onSkip?: () => void
    onBack?: () => void
    data?: any
    setData?: (data: any) => void
  }>
}

const STEPS: OnboardingStep[] = [
  {
    id: 'zone-config',
    title: '厂区布局',
    description: '厂区结构是任务下发的基础。请按照 Zone > Section > Unit > 栏位 的顺序，至少建立一个完整的层级。',
    skippable: false,
    component: StepZoneConfig,
  },
  {
    id: 'production-line',
    title: '添加生产线',
    description: '创建生产线用于管理生产批次和自动任务推送。可以稍后在"生产线管理"中配置。',
    skippable: true,
    component: StepProductionLine,
  },
  {
    id: 'add-pigs',
    title: '添加猪只',
    description: '导入或添加初始猪只数据。支持单个添加或批量导入，也可以稍后添加。',
    skippable: true,
    component: StepAddPigs,
  },
  {
    id: 'invite-members',
    title: '添加员工',
    description: '添加饲养员和管理员，让他们可以通过 Mobile 端接收任务。可以稍后添加。',
    skippable: true,
    component: StepInviteMembers,
  },
]

function OnboardingFlow({ onComplete }: { onComplete?: () => void }) {
  const [showWelcome, setShowWelcome] = useState(true)
  const [currentStepIndex, setCurrentStepIndex] = useState<number | null>(null)
  const [stepData, setStepData] = useState<Record<string, any>>({})
  const [skippedSteps, setSkippedSteps] = useState<Set<number>>(new Set())
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set())

  // 检查步骤是否完成
  const checkStepCompleted = (stepId: string): boolean => {
    // 先检查该步骤是否被跳过，如果跳过了则返回 false（未做状态）
    const stepIndex = STEPS.findIndex(s => s.id === stepId)
    if (stepIndex !== -1 && skippedSteps.has(stepIndex)) {
      return false
    }
    
    if (stepId === 'zone-config') {
      // 检查是否有完整的层级结构：Zone > Section > Unit > 栏位
      const zones = stepData?.['zone-config']?.zones || stepData?.zones || []
      return zones.some((zone: any) =>
        zone.sections?.some((section: any) =>
          section.units?.some((unit: any) =>
            unit.pens && unit.pens.length > 0
          )
        )
      )
    }
    // 其他步骤：检查是否有数据或已标记为完成
    if (completedSteps.has(stepId)) {
      return true
    }
    const stepDataForId = stepData?.[stepId]
    if (stepId === 'production-line') {
      return !!(stepDataForId?.lines && stepDataForId.lines.length > 0)
    }
    if (stepId === 'add-pigs') {
      return !!(stepDataForId && Object.keys(stepDataForId).length > 0)
    }
    if (stepId === 'invite-members') {
      return !!(stepDataForId && Object.keys(stepDataForId).length > 0)
    }
    return false
  }

  // 跳转到指定步骤
  const handleGoToStep = (stepId: string) => {
    const stepIndex = STEPS.findIndex(s => s.id === stepId)
    if (stepIndex !== -1) {
      setCurrentStepIndex(stepIndex)
      setShowWelcome(false)
    }
  }

  // 返回欢迎页面
  const handleBackToWelcome = () => {
    setShowWelcome(true)
    setCurrentStepIndex(null)
  }

  // 标记步骤为已完成
  const handleStepComplete = (stepId: string) => {
    setCompletedSteps(new Set([...completedSteps, stepId]))
    handleBackToWelcome()
  }

  // 如果显示欢迎页，不显示实际步骤
  if (showWelcome) {
    return (
      <div className="onboarding-flow onboarding-flow-welcome">
        <StepWelcome
          onGoToStep={handleGoToStep}
          stepCompleted={checkStepCompleted}
          steps={STEPS}
        />
      </div>
    )
  }

  if (currentStepIndex === null) {
    return null
  }

  const currentStep = STEPS[currentStepIndex]
  const CurrentStepComponent = currentStep.component
  const isComplete = currentStepIndex >= STEPS.length

  const handleNext = () => {
    // 标记当前步骤为已完成
    handleStepComplete(currentStep.id)
  }

  const handleSkip = () => {
    setSkippedSteps(new Set([...skippedSteps, currentStepIndex]))
    handleBackToWelcome()
  }

  const handleComplete = () => {
    onComplete?.()
  }

  const updateStepData = (data: any) => {
    // data 包含当前步骤的所有数据，需要合并到 stepData 中
    const newStepData = {
      ...stepData,
      [currentStep.id]: {
        ...stepData[currentStep.id],
        ...data,
      },
    }
    setStepData(newStepData)
    
    // 如果步骤1完成，自动标记为已完成
    if (currentStep.id === 'zone-config') {
      const zones = data?.zones || newStepData?.['zone-config']?.zones || newStepData?.zones || []
      const isComplete = zones.some((zone: any) =>
        zone.sections?.some((section: any) =>
          section.units?.some((unit: any) =>
            unit.pens && unit.pens.length > 0
          )
        )
      )
      if (isComplete && !completedSteps.has('zone-config')) {
        setCompletedSteps(new Set([...completedSteps, 'zone-config']))
      }
    }
  }

  // 合并所有步骤的数据，供后续步骤使用
  const getAllData = () => {
    return stepData
  }

  if (isComplete) {
    return <StepComplete onComplete={handleComplete} />
  }

  return (
    <div className="onboarding-flow">
      <div className="onboarding-container">
        {/* 内容区域 */}
        <main className="onboarding-content">
          <div className="onboarding-step-content">
            <div className="step-header">
              <h2>{currentStep.title}</h2>
            </div>

            <div className="step-body">
              <CurrentStepComponent
                onNext={handleNext}
                onSkip={currentStep.skippable ? handleSkip : undefined}
                onBack={currentStep.id === 'zone-config' ? handleBackToWelcome : undefined}
                data={getAllData()}
                setData={updateStepData}
              />
            </div>

            {/* 底部操作按钮 - 厂区布局步骤内部有自己的导航，不显示全局按钮 */}
            {/* 可跳过的步骤不显示返回按钮，只显示跳过和完成按钮 */}
            {currentStep.id !== 'zone-config' && (
              <div className="step-footer">
                <div className="step-footer-right">
                  {currentStep.skippable && (
                    <button className="btn btn-link" onClick={handleSkip}>
                      跳过
                    </button>
                  )}
                  <button className="btn btn-primary" onClick={handleNext}>
                    完成
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default OnboardingFlow
