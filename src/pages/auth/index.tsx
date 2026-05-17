import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { setAuthToken } from '@/utils/storage'
import { ROUTES } from '@/constants/routes'
import { STRINGS } from '@/constants/strings'
import { Icon } from '@/components/Icon'
import { AgreementCheckbox } from '@/components/AgreementCheckbox'
import styles from './index.module.scss'

export default function AuthPage() {
  const [agreed, setAgreed] = useState(false)
  const [shake, setShake] = useState(false)

  const handleLogin = () => {
    if (!agreed) {
      setShake(true)
      setTimeout(() => setShake(false), 500)
      return
    }
    setAuthToken()
    Taro.reLaunch({ url: `/${ROUTES.INDEX}` })
  }

  return (
    <View className={styles.page}>
      <View className={styles.bgDecor} />

      <View className={styles.content}>
        <View className='fade-in-up delay-0'>
          <View className={styles.logo}>
            <Icon name='award' size={48} color='#ffffff' />
          </View>
          <View className={styles.appName}>{STRINGS.AUTH_APP_NAME}</View>
          <View className={styles.appDesc}>{STRINGS.AUTH_APP_DESC}</View>
        </View>

        <View className={`${styles.actions} fade-in-up delay-1`}>
          <View className={styles.wechatBtn} onClick={handleLogin}>
            <Icon name='message-circle' size={20} color='#ffffff' />
            <Text className={styles.wechatBtnText}>{STRINGS.AUTH_WECHAT_BTN}</Text>
          </View>
          <View className={styles.phoneBtn} onClick={handleLogin}>
            <Icon name='phone' size={20} color='#333333' />
            <Text className={styles.phoneBtnText}>{STRINGS.AUTH_PHONE_BTN}</Text>
          </View>
        </View>

        <AgreementCheckbox
          className={`${shake ? 'shake' : ''} fade-in delay-2`}
          agreed={agreed}
          onChange={setAgreed}
        >
          {STRINGS.AUTH_AGREEMENT_PREFIX}
          <Text className={styles.link}>{STRINGS.AUTH_AGREEMENT_TERMS}</Text>
          {STRINGS.AUTH_AGREEMENT_AND}
          <Text className={styles.link}>{STRINGS.AUTH_AGREEMENT_PRIVACY}</Text>
          {STRINGS.AUTH_AGREEMENT_SUFFIX}
        </AgreementCheckbox>
      </View>
    </View>
  )
}
