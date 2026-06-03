import { STRINGS } from './strings'
import { ROUTES } from './routes'

export interface QuizGridItem {
  label: string
  icon: string
  mode: string
}

export interface QuizBottomItem {
  label: string
  icon: string
  route: string
}

export const QUIZ_GRID: QuizGridItem[] = [
  { label: STRINGS.QUIZ_SECTION_PRACTICE, icon: '📝', mode: 'practice' },
  { label: STRINGS.QUIZ_MOCK_EXAM, icon: '📋', mode: 'mock' },
  { label: STRINGS.QUIZ_CHALLENGE, icon: '⚡', mode: 'challenge' },
  { label: STRINGS.QUIZ_ASSESSMENT, icon: '🎯', mode: 'assessment' },
]

export const QUIZ_BOTTOM: QuizBottomItem[] = [
  { label: STRINGS.QUIZ_WRONG_BOOK_TITLE, icon: '📕', route: ROUTES.QUIZ_WRONG_BOOK },
  { label: STRINGS.QUIZ_COLLECTIONS_TITLE, icon: '⭐', route: ROUTES.QUIZ_COLLECTIONS },
  { label: STRINGS.QUIZ_CHECKIN_TITLE, icon: '📅', route: ROUTES.QUIZ_CHECKIN },
]
