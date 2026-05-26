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
  correctAnswer: number | number[]
  type: 'single' | 'multiple'
  explanation: string
}

export interface CheckinRecord {
  date: string
  completed: boolean
  questionCount: number
}

export interface WrongQuestion {
  id: string
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
