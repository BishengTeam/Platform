import { useState } from 'react'
import Taro from '@tarojs/taro'
import { ZonePage } from '@/components/ZonePage'
import { ZoneCard } from '@/components/ZoneCard'
import { STRINGS } from '@/constants/strings'
import { ROUTES } from '@/constants/routes'
import {
  getCompetitionTagFilters, getCompetitionBannerItems,
  getOngoingCompetitions, getUpcomingCompetitions, getEndedCompetitions,
} from '@/services/dataService'

export default function CompetitionZonePage() {
  const [activeTag, setActiveTag] = useState<string>(STRINGS.COMPETITION_ONGOING)

  const filteredData = activeTag === STRINGS.COMPETITION_ONGOING
    ? getOngoingCompetitions()
    : activeTag === STRINGS.COMPETITION_UPCOMING
    ? getUpcomingCompetitions()
    : getEndedCompetitions()

  return (
    <ZonePage
      title={STRINGS.COMPETITION_TITLE}
      bannerItems={getCompetitionBannerItems()}
      tagFilters={getCompetitionTagFilters()}
      activeTag={activeTag}
      onTagChange={setActiveTag}
    >
      {filteredData.map((comp) => (
        <ZoneCard
          key={comp.id}
          title={comp.title}
          subtitle={comp.description}
          tags={[comp.prize, `${comp.startTime}-${comp.endTime}`]}
          buttonText={activeTag === STRINGS.COMPETITION_ENDED
            ? STRINGS.COMPETITION_VIEW_RESULT
            : comp.status === '报名中'
            ? STRINGS.COMPETITION_SIGNUP
            : STRINGS.COMPETITION_ENTER}
          buttonVariant={activeTag === STRINGS.COMPETITION_ENDED ? 'secondary' : 'primary'}
          faded={activeTag === STRINGS.COMPETITION_ENDED}
          onButtonClick={comp.status === '报名中'
            ? () => Taro.navigateTo({ url: `/${ROUTES.REGISTRATION_INDEX}` })
            : undefined}
        />
      ))}
    </ZonePage>
  )
}
