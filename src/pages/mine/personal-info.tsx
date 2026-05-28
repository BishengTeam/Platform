import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Icon } from '@/components/Icon'
import { Button } from '@/components/Button'
import { STRINGS } from '@/constants/strings'
import { ROUTES } from '@/constants/routes'
import styles from './personal-info.module.scss'

interface InfoRow {
  label: string
  value: string
  icon: string
}

const infoRows: InfoRow[] = [
  { label: STRINGS.FORM_NICKNAME, value: '小王同学', icon: 'user' },
  { label: STRINGS.FORM_PHONE, value: '13800008888', icon: 'phone' },
  { label: STRINGS.FORM_EMAIL, value: 'xiaowang@example.com', icon: 'mail' },
]

export default function PersonalInfoPage() {
  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.MINE_PROFILE_TITLE} shouldShowBack />
        <ScrollView className={styles.body} scrollY>
          <View className={styles.card}>
            {infoRows.map((row, index) => (
              <View key={row.label}>
                {index > 0 && <View className={styles.divider} />}
                <View className={styles.infoRow}>
                  <Icon name={row.icon} size={28} color='#666666' />
                  <View className={styles.infoText}>
                    <Text className={styles.infoLabel}>{row.label}</Text>
                    <Text className={styles.infoValue}>{row.value}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>

          <View className={styles.btnWrap}>
            <Button variant='gradient' size='lg' onClick={() => Taro.navigateTo({ url: `/${ROUTES.MINE_EDIT_PROFILE}` })}>
              {STRINGS.MINE_EDIT_PROFILE_TITLE}
            </Button>
          </View>
        </ScrollView>
      </View>
    </AuthGuard>
  )
}
