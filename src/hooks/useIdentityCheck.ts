import { useState, useEffect, useCallback } from 'react'
import { getIdentityStatus, submitIdentity } from '@/services/authService'

type IdentityPhase = 'checking' | 'verified' | 'unverified' | 'submitting'

interface IdentityState {
  phase: IdentityPhase
  realName?: string
  idCardNumber?: string
}

/**
 * 实名认证检查 hook
 *
 * - 进入页面时自动查询认证状态
 * - 未认证时提供 submit(userType, realName, idCardNumber) 方法触发认证
 * - phase === 'checking' 时尚未确定认证状态
 */
export function useIdentityCheck() {
  const [state, setState] = useState<IdentityState>({ phase: 'checking' })

  useEffect(() => {
    getIdentityStatus()
      .then((res) => {
        if (res.status === 'verified') {
          setState({ phase: 'verified', realName: res.real_name, idCardNumber: res.id_card_number })
        } else {
          setState({ phase: 'unverified' })
        }
      })
      .catch(() => {
        // 接口异常也视为未认证，允许用户尝试提交认证
        setState({ phase: 'unverified' })
      })
  }, [])

  /** 提交实名认证，需传入身份类型、姓名、身份证号 */
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
