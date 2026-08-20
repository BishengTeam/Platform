import { useState, useMemo, useCallback, useEffect } from 'react'
import { View, Text, Input } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { TagFilter } from '@/components/TagFilter'
import { ZoneCard } from '@/components/ZoneCard'
import { EmptyState } from '@/components/EmptyState'
import { STRINGS } from '@/constants/strings'
import { getCertificationList } from '@/services/dataService'
import { ROUTES } from '@/constants/routes'
import type { CertificationResponse } from '@/types'
import type { TagFilterItem } from '@/types/registration'
import styles from './category.module.scss'

const VENDOR_DISPLAY_MAP: Record<string, string> = {
  'H3C': STRINGS.REGISTRATION_TAG_H3C,
  '深信服': STRINGS.REGISTRATION_TAG_SANGFOR,
  'NISP': STRINGS.REGISTRATION_TAG_NISP,
  '人社': STRINGS.REGISTRATION_TAG_RS,
}

const VENDOR_META: Record<string, { title: string; desc: string }> = {
  'H3C': { title: 'H3C 认证', desc: '新华三网络工程师认证' },
  '深信服': { title: '深信服认证', desc: '安全技术方向认证' },
  'NISP': { title: 'NISP 认证', desc: '国家信息安全水平考试' },
  '人社': { title: '人社认证', desc: '职业技能等级认证' },
}

export default function RegistrationCategoryPage() {
  const [vendor, setVendor] = useState<string>('')
  const [keyword, setKeyword] = useState('')
  const [certifications, setCertifications] = useState<CertificationResponse[]>([])
  const [tagFilters, setTagFilters] = useState<TagFilterItem[]>([])
  const [loading, setLoading] = useState(true)

  useLoad((options) => {
    const rawVendor = options?.vendor || ''
    setVendor(rawVendor ? decodeURIComponent(rawVendor) : '')
  })

  useEffect(() => {
    getCertificationList().then((data) => {
      setCertifications(data)
      const vendors = [...new Set(data.map(c => c.vendor))]
      const tags: TagFilterItem[] = [
        { label: STRINGS.REGISTRATION_ALL_CERTS, activeColor: '#1677FF', activeBg: '#1677FF', activeText: '#ffffff', inactiveBg: '#F0F5FF' },
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
    if (vendor) {
      list = list.filter(c => c.vendor === vendor)
    }
    if (keyword.trim()) {
      const keywordLower = keyword.trim().toLowerCase()
      list = list.filter(c =>
        (c.name.toLowerCase().includes(keywordLower)) ||
        (c.chinese_name && c.chinese_name.toLowerCase().includes(keywordLower))
      )
    }
    return list
  }, [vendor, keyword, certifications])

  const handleKeywordInput = useCallback((e: { detail: { value: string } }) => {
    setKeyword(e.detail.value)
  }, [])

  const handleTagChange = useCallback((tag: string) => {
    if (tag === STRINGS.REGISTRATION_ALL_CERTS) {
      setVendor('')
    } else {
      const vendorKey = Object.entries(VENDOR_DISPLAY_MAP).find(([, v]) => v === tag)?.[0]
      if (vendorKey) setVendor(vendorKey)
    }
  }, [])

  const handleCardClick = useCallback((cert: CertificationResponse) => {
    if (cert.vendor === 'H3C') {
      Taro.navigateTo({ url: `/${ROUTES.H3C_INDEX}` })
      return
    }
    Taro.navigateTo({ url: `/pages/registration/form?cert_id=${cert.id}&cert_name=${encodeURIComponent(cert.name)}` })
  }, [])

  const activeTag = useMemo(() => {
    if (!vendor) return STRINGS.REGISTRATION_ALL_CERTS
    return VENDOR_DISPLAY_MAP[vendor] || vendor
  }, [vendor])

  const pageTitle = useMemo(() => {
    if (!vendor) return STRINGS.REGISTRATION_TITLE
    return VENDOR_META[vendor]?.title || `${vendor}认证`
  }, [vendor])

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={pageTitle} shouldShowBack />
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
            <TagFilter tags={tagFilters} activeTag={activeTag} onChange={handleTagChange} />
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
                    onCardClick={() => handleCardClick(cert)}
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
