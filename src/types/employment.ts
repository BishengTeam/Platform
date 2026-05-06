export interface EmploymentBannerItem {
  id: string | number
  title: string
  description: string
  gradient: string
  icon: string
  buttonText: string
  buttonColor: string
}

export interface Job {
  id: number
  title: string
  company: string
  location: string
  salary: string
  experience: string
  education: string
}

export interface EmploymentTagFilter {
  label: string
  activeColor: string
  activeBg: string
  activeText: string
}
