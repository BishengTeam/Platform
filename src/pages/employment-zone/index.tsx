import { useState, useEffect } from 'react'
import Taro from '@tarojs/taro'
import { ZonePage } from '@/components/ZonePage'
import { ZoneCard } from '@/components/ZoneCard'
import { STRINGS } from '@/constants/strings'
import { getEmploymentZone, applyJob } from '@/services/dataService'
import type { EmploymentZoneResponse, JobBrief } from '@/types'
import type { ZoneBannerItem } from '@/components/ZoneBanner'
import type { TagFilterItem } from '@/types/registration'

export default function EmploymentZonePage() {
  const [activeTag, setActiveTag] = useState<string>(STRINGS.EMPLOYMENT_TAG_RECOMMEND)
  const [bannerItems, setBannerItems] = useState<ZoneBannerItem[]>([])
  const [tagFilters, setTagFilters] = useState<TagFilterItem[]>([])
  const [jobList, setJobList] = useState<JobBrief[]>([])

  useEffect(() => {
    getEmploymentZone().then((data: EmploymentZoneResponse) => {
      // Map zones[0] to banner
      const bannerZone = data.zones[0]
      if (bannerZone) {
        setBannerItems([{
          id: bannerZone.id,
          title: bannerZone.title,
          description: bannerZone.description ?? '',
          gradient: 'gradient-teal',
          buttonText: '查看详情',
          buttonColor: '#ffffff',
        }])
      }
      setJobList(data.jobs)
    }).catch(() => {})
    // Hardcoded tag filters since getEmploymentTagFilters is removed
    setTagFilters([
      { label: STRINGS.EMPLOYMENT_TAG_RECOMMEND, activeColor: '#13C2C2', activeBg: '#13C2C2', activeText: '#ffffff', inactiveBg: '#F0F5FF' },
      { label: '技术', activeColor: '#13C2C2', activeBg: '#13C2C2', activeText: '#ffffff', inactiveBg: '#F0F5FF' },
      { label: '管理', activeColor: '#13C2C2', activeBg: '#13C2C2', activeText: '#ffffff', inactiveBg: '#F0F5FF' },
    ])
  }, [])

  return (
    <ZonePage
      title={STRINGS.EMPLOYMENT_TITLE}
      bannerItems={bannerItems}
      tagFilters={tagFilters}
      activeTag={activeTag}
      onTagChange={setActiveTag}
    >
      {jobList.map((job) => (
        <ZoneCard
          key={job.id}
          title={job.title}
          subtitle={job.company}
          tags={[job.location ?? '', job.salary_range ?? '']}
          price={job.salary_range ?? ''}
          buttonText={STRINGS.EMPLOYMENT_APPLY}
          onButtonClick={async () => {
            try {
              await applyJob(job.id)
              Taro.showToast({ title: '投递成功', icon: 'success' })
            } catch { /* 错误已由 request 层统一 toast */ }
          }}
        />
      ))}
    </ZonePage>
  )
}
