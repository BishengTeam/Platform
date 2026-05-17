import { View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { Icon } from '@/components/Icon'
import { PageHeader } from '@/components/PageHeader'
import { STRINGS } from '@/constants/strings'
import { getContactList } from '@/services/dataService'
import styles from './index.module.scss'

export default function ServicePage() {
  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader
          title={STRINGS.SERVICE_HEADER}
          shouldShowBack
          onBack={() => Taro.switchTab({ url: '/pages/index/index' })}
        />

        <View className={styles.body}>
          <View className={styles.card}>
            <View className={styles.avatar}>H</View>
            <View className={styles.cardTitle}>{STRINGS.SERVICE_CARD_TITLE}</View>
            <View className={styles.cardSubtitle}>{STRINGS.SERVICE_CARD_SUBTITLE}</View>

            <View className={styles.contacts}>
              {getContactList().map((contact, idx) => (
                <View key={idx} className={styles.contactItem}>
                  <View className={styles.contactLeft}>
                    <View className={styles.contactIcon}>
                      <Icon name={contact.icon} size={16} color='#1677FF' />
                    </View>
                    <View>
                      <View className={styles.contactLabel}>{contact.label}</View>
                      <View className={styles.contactValue}>{contact.value}</View>
                    </View>
                  </View>
                  <View className={styles.contactAction}>{contact.action}</View>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>
    </AuthGuard>
  )
}
