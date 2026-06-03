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
    title: STRINGS.LOGIN_POSTER_CARD_1_TITLE,
    desc: STRINGS.LOGIN_POSTER_CARD_1_DESC,
    type: 'competition',
    tag: STRINGS.LOGIN_POSTER_CARD_1_TAG,
  },
  {
    id: 'p2',
    title: STRINGS.LOGIN_POSTER_CARD_2_TITLE,
    desc: STRINGS.LOGIN_POSTER_CARD_2_DESC,
    type: 'coupon',
    tag: STRINGS.LOGIN_POSTER_CARD_2_TAG,
  },
  {
    id: 'p3',
    title: STRINGS.LOGIN_POSTER_CARD_3_TITLE,
    desc: STRINGS.LOGIN_POSTER_CARD_3_DESC,
    type: 'activity',
    tag: STRINGS.LOGIN_POSTER_CARD_3_TAG,
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