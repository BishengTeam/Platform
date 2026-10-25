// 与后端 PointsClaimScene 保持一致：2026-10-24 起注册不再赠送积分，new_user 场景已移除
export type PointsClaimScene = 'daily_checkin' | 'activity'
export type PointsRedeemType = 'exam_discount' | 'course'

export interface MyCourse {
  id: string
  title: string
  cover: string
  progress: number
  status: 'active' | 'pending' | 'expired' | 'completed' | 'cancelled'
  instructor: string
  totalLessons: number
  completedLessons: number
}

export interface PointRecord {
  id: string
  type: 'earn' | 'redeem'
  amount: number
  description: string
  createdAt: string
}

export interface Agreement {
  id: string
  title: string
  status: 'pending_sign' | 'pending_review' | 'stamped' | 'completed' | string
  content: string
  createdAt: string
  signedAt?: string
}

export interface ExamIntention {
  id: string
  category: string
  notes: string
  createdAt: string
}

export interface TeacherContact {
  id: string
  name: string
  title: string
  phone: string
  wechat: string
  qq: string
  avatar: string
}
