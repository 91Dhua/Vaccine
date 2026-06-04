import { useState, useRef, useEffect } from 'react'
import { CloseOutlined, QuestionCircleOutlined } from '@ant-design/icons'
import './StallNamingGuide.css'

interface StallNamingGuideProps {
  className?: string
}

function StallNamingGuide({ className = '' }: StallNamingGuideProps) {
  const [isOpen, setIsOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className={`stall-naming-guide ${className}`}>
      <button
        ref={triggerRef}
        className="guide-trigger"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
        aria-label="查看编号规则说明"
      >
        <QuestionCircleOutlined />
      </button>

      {isOpen && (
        <div className="guide-popover" ref={popoverRef}>
          <div className="guide-popover-header">
            <h4>高级编号规则说明</h4>
            <button
              className="guide-popover-close"
              onClick={() => setIsOpen(false)}
              type="button"
              aria-label="关闭"
            >
              <CloseOutlined />
            </button>
          </div>

          <div className="guide-popover-content">
            {/* Part A: 核心规则 */}
            <div className="guide-rule-text">
              <p>
                编号规则：站在入口门面向单元内部，左手为 A 列。列内可以混合不同类型的栏位，编号建议保持连续。
              </p>
            </div>

            {/* Part B: 混合类型示意图 */}
            <div className="guide-diagram">
              <svg
                width="400"
                height="250"
                viewBox="0 0 400 250"
                className="stall-diagram-svg"
              >
                {/* 定义渐变和样式 */}
                <defs>
                  <pattern id="farrowing-pattern" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
                    <rect width="8" height="8" fill="#fb923c" opacity="0.15" />
                    <path d="M0,0 L8,8 M8,0 L0,8" stroke="#fb923c" strokeWidth="0.5" opacity="0.4" />
                  </pattern>
                  <pattern id="nursery-pattern" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse">
                    <rect width="6" height="6" fill="#60a5fa" opacity="0.15" />
                    <circle cx="3" cy="3" r="1.5" fill="#60a5fa" opacity="0.4" />
                  </pattern>
                </defs>

                {/* 背景 */}
                <rect width="400" height="250" fill="#1e293b" />

                {/* 中间通道 */}
                <rect x="180" y="0" width="40" height="250" fill="#334155" />

                {/* 入口（底部居中） */}
                <path
                  d="M 160 250 L 200 250 L 200 240 L 220 240 L 220 250 L 240 250"
                  fill="none"
                  stroke="#64748b"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <text x="200" y="245" textAnchor="middle" fill="#94a3b8" fontSize="12" fontWeight="500">
                  入口
                </text>

                {/* 左侧 A 列 - 上半部分：分娩栏 (A-1 到 A-3) - 宽大长方形 */}
                <g className="farrowing-stalls">
                  {/* A-1 */}
                  <rect x="20" y="20" width="140" height="65" fill="url(#farrowing-pattern)" stroke="#fb923c" strokeWidth="2" rx="4" />
                  <text x="90" y="45" textAnchor="middle" fill="#fb923c" fontSize="15" fontWeight="600">A-1</text>
                  <text x="90" y="65" textAnchor="middle" fill="#fb923c" fontSize="11" fontWeight="500">分娩栏</text>

                  {/* A-2 */}
                  <rect x="20" y="95" width="140" height="65" fill="url(#farrowing-pattern)" stroke="#fb923c" strokeWidth="2" rx="4" />
                  <text x="90" y="120" textAnchor="middle" fill="#fb923c" fontSize="15" fontWeight="600">A-2</text>
                  <text x="90" y="140" textAnchor="middle" fill="#fb923c" fontSize="11" fontWeight="500">分娩栏</text>

                  {/* A-3 */}
                  <rect x="20" y="170" width="140" height="50" fill="url(#farrowing-pattern)" stroke="#fb923c" strokeWidth="2" rx="4" />
                  <text x="90" y="192" textAnchor="middle" fill="#fb923c" fontSize="15" fontWeight="600">A-3</text>
                  <text x="90" y="208" textAnchor="middle" fill="#fb923c" fontSize="11" fontWeight="500">分娩栏</text>
                </g>

                {/* 左侧 A 列 - 下半部分：保育栏 (A-4 到 A-6) - 窄小正方形 */}
                <g className="nursery-stalls">
                  {/* A-4 */}
                  <rect x="20" y="230" width="45" height="45" fill="url(#nursery-pattern)" stroke="#60a5fa" strokeWidth="2" rx="4" />
                  <text x="42.5" y="250" textAnchor="middle" fill="#60a5fa" fontSize="13" fontWeight="600">A-4</text>
                  <text x="42.5" y="265" textAnchor="middle" fill="#60a5fa" fontSize="10" fontWeight="500">保育栏</text>

                  {/* A-5 */}
                  <rect x="75" y="230" width="45" height="45" fill="url(#nursery-pattern)" stroke="#60a5fa" strokeWidth="2" rx="4" />
                  <text x="97.5" y="250" textAnchor="middle" fill="#60a5fa" fontSize="13" fontWeight="600">A-5</text>
                  <text x="97.5" y="265" textAnchor="middle" fill="#60a5fa" fontSize="10" fontWeight="500">保育栏</text>

                  {/* A-6 */}
                  <rect x="130" y="230" width="45" height="45" fill="url(#nursery-pattern)" stroke="#60a5fa" strokeWidth="2" rx="4" />
                  <text x="152.5" y="250" textAnchor="middle" fill="#60a5fa" fontSize="13" fontWeight="600">A-6</text>
                  <text x="152.5" y="265" textAnchor="middle" fill="#60a5fa" fontSize="10" fontWeight="500">保育栏</text>
                </g>

                {/* 右侧 B 列（陪衬） */}
                <g className="b-column">
                  <rect x="240" y="20" width="140" height="210" fill="#334155" stroke="#475569" strokeWidth="1" strokeDasharray="4 4" rx="4" />
                  <text x="310" y="125" textAnchor="middle" fill="#94a3b8" fontSize="14" fontWeight="500">B 列</text>
                </g>

                {/* 列标签 */}
                <text x="90" y="12" textAnchor="middle" fill="#fb923c" fontSize="16" fontWeight="600">A 列</text>
                <text x="310" y="12" textAnchor="middle" fill="#94a3b8" fontSize="16" fontWeight="600">B 列</text>
              </svg>
            </div>

            {/* Part C: 配置示例 */}
            <div className="guide-example">
              <h5>配置示例</h5>
              <p className="guide-example-desc">
                假设已配置 A-1 至 A-3 的分娩栏，现在添加 A-4 至 A-6 的保育栏：
              </p>
              <div className="guide-example-form">
                <div className="example-input-group">
                  <span className="example-label">列/排</span>
                  <div className="example-input-readonly">A</div>
                </div>
                <div className="example-input-group">
                  <span className="example-label">起始号</span>
                  <div className="example-input-readonly">4</div>
                </div>
                <div className="example-input-group">
                  <span className="example-label">结束号</span>
                  <div className="example-input-readonly">6</div>
                </div>
                <div className="example-input-group">
                  <span className="example-label">栏位类型</span>
                  <div className="example-input-readonly">保育栏</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StallNamingGuide
