import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { STRINGS } from '@/constants/strings'
import { ROUTES } from '@/constants/routes'
import { deleteAccount } from '@/services/dataService'
import { clearAuthTokens } from '@/utils/request'
import styles from './deactivate.module.scss'

const CONDITIONS = [
  STRINGS.MINE_DEACTIVATE_CONDITION_1,
  STRINGS.MINE_DEACTIVATE_CONDITION_2,
  STRINGS.MINE_DEACTIVATE_CONDITION_3,
]

export default function DeactivatePage() {
  const [step, setStep] = useState<'check' | 'confirm'>('check')
  const [checking, setChecking] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleCheck = () => {
    setChecking(true)
    setTimeout(() => {
      setChecking(false)
      setStep('confirm')
    }, 1500)
  }

  const handleConfirmDeactivate = async () => {
    if (deleting) return
    setDeleting(true)
    try {
      await deleteAccount()
      clearAuthTokens()
      Taro.showToast({ title: STRINGS.MINE_DEACTIVATE_SUCCESS, icon: 'success' })
      setTimeout(() => {
        Taro.reLaunch({ url: `/${ROUTES.INDEX}` })
      }, 800)
    } catch (error) {
      Taro.showToast({
        title: error instanceof Error ? error.message : '注销失败，请重试',
        icon: 'none',
        duration: 3000,
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.MINE_DEACTIVATE_TITLE} shouldShowBack />
        <View className={styles.body}>
          {step === 'check' && (
            <>
              <View className={styles.warnCard}>
                <Text className={styles.warnTitle}>{STRINGS.MINE_DEACTIVATE_TITLE}</Text>
                <Text className={styles.warnDesc}>{STRINGS.MINE_DEACTIVATE_WARN}</Text>
              </View>

              <View className={styles.conditionCard}>
                <Text className={styles.conditionTitle}>{STRINGS.MINE_DEACTIVATE_CHECK_TITLE}</Text>
                {CONDITIONS.map((label) => (
                  <View key={label} className={styles.conditionItem}>
                    <Text className={styles.checked}>✓</Text>
                    <Text className={styles.conditionLabel}>{label}</Text>
                  </View>
                ))}
              </View>

              <View className={styles.btnWrap}>
                <Button
                  variant='gradient'
                  size='lg'
                  onClick={handleCheck}
                  disabled={checking}
                >
                  {checking ? STRINGS.MINE_DEACTIVATE_CHECKING : STRINGS.MINE_DEACTIVATE_TITLE}
                </Button>
              </View>
            </>
          )}

          {step === 'confirm' && (
            <>
              <View className={styles.confirmCard}>
                <Text className={styles.confirmTitle}>{STRINGS.MINE_DEACTIVATE_CONFIRM_TITLE}</Text>
                <Text className={styles.confirmDesc}>
                  {STRINGS.MINE_DEACTIVATE_CONFIRM_DESC}
                </Text>
              </View>
              <View className={styles.btnWrap}>
                <Button variant='secondary' size='lg' onClick={() => setStep('check')}>
                  {STRINGS.MINE_DEACTIVATE_CANCEL}
                </Button>
                <Button
                  variant='gradient'
                  size='lg'
                  onClick={handleConfirmDeactivate}
                  disabled={deleting}
                >
                  {deleting ? '注销中...' : STRINGS.MINE_DEACTIVATE_CONFIRM}
                </Button>
              </View>
            </>
          )}
        </View>
      </View>
    </AuthGuard>
  )
}
