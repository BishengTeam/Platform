import { useState } from 'react'
import type { ReactNode } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { FormInput } from '@/components/FormInput'
import { useIdentityCheck } from '@/hooks/useIdentityCheck'
import { STRINGS } from '@/constants/strings'
import styles from '../form.module.scss'

interface Props {
  children: ReactNode
}

/**
 * 实名认证检查网关
 * 在 children 外层包裹身份校验流程：
 *   checking → 加载中
 *   unverified → 认证表单（含身份类型 student/enterprise 选择）
 *   verified → 渲染 children
 */
export function IdentityCheckGate({ children }: Props) {
  const identity = useIdentityCheck()
  const [identityName, setIdentityName] = useState('')
  const [identityIdCard, setIdentityIdCard] = useState('')
  const [userType, setUserType] = useState<'student' | 'enterprise'>('student')

  if (identity.phase === 'checking') {
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

  if (identity.phase === 'unverified' || identity.phase === 'submitting') {
    const handleIdentitySubmit = async () => {
      if (!identityName.trim() || !identityIdCard.trim()) {
        Taro.showToast({ title: '请填写完整信息', icon: 'none' })
        return
      }
      const ok = await identity.submit(userType, identityName.trim(), identityIdCard.trim())
      if (!ok) {
        Taro.showToast({ title: STRINGS.IDENTITY_CHECK_FAILED, icon: 'none' })
      }
    }

    return (
      <AuthGuard>
        <View className={styles.page}>
          <PageHeader title={STRINGS.IDENTITY_CHECK_TITLE} shouldShowBack />
          <View className={styles.body}>
            <View className={styles.section}>
              <Text className={styles.sectionTitle}>{STRINGS.IDENTITY_CHECK_DESC}</Text>
            </View>
            <View className={styles.section}>
              {/* 身份类型 */}
              <View className={styles.identityRow}>
                <Text className={styles.identityLabel}>{STRINGS.FORM_IDENTITY_TYPE}</Text>
                <View className={styles.identityToggle}>
                  <View
                    className={`${styles.identityOption} ${userType === 'student' ? styles.identityActive : ''}`}
                    onClick={() => setUserType('student')}
                  >
                    <Text>{STRINGS.FORM_IDENTITY_STUDENT}</Text>
                  </View>
                  <View
                    className={`${styles.identityOption} ${userType === 'enterprise' ? styles.identityActive : ''}`}
                    onClick={() => setUserType('enterprise')}
                  >
                    <Text>{STRINGS.FORM_IDENTITY_ENTERPRISE}</Text>
                  </View>
                </View>
              </View>

              <FormInput
                label={STRINGS.FORM_REAL_NAME}
                required
                placeholder={STRINGS.FORM_REAL_NAME_PLACEHOLDER}
                value={identityName}
                onChange={setIdentityName}
              />
              <FormInput
                label={STRINGS.FORM_ID_CARD}
                required
                placeholder={STRINGS.FORM_ID_CARD_PLACEHOLDER}
                value={identityIdCard}
                type='idcard'
                maxlength={18}
                onChange={setIdentityIdCard}
              />
            </View>
            <View className={styles.btnWrap}>
              <Button
                variant='gradient'
                size='lg'
                onClick={handleIdentitySubmit}
              >
                {identity.phase === 'submitting' ? STRINGS.IDENTITY_CHECK_SUBMITTING : STRINGS.IDENTITY_CHECK_SUBMIT}
              </Button>
            </View>
          </View>
        </View>
      </AuthGuard>
    )
  }

  return <>{children}</>
}
