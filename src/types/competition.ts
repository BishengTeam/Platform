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
