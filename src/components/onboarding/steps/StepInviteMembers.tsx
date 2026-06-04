import { useState } from 'react'
import './StepCommon.css'
import './StepInviteMembers.css'

interface StepInviteMembersProps {
  onNext: () => void
  onSkip?: () => void
  data?: any
  setData?: (data: any) => void
}

/**
 * 步骤 4：添加员工
 * 可以跳过
 * 
 * 参考 Slack/DingTalk 的邀请成员设计
 * 连接执行端（Mobile），让饲养员可以开始工作
 */
function StepInviteMembers({ data, setData }: StepInviteMembersProps) {
  const [invitedMembers, setInvitedMembers] = useState(data?.['invite-members']?.members || [])
  const [surname, setSurname] = useState('')
  const [givenName, setGivenName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [position, setPosition] = useState('')

  // 岗位选项（示例数据）
  const positionOptions = ['饲养员', '管理员', '技术员', '兽医', '其他']

  const handleAddMember = () => {
    // 验证：至少填写手机号或邮箱之一
    if ((!phone.trim() && !email.trim()) || !surname.trim() || !givenName.trim()) return

    const newMember = {
      id: `member-${Date.now()}`,
      surname: surname.trim(),
      givenName: givenName.trim(),
      fullName: `${surname.trim()}${givenName.trim()}`,
      phone: phone.trim() || '',
      email: email.trim() || '',
      position: position || positionOptions[0],
      status: 'pending', // pending, accepted, rejected
    }
    const updatedMembers = [...invitedMembers, newMember]
    setInvitedMembers(updatedMembers)
    setData?.({ members: updatedMembers })
    setSurname('')
    setGivenName('')
    setPhone('')
    setEmail('')
    setPosition('')
  }

  const handleRemoveMember = (memberId: string) => {
    const updatedMembers = invitedMembers.filter((m: any) => m.id !== memberId)
    setInvitedMembers(updatedMembers)
    setData?.({ members: updatedMembers })
  }

  const handleSendInvites = () => {
    if (invitedMembers.length === 0) {
      alert('请先添加要邀请的成员')
      return
    }
    // 模拟发送邀请
    alert(`已向 ${invitedMembers.length} 位成员发送邀请（Demo 演示）`)
  }

  const canAdd = surname.trim() && givenName.trim() && (phone.trim() || email.trim())

  return (
    <div className="step-content">
      <div className="step-form">
        <div className="step-info-box invite-info-box">
          <p>添加饲养员和管理员到系统中。添加后，他们可以通过 Mobile 端接收任务并开始工作。</p>
          <p className="info-hint">💡 提示：您也可以稍后在"人员管理"中添加员工</p>
        </div>

        {/* 添加成员表单 */}
        <div className="form-section invite-form-section">
          <h3>添加成员</h3>
          <div className="invite-form-fields">
            <div className="invite-form-row">
              <div className="invite-form-field">
                <label>姓</label>
                <input
                  type="text"
                  placeholder="姓"
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  className="invite-input"
                />
              </div>
              <div className="invite-form-field">
                <label>名</label>
                <input
                  type="text"
                  placeholder="名"
                  value={givenName}
                  onChange={(e) => setGivenName(e.target.value)}
                  className="invite-input"
                />
              </div>
            </div>

            <div className="invite-form-field">
              <div className="field-hint">
                <span className="hint-icon">ℹ️</span>
                <span className="hint-text">请输入手机号以及/或邮箱地址。</span>
              </div>
            </div>

            <div className="invite-form-row">
              <div className="invite-form-field">
                <label>手机号</label>
                <input
                  type="tel"
                  placeholder="手机号"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="invite-input"
                />
              </div>
              <div className="invite-form-field">
                <label>邮箱</label>
                <input
                  type="email"
                  placeholder="邮箱"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="invite-input"
                />
              </div>
            </div>

            <div className="invite-form-field">
              <label>岗位</label>
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="invite-select"
              >
                <option value="">请选择岗位</option>
                {positionOptions.map((pos) => (
                  <option key={pos} value={pos}>
                    {pos}
                  </option>
                ))}
              </select>
            </div>

            <div className="invite-form-actions">
              <button
                className="btn btn-primary"
                onClick={handleAddMember}
                disabled={!canAdd}
              >
                添加
              </button>
            </div>
          </div>
        </div>

        {/* 成员列表 */}
        {invitedMembers.length > 0 && (
          <div className="form-section invite-list-section">
            <div className="invite-list-header">
              <h3>待添加员工（共 {invitedMembers.length} 人）</h3>
              <button
                className="btn btn-sm btn-primary"
                onClick={handleSendInvites}
              >
                发送邀请
              </button>
            </div>
            <div className="invite-list">
              {invitedMembers.map((member: any) => (
                <div key={member.id} className="invite-member-item">
                  <div className="member-avatar">
                    {member.surname?.charAt(0) || member.fullName?.charAt(0) || '?'}
                  </div>
                  <div className="member-info">
                    <div className="member-name">{member.fullName || `${member.surname}${member.givenName}`}</div>
                    <div className="member-details">
                      {member.phone && <span className="member-phone">{member.phone}</span>}
                      {member.email && <span className="member-email">{member.email}</span>}
                      <span className="member-role">{member.position}</span>
                    </div>
                  </div>
                  <div className="member-status">
                    <span className="status-badge status-pending">待邀请</span>
                  </div>
                  <button
                    className="btn-icon"
                    onClick={() => handleRemoveMember(member.id)}
                    title="删除"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

export default StepInviteMembers