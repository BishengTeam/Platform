import { useState, useEffect, useCallback } from 'react'
import { getIdentityStatus, submitIdentity } from '@/services/authService'

type IdentityPhase = 'checking' | 'verified' | 'unverified' | 'submitting'

interface IdentityState {
  phase: IdentityPhase
  realName?: string
  idCard?: string
}

/**
 * 实名认证检查 hook
 *
 * - 进入页面时自动查询认证状态
 * - 未认证时提供 submit(name, idCard) 方法触发认证
 * - phase === 'checking' 时尚未确定认证状态
 */
export function useIdentityCheck() {
  const [state, setState] = useState<IdentityState>({ phase: 'checking' })

  useEffect(() => {
    getIdentityStatus()
      .then((res) => {
        if (res.status === 'verified') {
          setState({ phase: 'verified', realName: res.real_name, idCard: res.id_card })
        } else {
          setState({ phase: 'unverified' })
        }
      })
      .catch(() => {
        // 接口异常也视为未认证，允许用户尝试提交认证
        setState({ phase: 'unverified' })
      })
  }, [])

  const submit = useCallback(async (realName: string, idCard: string) => {
    setState((s) => ({ ...s, phase: 'submitting' }))
    try {
      await submitIdentity({ real_name: realName, id_card: idCard })
      setState({ phase: 'verified', realName, idCard })
      return true
    } catch {
      setState((s) => ({ ...s, phase: 'unverified' }))
      return false
    }
  }, [])

  return {
    phase: state.phase,
    realName: state.realName,
    idCard: state.idCard,
    submit,
  }
}
