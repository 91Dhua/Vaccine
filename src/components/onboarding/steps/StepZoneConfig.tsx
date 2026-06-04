import { useState } from 'react'
import './StepCommon.css'
import './StepZoneConfig.css'
import StallNamingGuide from './StallNamingGuide'
import StructureMappingGuide from './StructureMappingGuide'

interface StepZoneConfigProps {
  onNext: () => void
  onBack?: () => void
  data?: any
  setData?: (data: any) => void
}

interface Zone {
  id: string
  nameEn: string
  nameCn: string
  sections: Section[]
}

interface Section {
  id: string
  nameEn: string
  nameCn: string
  previewImage?: string
  units: Unit[]
}

interface Unit {
  id: string
  purpose: string
  nameEn: string
  nameCn: string
  pens: Pen[]
}

interface Pen {
  id: string
  column: string  // 列/排，如 A、B
  start: string   // 起始号，如 1
  end: string     // 结束号，如 10
  type: string
}

interface PenType {
  id: string
  name: string
  capacity: string
  feedingStation: string
  waterStation: string
  isDefault?: boolean
}


/**
 * 步骤 1：厂区配置
 * 不可跳过 - 这是系统使用的基础
 * 
 * 根据业务背景：
 * - 厂区层级结构：Zone（区）→ Section（区块）→ Unit（房间）→ 栏位
 * - 用户必须按照该层级结构配置厂区布局
 */
