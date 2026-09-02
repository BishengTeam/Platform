export interface ClassroomVideoBrief {
  id: number
  title: string
  duration_seconds: number
}

export interface ClassroomQuizBrief {
  id: number
  title: string
  duration_minutes: number
  status: 'ongoing' | 'ended'
  started_at: string
  ends_at: string
  submitted: boolean
}

export interface ClassroomMyItem {
  id: number
  name: string
  status: string
  video_count: number
  ongoing_quiz_id: number | null
  joined_at: string
}

export interface ClassroomDetail {
  id: number
  name: string
  status: string
  teacher_name: string
  videos: ClassroomVideoBrief[]
  quizzes: ClassroomQuizBrief[]
}

export interface ClassroomQuizQuestion {
  id: number
  type: 'single' | 'multiple' | 'judge' | 'blank' | 'short'
  stem: string
  options: string[] | null
  score: number
}

export interface ClassroomQuizPaper {
  id: number
  title: string
  duration_minutes: number
  ends_at: string
  questions: ClassroomQuizQuestion[]
}

export interface ClassroomQuizResult {
  status: 'not_submitted' | 'pending_review' | 'approved'
  total_score: number | null
  submitted_at: string | null
}
