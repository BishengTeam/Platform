import { useState, useMemo, useCallback, useEffect } from 'react'
import { View, Text, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { TagFilter } from '@/components/TagFilter'
import { ZoneCard } from '@/components/ZoneCard'
import { STRINGS } from '@/constants/strings'
import { getCertZone } from '@/services/dataService'
import type { CertZoneResponse, CertificationResponse, ZoneBrief } from '@/types'
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
  const [zoneCards, setZoneCards] = useState<ZoneBrief[]>([])

  useEffect(() => {
    getCertZone().then((data: CertZoneResponse) => {
      setCertifications(data.certifications)
      setZoneCards(data.zones.slice(1))
      // Generate tag filters from distinct vendors
      const vendors = [...new Set(data.certifications.map(c => c.vendor))]
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
    })
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
          {/* Zone cards from zones.slice(1) */}
          {zoneCards.map((zone: ZoneBrief) => (
            <View key={zone.id}>
              <ZoneCard
                title={zone.title}
                subtitle={zone.description ?? ''}
                tags={[]}
                buttonText={STRINGS.EXAM_SIGNUP}
                buttonColor='#1677FF'
                onButtonClick={() => zone.link_url && Taro.navigateTo({ url: zone.link_url })}
              />
            </View>
          ))}
          <View className={styles.cardList}>
            {filtered.map(cert => (
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
            ))}
          </View>
        </View>
      </View>
    </AuthGuard>
  )
}