export interface ExamBannerItem {
  id: number
  title: string
  description: string
  gradient: string
  icon: string
  buttonText: string
  buttonColor: string
}

export interface ExamCard {
  id: number
  title: string
  description: string
  price: string
  originalPrice: string
  duration: string
  questions: string
  passingScore: string
  tag: string
  tagColor: string
}

export interface ExamTagFilter {
  label: string
  activeColor: string
  activeBg: string
  activeText: string
  inactiveBg: string
}
