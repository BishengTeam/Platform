7713d65 feat: implement resumable quiz practice sessions
 .../task-7-report.md                               |  51 +++
 src/features/quiz/__tests__/idempotency.test.ts    |  55 +++
 src/features/quiz/idempotency.ts                   |  36 ++
 src/pages/quiz/__tests__/practice.test.tsx         | 250 +++++++++++
 src/pages/quiz/practice.module.scss                | 235 +---------
 src/pages/quiz/practice.tsx                        | 492 ++++++++++++---------
 6 files changed, 703 insertions(+), 416 deletions(-)
diff --git a/.superpowers/sdd/2026-08-11-quiz-full-alignment/task-7-report.md b/.superpowers/sdd/2026-08-11-quiz-full-alignment/task-7-report.md
new file mode 100644
index 0000000..8871db2
--- /dev/null
+++ b/.superpowers/sdd/2026-08-11-quiz-full-alignment/task-7-report.md
@@ -0,0 +1,51 @@
+# Task 7 report: resumable practice sessions
+
+## Status
+
+Implemented the practice page on the server session snapshot contract. The page no longer fetches `/questions`, performs local grading, or exposes manual wrong-book controls/calls.
+
+## RED / GREEN evidence
+
+- Idempotency RED: focused Vitest failed because `src/features/quiz/idempotency.ts` did not exist.
+- Idempotency GREEN: `idempotency.test.ts` passed 3/3 after the minimal durable storage implementation.
+- Practice RED: after fixing the test's Taro `useLoad` boundary, all 5 page tests failed because the existing page invoked legacy `getQuizQuestions`; this proved the test caught the forbidden non-session flow.
+- Practice GREEN: focused Task 7 suite passed 8/8 (2 files).
+
+All commands used the repository-bundled isolated Node executable: `.superpowers/tools/node/node.exe`.
+
+## Idempotency lifecycle
+
+- Storage identity is scoped by server session ID, server session-question ID, and explicit local attempt ID.
+- The first submission persists a generated 8–64 character key before the network call.
+- Network/API failure leaves the key and selected answer intact; retry submits the same exact payload.
+- Confirmed submit success clears only that logical attempt's key.
+- Re-answer derives a new local attempt ID from authoritative `attempt_count + 1`, yielding a new durable key while preserving older server attempts through `latest_result` and `attempt_count`.
+
+## Session behavior evidence
+
+- Restore: auth initialization/login gates `getCurrentPracticeSession`; an active or completed snapshot renders directly.
+- Create: fixed 10/20/50/100 counts; normal submits `mode`, `category_id`, and `question_count`; wrong submits `mode: wrong` and count without category.
+- Submit/retry: exact `session_question_id`, durable `idempotency_key`, and normalized `user_answer`; explicit submit only. Failure is visible and retryable without losing selection or session ID.
+- Server grading: only returned `is_correct`, `correct_answer`, and `explanation` render. No answer comparison exists locally.
+- Types: single-choice, multiple-choice, and judge all use the public options map; multi-answer values sort before submit.
+- Navigation: previous/next remains free independently of answer state.
+- Re-answer: explicit action resets only editable local selection/result view and generates a new logical attempt on the next submit.
+- Complete: completed snapshots are read-only and offer “Start next session”.
+- Abandon: active sessions require confirmation, call the server abandon endpoint, retain server history, and return to setup.
+- Failures: restore/create/submit/refresh/abandon each expose explicit error/retry state; no silent catches remain.
+
+## Verification
+
+- Focused: 2 test files, 8 tests passed.
+- Full Vitest: 10 test files, 77 tests passed.
+- `git diff --check` for Task 7 files: exit 0.
+- Full `tsc --noEmit -p tsconfig.json`: exit 1 on the repository's existing unrelated baseline (FloatingService, ZoneBanner, activity/profile/registration/services, legacy quiz mock/checkin/collections/wrong-book, and aggregate type exports). No diagnostic referenced a Task 7 touched source or test file.
+
+## Commit
+
+`feat: implement resumable quiz practice sessions`
+
+## Concerns
+
+- The full repository typecheck cannot be made green within Task 7 scope because of numerous pre-existing unrelated diagnostics. Task 7 itself adds no reported TypeScript diagnostic.
+- Session snapshots expose only `latest_result` plus `attempt_count`, so the UI represents prior attempts through those server-owned aggregate fields; full per-attempt history remains the practice-history endpoint's responsibility.
diff --git a/src/features/quiz/__tests__/idempotency.test.ts b/src/features/quiz/__tests__/idempotency.test.ts
new file mode 100644
index 0000000..5d19c68
--- /dev/null
+++ b/src/features/quiz/__tests__/idempotency.test.ts
@@ -0,0 +1,55 @@
+import Taro from '@tarojs/taro'
+import { beforeEach, describe, expect, it, vi } from 'vitest'
+import { clearAttemptKey, getOrCreateAttemptKey } from '../idempotency'
+
+vi.mock('@tarojs/taro', () => ({
+  default: {
+    getStorageSync: vi.fn(),
+    setStorageSync: vi.fn(),
+    removeStorageSync: vi.fn(),
+  },
+}))
+
+describe('practice attempt idempotency', () => {
+  const storage = new Map<string, string>()
+
+  beforeEach(() => {
+    storage.clear()
+    vi.clearAllMocks()
+    vi.mocked(Taro.getStorageSync).mockImplementation((key: string) => storage.get(key) ?? '')
+    vi.mocked(Taro.setStorageSync).mockImplementation((key: string, value: string) => {
+      storage.set(key, value)
+    })
+    vi.mocked(Taro.removeStorageSync).mockImplementation((key: string) => {
+      storage.delete(key)
+    })
+  })
+
+  it('persists one valid key for the same logical attempt across retries', () => {
+    const first = getOrCreateAttemptKey(31, 401, 'attempt-1')
+    const retry = getOrCreateAttemptKey(31, 401, 'attempt-1')
+
+    expect(retry).toBe(first)
+    expect(first).toMatch(/^[A-Za-z0-9_-]{8,64}$/)
+    expect(Taro.setStorageSync).toHaveBeenCalledTimes(1)
+  })
+
+  it('uses a new key for an explicit re-answer without disturbing the earlier attempt', () => {
+    const first = getOrCreateAttemptKey(31, 401, 'attempt-1')
+    const reanswer = getOrCreateAttemptKey(31, 401, 'attempt-2')
+
+    expect(reanswer).not.toBe(first)
+    expect(getOrCreateAttemptKey(31, 401, 'attempt-1')).toBe(first)
+    expect(getOrCreateAttemptKey(31, 401, 'attempt-2')).toBe(reanswer)
+  })
+
+  it('clears only the confirmed logical attempt key', () => {
+    const submitted = getOrCreateAttemptKey(31, 401, 'attempt-1')
+    const pending = getOrCreateAttemptKey(31, 402, 'attempt-1')
+
+    clearAttemptKey(31, 401, 'attempt-1')
+
+    expect(getOrCreateAttemptKey(31, 401, 'attempt-1')).not.toBe(submitted)
+    expect(getOrCreateAttemptKey(31, 402, 'attempt-1')).toBe(pending)
+  })
+})
diff --git a/src/features/quiz/idempotency.ts b/src/features/quiz/idempotency.ts
new file mode 100644
index 0000000..3a3b914
--- /dev/null
+++ b/src/features/quiz/idempotency.ts
@@ -0,0 +1,36 @@
+import Taro from '@tarojs/taro'
+
+const STORAGE_PREFIX = 'quiz:practice-attempt:'
+
+function storageKey(sessionId: number, sessionQuestionId: number, localAttemptId: string) {
+  return `${STORAGE_PREFIX}${sessionId}:${sessionQuestionId}:${localAttemptId}`
+}
+
+function createKey() {
+  const random = Math.random().toString(36).slice(2, 14)
+  return `pa_${Date.now().toString(36)}_${random}`
+}
+
+export function getOrCreateAttemptKey(
+  sessionId: number,
+  sessionQuestionId: number,
+  localAttemptId: string,
+) {
+  const key = storageKey(sessionId, sessionQuestionId, localAttemptId)
+  const stored = Taro.getStorageSync<string>(key)
+  if (typeof stored === 'string' && stored.length >= 8 && stored.length <= 64) {
+    return stored
+  }
+
+  const created = createKey()
+  Taro.setStorageSync(key, created)
+  return created
+}
+
+export function clearAttemptKey(
+  sessionId: number,
+  sessionQuestionId: number,
+  localAttemptId: string,
+) {
+  Taro.removeStorageSync(storageKey(sessionId, sessionQuestionId, localAttemptId))
+}
diff --git a/src/pages/quiz/__tests__/practice.test.tsx b/src/pages/quiz/__tests__/practice.test.tsx
new file mode 100644
index 0000000..ea519cc
--- /dev/null
+++ b/src/pages/quiz/__tests__/practice.test.tsx
@@ -0,0 +1,250 @@
+import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
+import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
+import Taro from '@tarojs/taro'
+import { quizApi } from '@/services/quizService'
+import { useAuth } from '@/hooks/useAuth'
+import type { QuizPracticeSessionResponse } from '@/types/quiz'
+import QuizPracticePage from '../practice'
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
+const routerParams: Record<string, string> = {}
+const storage = new Map<string, string>()
+
+vi.mock('@/services/quizService', () => ({
+  quizApi: {
+    listCategories: vi.fn(),
+    createPracticeSession: vi.fn(),
+    getCurrentPracticeSession: vi.fn(),
+    getPracticeSession: vi.fn(),
+    submitPracticeAttempt: vi.fn(),
+    abandonPracticeSession: vi.fn(),
+  },
+}))
+
+vi.mock('@/hooks/useAuth', () => ({ useAuth: vi.fn() }))
+
+vi.mock('@tarojs/components', () => ({
+  View: 'div',
+  Text: 'span',
+  ScrollView: ({ children }: React.PropsWithChildren<{ scrollY?: boolean }>) => <div>{children}</div>,
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
+  useLoad: (callback: (params: Record<string, string>) => void) => callback(routerParams),
+  default: {
+    reLaunch: vi.fn(),
+    getCurrentInstance: () => ({ router: { params: routerParams } }),
+    showModal: vi.fn(),
+    getStorageSync: vi.fn(),
+    setStorageSync: vi.fn(),
+    removeStorageSync: vi.fn(),
+  },
+}))
+
+const baseSession: QuizPracticeSessionResponse = {
+  id: 31,
+  mode: 'normal',
+  category_id: 7,
+  requested_count: 10,
+  actual_count: 2,
+  status: 'in_progress',
+  started_at: '2026-08-12T01:00:00Z',
+  completed_at: null,
+  abandoned_at: null,
+  lock_version: 1,
+  questions: [
+    {
+      id: 99,
+      session_question_id: 401,
+      position: 1,
+      category_id: 7,
+      category_path: [{ id: 7, name: 'Safety' }],
+      question_type: 'single_choice',
+      question_text: 'Which answer comes from the server?',
+      options: { A: 'Authoritative result', B: 'Local comparison' },
+      answered: false,
+      attempt_count: 0,
+      latest_result: null,
+    },
+    {
+      id: 100,
+      session_question_id: 402,
+      position: 2,
+      category_id: 7,
+      category_path: [{ id: 7, name: 'Safety' }],
+      question_type: 'multiple_choice',
+      question_text: 'Choose both durable properties.',
+      options: { A: 'Retry', B: 'Re-answer', C: 'Local grading' },
+      answered: false,
+      attempt_count: 0,
+      latest_result: null,
+    },
+  ],
+}
+
+const firstResult = {
+  attempt_id: 800,
+  attempt_no: 1,
+  user_answer: 'A',
+  is_correct: false,
+  correct_answer: 'B',
+  explanation: 'The server owns grading.',
+  submitted_at: '2026-08-12T01:01:00Z',
+}
+
+describe('resumable practice sessions', () => {
+  afterEach(cleanup)
+
+  beforeEach(() => {
+    vi.clearAllMocks()
+    storage.clear()
+    Object.keys(routerParams).forEach(key => delete routerParams[key])
+    vi.mocked(useAuth).mockReturnValue({ isChecked: true, isLoggedIn: true })
+    vi.mocked(quizApi.getCurrentPracticeSession).mockResolvedValue(baseSession)
+    vi.mocked(quizApi.listCategories).mockResolvedValue([{ id: 7, name: 'Safety', parent_id: null, depth: 1, description: null, sort_order: 1, question_count: 20, children: [] }])
+    vi.mocked(Taro.showModal).mockResolvedValue({ confirm: true, cancel: false, errMsg: 'showModal:ok' })
+    vi.mocked(Taro.getStorageSync).mockImplementation((key: string) => storage.get(key) ?? '')
+    vi.mocked(Taro.setStorageSync).mockImplementation((key: string, value: string) => { storage.set(key, value) })
+    vi.mocked(Taro.removeStorageSync).mockImplementation((key: string) => { storage.delete(key) })
+  })
+
+  it('waits for auth initialization before restoring the server session snapshot', async () => {
+    vi.mocked(useAuth).mockReturnValue({ isChecked: false, isLoggedIn: false })
+    const { rerender } = render(<QuizPracticePage />)
+    expect(quizApi.getCurrentPracticeSession).not.toHaveBeenCalled()
+
+    vi.mocked(useAuth).mockReturnValue({ isChecked: true, isLoggedIn: true })
+    rerender(<QuizPracticePage />)
+
+    expect(await screen.findByText('Which answer comes from the server?')).toBeInTheDocument()
+    expect(quizApi.getCurrentPracticeSession).toHaveBeenCalledTimes(1)
+    expect(quizApi.listQuestions).toBeUndefined()
+  })
+
+  it('creates normal and wrong sessions with only server-supported setup fields', async () => {
+    vi.mocked(quizApi.getCurrentPracticeSession).mockResolvedValue(null)
+    vi.mocked(quizApi.createPracticeSession).mockResolvedValue(baseSession)
+    render(<QuizPracticePage />)
+
+    expect(await screen.findByText('Start a practice session')).toBeInTheDocument()
+    expect(screen.getAllByTestId('question-count')).toHaveLength(4)
+    fireEvent.click(screen.getByRole('button', { name: 'Safety' }))
+    fireEvent.click(screen.getByRole('button', { name: '20 questions' }))
+    fireEvent.click(screen.getByRole('button', { name: 'Start normal practice' }))
+    await waitFor(() => expect(quizApi.createPracticeSession).toHaveBeenCalledWith({
+      mode: 'normal', category_id: 7, question_count: 20,
+    }))
+
+    cleanup()
+    vi.clearAllMocks()
+    routerParams.mode = 'wrong'
+    vi.mocked(useAuth).mockReturnValue({ isChecked: true, isLoggedIn: true })
+    vi.mocked(quizApi.getCurrentPracticeSession).mockResolvedValue(null)
+    vi.mocked(quizApi.listCategories).mockResolvedValue([])
+    vi.mocked(quizApi.createPracticeSession).mockResolvedValue({ ...baseSession, mode: 'wrong', category_id: null })
+    render(<QuizPracticePage />)
+    fireEvent.click(await screen.findByRole('button', { name: 'Start wrong-question practice' }))
+    await waitFor(() => expect(quizApi.createPracticeSession).toHaveBeenCalledWith({ mode: 'wrong', question_count: 10 }))
+  })
+
+  it('preserves answer and idempotency key on failure, then renders server grading after retry', async () => {
+    vi.mocked(quizApi.submitPracticeAttempt)
+      .mockRejectedValueOnce(new Error('network unavailable'))
+      .mockResolvedValueOnce(firstResult)
+    vi.mocked(quizApi.getPracticeSession).mockResolvedValue({
+      ...baseSession,
+      questions: [{ ...baseSession.questions[0], answered: true, attempt_count: 1, latest_result: firstResult }, baseSession.questions[1]],
+    })
+    render(<QuizPracticePage />)
+
+    fireEvent.click(await screen.findByText('A. Authoritative result'))
+    fireEvent.click(screen.getByRole('button', { name: 'Submit answer' }))
+    expect(await screen.findByText('Submission failed. Your answer is preserved.')).toBeInTheDocument()
+    expect(screen.getByText('A. Authoritative result').closest('[data-selected="true"]')).not.toBeNull()
+
+    const firstPayload = vi.mocked(quizApi.submitPracticeAttempt).mock.calls[0][1]
+    fireEvent.click(screen.getByRole('button', { name: 'Retry submission' }))
+    await screen.findByText('The server owns grading.')
+    const retryPayload = vi.mocked(quizApi.submitPracticeAttempt).mock.calls[1][1]
+
+    expect(retryPayload).toEqual(firstPayload)
+    expect(firstPayload).toMatchObject({ session_question_id: 401, user_answer: 'A' })
+    expect(firstPayload.idempotency_key).toMatch(/^.{8,64}$/)
+    expect(screen.getByText('Incorrect')).toBeInTheDocument()
+    expect(screen.getByText('Correct answer: B')).toBeInTheDocument()
+    expect(quizApi.getPracticeSession).toHaveBeenCalledWith(31)
+  })
+
+  it('normalizes multi-answer order and creates a fresh logical key for re-answer', async () => {
+    const multiResult = { ...firstResult, attempt_id: 801, user_answer: ['A', 'B'], correct_answer: ['A', 'B'], is_correct: true }
+    const reanswerResult = { ...multiResult, attempt_id: 802, attempt_no: 2 }
+    vi.mocked(quizApi.submitPracticeAttempt).mockResolvedValueOnce(multiResult).mockResolvedValueOnce(reanswerResult)
+    vi.mocked(quizApi.getPracticeSession)
+      .mockResolvedValueOnce({ ...baseSession, questions: [baseSession.questions[0], { ...baseSession.questions[1], answered: true, attempt_count: 1, latest_result: multiResult }] })
+      .mockResolvedValueOnce({ ...baseSession, questions: [baseSession.questions[0], { ...baseSession.questions[1], answered: true, attempt_count: 2, latest_result: reanswerResult }] })
+    render(<QuizPracticePage />)
+
+    fireEvent.click(await screen.findByRole('button', { name: 'Next question' }))
+    fireEvent.click(screen.getByText('B. Re-answer'))
+    fireEvent.click(screen.getByText('A. Retry'))
+    fireEvent.click(screen.getByRole('button', { name: 'Submit answer' }))
+    await waitFor(() => expect(quizApi.submitPracticeAttempt).toHaveBeenCalledTimes(1))
+    expect(vi.mocked(quizApi.submitPracticeAttempt).mock.calls[0][1].user_answer).toEqual(['A', 'B'])
+
+    fireEvent.click(await screen.findByRole('button', { name: 'Answer again' }))
+    fireEvent.click(screen.getByText('A. Retry'))
+    fireEvent.click(screen.getByText('B. Re-answer'))
+    fireEvent.click(screen.getByRole('button', { name: 'Submit answer' }))
+    await waitFor(() => expect(quizApi.submitPracticeAttempt).toHaveBeenCalledTimes(2))
+
+    const [first, second] = vi.mocked(quizApi.submitPracticeAttempt).mock.calls.map(call => call[1])
+    expect(second.idempotency_key).not.toBe(first.idempotency_key)
+    expect(await screen.findByText('Attempts: 2')).toBeInTheDocument()
+  })
+
+  it('keeps completed sessions read-only and abandons active sessions only after confirmation', async () => {
+    vi.mocked(quizApi.getCurrentPracticeSession).mockResolvedValue({
+      ...baseSession,
+      status: 'completed',
+      completed_at: '2026-08-12T01:05:00Z',
+      questions: [{ ...baseSession.questions[0], answered: true, attempt_count: 1, latest_result: firstResult }, baseSession.questions[1]],
+    })
+    render(<QuizPracticePage />)
+    expect(await screen.findByText('Session completed')).toBeInTheDocument()
+    expect(screen.queryByRole('button', { name: 'Submit answer' })).not.toBeInTheDocument()
+    expect(screen.getByRole('button', { name: 'Start next session' })).toBeInTheDocument()
+
+    cleanup()
+    vi.clearAllMocks()
+    vi.mocked(useAuth).mockReturnValue({ isChecked: true, isLoggedIn: true })
+    vi.mocked(quizApi.getCurrentPracticeSession).mockResolvedValue(baseSession)
+    vi.mocked(quizApi.listCategories).mockResolvedValue([])
+    vi.mocked(quizApi.abandonPracticeSession).mockResolvedValue({ session_id: 31, status: 'abandoned', abandoned_at: '2026-08-12T01:03:00Z' })
+    vi.mocked(Taro.showModal).mockResolvedValue({ confirm: true, cancel: false, errMsg: 'showModal:ok' })
+    render(<QuizPracticePage />)
+    fireEvent.click(await screen.findByRole('button', { name: 'Abandon session' }))
+    await waitFor(() => expect(quizApi.abandonPracticeSession).toHaveBeenCalledWith(31))
+    expect(await screen.findByText('Start a practice session')).toBeInTheDocument()
+  })
+})
diff --git a/src/pages/quiz/practice.module.scss b/src/pages/quiz/practice.module.scss
inde…2304 tokens truncated…nst [showResult, setShowResult] = useState(false)
-  const [favorites, setFavorites] = useState<Set<string>>(new Set())
-  const [wrongBook, setWrongBook] = useState<Set<string>>(new Set())
-  /** 每题提交后的服务端判分结果，API 模式下以此来判定正误 */
-  const [submitResults, setSubmitResults] = useState<Record<string, SubmitResult>>({})
-
-  useLoad((options) => {
-    const categoryId = options?.categoryId
-    const modeParam = options?.mode as Mode | undefined
-    if (modeParam) setMode(modeParam)
-    // eslint-disable-next-line @typescript-eslint/no-floating-promises
-    getQuizQuestions(categoryId || undefined).then(setQuestions).catch(() => {})
-  })
-
-  const currentQuestion = questions[currentIndex]
-  const selectedAnswer = currentQuestion ? answers[currentQuestion.id] : undefined
-
-  const handleSelectSingle = useCallback((questionId: string, optIndex: number, label: string) => {
-    setAnswers(prev => ({ ...prev, [questionId]: optIndex }))
-    submitQuizAnswer({ question_id: Number(questionId), user_answer: label })
-      .then(res => { setSubmitResults(prev => ({ ...prev, [questionId]: res })) })
-      .catch(() => {})
+  const [answers, setAnswers] = useState<Record<number, string[]>>({})
+  const [pendingAttempts, setPendingAttempts] = useState<Record<number, { localId: string; answer: QuizAnswer }>>({})
+  const [loading, setLoading] = useState(false)
+  const [submitting, setSubmitting] = useState(false)
+  const [error, setError] = useState('')
+  const [submitError, setSubmitError] = useState('')
+  const [refreshError, setRefreshError] = useState('')
+
+  const loadSetup = useCallback(async () => {
+    const nextCategories = await quizApi.listCategories()
+    setCategories(nextCategories)
+    setCategoryId(current => current ?? nextCategories[0]?.id ?? null)
   }, [])
 
-  const handleSelectMultiple = useCallback((questionId: string, optIndex: number, question: QuizQuestion) => {
-    let nextAnswer: number[]
-    setAnswers(prev => {
-      const cur = (prev[questionId] as number[]) || []
-      const next = cur.includes(optIndex) ? cur.filter(i => i !== optIndex) : [...cur, optIndex]
-      nextAnswer = next
-      return { ...prev, [questionId]: next }
+  const restore = useCallback(async () => {
+    setLoading(true)
+    setError('')
+    try {
+      const current = await quizApi.getCurrentPracticeSession()
+      setSession(current)
+      setCurrentIndex(0)
+      if (!current) await loadSetup()
+    } catch {
+      setError('Practice session failed to load.')
+    } finally {
+      setLoading(false)
+    }
+  }, [loadSetup])
+
+  useEffect(() => {
+    if (isChecked && isLoggedIn) void restore()
+  }, [isChecked, isLoggedIn, restore])
+
+  const currentQuestion = session?.questions[currentIndex]
+  const selected = currentQuestion ? answers[currentQuestion.session_question_id] ?? [] : []
+  const result = currentQuestion?.latest_result ?? null
+  const readOnly = session?.status !== 'in_progress'
+
+  const progress = useMemo(() => {
+    if (!session?.questions.length) return 0
+    return ((currentIndex + 1) / session.questions.length) * 100
+  }, [currentIndex, session])
+
+  const createSession = async () => {
+    if (mode === 'normal' && categoryId === null) {
+      setError('Select a category before starting.')
+      return
+    }
+    setLoading(true)
+    setError('')
+    try {
+      const created = mode === 'wrong'
+        ? await quizApi.createPracticeSession({ mode: 'wrong', question_count: questionCount })
+        : await quizApi.createPracticeSession({ mode: 'normal', category_id: categoryId!, question_count: questionCount })
+      setSession(created)
+      setCurrentIndex(0)
+      setAnswers({})
+    } catch {
+      setError('Session creation failed. Please retry.')
+    } finally {
+      setLoading(false)
+    }
+  }
+
+  const selectOption = (option: string) => {
+    if (!currentQuestion || readOnly || result) return
+    setSubmitError('')
+    setAnswers(previous => {
+      const current = previous[currentQuestion.session_question_id] ?? []
+      const next = currentQuestion.question_type === 'multiple_choice'
+        ? current.includes(option) ? current.filter(value => value !== option) : [...current, option]
+        : [option]
+      return { ...previous, [currentQuestion.session_question_id]: next }
     })
-    const labels = nextAnswer!.sort().map(i => question.options[i]?.label ?? String(i))
-    submitQuizAnswer({ question_id: Number(questionId), user_answer: labels.join(',') })
-      .then(res => { setSubmitResults(prev => ({ ...prev, [questionId]: res })) })
-      .catch(() => {})
-  }, [])
+  }
 
-  const isCorrect = useMemo(() => {
-    if (!currentQuestion || selectedAnswer === undefined) return null
-    const result = submitResults[currentQuestion.id]
-    if (!result) return null
-    return result.is_correct
-  }, [currentQuestion, selectedAnswer, submitResults])
-
-  const correctCount = questions.filter(q => {
-    const result = submitResults[q.id]
-    return result?.is_correct === true
-  }).length
-
-  const handlePrev = () => {
-    if (currentIndex > 0) {
-      setCurrentIndex(i => i - 1)
+  const submitAnswer = async () => {
+    if (!session || !currentQuestion || selected.length === 0) return
+    const sessionQuestionId = currentQuestion.session_question_id
+    const existing = pendingAttempts[sessionQuestionId]
+    const pending = existing ?? {
+      localId: localAttemptId(currentQuestion),
+      answer: normalizedAnswer(currentQuestion, selected),
+    }
+    const idempotencyKey = getOrCreateAttemptKey(session.id, sessionQuestionId, pending.localId)
+    setPendingAttempts(previous => ({ ...previous, [sessionQuestionId]: pending }))
+    setSubmitting(true)
+    setSubmitError('')
+    setRefreshError('')
+    try {
+      const submitted = await quizApi.submitPracticeAttempt(session.id, {
+        session_question_id: sessionQuestionId,
+        idempotency_key: idempotencyKey,
+        user_answer: pending.answer,
+      })
+      clearAttemptKey(session.id, sessionQuestionId, pending.localId)
+      setPendingAttempts(previous => {
+        const next = { ...previous }
+        delete next[sessionQuestionId]
+        return next
+      })
+      setSession(previous => previous && ({
+        ...previous,
+        questions: previous.questions.map(question => question.session_question_id === sessionQuestionId
+          ? { ...question, answered: true, attempt_count: submitted.attempt_no, latest_result: submitted }
+          : question),
+      }))
+      try {
+        setSession(await quizApi.getPracticeSession(session.id))
+      } catch {
+        setRefreshError('Answer accepted, but session refresh failed. Retry refresh.')
+      }
+    } catch {
+      setSubmitError('Submission failed. Your answer is preserved.')
+    } finally {
+      setSubmitting(false)
     }
   }
-  const handleNext = () => {
-    if (currentIndex < questions.length - 1) {
-      setCurrentIndex(i => i + 1)
+
+  const retryRefresh = async () => {
+    if (!session) return
+    setRefreshError('')
+    try {
+      setSession(await quizApi.getPracticeSession(session.id))
+    } catch {
+      setRefreshError('Session refresh failed. Please retry.')
     }
   }
 
-  const handleToggleFavorite = useCallback((id: number) => {
-    setFavorites(prev => {
-      const next = new Set(prev)
-      if (next.has(id)) {
-        next.delete(id)
-        removeQuizFavorite(id)
-      } else {
-        next.add(id)
-        addQuizFavorite(id)
-      }
+  const reanswer = () => {
+    if (!currentQuestion) return
+    setAnswers(previous => {
+      const next = { ...previous }
+      delete next[currentQuestion.session_question_id]
       return next
     })
-  }, [])
+    setSession(previous => previous && ({
+      ...previous,
+      questions: previous.questions.map(question => question.session_question_id === currentQuestion.session_question_id
+        ? { ...question, latest_result: null }
+        : question),
+    }))
+  }
 
-  const handleToggleWrongBook = useCallback((id: number) => {
-    setWrongBook(prev => {
-      const next = new Set(prev)
-      if (next.has(id)) {
-        next.delete(id)
-        // eslint-disable-next-line @typescript-eslint/no-floating-promises
-        removeWrongBook(id)
-      } else {
-        next.add(id)
-        // eslint-disable-next-line @typescript-eslint/no-floating-promises
-        addWrongBook(id)
-      }
-      return next
+  const abandon = async () => {
+    if (!session) return
+    const decision = await Taro.showModal({
+      title: 'Abandon practice session?',
+      content: 'Submitted attempts remain in your history.',
+      confirmText: 'Abandon',
     })
-  }, [])
+    if (!decision.confirm) return
+    setLoading(true)
+    setError('')
+    try {
+      await quizApi.abandonPracticeSession(session.id)
+      setSession(null)
+      setAnswers({})
+      await loadSetup()
+    } catch {
+      setError('Session abandon failed. Please retry.')
+    } finally {
+      setLoading(false)
+    }
+  }
 
-  const handleSubmit = () => setShowResult(true)
-
-  if (showResult) {
-    return (
-      <AuthGuard>
-        <View className={styles.page}>
-          <PageHeader title={STRINGS.QUIZ_HEADER} shouldShowBack />
-          <View className={styles.resultBody}>
-            <View className={styles.resultCard}>
-              <Text className={styles.resultScore}>
-                {STRINGS.QUIZ_RESULT_SCORE}: {correctCount} / {questions.length}
-              </Text>
-              <Text className={styles.resultAccuracy}>
-                {STRINGS.QUIZ_RESULT_ACCURACY}: {questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0}%
-              </Text>
-            </View>
-            <View className={styles.btnWrap}>
-              <Button variant='gradient' size='lg' onClick={() => {
-                setShowResult(false)
-                setCurrentIndex(0)
-                setAnswers({})
-              }}>
-                {STRINGS.QUIZ_REDO}
-              </Button>
-            </View>
+  const nextSession = async () => {
+    setSession(null)
+    setAnswers({})
+    setCurrentIndex(0)
+    setLoading(true)
+    try {
+      await loadSetup()
+    } catch {
+      setError('Practice setup failed to load.')
+    } finally {
+      setLoading(false)
+    }
+  }
+
+  let content
+  if (loading) {
+    content = <View className={styles.state}><Text>Loading practice session…</Text></View>
+  } else if (error) {
+    content = <View className={styles.state}><Text>{error}</Text><Button onClick={() => void restore()}>Retry session</Button></View>
+  } else if (!session) {
+    content = (
+      <View className={styles.setup}>
+        <Text className={styles.setupTitle}>Start a practice session</Text>
+        <View className={styles.segmented}>
+          <Button variant={mode === 'normal' ? 'primary' : 'secondary'} onClick={() => setMode('normal')}>Normal</Button>
+          <Button variant={mode === 'wrong' ? 'primary' : 'secondary'} onClick={() => setMode('wrong')}>Wrong questions</Button>
+        </View>
+        {mode === 'normal' && (
+          <View className={styles.choiceGroup}>
+            <Text>Category</Text>
+            {categories.map(category => (
+              <Button key={category.id} variant={categoryId === category.id ? 'primary' : 'secondary'} onClick={() => setCategoryId(category.id)}>{category.name}</Button>
+            ))}
           </View>
+        )}
+        <View className={styles.choiceGroup}>
+          <Text>Question count</Text>
+          {COUNTS.map(count => (
+            <View key={count} data-testid='question-count'>
+              <Button variant={questionCount === count ? 'primary' : 'secondary'} onClick={() => setQuestionCount(count)}>{count} questions</Button>
+            </View>
+          ))}
         </View>
-      </AuthGuard>
+        <Button variant='gradient' size='lg' onClick={() => void createSession()}>
+          {mode === 'wrong' ? 'Start wrong-question practice' : 'Start normal practice'}
+        </Button>
+      </View>
     )
-  }
-
-  if (!currentQuestion) {
-    return (
-      <AuthGuard>
-        <View className={styles.page}>
-          <PageHeader title={STRINGS.QUIZ_HEADER} shouldShowBack />
-          <View className={styles.resultBody}>
-            <Text>{STRINGS.QUIZ_NO_QUESTIONS}</Text>
+  } else if (!currentQuestion) {
+    content = <View className={styles.state}><Text>This session has no questions.</Text><Button onClick={() => void nextSession()}>Start next session</Button></View>
+  } else {
+    content = (
+      <ScrollView className={styles.body} scrollY>
+        <View className={styles.sessionHeader}>
+          <Text>{session.status === 'completed' ? 'Session completed' : session.mode === 'wrong' ? 'Wrong-question practice' : 'Normal practice'}</Text>
+          <Text>Session #{session.id}</Text>
+        </View>
+        <View className={styles.progressBar}><View className={styles.progressFill} style={{ width: `${progress}%` }} /></View>
+        <Text className={styles.progressText}>{currentIndex + 1} / {session.questions.length}</Text>
+        <View className={styles.questionCard}>
+          <View className={styles.questionHeader}>
+            <Text className={styles.questionType}>{currentQuestion.question_type.replaceAll('_', ' ')}</Text>
+            <Text>Attempts: {currentQuestion.attempt_count}</Text>
+          </View>
+          <Text className={styles.stem}>{currentQuestion.question_text}</Text>
+          <View className={styles.options}>
+            {Object.entries(currentQuestion.options).map(([key, value]) => {
+              const isSelected = selected.includes(key)
+              return (
+                <View
+                  key={key}
+                  className={`${styles.option} ${isSelected ? styles.optionSelected : ''}`}
+                  data-selected={isSelected ? 'true' : 'false'}
+                  onClick={() => selectOption(key)}
+                >
+                  <Text>{key}. {value}</Text>
+                </View>
+              )
+            })}
           </View>
+          {result && (
+            <View className={`${styles.feedback} ${result.is_correct ? styles.feedbackCorrect : styles.feedbackWrong}`}>
+              <Text className={styles.feedbackText}>{result.is_correct ? 'Correct' : 'Incorrect'}</Text>
+              <Text>Correct answer: {answerLabels(result.correct_answer)}</Text>
+              <Text className={styles.explanation}>{result.explanation}</Text>
+              {!readOnly && <Button onClick={reanswer}>Answer again</Button>}
+            </View>
+          )}
+          {submitError && <View className={styles.errorBox}><Text>{submitError}</Text><Button onClick={() => void submitAnswer()}>Retry submission</Button></View>}
+          {refreshError && <View className={styles.errorBox}><Text>{refreshError}</Text><Button onClick={() => void retryRefresh()}>Retry refresh</Button></View>}
+          {!readOnly && !result && !submitError && <Button disabled={selected.length === 0 || submitting} onClick={() => void submitAnswer()}>Submit answer</Button>}
+        </View>
+        <View className={styles.navRow}>
+          <Button variant='secondary' disabled={currentIndex === 0} onClick={() => setCurrentIndex(index => index - 1)}>Previous question</Button>
+          <Button variant='secondary' disabled={currentIndex === session.questions.length - 1} onClick={() => setCurrentIndex(index => index + 1)}>Next question</Button>
         </View>
-      </AuthGuard>
+        {session.status === 'in_progress'
+          ? <View className={styles.dangerAction}><Button variant='secondary' onClick={() => void abandon()}>Abandon session</Button></View>
+          : <View className={styles.dangerAction}><Button variant='gradient' onClick={() => void nextSession()}>Start next session</Button></View>}
+      </ScrollView>
     )
   }
 
   return (
     <AuthGuard>
       <View className={styles.page}>
-        <PageHeader title={STRINGS.QUIZ_HEADER} shouldShowBack />
-        <ScrollView className={styles.body} scrollY>
-          <View className={styles.progressBar}>
-            <View className={styles.progressFill} style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }} />
-          </View>
-          <Text className={styles.progressText}>
-            {currentIndex + 1} / {questions.length}
-          </Text>
-
-          <View className={styles.questionCard}>
-            <View className={styles.questionHeader}>
-              <Text className={styles.questionType}>
-                {currentQuestion.type === 'single' ? STRINGS.QUIZ_TYPE_SINGLE : STRINGS.QUIZ_TYPE_MULTIPLE}
-              </Text>
-              <View className={styles.headerActions}>
-                <Text className={styles.actionBtn} onClick={() => handleToggleFavorite(currentQuestion.id)}>
-                  {favorites.has(currentQuestion.id) ? STRINGS.QUIZ_UNCOLLECT : STRINGS.QUIZ_COLLECT}
-                </Text>
-                <Text className={styles.actionBtn} onClick={() => handleToggleWrongBook(currentQuestion.id)}>
-                  {wrongBook.has(currentQuestion.id) ? STRINGS.QUIZ_WRONG_BOOK_REMOVE : STRINGS.QUIZ_WRONG_BOOK_ADD}
-                </Text>
-              </View>
-            </View>
-            <Text className={styles.stem}>{currentQuestion.stem}</Text>
-
-            <View className={styles.options}>
-              {currentQuestion.options.map((opt, idx) => {
-                let optClass = styles.option
-                const isSelected = currentQuestion.type === 'single'
-                  ? selectedAnswer === idx
-                  : ((selectedAnswer as number[]) || []).includes(idx)
-
-                if (isSelected) optClass += ` ${styles.optionSelected}`
-
-                return (
-                  <View
-                    key={opt.label}
-                    className={optClass}
-                    onClick={() => currentQuestion.type === 'single'
-                      ? handleSelectSingle(currentQuestion.id, idx, opt.label)
-                      : handleSelectMultiple(currentQuestion.id, idx, currentQuestion)
-                    }
-                  >
-                    <View className={`${styles.optionLabel} ${isSelected ? styles.optionLabelActive : ''}`}>
-                      <Text>{opt.label}</Text>
-                    </View>
-                    <Text className={styles.optionText}>{opt.text}</Text>
-                  </View>
-                )
-              })}
-            </View>
-
-            {isCorrect !== null && (
-              <View className={`${styles.feedback} ${isCorrect ? styles.feedbackCorrect : styles.feedbackWrong}`}>
-                <Text className={styles.feedbackText}>
-                  {isCorrect ? STRINGS.QUIZ_FEEDBACK_CORRECT : STRINGS.QUIZ_FEEDBACK_WRONG}
-                </Text>
-                <Text className={styles.explanation}>{submitResults[currentQuestion.id]?.explanation || currentQuestion.explanation}</Text>
-              </View>
-            )}
-          </View>
-
-          <View className={styles.navRow}>
-            <Button variant='secondary' size='md' onClick={handlePrev} disabled={currentIndex === 0}>
-              {STRINGS.QUIZ_PREV}
-            </Button>
-            {currentIndex < questions.length - 1 ? (
-              <Button variant='primary' size='md' onClick={handleNext}>
-                {STRINGS.QUIZ_NEXT}
-              </Button>
-            ) : (
-              <Button variant='gradient' size='md' onClick={handleSubmit}>
-                {STRINGS.QUIZ_SUBMIT}
-              </Button>
-            )}
-          </View>
-        </ScrollView>
+        <PageHeader title='Quiz practice' shouldShowBack />
+        {content}
       </View>
     </AuthGuard>
   )
-}
\ No newline at end of file
+}

