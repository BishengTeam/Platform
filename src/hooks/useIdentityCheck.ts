import { useState, useEffect, useCallback } from 'react'
import { getIdentityStatus, submitIdentity } from '@/services/authService'

type IdentityPhase = 'checking' | 'verified' | 'pending' | 'rejected' | 'unverified' | 'submitting'

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
 *     unverified — 不存在认证记录，引导提交
 *     submitting — 提交中
 */
export function useIdentityCheck() {
  const [state, setState] = useState<IdentityState>({ phase: 'checking' })

  useEffect(() => {
    getIdentityStatus()
      .then((res) => {
        if (res.status === 'verified') {
          setState({ phase: 'verified', realName: res.real_name, idCardNumber: res.id_card_number })
        } else if (res.status === 'pending') {
          setState({ phase: 'pending' })
        } else if (res.status === 'rejected') {
          setState({ phase: 'rejected', rejectReason: res.reject_reason || undefined })
        } else {
          setState({ phase: 'unverified' })
        }
      })
      .catch(() => {
        setState({ phase: 'unverified' })
      })
  }, [])

  const submit = useCallback(async (userType: 'student' | 'enterprise', realName: string, idCardNumber: string) => {
    setState((s) => ({ ...s, phase: 'submitting' }))
    try {
      await submitIdentity({
        user_type: userType,
        real_name: realName,
        id_card_number: idCardNumber,
      })
      setState({ phase: 'verified', realName, idCardNumber })
      return true
    } catch {
      setState((s) => ({ ...s, phase: 'unverified' }))
      return false
    }
  }, [])

  return {
    phase: state.phase,
    realName: state.realName,
    idCardNumber: state.idCardNumber,
    rejectReason: state.rejectReason,
    submit,
  }
}
