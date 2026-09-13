import { useState, useEffect, useCallback, useRef } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { STRINGS } from '@/constants/strings'
import { listAgreementStatuses } from '@/services/dataService'
import type { AgreementStatus } from '@/services/dataService'
import styles from './agreements.module.scss'

const TYPE_LABELS: Record<string, string> = {
  user_terms: STRINGS.AUTH_AGREEMENT_TERMS,
  privacy: STRINGS.AUTH_AGREEMENT_PRIVACY,
  identity_auth: STRINGS.AGREEMENT_TYPE_IDENTITY_AUTH,
  cert_registration: STRINGS.AGREEMENT_TYPE_CERT_REGISTRATION,
}

function formatTime(value: string | null): string {
  if (!value) return '-'
  return value.replace('T', ' ').replace(/Z$/, '').slice(0, 19)
}

function badgeClass(item: AgreementStatus): string {
  if (item.latestSigned) return `${styles.badge} ${styles.badgeGreen}`
  if (item.signedVersion !== null) return `${styles.badge} ${styles.badgeOrange}`
  return styles.badge
}

function badgeText(item: AgreementStatus): string {
  if (item.latestSigned) return STRINGS.MINE_AGREEMENTS_STATUS_SIGNED
  if (item.signedVersion !== null) return STRINGS.MINE_AGREEMENTS_STATUS_OUTDATED
  return STRINGS.MINE_AGREEMENTS_STATUS_UNSIGNED
}

/**
 * 我的协议 — 展示全部已配置的协议类型与签署状态（未签署也可进入签署）。
 * 已实名但从未走过实名提交拦截的存量用户，可在这里补签《实名信息授权协议》。
 */
export default function AgreementsPage() {
  const [items, setItems] = useState<AgreementStatus[]>([])
  const [loading, setLoading] = useState(true)
  const firstShow = useRef(true)

  const load = useCallback(async () => {
    try {
      setItems(await listAgreementStatuses())
    } catch {
      Taro.showToast({ title: STRINGS.MINE_AGREEMENTS_LOAD_FAILED, icon: 'none' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // 从签署页返回时刷新签署状态
  useDidShow(() => {
    if (firstShow.current) {
      firstShow.current = false
      return
    }
    load()
  })

  const open = (item: AgreementStatus) => {
    const requireSign = item.latestSigned ? '' : '&requireSign=1'
    Taro.navigateTo({ url: `/pages/agreement/view?type=${item.type}${requireSign}` })
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
              <Text className={styles.emptyText}>{STRINGS.MINE_AGREEMENTS_NONE_CONFIGURED}</Text>
            </View>
          ) : (
            items.map((item) => (
              <View key={item.type} className={styles.card} onClick={() => open(item)}>
                <View className={styles.cardHeader}>
                  <Text className={styles.cardTitle}>{item.title}</Text>
                  <Text className={badgeClass(item)}>{badgeText(item)}</Text>
                </View>
                <View className={styles.cardMeta}>
                  <Text className={styles.metaText}>{TYPE_LABELS[item.type] || item.type}</Text>
                  <Text className={styles.metaText}>
                    {STRINGS.MINE_AGREEMENTS_VERSION} v{item.version}
                  </Text>
                  {item.signedVersion !== null && (
                    <Text className={styles.metaText}>
                      已签 v{item.signedVersion} · {formatTime(item.acceptedAt)}
                    </Text>
                  )}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </AuthGuard>
  )
}
