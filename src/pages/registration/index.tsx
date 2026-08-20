import { useState, useMemo, useCallback, useEffect } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Icon } from '@/components/Icon'
import { STRINGS } from '@/constants/strings'
import { getCertificationList } from '@/services/dataService'
import { ROUTES } from '@/constants/routes'
import type { CertificationResponse } from '@/types'
import styles from './index.module.scss'

const VENDOR_DISPLAY_MAP: Record<string, string> = {
  'H3C': STRINGS.REGISTRATION_TAG_H3C,
  '深信服': STRINGS.REGISTRATION_TAG_SANGFOR,
  'NISP': STRINGS.REGISTRATION_TAG_NISP,
  '人社': STRINGS.REGISTRATION_TAG_RS,
}

const VENDOR_META: Record<string, { title: string; desc: string; color: string; icon: string }> = {
  'H3C': { title: 'H3C 认证', desc: '新华三网络工程师认证', color: '#1677FF', icon: 'award' },
  '深信服': { title: '深信服认证', desc: '安全技术方向认证', color: '#52C41A', icon: 'shield' },
  'NISP': { title: 'NISP 认证', desc: '国家信息安全水平考试', color: '#FAAD14', icon: 'terminal' },
  '人社': { title: '人社认证', desc: '职业技能等级认证', color: '#EB2F96', icon: 'file-text' },
}

const VENDOR_ORDER = ['H3C', '深信服', 'NISP', '人社']

export default function RegistrationIndexPage() {
  const [certifications, setCertifications] = useState<CertificationResponse[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCertificationList().then((data) => {
      setCertifications(data)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const grouped = useMemo(() => {
    const map: Record<string, CertificationResponse[]> = {}
    certifications.forEach(cert => {
      if (!map[cert.vendor]) map[cert.vendor] = []
      map[cert.vendor].push(cert)
    })
    return map
  }, [certifications])

  const categories = useMemo(() => {
    return VENDOR_ORDER.filter(v => grouped[v]).map(v => ({
      vendor: v,
      title: VENDOR_META[v]?.title || VENDOR_DISPLAY_MAP[v] || v,
      desc: VENDOR_META[v]?.desc || '',
      color: VENDOR_META[v]?.color || '#1677FF',
      icon: VENDOR_META[v]?.icon || 'award',
      count: grouped[v]?.length || 0,
    }))
  }, [grouped])

  const handleCategoryClick = useCallback((vendor: string) => {
    if (vendor === 'H3C') {
      Taro.navigateTo({ url: `/${ROUTES.H3C_INDEX}` })
      return
    }
    Taro.navigateTo({ url: `/pages/registration/category?vendor=${encodeURIComponent(vendor)}` })
  }, [])

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.REGISTRATION_TITLE} shouldShowBack />
        <View className={styles.body}>
          <View className={styles.sectionHeader}>
            <Text className={styles.sectionTitle}>{STRINGS.REGISTRATION_CATEGORY_TITLE}</Text>
          </View>

          <View className={styles.list}>
            {loading ? (
              <View className={styles.loadingWrap}>
                <Text className={styles.loadingText}>{STRINGS.REGISTRATION_LOADING}</Text>
              </View>
            ) : (
              categories.map(item => (
                <View
                  key={item.vendor}
                  className={styles.categoryCard}
                  onClick={() => handleCategoryClick(item.vendor)}
                >
                  <View className={styles.iconWrap} style={{ backgroundColor: `${item.color}10` }}>
                    <Icon name={item.icon} size={24} color={item.color} />
                  </View>
                  <View className={styles.cardContent}>
                    <View className={styles.cardTitleRow}>
                      <Text className={styles.cardTitle}>{item.title}</Text>
                      <Text className={styles.badge}>{STRINGS.REGISTRATION_CATEGORY_COUNT.replace('{count}', String(item.count))}</Text>
                    </View>
                    <Text className={styles.cardDesc}>{item.desc}</Text>
                  </View>
                  <Icon name='chevron-right' size={20} color='#CCCCCC' />
                </View>
              ))
            )}
          </View>
        </View>
      </View>
    </AuthGuard>
  )
}
