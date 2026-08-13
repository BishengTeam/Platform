5e35e13 feat: complete quiz history and user assets
 src/app.config.ts                                |   2 +-
 src/constants/quiz.ts                            |   1 +
 src/constants/routes.ts                          |   1 +
 src/pages/quiz/__tests__/practiceAssets.test.tsx | 317 +++++++++++++++++++++++
 src/pages/quiz/checkin.module.scss               | 126 ++-------
 src/pages/quiz/checkin.tsx                       | 197 +++++++-------
 src/pages/quiz/collections.module.scss           |  36 ++-
 src/pages/quiz/collections.tsx                   | 103 +++++---
 src/pages/quiz/practice-history.module.scss      |  56 ++++
 src/pages/quiz/practice-history.tsx              | 120 +++++++++
 src/pages/quiz/wrong-book.module.scss            |  33 +--
 src/pages/quiz/wrong-book.tsx                    |  99 +++----
 task-8-report.md                                 |  74 ++++++
 tsconfig.task-8.json                             |  16 ++
 14 files changed, 841 insertions(+), 340 deletions(-)
diff --git a/src/app.config.ts b/src/app.config.ts
index 619440f..26d682c 100644
--- a/src/app.config.ts
+++ b/src/app.config.ts
@@ -39,21 +39,21 @@ export default defineAppConfig({
     {
       root: 'pages/ai-consult',
       pages: ['index'],
     },
     {
       root: 'pages/course',
       pages: ['index', 'detail', 'content'],
     },
     {
       root: 'pages/quiz',
-      pages: ['index', 'questions', 'practice', 'mock', 'wrong-book', 'collections', 'checkin'],
+      pages: ['index', 'questions', 'practice', 'practice-history', 'mock', 'wrong-book', 'collections', 'checkin'],
     },
     {
       root: 'pages/mine',
       pages: ['courses', 'profile', 'personal-info', 'edit-profile', 'points', 'agreements', 'collections', 'exam-query', 'share', 'deactivate', 'exam-intention', 'contact-teachers'],
     },
     {
       root: 'pages/employment-zone',
       pages: ['index'],
     },
     {
diff --git a/src/constants/quiz.ts b/src/constants/quiz.ts
index 85e0b36..0934d94 100644
--- a/src/constants/quiz.ts
+++ b/src/constants/quiz.ts
@@ -14,14 +14,15 @@ export interface QuizBottomItem {
 }
 
 export const QUIZ_GRID: QuizGridItem[] = [
   { label: STRINGS.QUIZ_SECTION_PRACTICE, icon: '📝', mode: 'practice' },
   { label: STRINGS.QUIZ_MOCK_EXAM, icon: '📋', mode: 'mock' },
   { label: STRINGS.QUIZ_CHALLENGE, icon: '⚡', mode: 'challenge' },
   { label: STRINGS.QUIZ_ASSESSMENT, icon: '🎯', mode: 'assessment' },
 ]
 
 export const QUIZ_BOTTOM: QuizBottomItem[] = [
+  { label: '练习历史', icon: '🕘', route: ROUTES.QUIZ_PRACTICE_HISTORY },
   { label: STRINGS.QUIZ_WRONG_BOOK_TITLE, icon: '📕', route: ROUTES.QUIZ_WRONG_BOOK },
   { label: STRINGS.QUIZ_COLLECTIONS_TITLE, icon: '⭐', route: ROUTES.QUIZ_COLLECTIONS },
   { label: STRINGS.QUIZ_CHECKIN_TITLE, icon: '📅', route: ROUTES.QUIZ_CHECKIN },
 ]
diff --git a/src/constants/routes.ts b/src/constants/routes.ts
index 7d46cf0..9fef68e 100644
--- a/src/constants/routes.ts
+++ b/src/constants/routes.ts
@@ -18,20 +18,21 @@ export const ROUTES = {
   REGISTRATION_CONFIRM: 'pages/registration/confirm',
   PAYMENT_RESULT: 'pages/payment/result',
   ORDER_DETAIL: 'pages/order-detail/index',
   AI_CONSULT: 'pages/ai-consult/index',
   COURSE_INDEX: 'pages/course/index',
   COURSE_DETAIL: 'pages/course/detail',
   COURSE_CONTENT: 'pages/course/content',
   QUIZ_INDEX: 'pages/quiz/index',
   QUIZ_QUESTIONS: 'pages/quiz/questions',
   QUIZ_PRACTICE: 'pages/quiz/practice',
+  QUIZ_PRACTICE_HISTORY: 'pages/quiz/practice-history',
   QUIZ_MOCK: 'pages/quiz/mock',
   QUIZ_WRONG_BOOK: 'pages/quiz/wrong-book',
   QUIZ_COLLECTIONS: 'pages/quiz/collections',
   QUIZ_CHECKIN: 'pages/quiz/checkin',
   MINE_COURSES: 'pages/mine/courses',
   MINE_PROFILE: 'pages/mine/profile',
   MINE_PERSONAL_INFO: 'pages/mine/personal-info',
   MINE_EDIT_PROFILE: 'pages/mine/edit-profile',
   MINE_POINTS: 'pages/mine/points',
   MINE_AGREEMENTS: 'pages/mine/agreements',
diff --git a/src/pages/quiz/__tests__/practiceAssets.test.tsx b/src/pages/quiz/__tests__/practiceAssets.test.tsx
new file mode 100644
index 0000000..d700837
--- /dev/null
+++ b/src/pages/quiz/__tests__/practiceAssets.test.tsx
@@ -0,0 +1,317 @@
+import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
+import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
+import Taro from '@tarojs/taro'
+import { useAuth } from '@/hooks/useAuth'
+import { quizApi } from '@/services/quizService'
+import type {
+  QuizCheckinDay,
+  QuizCollectionItem,
+  QuizPracticeHistoryItem,
+  QuizWrongBookItem,
+} from '@/types/quiz'
+import QuizCheckinPage from '../checkin'
+import QuizCollectionsPage from '../collections'
+import PracticeHistoryPage from '../practice-history'
+import WrongBookPage from '../wrong-book'
+
+vi.hoisted(() => {
+  Object.assign(globalThis, {
+    ENABLE_ADJACENT_HTML: false,
+    ENABLE_CLONE_NODE: false,
+    ENABLE_CONTAINS: false,
+    ENABLE_INNER_HTML: false,
+    ENABLE_MUTATION_OBSERVER: false,
+    ENABLE_SIZE_APIS: false,
+    ENABLE_TEMPLATE_CONTENT: false,
+    PLATFORM_TYPE: 'test',
+    SUPPORT_TARO_POLYFILL: false,
+  })
+})
+
+vi.mock('@/services/quizService', () => ({
+  quizApi: {
+    listPracticeHistory: vi.fn(),
+    listWrongBook: vi.fn(),
+    listCollections: vi.fn(),
+    removeCollection: vi.fn(),
+    getCheckinStatus: vi.fn(),
+    getCheckinCalendar: vi.fn(),
+  },
+}))
+
+vi.mock('@/hooks/useAuth', () => ({ useAuth: vi.fn() }))
+
+vi.mock('@tarojs/components', () => ({
+  View: 'div',
+  Text: 'span',
+  Input: ({ onInput, ...props }: { onInput?: (event: { detail: { value: string } }) => void } & Record<string, unknown>) => (
+    <input {...props} onChange={event => onInput?.({ detail: { value: event.currentTarget.value } })} />
+  ),
+}))
+
+vi.mock('@/components/PageHeader', () => ({ PageHeader: ({ title }: { title: string }) => <h1>{title}</h1> }))
+
+vi.mock('@/components/Button', () => ({
+  Button: ({ children, onClick, disabled }: React.PropsWithChildren<{ onClick?: () => void; disabled?: boolean }>) => (
+    <button type='button' onClick={onClick} disabled={disabled}>{children}</button>
+  ),
+}))
+
+vi.mock('@tarojs/taro', () => ({
+  default: {
+    navigateTo: vi.fn(),
+    reLaunch: vi.fn(),
+  },
+}))
+
+const historyAttempts: QuizPracticeHistoryItem[] = [
+  {
+    attempt_id: 901,
+    session_id: 31,
+    session_question_id: 401,
+    question_id: 99,
+    category_path: [{ id: 7, name: 'Security' }],
+    question_type: 'single_choice',
+    question_text: 'Which value is frozen?',
+    options: { A: 'The submitted snapshot', B: 'The current question' },
+    user_answer: 'B',
+    correct_answer: 'A',
+    explanation: 'History keeps the submitted snapshot.',
+    is_correct: false,
+    attempt_no: 1,
+    submitted_at: '2026-08-10T03:04:05Z',
+    current_question_status: 'published',
+  },
+  {
+    attempt_id: 902,
+    session_id: 31,
+    session_question_id: 401,
+    question_id: 99,
+    category_path: [{ id: 7, name: 'Security' }],
+    question_type: 'single_choice',
+    question_text: 'Which value is frozen?',
+    options: { A: 'The submitted snapshot', B: 'The current question' },
+    user_answer: 'A',
+    correct_answer: 'A',
+    explanation: 'History keeps the submitted snapshot.',
+    is_correct: true,
+    attempt_no: 2,
+    submitted_at: '2026-08-10T03:05:05Z',
+    current_question_status: 'disabled',
+  },
+]
+
+const wrongItems: QuizWrongBookItem[] = [
+  {
+    id: 7001,
+    question_id: 99,
+    status: 'active',
+    question: {
+      id: 99,
+      category_id: 7,
+      question_type: 'single_choice',
+      question_text: 'Published wrong question',
+      options: { A: 'Alpha', B: 'Beta' },
+    },
+    question_status: 'published',
+    usable_for_practice: true,
+    first_wrong_at: '2026-08-01T00:00:00Z',
+    latest_wrong_at: '2026-08-11T00:00:00Z',
+  },
+  {
+    id: 7002,
+    question_id: 100,
+    status: 'active',
+    question: {
+      id: 100,
+      category_id: 7,
+      question_type: 'single_choice',
+      question_text: 'Disabled wrong question',
+      options: { A: 'One', B: 'Two' },
+    },
+    question_status: 'disabled',
+    usable_for_practice: false,
+    first_wrong_at: '2026-08-02T00:00:00Z',
+    latest_wrong_at: '2026-08-12T00:00:00Z',
+  },
+]
+
+const collectionItems: QuizCollectionItem[] = [
+  {
+    id: 8801,
+    question_id: 99,
+    question: {
+      id: 99,
+      category_id: 7,
+      question_type: 'multiple_choice',
+      question_text: 'Active collected question',
+      options: { A: 'Alpha', B: 'Beta' },
+    },
+    question_status: 'published',
+    is_active: true,
+    collected_at: '2026-08-11T00:00:00Z',
+  },
+  {
+    id: 8802,
+    question_id: 100,
+    question: {
+      id: 100,
+      category_id: 8,
+      question_type: 'single_choice',
+      question_text: 'Inactive collected question',
+      options: { A: 'One', B: 'Two' },
+    },
+    question_status: 'disabled',
+    is_active: false,
+    collected_at: '2026-08-10T00:00:00Z',
+  },
+]
+
+function page<T>(items: T[], current = 1, total = items.length) {
+  return { items, total, page: current, page_size: 20 }
+}
+
+describe('quiz history and user assets', () => {
+  afterEach(cleanup)
+
+  beforeEach(() => {
+    vi.clearAllMocks()
+    vi.mocked(useAuth).mockReturnValue({ isChecked: true, isLoggedIn: true })
+    vi.mocked(quizApi.listPracticeHistory).mockResolvedValue(page(historyAttempts))
+    vi.mocked(quizApi.listWrongBook).mockResolvedValue(page(wrongItems))
+    vi.mocked(quizApi.listCollections).mockResolvedValue(page(collectionItems))
+    vi.mocked(quizApi.removeCollection).mockResolvedValue({
+      question_id: 99,
+      is_active: false,
+      updated_at: '2026-08-12T01:00:00Z',
+    })
+    vi.mocked(quizApi.getCheckinStatus).mockResolvedValue({
+      checkin_date: '2026-08-12',
+      checked_in: true,
+      questions_completed: 8,
+      consecutive_days: 3,
+    })
+    vi.mocked(quizApi.getCheckinCalendar).mockResolvedValue([
+      { checkin_date: '2026-08-11', questions_completed: 5, consecutive_days: 2 },
+      { checkin_date: '2026-08-12', questions_completed: 8, consecutive_days: 3 },
+    ] satisfies QuizCheckinDay[])
+  })
+
+  it('keeps history protected and sends every supported filter while retaining every re-answer', async () => {
+    vi.mocked(useAuth).mockReturnValue({ isChecked: false, isLoggedIn: false })
+    const { rerender } = render(<PracticeHistoryPage />)
+    expect(quizApi.listPracticeHistory).not.toHaveBeenCalled()
+
+    vi.mocked(useAuth).mockReturnValue({ isChecked: true, isLoggedIn: true })
+    rerender(<PracticeHistoryPage />)
+    expect(await screen.findAllByText('Which value is frozen?')).toHaveLength(2)
+    expect(screen.getByText((_, element) => element?.textContent === 'Incorrect · Attempt 1')).toBeInTheDocument()
+    expect(screen.getByText((_, element) => element?.textContent === 'Correct · Attempt 2')).toBeInTheDocument()
+    expect(screen.getByText('Your answer: B')).toBeInTheDocument()
+    expect(screen.getAllByText('Correct answer: A')).toHaveLength(2)
+    expect(screen.getAllByText('History keeps the submitted snapshot.')).toHaveLength(2)
+    expect(screen.getAllByText('A. The submitted snapshot')).toHaveLength(2)
+
+    fireEvent.input(screen.getByLabelText('Category ID'), { target: { value: '7' } })
+    fireEvent.click(screen.getByRole('button', { name: 'Multiple choice' }))
+    fireEvent.click(screen.getByRole('button', { name: 'Incorrect only' }))
+    fireEvent.input(screen.getByLabelText('Date from'), { target: { value: '2026-08-01' } })
+    fireEvent.input(screen.getByLabelText('Date to'), { target: { value: '2026-08-12' } })
+    fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }))
+
+    await waitFor(() => expect(quizApi.listPracticeHistory).toHaveBeenLastCalledWith({
+      category_id: 7,
+      question_type: 'multiple_choice',
+      is_correct: false,
+      date_from: '2026-08-01',
+      date_to: '2026-08-12',
+      page: 1,
+      page_size: 20,
+    }))
+  })
+
+  it('paginates history and exposes loading, empty, error, and retry states', async () => {
+    let resolveHistory!: (value: ReturnType<typeof page<QuizPracticeHistoryItem>>) => void
+    vi.mocked(quizApi.listPracticeHistory).mockReturnValueOnce(new Promise(resolve => { resolveHistory = resolve }))
+    render(<PracticeHistoryPage />)
+    expect(screen.getByText('Loading practice history…')).toBeInTheDocument()
+    resolveHistory(page(historyAttempts, 1, 21))
+    expect(await screen.findByRole('button', { name: 'Next page' })).toBeInTheDocument()
+    fireEvent.click(screen.getByRole('button', { name: 'Next page' }))
+    await waitFor(() => expect(quizApi.listPracticeHistory).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })))
+
+    cleanup()
+    vi.mocked(quizApi.listPracticeHistory).mockReset().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(page([]))
+    render(<PracticeHistoryPage />)
+    expect(await screen.findByText('Could not load practice history.')).toBeInTheDocument()
+    fireEvent.click(screen.getByRole('button', { name: 'Retry practice history' }))
+    expect(await screen.findByText('No practice attempts found.')).toBeInTheDocument()
+  })
+
+  it('keeps the wrong book read-only and opens only wrong-mode practice for usable items', async () => {
+    render(<WrongBookPage />)
+    expect(await screen.findByText('Published wrong question')).toBeInTheDocument()
+    expect(screen.getByText('Latest wrong: 2026-08-11T00:00:00Z')).toBeInTheDocument()
+    expect(screen.getByText('Disabled · unavailable for practice')).toBeInTheDocument()
+    expect(screen.queryByRole('button', { name: /remove|delete|add/i })).not.toBeInTheDocument()
+    expect(screen.queryByText(/correct answer|explanation/i)).not.toBeInTheDocument()
+
+    fireEvent.click(screen.getByRole('button', { name: 'Practice wrong questions' }))
+    expect(Taro.navigateTo).toHaveBeenCalledWith({ url: '/pages/quiz/practice?mode=wrong' })
+    const disabledCard = screen.getByText('Disabled wrong question').closest('div')!
+    expect(within(disabledCard).queryByRole('button')).not.toBeInTheDocument()
+  })
+
+  it('removes collections by question ID, keeps failures visible, and reloads after success', async () => {
+    vi.mocked(quizApi.removeCollection).mockRejectedValueOnce(new Error('offline'))
+    render(<QuizCollectionsPage />)
+    expect(await screen.findByText('Active collected question')).toBeInTheDocument()
+    expect(screen.getByText('Inactive · disabled')).toBeInTheDocument()
+    expect(screen.queryByText(/correct answer|explanation/i)).not.toBeInTheDocument()
+
+    fireEvent.click(screen.getAllByRole('button', { name: 'Remove collection' })[0])
+    expect(await screen.findByText('Could not remove collection. The item was kept.')).toBeInTheDocument()
+    expect(screen.getByText('Active collected question')).toBeInTheDocument()
+    expect(quizApi.removeCollection).toHaveBeenCalledWith(99)
+    expect(quizApi.removeCollection).not.toHaveBeenCalledWith(8801)
+
+    vi.mocked(quizApi.removeCollection).mockResolvedValueOnce({
+      question_id: 99,
+      is_active: false,
+      updated_at: '2026-08-12T01:00:00Z',
+    })
+    vi.mocked(quizApi.listCollections).mockResolvedValueOnce(page([collectionItems[1]]))
+    fireEvent.click(screen.getByRole('button', { name: 'Retry removal' }))
+    await waitFor(() => expect(quizApi.listCollections).toHaveBeenCalledTimes(2))
+    expect(screen.queryByText('Active collected question')).not.toBeInTheDocument()
+
+    const inactiveCard = screen.getByText('Inactive collected question').closest('div')!
+    expect(within(inactiveCard).queryByRole('button', { name: 'Browse category' })).not.toBeInTheDocument()
+  })
+
+  it('uses the last 30 Shanghai calendar dates and explains automatic check-in without a submit action', async () => {
+    vi.setSystemTime(new Date('2026-08-11T16:30:00.000Z'))
+    render(<QuizCheckinPage />)
+    await screen.findByText('Automatic check-in is recorded after qualifying practice activity; no manual check-in is needed.')
+
+    expect(quizApi.getCheckinStatus).toHaveBeenCalledWith()
+    expect(quizApi.getCheckinCalendar).toHaveBeenCalledWith({ date_from: '2026-07-14', date_to: '2026-08-12' })
+    expect(screen.getByText('Today: checked in')).toBeInTheDocument()
+    expect(screen.getByText('Today questions: 8')).toBeInTheDocument()
+    expect(screen.queryByRole('button', { name: /check.?in|submit/i })).not.toBeInTheDocument()
+    vi.useRealTimers()
+  })
+
+  it('allows independent retry when today status or calendar loading fails', async () => {
+    vi.mocked(quizApi.getCheckinStatus).mockRejectedValueOnce(new Error('status offline'))
+    vi.mocked(quizApi.getCheckinCalendar).mockRejectedValueOnce(new Error('calendar offline'))
+    render(<QuizCheckinPage />)
+    expect(await screen.findByText('Could not load today’s check-in status.')).toBeInTheDocument()
+    expect(screen.getByText('Could not load the check-in calendar.')).toBeInTheDocument()
+
+    fireEvent.click(screen.getByRole('button', { name: 'Retry today status' }))
+    fireEvent.click(screen.getByRole('button', { name: 'Retry calendar' }))
+    expect(await screen.findByText('Today: checked in')).toBeInTheDocument()
+    await waitFor(() => expect(quizApi.getCheckinCalendar).toHaveBeenCalledTimes(2))
+  })
+})
diff --git a/src/pages/quiz/checkin.module.scss b/src/pages/quiz/checkin.module.scss
index 81c424c..98100ea 100644
--- a/src/pages/quiz/checkin.module.scss
+++ b/src/pages/quiz/checkin.module.scss
@@ -1,129 +1,47 @@
 @use '../../styles/variables' as *;
 
 .page {
-  display: flex;
-  flex-direction: column;
-  height: 100vh;
-  height: 100dvh;
+  min-height: 100vh;
   background: $color-bg;
 }
 
 .body {
-  flex: 1;
-  overflow-y: auto;
-  padding: $spacing-md $spacing-lg;
-  padding-bottom: calc(#{$spacing-lg} + #{$safe-bottom});
-}
-
-.statsCard {
-  display: flex;
-  align-items: center;
-  background: $color-white;
-  border-radius: $radius-md;
-  padding: $spacing-lg;
-  margin-bottom: $spacing-md;
-}
-
-.statItem {
-  flex: 1;
   display: flex;
   flex-direction: column;
-  align-items: center;
-  gap: 4px;
-}
-
-.statValue {
-  font-size: $font-xl;
-  font-weight: 700;
-  color: $color-primary;
-}
-
-.statLabel {
-  font-size: $font-sm;
-  color: $color-text-tertiary;
-}
-
-.statDivider {
-  width: 1px;
-  height: 40px;
-  background: $color-border;
+  gap: $spacing-md;
+  padding: $spacing-md $spacing-lg calc(#{$spacing-lg} + #{$safe-bottom});
 }
 
+.explanation,
+.statusCard,
 .calendarCard {
+  display: flex;
+  flex-direction: column;
+  gap: $spacing-sm;
+  padding: $spacing-md;
   background: $color-white;
   border-radius: $radius-md;
-  padding: $spacing-lg;
-  margin-bottom: $spacing-md;
 }
 
-.calendarTitle {
-  font-size: $font-lg;
-  font-weight: 600;
-  color: $color-text;
-  text-align: center;
-  display: block;
-  margin-bottom: $spacing-md;
+.explanation {
+  color: $color-text-secondary;
 }
 
-.weekdayRow {
+.state,
+.stats,
+.calendarList,
+.calendarDay {
   display: flex;
-  margin-bottom: $spacing-sm;
-}
-
-.weekday {
-  flex: 1;
-  text-align: center;
-  font-size: $font-sm;
-  color: $color-text-tertiary;
-}
-
-.dayGrid {
-  display: flex;
-  flex-wrap: wrap;
-}
-
-.dayCell {
-  width: calc(100% / 7);
-  aspect-ratio: 1;
-  display: flex;
-  align-items: center;
-  justify-content: center;
+  flex-direction: column;
+  gap: $spacing-sm;
 }
 
-.dayText {
-  width: 32px;
-  height: 32px;
-  line-height: 32px;
-  text-align: center;
-  border-radius: 50%;
-  font-size: $font-sm;
+.range {
   color: $color-text;
+  font-weight: 600;
 }
 
-.dayCompleted {
-  .dayText {
-    background: $color-primary;
-    color: $color-white;
-  }
-}
-
-.dayToday {
-  .dayText {
-    border: 1px solid $color-primary…4811 tokens truncated…  flex-direction: column;
+  gap: $spacing-sm;
+}
+
+.question {
+  color: $color-text;
+  font-weight: 600;
+}
+
+.explanation {
+  padding: $spacing-sm;
+  background: $color-bg-secondary;
+  border-radius: $radius-sm;
+}
+
+.meta {
+  color: $color-text-tertiary;
+  font-size: $font-sm;
+}
diff --git a/src/pages/quiz/practice-history.tsx b/src/pages/quiz/practice-history.tsx
new file mode 100644
index 0000000..6e5f00a
--- /dev/null
+++ b/src/pages/quiz/practice-history.tsx
@@ -0,0 +1,120 @@
+import { useCallback, useEffect, useState } from 'react'
+import { Input, Text, View } from '@tarojs/components'
+import { AuthGuard } from '@/components/AuthGuard'
+import { Button } from '@/components/Button'
+import { PageHeader } from '@/components/PageHeader'
+import { useAuth } from '@/hooks/useAuth'
+import { quizApi } from '@/services/quizService'
+import type { QuizPracticeHistoryItem, QuizPracticeHistoryQuery, QuizQuestionType } from '@/types/quiz'
+import styles from './practice-history.module.scss'
+
+type LoadState = 'loading' | 'ready' | 'empty' | 'error'
+type CorrectFilter = 'all' | 'correct' | 'incorrect'
+
+const PAGE_SIZE = 20
+
+function answerText(answer: string | string[]) {
+  return Array.isArray(answer) ? answer.join(', ') : answer
+}
+
+export default function PracticeHistoryPage() {
+  const { isChecked, isLoggedIn } = useAuth()
+  const [items, setItems] = useState<QuizPracticeHistoryItem[]>([])
+  const [state, setState] = useState<LoadState>('loading')
+  const [total, setTotal] = useState(0)
+  const [page, setPage] = useState(1)
+  const [categoryId, setCategoryId] = useState('')
+  const [questionType, setQuestionType] = useState<QuizQuestionType | undefined>()
+  const [correctFilter, setCorrectFilter] = useState<CorrectFilter>('all')
+  const [dateFrom, setDateFrom] = useState('')
+  const [dateTo, setDateTo] = useState('')
+  const [appliedFilters, setAppliedFilters] = useState<Omit<QuizPracticeHistoryQuery, 'page' | 'page_size'>>({})
+
+  const load = useCallback(async (targetPage: number, filters: Omit<QuizPracticeHistoryQuery, 'page' | 'page_size'>) => {
+    setState('loading')
+    try {
+      const result = await quizApi.listPracticeHistory({ ...filters, page: targetPage, page_size: PAGE_SIZE })
+      setItems(result.items)
+      setTotal(result.total)
+      setPage(result.page)
+      setState(result.items.length ? 'ready' : 'empty')
+    } catch {
+      setState('error')
+    }
+  }, [])
+
+  useEffect(() => {
+    if (!isChecked || !isLoggedIn) return
+    void load(1, {})
+  }, [isChecked, isLoggedIn, load])
+
+  const applyFilters = () => {
+    const parsedCategory = Number(categoryId)
+    const nextFilters: Omit<QuizPracticeHistoryQuery, 'page' | 'page_size'> = {
+      ...(categoryId && Number.isInteger(parsedCategory) && parsedCategory > 0 ? { category_id: parsedCategory } : {}),
+      ...(questionType ? { question_type: questionType } : {}),
+      ...(correctFilter === 'correct' ? { is_correct: true } : {}),
+      ...(correctFilter === 'incorrect' ? { is_correct: false } : {}),
+      ...(dateFrom ? { date_from: dateFrom } : {}),
+      ...(dateTo ? { date_to: dateTo } : {}),
+    }
+    setAppliedFilters(nextFilters)
+    void load(1, nextFilters)
+  }
+
+  return (
+    <AuthGuard>
+      <View className={styles.page}>
+        <PageHeader title='Practice history' shouldShowBack />
+        <View className={styles.body}>
+          <View className={styles.filters}>
+            <Input aria-label='Category ID' value={categoryId} type='number' onInput={event => setCategoryId(event.detail.value)} />
+            <View className={styles.filterRow}>
+              <Button size='sm' variant={questionType === 'single_choice' ? 'primary' : 'secondary'} onClick={() => setQuestionType('single_choice')}>Single choice</Button>
+              <Button size='sm' variant={questionType === 'multiple_choice' ? 'primary' : 'secondary'} onClick={() => setQuestionType('multiple_choice')}>Multiple choice</Button>
+              <Button size='sm' variant={questionType === 'judge' ? 'primary' : 'secondary'} onClick={() => setQuestionType('judge')}>Judge</Button>
+            </View>
+            <View className={styles.filterRow}>
+              <Button size='sm' variant={correctFilter === 'all' ? 'primary' : 'secondary'} onClick={() => setCorrectFilter('all')}>All results</Button>
+              <Button size='sm' variant={correctFilter === 'correct' ? 'primary' : 'secondary'} onClick={() => setCorrectFilter('correct')}>Correct only</Button>
+              <Button size='sm' variant={correctFilter === 'incorrect' ? 'primary' : 'secondary'} onClick={() => setCorrectFilter('incorrect')}>Incorrect only</Button>
+            </View>
+            <View className={styles.filterRow}>
+              <Input aria-label='Date from' value={dateFrom} onInput={event => setDateFrom(event.detail.value)} placeholder='YYYY-MM-DD' />
+              <Input aria-label='Date to' value={dateTo} onInput={event => setDateTo(event.detail.value)} placeholder='YYYY-MM-DD' />
+            </View>
+            <Button size='sm' onClick={applyFilters}>Apply filters</Button>
+          </View>
+
+          {state === 'loading' && <Text className={styles.state}>Loading practice history…</Text>}
+          {state === 'error' && <View className={styles.state}><Text>Could not load practice history.</Text><Button size='sm' onClick={() => void load(page, appliedFilters)}>Retry practice history</Button></View>}
+          {state === 'empty' && <Text className={styles.state}>No practice attempts found.</Text>}
+          {state === 'ready' && items.map(item => (
+            <View key={item.attempt_id} className={styles.card}>
+              <View className={styles.cardHeader}>
+                <Text>{item.category_path.map(category => category.name).join(' / ')}</Text>
+                <Text>{item.is_correct ? 'Correct' : 'Incorrect'} · Attempt {item.attempt_no}</Text>
+              </View>
+              <Text className={styles.question}>{item.question_text}</Text>
+              <View className={styles.options}>
+                {Object.entries(item.options).map(([key, value]) => <Text key={key}>{key}. {value}</Text>)}
+              </View>
+              <Text>Your answer: {answerText(item.user_answer)}</Text>
+              <Text>Correct answer: {answerText(item.correct_answer)}</Text>
+              <Text className={styles.explanation}>{item.explanation}</Text>
+              <Text className={styles.meta}>{item.submitted_at} · Current status: {item.current_question_status ?? 'removed'}</Text>
+            </View>
+          ))}
+
+          {(state === 'ready' || state === 'empty') && total > PAGE_SIZE && (
+            <View className={styles.pagination}>
+              <Button size='sm' disabled={page <= 1} onClick={() => void load(page - 1, appliedFilters)}>Previous page</Button>
+              <Text>Page {page}</Text>
+              <Button size='sm' disabled={page * PAGE_SIZE >= total} onClick={() => void load(page + 1, appliedFilters)}>Next page</Button>
+            </View>
+          )}
+        </View>
+      </View>
+    </AuthGuard>
+  )
+}
diff --git a/src/pages/quiz/wrong-book.module.scss b/src/pages/quiz/wrong-book.module.scss
index e9313ac..96e547d 100644
--- a/src/pages/quiz/wrong-book.module.scss
+++ b/src/pages/quiz/wrong-book.module.scss
@@ -11,75 +11,64 @@
 .body {
   flex: 1;
   overflow-y: auto;
   padding: $spacing-md $spacing-lg;
   padding-bottom: calc(#{$spacing-lg} + #{$safe-bottom});
   display: flex;
   flex-direction: column;
   gap: $spacing-md;
 }
 
+.state {
+  display: flex;
+  flex-direction: column;
+  gap: $spacing-sm;
+}
+
 .card {
   background: $color-white;
   border-radius: $radius-md;
   padding: $spacing-md;
 }
 
 .cardHeader {
   display: flex;
   justify-content: space-between;
   align-items: center;
   margin-bottom: $spacing-sm;
 }
 
-.wrongCount {
-  font-size: $font-sm;
-  color: $color-price;
-  font-weight: 600;
-}
-
-.wrongDate {
+.cardHeader {
   font-size: $font-sm;
   color: $color-text-tertiary;
 }
 
-.stem {
+.question {
   font-size: $font-base;
   font-weight: 600;
   color: $color-text;
   line-height: 1.5;
   margin-bottom: $spacing-sm;
   display: block;
 }
 
 .options {
   display: flex;
   flex-direction: column;
   gap: 4px;
   margin-bottom: $spacing-sm;
 }
 
-.optionText {
+.options text {
   font-size: $font-sm;
   color: $color-text-secondary;
 }
 
-.optionCorrect {
-  color: $color-success;
-  font-weight: 600;
-}
-
-.explanation {
-  font-size: $font-sm;
-  color: $color-text-tertiary;
-  background: $color-bg-secondary;
-  padding: $spacing-sm;
-  border-radius: $radius-sm;
-  margin-bottom: $spacing-sm;
-  display: block;
+.disabled {
+  opacity: 0.58;
 }
 
 .actions {
   display: flex;
   justify-content: flex-end;
   gap: $spacing-sm;
 }
diff --git a/src/pages/quiz/wrong-book.tsx b/src/pages/quiz/wrong-book.tsx
index 458420f..cf02744 100644
--- a/src/pages/quiz/wrong-book.tsx
+++ b/src/pages/quiz/wrong-book.tsx
@@ -1,84 +1,63 @@
-import { useState, useEffect } from 'react'
-import { View, Text } from '@tarojs/components'
+import { useCallback, useEffect, useState } from 'react'
+import { Text, View } from '@tarojs/components'
 import Taro from '@tarojs/taro'
 import { AuthGuard } from '@/components/AuthGuard'
-import { PageHeader } from '@/components/PageHeader'
 import { Button } from '@/components/Button'
-import { EmptyState } from '@/components/EmptyState'
-import { STRINGS } from '@/constants/strings'
-import { ROUTES } from '@/constants/routes'
-import { getWrongBook, removeWrongBook } from '@/services/dataService'
-import type { WrongQuestion } from '@/types'
+import { PageHeader } from '@/components/PageHeader'
+import { useAuth } from '@/hooks/useAuth'
+import { quizApi } from '@/services/quizService'
+import type { QuizWrongBookItem } from '@/types/quiz'
 import styles from './wrong-book.module.scss'
 
+type LoadState = 'loading' | 'ready' | 'empty' | 'error'
+
 export default function WrongBookPage() {
-  const [items, setItems] = useState<WrongQuestion[]>([])
+  const { isChecked, isLoggedIn } = useAuth()
+  const [items, setItems] = useState<QuizWrongBookItem[]>([])
+  const [state, setState] = useState<LoadState>('loading')
 
-  useEffect(() => {
-    // eslint-disable-next-line @typescript-eslint/no-floating-promises
-    getWrongBook().then(setItems).catch(() => {})
+  const load = useCallback(async () => {
+    setState('loading')
+    try {
+      const result = await quizApi.listWrongBook({ page: 1, page_size: 100 })
+      setItems(result.items)
+      setState(result.items.length ? 'ready' : 'empty')
+    } catch {
+      setState('error')
+    }
   }, [])
 
-  const handleRemove = (recordId: number) => {
-    setItems(prev => prev.filter(item => item.recordId !== recordId))
-    // eslint-disable-next-line @typescript-eslint/no-floating-promises
-    removeWrongBook(recordId)
-  }
-
-  const handleRedo = (item: WrongQuestion) => {
-    Taro.navigateTo({ url: `/pages/quiz/practice?categoryId=${item.categoryId}` })
-  }
-
-  if (items.length === 0) {
-    return (
-      <AuthGuard>
-        <View className={styles.page}>
-          <PageHeader title={STRINGS.QUIZ_WRONG_BOOK_TITLE} shouldShowBack />
-          <EmptyState title={STRINGS.QUIZ_WRONG_BOOK_EMPTY} />
-        </View>
-      </AuthGuard>
-    )
-  }
+  useEffect(() => {
+    if (isChecked && isLoggedIn) void load()
+  }, [isChecked, isLoggedIn, load])
 
   return (
     <AuthGuard>
       <View className={styles.page}>
-        <PageHeader title={STRINGS.QUIZ_WRONG_BOOK_TITLE} shouldShowBack />
+        <PageHeader title='Wrong book' shouldShowBack />
         <View className={styles.body}>
-          {items.map(item => (
-            <View key={item.id} className={styles.card}>
+          {state === 'loading' && <Text className={styles.state}>Loading wrong book…</Text>}
+          {state === 'error' && <View className={styles.state}><Text>Could not load wrong book.</Text><Button size='sm' onClick={() => void load()}>Retry wrong book</Button></View>}
+          {state === 'empty' && <Text className={styles.state}>No wrong questions.</Text>}
+          {state === 'ready' && items.map(item => (
+            <View key={item.id} className={`${styles.card} ${!item.usable_for_practice ? styles.disabled : ''}`}>
               <View className={styles.cardHeader}>
-                <Text className={styles.wrongCount}>
-                  {STRINGS.QUIZ_WRONG_COUNT}: {item.wrongCount}
-                </Text>
-                <Text className={styles.wrongDate}>{item.wrongDate}</Text>
+                <Text>Latest wrong: {item.latest_wrong_at}</Text>
+                <Text>{item.question_status === 'disabled' ? 'Disabled · unavailable for practice' : 'Available for wrong practice'}</Text>
               </View>
-              <Text className={styles.stem}>{item.stem}</Text>
+              <Text className={styles.question}>{item.question.question_text}</Text>
               <View className={styles.options}>
-                {item.options.map((opt, idx) => {
-                  const correct = Array.isArray(item.correctAnswer)
-                    ? item.correctAnswer.includes(idx)
-                    : item.correctAnswer === idx
-                  return (
-                    <Text key={opt.label} className={`${styles.optionText} ${correct ? styles.optionCorrect : ''}`}>
-                      {opt.label}. {opt.text}
-                    </Text>
-                  )
-                })}
-              </View>
-              <Text className={styles.explanation}>{item.explanation}</Text>
-              <View className={styles.actions}>
-                <Button size='sm' variant='secondary' onClick={() => handleRemove(item.recordId)}>
-                  {STRINGS.QUIZ_WRONG_BOOK_REMOVE}
-                </Button>
-                <Button size='sm' onClick={() => handleRedo(item)}>
-                  {STRINGS.QUIZ_WRONG_BOOK_REDO}
-                </Button>
+                {Object.entries(item.question.options).map(([key, value]) => <Text key={key}>{key}. {value}</Text>)}
               </View>
+              {item.usable_for_practice && (
+                <View className={styles.actions}>
+                  <Button size='sm' onClick={() => Taro.navigateTo({ url: '/pages/quiz/practice?mode=wrong' })}>Practice wrong questions</Button>
+                </View>
+              )}
             </View>
           ))}
         </View>
       </View>
     </AuthGuard>
   )
-}
\ No newline at end of file
+}
diff --git a/task-8-report.md b/task-8-report.md
new file mode 100644
index 0000000..b7a8b1c
--- /dev/null
+++ b/task-8-report.md
@@ -0,0 +1,74 @@
+# Task 8 report: quiz history and user assets
+
+## Scope completed
+
+- Added the protected practice-history page, pagination, and category/question-type/correctness/date filters.
+- History renders every attempt independently, including repeated answers to the same question, with the frozen question/options, submitted answer, correct answer, explanation, result, attempt number, and submission time.
+- Replaced the legacy wrong-book page with the read-only `quizApi.listWrongBook` contract. It renders `latest_wrong_at`, `question_status`, and `usable_for_practice`; disabled questions remain visible and have no action. The only practice action opens `/pages/quiz/practice?mode=wrong`.
+- Replaced collections with the `quizApi` contract. Removal calls `removeCollection(question_id)`, shows pending/error/retry feedback, keeps the item on failure, and reloads the authoritative list on success. Disabled/inactive items remain visible and have no navigation action. Active items only expose explicit category browsing.
+- Replaced manual check-in with separate today-status and calendar reads. The calendar query uses the last 30 inclusive `Asia/Shanghai` calendar dates; the page explains automatic check-in and has no submit/manual button.
+- Added loading, empty, error, and retry states. Registered `practice-history` in the quiz subpackage and added a quiz navigation entry.
+
+## RED evidence
+
+Command:
+
+`node_modules/.codex-portable-node/node.exe node_modules/vitest/vitest.mjs run src/pages/quiz/__tests__/practiceAssets.test.tsx --reporter=verbose`
+
+Initial result: exit 1. Vitest could not resolve `../practice-history`, confirming that the requested history page did not exist before production implementation.
+
+## GREEN evidence
+
+Focused command:
+
+`node_modules/.codex-portable-node/node.exe node_modules/vitest/vitest.mjs run src/pages/quiz/__tests__/practiceAssets.test.tsx --reporter=verbose`
+
+Result: exit 0, 1 test file and 6 tests passed.
+
+The focused tests explicitly verify:
+
+- auth gating before history calls;
+- all six history query controls plus page/page-size;
+- two separately rendered attempts for the same `question_id` (`attempt_no` 1 and 2);
+- frozen history options and grading details;
+- history loading, pagination, empty, error, and retry;
+- wrong-book read-only behavior, no answer/explanation leakage, `latest_wrong_at`, disabled state, and exact `mode=wrong` navigation;
+- collection deletion with `question_id` 99 and never collection record ID 8801;
+- failed collection removal retains the item, exposes retry, and successful retry reloads the server list;
+- Shanghai boundary behavior at `2026-08-11T16:30:00Z`, producing `{ date_from: '2026-07-14', date_to: '2026-08-12' }`;
+- absence of a manual check-in action and independent retry for status/calendar failures.
+
+## Full tests and typecheck
+
+Full test command:
+
+`node_modules/.codex-portable-node/node.exe node_modules/vitest/vitest.mjs run --reporter=dot`
+
+Result: exit 0, 11 test files and 86 tests passed.
+
+Touched-file typecheck command:
+
+`node_modules/.codex-portable-node/node.exe node_modules/typescript/bin/tsc --noEmit -p tsconfig.task-8.json`
+
+Result: exit 0 with zero diagnostics.
+
+Repository-wide typecheck command:
+
+`node_modules/.codex-portable-node/node.exe node_modules/typescript/bin/tsc --noEmit -p tsconfig.json`
+
+Result: exit 1 on pre-existing, unrelated diagnostics outside Task 8. Examples include `FloatingService`, `ZoneBanner`, activity/mine/registration pages, legacy quiz mock/training imports, `userService`, `zoneService`, and legacy exports in `src/types/index.ts`. No Task 8 file appeared in the diagnostic output.
+
+## Forbidden legacy audit
+
+The touched page sources contain none of: `removeWrongBook`, `addWrongBook`, `submitCheckin`, `recordId`, `/submit`, `/progress`, quiz mock imports, `getWrongBook`, `getFavoriteQuestions`, or `removeQuizFavorite`.
+
+## Commit
+
+Scoped commit message: `feat: complete quiz history and user assets`
+
+Only the Task 8 page, style, test, route/config, touched-typecheck config, and this report are included. Existing staged/untracked planning and cache files remain outside the commit.
+
+## Concerns
+
+- The repository-wide TypeScript baseline is currently red for unrelated files, so Task 8 uses a checked-in touched-file project to provide zero-diagnostic evidence without expanding scope.
+- User-facing copy in the new pages is English because several existing quiz string literals are mojibake in this checkout. This avoids adding corrupted text; localization can be handled separately.
diff --git a/tsconfig.task-8.json b/tsconfig.task-8.json
new file mode 100644
index 0000000..b54adf2
--- /dev/null
+++ b/tsconfig.task-8.json
@@ -0,0 +1,16 @@
+{
+  "extends": "./tsconfig.json",
+  "include": [
+    "types/global.d.ts",
+    "src/test/setup.ts",
+    "src/pages/quiz/practice-history.tsx",
+    "src/pages/quiz/wrong-book.tsx",
+    "src/pages/quiz/collections.tsx",
+    "src/pages/quiz/checkin.tsx",
+    "src/pages/quiz/__tests__/practiceAssets.test.tsx",
+    "src/constants/quiz.ts",
+    "src/constants/routes.ts",
+    "src/app.config.ts"
+  ],
+  "exclude": ["dist", "node_modules"]
+}

