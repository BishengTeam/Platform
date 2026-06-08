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

type GatePhase = 'loading_profile' | 'profile_incomplete' | 'checking_identity' | 'verifying' | 'verified' | 'pending' | 'failed'

interface Props {
  children: ReactNode
}

/** 归一化身份证号字段：后端可能返回 id_card_raw / id_card / id_card_number */
function pickIdCard(p: any): string {
  return p?.id_card_raw || p?.id_card || p?.id_card_number || ''
}

/**
 * 实名认证检查网关（v3）
 *
 * 流程：
 *   1. 加载用户资料 → real_name 为空 → 引导去完善资料
 *   2. 查询实名认证状态：
 *      verified   → 放行
 *      pending    → 展示审核中提示，放行
 *      unverified → 用 profile 数据自动提交
 */
export function IdentityCheckGate({ children }: Props) {
  const identity = useIdentityCheck()
  const [phase, setPhase] = useState<GatePhase>('loading_profile')

  // 1. 加载用户资料
  useEffect(() => {
    getUserProfile()
      .then((profile: any) => {
        if (!profile?.real_name) {
          setPhase('profile_incomplete')
          return
        }
        setPhase('checking_identity')
      })
      .catch(() => setPhase('profile_incomplete'))
  }, [])

  // 2. 身份认证状态变化时处理
  useEffect(() => {
    if (phase !== 'checking_identity') return
    if (identity.phase === 'verified') {
      setPhase('verified')
    } else if (identity.phase === 'pending') {
      setPhase('pending')
    } else if (identity.phase === 'unverified') {
      setPhase('verifying')
      getUserProfile().then((profile: any) => {
        const userType = (profile?.user_type === 'enterprise' ? 'enterprise' : 'student') as 'student' | 'enterprise'
        identity.submit(userType, profile?.real_name || '', pickIdCard(profile)).then((ok) => {
          setPhase(ok ? 'verified' : 'failed')
        })
      }).catch(() => setPhase('failed'))
    }
  }, [identity.phase, phase])

  // 失败后手动重试
  const handleRetry = useCallback(async () => {
    setPhase('verifying')
    try {
      const profile: any = await getUserProfile()
      const userType = (profile?.user_type === 'enterprise' ? 'enterprise' : 'student') as 'student' | 'enterprise'
      const ok = await identity.submit(userType, profile?.real_name || '', pickIdCard(profile))
      setPhase(ok ? 'verified' : 'failed')
    } catch {
      setPhase('failed')
    }
  }, [identity])

  // ---- 加载中 ----
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

  // ---- 资料不完整 ----
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
              <Button variant='gradient' size='lg' onClick={() => Taro.navigateTo({ url: `/${ROUTES.MINE_PROFILE}` })}>
                {STRINGS.IDENTITY_GOTO_PROFILE}
              </Button>
            </View>
          </View>
        </View>
      </AuthGuard>
    )
  }

  // ---- 审核中 ----
  if (phase === 'pending') {
    return (
      <AuthGuard>
        <View className={styles.page}>
          <PageHeader title={STRINGS.IDENTITY_CHECK_TITLE} shouldShowBack />
          <View className={styles.body}>
            <View className={styles.section}>
              <Text className={styles.sectionTitle}>您的实名认证正在审核中，部分信息需手动填写</Text>
            </View>
            <View className={styles.btnWrap}>
              <Button variant='gradient' size='lg' onClick={() => setPhase('verified')}>
                继续报名
              </Button>
            </View>
          </View>
        </View>
      </AuthGuard>
    )
  }

  // ---- 提交认证中 ----
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

  // ---- 认证失败 ----
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
              <Button variant='gradient' size='lg' onClick={handleRetry}>重试</Button>
            </View>
          </View>
        </View>
      </AuthGuard>
    )
  }

  return <>{children}</>
}
