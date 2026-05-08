export interface CompetitionBannerItem {
  id: string | number
  title: string
  description: string
  gradient: string
  icon: string
  buttonText: string
  buttonColor: string
}

export interface Competition {
  id: number
  title: string
  description: string
  prize: string
  startTime: string
  endTime: string
  status: string
}

export interface CompetitionTagFilter {
  label: string
  activeColor: string
  activeBg: string
  activeText: string
  inactiveBg: string
}
