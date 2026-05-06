import { useState } from 'react'
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
    >
      {getCourseList().map((course) => (
        <ZoneCard
          key={course.id}
          title={course.title}
          subtitle={course.description}
          tags={[course.tag, course.duration]}
          price={course.price}
          originalPrice={course.originalPrice}
          buttonText={STRINGS.STUDY_ENROLL}
        />
      ))}
    </ZonePage>
  )
}
