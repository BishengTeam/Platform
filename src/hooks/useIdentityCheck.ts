import { useState, useEffect, useCallback } from 'react'
import { getIdentityStatus, submitIdentity } from '@/services/authService'

type IdentityPhase = 'checking' | 'verified' | 'pending' | 'unverified' | 'submitting'

interface IdentityState {
  phase: IdentityPhase
  realName?: string
  idCardNumber?: string
}

/**
 * 实名认证检查 hook
 *
 * - 进入页面时自动查询认证状态
 * - phase 含义：
 *     checking   — 查询中
 *     verified   — 已认证通过
 *     pending    — 审核中，停止自动提交，放行但不自动填表
 *     unverified — 未认证/被拒绝/不存在，引导提交
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
    submit,
  }
}
