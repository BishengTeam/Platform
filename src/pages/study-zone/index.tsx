import { useState } from 'react'
import Taro from '@tarojs/taro'
import { ZonePage } from '@/components/ZonePage'
import { ZoneCard } from '@/components/ZoneCard'
import { STRINGS } from '@/constants/strings'
import { getStudyTagFilters, getStudyBannerItems, getCourseList } from '@/services/dataService'

export default function StudyZonePage() {
  const [activeTag, setActiveTag] = useState<string>(STRINGS.STUDY_TAG_ALL)

  return (
    <ZonePage
      title={STRINGS.STUDY_TITLE}
      bannerItems={getStudyBannerItems()}
      tagFilters={getStudyTagFilters()}
      activeTag={activeTag}
      onTagChange={setActiveTag}
      onBack={() => Taro.switchTab({ url: '/pages/index/index' })}
    >
      {getCourseList().map((course) => (
        <ZoneCard
          key={course.id}
          title={course.title}
          subtitle={`${course.description}`}
          tags={[course.tag, course.duration, `${course.rating}分`]}
          price={course.price === 0 ? STRINGS.ORDERS_FREE : `¥${course.price}`}
          originalPrice={course.originalPrice > 0 ? `¥${course.originalPrice}` : undefined}
          buttonText={STRINGS.STUDY_ENROLL}
        />
      ))}
    </ZonePage>
  )
}
