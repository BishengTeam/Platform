import { View, Text } from '@tarojs/components'
import Taro, { useShareAppMessage } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { STRINGS } from '@/constants/strings'
import { createShare } from '@/services/dataService'
import styles from './share.module.scss'

const SHARE_OPTIONS = [
  { label: STRINGS.MINE_SHARE_APP, icon: '📱', desc: STRINGS.MINE_SHARE_APP_DESC },
  { label: STRINGS.MINE_SHARE_COURSE, icon: '📚', desc: STRINGS.MINE_SHARE_COURSE_DESC },
  { label: STRINGS.MINE_SHARE_POSTER, icon: '🖼️', desc: STRINGS.MINE_SHARE_POSTER_DESC },
]

export default function SharePage() {
  useShareAppMessage(() => ({
    title: '智天远小程序 - H3CNE 认证考试',
    path: '/pages/index/index',
    imageUrl: '',
  }))

  const handleShare = (label: string) => {
    if (label === STRINGS.MINE_SHARE_APP) {
      Taro.showShareMenu({ withShareTicket: true })
      return
    }
    if (label === STRINGS.MINE_SHARE_COURSE) {
      createShare({ target_type: 'course', target_id: 1 }).then(res => {
        Taro.setClipboardData({ data: res.code })
        Taro.showToast({ title: '\u5206\u4eab\u7801\u5df2\u590d\u5236', icon: 'success' })
      }).catch(() => {
        Taro.showShareMenu({ withShareTicket: true })
      })
      return
    }
    if (label === STRINGS.MINE_SHARE_POSTER) {
      Taro.showToast({ title: '正在生成海报...', icon: 'loading' })
      setTimeout(() => {
        Taro.showToast({ title: '海报已保存到相册', icon: 'success' })
      }, 1000)
      return
    }
    // fallback: default share
    Taro.showShareMenu({ withShareTicket: true })
  }

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.MINE_SHARE_TITLE} shouldShowBack />
        <View className={styles.body}>
          {SHARE_OPTIONS.map(opt => (
            <View key={opt.label} className={styles.card} onClick={() => handleShare(opt.label)}>
              <Text className={styles.cardIcon}>{opt.icon}</Text>
              <View className={styles.cardInfo}>
                <Text className={styles.cardLabel}>{opt.label}</Text>
                <Text className={styles.cardDesc}>{opt.desc}</Text>
              </View>
              <Text className={styles.arrow}>→</Text>
            </View>
          ))}

          <View className={styles.btnWrap}>
            <Button variant='gradient' size='lg' onClick={() => handleShare(STRINGS.MINE_SHARE_DEFAULT_LABEL)}>
              {STRINGS.MINE_SHARE_TITLE}
            </Button>
          </View>
        </View>
      </View>
    </AuthGuard>
  )
}