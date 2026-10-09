import { useCallback, useEffect, useState } from 'react'
import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import { STRINGS } from '@/constants/strings'
import { createVideoWebLoginCode } from '@/services/videoWebService'
import styles from './video-login.module.scss'

export default function VideoLoginCodePage() {
  const [loginCode, setLoginCode] = useState('')
  const [remaining, setRemaining] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  const generate = useCallback(async () => {
    if (generating) return
    setGenerating(true)
    setError('')
    try {
      const result = await createVideoWebLoginCode()
      setLoginCode(result.login_code)
      setRemaining(result.expires_in)
    } catch (exc) {
      setError(exc instanceof Error ? exc.message : STRINGS.MINE_VIDEO_LOGIN_FAILED)
    } finally {
      setGenerating(false)
    }
  }, [generating])

  useEffect(() => {
    if (remaining <= 0) return
    const timer = window.setInterval(() => {
      setRemaining(value => Math.max(0, value - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [remaining > 0])

  const copy = () => {
    if (!loginCode || remaining <= 0) return
    Taro.setClipboardData({
      data: loginCode,
      success: () => Taro.showToast({ title: STRINGS.MINE_VIDEO_LOGIN_COPIED, icon: 'success' }),
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
                  <Text className={`${styles.code} ${remaining <= 0 ? styles.codeExpired : ''}`}>
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
                    disabled={remaining <= 0}
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
                    {remaining > 0
                      ? STRINGS.MINE_VIDEO_LOGIN_REGENERATE
                      : STRINGS.MINE_VIDEO_LOGIN_GENERATE}
                  </Button>
                </View>
              </>
            ) : (
              <View className={styles.actions}>
                {error && <EmptyState title={error} />}
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
              </View>
            )}
            <Text className={styles.tip}>{STRINGS.MINE_VIDEO_LOGIN_TIP}</Text>
          </View>
        </View>
      </View>
    </AuthGuard>
  )
}
