import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { wxLogin } from '@/services/dataService'
import { setToken } from '@/utils/request'
import { ROUTES } from '@/constants/routes'
import { STRINGS } from '@/constants/strings'
import { Icon } from '@/components/Icon'
import { AgreementCheckbox } from '@/components/AgreementCheckbox'
import styles from './index.module.scss'

export default function AuthPage() {
  const [isAgreed, setIsAgreed] = useState(false)
  const [isShaking, setIsShaking] = useState(false)
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  const handleLogin = () => {
    if (!isAgreed) {
      setIsShaking(true)
      setTimeout(() => setIsShaking(false), 500)
      return
    }
    if (isLoggingIn) return

    setIsLoggingIn(true)
    Taro.login({
      success: (loginRes) => {
        if (loginRes.code) {
          wxLogin(loginRes.code)
            .then(({ access_token }) => {
              setToken(access_token)
              Taro.reLaunch({ url: `/${ROUTES.INDEX}` })
            })
            .catch(() => {
              setIsLoggingIn(false)
              Taro.showToast({ title: '登录失败，请重试', icon: 'none' })
            })
        } else {
          setIsLoggingIn(false)
          Taro.showToast({ title: '获取微信授权失败', icon: 'none' })
        }
      },
      fail: () => {
        setIsLoggingIn(false)
        Taro.showToast({ title: '微信登录失败', icon: 'none' })
      },
    })
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
            <Text className={styles.wechatBtnText}>{isLoggingIn ? '登录中...' : STRINGS.AUTH_WECHAT_BTN}</Text>
          </View>
        </View>

        <AgreementCheckbox
          className={`${isShaking ? 'shake' : ''} fade-in delay-2`}
          agreed={isAgreed}
          onChange={setIsAgreed}
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