function StepZoneConfig({ onNext, onBack, data, setData }: StepZoneConfigProps) {
  // 是否显示介绍页面
  const [showIntro, setShowIntro] = useState(true)
  const [zones, setZones] = useState<Zone[]>(data?.['zone-config']?.zones || data?.zones || [])
  const [penTypes, setPenTypes] = useState<PenType[]>(data?.['zone-config']?.penTypes || data?.penTypes || [])
  
  // 添加区的表单状态
  const [showZoneModal, setShowZoneModal] = useState(false)
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null)
  const [zoneForm, setZoneForm] = useState({ nameEn: '', nameCn: '' })
  
  // 添加区块的表单状态
  const [showSectionModal, setShowSectionModal] = useState(false)
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null)
  const [selectedZoneForSection, setSelectedZoneForSection] = useState<string | null>(null)
  const [sectionForm, setSectionForm] = useState({ nameEn: '', nameCn: '', previewImage: '' })
  const [sectionPreviewImage, setSectionPreviewImage] = useState<string | null>(null)
  const [showPreviewImageInfo, setShowPreviewImageInfo] = useState(false)
  
  // 添加单元的表单状态
  const [showUnitModal, setShowUnitModal] = useState(false)
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null)
  const [selectedZoneForUnit, setSelectedZoneForUnit] = useState<string | null>(null)
  const [selectedSectionForUnit, setSelectedSectionForUnit] = useState<string | null>(null)
  const [unitForm, setUnitForm] = useState({ 
    purpose: '', 
    nameEn: '', 
    nameCn: '', 
    pens: [] as Pen[]
  })
  // 单元名称前缀（区-区块）
  const [unitNamePrefix, setUnitNamePrefix] = useState({ nameEn: '', nameCn: '' })
  // 按列分组的栏位数据：{ 'A': [{ id, start, end, type }], 'B': [...] }
  const [penColumns, setPenColumns] = useState<Record<string, Array<{ id: string, start: string, end: string, type: string }>>>({})
  // 当前行的表单数据
  const [penRowForm, setPenRowForm] = useState({ start: '', end: '', type: '' })
  // 添加栏位弹窗
  const [showAddColumnModal, setShowAddColumnModal] = useState(false)
  
  // 配置栏位类型弹窗
  const [showPenTypeModal, setShowPenTypeModal] = useState(false)
  
  // 单元用途选项
  const unitPurposeOptions = ['动物饲养', '非动物饲养']
  
  // 栏位类型选项（不再使用默认值，只使用用户配置的）
  const getPenTypeOptions = () => {
    return penTypes
      .map((t) => t.name.trim())
      .filter(Boolean)
  }

  // 跟踪当前正在编辑的栏位类型选择器上下文
  const [penTypeSelectorContext, setPenTypeSelectorContext] = useState<{
    type: 'row' | 'form'
    column?: string
    rowId?: string
  } | null>(null)
  
  // 跟踪新建的栏位类型ID，用于自动选中
  const [newlyCreatedPenTypeId, setNewlyCreatedPenTypeId] = useState<string | null>(null)


  // 配置栏位类型 - 删除确认
  const [showDeletePenTypeModal, setShowDeletePenTypeModal] = useState(false)
  const [penTypeToDelete, setPenTypeToDelete] = useState<PenType | null>(null)
  const [deletePenTypeConfirmName, setDeletePenTypeConfirmName] = useState('')
  const [deletePenTypeError, setDeletePenTypeError] = useState('')


  const handleAddZone = () => {
    if (!zoneForm.nameEn.trim() || !zoneForm.nameCn.trim()) return
    
    if (editingZoneId) {
      // 编辑模式
      const updatedZones = zones.map(zone => 
        zone.id === editingZoneId
          ? { ...zone, nameEn: zoneForm.nameEn.trim(), nameCn: zoneForm.nameCn.trim() }
          : zone
      )
      setZones(updatedZones)
      setData?.({ zones: updatedZones })
    } else {
      // 新增模式
      const newZone: Zone = {
        id: `zone-${Date.now()}`,
        nameEn: zoneForm.nameEn.trim(),
        nameCn: zoneForm.nameCn.trim(),
        sections: [],
      }
      const updatedZones = [...zones, newZone]
      setZones(updatedZones)
      setData?.({ zones: updatedZones })
    }
    setZoneForm({ nameEn: '', nameCn: '' })
    setEditingZoneId(null)
    setShowZoneModal(false)
  }

  const handleDeleteZone = (zoneId: string) => {
    if (window.confirm('确定要删除该区吗？删除后该区下的所有区块、单元和栏位都将被删除。')) {
      const updatedZones = zones.filter(zone => zone.id !== zoneId)
      setZones(updatedZones)
      setData?.({ zones: updatedZones })
    }
  }

  const openEditZone = (zoneId: string) => {
    const zone = zones.find(z => z.id === zoneId)
    if (zone) {
      setZoneForm({ nameEn: zone.nameEn, nameCn: zone.nameCn })
      setEditingZoneId(zoneId)
      setShowZoneModal(true)
    }
  }

  const handleAddSection = () => {
    if (
      !selectedZoneForSection ||
      !sectionForm.nameEn.trim() ||
      !sectionForm.nameCn.trim()
    ) {
      return
    }
    
    const updatedZones = zones.map(zone => {
      if (zone.id === selectedZoneForSection) {
        if (editingSectionId) {
          // 编辑模式
          return {
            ...zone,
            sections: zone.sections.map(section =>
              section.id === editingSectionId
                ? {
                    ...section,
                    nameEn: sectionForm.nameEn.trim(),
                    nameCn: sectionForm.nameCn.trim(),
                    previewImage: sectionForm.previewImage || section.previewImage,
                  }
                : section
            ),
          }
        } else {
          // 新增模式
          return {
            ...zone,
            sections: [
              ...zone.sections,
              {
                id: `section-${Date.now()}`,
                nameEn: sectionForm.nameEn.trim(),
                nameCn: sectionForm.nameCn.trim(),
                previewImage: sectionForm.previewImage || undefined,
                units: [],
              },
            ],
          }
        }
      }
      return zone
    })
    setZones(updatedZones)
    setData?.({ zones: updatedZones })
    setSectionForm({ nameEn: '', nameCn: '', previewImage: '' })
    setSectionPreviewImage(null)
    setSelectedZoneForSection(null)
    setEditingSectionId(null)
    setShowSectionModal(false)
  }

  const handleDeleteSection = (zoneId: string, sectionId: string) => {
    if (window.confirm('确定要删除该区块吗？删除后该区块下的所有单元和栏位都将被删除。')) {
      const updatedZones = zones.map(zone => {
        if (zone.id === zoneId) {
          return {
            ...zone,
            sections: zone.sections.filter(section => section.id !== sectionId),
          }
        }
        return zone
      })
      setZones(updatedZones)
      setData?.({ zones: updatedZones })
    }
  }

  const openEditSection = (zoneId: string, sectionId: string) => {
    const zone = zones.find(z => z.id === zoneId)
    const section = zone?.sections.find(s => s.id === sectionId)
    if (zone && section) {
      setSectionForm({
        nameEn: section.nameEn,
        nameCn: section.nameCn,
        previewImage: section.previewImage || '',
      })
      setSectionPreviewImage(section.previewImage || null)
      setSelectedZoneForSection(zoneId)
      setEditingSectionId(sectionId)
      setShowSectionModal(true)
    }
  }

  const handleSectionPreviewImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // 验证文件类型
      if (!file.type.startsWith('image/')) {
        alert('请上传图片文件')
        return
      }
      // 验证文件大小（例如：最大5MB）
      if (file.size > 5 * 1024 * 1024) {
        alert('图片大小不能超过5MB')
        return
      }
      // 创建预览
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        setSectionPreviewImage(result)
        setSectionForm({ ...sectionForm, previewImage: result })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveSectionPreviewImage = () => {
    setSectionPreviewImage(null)
    setSectionForm({ ...sectionForm, previewImage: '' })
  }

  // 将penColumns转换为Pen[]格式
  const convertPenColumnsToPens = (columns: Record<string, Array<{ id: string, start: string, end: string, type: string }>>): Pen[] => {
    const pens: Pen[] = []
    Object.keys(columns).sort().forEach(column => {
      columns[column].forEach(row => {
        pens.push({
          id: row.id,
          column: column,
          start: row.start,
          end: row.end,
          type: row.type,
        })
      })
    })
    return pens
  }

  // 将Pen[]转换为penColumns格式
  const convertPensToPenColumns = (pens: Pen[]): Record<string, Array<{ id: string, start: string, end: string, type: string }>> => {
    const columns: Record<string, Array<{ id: string, start: string, end: string, type: string }>> = {}
    pens.forEach(pen => {
      if (!columns[pen.column]) {
        columns[pen.column] = []
      }
      columns[pen.column].push({
        id: pen.id,
        start: pen.start,
        end: pen.end,
        type: pen.type,
      })
    })
    return columns
  }

  const handleAddUnit = () => {
    if (
      !selectedZoneForUnit ||
      !selectedSectionForUnit ||
      !unitForm.nameEn.trim() ||
      !unitForm.nameCn.trim()
    ) {
      return
    }
    
    // 将penColumns转换为Pen[]格式
    const finalPens = convertPenColumnsToPens(penColumns)
    
    // 如果最终还是没有栏位，不允许提交
    if (finalPens.length === 0) {
      return
    }
    
    // 拼接完整名称：前缀 + 单元名称
    const fullNameEn = `${unitNamePrefix.nameEn}${unitForm.nameEn.trim()}`
    const fullNameCn = `${unitNamePrefix.nameCn}${unitForm.nameCn.trim()}`
    
    const updatedZones = zones.map(zone => {
      if (zone.id === selectedZoneForUnit) {
        return {
          ...zone,
          sections: zone.sections.map(section => {
            if (section.id === selectedSectionForUnit) {
              if (editingUnitId) {
                // 编辑模式
                return {
                  ...section,
                  units: section.units.map(unit =>
                    unit.id === editingUnitId
                      ? {
                          ...unit,
                          purpose: unitForm.purpose,
                          nameEn: fullNameEn,
                          nameCn: fullNameCn,
                          pens: finalPens,
                        }
                      : unit
                  ),
                }
              } else {
                // 新增模式
                return {
                  ...section,
                  units: [
                    ...section.units,
                    {
                      id: `unit-${Date.now()}`,
                      purpose: unitForm.purpose,
                      nameEn: fullNameEn,
                      nameCn: fullNameCn,
                      pens: finalPens,
                    },
                  ],
                }
              }
            }
            return section
          }),
        }
      }
      return zone
    })
    setZones(updatedZones)
    setData?.({ zones: updatedZones })
    setUnitForm({ purpose: '', nameEn: '', nameCn: '', pens: [] })
    setUnitNamePrefix({ nameEn: '', nameCn: '' })
    setPenColumns({})
    setPenRowForm({ start: '', end: '', type: '' })
    setSelectedZoneForUnit(null)
    setSelectedSectionForUnit(null)
    setEditingUnitId(null)
    setShowUnitModal(false)
  }

  const handleDeleteUnit = (zoneId: string, sectionId: string, unitId: string) => {
    if (window.confirm('确定要删除该单元吗？删除后该单元下的所有栏位都将被删除。')) {
      const updatedZones = zones.map(zone => {
        if (zone.id === zoneId) {
          return {
            ...zone,
            sections: zone.sections.map(section => {
              if (section.id === sectionId) {
                return {
                  ...section,
                  units: section.units.filter(unit => unit.id !== unitId),
                }
              }
              return section
            }),
          }
        }
        return zone
      })
      setZones(updatedZones)
      setData?.({ zones: updatedZones })
    }
  }

  const openEditUnit = (zoneId: string, sectionId: string, unitId: string) => {
    const zone = zones.find(z => z.id === zoneId)
    const section = zone?.sections.find(s => s.id === sectionId)
    const unit = section?.units.find(u => u.id === unitId)
    if (zone && section && unit) {
      // 设置前缀（不可编辑）
      setUnitNamePrefix({
        nameEn: `${zone.nameEn}-${section.nameEn}-`,
        nameCn: `${zone.nameCn}-${section.nameCn}-`,
      })
      // 从完整名称中提取单元名称部分
      const fullNameEn = unit.nameEn
      const fullNameCn = unit.nameCn
      const prefixEn = `${zone.nameEn}-${section.nameEn}-`
      const prefixCn = `${zone.nameCn}-${section.nameCn}-`
      const unitNameEn = fullNameEn.startsWith(prefixEn) ? fullNameEn.slice(prefixEn.length) : fullNameEn
      const unitNameCn = fullNameCn.startsWith(prefixCn) ? fullNameCn.slice(prefixCn.length) : fullNameCn
      
      setUnitForm({
        purpose: unit.purpose,
        nameEn: unitNameEn,
        nameCn: unitNameCn,
        pens: unit.pens || [],
      })
      // 将pens转换为penColumns格式
      setPenColumns(convertPensToPenColumns(unit.pens || []))
      setSelectedZoneForUnit(zoneId)
      setSelectedSectionForUnit(sectionId)
      setEditingUnitId(unitId)
      setPenRowForm({ start: '', end: '', type: '' })
      setShowUnitModal(true)
    }
  }


  // 获取单元显示名称（只显示单元名称部分，不包含前缀）
  const getUnitDisplayName = (zone: Zone, section: Section, unit: Unit): string => {
    const prefixCn = `${zone.nameCn}-${section.nameCn}-`
    if (unit.nameCn.startsWith(prefixCn)) {
      return unit.nameCn.slice(prefixCn.length)
    }
    // 如果格式不匹配，返回完整名称（兼容旧数据）
    return unit.nameCn
  }

  // 计算单元的总栏位数量
  const calculateTotalPens = (pens: Pen[]): number => {
    return pens.reduce((total, pen) => {
      const start = parseInt(pen.start, 10)
      const end = parseInt(pen.end, 10)
      if (!isNaN(start) && !isNaN(end) && end >= start) {
        return total + (end - start + 1)
      }
      return total
    }, 0)
  }

  const openUnitModal = (zoneId: string, sectionId: string) => {
    setSelectedZoneForUnit(zoneId)
    setSelectedSectionForUnit(sectionId)
    setEditingUnitId(null)
    const zone = zones.find(z => z.id === zoneId)
    const section = zone?.sections.find(s => s.id === sectionId)
    if (zone && section) {
      // 设置前缀（不可编辑）
      setUnitNamePrefix({
        nameEn: `${zone.nameEn}-${section.nameEn}-`,
        nameCn: `${zone.nameCn}-${section.nameCn}-`,
      })
      // 单元名称部分（用户可编辑）
      setUnitForm({
        purpose: '',
        nameEn: '',
        nameCn: '',
        pens: [],
      })
    }
    setPenColumns({})
    setPenRowForm({ start: '', end: '', type: '' })
    setShowUnitModal(true)
  }

  // 在当前列添加一行栏位
  const handleAddPenRow = (column: string) => {
    if (!penRowForm.start.trim() || !penRowForm.end.trim() || !penRowForm.type) return
    
    const newRow = {
      id: `pen-row-${Date.now()}`,
      start: penRowForm.start.trim(),
      end: penRowForm.end.trim(),
      type: penRowForm.type,
    }
    
    setPenColumns(prev => ({
      ...prev,
      [column]: [...(prev[column] || []), newRow],
    }))
    
    setPenRowForm({ start: '', end: '', type: '' })
  }

  // 删除栏位行
  const handleRemovePenRow = (column: string, rowId: string) => {
    setPenColumns(prev => ({
      ...prev,
      [column]: prev[column].filter(row => row.id !== rowId),
    }))
  }

  // 删除整个列
  const handleRemovePenColumn = (column: string) => {
    setPenColumns(prev => {
      const newColumns = { ...prev }
      delete newColumns[column]
      return newColumns
    })
  }

  // 获取可用的列名称（A-Z中未使用的）
  const getAvailableColumnNames = (): string[] => {
    const allColumns = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i))
    const usedColumns = Object.keys(penColumns)
    return allColumns.filter(col => !usedColumns.includes(col))
  }

  // 添加新列
  const handleAddNewColumn = (columnName: string) => {
    setPenColumns(prev => ({
      ...prev,
      [columnName]: [],
    }))
    setShowAddColumnModal(false)
  }

  const handleAddPenTypeRow = () => {
    const newItem: PenType = {
      id: `pen-type-${Date.now()}`,
      name: '',
      capacity: '',
      feedingStation: '',
      waterStation: '',
      isDefault: false,
    }
    const updated = [...penTypes, newItem]
    setPenTypes(updated)
    setData?.({ penTypes: updated })
    // 记录新建的类型ID，用于自动选中
    setNewlyCreatedPenTypeId(newItem.id)
  }

  const handleUpdatePenTypeRow = (id: string, patch: Partial<PenType>) => {
    const updated = penTypes.map((t) => (t.id === id ? { ...t, ...patch } : t))
    setPenTypes(updated)
    setData?.({ penTypes: updated })
  }

  const openDeletePenTypeModal = (penType: PenType) => {
    if (!penType.name.trim()) {
      const updated = penTypes.filter((t) => t.id !== penType.id)
      setPenTypes(updated)
      setData?.({ penTypes: updated })
      return
    }
    setPenTypeToDelete(penType)
    setDeletePenTypeConfirmName('')
    setDeletePenTypeError('')
    setShowDeletePenTypeModal(true)
  }

  const handleConfirmDeletePenType = () => {
    if (!penTypeToDelete) return
    const expected = penTypeToDelete.name.trim()
    const actual = deletePenTypeConfirmName.trim()
    if (!expected || expected !== actual) {
      setDeletePenTypeError('名称不匹配，请重新输入该栏位类型名称以确认删除。')
      return
    }
    const updated = penTypes.filter((t) => t.id !== penTypeToDelete.id)
    setPenTypes(updated)
    setData?.({ penTypes: updated })
    setShowDeletePenTypeModal(false)
    setPenTypeToDelete(null)
    setDeletePenTypeConfirmName('')
    setDeletePenTypeError('')
  }

  // 检查是否至少有一个完整的层级：Zone > Section > Unit > 栏位
  const hasCompleteHierarchy = zones.some(zone =>
    zone.sections.some(section =>
      section.units.some(unit =>
        unit.pens && unit.pens.length > 0
      )
    )
  )


  // 渲染配置预览
  const renderPreview = () => (
    <div className="form-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3>配置预览</h3>
        <button
          className="btn btn-primary"
          onClick={() => {
            setEditingZoneId(null)
            setZoneForm({ nameEn: '', nameCn: '' })
            setShowZoneModal(true)
          }}
        >
          + 添加区
        </button>
      </div>
      <div className="zone-preview">
        {zones.length === 0 ? (
          <div className="preview-empty">
            <p>暂无配置，请开始添加</p>
          </div>
        ) : (
          zones.map((zone) => (
            <div key={zone.id} className="zone-preview-item">
              <div 
              className="zone-preview-header"
              style={{ cursor: 'pointer' }}
              onClick={() => openEditZone(zone.id)}
            >
                <div className="zone-preview-icon zone-icon">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                    <path d="M2 8h16M7 4V2a1 1 0 0 1 1-1h2a1 1 0 0 1 1v2" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                </div>
                <div className="zone-preview-title">
                  <span className="zone-preview-label">区</span>
                  <span className="zone-preview-name">{zone.nameCn}</span>
                </div>
                <div className="zone-preview-count">
                  {zone.sections.length} 个区块
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedZoneForSection(zone.id)
                      setEditingSectionId(null)
                      setSectionForm({ nameEn: '', nameCn: '', previewImage: '' })
                      setSectionPreviewImage(null)
                      setShowSectionModal(true)
                    }}
                  >
                    + 添加区块
                  </button>
                  <button
                    className="btn btn-sm btn-outline"
                    style={{ color: '#ef4444', borderColor: '#ef4444' }}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteZone(zone.id)
                    }}
                  >
                    删除
                  </button>
                </div>
              </div>
              
              {zone.sections.length > 0 && (
                <div className="zone-preview-children">
                  {zone.sections.map((section) => (
                    <div key={section.id} className="section-preview-item">
                      <div 
                        className="section-preview-header"
                        style={{ cursor: 'pointer' }}
                        onClick={() => openEditSection(zone.id, section.id)}
                      >
                        <div className="zone-preview-icon section-icon">
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                            <path d="M2 7h12" stroke="currentColor" strokeWidth="1.5"/>
                          </svg>
                        </div>
                        <div className="section-preview-title">
                          <span className="section-preview-label">区块</span>
                          <span className="section-preview-name">{section.nameCn}</span>
                        </div>
                        <div className="section-preview-count">
                          {section.units.length} 个单元
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingUnitId(null)
                              openUnitModal(zone.id, section.id)
                            }}
                          >
                            + 添加单元
                          </button>
                          <button
                            className="btn btn-sm btn-outline"
                            style={{ color: '#ef4444', borderColor: '#ef4444' }}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteSection(zone.id, section.id)
                            }}
                          >
                            删除
                          </button>
                        </div>
                      </div>
                      
                      {section.units.length > 0 && (
                        <div className="section-preview-children">
                          {section.units.map((unit) => (
                            <div 
                              key={unit.id} 
                              className="unit-preview-item"
                              style={{ cursor: 'pointer' }}
                              onClick={() => openEditUnit(zone.id, section.id, unit.id)}
                            >
                              <div className="zone-preview-icon unit-icon">
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                  <rect x="1.5" y="2.5" width="11" height="9" rx="1" stroke="currentColor" strokeWidth="1.2" fill="none"/>
                                  <circle cx="7" cy="7" r="1.5" fill="currentColor"/>
                                </svg>
                              </div>
                              <div className="unit-preview-title">
                                <span className="unit-preview-label">单元</span>
                                <span className="unit-preview-name">{getUnitDisplayName(zone, section, unit)}</span>
                              </div>
                              {unit.pens.length > 0 && (
                                <div className="section-preview-count">{calculateTotalPens(unit.pens)}个栏位</div>
                              )}
                              <button
                                className="btn btn-sm btn-outline"
                                style={{ color: '#ef4444', borderColor: '#ef4444', marginLeft: '0.5rem' }}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteUnit(zone.id, section.id, unit.id)
                                }}
                              >
                                删除
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )

  // 渲染介绍页面
  const renderIntro = () => (
    <div className="step-content">
      <div className="hierarchy-intro">
        <div className="hierarchy-intro-header">
          <h2>厂区布局配置</h2>
        </div>

        {/* 结构映射引导 */}
        <div style={{ marginTop: '2rem', marginBottom: '2rem' }}>
          <StructureMappingGuide />
        </div>

        {/* 层级结构说明 */}
        <div className="hierarchy-structure">
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: 600, color: '#0c4a6e' }}>
            层级结构说明
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div className="hierarchy-level">
              <div className="hierarchy-level-header">
                <div className="hierarchy-level-icon" style={{ fontSize: '1.5rem' }}>🏢</div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0c4a6e', margin: '0 0 0.5rem 0' }}>区 (Zone)</h4>
                  <p style={{ fontSize: '0.95rem', color: '#075985', margin: 0, lineHeight: 1.6 }}>猪场的第一级划分，通常按地理位置或功能属性命名。 例如：生产一区、生产二区、生活区、隔离区。</p>
                </div>
              </div>
            </div>

            <div className="hierarchy-arrow">↓</div>

            <div className="hierarchy-level">
              <div className="hierarchy-level-header">
                <div className="hierarchy-level-icon" style={{ fontSize: '1.5rem' }}>🏗️</div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0c4a6e', margin: '0 0 0.5rem 0' }}>区块 (Section)</h4>
                  <p style={{ fontSize: '0.95rem', color: '#075985', margin: 0, lineHeight: 1.6 }}>对应"区"内独立的栋舍或生产车间。 例如：配怀车间、分娩车间。</p>
                </div>
              </div>
            </div>

            <div className="hierarchy-arrow">↓</div>

            <div className="hierarchy-level">
              <div className="hierarchy-level-header">
                <div className="hierarchy-level-icon" style={{ fontSize: '1.5rem' }}>🏠</div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0c4a6e', margin: '0 0 0.5rem 0' }}>单元 & 栏位 (Unit & Pen)</h4>
                  <p style={{ fontSize: '0.95rem', color: '#075985', margin: 0, lineHeight: 1.6 }}>对应栋舍内的具体房间（单元）与隔间（栏位）。 例如："配怀车间"下的"配怀一舍、配怀二舍"。"配怀一舍"下的"A1 - A10 号栏位"、"B1 - B10 号栏位"。</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 为什么要完成厂区布局 */}
        <div className="hierarchy-why">
          <h3>为什么要完成厂区布局？</h3>
          <ul className="hierarchy-why-list">
            <li>
              <strong>精准任务定位</strong>
              系统需要知道任务应该下发到哪个具体的栏位，只有配置了完整的层级结构，才能准确定位。
            </li>
            <li>
              <strong>智能数据管理</strong>
              通过层级结构，系统可以自动汇总各层级的数据，帮助您更好地了解生产情况。
            </li>
            <li>
              <strong>告警联动</strong>
              当某个栏位出现异常时，系统可以快速定位到具体的区、区块、单元，便于及时处理。
            </li>
            <li>
              <strong>视频回放定位</strong>
              查看监控视频时，可以快速定位到对应的栏位位置，提高管理效率。
            </li>
          </ul>
        </div>

        {/* 开始按钮 */}
        <div className="hierarchy-start">
          <button className="btn btn-primary" style={{ padding: '0.75rem 2rem', fontSize: '1.1rem', fontWeight: 600 }} onClick={() => setShowIntro(false)}>
            开始配置
          </button>
        </div>
      </div>
    </div>
  )

  // 渲染主页面（单页面视图）
  const renderMainPage = () => (
    <div className="step-content">
      <div className="step-form">
        {/* 标题和提示信息 */}
        <div className="step-header-section">
          <h2 className="step-main-title">将您的线下猪场结构，1:1 复刻到这里。</h2>
          <p className="step-sub-title">请建立至少一条完整的结构（从区 ➡️ 栏位），后续可随时在"设置-厂区布局"中补充。</p>
        </div>

        {/* 配置预览 */}
        {renderPreview()}

        {/* 操作按钮 */}
        <div className="step-actions">
          <div className="step-actions-left">
            {onBack && (
              <button
                className="btn btn-secondary"
                onClick={onBack}
              >
                返回
              </button>
            )}
          </div>
          <div className="step-actions-right">
            <button
              className="btn btn-primary"
              onClick={onNext}
              disabled={!hasCompleteHierarchy}
            >
              完成配置
            </button>
          </div>
        </div>

        {/* 帮助提示 */}
        <div className="help-section">
          <p className="help-text">
            点这里查看{' '}
            <a 
              href="/console/help/zone-config" 
              target="_blank" 
              rel="noopener noreferrer"
              className="help-link"
            >
              用户手册
            </a>
            ，如果问题仍未解决，欢迎发送邮件至{' '}
            <a 
              href="mailto:support@example.com" 
              className="help-email"
            >
              support@example.com
            </a>
            ，我们将尽快回复并协助您解决问题。
          </p>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {showIntro ? renderIntro() : renderMainPage()}
      
      {/* 添加/编辑区的模态框 */}
      {showZoneModal && (
        <div className="modal-overlay" onClick={() => {
          setShowZoneModal(false)
          setEditingZoneId(null)
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingZoneId ? '编辑区' : '添加区'}</h3>
              <button className="modal-close" onClick={() => {
                setShowZoneModal(false)
                setEditingZoneId(null)
              }}>×</button>
            </div>
            <div className="modal-body">
              <p className="modal-hint">"区"是猪场的第一级划分，通常按 地理位置（如 一区，二区）或 功能属性（如生产区，生活区、隔离区）来命名。</p>
              <div className="form-field">
                <label>英文名称<span className="required">*</span></label>
                <input
                  type="text"
                  placeholder="请输入英文名称"
                  value={zoneForm.nameEn}
                  onChange={(e) => setZoneForm({ ...zoneForm, nameEn: e.target.value })}
                />
              </div>
              <div className="form-field">
                <label>中文名称<span className="required">*</span></label>
                <input
                  type="text"
                  placeholder="请输入中文名称"
                  value={zoneForm.nameCn}
                  onChange={(e) => setZoneForm({ ...zoneForm, nameCn: e.target.value })}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => {
                setShowZoneModal(false)
                setEditingZoneId(null)
                setZoneForm({ nameEn: '', nameCn: '' })
              }}>
                关闭
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAddZone}
                disabled={!zoneForm.nameEn.trim() || !zoneForm.nameCn.trim()}
              >
                {editingZoneId ? '保存' : '确认'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 添加/编辑区块的模态框 */}
      {showSectionModal && (
        <div className="modal-overlay" onClick={() => {
          setShowSectionModal(false)
          setEditingSectionId(null)
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingSectionId ? '编辑区块' : `给${selectedZoneForSection && zones.find(z => z.id === selectedZoneForSection)?.nameCn}添加区块`}</h3>
              <button className="modal-close" onClick={() => {
                setShowSectionModal(false)
                setEditingSectionId(null)
              }}>×</button>
            </div>
            <div className="modal-body">
              <p className="modal-hint">对应"区"内独立的栋舍或生产车间。 例如：配怀车间、分娩车间。</p>
              <div className="form-field">
                <label>英文名称<span className="required">*</span></label>
                <input
                  type="text"
                  placeholder="请输入英文名称"
                  value={sectionForm.nameEn}
                  onChange={(e) => setSectionForm({ ...sectionForm, nameEn: e.target.value })}
                />
              </div>
              <div className="form-field">
                <label>中文名称<span className="required">*</span></label>
                <input
                  type="text"
                  placeholder="请输入中文名称"
                  value={sectionForm.nameCn}
                  onChange={(e) => setSectionForm({ ...sectionForm, nameCn: e.target.value })}
                />
              </div>
              <div className="form-field">
                <label className="form-field-label-with-info">
                  上传区块预览图
                  <button
                    type="button"
                    className="info-icon-btn"
                    onClick={(e) => {
                      e.preventDefault()
                      setShowPreviewImageInfo(true)
                    }}
                    title="查看说明"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                      <path d="M8 6v4M8 4h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                </label>
                <div className="preview-image-upload">
                  {sectionPreviewImage ? (
                    <div className="preview-image-container">
                      <img src={sectionPreviewImage} alt="区块预览图" className="preview-image-preview" />
                      <button
                        type="button"
                        className="preview-image-remove"
                        onClick={handleRemoveSectionPreviewImage}
                        title="删除图片"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <label className="preview-image-upload-area">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleSectionPreviewImageChange}
                        style={{ display: 'none' }}
                      />
                      <div className="preview-image-upload-icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                          <path d="M12 15v6M9 18h6M7 10l5-5 5 5M7 10h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <p className="preview-image-upload-text">点击上传图片</p>
                      <p className="preview-image-upload-hint">支持 JPG、PNG 格式，最大 5MB</p>
                    </label>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => {
                setShowSectionModal(false)
                setEditingSectionId(null)
                setSectionForm({ nameEn: '', nameCn: '', previewImage: '' })
                setSectionPreviewImage(null)
                setSelectedZoneForSection(null)
              }}>
                关闭
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAddSection}
                disabled={
                  !selectedZoneForSection ||
                  !sectionForm.nameEn.trim() ||
                  !sectionForm.nameCn.trim()
                }
              >
                {editingSectionId ? '保存' : '确认'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 添加/编辑单元的模态框 */}
      {showUnitModal && (
        <div className="modal-overlay" onClick={() => {
          setShowUnitModal(false)
          setEditingUnitId(null)
          setUnitForm({ purpose: '', nameEn: '', nameCn: '', pens: [] })
          setUnitNamePrefix({ nameEn: '', nameCn: '' })
          setPenColumns({})
          setPenRowForm({ start: '', end: '', type: '' })
        }}>
          <div className="modal-content modal-content-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingUnitId ? '编辑单元' : `添加单元到${selectedZoneForUnit && selectedSectionForUnit && 
                `${zones.find(z => z.id === selectedZoneForUnit)?.nameCn}-${zones.find(z => z.id === selectedZoneForUnit)?.sections.find(s => s.id === selectedSectionForUnit)?.nameCn}`}`}</h3>
              <button className="modal-close" onClick={() => {
                setShowUnitModal(false)
                setEditingUnitId(null)
                setUnitForm({ purpose: '', nameEn: '', nameCn: '', pens: [] })
                setUnitNamePrefix({ nameEn: '', nameCn: '' })
                setPenColumns({})
                setPenRowForm({ start: '', end: '', type: '' })
              }}>×</button>
            </div>
            <div className="modal-body">
              <p className="modal-hint">对应”区块“（车间）内的具体单元（房间）与栏位。 例如："配怀车间"下的"配怀一舍、配怀二舍"。"配怀一舍"下的"A1 - A10 号栏位"、"B1 - B10 号栏位"。</p>
              <div className="unit-form-section">
                <h4>基本信息</h4>
                <div className="form-row">
                  <div className="form-field">
                    <label>单元用途</label>
                    <select
                      value={unitForm.purpose}
                      onChange={(e) => setUnitForm({ ...unitForm, purpose: e.target.value })}
                    >
                      <option value="">请选择单元用途</option>
                      {unitPurposeOptions.map((purpose) => (
                        <option key={purpose} value={purpose}>
                          {purpose}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-field">
                    <label>英文名称</label>
                    <div className="unit-name-input-wrapper">
                      <span className="unit-name-prefix">{unitNamePrefix.nameEn}</span>
                      <input
                        type="text"
                        value={unitForm.nameEn}
                        onChange={(e) => setUnitForm({ ...unitForm, nameEn: e.target.value })}
                        placeholder="请输入单元名称"
                        className="unit-name-input"
                      />
                    </div>
                  </div>
                  <div className="form-field">
                    <label>中文名称</label>
                    <div className="unit-name-input-wrapper">
                      <span className="unit-name-prefix">{unitNamePrefix.nameCn}</span>
                      <input
                        type="text"
                        value={unitForm.nameCn}
                        onChange={(e) => setUnitForm({ ...unitForm, nameCn: e.target.value })}
                        placeholder="请输入单元名称"
                        className="unit-name-input"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="unit-form-section">
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <h4 style={{ margin: 0 }}>栏位</h4>
                  <StallNamingGuide />
                </div>
                
                {/* 按列分组的栏位列表 */}
                {Object.keys(penColumns).sort().map((column) => (
                  <div key={column} className="pen-column-group">
                    <div className="pen-column-header">
                      <span className="pen-column-label">{column}</span>
                      <button
                        className="btn-icon-small"
                        onClick={() => handleRemovePenColumn(column)}
                        title="删除该列"
                      >
                        🗑️
                      </button>
                    </div>
                    <div className="pen-column-content">
                      {penColumns[column].map((row) => (
                        <div key={row.id} className="pen-row-item pen-row-data">
                          <input
                            type="text"
                            placeholder="请输入起始号"
                            value={row.start}
                            onChange={(e) => {
                              setPenColumns(prev => ({
                                ...prev,
                                [column]: prev[column].map(r => 
                                  r.id === row.id ? { ...r, start: e.target.value } : r
                                ),
                              }))
                            }}
                            style={{ maxWidth: '100px', flex: '0 1 auto' }}
                          />
                          <input
                            type="text"
                            placeholder="请输入结束号"
                            value={row.end}
                            onChange={(e) => {
                              setPenColumns(prev => ({
                                ...prev,
                                [column]: prev[column].map(r => 
                                  r.id === row.id ? { ...r, end: e.target.value } : r
                                ),
                              }))
                            }}
                            style={{ maxWidth: '100px', flex: '0 1 auto' }}
                          />
                          <div className="pen-type-select-wrapper" style={{ flex: '1 1 auto', minWidth: '150px', maxWidth: '300px' }}>
                            <select
                              value={row.type}
                              onChange={(e) => {
                                if (e.target.value === '__create_new__') {
                                  // 点击了"新建栏位类型"
                                  setPenTypeSelectorContext({ type: 'row', column, rowId: row.id })
                                  setShowPenTypeModal(true)
                                } else {
                                  setPenColumns(prev => ({
                                    ...prev,
                                    [column]: prev[column].map(r => 
                                      r.id === row.id ? { ...r, type: e.target.value } : r
                                    ),
                                  }))
                                }
                              }}
                            >
                              <option value="">栏位类型</option>
                              {getPenTypeOptions().length === 0 ? (
                                <option value="__empty__" disabled>暂无可选类型 请先配置栏位类型</option>
                              ) : (
                                <>
                                  {getPenTypeOptions().map((type) => (
                                    <option key={type} value={type}>
                                      {type}
                                    </option>
                                  ))}
                                  <option value="__create_new__" style={{ fontWeight: 'bold', color: '#646cff' }}>
                                    + 新建栏位类型
                                  </option>
                                </>
                              )}
                            </select>
                            {getPenTypeOptions().length === 0 && (
                              <div className="pen-type-empty-state">
                                <p className="empty-state-text">暂无可选类型</p>
                                <p className="empty-state-hint">请先配置栏位类型，配置后即可在此选择。</p>
                                <button
                                  className="btn btn-sm btn-primary"
                                  onClick={() => {
                                    setPenTypeSelectorContext({ type: 'row', column, rowId: row.id })
                                    setShowPenTypeModal(true)
                                  }}
                                >
                                  + 立即配置
                                </button>
                              </div>
                            )}
                          </div>
                          <button
                            className="btn-icon-small pen-row-delete-btn"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              handleRemovePenRow(column, row.id)
                            }}
                            title="删除该行"
                            type="button"
                          >
                            🗑️
                          </button>
                        </div>
                      ))}
                      {/* 当前列的添加行表单 */}
                      <div className="pen-row-item">
                        <input
                          type="text"
                          placeholder="请输入起始号"
                          value={penRowForm.start}
                          onChange={(e) => setPenRowForm({ ...penRowForm, start: e.target.value })}
                          style={{ maxWidth: '100px' }}
                        />
                        <input
                          type="text"
                          placeholder="请输入结束号"
                          value={penRowForm.end}
                          onChange={(e) => setPenRowForm({ ...penRowForm, end: e.target.value })}
                          style={{ maxWidth: '100px' }}
                        />
                        <div className="pen-type-select-wrapper">
                          <select
                            value={penRowForm.type}
                            onChange={(e) => {
                              if (e.target.value === '__create_new__') {
                                // 点击了"新建栏位类型"
                                setPenTypeSelectorContext({ type: 'form' })
                                setShowPenTypeModal(true)
                              } else {
                                setPenRowForm({ ...penRowForm, type: e.target.value })
                              }
                            }}
                          >
                            <option value="">栏位类型</option>
                            {getPenTypeOptions().length === 0 ? (
                              <option value="__empty__" disabled>暂无可选类型 请先配置栏位类型</option>
                            ) : (
                              <>
                                {getPenTypeOptions().map((type) => (
                                  <option key={type} value={type}>
                                    {type}
                                  </option>
                                ))}
                                <option value="__create_new__" style={{ fontWeight: 'bold', color: '#646cff' }}>
                                  + 新建栏位类型
                                </option>
                              </>
                            )}
                          </select>
                          {getPenTypeOptions().length === 0 && (
                            <div className="pen-type-empty-state">
                              <p className="empty-state-text">暂无可选类型</p>
                              <p className="empty-state-hint">请先配置栏位类型，配置后即可在此选择。</p>
                              <button
                                className="btn btn-sm btn-primary"
                                onClick={() => {
                                  setPenTypeSelectorContext({ type: 'form' })
                                  setShowPenTypeModal(true)
                                }}
                              >
                                + 立即配置
                              </button>
                            </div>
                          )}
                        </div>
                        <div style={{ width: '32px' }}></div>
                      </div>
                      {/* 添加按钮单独一行 */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                        <button
                          className="btn-icon-small btn-add"
                          onClick={() => handleAddPenRow(column)}
                          disabled={!penRowForm.start.trim() || !penRowForm.end.trim() || !penRowForm.type}
                          title="添加一行"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* 添加栏位按钮 */}
                <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                  <button
                    className="btn btn-outline"
                    onClick={() => setShowAddColumnModal(true)}
                    disabled={getAvailableColumnNames().length === 0}
                  >
                    + 添加栏位
                  </button>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => {
                setShowUnitModal(false)
                setEditingUnitId(null)
                setUnitForm({ purpose: '', nameEn: '', nameCn: '', pens: [] })
                setUnitNamePrefix({ nameEn: '', nameCn: '' })
                setPenColumns({})
                setPenRowForm({ start: '', end: '', type: '' })
                setSelectedZoneForUnit(null)
                setSelectedSectionForUnit(null)
              }}>
                关闭
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAddUnit}
                disabled={
                  !unitForm.nameEn.trim() || 
                  !unitForm.nameCn.trim() || 
                  Object.keys(penColumns).length === 0 ||
                  Object.values(penColumns).every(rows => rows.length === 0)
                }
              >
                {editingUnitId ? '保存' : '完成'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 添加栏位弹窗 - 选择列名称 */}
      {showAddColumnModal && (
        <div className="modal-overlay" onClick={() => setShowAddColumnModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>选择新创列名称</h3>
              <button className="modal-close" onClick={() => setShowAddColumnModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-field">
                <label>名称</label>
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddNewColumn(e.target.value)
                    }
                  }}
                  style={{ width: '100%', padding: '0.5rem' }}
                >
                  <option value="">请选择列名称</option>
                  {getAvailableColumnNames().map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAddColumnModal(false)}>
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 配置栏位类型弹窗 */}
      {showPenTypeModal && (
        <div className="modal-overlay" onClick={() => setShowPenTypeModal(false)}>
          <div className="modal-content modal-content-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>配置栏位类型</h3>
              <button className="modal-close" onClick={() => setShowPenTypeModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p className="modal-hint">栏位类型即栏位的"标准规格"（容量、饲喂站、喝水站等）。配置好规格后，后续新建栏位时可直接套用，无需重复填写。</p>
              
              <div className="pen-type-table">
                {penTypes.length === 0 ? (
                  <div className="pen-type-empty">
                    暂无栏位类型，点击右下角"+"开始配置。
                  </div>
                ) : (
                  penTypes.map((t, index) => (
                    <div key={t.id} className="pen-type-row">
                      <div className="pen-type-index">
                        <span>{index + 1}</span>
                      </div>
                      <div className="pen-type-field">
                        <label>名称</label>
                        <input
                          type="text"
                          placeholder="请输入名称"
                          value={t.name}
                          onChange={(e) => handleUpdatePenTypeRow(t.id, { name: e.target.value })}
                        />
                      </div>
                      <div className="pen-type-field">
                        <label>容量</label>
                        <input
                          type="number"
                          min={0}
                          placeholder="请输入容量"
                          value={t.capacity}
                          onChange={(e) => handleUpdatePenTypeRow(t.id, { capacity: e.target.value })}
                        />
                      </div>
                      <div className="pen-type-field">
                        <label>饲喂站</label>
                        <input
                          type="number"
                          min={0}
                          placeholder="请输入饲喂站数量"
                          value={t.feedingStation}
                          onChange={(e) => handleUpdatePenTypeRow(t.id, { feedingStation: e.target.value })}
                        />
                      </div>
                      <div className="pen-type-field">
                        <label>喝水站</label>
                        <input
                          type="number"
                          min={0}
                          placeholder="请输入喝水站数量"
                          value={t.waterStation}
                          onChange={(e) => handleUpdatePenTypeRow(t.id, { waterStation: e.target.value })}
                        />
                      </div>
                      <div className="pen-type-actions">
                        <button
                          type="button"
                          className="btn-icon-small"
                          onClick={() => openDeletePenTypeModal(t)}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))
                )}

                <div className="pen-type-footer">
                  <button type="button" className="btn btn-sm btn-outline" onClick={handleAddPenTypeRow}>
                    +
                  </button>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => {
                // 如果有新建的类型且有关联的选择器上下文，自动选中
                if (newlyCreatedPenTypeId && penTypeSelectorContext) {
                  const newType = penTypes.find(t => t.id === newlyCreatedPenTypeId)
                  if (newType && newType.name.trim()) {
                    if (penTypeSelectorContext.type === 'row' && penTypeSelectorContext.column && penTypeSelectorContext.rowId) {
                      // 更新已存在的行
                      setPenColumns(prev => ({
                        ...prev,
                        [penTypeSelectorContext.column!]: prev[penTypeSelectorContext.column!].map(r => 
                          r.id === penTypeSelectorContext.rowId ? { ...r, type: newType.name.trim() } : r
                        ),
                      }))
                    } else if (penTypeSelectorContext.type === 'form') {
                      // 更新表单中的类型
                      setPenRowForm(prev => ({ ...prev, type: newType.name.trim() }))
                    }
                  }
                }
                setShowPenTypeModal(false)
                setPenTypeSelectorContext(null)
                setNewlyCreatedPenTypeId(null)
              }}>
                完成
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除栏位类型确认模态框 */}
      {showDeletePenTypeModal && penTypeToDelete && (
        <div className="modal-overlay" onClick={() => setShowDeletePenTypeModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>删除</h3>
              <button className="modal-close" onClick={() => setShowDeletePenTypeModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '0.5rem' }}>是否确认删除该栏位类型？</p>
              <p style={{ marginBottom: '0.5rem', color: '#6b7280' }}>该类型下的所有栏位将恢复为默认类型。</p>
              <p style={{ marginBottom: '1rem', color: '#6b7280' }}>请输入此栏位类型的名称进行确认：</p>
              <div className="form-field">
                <input
                  type="text"
                  placeholder="请输入名称"
                  value={deletePenTypeConfirmName}
                  onChange={(e) => {
                    setDeletePenTypeConfirmName(e.target.value)
                    setDeletePenTypeError('')
                  }}
                />
                {deletePenTypeError && (
                  <p className="form-error">{deletePenTypeError}</p>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDeletePenTypeModal(false)}>
                关闭
              </button>
              <button
                className="btn btn-primary"
                onClick={handleConfirmDeletePenType}
                disabled={!deletePenTypeConfirmName.trim()}
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 区块预览图说明弹窗 */}
      {showPreviewImageInfo && (
        <div className="modal-overlay" onClick={() => setShowPreviewImageInfo(false)}>
          <div className="modal-content modal-content-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>区块预览图说明</h3>
              <button className="modal-close" onClick={() => setShowPreviewImageInfo(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="preview-image-info-content">
                <div className="preview-image-info-text">
                  <p style={{ marginBottom: '1rem', fontSize: '1rem', lineHeight: '1.6' }}>
                    <strong>为什么要上传区块预览图？</strong>
                  </p>
                  <p style={{ marginBottom: '1.5rem', color: '#4b5563', lineHeight: '1.6' }}>
                    上传区块预览图可以帮助您在查看生物安全监控时，快速识别监控画面对应的具体区块位置。当您在监控系统中查看某个区域的实时画面或回放时，可以通过预览图直观地了解该画面对应您厂区的哪一部分。
                  </p>
                  <p style={{ marginBottom: '1rem', fontSize: '1rem', lineHeight: '1.6' }}>
                    <strong>示例图：</strong>
                  </p>
                </div>
                <div className="preview-image-info-example">
                  <div className="preview-image-info-example-placeholder">
                    <svg width="120" height="120" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.3 }}>
                      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
                      <path d="M3 9h18M9 3v18" stroke="currentColor" strokeWidth="2"/>
                      <circle cx="8" cy="7" r="1" fill="currentColor"/>
                      <circle cx="16" cy="7" r="1" fill="currentColor"/>
                      <circle cx="8" cy="15" r="1" fill="currentColor"/>
                      <circle cx="16" cy="15" r="1" fill="currentColor"/>
                    </svg>
                    <p style={{ marginTop: '1rem', color: '#9ca3af', fontSize: '0.9rem' }}>
                      示例：区块平面图或示意图
                    </p>
                  </div>
                </div>
                <div className="preview-image-info-tips">
                  <p style={{ marginTop: '1.5rem', marginBottom: '0.5rem', fontSize: '0.95rem', fontWeight: 600 }}>
                    提示：
                  </p>
                  <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#4b5563', lineHeight: '1.8' }}>
                    <li>建议上传区块的平面图、示意图或照片</li>
                    <li>图片应清晰展示区块的布局和关键位置</li>
                    <li>支持 JPG、PNG 格式，最大 5MB</li>
                    <li>如果暂时没有预览图，可以稍后在区块管理中补充</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setShowPreviewImageInfo(false)}>
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default StepZoneConfig
