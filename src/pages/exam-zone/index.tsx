import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { ZonePage } from '@/components/ZonePage'
import { Icon } from '@/components/Icon'
import { ZoneCard } from '@/components/ZoneCard'
import { useZonePage } from '@/hooks/useZonePage'
import { STRINGS } from '@/constants/strings'
import { ROUTES } from '@/constants/routes'
import { getExamBannerItems, getExamCards, getExamTagFilters } from '@/services/dataService'
import styles from './index.module.scss'

export default function ExamZonePage() {
  const { activeTag, setActiveTag, filteredData: filteredExams } = useZonePage({
    defaultTag: STRINGS.EXAM_TAG_ALL,
    data: getExamCards(),
    filterFn: (exam, tag) => tag === STRINGS.EXAM_TAG_ALL || exam.tag === tag,
  })

  const sectionTitle = activeTag === STRINGS.EXAM_TAG_ALL
    ? STRINGS.EXAM_ALL_EXAMS
    : `${activeTag}${STRINGS.EXAM_SUFFIX}`

  return (
    <ZonePage
      title={STRINGS.EXAM_TITLE}
      bannerItems={getExamBannerItems()}
      tagFilters={getExamTagFilters()}
      activeTag={activeTag}
      onTagChange={setActiveTag}
      header={
        <View className={styles.sectionHead}>
          <View className={styles.sectionLeft}>
            <Icon name='zap' size={18} color='#FF4D4F' />
            <Text className={styles.sectionTitle}>{sectionTitle}</Text>
          </View>
          <Text className={styles.sectionCount}>{STRINGS.EXAM_SECTION_COUNT}</Text>
        </View>
      }
    >
      {filteredExams.map((exam) => (
        <ZoneCard
          key={exam.id}
          title={exam.title}
          subtitle={exam.description}
          tags={[exam.duration, exam.questions]}
          price={exam.price}
          originalPrice={exam.originalPrice}
          buttonText={STRINGS.EXAM_SIGNUP}
          onButtonClick={() => Taro.navigateTo({ url: `/${ROUTES.REGISTRATION_INDEX}` })}
        />
      ))}
    </ZonePage>
  )
}
