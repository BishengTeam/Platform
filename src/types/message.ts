export interface TeacherCard {
  type: 'teacher'
  name: string
  title: string
  wechat: string
  phone: string
}

export interface Message {
  id: number
  type: 'user' | 'ai'
  text: string
  card?: TeacherCard
}
