import { useState, useCallback } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { FormInput } from '@/components/FormInput'
import { STRINGS } from '@/constants/strings'
import styles from './xuexin-guide.module.scss'

const STEPS = [
  { title: STRINGS.XUEXIN_GUIDE_STEP1_TITLE, desc: STRINGS.XUEXIN_GUIDE_STEP1_DESC },
  { title: STRINGS.XUEXIN_GUIDE_STEP2_TITLE, desc: STRINGS.XUEXIN_GUIDE_STEP2_DESC },
  { title: STRINGS.XUEXIN_GUIDE_STEP3_TITLE, desc: STRINGS.XUEXIN_GUIDE_STEP3_DESC },
  { title: STRINGS.XUEXIN_GUIDE_STEP4_TITLE, desc: STRINGS.XUEXIN_GUIDE_STEP4_DESC },
  { title: STRINGS.XUEXIN_GUIDE_STEP5_TITLE, desc: STRINGS.XUEXIN_GUIDE_STEP5_DESC },
]

export default function XuexinGuidePage() {
  const [code, setCode] = useState('')

  const handleConfirm = useCallback(() => {
    if (!code.trim()) {
      Taro.showToast({ title: STRINGS.VALIDATOR_VERIFICATION_REQUIRED, icon: 'none' })
      return
    }
    Taro.setStorageSync('xuexin_verification_code', code.trim())
    Taro.navigateBack()
  }, [code])

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.XUEXIN_GUIDE_TITLE} shouldShowBack />
        <View className={styles.body}>
          <Text className={styles.intro}>{STRINGS.XUEXIN_GUIDE_INTRO}</Text>
          <View className={styles.steps}>
            {STEPS.map((step, idx) => (
              <View key={idx} className={styles.step}>
                <View className={styles.stepNumber}>
                  <Text className={styles.stepNumberText}>{idx + 1}</Text>
                </View>
                <View className={styles.stepContent}>
                  <Text className={styles.stepTitle}>{step.title}</Text>
                  <Text className={styles.stepDesc}>{step.desc}</Text>
                </View>
              </View>
            ))}
          </View>
          <View className={styles.inputSection}>
            <FormInput
              label={STRINGS.XUEXIN_GUIDE_INPUT_LABEL}
              required
              placeholder={STRINGS.XUEXIN_GUIDE_INPUT_PLACEHOLDER}
              value={code}
              onChange={setCode}
            />
          </View>
          <View className={styles.btnWrap}>
            <Button variant='gradient' size='lg' onClick={handleConfirm}>
              {STRINGS.XUEXIN_GUIDE_CONFIRM}
            </Button>
          </View>
        </View>
      </View>
    </AuthGuard>
  )
}
