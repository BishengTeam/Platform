export interface QuizCategory {
  id: string
  name: string
  questionCount: number
  icon: string
}

export interface QuizOption {
  label: string
  text: string
}

export interface QuizQuestion {
  id: string
  categoryId: string
  stem: string
  options: QuizOption[]
  /** C 端答题列表不返回正确答案，仅答题提交后由 QuizSubmitResponse 返回 */
  correctAnswer: number | number[]
  type: 'single' | 'multiple'
  explanation: string
}

/** 签到日历单日记录，对齐后端 QuizCheckinResponse */
export interface CheckinRecord {
  /** 签到记录 ID，当天未签到时为 null */
  id: number | null
  /** 签到日期 YYYY-MM-DD */
  checkinDate: string
  /** 当天是否已签到 */
  checkedIn: boolean
  /** 当天完成题数 */
  questionsCompleted: number
  /** 连续签到天数 */
  consecutiveDays: number
}

/** 签到状态（今日），对齐后端 GET /api/quiz/checkin */
export type CheckinStatus = CheckinRecord

export interface WrongQuestion {
  id: string
  /** 后端答题记录 ID，用于 DELETE /api/quiz/wrong-book/{id} */
  recordId: number
  categoryId: string
  stem: string
  options: QuizOption[]
  correctAnswer: number | number[]
  type: 'single' | 'multiple'
  explanation: string
  wrongDate: string
  wrongCount: number
}

export interface QuizPracticeState {
  questions: QuizQuestion[]
  currentIndex: number
  answers: Record<string, number | number[]>
  mode: 'practice' | 'mock' | 'challenge' | 'assessment'
}