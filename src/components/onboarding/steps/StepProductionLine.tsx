import { useState } from 'react'
import './StepCommon.css'
import './StepProductionLine.css'
import StepKPI from './StepKPI'

interface StepProductionLineProps {
  onNext: () => void
  onSkip?: () => void
  data?: any
  setData?: (data: any) => void
}

interface ProductionLine {
  id: string
  name: string
  sectionId: string
  sectionName: string
  maxSowsPerBatch?: number
  firstBatchStartDate?: string
  productionPlanId?: string
  productionPlanName?: string
  transferPlanId?: string
  transferPlanName?: string
}

/**
 * 步骤 2：添加生产线
 * 可以跳过
 * 
 * 根据业务背景：
 * - 生产线用于圈定厂区内某一个 Section（区块）
 * - 当区块内的猪只满足配种条件时，会被自动纳入当前最新的生产批次
 */
function StepProductionLine({ data, setData }: StepProductionLineProps) {
  const [lines, setLines] = useState<ProductionLine[]>(data?.['production-line']?.lines || [])
  const [showModal, setShowModal] = useState(false)
  const [showKPIModal, setShowKPIModal] = useState(false)
  const [showKPITemplateModal, setShowKPITemplateModal] = useState(false)
  const [showTemplateDetailModal, setShowTemplateDetailModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null)
  
  // 检查KPI是否已配置
  const kpiData = data?.['kpi-config']
  const isKPIConfigured = kpiData?.values && Object.keys(kpiData.values).filter(key => kpiData.values[key]?.trim()).length > 0
  
  // 表单状态
  const [formData, setFormData] = useState({
    name: '',
    sectionId: '',
    maxSowsPerBatch: '',
    firstBatchStartDate: '',
    productionPlanId: '',
    productionPlanName: '',
    transferPlanId: '',
    transferPlanName: '',
  })

  // 从第一步（厂区配置）的数据中获取所有区块（Section）列表
  const zones = data?.['zone-config']?.zones || data?.zones || []
  const allSections: Array<{ id: string; name: string; zoneName: string }> = []
  
  zones.forEach((zone: any) => {
    zone.sections?.forEach((section: any) => {
      allSections.push({
        id: section.id,
        name: section.nameCn || section.name || section.nameEn,
        zoneName: zone.nameCn || zone.name || zone.nameEn,
      })
    })
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSelectProductionPlan = () => {
    // 模拟选择生产计划
    const planName = prompt('请输入生产计划名称（Demo 演示）：')
    if (planName) {
      setFormData(prev => ({
        ...prev,
        productionPlanId: `plan-${Date.now()}`,
        productionPlanName: planName,
      }))
    }
  }

  const handleSelectTransferPlan = () => {
    // 模拟选择转舍计划
    const planName = prompt('请输入转舍计划名称（Demo 演示）：')
    if (planName) {
      setFormData(prev => ({
        ...prev,
        transferPlanId: `transfer-${Date.now()}`,
        transferPlanName: planName,
      }))
    }
  }

  const handleAddLine = () => {
    if (!formData.name.trim() || !formData.sectionId) return

    const selectedSection = allSections.find(s => s.id === formData.sectionId)
    
    const newLine: ProductionLine = {
      id: `line-${Date.now()}`,
      name: formData.name.trim(),
      sectionId: formData.sectionId,
      sectionName: selectedSection?.name || '',
      maxSowsPerBatch: formData.maxSowsPerBatch ? parseInt(formData.maxSowsPerBatch) : undefined,
      firstBatchStartDate: formData.firstBatchStartDate || undefined,
      productionPlanId: formData.productionPlanId || undefined,
      productionPlanName: formData.productionPlanName || undefined,
      transferPlanId: formData.transferPlanId || undefined,
      transferPlanName: formData.transferPlanName || undefined,
    }
    
    const updatedLines = [...lines, newLine]
    setLines(updatedLines)
    setData?.({ lines: updatedLines })
    
    // 重置表单
    setFormData({
      name: '',
      sectionId: '',
      maxSowsPerBatch: '',
      firstBatchStartDate: '',
      productionPlanId: '',
      productionPlanName: '',
      transferPlanId: '',
      transferPlanName: '',
    })
    setShowModal(false)
  }

  const handleKPIConfigure = () => {
    // KPI配置完成后，关闭模态框
    // 配置状态会自动通过 isKPIConfigured 检测
    setShowKPIModal(false)
  }

  const handleDeleteLine = (lineId: string) => {
    const updatedLines = lines.filter(line => line.id !== lineId)
    setLines(updatedLines)
    setData?.({ lines: updatedLines })
  }

  const canSubmit = formData.name.trim() && formData.sectionId && formData.firstBatchStartDate

  return (
    <div className="step-content">
      <div className="step-form">
        <div className="step-info-box">
          <p>生产线用于管理特定区域的猪只生产流程。当该区域的猪只满足配种条件时，系统会自动将它们纳入生产批次，并按计划推送生产任务。</p>
        </div>

        {/* 添加生产线按钮 */}
        <div className="form-section">
          <button
            className="btn btn-primary"
            onClick={() => setShowModal(true)}
          >
            + 添加生产线
          </button>
        </div>

        {/* 生产线列表 */}
        {lines.length > 0 && (
          <div className="form-section">
            <h3>已创建的生产线（共 {lines.length} 条）</h3>
            <div className="list-box">
              {lines.map((line) => (
                <div key={line.id} className="list-item">
                  <div className="list-item-content">
                    <div className="list-item-title">{line.name}</div>
                    <div className="list-item-meta">
                      覆盖区块：{line.sectionName}
                      {line.maxSowsPerBatch && ` | 每批次上限：${line.maxSowsPerBatch} 头`}
                      {line.firstBatchStartDate && ` | 预计开始：${line.firstBatchStartDate}`}
                    </div>
                  </div>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDeleteLine(line.id)}
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 添加生产线的模态框 */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content modal-content-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>添加生产线</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {/* 生产线名称 */}
              <div className="production-line-field">
                <div className="field-label-row">
                  <label className="field-label">生产线名称<span className="required">*</span></label>
                </div>
                <p className="field-description">
                  建议以"生产线"为前缀，从数字1开始依序命名（例如"生产线1"、"生产线2"等），便于统一管理和识别。
                </p>
                <input
                  type="text"
                  className="production-line-input"
                  placeholder="请输入"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                />
              </div>

              {/* 生产线覆盖区块 */}
              <div className="production-line-field">
                <div className="field-label-row">
                  <label className="field-label">生产线覆盖区块<span className="required">*</span></label>
                </div>
                <p className="field-description">
                  选择该生产线对应的区块，用于筛选同区域内符合条件的猪只并自动初始化新的批次。
                </p>
                <select
                  className="production-line-input"
                  value={formData.sectionId}
                  onChange={(e) => handleInputChange('sectionId', e.target.value)}
                >
                  <option value="">请选择区块</option>
                  {allSections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.zoneName} - {section.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 每批次配种母猪数量上限 */}
              <div className="production-line-field">
                <div className="field-label-row">
                  <label className="field-label">每批次配种母猪数量上限</label>
                </div>
                <p className="field-description">
                  根据厂区或栏位容量限制，每批次可容纳的怀孕母猪数上限。如不适用，请留空。
                </p>
                <div className="input-with-unit">
                  <input
                    type="number"
                    className="production-line-input"
                    placeholder="请输入"
                    value={formData.maxSowsPerBatch}
                    onChange={(e) => handleInputChange('maxSowsPerBatch', e.target.value)}
                    min="0"
                  />
                  <span className="input-unit">头</span>
                </div>
              </div>

              {/* 预计首批开始日期 */}
              <div className="production-line-field">
                <div className="field-label-row">
                  <label className="field-label">预计首批开始日期<span className="required">*</span></label>
                </div>
                <p className="field-description">
                  选择该生产线第一个批次预计启动的年度及周次。
                </p>
                <input
                  type="week"
                  className="production-line-input"
                  value={formData.firstBatchStartDate}
                  onChange={(e) => handleInputChange('firstBatchStartDate', e.target.value)}
                />
              </div>

              {/* 生产计划 */}
              <div className="production-line-field">
                <div className="field-label-row">
                  <label className="field-label">生产计划</label>
                </div>
                <p className="field-description">
                  选择或创建生产计划模版，用于自动生成各生产阶段任务以及跟踪生产关键指标。
                </p>
                <div className="field-buttons">
                  <button
                    className="btn btn-outline btn-select-template"
                    onClick={handleSelectProductionPlan}
                  >
                    {formData.productionPlanName || '选择模版'}
                  </button>
                </div>
                {formData.productionPlanName && (
                  <div className="selected-template">
                    已选择：{formData.productionPlanName}
                  </div>
                )}
              </div>

              {/* 任务KPI */}
              <div className="production-line-field">
                <div className="field-label-row">
                  <label className="field-label">任务KPI</label>
                </div>
                <p className="field-description">
                  为各项任务设置关键绩效指标（KPI），用于后续任务执行效果评估和跟踪。KPI设置后将在任务执行过程中自动计算和监控，帮助您及时了解生产状况。可以稍后配置。
                </p>
                <div className="field-buttons">
                  <button
                    className="btn btn-outline btn-select-template"
                    onClick={() => setShowKPITemplateModal(true)}
                  >
                    选择模版
                  </button>
                </div>
                {isKPIConfigured && (
                  <div className="selected-template">
                    已配置任务KPI
                  </div>
                )}
              </div>

              {/* 转舍计划 */}
              <div className="production-line-field">
                <div className="field-label-row">
                  <label className="field-label">转舍计划</label>
                </div>
                <p className="field-description">
                  转舍计划用于设定猪只的转舍时机，可根据生产状态、任务或节点配置规则，并在符合条件时自动生成任务。
                </p>
                <div className="field-buttons">
                  <button
                    className="btn btn-outline btn-select-template"
                    onClick={handleSelectTransferPlan}
                  >
                    {formData.transferPlanName || '选择转舍计划'}
                  </button>
                </div>
                {formData.transferPlanName && (
                  <div className="selected-template">
                    已选择：{formData.transferPlanName}
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                取消
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAddLine}
                disabled={!canSubmit}
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KPI模版选择模态框 */}
      {showKPITemplateModal && (
        <div className="modal-overlay" onClick={() => setShowKPITemplateModal(false)}>
          <div className="modal-content modal-content-large kpi-template-modal" onClick={(e) => e.stopPropagation()}>
            <div className="template-modal-header">
              <h2>选择模版</h2>
              <div className="template-header-actions">
                <button className="btn btn-primary btn-create-template">
                  创建模板
                </button>
                <button className="modal-close" onClick={() => setShowKPITemplateModal(false)}>×</button>
              </div>
            </div>
            
            {/* 搜索和筛选区域 */}
            <div className="template-filter-section">
              <div className="template-search">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="search-icon">
                  <path d="M7 12A5 5 0 1 0 7 2a5 5 0 0 0 0 10zM13 13l-3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <input
                  type="text"
                  placeholder="模板名称"
                  className="template-search-input"
                />
              </div>
              <select className="template-filter">
                <option value="">任务类型</option>
                <option value="查情与配种">查情与配种</option>
                <option value="返情检查">返情检查</option>
                <option value="孕检">孕检</option>
                <option value="分娩">分娩</option>
                <option value="仔猪处理">仔猪处理</option>
                <option value="产后母猪检查">产后母猪检查</option>
                <option value="断奶检查">断奶检查</option>
                <option value="结束保育检查">结束保育检查</option>
                <option value="结束育肥检查">结束育肥检查</option>
              </select>
              <select className="template-filter">
                <option value="">KPI类型</option>
                <option value="percentage">百分比</option>
                <option value="hour">小时</option>
                <option value="weight">体重</option>
                <option value="number">数量</option>
              </select>
              <button className="btn btn-outline btn-reset">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2v4M8 10v4M2 8h4M10 8h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                </svg>
                重置
              </button>
            </div>

            <div className="template-modal-body">
              <div className="template-list">
                {/* 标准KPI模版 */}
                <div className="template-card">
                  <div className="template-card-header">
                    <h3>标准KPI模版</h3>
                    <button className="template-menu-btn">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="4" r="1" fill="currentColor"/>
                        <circle cx="8" cy="8" r="1" fill="currentColor"/>
                        <circle cx="8" cy="12" r="1" fill="currentColor"/>
                      </svg>
                    </button>
                  </div>
                  <p className="template-card-description">
                    包含基础生产指标，适用于大多数养殖场，涵盖主要生产环节的关键KPI。
                  </p>
                  <div className="template-card-details">
                    <div className="template-detail-row">
                      <span className="detail-label">任务类型:</span>
                      <span className="detail-value">查情与配种、返情检查、孕检、分娩、断奶检查</span>
                    </div>
                    <div className="template-detail-row">
                      <span className="detail-label">KPI数量:</span>
                      <span className="detail-value">8个</span>
                    </div>
                    <div className="template-detail-row">
                      <span className="detail-label">主要指标:</span>
                      <span className="detail-value">发情率、配种间隔、返情率、妊娠率、窝均活仔、断奶存活率等</span>
                    </div>
                    <div className="template-detail-row">
                      <span className="detail-label">创建人:</span>
                      <span className="detail-value">系统默认</span>
                    </div>
                    <div className="template-detail-row">
                      <span className="detail-label">创建时间:</span>
                      <span className="detail-value">2025/01/01 00:00</span>
                    </div>
                  </div>
                  <div className="template-card-actions">
                    <button
                      className="btn btn-outline btn-view-template"
                      onClick={() => {
                        const standardTemplate = {
                          name: '标准KPI模版',
                          description: '包含基础生产指标，适用于大多数养殖场，涵盖主要生产环节的关键KPI。',
                          values: {
                            'kpi-1': '85', // 发情率
                            'kpi-2': '12', // 经产母猪-平均发情至配种间隔
                            'kpi-3': '1',  // 后备母猪-平均发情至配种间隔
                            'kpi-4': '5',  // 返情率
                            'kpi-5': '92', // 妊娠率
                            'kpi-6': '12', // 窝均活仔
                            'kpi-10': '94', // 断奶存活率
                            'kpi-12': '96', // 保育存活率
                          }
                        }
                        setSelectedTemplate(standardTemplate)
                        setShowTemplateDetailModal(true)
                      }}
                    >
                      查看
                    </button>
                    <button
                      className="btn btn-primary btn-use-template"
                      onClick={() => {
                        // 应用标准模版
                        const standardTemplate = {
                          'kpi-1': '85', // 发情率
                          'kpi-2': '12', // 经产母猪-平均发情至配种间隔
                          'kpi-3': '1',  // 后备母猪-平均发情至配种间隔
                          'kpi-4': '5',  // 返情率
                          'kpi-5': '92', // 妊娠率
                          'kpi-6': '12', // 窝均活仔
                          'kpi-10': '94', // 断奶存活率
                          'kpi-12': '96', // 保育存活率
                        }
                        setData?.({
                          ...data,
                          'kpi-config': {
                            values: standardTemplate
                          }
                        })
                        setShowKPITemplateModal(false)
                      }}
                    >
                      使用模版
                    </button>
                  </div>
                </div>

                {/* 高级KPI模版 */}
                <div className="template-card">
                  <div className="template-card-header">
                    <h3>高级KPI模版</h3>
                    <button className="template-menu-btn">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="4" r="1" fill="currentColor"/>
                        <circle cx="8" cy="8" r="1" fill="currentColor"/>
                        <circle cx="8" cy="12" r="1" fill="currentColor"/>
                      </svg>
                    </button>
                  </div>
                  <p className="template-card-description">
                    包含完整生产流程的所有KPI指标，适用于精细化管理的养殖场，全面跟踪生产各环节。
                  </p>
                  <div className="template-card-details">
                    <div className="template-detail-row">
                      <span className="detail-label">任务类型:</span>
                      <span className="detail-value">全部任务类型（9个）</span>
                    </div>
                    <div className="template-detail-row">
                      <span className="detail-label">KPI数量:</span>
                      <span className="detail-value">14个</span>
                    </div>
                    <div className="template-detail-row">
                      <span className="detail-label">主要指标:</span>
                      <span className="detail-value">发情率、配种间隔、返情率、妊娠率、窝均活仔、仔猪处理准时率、产后合格率、断奶平均体重、断奶存活率、保育平均体重、保育存活率、育肥平均体重、育肥存活率</span>
                    </div>
                    <div className="template-detail-row">
                      <span className="detail-label">创建人:</span>
                      <span className="detail-value">系统默认</span>
                    </div>
                    <div className="template-detail-row">
                      <span className="detail-label">创建时间:</span>
                      <span className="detail-value">2025/01/01 00:00</span>
                    </div>
                  </div>
                  <div className="template-card-actions">
                    <button
                      className="btn btn-outline btn-view-template"
                      onClick={() => {
                        const advancedTemplate = {
                          name: '高级KPI模版',
                          description: '包含完整生产流程的所有KPI指标，适用于精细化管理的养殖场，全面跟踪生产各环节。',
                          values: {
                            'kpi-1': '88',  // 发情率
                            'kpi-2': '12', // 经产母猪-平均发情至配种间隔
                            'kpi-3': '1',  // 后备母猪-平均发情至配种间隔
                            'kpi-4': '4',  // 返情率
                            'kpi-5': '94', // 妊娠率
                            'kpi-6': '12', // 窝均活仔
                            'kpi-7': '92', // 仔猪处理准时率
                            'kpi-8': '90', // 产后合格率
                            'kpi-9': '7',  // 断奶平均体重
                            'kpi-10': '96', // 断奶存活率
                            'kpi-11': '25', // 结束保育平均体重
                            'kpi-12': '97', // 保育存活率
                            'kpi-13': '110', // 结束育肥平均体重
                            'kpi-14': '98', // 育肥存活率
                          }
                        }
                        setSelectedTemplate(advancedTemplate)
                        setShowTemplateDetailModal(true)
                      }}
                    >
                      查看
                    </button>
                    <button
                      className="btn btn-primary btn-use-template"
                      onClick={() => {
                        // 应用高级模版
                        const advancedTemplate = {
                          'kpi-1': '88',  // 发情率
                          'kpi-2': '12', // 经产母猪-平均发情至配种间隔
                          'kpi-3': '1',  // 后备母猪-平均发情至配种间隔
                          'kpi-4': '4',  // 返情率
                          'kpi-5': '94', // 妊娠率
                          'kpi-6': '12', // 窝均活仔
                          'kpi-7': '92', // 仔猪处理准时率
                          'kpi-8': '90', // 产后合格率
                          'kpi-9': '7',  // 断奶平均体重
                          'kpi-10': '96', // 断奶存活率
                          'kpi-11': '25', // 结束保育平均体重
                          'kpi-12': '97', // 保育存活率
                          'kpi-13': '110', // 结束育肥平均体重
                          'kpi-14': '98', // 育肥存活率
                        }
                        setData?.({
                          ...data,
                          'kpi-config': {
                            values: advancedTemplate
                          }
                        })
                        setShowKPITemplateModal(false)
                      }}
                    >
                      使用模版
                    </button>
                  </div>
                </div>

                {/* 测试模版 */}
                <div className="template-card">
                  <div className="template-card-header">
                    <h3>测试模版1</h3>
                    <button className="template-menu-btn">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="4" r="1" fill="currentColor"/>
                        <circle cx="8" cy="8" r="1" fill="currentColor"/>
                        <circle cx="8" cy="12" r="1" fill="currentColor"/>
                      </svg>
                    </button>
                  </div>
                  <p className="template-card-description">
                    非常快的模版，不是正常生产节奏
                  </p>
                  <div className="template-card-details">
                    <div className="template-detail-row">
                      <span className="detail-label">任务类型:</span>
                      <span className="detail-value">查情与配种、分娩、断奶检查</span>
                    </div>
                    <div className="template-detail-row">
                      <span className="detail-label">KPI数量:</span>
                      <span className="detail-value">5个</span>
                    </div>
                    <div className="template-detail-row">
                      <span className="detail-label">主要指标:</span>
                      <span className="detail-value">发情率、配种间隔、窝均活仔、断奶存活率</span>
                    </div>
                    <div className="template-detail-row">
                      <span className="detail-label">创建人:</span>
                      <span className="detail-value">admin sentri</span>
                    </div>
                    <div className="template-detail-row">
                      <span className="detail-label">创建时间:</span>
                      <span className="detail-value">2025/12/26 10:50</span>
                    </div>
                  </div>
                  <div className="template-card-actions">
                    <button
                      className="btn btn-outline btn-view-template"
                      onClick={() => {
                        const testTemplate = {
                          name: '测试模版1',
                          description: '非常快的模版，不是正常生产节奏',
                          values: {
                            'kpi-1': '90',
                            'kpi-2': '10',
                            'kpi-3': '1',
                            'kpi-6': '13',
                            'kpi-10': '95',
                          }
                        }
                        setSelectedTemplate(testTemplate)
                        setShowTemplateDetailModal(true)
                      }}
                    >
                      查看
                    </button>
                    <button
                      className="btn btn-primary btn-use-template"
                      onClick={() => {
                        // 应用测试模版
                        const testTemplate = {
                          'kpi-1': '90',
                          'kpi-2': '10',
                          'kpi-3': '1',
                          'kpi-6': '13',
                          'kpi-10': '95',
                        }
                        setData?.({
                          ...data,
                          'kpi-config': {
                            values: testTemplate
                          }
                        })
                        setShowKPITemplateModal(false)
                      }}
                    >
                      使用模版
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPI模版详情查看模态框 */}
      {showTemplateDetailModal && selectedTemplate && (
        <div className="modal-overlay" onClick={() => setShowTemplateDetailModal(false)}>
          <div className="modal-content modal-content-large kpi-template-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>查看模版：{selectedTemplate.name}</h3>
              <button className="modal-close" onClick={() => setShowTemplateDetailModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p className="template-detail-description">{selectedTemplate.description}</p>
              
              {/* KPI详情列表 */}
              <div className="template-kpi-detail-list">
                {(() => {
                  // KPI映射表
                  const kpiMap: Record<string, { name: string; unit: string; taskName: string }> = {
                    'kpi-1': { name: '查情KPI：发情率', unit: '%', taskName: '查情与配种' },
                    'kpi-2': { name: '配种KPI：经产母猪-平均发情至配种间隔', unit: '小时', taskName: '查情与配种' },
                    'kpi-3': { name: '配种KPI：后备母猪-平均发情至配种间隔', unit: '小时', taskName: '查情与配种' },
                    'kpi-4': { name: 'KPI : 返情率', unit: '%', taskName: '返情检查' },
                    'kpi-5': { name: 'KPI : 妊娠率', unit: '%', taskName: '孕检' },
                    'kpi-6': { name: 'KPI : 窝均活仔', unit: '头', taskName: '分娩' },
                    'kpi-7': { name: 'KPI : 仔猪处理准时率', unit: '%', taskName: '仔猪处理' },
                    'kpi-8': { name: 'KPI : 产后合格率', unit: '%', taskName: '产后母猪检查' },
                    'kpi-9': { name: 'KPI : 断奶平均体重', unit: 'kg', taskName: '断奶检查' },
                    'kpi-10': { name: 'KPI : 断奶存活率', unit: '%', taskName: '断奶检查' },
                    'kpi-11': { name: 'KPI : 结束保育平均体重', unit: 'kg', taskName: '结束保育检查' },
                    'kpi-12': { name: 'KPI : 保育存活率', unit: '%', taskName: '结束保育检查' },
                    'kpi-13': { name: 'KPI : 结束育肥平均体重', unit: 'kg', taskName: '结束育肥检查' },
                    'kpi-14': { name: 'KPI : 育肥存活率', unit: '%', taskName: '结束育肥检查' },
                  }

                  // 按任务类型分组
                  const groupedKPIs: Record<string, Array<{ id: string; name: string; value: string; unit: string }>> = {}
                  Object.keys(selectedTemplate.values).forEach(kpiId => {
                    const kpiInfo = kpiMap[kpiId]
                    if (kpiInfo) {
                      if (!groupedKPIs[kpiInfo.taskName]) {
                        groupedKPIs[kpiInfo.taskName] = []
                      }
                      groupedKPIs[kpiInfo.taskName].push({
                        id: kpiId,
                        name: kpiInfo.name,
                        value: selectedTemplate.values[kpiId],
                        unit: kpiInfo.unit
                      })
                    }
                  })

                  return Object.keys(groupedKPIs).map(taskName => (
                    <div key={taskName} className="template-kpi-group">
                      <h4 className="template-kpi-group-title">{taskName}</h4>
                      <div className="template-kpi-items">
                        {groupedKPIs[taskName].map(kpi => (
                          <div key={kpi.id} className="template-kpi-item">
                            <span className="template-kpi-name">{kpi.name}</span>
                            <span className="template-kpi-value">
                              {kpi.value} {kpi.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                })()}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowTemplateDetailModal(false)}>
                关闭
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setData?.({
                    ...data,
                    'kpi-config': {
                      values: selectedTemplate.values
                    }
                  })
                  setShowTemplateDetailModal(false)
                  setShowKPITemplateModal(false)
                }}
              >
                使用此模版
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KPI配置模态框 */}
      {showKPIModal && (
        <div className="modal-overlay" onClick={() => setShowKPIModal(false)}>
          <div className="modal-content modal-content-large kpi-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>设置任务KPI</h3>
              <button className="modal-close" onClick={() => setShowKPIModal(false)}>×</button>
            </div>
            <div className="modal-body kpi-modal-body">
              <StepKPI
                data={data}
                setData={(kpiData) => {
                  // 更新全局KPI数据
                  const currentKPIData = data?.['kpi-config'] || {}
                  setData?.({
                    ...data,
                    'kpi-config': {
                      ...currentKPIData,
                      ...kpiData,
                    },
                  })
                }}
                hideInfoBox={true}
              />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowKPIModal(false)}>
                关闭
              </button>
              <button
                className="btn btn-primary"
                onClick={handleKPIConfigure}
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StepProductionLine