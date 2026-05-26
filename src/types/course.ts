export interface CourseSession {
  id: string
  label: string
  price: number
  startDate: string
  endDate: string
}

export interface CourseReview {
  id: string
  userId: string
  userName: string
  avatar: string
  rating: number
  content: string
  createdAt: string
}

export interface CourseItem {
  id: string
  title: string
  description: string
  cover: string
  price: number
  originalPrice: number
  duration: string
  tag: string
  category: string
  instructor: string
  sessions: CourseSession[]
  rating: number
  reviewCount: number
  reviews: CourseReview[]
}
