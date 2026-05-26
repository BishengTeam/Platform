import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { STRINGS } from '@/constants/strings'
import { getTeacherContacts } from '@/services/dataService'
import styles from './contact-teachers.module.scss'

export default function ContactTeachersPage() {
  const teachers = getTeacherContacts()

  const handleCall = (phone: string) => {
    Taro.makePhoneCall({ phoneNumber: phone })
  }

  const handleCopyWechat = (wechat: string) => {
    Taro.setClipboardData({ data: wechat })
    Taro.showToast({ title: STRINGS.MINE_CONTACT_WECHAT_COPIED, icon: 'success' })
  }

  const handleCopyQQ = (qq: string) => {
    Taro.setClipboardData({ data: qq })
    Taro.showToast({ title: STRINGS.MINE_CONTACT_QQ_COPIED, icon: 'success' })
  }

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.MINE_CONTACT_TEACHERS_TITLE} shouldShowBack />
        <View className={styles.body}>
          {teachers.map(teacher => (
            <View key={teacher.id} className={styles.card}>
              <View className={styles.avatarPlaceholder}>
                <Text className={styles.avatarText}>{teacher.name[0]}</Text>
              </View>
              <View className={styles.info}>
                <Text className={styles.name}>{teacher.name}</Text>
                <Text className={styles.title}>{teacher.title}</Text>
                <View className={styles.contacts}>
                  <View className={styles.contactItem} onClick={() => handleCall(teacher.phone)}>
                    <Text className={styles.contactLabel}>{STRINGS.MINE_CONTACT_PHONE}: </Text>
                    <Text className={styles.contactValue}>{teacher.phone}</Text>
                  </View>
                  <View className={styles.contactItem} onClick={() => handleCopyWechat(teacher.wechat)}>
                    <Text className={styles.contactLabel}>{STRINGS.MINE_CONTACT_WECHAT}: </Text>
                    <Text className={styles.contactValue}>{teacher.wechat}</Text>
                  </View>
                  <View className={styles.contactItem} onClick={() => handleCopyQQ(teacher.qq)}>
                    <Text className={styles.contactLabel}>{STRINGS.MINE_CONTACT_QQ}: </Text>
                    <Text className={styles.contactValue}>{teacher.qq}</Text>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>
    </AuthGuard>
  )
}
