import { useState } from 'react'
import { ZonePage } from '@/components/ZonePage'
import { ZoneCard } from '@/components/ZoneCard'
import { STRINGS } from '@/constants/strings'
import {
  getActivityTagFilters, getActivityBannerItems,
  getOngoingActivities, getUpcomingActivities, getEndedActivities,
} from '@/services/dataService'

export default function ActivityZonePage() {
  const [activeTag, setActiveTag] = useState<string>(STRINGS.ACTIVITY_ONGOING)

  const filteredData = activeTag === STRINGS.ACTIVITY_ONGOING
    ? getOngoingActivities()
    : activeTag === STRINGS.ACTIVITY_UPCOMING
    ? getUpcomingActivities()
    : getEndedActivities()

  return (
    <ZonePage
      title={STRINGS.ACTIVITY_TITLE}
      bannerItems={getActivityBannerItems()}
      tagFilters={getActivityTagFilters()}
      activeTag={activeTag}
      onTagChange={setActiveTag}
    >
      {filteredData.map((activity) => (
        <ZoneCard
          key={activity.id}
          title={activity.title}
          subtitle={activity.description}
          tags={[activity.benefit, `${activity.startTime}-${activity.endTime}`]}
          buttonText={activeTag === STRINGS.ACTIVITY_ENDED
            ? STRINGS.ACTIVITY_VIEW_DETAIL
            : activeTag === STRINGS.ACTIVITY_UPCOMING
            ? STRINGS.ACTIVITY_REMIND
            : STRINGS.ACTIVITY_JOIN}
          buttonVariant={activeTag === STRINGS.ACTIVITY_ENDED ? 'secondary' : 'primary'}
          isFaded={activeTag === STRINGS.ACTIVITY_ENDED}
        />
      ))}
    </ZonePage>
  )
}
