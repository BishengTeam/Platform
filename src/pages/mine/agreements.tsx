import { useState, useEffect, useCallback } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { STRINGS } from '@/constants/strings'
import { getMyAgreementAcceptances } from '@/services/dataService'
import type { AgreementAcceptance } from '@/services/dataService'
import styles from './agreements.module.scss'

const TYPE_LABELS: Record<string, string> = {
  user_terms: STRINGS.AUTH_AGREEMENT_TERMS,
  privacy: STRINGS.AUTH_AGREEMENT_PRIVACY,
  identity_auth: STRINGS.AGREEMENT_TYPE_IDENTITY_AUTH,
  cert_registration: STRINGS.AGREEMENT_TYPE_CERT_REGISTRATION,
}

function formatTime(value: string): string {
  if (!value) return '-'
  return value.replace('T', ' ').replace(/Z$/, '').slice(0, 19)
}

/**
 * 我的协议（P0 电子协议）— 已签署协议记录列表。
 * 旧版培训协议假签名 demo 已移除；培训协议（业务合同）延后按决策档案开发。
 */
export default function AgreementsPage() {
  const [items, setItems] = useState<AgreementAcceptance[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      setItems(await getMyAgreementAcceptances())
    } catch {
      Taro.showToast({ title: STRINGS.MINE_AGREEMENTS_LOAD_FAILED, icon: 'none' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const openDetail = (type: string) => {
    Taro.navigateTo({ url: `/pages/agreement/view?type=${type}` })
  }

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.MINE_AGREEMENTS_TITLE} shouldShowBack />
        <ScrollView className={styles.body} scrollY>
          {loading ? (
            <View className={styles.empty}>
              <Text className={styles.emptyText}>{STRINGS.AGREEMENT_LOADING}</Text>
            </View>
          ) : items.length === 0 ? (
            <View className={styles.empty}>
              <Text className={styles.emptyText}>{STRINGS.MINE_AGREEMENTS_EMPTY}</Text>
            </View>
          ) : (
            items.map((item) => (
              <View key={item.id} className={styles.card} onClick={() => openDetail(item.type)}>
                <View className={styles.cardHeader}>
                  <Text className={styles.cardTitle}>{item.title}</Text>
                  <Text className={styles.badge}>{TYPE_LABELS[item.type] || item.type}</Text>
                </View>
                <View className={styles.cardMeta}>
                  <Text className={styles.metaText}>{STRINGS.MINE_AGREEMENTS_VERSION} v{item.version}</Text>
                  <Text className={styles.metaText}>
                    {STRINGS.MINE_AGREEMENTS_SIGN_TIME} {formatTime(item.acceptedAt)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </AuthGuard>
  )
}
