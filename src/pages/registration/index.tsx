import { useState, useMemo, useCallback, useEffect } from 'react'
import { View, Text, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { TagFilter } from '@/components/TagFilter'
import { ZoneCard } from '@/components/ZoneCard'
import { EmptyState } from '@/components/EmptyState'
import { STRINGS } from '@/constants/strings'
import { getCertificationList } from '@/services/dataService'
import type { CertificationResponse } from '@/types'
import type { TagFilterItem } from '@/types/registration'
import styles from './index.module.scss'

const VENDOR_DISPLAY_MAP: Record<string, string> = {
  'H3C': STRINGS.REGISTRATION_TAG_H3C,
  '深信服': STRINGS.REGISTRATION_TAG_SANGFOR,
  'NISP': STRINGS.REGISTRATION_TAG_NISP,
  '人社': STRINGS.REGISTRATION_TAG_RS,
}

const VENDOR_ALL = STRINGS.REGISTRATION_TAG_ALL

const VENDOR_ROUTE_MAP: Record<string, string> = {
  'H3C': 'form',
  '深信服': 'form-sangfor',
  'NISP': 'form-nisp',
  '人社': 'form-renshe',
}

export default function RegistrationIndexPage() {
  const [activeTag, setActiveTag] = useState<string>(STRINGS.REGISTRATION_TAG_ALL)
  const [keyword, setKeyword] = useState('')

  const [certifications, setCertifications] = useState<CertificationResponse[]>([])
  const [tagFilters, setTagFilters] = useState<TagFilterItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCertificationList().then((data) => {
      setCertifications(data)
      // Generate tag filters from distinct vendors
      const vendors = [...new Set(data.map(c => c.vendor))]
      const tags: TagFilterItem[] = [
        { label: VENDOR_ALL, activeColor: '#1677FF', activeBg: '#1677FF', activeText: '#ffffff', inactiveBg: '#F0F5FF' },
        ...vendors.map(v => ({
          label: VENDOR_DISPLAY_MAP[v] || v,
          activeColor: '#1677FF',
          activeBg: '#1677FF',
          activeText: '#ffffff',
          inactiveBg: '#F0F5FF',
        })),
      ]
      setTagFilters(tags)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    let list = certifications
    if (activeTag !== STRINGS.REGISTRATION_TAG_ALL) {
      // Find the vendor key from display name
      const vendorKey = Object.entries(VENDOR_DISPLAY_MAP).find(([, v]) => v === activeTag)?.[0]
      if (vendorKey) {
        list = certifications.filter(c => c.vendor === vendorKey)
      }
    }
    if (keyword.trim()) {
      const keywordLower = keyword.trim().toLowerCase()
      list = list.filter(c =>
        (c.name.toLowerCase().includes(keywordLower)) ||
        (c.chinese_name && c.chinese_name.toLowerCase().includes(keywordLower))
      )
    }
    return list
  }, [activeTag, keyword, certifications])

  const handleKeywordInput = useCallback((e: { detail: { value: string } }) => {
    setKeyword(e.detail.value)
  }, [])

  const handleCardClick = useCallback((cert: CertificationResponse) => {
    const route = VENDOR_ROUTE_MAP[cert.vendor] || 'form'
    Taro.navigateTo({ url: `/pages/registration/${route}?cert_id=${cert.id}&cert_name=${encodeURIComponent(cert.name)}` })
  }, [])

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.REGISTRATION_TITLE} shouldShowBack />
        <View className={styles.body}>
          <View className={styles.searchWrap}>
            <Input
              className={styles.searchInput}
              placeholder={STRINGS.REGISTRATION_SEARCH_PLACEHOLDER}
              value={keyword}
              onInput={handleKeywordInput}
            />
          </View>
          <View className={styles.filterRow}>
            <TagFilter tags={tagFilters} activeTag={activeTag} onChange={setActiveTag} />
          </View>
          <View className={styles.cardList}>
            {loading ? (
              <View className={styles.loadingWrap}>
                <Text className={styles.loadingText}>{STRINGS.REGISTRATION_LOADING}</Text>
              </View>
            ) : filtered.length === 0 ? (
              <EmptyState title={STRINGS.REGISTRATION_EMPTY} />
            ) : (
              filtered.map(cert => (
                <View key={cert.id}>
                  <ZoneCard
                    title={cert.name}
                    subtitle={cert.chinese_name}
                    tags={[cert.code, cert.vendor]}
                    buttonText={STRINGS.EXAM_SIGNUP}
                    buttonColor='#1677FF'
                    onButtonClick={() => handleCardClick(cert)}
                  />
                </View>
              ))
            )}
          </View>
        </View>
      </View>
    </AuthGuard>
  )
}