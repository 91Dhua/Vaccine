import { AppstoreOutlined, BankOutlined, HomeOutlined } from '@ant-design/icons'
import './StructureMappingGuide.css'

interface StructureMappingGuideProps {
  className?: string
}

function StructureMappingGuide({ className = '' }: StructureMappingGuideProps) {
  return (
    <div className={`structure-mapping-guide ${className}`}>
      <div className="mapping-header">
        <h2 className="mapping-title">如何将您的猪场搬进系统？(映射示例)</h2>
      </div>

      <div className="mapping-container">
        {/* Left Column: 优化的厂区平面图 (SVG) */}
        <div className="mapping-left">
          <div className="mapping-left-header">
            <h3 className="mapping-section-title">物理厂区平面图</h3>
          </div>
          <div className="mapping-svg-container">
            <svg
              width="500"
              height="600"
              viewBox="0 0 500 600"
              className="mapping-svg"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Zone A: 隔离区 (顶部) */}
              <rect
                x="20"
                y="20"
                width="460"
                height="120"
                fill="rgba(239, 68, 68, 0.1)"
                stroke="rgba(239, 68, 68, 0.5)"
                strokeWidth="2"
                strokeDasharray="8 4"
                rx="4"
              />
              <text
                x="250"
                y="70"
                textAnchor="middle"
                fill="#ef4444"
                fontSize="16"
                fontWeight="600"
                className="svg-label"
              >
                隔离区 (Zone)
              </text>

              {/* Zone B: 生活区 (中间上) */}
              <rect
                x="20"
                y="160"
                width="460"
                height="100"
                fill="rgba(59, 130, 246, 0.1)"
                stroke="rgba(59, 130, 246, 0.5)"
                strokeWidth="2"
                strokeDasharray="8 4"
                rx="4"
              />
              <text
                x="250"
                y="205"
                textAnchor="middle"
                fill="#3b82f6"
                fontSize="16"
                fontWeight="600"
                className="svg-label"
              >
                生活区 (Zone)
              </text>

              {/* Zone C: 生产 1 区 (左下) */}
              <rect
                x="20"
                y="280"
                width="220"
                height="300"
                fill="rgba(16, 185, 129, 0.1)"
                stroke="rgba(16, 185, 129, 0.5)"
                strokeWidth="2"
                strokeDasharray="8 4"
                rx="4"
              />
              <text
                x="130"
                y="310"
                textAnchor="middle"
                fill="#10b981"
                fontSize="16"
                fontWeight="600"
                className="svg-label"
              >
                生产 1 区
              </text>

              {/* 分娩车间内部结构 */}
              {/* 分娩 1 舍 */}
              <rect
                x="40"
                y="340"
                width="180"
                height="100"
                fill="#fef3c7"
                stroke="#f59e0b"
                strokeWidth="1.5"
                rx="3"
              />
              <text
                x="130"
                y="385"
                textAnchor="middle"
                fill="#92400e"
                fontSize="14"
                fontWeight="500"
                className="svg-unit-label"
              >
                分娩 1 舍
              </text>

              {/* 分娩 2 舍 */}
              <rect
                x="40"
                y="460"
                width="180"
                height="100"
                fill="#fef3c7"
                stroke="#f59e0b"
                strokeWidth="1.5"
                rx="3"
              />
              <text
                x="130"
                y="505"
                textAnchor="middle"
                fill="#92400e"
                fontSize="14"
                fontWeight="500"
                className="svg-unit-label"
              >
                分娩 2 舍
              </text>

              {/* Zone D: 生产 2 区 (右下) */}
              <rect
                x="260"
                y="280"
                width="220"
                height="300"
                fill="rgba(16, 185, 129, 0.1)"
                stroke="rgba(16, 185, 129, 0.5)"
                strokeWidth="2"
                strokeDasharray="8 4"
                rx="4"
              />
              <text
                x="370"
                y="310"
                textAnchor="middle"
                fill="#10b981"
                fontSize="16"
                fontWeight="600"
                className="svg-label"
              >
                生产 2 区
              </text>

              {/* 保育车间内部结构 */}
              {/* 保育 1 舍 */}
              <rect
                x="280"
                y="340"
                width="110"
                height="80"
                fill="#fef3c7"
                stroke="#f59e0b"
                strokeWidth="1.5"
                rx="3"
              />
              <text
                x="335"
                y="375"
                textAnchor="middle"
                fill="#92400e"
                fontSize="12"
                fontWeight="500"
                className="svg-unit-label"
              >
                保育 1 舍
              </text>

              {/* 保育 2 舍 */}
              <rect
                x="400"
                y="340"
                width="110"
                height="80"
                fill="#fef3c7"
                stroke="#f59e0b"
                strokeWidth="1.5"
                rx="3"
              />
              <text
                x="455"
                y="375"
                textAnchor="middle"
                fill="#92400e"
                fontSize="12"
                fontWeight="500"
                className="svg-unit-label"
              >
                保育 2 舍
              </text>

              {/* 保育 3 舍 */}
              <rect
                x="340"
                y="440"
                width="110"
                height="80"
                fill="#fef3c7"
                stroke="#f59e0b"
                strokeWidth="1.5"
                rx="3"
              />
              <text
                x="395"
                y="475"
                textAnchor="middle"
                fill="#92400e"
                fontSize="12"
                fontWeight="500"
                className="svg-unit-label"
              >
                保育 3 舍
              </text>

              {/* 育肥车间内部结构 */}
              {/* 育肥 1 舍 */}
              <rect
                x="280"
                y="540"
                width="180"
                height="30"
                fill="#fef3c7"
                stroke="#f59e0b"
                strokeWidth="1.5"
                rx="3"
              />
              <text
                x="370"
                y="558"
                textAnchor="middle"
                fill="#92400e"
                fontSize="12"
                fontWeight="500"
                className="svg-unit-label"
              >
                育肥 1 舍
              </text>
            </svg>
          </div>
        </div>

        {/* Right Column: 系统配置预览 */}
        <div className="mapping-right">
          <div className="mapping-right-header">
            <h3 className="mapping-section-title">系统配置结构</h3>
          </div>
          <div className="mapping-tree">
            {/* Zone: 隔离区 */}
            <div className="tree-zone-item tree-zone-red">
              <div className="tree-zone-header">
                <div className="tree-zone-icon tree-icon-purple">
                  <BankOutlined />
                </div>
                <div className="tree-zone-title">
                  <span className="tree-zone-label">区</span>
                  <span className="tree-zone-name">隔离区</span>
                </div>
                <div className="tree-zone-badge">0个区块</div>
              </div>
            </div>

            {/* Zone: 生活区 */}
            <div className="tree-zone-item">
              <div className="tree-zone-header">
                <div className="tree-zone-icon tree-icon-purple">
                  <BankOutlined />
                </div>
                <div className="tree-zone-title">
                  <span className="tree-zone-label">区</span>
                  <span className="tree-zone-name">生活区</span>
                </div>
                <div className="tree-zone-badge">0个区块</div>
              </div>
            </div>

            {/* Zone: 生产 1 区 */}
            <div className="tree-zone-item tree-zone-green">
              <div className="tree-zone-header">
                <div className="tree-zone-icon tree-icon-purple">
                  <BankOutlined />
                </div>
                <div className="tree-zone-title">
                  <span className="tree-zone-label">区</span>
                  <span className="tree-zone-name">生产 1 区</span>
                </div>
                <div className="tree-zone-badge">1个区块</div>
              </div>

              {/* Section: 分娩车间 */}
              <div className="tree-section-children">
                <div className="tree-section-item">
                  <div className="tree-section-header">
                    <div className="tree-section-icon tree-icon-green">
                      <AppstoreOutlined />
                    </div>
                    <div className="tree-section-title">
                      <span className="tree-section-label">区块</span>
                      <span className="tree-section-name">分娩车间</span>
                    </div>
                    <div className="tree-section-badge">2个单元</div>
                  </div>

                  {/* Units */}
                  <div className="tree-unit-children">
                    <div className="tree-unit-item">
                      <div className="tree-unit-icon tree-icon-orange">
                        <HomeOutlined />
                      </div>
                      <div className="tree-unit-title">
                        <span className="tree-unit-label">单元</span>
                        <span className="tree-unit-name">分娩 1 舍</span>
                      </div>
                      <div className="tree-unit-tag">10个栏位</div>
                    </div>
                    <div className="tree-unit-item">
                      <div className="tree-unit-icon tree-icon-orange">
                        <HomeOutlined />
                      </div>
                      <div className="tree-unit-title">
                        <span className="tree-unit-label">单元</span>
                        <span className="tree-unit-name">分娩 2 舍</span>
                      </div>
                      <div className="tree-unit-tag">10个栏位</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Zone: 生产 2 区 */}
            <div className="tree-zone-item tree-zone-green">
              <div className="tree-zone-header">
                <div className="tree-zone-icon tree-icon-purple">
                  <BankOutlined />
                </div>
                <div className="tree-zone-title">
                  <span className="tree-zone-label">区</span>
                  <span className="tree-zone-name">生产 2 区</span>
                </div>
                <div className="tree-zone-badge">2个区块</div>
              </div>

              {/* Sections */}
              <div className="tree-section-children">
                {/* Section: 保育车间 */}
                <div className="tree-section-item">
                  <div className="tree-section-header">
                    <div className="tree-section-icon tree-icon-green">
                      <AppstoreOutlined />
                    </div>
                    <div className="tree-section-title">
                      <span className="tree-section-label">区块</span>
                      <span className="tree-section-name">保育车间</span>
                    </div>
                    <div className="tree-section-badge">3个单元</div>
                  </div>

                  {/* Units */}
                  <div className="tree-unit-children">
                    <div className="tree-unit-item">
                      <div className="tree-unit-icon tree-icon-orange">
                        <HomeOutlined />
                      </div>
                      <div className="tree-unit-title">
                        <span className="tree-unit-label">单元</span>
                        <span className="tree-unit-name">保育 1 舍</span>
                      </div>
                    </div>
                    <div className="tree-unit-item">
                      <div className="tree-unit-icon tree-icon-orange">
                        <HomeOutlined />
                      </div>
                      <div className="tree-unit-title">
                        <span className="tree-unit-label">单元</span>
                        <span className="tree-unit-name">保育 2 舍</span>
                      </div>
                    </div>
                    <div className="tree-unit-item">
                      <div className="tree-unit-icon tree-icon-orange">
                        <HomeOutlined />
                      </div>
                      <div className="tree-unit-title">
                        <span className="tree-unit-label">单元</span>
                        <span className="tree-unit-name">保育 3 舍</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section: 育肥车间 */}
                <div className="tree-section-item">
                  <div className="tree-section-header">
                    <div className="tree-section-icon tree-icon-green">
                      <AppstoreOutlined />
                    </div>
                    <div className="tree-section-title">
                      <span className="tree-section-label">区块</span>
                      <span className="tree-section-name">育肥车间</span>
                    </div>
                    <div className="tree-section-badge">1个单元</div>
                  </div>

                  {/* Units */}
                  <div className="tree-unit-children">
                    <div className="tree-unit-item">
                      <div className="tree-unit-icon tree-icon-orange">
                        <HomeOutlined />
                      </div>
                      <div className="tree-unit-title">
                        <span className="tree-unit-label">单元</span>
                        <span className="tree-unit-name">育肥 1 舍</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StructureMappingGuide
