import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { STRINGS } from '@/constants/strings'
import styles from './deactivate.module.scss'

const CONDITIONS = [
  { label: STRINGS.MINE_DEACTIVATE_CONDITION_1, checked: true },
  { label: STRINGS.MINE_DEACTIVATE_CONDITION_2, checked: true },
  { label: STRINGS.MINE_DEACTIVATE_CONDITION_3, checked: true },
  { label: STRINGS.MINE_DEACTIVATE_CONDITION_4, checked: false },
]

export default function DeactivatePage() {
  const [step, setStep] = useState<'check' | 'unbind' | 'confirm'>('check')
  const [checking, setChecking] = useState(false)

  const handleCheck = () => {
    setChecking(true)
    setTimeout(() => {
      setChecking(false)
      setStep('unbind')
    }, 1500)
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
                {CONDITIONS.map((c, idx) => (
                  <View key={idx} className={styles.conditionItem}>
                    <Text className={c.checked ? styles.checked : styles.unchecked}>
                      {c.checked ? '✓' : '✗'}
                    </Text>
                    <Text className={`${styles.conditionLabel} ${c.checked ? '' : styles.conditionFail}`}>
                      {c.label}
                    </Text>
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

          {step === 'unbind' && (
            <>
              <View className={styles.warnCard}>
                <Text className={styles.warnDesc}>{STRINGS.MINE_DEACTIVATE_UNBIND_HINT}</Text>
              </View>
              <View className={styles.unbindList}>
                <View className={styles.unbindItem}>
                  <Text className={styles.unbindLabel}>手机号: 138****8888</Text>
                  <Button size='sm' variant='secondary'>{STRINGS.MINE_DEACTIVATE_UNBIND}</Button>
                </View>
                <View className={styles.unbindItem}>
                  <Text className={styles.unbindLabel}>微信: 已绑定</Text>
                  <Button size='sm' variant='secondary'>{STRINGS.MINE_DEACTIVATE_UNBIND}</Button>
                </View>
              </View>
              <View className={styles.btnWrap}>
                <Button variant='gradient' size='lg' onClick={() => setStep('confirm')}>
                  {STRINGS.MINE_DEACTIVATE_CONTINUE}
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
                  onClick={() => Taro.showToast({ title: STRINGS.MINE_DEACTIVATE_SUCCESS, icon: 'success' })}
                >
                  {STRINGS.MINE_DEACTIVATE_CONFIRM}
                </Button>
              </View>
            </>
          )}
        </View>
      </View>
    </AuthGuard>
  )
}
