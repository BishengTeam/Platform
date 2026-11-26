import { useState } from 'react'
import { View, Text, Image, Button } from '@tarojs/components'
import Taro, { useUnload } from '@tarojs/taro'
import { wxLogin, acceptLoginAgreements } from '@/services/dataService'
import { setAuthTokens } from '@/utils/request'
import { clearQuizCache } from '@/utils/quizRuntime'
import { STRINGS } from '@/constants/strings'
import { Icon } from '@/components/Icon'
import { AgreementCheckbox } from '@/components/AgreementCheckbox'
import styles from './index.module.scss'
import { cancelLogin, completeLogin, loginPageClosed, pendingLogin } from '@/utils/loginCoordinator'

export default function AuthPage() {
  const [isAgreed, setIsAgreed] = useState(false)
  const [isShaking, setIsShaking] = useState(false)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const purpose = pendingLogin()?.purpose || '登录后查看报名、订单及个人服务'
  useUnload(loginPageClosed)

  const handleLogin = (phoneCode?: string) => {
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
          wxLogin(loginRes.code, phoneCode)
            .then((data) => {
              // A new explicit WeChat login may represent a different account.
              clearQuizCache()
              setAuthTokens(data.access_token, data.refresh_token)
              // P0 电子协议：登录即视为同意用户协议与隐私政策，尽力记录签署（失败不阻断登录）
              acceptLoginAgreements().catch(() => undefined)
              void completeLogin()
            })
            .catch((err: unknown) => {
              setIsLoggingIn(false)
              // 登录失败留在当前页，保留原办理目标和协议勾选。
              if ((err as Error)?.message !== 'UNAUTHORIZED') {
                Taro.showToast({ title: '登录失败，请重试', icon: 'none' })
              }
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

  /** 微信手机号授权回调：手机号是登录必要条件，拒绝授权则保持游客（不登录）。 */
  const handleGetPhoneNumber = (phoneCode?: string) => {
    if (!isAgreed) return
    if (phoneCode) {
      handleLogin(phoneCode)
      return
    }
    // 拒绝/取消失败：不创建登录态，停留在游客模式，可稍后重试
    void Taro.showToast({ title: '需授权手机号后才能使用业务功能', icon: 'none', duration: 2500 })
  }

  const handleButtonClick = () => {
    if (!isAgreed) {
      setIsShaking(true)
      setTimeout(() => setIsShaking(false), 500)
      return
    }
    // 已勾选协议时由 openType='getPhoneNumber' 的授权回调接管登录
  }

  return (
    <View className={styles.page}>
      <View className={styles.bgDecor} />

      <View className={styles.content}>
        <View className={`${styles.brand} fade-in-up delay-0`}>
          <Image className={styles.logo} src='/assets/logo/zhi-tian-yuan.svg' mode='aspectFit' />
          <View className={styles.appName}>{STRINGS.AUTH_APP_NAME}</View>
          <View className={styles.appSubtitle}>{STRINGS.AUTH_APP_SUBTITLE}</View>
        </View>

        <View className={`${styles.actions} fade-in-up delay-1`}>
          <Text className={styles.loginPurpose}>{purpose}</Text>
          <Button
            className={`${styles.wechatBtn} ${isLoggingIn ? styles.wechatBtnLoading : ''}`}
            openType={isAgreed && !isLoggingIn ? 'getPhoneNumber' : undefined}
            onGetPhoneNumber={(e) => handleGetPhoneNumber(e.detail?.code)}
            onClick={handleButtonClick}
          >
            <Icon name='message-circle' size={20} color='#ffffff' />
            <Text className={styles.wechatBtnText}>{isLoggingIn ? '登录中...' : STRINGS.AUTH_WECHAT_BTN}</Text>
          </Button>
          <Text className={styles.browseLink} onClick={() => { if (!isLoggingIn) void cancelLogin() }}>暂不登录，继续浏览</Text>

          <View className={`${styles.agreementRow} ${isShaking ? 'shake' : ''} fade-in delay-2`}>
            <AgreementCheckbox
              className={styles.agreement}
              agreed={isAgreed}
              onChange={setIsAgreed}
            >
              {STRINGS.AUTH_AGREEMENT_PREFIX}
              <Text
                className={styles.link}
                onClick={(e) => {
                  e.stopPropagation()
                  Taro.navigateTo({ url: '/pages/agreement/view?type=user_terms' })
                }}
              >
                {STRINGS.AUTH_AGREEMENT_TERMS}
              </Text>
              {STRINGS.AUTH_AGREEMENT_AND}
              <Text
                className={styles.link}
                onClick={(e) => {
                  e.stopPropagation()
                  Taro.navigateTo({ url: '/pages/agreement/view?type=privacy' })
                }}
              >
                {STRINGS.AUTH_AGREEMENT_PRIVACY}
              </Text>
              {STRINGS.AUTH_AGREEMENT_SUFFIX}
            </AgreementCheckbox>
          </View>
        </View>
      </View>
    </View>
  )
}
