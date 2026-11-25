import { useCallback, useEffect, useMemo, useState } from 'react'
import { Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { STRINGS } from '@/constants/strings'
import { createVideoWebLoginCode } from '@/services/videoWebService'
import styles from './video-login.module.scss'

export default function VideoLoginCodePage() {
  const [loginCode, setLoginCode] = useState('')
  // 用截止时间戳算剩余秒数，不用自减：切后台/掉帧后回到前台仍是正确倒计时
  const [expiresAt, setExpiresAt] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  const remaining = useMemo(
    () => (expiresAt > 0 ? Math.max(0, Math.ceil((expiresAt - now) / 1000)) : 0),
    [expiresAt, now],
  )
  const expired = expiresAt > 0 && remaining <= 0

  const generate = useCallback(async () => {
    if (generating) return
    setGenerating(true)
    setError('')
    try {
      const result = await createVideoWebLoginCode()
      const issuedAt = Date.now()
      setLoginCode(result.login_code)
      setExpiresAt(issuedAt + Math.max(1, result.expires_in) * 1000)
      setNow(issuedAt)
    } catch (exc) {
      setError(exc instanceof Error ? exc.message : STRINGS.MINE_VIDEO_LOGIN_FAILED)
    } finally {
      setGenerating(false)
    }
  }, [generating])

  // 小程序端没有 window，必须用全局 setInterval（Taro 的 window 垫片不含 setInterval）
  useEffect(() => {
    if (expiresAt <= 0) return
    const timer = setInterval(() => {
      const current = Date.now()
      setNow(current)
      if (current >= expiresAt) clearInterval(timer)
    }, 1000)
    return () => clearInterval(timer)
  }, [expiresAt])

  useDidShow(() => setNow(Date.now()))

  const copy = () => {
    if (!loginCode) return
    if (expired) {
      Taro.showToast({ title: STRINGS.MINE_VIDEO_LOGIN_EXPIRED, icon: 'none' })
      return
    }
    Taro.setClipboardData({
      data: loginCode,
      success: () => Taro.showToast({ title: STRINGS.MINE_VIDEO_LOGIN_COPIED, icon: 'success' }),
      fail: () => Taro.showToast({ title: STRINGS.MINE_VIDEO_LOGIN_COPY_FAILED, icon: 'none' }),
    })
  }

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.MINE_VIDEO_LOGIN_TITLE} shouldShowBack />
        <View className={styles.body}>
          <View className={styles.card}>
            <Text className={styles.title}>{STRINGS.MINE_VIDEO_LOGIN_TITLE}</Text>
            <Text className={styles.desc}>{STRINGS.MINE_VIDEO_LOGIN_DESC}</Text>
            {loginCode ? (
              <>
                <View className={styles.codeWrap}>
                  <Text className={`${styles.code} ${expired ? styles.codeExpired : ''}`}>
                    {loginCode}
                  </Text>
                  <Text className={`${styles.status} ${remaining > 0 ? styles.statusActive : ''}`}>
                    {remaining > 0
                      ? `${remaining}${STRINGS.MINE_VIDEO_LOGIN_SECONDS}`
                      : STRINGS.MINE_VIDEO_LOGIN_EXPIRED}
                  </Text>
                </View>
                <View className={styles.actions}>
                  <Button
                    variant='primary'
                    size='lg'
                    disabled={expired}
                    onClick={copy}
                  >
                    {STRINGS.MINE_VIDEO_LOGIN_COPY}
                  </Button>
                  <Button
                    variant='secondary'
                    size='lg'
                    loading={generating}
                    disabled={generating}
                    onClick={() => { void generate() }}
                  >
                    {expired
                      ? STRINGS.MINE_VIDEO_LOGIN_GENERATE
                      : STRINGS.MINE_VIDEO_LOGIN_REGENERATE}
                  </Button>
                </View>
                {error && <Text className={styles.error}>{error}</Text>}
              </>
            ) : (
              <View className={styles.actions}>
                <Button
                  variant='gradient'
                  size='lg'
                  loading={generating}
                  disabled={generating}
                  onClick={() => { void generate() }}
                >
                  {generating
                    ? STRINGS.MINE_VIDEO_LOGIN_GENERATING
                    : STRINGS.MINE_VIDEO_LOGIN_GENERATE}
                </Button>
                {error && <Text className={styles.error}>{error}</Text>}
              </View>
            )}
            <Text className={styles.tip}>{STRINGS.MINE_VIDEO_LOGIN_TIP}</Text>
          </View>
        </View>
      </View>
    </AuthGuard>
  )
}
