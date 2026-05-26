import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { STRINGS } from '@/constants/strings'
import styles from './index.module.scss'

const POSTERS = [
  {
    id: 'p1',
    title: '2026全国大学生网络技术大赛',
    desc: '火热报名中！赢取万元奖金与名企实习机会',
    type: 'competition',
    tag: '竞赛',
  },
  {
    id: 'p2',
    title: 'H3CNE 认证暑期特惠',
    desc: '学生价立减400元，限时优惠',
    type: 'coupon',
    tag: '优惠券',
  },
  {
    id: 'p3',
    title: '网络安全技能培训营',
    desc: '暑假集训班报名开启，名额有限',
    type: 'activity',
    tag: '活动',
  },
]

export default function LoginPosterPage() {
  const handleClaim = (_id: string) => {
    Taro.showToast({ title: STRINGS.LOGIN_POSTER_CLAIMED, icon: 'success' })
  }

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.LOGIN_POSTER_TITLE} shouldShowBack />
        <View className={styles.body}>
          <Text className={styles.hint}>{STRINGS.LOGIN_POSTER_WELCOME}</Text>
          {POSTERS.map(poster => (
            <View key={poster.id} className={styles.posterCard}>
              <View className={styles.posterImage}>
                <View className={styles.posterPlaceholder}>
                  <Text className={styles.posterIcon}>
                    {poster.type === 'competition' ? '🏆' : poster.type === 'coupon' ? '🎫' : '🎉'}
                  </Text>
                </View>
                <View className={styles.posterTag}>
                  <Text className={styles.posterTagText}>{poster.tag}</Text>
                </View>
              </View>
              <View className={styles.posterInfo}>
                <Text className={styles.posterTitle}>{poster.title}</Text>
                <Text className={styles.posterDesc}>{poster.desc}</Text>
                <View className={styles.posterAction}>
                  <Button size='sm' variant='gradient' onClick={() => handleClaim(poster.id)}>
                    {poster.type === 'coupon' ? STRINGS.LOGIN_POSTER_CLAIM_NOW : STRINGS.LOGIN_POSTER_VIEW_DETAIL}
                  </Button>
                </View>
              </View>
            </View>
          ))}

          <View className={styles.btnWrap}>
            <Button variant='secondary' size='lg' onClick={() => Taro.navigateBack()}>
              {STRINGS.LOGIN_POSTER_CLOSE}
            </Button>
          </View>
        </View>
      </View>
    </AuthGuard>
  )
}
