import { useState } from 'react'
import './StepCommon.css'
import './StepKPI.css'

interface StepKPIProps {
  onNext?: () => void
  onSkip?: () => void
  data?: any
  setData?: (data: any) => void
  hideInfoBox?: boolean // 是否隐藏信息提示框
}

interface KPIItem {
  id: string
  name: string
  description1: string
  description2: string
  inputPlaceholder: string
  inputType: 'percentage' | 'hour' | 'number' | 'weight'
}

interface KPIGroup {
  taskName: string
  kpis: KPIItem[]
}

/**
 * 步骤 4：设置任务的KPI
 * 可以跳过
 * 
 * 按照任务分组展示KPI，每个KPI包含名称、描述和输入框
 */
function StepKPI({ data, setData, hideInfoBox }: StepKPIProps) {
  const kpiGroups: KPIGroup[] = [
    {
      taskName: '查情与配种',
      kpis: [
        {
          id: 'kpi-1',
          name: '查情KPI：发情率',
          description1: '衡量在批次所有母猪中发情母猪占比，用于评估母猪利用率。',
          description2: '推荐目标范围: ≥ 80% - 95%。',
          inputPlaceholder: '大于等于xxx%',
          inputType: 'percentage',
        },
        {
          id: 'kpi-2',
          name: '配种KPI：经产母猪-平均发情至配种间隔',
          description1: '制定经产母猪发情至配种指导性间隔，衡量发情至配种即时性。',
          description2: '推荐目标范围:  ≈ 12小时',
          inputPlaceholder: '约xxx小时',
          inputType: 'hour',
        },
        {
          id: 'kpi-3',
          name: '配种KPI：后备母猪-平均发情至配种间隔',
          description1: '制定后备母猪发情至配种指导性间隔，衡量发情至配种即时性。',
          description2: '推荐目标范围:  ≈ 1小时',
          inputPlaceholder: '约xxx小时',
          inputType: 'hour',
        },
      ],
    },
    {
      taskName: '返情检查',
      kpis: [
        {
          id: 'kpi-4',
          name: 'KPI : 返情率',
          description1: '衡量在所有配种母猪中返情母猪占比，用于评估配种的有效性。如果多次检查，以最终返情率为准。',
          description2: '推荐目标范围: ≤ 5%。',
          inputPlaceholder: '小于等于xxx%',
          inputType: 'percentage',
        },
      ],
    },
    {
      taskName: '孕检',
      kpis: [
        {
          id: 'kpi-5',
          name: 'KPI : 妊娠率',
          description1: '衡量在所有配种母猪中确认妊娠母猪占比，用于评估配种的有效性。如果多次孕检，以首次检查的妊娠率为准。',
          description2: '推荐目标范围: ≥ 90% - 98%。',
          inputPlaceholder: '大于等于xxx%',
          inputType: 'percentage',
        },
      ],
    },
    {
      taskName: '分娩',
      kpis: [
        {
          id: 'kpi-6',
          name: 'KPI : 窝均活仔',
          description1: '衡量批次内母猪分娩的平均活仔数量，用于评估母猪产能。',
          description2: '推荐目标: 12 头',
          inputPlaceholder: '大于等于xxx头',
          inputType: 'number',
        },
      ],
    },
    {
      taskName: '仔猪处理',
      kpis: [
        {
          id: 'kpi-7',
          name: 'KPI : 仔猪处理准时率',
          description1: '衡量所有处理想中在规定日龄或规定日龄前完成的部分，用于评估处理效率与及时性。',
          description2: '推荐目标: ≥ 90%',
          inputPlaceholder: '大于等于xxx%',
          inputType: 'percentage',
        },
      ],
    },
    {
      taskName: '产后母猪检查',
      kpis: [
        {
          id: 'kpi-8',
          name: 'KPI : 产后合格率',
          description1: '衡量在所有检查母猪中确认没有炎症/异常母猪占比，用于评估产后母猪的恢复情况。',
          description2: '推荐目标范围: ≥ 85-95%。',
          inputPlaceholder: '大于等于xxx%',
          inputType: 'percentage',
        },
      ],
    },
    {
      taskName: '断奶检查',
      kpis: [
        {
          id: 'kpi-9',
          name: 'KPI : 断奶平均体重',
          description1: '断奶仔猪平均体重，用于评估哺乳期效率。',
          description2: '推荐目标范围: 根据选定的断奶日龄填写。',
          inputPlaceholder: '大于等于xxxkg',
          inputType: 'weight',
        },
        {
          id: 'kpi-10',
          name: 'KPI : 断奶存活率',
          description1: '衡量断奶仔猪数量占出生活仔数量的比例，用于评估哺乳期效率。',
          description2: '推荐目标范围: ≥ 90% - 98%。',
          inputPlaceholder: '大于等于xxx%',
          inputType: 'percentage',
        },
      ],
    },
    {
      taskName: '结束保育检查',
      kpis: [
        {
          id: 'kpi-11',
          name: 'KPI : 结束保育平均体重',
          description1: '结束保育猪只平均体重，用于评估保育期饲养效率。',
          description2: '推荐目标范围: 根据选定的结束保育日龄填写。',
          inputPlaceholder: '大于等于xxxkg',
          inputType: 'weight',
        },
        {
          id: 'kpi-12',
          name: 'KPI : 保育存活率',
          description1: '结束保育时猪只数量占比进入保育时猪只数量，用于评估保育期饲养效率。',
          description2: '推荐目标范围: ≥ 95% - 98%。',
          inputPlaceholder: '大于等于xxx%',
          inputType: 'percentage',
        },
      ],
    },
    {
      taskName: '结束育肥检查',
      kpis: [
        {
          id: 'kpi-13',
          name: 'KPI : 结束育肥平均体重',
          description1: '结束育肥猪只平均体重，用于评估育肥期饲养效率。',
          description2: '推荐目标范围: 根据选定的结束育肥日龄填写。',
          inputPlaceholder: '大于等于xxxkg',
          inputType: 'weight',
        },
        {
          id: 'kpi-14',
          name: 'KPI : 育肥存活率',
          description1: '结束育肥时猪只数量占比进入育肥时猪只数量，用于评估育肥期饲养效率。',
          description2: '推荐目标范围: ≥ 95% - 98%。',
          inputPlaceholder: '大于等于xxx%',
          inputType: 'percentage',
        },
      ],
    },
  ]

  const initialValues = data?.['kpi-config']?.values || {}
  const [kpiValues, setKpiValues] = useState<Record<string, string>>(initialValues)

  const handleInputChange = (kpiId: string, value: string) => {
    const updatedValues = {
      ...kpiValues,
      [kpiId]: value,
    }
    setKpiValues(updatedValues)
    setData?.({ values: updatedValues })
  }

  const getInputUnit = (inputType: string): string => {
    switch (inputType) {
      case 'percentage':
        return '%'
      case 'hour':
        return '小时'
      case 'weight':
        return 'kg'
      case 'number':
        return '头'
      default:
        return ''
    }
  }

  const filledCount = Object.keys(kpiValues).filter(key => kpiValues[key]?.trim()).length
  const totalCount = kpiGroups.reduce((sum, group) => sum + group.kpis.length, 0)

  return (
    <div className="step-content">
      <div className="step-form">
        {!hideInfoBox && (
          <div className="step-info-box">
            <p>为各项任务设置关键绩效指标（KPI），用于后续任务执行效果评估。您可以根据实际情况填写，也可以稍后在其他设置中进行配置。</p>
          </div>
        )}

        {/* KPI分组展示 */}
        <div className="kpi-groups">
          {kpiGroups.map((group) => (
            <div key={group.taskName} className="kpi-group">
              <h3 className="kpi-group-title">{group.taskName}</h3>
              <div className="kpi-list">
                {group.kpis.map((kpi) => (
                  <div key={kpi.id} className="kpi-item">
                    <div className="kpi-item-left">
                      <div className="kpi-name">{kpi.name}</div>
                      <div className="kpi-description">{kpi.description1}</div>
                      <div className="kpi-description">{kpi.description2}</div>
                    </div>
                    <div className="kpi-item-right">
                      <input
                        type="number"
                        className="kpi-input"
                        placeholder={kpi.inputPlaceholder}
                        value={kpiValues[kpi.id] || ''}
                        onChange={(e) => handleInputChange(kpi.id, e.target.value)}
                        step={kpi.inputType === 'weight' ? '0.1' : '1'}
                        min="0"
                      />
                      <span className="kpi-unit">{getInputUnit(kpi.inputType)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 统计信息 */}
        <div className="kpi-summary">
          <p>
            已填写 {filledCount} / {totalCount} 个KPI
          </p>
        </div>
      </div>
    </div>
  )
}

export default StepKPI
