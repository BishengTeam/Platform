export interface StudyBannerItem {
  id: string | number
  title: string
  description: string
  gradient: string
  icon: string
  buttonText: string
  buttonColor: string
}

export interface Course {
  id: number
  title: string
  description: string
  price: string
  originalPrice: string
  duration: string
  tag: string
}

export interface StudyTagFilter {
  label: string
  activeColor: string
  activeBg: string
  activeText: string
  inactiveBg: string
}
