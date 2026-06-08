import { useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { FormInput } from '@/components/FormInput'
import { useIdentityCheck } from '@/hooks/useIdentityCheck'
import { getUserProfile } from '@/services/dataService'
import { STRINGS } from '@/constants/strings'
import { ROUTES } from '@/constants/routes'
import styles from '../form.module.scss'

type GatePhase =
  | 'loading_profile' | 'profile_incomplete' | 'checking_identity'
  | 'verifying' | 'verified' | 'pending' | 'failed' | 'manual'

interface Props { children: ReactNode }

/** 仅使用 id_card_raw，绝不 fallback 到脱敏值 */
function pickIdCard(p: any): string {
  return p?.id_card_raw || ''
}

export function IdentityCheckGate({ children }: Props) {
  const identity = useIdentityCheck()
  const [phase, setPhase] = useState<GatePhase>('loading_profile')
  const [manualName, setManualName] = useState('')
  const [manualIdCard, setManualIdCard] = useState('')

  // 1. 加载用户资料
  useEffect(() => {
    getUserProfile()
      .then((profile: any) => {
        if (!profile?.real_name) { setPhase('profile_incomplete'); return }
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
      // 自动提交：需要 id_card_raw
      getUserProfile().then((profile: any) => {
        const rawIdCard = pickIdCard(profile)
        if (!rawIdCard) {
          setPhase('manual') // 无明文身份证，回退到手填
          return
        }
        setPhase('verifying')
        const userType = (profile?.user_type === 'enterprise' ? 'enterprise' : 'student') as 'student' | 'enterprise'
        identity.submit(userType, profile?.real_name || '', rawIdCard).then((ok) => {
          setPhase(ok ? 'verified' : 'failed')
        })
      }).catch(() => setPhase('manual'))
    }
  }, [identity.phase, phase])

  // 失败后重试
  const handleRetry = useCallback(async () => {
    setPhase('verifying')
    try { identity.submit('student', manualName.trim(), manualIdCard.trim()).then(ok => setPhase(ok ? 'verified' : 'failed')) }
    catch { setPhase('failed') }
  }, [identity, manualName, manualIdCard])

  // 手动提交
  const handleManualSubmit = useCallback(async () => {
    if (!manualName.trim() || !manualIdCard.trim()) {
      Taro.showToast({ title: '请填写完整信息', icon: 'none' })
      return
    }
    setPhase('verifying')
    try { identity.submit('student', manualName.trim(), manualIdCard.trim()).then(ok => setPhase(ok ? 'verified' : 'failed')) }
    catch { setPhase('failed') }
  }, [identity, manualName, manualIdCard])

  // ---- 加载中 ----
  if (phase === 'loading_profile' || phase === 'checking_identity') {
    return <GateWrapper><View className={styles.loadingWrap}><Text className={styles.loadingText}>加载中...</Text></View></GateWrapper>
  }

  // ---- 资料不完整 ----
  if (phase === 'profile_incomplete') {
    return (
      <GateWrapper>
        <View className={styles.section}><Text className={styles.sectionTitle}>{STRINGS.IDENTITY_PROFILE_INCOMPLETE}</Text></View>
        <View className={styles.btnWrap}><Button variant='gradient' size='lg' onClick={() => Taro.navigateTo({ url: `/${ROUTES.MINE_PROFILE}` })}>{STRINGS.IDENTITY_GOTO_PROFILE}</Button></View>
      </GateWrapper>
    )
  }

  // ---- 审核中 ----
  if (phase === 'pending') {
    return (
      <GateWrapper>
        <View className={styles.section}><Text className={styles.sectionTitle}>您的实名认证正在审核中，部分信息需手动填写</Text></View>
        <View className={styles.btnWrap}><Button variant='gradient' size='lg' onClick={() => setPhase('verified')}>继续报名</Button></View>
      </GateWrapper>
    )
  }

  // ---- 手动填写表单（无明文身份证时） ----
  if (phase === 'manual' || phase === 'failed') {
    return (
      <GateWrapper>
        {phase === 'failed' && <View className={styles.section}><Text className={styles.sectionTitle}>{STRINGS.IDENTITY_CHECK_FAILED}</Text></View>}
        <View className={styles.section}>
          <FormInput label={STRINGS.FORM_REAL_NAME} required placeholder={STRINGS.FORM_REAL_NAME_PLACEHOLDER} value={manualName} onChange={setManualName} />
          <FormInput label={STRINGS.FORM_ID_CARD} required placeholder={STRINGS.FORM_ID_CARD_PLACEHOLDER} value={manualIdCard} type='idcard' maxlength={18} onChange={setManualIdCard} />
        </View>
        <View className={styles.btnWrap}><Button variant='gradient' size='lg' onClick={phase === 'failed' ? handleRetry : handleManualSubmit}>提交认证</Button></View>
      </GateWrapper>
    )
  }

  // ---- 提交认证中 ----
  if (phase === 'verifying') {
    return <GateWrapper><View className={styles.loadingWrap}><Text className={styles.loadingText}>{STRINGS.IDENTITY_VERIFYING}</Text></View></GateWrapper>
  }

  return <>{children}</>
}

/** 通用外壳 */
function GateWrapper({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.IDENTITY_CHECK_TITLE} shouldShowBack />
        <View className={styles.body}>{children}</View>
      </View>
    </AuthGuard>
  )
}
