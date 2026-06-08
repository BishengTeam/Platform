import { useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { useIdentityCheck } from '@/hooks/useIdentityCheck'
import { getUserProfile } from '@/services/dataService'
import { STRINGS } from '@/constants/strings'
import { ROUTES } from '@/constants/routes'
import styles from '../form.module.scss'

type GatePhase = 'loading_profile' | 'profile_incomplete' | 'checking_identity' | 'verifying' | 'verified' | 'failed'

interface Props {
  children: ReactNode
}

/**
 * 实名认证检查网关（v2）
 *
 * 流程：
 *   1. 加载用户资料 → real_name 为空则引导去完善资料
 *   2. 查询实名认证状态 → 已认证直接放行
 *   3. 未认证则用 profile 数据自动提交认证
 */
export function IdentityCheckGate({ children }: Props) {
  const identity = useIdentityCheck()
  const [phase, setPhase] = useState<GatePhase>('loading_profile')

  // 1. 加载用户资料
  useEffect(() => {
    getUserProfile()
      .then((profile: any) => {
        const hasRealName = !!(profile?.real_name)
        if (!hasRealName) {
          setPhase('profile_incomplete')
          return
        }
        setPhase('checking_identity')
      })
      .catch(() => {
        // 加载失败也视为资料不完整
        setPhase('profile_incomplete')
      })
  }, [])

  // 2. 身份认证状态变化时处理
  useEffect(() => {
    if (phase !== 'checking_identity') return
    if (identity.phase === 'verified') {
      setPhase('verified')
    } else if (identity.phase === 'unverified') {
      // 自动提交认证
      setPhase('verifying')
      getUserProfile().then((profile: any) => {
        const userType = (profile?.user_type === 'enterprise' ? 'enterprise' : 'student') as 'student' | 'enterprise'
        const realName = profile?.real_name || ''
        const idCard = profile?.id_card || profile?.id_card_number || ''
        identity.submit(userType, realName, idCard).then((ok) => {
          setPhase(ok ? 'verified' : 'failed')
        })
      }).catch(() => {
        setPhase('failed')
      })
    }
  }, [identity.phase, phase])

  // 失败后手动重试
  const handleRetry = useCallback(async () => {
    setPhase('verifying')
    try {
      const profile: any = await getUserProfile()
      const userType = (profile?.user_type === 'enterprise' ? 'enterprise' : 'student') as 'student' | 'enterprise'
      const realName = profile?.real_name || ''
      const idCard = profile?.id_card || profile?.id_card_number || ''
      const ok = await identity.submit(userType, realName, idCard)
      setPhase(ok ? 'verified' : 'failed')
    } catch {
      setPhase('failed')
    }
  }, [identity])

  // ---- 渲染各阶段 ----

  // 加载中
  if (phase === 'loading_profile' || phase === 'checking_identity') {
    return (
      <AuthGuard>
        <View className={styles.page}>
          <PageHeader title={STRINGS.IDENTITY_CHECK_TITLE} shouldShowBack />
          <View className={styles.body}>
            <View className={styles.loadingWrap}>
              <Text className={styles.loadingText}>加载中...</Text>
            </View>
          </View>
        </View>
      </AuthGuard>
    )
  }

  // 资料不完整
  if (phase === 'profile_incomplete') {
    return (
      <AuthGuard>
        <View className={styles.page}>
          <PageHeader title={STRINGS.IDENTITY_CHECK_TITLE} shouldShowBack />
          <View className={styles.body}>
            <View className={styles.section}>
              <Text className={styles.sectionTitle}>{STRINGS.IDENTITY_PROFILE_INCOMPLETE}</Text>
            </View>
            <View className={styles.btnWrap}>
              <Button
                variant='gradient'
                size='lg'
                onClick={() => Taro.navigateTo({ url: `/${ROUTES.MINE_PROFILE}` })}
              >
                {STRINGS.IDENTITY_GOTO_PROFILE}
              </Button>
            </View>
          </View>
        </View>
      </AuthGuard>
    )
  }

  // 提交认证中
  if (phase === 'verifying') {
    return (
      <AuthGuard>
        <View className={styles.page}>
          <PageHeader title={STRINGS.IDENTITY_CHECK_TITLE} shouldShowBack />
          <View className={styles.body}>
            <View className={styles.loadingWrap}>
              <Text className={styles.loadingText}>{STRINGS.IDENTITY_VERIFYING}</Text>
            </View>
          </View>
        </View>
      </AuthGuard>
    )
  }

  // 认证失败
  if (phase === 'failed') {
    return (
      <AuthGuard>
        <View className={styles.page}>
          <PageHeader title={STRINGS.IDENTITY_CHECK_TITLE} shouldShowBack />
          <View className={styles.body}>
            <View className={styles.section}>
              <Text className={styles.sectionTitle}>{STRINGS.IDENTITY_CHECK_FAILED}</Text>
            </View>
            <View className={styles.btnWrap}>
              <Button variant='gradient' size='lg' onClick={handleRetry}>
                重试
              </Button>
            </View>
          </View>
        </View>
      </AuthGuard>
    )
  }

  // 认证通过
  return <>{children}</>
}
