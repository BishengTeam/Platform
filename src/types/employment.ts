export interface Job {
  id: number
  title: string
  company: string
  location: string
  salary: string
  originalPrice?: string
  experience: string
  education: string
}

export interface EmploymentTagFilter {
  label: string
  activeColor: string
  activeBg: string
  activeText: string
  inactiveBg: string
}
