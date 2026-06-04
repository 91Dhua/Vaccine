import { useState } from 'react'
import './StepCommon.css'

interface StepAddPigsProps {
  onNext: () => void
  onSkip?: () => void
  data?: any
  setData?: (data: any) => void
}

/**
 * 步骤 3：添加猪只
 * 可以跳过
 * 
 * 根据业务背景：
 * - 支持通过 Excel 模板批量添加猪只
 * - 为了快速完成 onboarding，只保留批量导入功能
 */
function StepAddPigs({ data, setData }: StepAddPigsProps) {
  const [pigs, setPigs] = useState(data?.['add-pigs']?.pigs || [])

  // 从第一步（厂区配置）的数据中获取 Zone 列表
  const availableZones = data?.['zone-config']?.zones || data?.zones || []

  const handleDownloadTemplate = () => {
    alert('Excel 模板下载功能（Demo 中仅演示）')
  }

  const handleUploadExcel = () => {
    // 模拟上传
    const mockUploaded = 5
    const newPigs = Array.from({ length: mockUploaded }, (_, i) => ({
      id: `pig-batch-${Date.now()}-${i}`,
      earTag: `PIG${String(pigs.length + i + 1).padStart(4, '0')}`,
      zoneId: availableZones[0]?.id || '',
      zoneName: availableZones[0]?.nameCn || availableZones[0]?.name || '',
      status: 'normal',
    }))
    const updatedPigs = [...pigs, ...newPigs]
    setPigs(updatedPigs)
    setData?.({ pigs: updatedPigs })
    alert(`成功导入 ${mockUploaded} 头猪只`)
  }

  const handleDeletePig = (pigId: string) => {
    const updatedPigs = pigs.filter((pig: any) => pig.id !== pigId)
    setPigs(updatedPigs)
    setData?.({ pigs: updatedPigs })
  }

  return (
    <div className="step-content">
      <div className="step-form">
        <div className="step-info-box">
          <p>通过 Excel 模板批量导入猪只数据，也可以稍后在"猪群概览 {'>'} 猪只"中进行添加。</p>
        </div>

        {/* 批量导入步骤 */}
        <div className="form-section">
          <div className="batch-import-container">
            <div className="import-steps">
              <div className="import-step">
                <div className="import-step-number">1</div>
                <div className="import-step-content">
                  <div className="import-step-title">下载模板</div>
                  <div className="import-step-desc">下载 Excel 导入模板</div>
                  <button
                    className="btn btn-primary"
                    onClick={handleDownloadTemplate}
                  >
                    下载模板
                  </button>
                </div>
              </div>
              <div className="import-step">
                <div className="import-step-number">2</div>
                <div className="import-step-content">
                  <div className="import-step-title">填写数据</div>
                  <div className="import-step-desc">按照模板格式填写猪只信息</div>
                </div>
              </div>
              <div className="import-step">
                <div className="import-step-number">3</div>
                <div className="import-step-content">
                  <div className="import-step-title">上传文件</div>
                  <div className="import-step-desc">上传填写好的 Excel 文件</div>
                  <button
                    className="btn btn-primary"
                    onClick={handleUploadExcel}
                  >
                    上传文件（演示）
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 已导入的猪只列表 */}
        {pigs.length > 0 && (
          <div className="form-section">
            <h3>已导入的猪只（共 {pigs.length} 头）</h3>
            <div className="list-box">
              {pigs.slice(0, 10).map((pig: any) => (
                <div key={pig.id} className="list-item">
                  <div className="list-item-content">
                    <div className="list-item-title">耳标：{pig.earTag}</div>
                    <div className="list-item-meta">所在区域：{pig.zoneName}</div>
                  </div>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDeletePig(pig.id)}
                  >
                    删除
                  </button>
                </div>
              ))}
              {pigs.length > 10 && (
                <div className="list-item-more">
                  还有 {pigs.length - 10} 头猪只...
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default StepAddPigs