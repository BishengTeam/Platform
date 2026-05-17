import { View, Text } from '@tarojs/components'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Icon } from '@/components/Icon'
import { STRINGS } from '@/constants/strings'
import { getCertificates } from '@/services/dataService'
import styles from './index.module.scss'

export default function CertificatesPage() {
  const list = getCertificates()

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.CERTIFICATES_TITLE} shouldShowBack />
        <View className={styles.body}>
          <View className={styles.list}>
            {list.map(cert => (
              <View key={cert.id} className={styles.card}>
                <View className={styles.cardLeft}>
                  <View className={styles.iconWrap}>
                    <Icon name='award' size={32} color='#1677FF' />
                  </View>
                </View>
                <View className={styles.cardRight}>
                  <Text className={styles.certName}>{cert.name}</Text>
                  <Text className={styles.certDesc}>{cert.description}</Text>
                  <View className={styles.certMeta}>
                    <Text className={styles.certDate}>
                      {STRINGS.CERTIFICATES_ISSUE_DATE}{cert.issueDate}
                    </Text>
                    <Text className={styles.certAuthority}>
                      {STRINGS.CERTIFICATES_AUTHORITY}{cert.authority}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>
    </AuthGuard>
  )
}
