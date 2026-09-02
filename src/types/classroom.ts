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

export type ClassroomAttachmentKind = 'image' | 'document' | 'archive'

/** POST /api/classroom/quizzes/{id}/attachments/upload-url */
export interface ClassroomAttachmentUploadTarget {
  attachment_id: number
  object_key: string
  upload_url: string
  expires_at: string
}

export interface ClassroomAttachmentItem {
  id: number
  question_id: number
  kind: ClassroomAttachmentKind
  filename: string
  content_type: string
  size_bytes: number
  url: string
}

export interface ClassroomSubmissionDetailQuestion {
  id: number
  type: 'single' | 'multiple' | 'judge' | 'blank' | 'short'
  stem: string
  options: string[] | null
  score: number
}

/** GET /api/classroom/quizzes/{id}/submission — 批改完成后才回发作答内容 */
export interface ClassroomSubmissionDetail {
  status: 'pending_review' | 'approved'
  total_score?: number | null
  submitted_at?: string | null
  approved_at?: string | null
  questions?: ClassroomSubmissionDetailQuestion[]
  answers?: Record<string, string>
  attachments?: ClassroomAttachmentItem[]
}
