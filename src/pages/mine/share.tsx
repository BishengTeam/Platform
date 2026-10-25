import { useEffect, useState } from 'react'
import { View, Text, Button } from '@tarojs/components'
import Taro, { useShareAppMessage } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { STRINGS } from '@/constants/strings'
import { createShare, getSharePoster } from '@/services/dataService'
import { resolveMediaUrl } from '@/utils/media'
import styles from './share.module.scss'

const SHARE_OPTIONS = [
  { label: STRINGS.MINE_SHARE_APP, icon: '📱', desc: STRINGS.MINE_SHARE_APP_DESC },
  { label: STRINGS.MINE_SHARE_COURSE, icon: '📚', desc: STRINGS.MINE_SHARE_COURSE_DESC },
  { label: STRINGS.MINE_SHARE_POSTER, icon: '🖼️', desc: STRINGS.MINE_SHARE_POSTER_DESC },
]

export default function SharePage() {
  useShareAppMessage(() => ({
    title: '智天远优学',
    path: '/pages/index/index',
    imageUrl: '',
  }))

  const [posterUrl, setPosterUrl] = useState<string | null>(null)
  const [posterLoaded, setPosterLoaded] = useState(false)

  useEffect(() => {
    getSharePoster()
      .then(res => setPosterUrl(res.image_url || null))
      .catch(() => setPosterUrl(null))
      .finally(() => setPosterLoaded(true))
  }, [])

  const handleShareCourse = () => {
    createShare({ target_type: 'course', target_id: 1 }).then(res => {
      Taro.setClipboardData({ data: res.code })
      Taro.showToast({ title: '分享码已复制', icon: 'success' })
    }).catch(() => {
      Taro.showShareMenu({ withShareTicket: true })
    })
  }

  const handleShare = (label: string) => {
    if (label === STRINGS.MINE_SHARE_COURSE) {
      handleShareCourse()
      return
    }
    if (label === STRINGS.MINE_SHARE_POSTER) {
      handlePreviewPoster()
    }
  }

  // 后台上传的纯图海报：全屏预览，微信原生长按菜单即可保存到相册/转发
  const handlePreviewPoster = () => {
    if (!posterUrl) return
    Taro.showToast({ title: '长按海报可保存到相册', icon: 'none' })
    Taro.previewImage({ urls: [resolveMediaUrl(posterUrl)] })
  }

  const posterEnabled = posterLoaded && Boolean(posterUrl)

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.MINE_SHARE_TITLE} shouldShowBack />
        <View className={styles.body}>
          <Button className={`${styles.card} ${styles.cardAsButton}`} openType='share'>
            <Text className={styles.cardIcon}>{SHARE_OPTIONS[0].icon}</Text>
            <View className={styles.cardInfo}>
              <Text className={styles.cardLabel}>{SHARE_OPTIONS[0].label}</Text>
              <Text className={styles.cardDesc}>{SHARE_OPTIONS[0].desc}</Text>
            </View>
            <Text className={styles.arrow}>→</Text>
          </Button>

          {SHARE_OPTIONS.slice(1).map(opt => (
            <View
              key={opt.label}
              className={`${styles.card} ${opt.label === STRINGS.MINE_SHARE_POSTER && !posterEnabled ? styles.cardDisabled : ''}`}
              onClick={() => (opt.label === STRINGS.MINE_SHARE_POSTER && !posterEnabled ? undefined : handleShare(opt.label))}
            >
              <Text className={styles.cardIcon}>{opt.icon}</Text>
              <View className={styles.cardInfo}>
                <Text className={styles.cardLabel}>{opt.label}</Text>
                <Text className={styles.cardDesc}>{opt.desc}</Text>
              </View>
              <Text className={styles.arrow}>→</Text>
            </View>
          ))}

          <View className={styles.btnWrap}>
            <Button className={styles.shareBtn} openType='share'>
              {STRINGS.MINE_SHARE_TITLE}
            </Button>
          </View>
        </View>
      </View>
    </AuthGuard>
  )
}
