import { useState } from 'react'
import { ZonePage } from '@/components/ZonePage'
import { ZoneCard } from '@/components/ZoneCard'
import { STRINGS } from '@/constants/strings'
import { getEmploymentTagFilters, getEmploymentBannerItems, getJobList } from '@/services/dataService'

export default function EmploymentZonePage() {
  const [activeTag, setActiveTag] = useState<string>(STRINGS.EMPLOYMENT_TAG_RECOMMEND)

  return (
    <ZonePage
      title={STRINGS.EMPLOYMENT_TITLE}
      bannerItems={getEmploymentBannerItems()}
      tagFilters={getEmploymentTagFilters()}
      activeTag={activeTag}
      onTagChange={setActiveTag}
    >
      {getJobList().map((job) => (
        <ZoneCard
          key={job.id}
          title={job.title}
          subtitle={job.company}
          tags={[job.location, job.experience, job.education]}
          price={job.salary}
          buttonText={STRINGS.EMPLOYMENT_APPLY}
        />
      ))}
    </ZonePage>
  )
}
