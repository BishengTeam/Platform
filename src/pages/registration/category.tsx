import { useState, useMemo, useCallback, useEffect } from 'react'
import { View, Text, Input, ScrollView } from '@tarojs/components'
import { useLoad } from '@tarojs/taro'
import { PageHeader } from '@/components/PageHeader'
import { Icon } from '@/components/Icon'
import { EmptyState } from '@/components/EmptyState'
import { STRINGS } from '@/constants/strings'
import { getCertificationList } from '@/services/dataService'
import { rensheService } from '@/services/rensheService'
import { navigateToCertRegistration } from '@/utils/certNavigation'
import type { CertificationResponse } from '@/types'
import styles from './category.module.scss'

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

const DEFAULT_VENDOR_COLOR = '#1677FF'
const DEFAULT_VENDOR_ICON = 'award'

// Segment 风格 Tab：选中 #2F80ED 蓝底白字，未选中浅灰底蓝色文字。
const TAB_ALL = STRINGS.REGISTRATION_ALL_CERTS

export default function RegistrationCategoryPage() {
  const [vendor, setVendor] = useState<string>('')
  const [keyword, setKeyword] = useState('')
  const [certifications, setCertifications] = useState<CertificationResponse[]>([])
  const [occupationCodes, setOccupationCodes] = useState<Record<number, string>>({})
  const [tabLabels, setTabLabels] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useLoad((options) => {
    const rawVendor = options?.vendor || ''
    setVendor(rawVendor ? decodeURIComponent(rawVendor) : '')
  })

  useEffect(() => {
    getCertificationList().then((data) => {
      setCertifications(data)
      const vendors = [...new Set(data.map(c => c.vendor))]
      const labels = [
        TAB_ALL,
        ...vendors.map(v => VENDOR_DISPLAY_MAP[v] || v),
      ]
      setTabLabels(labels)
    }).catch(() => {}).finally(() => setLoading(false))

    // 人社产品的职业编码来自现有报考项目接口；其他认证没有该业务字段。
    rensheService.listProjects()
      .then(projects => {
        setOccupationCodes(Object.fromEntries(
          projects.map(project => [project.id, project.occupation_code]),
        ))
      })
      .catch(() => setOccupationCodes({}))
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
    navigateToCertRegistration(cert)
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
    <>
      <View className={styles.page}>
        <PageHeader title={pageTitle} shouldShowBack />
        <View className={styles.body}>
          <View className={styles.searchWrap}>
            <View className={styles.searchBox}>
              <Icon name='search' size={16} color='#999999' className={styles.searchIcon} />
              <Input
                className={styles.searchInput}
                placeholder={STRINGS.REGISTRATION_SEARCH_PLACEHOLDER}
                value={keyword}
                onInput={handleKeywordInput}
              />
            </View>
          </View>
          <View className={styles.filterRow}>
            <ScrollView scrollX className={styles.tabScroll} enableFlex>
              <View className={styles.tabRow}>
                {tabLabels.map(label => (
                  <View
                    key={label}
                    className={`${styles.tabItem} ${activeTag === label ? styles.tabItemActive : ''}`}
                    onClick={() => handleTagChange(label)}
                  >
                    <Text className={styles.tabText}>{label}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
          <View className={styles.cardList}>
            {loading ? (
              <View className={styles.loadingWrap}>
                <Text className={styles.loadingText}>{STRINGS.REGISTRATION_LOADING}</Text>
              </View>
            ) : filtered.length === 0 ? (
              <EmptyState title={STRINGS.REGISTRATION_EMPTY} />
            ) : (
              filtered.map(cert => {
                const vendorColor = VENDOR_META[cert.vendor]?.color || DEFAULT_VENDOR_COLOR
                const vendorIcon = VENDOR_META[cert.vendor]?.icon || DEFAULT_VENDOR_ICON
                return (
                  <View key={cert.id} className={styles.certCard} onClick={() => handleCardClick(cert)}>
                    <View className={styles.certIcon} style={{ backgroundColor: `${vendorColor}14` }}>
                      <Icon name={vendorIcon} size={24} color={vendorColor} />
                    </View>
                    <View className={styles.certInfo}>
                      <Text className={styles.certTitle}>{cert.chinese_name || cert.name}</Text>
                      {cert.vendor === '人社' && occupationCodes[cert.id] && (
                        <Text className={styles.certOccupation}>{occupationCodes[cert.id]}</Text>
                      )}
                      <View className={styles.certTags}>
                        <Text className={styles.certTag}>{VENDOR_DISPLAY_MAP[cert.vendor] || cert.vendor}</Text>
                        {cert.code && <Text className={styles.certTag}>{cert.code}</Text>}
                      </View>
                    </View>
                    <View className={styles.certRight}>
                      <Text className={styles.certBadge}>查看批次</Text>
                      <Icon name='chevron-right' size={16} color='#C9CDD4' />
                    </View>
                  </View>
                )
              })
            )}
          </View>
        </View>
      </View>
    </>
  )
}
