import { useState, useMemo, useCallback } from 'react'
import { View, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { TagFilter } from '@/components/TagFilter'
import { ZoneCard } from '@/components/ZoneCard'
import { STRINGS } from '@/constants/strings'
import { getCertifications, getRegistrationTagFilters } from '@/services/dataService'
import styles from './index.module.scss'

const VENDOR_MAP: Record<string, string> = {
  [STRINGS.REGISTRATION_TAG_H3C]: 'h3c',
  [STRINGS.REGISTRATION_TAG_SANGFOR]: 'sangfor',
  [STRINGS.REGISTRATION_TAG_NISP]: 'nisp',
  [STRINGS.REGISTRATION_TAG_RS]: 'rs',
}

export default function RegistrationIndexPage() {
  const [activeTag, setActiveTag] = useState<string>(STRINGS.REGISTRATION_TAG_ALL)
  const [keyword, setKeyword] = useState('')

  const certifications = getCertifications()
  const tagFilters = getRegistrationTagFilters()

  const filtered = useMemo(() => {
    let list = certifications
    if (activeTag !== STRINGS.REGISTRATION_TAG_ALL) {
      const vendor = VENDOR_MAP[activeTag]
      if (vendor) {
        list = certifications.filter(c => c.vendor === vendor)
      }
    }
    if (keyword.trim()) {
      const keywordLower = keyword.trim().toLowerCase()
      list = list.filter(c =>
        c.name.toLowerCase().includes(keywordLower) ||
        c.description.toLowerCase().includes(keywordLower)
      )
    }
    return list
  }, [activeTag, keyword, certifications])

  const handleKeywordInput = useCallback((e: { detail: { value: string } }) => {
    setKeyword(e.detail.value)
  }, [])

  const handleCardClick = useCallback((certId: string) => {
    Taro.navigateTo({ url: `/pages/registration/form?cert_id=${certId}` })
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
            {filtered.map(cert => (
              <ZoneCard
                key={cert.id}
                title={cert.name}
                subtitle={cert.description}
                tags={[`${cert.categoryName}`, `${cert.examDuration}`, `${cert.questionCount}${STRINGS.FORM_QUESTION_SUFFIX}`]}
                price={`¥${cert.price}`}
                originalPrice={`¥${cert.originalPrice}`}
                buttonText={STRINGS.EXAM_SIGNUP}
                onButtonClick={() => handleCardClick(cert.id)}
              />
            ))}
          </View>
        </View>
      </View>
    </AuthGuard>
  )
}
