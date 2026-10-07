export interface Activity {
  id: number
  title: string
  description: string
  benefit: string
  startTime: string
  endTime: string
  status?: string
}

export interface ActivityTagFilter {
  label: string
  activeColor: string
  activeBg: string
  activeText: string
  inactiveBg: string
}
