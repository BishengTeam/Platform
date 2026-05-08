export interface TeacherCard {
  type: 'teacher'
  name: string
  title: string
  wechat: string
  phone: string
}

export interface ChatExamCard {
  type: 'exam'
  title: string
  description: string
  price: string
  tag: string
}

export interface ChatCourseCard {
  type: 'course'
  title: string
  description: string
  duration: string
  tag: string
}

export interface ChatZoneCard {
  type: 'zone_link'
  zoneName: string
  zoneKey: string
  description: string
}

export type ChatCard = TeacherCard | ChatExamCard | ChatCourseCard | ChatZoneCard

export interface Message {
  id: number
  type: 'user' | 'ai'
  text: string
  card?: ChatCard
}
