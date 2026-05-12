import { useState, useMemo } from 'react'
import { View, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { TagFilter } from '@/components/TagFilter'
import { ZoneCard } from '@/components/ZoneCard'
import { STRINGS } from '@/constants/strings'
import { getCertifications, getRegistrationTagFilters } from '@/services/dataService'
import styles from './index.module.scss'

export default function RegistrationIndexPage() {
  const [activeTag, setActiveTag] = useState<string>(STRINGS.REGISTRATION_TAG_ALL)
  const [keyword, setKeyword] = useState('')

  const certifications = getCertifications()
  const tagFilters = getRegistrationTagFilters()

  const filtered = useMemo(() => {
    let list = activeTag === STRINGS.REGISTRATION_TAG_ALL
      ? certifications
      : certifications.filter(c => c.categoryName === activeTag)
    if (keyword.trim()) {
      const kw = keyword.trim().toLowerCase()
      list = list.filter(c =>
        c.name.toLowerCase().includes(kw) ||
        c.description.toLowerCase().includes(kw)
      )
    }
    return list
  }, [activeTag, keyword, certifications])

  const handleCardClick = (certId: string) => {
    Taro.navigateTo({ url: `/pages/registration/form?cert_id=${certId}` })
  }

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.REGISTRATION_TITLE} showBack />
        <View className={styles.body}>
          <View className={styles.searchWrap}>
            <Input
              className={styles.searchInput}
              placeholder={STRINGS.REGISTRATION_SEARCH_PLACEHOLDER}
              value={keyword}
              onInput={e => setKeyword(e.detail.value)}
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
                tags={[`${cert.categoryName}`, `${cert.examDuration}`, `${cert.questionCount}题`]}
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
