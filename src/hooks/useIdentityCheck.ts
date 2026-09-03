import { useState, useEffect } from 'react'
import { getIdentityStatus } from '@/services/authService'

type IdentityPhase = 'checking' | 'verified' | 'pending' | 'rejected' | 'null' | 'unverified'

interface IdentityState {
  phase: IdentityPhase
  realName?: string
  idCardNumber?: string
  rejectReason?: string
}

/**
 * 实名认证检查 hook
 *
 * - 进入页面时自动查询认证状态
 * - phase 含义：
 *     checking   — 查询中
 *     verified   — 已认证通过
 *     pending    — 审核中，阻断所有敏感操作
 *     rejected   — 已拒绝，阻断，展示原因后可重新提交
 *     null       — 无认证记录，引导完善个人资料
 *     unverified — 异常状态，引导提交
 *
 * 实名提交统一走「我的-编辑资料」完整材料流程；
 * 后端 RealnameSubmit 要求全部材料字段，报名页不再提供轻量提交。
 */
export function useIdentityCheck() {
  const [state, setState] = useState<IdentityState>({ phase: 'checking' })

  useEffect(() => {
    getIdentityStatus()
      .then((res) => {
        if (res.status === 'verified') {
          setState({
            phase: 'verified',
            realName: res.real_name ?? undefined,
            idCardNumber: res.id_card_number ?? undefined,
          })
        } else if (res.status === 'pending') {
          setState({ phase: 'pending' })
        } else if (res.status === 'rejected') {
          setState({ phase: 'rejected', rejectReason: res.reject_reason || undefined })
        } else if (res.status === null) {
          setState({ phase: 'null' })
        } else {
          setState({ phase: 'unverified' })
        }
      })
      .catch(() => {
        setState({ phase: 'unverified' })
      })
  }, [])

  return {
    phase: state.phase,
    realName: state.realName,
    idCardNumber: state.idCardNumber,
    rejectReason: state.rejectReason,
  }
}
