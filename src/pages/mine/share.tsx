import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { STRINGS } from '@/constants/strings'
import styles from './share.module.scss'

const SHARE_OPTIONS = [
  { label: STRINGS.MINE_SHARE_APP, icon: '📱', desc: STRINGS.MINE_SHARE_APP_DESC },
  { label: STRINGS.MINE_SHARE_COURSE, icon: '📚', desc: STRINGS.MINE_SHARE_COURSE_DESC },
  { label: STRINGS.MINE_SHARE_POSTER, icon: '🖼️', desc: STRINGS.MINE_SHARE_POSTER_DESC },
]

export default function SharePage() {
  const handleShare = (label: string) => {
    Taro.showToast({ title: `${label}功能开发中`, icon: 'none' })
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
            <Button variant='gradient' size='lg' onClick={() => handleShare('分享')}>
              {STRINGS.MINE_SHARE_TITLE}
            </Button>
          </View>
        </View>
      </View>
    </AuthGuard>
  )
}
