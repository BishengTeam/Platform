import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { ZonePage } from '@/components/ZonePage'
import { Icon } from '@/components/Icon'
import { ZoneCard } from '@/components/ZoneCard'
import { STRINGS } from '@/constants/strings'
import { ROUTES } from '@/constants/routes'
import { getExamBannerItems, getExamCards, getExamTagFilters } from '@/services/dataService'
import styles from './index.module.scss'

export default function ExamZonePage() {
  const [activeTag, setActiveTag] = useState<string>(STRINGS.EXAM_TAG_ALL)

  const filteredExams = activeTag === STRINGS.EXAM_TAG_ALL
    ? getExamCards()
    : getExamCards().filter(exam => exam.tag === activeTag)

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
            <Text className={styles.sectionTitle}>
              {activeTag === STRINGS.EXAM_TAG_ALL ? STRINGS.EXAM_ALL_EXAMS : activeTag + '考试'}
            </Text>
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
