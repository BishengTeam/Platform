3593343 refactor: align quiz service with backend contract
 src/features/quiz/__tests__/quizService.test.ts |  75 ++++
 src/services/dataService.ts                     |   8 +-
 src/services/quizService.ts                     | 435 +++++++-----------------
 3 files changed, 195 insertions(+), 323 deletions(-)
diff --git a/src/features/quiz/__tests__/quizService.test.ts b/src/features/quiz/__tests__/quizService.test.ts
new file mode 100644
index 0000000..60e7356
--- /dev/null
+++ b/src/features/quiz/__tests__/quizService.test.ts
@@ -0,0 +1,75 @@
+import { beforeEach, describe, expect, it, vi } from 'vitest'
+
+vi.mock('@/utils/request', () => ({
+  get: vi.fn(),
+  post: vi.fn(),
+  put: vi.fn(),
+  del: vi.fn(),
+}))
+
+import { del, get, post, put } from '@/utils/request'
+import { quizApi } from '@/services/quizService'
+
+const requestMethods = { get, post, put, del }
+
+type RequestMethod = keyof typeof requestMethods
+
+interface OperationCase {
+  name: string
+  method: RequestMethod
+  path: string
+  args: readonly unknown[]
+  invoke: () => Promise<unknown>
+}
+
+const questionQuery = { category_id: 2, question_type: 'judge' as const, page: 3, page_size: 25 }
+const practiceBody = { mode: 'normal' as const, category_id: 2, question_count: 10 }
+const attemptBody = { session_question_id: 18, idempotency_key: 'attempt-0001', user_answer: ['A', 'C'] }
+const historyQuery = { category_id: 2, question_type: 'single_choice' as const, is_correct: false, date_from: '2026-08-01', date_to: '2026-08-12', page: 2, page_size: 10 }
+const pageQuery = { page: 2, page_size: 10 }
+const calendarQuery = { date_from: '2026-08-01', date_to: '2026-08-12' }
+const examBody = { category_id: 2, question_count: 10 }
+const answerBody = { user_answer: 'B', lock_version: 4 }
+
+const operations: OperationCase[] = [
+  { name: 'lists categories', method: 'get', path: '/api/quiz/categories', args: [], invoke: () => quizApi.listCategories() },
+  { name: 'lists questions with the supplied snake_case query', method: 'get', path: '/api/quiz/questions', args: [questionQuery], invoke: () => quizApi.listQuestions(questionQuery) },
+  { name: 'creates a practice session', method: 'post', path: '/api/quiz/practice-sessions', args: [practiceBody], invoke: () => quizApi.createPracticeSession(practiceBody) },
+  { name: 'gets the current practice session', method: 'get', path: '/api/quiz/practice-sessions/current', args: [], invoke: () => quizApi.getCurrentPracticeSession() },
+  { name: 'gets a practice session by numeric id', method: 'get', path: '/api/quiz/practice-sessions/7', args: [], invoke: () => quizApi.getPracticeSession(7) },
+  { name: 'submits the exact practice attempt body', method: 'post', path: '/api/quiz/practice-sessions/7/attempts', args: [attemptBody], invoke: () => quizApi.submitPracticeAttempt(7, attemptBody) },
+  { name: 'abandons a practice session', method: 'post', path: '/api/quiz/practice-sessions/7/abandon', args: [], invoke: () => quizApi.abandonPracticeSession(7) },
+  { name: 'lists practice history with the supplied query', method: 'get', path: '/api/quiz/practice-history', args: [historyQuery], invoke: () => quizApi.listPracticeHistory(historyQuery) },
+  { name: 'lists wrong-book entries with the supplied query', method: 'get', path: '/api/quiz/wrong-book', args: [pageQuery], invoke: () => quizApi.listWrongBook(pageQuery) },
+  { name: 'lists collections with the supplied query', method: 'get', path: '/api/quiz/collections', args: [pageQuery], invoke: () => quizApi.listCollections(pageQuery) },
+  { name: 'adds a collection using question_id', method: 'post', path: '/api/quiz/collections', args: [{ question_id: 15 }], invoke: () => quizApi.addCollection({ question_id: 15 }) },
+  { name: 'removes a collection by question_id', method: 'del', path: '/api/quiz/collections/15', args: [], invoke: () => quizApi.removeCollection(15) },
+  { name: 'gets check-in status', method: 'get', path: '/api/quiz/checkin', args: [], invoke: () => quizApi.getCheckinStatus() },
+  { name: 'gets the check-in calendar with date_from and date_to', method: 'get', path: '/api/quiz/checkin/calendar', args: [calendarQuery], invoke: () => quizApi.getCheckinCalendar(calendarQuery) },
+  { name: 'gets authoritative stats', method: 'get', path: '/api/quiz/stats', args: [], invoke: () => quizApi.getStats() },
+  { name: 'creates an exam', method: 'post', path: '/api/quiz/exams', args: [examBody], invoke: () => quizApi.createExam(examBody) },
+  { name: 'gets the current exam', method: 'get', path: '/api/quiz/exams/current', args: [], invoke: () => quizApi.getCurrentExam() },
+  { name: 'lists exams with the supplied query', method: 'get', path: '/api/quiz/exams', args: [pageQuery], invoke: () => quizApi.listExams(pageQuery) },
+  { name: 'gets an exam by numeric id', method: 'get', path: '/api/quiz/exams/8', args: [], invoke: () => quizApi.getExam(8) },
+  { name: 'saves an exam answer with lock_version using PUT', method: 'put', path: '/api/quiz/exams/8/answers/19', args: [answerBody], invoke: () => quizApi.saveExamAnswer(8, 19, answerBody) },
+  { name: 'submits an exam', method: 'post', path: '/api/quiz/exams/8/submit', args: [], invoke: () => quizApi.submitExam(8) },
+  { name: 'abandons an exam', method: 'post', path: '/api/quiz/exams/8/abandon', args: [], invoke: () => quizApi.abandonExam(8) },
+]
+
+describe('quizApi', () => {
+  beforeEach(() => {
+    vi.clearAllMocks()
+  })
+
+  it.each(operations)('$name', async ({ method, path, args, invoke }) => {
+    const data = { operation: path }
+    vi.mocked(requestMethods[method]).mockResolvedValue({ code: 0, data, message: 'ok' })
+
+    await expect(invoke()).resolves.toBe(data)
+    expect(requestMethods[method]).toHaveBeenCalledOnce()
+    expect(requestMethods[method]).toHaveBeenCalledWith(path, ...args)
+    for (const [otherMethod, request] of Object.entries(requestMethods)) {
+      if (otherMethod !== method) expect(request).not.toHaveBeenCalled()
+    }
+  })
+})
diff --git a/src/services/dataService.ts b/src/services/dataService.ts
index 17aec3d..24b4e77 100644
--- a/src/services/dataService.ts
+++ b/src/services/dataService.ts
@@ -5,27 +5,21 @@
  *   authService   — 登录/认证/身份
  *   zoneService   — 专区聚合 + 活动/竞赛/就业
  *   courseService — 课程
  *   quizService   — 题库
  *   userService   — 用户/订单/报名/杂项
  *
  * 现有调用方无需修改 — 所有函数通过此文件重导出。
  */
 
 // Quiz
-export {
-  getQuizCategories, getQuizQuestions, getWrongBook,
-  getFavoriteQuestions, getCheckinRecords,
-  getCheckinStatus, addWrongBook, removeWrongBook, submitQuizAnswer,
-  addQuizFavorite, removeQuizFavorite,
-  getQuizStats, getQuizProgress, getQuizCategoryTree,
-} from './quizService'
+export { quizApi } from './quizService'
 
 // Auth
 export {
   wxLogin, refreshToken, logout,
   submitIdentity, getIdentityStatus,
   unbindAccount, deleteAccount, decryptPhone,
 } from './authService'
 
 // Zone
 export {
diff --git a/src/services/quizService.ts b/src/services/quizService.ts
index b26da71..89b3cea 100644
--- a/src/services/quizService.ts
+++ b/src/services/quizService.ts
@@ -1,317 +1,120 @@
-/**
- * @note 题库服务：答题、错题本、收藏、打卡相关 API
- * @note USE_MOCK 开关控制 mock/API 双模切换
- * @note 2026-06-09 对齐后端 OpenAPI schema：
- *   - getQuizCategories: 后端返回递归树 QuizCategoryTreeResponse[]，前端展平为 QuizCategory[]
- *   - getQuizQuestions: 后端 question_text/question_type/options(dict) → 前端 stem/type/options(array)
- *   - submitQuizAnswer: 返回 QuizSubmitResponse，不再 void
- *   - getCheckinRecords: 适配 QuizCheckinResponse 结构
- */
-
-import { quizCategories, quizQuestions, wrongBook, favoriteQuestions, checkinRecords } from '@/constants/mock'
-import { get, post, del } from '@/utils/request'
-import type { QuizCategory, QuizQuestion, QuizOption } from '@/types/quiz'
-import type { WrongQuestion, CheckinRecord, CheckinStatus } from '@/types/quiz'
-
-const USE_MOCK = false
-
-// ---- 后端响应 DTO ----
-
-interface QuizQuestionResponse {
-  id: number
-  category_id?: number
-  question_text?: string
-  options?: Record<string, string>
-  question_type?: string
-  explanation?: string
-}
-
-interface QuizCategoryTreeNode {
-  id: number
-  name?: string
-  question_count?: number
-  children?: QuizCategoryTreeNode[]
-}
-
-interface QuizCheckinResponse {
-  id?: number
-  checkin_date?: string
-  checked_in?: boolean
-  questions_completed?: number
-  consecutive_days?: number
-}
-
-interface QuizWrongBookItem {
-  id: number
-  question: QuizQuestionResponse
-  updated_at?: string
-  wrong_count?: number
-}
-
-interface QuizCollectionItem {
-  id: number
-  question: QuizQuestionResponse
-}
-
-// ---- 内部转换工具 ----
-
-/** 将后端 dict 风格的 options 转为前端 QuizOption[] */
-function optionsToArray(raw: Record<string, string> | null | undefined): QuizOption[] {
-  if (!raw) return []
-  return Object.entries(raw).map(([label, text]) => ({ label, text }))
-}
-
-/** 将后端 QuizQuestionResponse 转为前端 QuizQuestion */
-function toQuizQuestion(raw: QuizQuestionResponse): QuizQuestion {
-  return {
-    id: String(raw.id),
-    categoryId: String(raw.category_id ?? ''),
-    stem: raw.question_text ?? '',
-    options: optionsToArray(raw.options),
-    correctAnswer: [],
-    type: raw.question_type === 'multiple_choice' ? 'multiple' : 'single',
-    explanation: raw.explanation ?? '',
-  }
-}
-
-/** 递归展平后端分类树 */
-function flattenCategoryTree(nodes: QuizCategoryTreeNode[], parentId?: string): QuizCategory[] {
-  const result: QuizCategory[] = []
-  for (const node of nodes) {
-    result.push({
-      id: String(node.id),
-      name: node.name ?? '',
-      questionCount: node.question_count ?? 0,
-      icon: '',
-      parentId,
-    })
-    if (Array.isArray(node.children)) {
-      result.push(...flattenCategoryTree(node.children, String(node.id)))
-    }
-  }
-  return result
-}
-
-/** 递归转换后端分类树为前端树结构（保留层级） */
-function convertCategoryTree(nodes: QuizCategoryTreeNode[], parentId?: string): QuizCategory[] {
-  return nodes.map(node => ({
-    id: String(node.id),
-    name: node.name ?? '',
-    questionCount: node.question_count ?? 0,
-    icon: '',
-    parentId,
-    children: node.children?.length ? convertCategoryTree(node.children, String(node.id)) : undefined,
-  }))
-}
-
-// ---- 答题 ----
-
-export async function getQuizCategories(): Promise<QuizCategory[]> {
-  if (USE_MOCK) return quizCategories
-  const res = await get<QuizCategoryTreeNode[]>('/api/quiz/categories')
-  // 后端返回递归树，展平为平铺列表
-  return flattenCategoryTree(res.data || [])
-}
-
-/** 获取题库分类树（保留父子层级，用于多级选择器） */
-export async function getQuizCategoryTree(): Promise<QuizCategory[]> {
-  if (USE_MOCK) return quizCategories
-  const res = await get<QuizCategoryTreeNode[]>('/api/quiz/categories')
-  return convertCategoryTree(res.data || [])
-}
-
-export async function getQuizQuestions(categoryId?: string, page = 1, pageSize = 100) {
-  if (USE_MOCK) {
-    if (categoryId) return quizQuestions.filter(q => q.categoryId === categoryId)
-    return quizQuestions
-  }
-  const params: Record<string, unknown> = { page, page_size: pageSize }
-  if (categoryId) {
-    const categoryIdNum = Number(categoryId)
-    if (!Number.isNaN(categoryIdNum)) {
-      params.category_id = categoryIdNum
-    }
-  }
-  const res = await get<{ items?: QuizQuestionResponse[] }>('/api/quiz/questions', params)
-  const data = res.data
-  const items: QuizQuestionResponse[] = data?.items || (Array.isArray(data) ? data : [])
-  // 将后端 QuizQuestionResponse 转为前端 QuizQuestion（C 端不返回 correct_answer）
-  return items.map(toQuizQuestion)
-}
-
-/** GET /api/quiz/wrong-book — 错题本列表（返回带 recordId 的 WrongQuestion） */
-export async function getWrongBook(): Promise<WrongQuestion[]> {
-  if (USE_MOCK) return wrongBook
-  const res = await get<{ items?: QuizWrongBookItem[] }>('/api/quiz/wrong-book')
-  const data = res.data
-  const items: QuizWrongBookItem[] = data?.items || (Array.isArray(data) ? data : [])
-  return items.map(item => ({
-    ...toQuizQuestion(item.question),
-    recordId: item.id as number,
-    wrongDate: (item.updated_at as string)?.slice(0, 10) ?? '',
-    // 后端 QuizRecordQuestionResponse 暂无 wrong_count 字段，默认 1
-    wrongCount: 1,
-  }))
-}
-
-/** GET /api/quiz/collections — 收藏列表（返回带 recordId 的 QuizQuestion） */
-export async function getFavoriteQuestions(): Promise<(QuizQuestion & { recordId: number })[]> {
-  if (USE_MOCK) return favoriteQuestions.map(q => ({ ...q, recordId: 0 }))
-  const res = await get<{ items?: QuizCollectionItem[] }>('/api/quiz/collections')
-  const data = res.data
-  const items: QuizCollectionItem[] = data?.items || (Array.isArray(data) ? data : [])
-  return items.map(item => ({
-    ...toQuizQuestion(item.question),
-    recordId: item.id as number,
-  }))
-}
-
-/** GET /api/quiz/checkin/calendar?days=30 — 打卡日历历史记录 */
-export async function getCheckinRecords(days = 30): Promise<CheckinRecord[]> {
-  if (USE_MOCK) return checkinRecords
-  const res = await get<QuizCheckinResponse[]>('/api/quiz/checkin/calendar', { days })
-  const data = res.data
-  if (!data) return []
-  // 后端返回 list[QuizCheckinResponse]: { checkin_date, checked_in, questions_completed, consecutive_days }
-  return data.map((item: QuizCheckinResponse) => ({
-    id: item.id ?? null,
-    checkinDate: item.checkin_date ?? '',
-    checkedIn: item.checked_in ?? false,
-    questionsCompleted: item.questions_completed ?? 0,
-    consecutiveDays: item.consecutive_days ?? 0,
-  }))
+import { del, get, post, put } from '@/utils/request'
+import type {
+  QuizCategoryNode,
+  QuizCheckinCalendarQuery,
+  QuizCheckinDay,
+  QuizCheckinStatusResponse,
+  QuizCollectionCreate,
+  QuizCollectionItem,
+  QuizCollectionMutationResponse,
+  QuizExamActionResponse,
+  QuizExamAnswerSave,
+  QuizExamAnswerSaved,
+  QuizExamCreate,
+  QuizExamDetail,
+  QuizExamListItem,
+  QuizExamListQuery,
+  QuizPage,
+  QuizPracticeAbandonResponse,
+  QuizPracticeAttemptCreate,
+  QuizPracticeAttemptResult,
+  QuizPracticeHistoryItem,
+  QuizPracticeHistoryQuery,
+  QuizPracticeSessionCreate,
+  QuizPracticeSessionResponse,
+  QuizPublicQuestion,
+  QuizQuestionListQuery,
+  QuizStatsResponse,
+  QuizWrongBookItem,
+  QuizWrongBookQuery,
+} from '@/types/quiz'
+
+export const quizApi = {
+  async listCategories(): Promise<QuizCategoryNode[]> {
+    return (await get<QuizCategoryNode[]>('/api/quiz/categories')).data
+  },
+
+  async listQuestions(query: QuizQuestionListQuery): Promise<QuizPage<QuizPublicQuestion>> {
+    return (await get<QuizPage<QuizPublicQuestion>>('/api/quiz/questions', { ...query })).data
+  },
+
+  async createPracticeSession(body: QuizPracticeSessionCreate): Promise<QuizPracticeSessionResponse> {
+    return (await post<QuizPracticeSessionResponse>('/api/quiz/practice-sessions', { ...body })).data
+  },
+
+  async getCurrentPracticeSession(): Promise<QuizPracticeSessionResponse | null> {
+    return (await get<QuizPracticeSessionResponse | null>('/api/quiz/practice-sessions/current')).data
+  },
+
+  async getPracticeSession(sessionId: number): Promise<QuizPracticeSessionResponse> {
+    return (await get<QuizPracticeSessionResponse>(`/api/quiz/practice-sessions/${sessionId}`)).data
+  },
+
+  async submitPracticeAttempt(sessionId: number, body: QuizPracticeAttemptCreate): Promise<QuizPracticeAttemptResult> {
+    return (await post<QuizPracticeAttemptResult>(`/api/quiz/practice-sessions/${sessionId}/attempts`, { ...body })).data
+  },
+
+  async abandonPracticeSession(sessionId: number): Promise<QuizPracticeAbandonResponse> {
+    return (await post<QuizPracticeAbandonResponse>(`/api/quiz/practice-sessions/${sessionId}/abandon`)).data
+  },
+
+  async listPracticeHistory(query: QuizPracticeHistoryQuery): Promise<QuizPage<QuizPracticeHistoryItem>> {
+    return (await get<QuizPage<QuizPracticeHistoryItem>>('/api/quiz/practice-history', { ...query })).data
+  },
+
+  async listWrongBook(query: QuizWrongBookQuery): Promise<QuizPage<QuizWrongBookItem>> {
+    return (await get<QuizPage<QuizWrongBookItem>>('/api/quiz/wrong-book', { ...query })).data
+  },
+
+  async listCollections(query: QuizWrongBookQuery): Promise<QuizPage<QuizCollectionItem>> {
+    return (await get<QuizPage<QuizCollectionItem>>('/api/quiz/collections', { ...query })).data
+  },
+
+  async addCollection(body: QuizCollectionCreate): Promise<QuizCollectionMutationResponse> {
+    return (await post<QuizCollectionMutationResponse>('/api/quiz/collections', { ...body })).data
+  },
+
+  async removeCollection(questionId: number): Promise<QuizCollectionMutationResponse> {
+    return (await del<QuizCollectionMutationResponse>(`/api/quiz/collections/${questionId}`)).data
+  },
+
+  async getCheckinStatus(): Promise<QuizCheckinStatusResponse> {
+    return (await get<QuizCheckinStatusResponse>('/api/quiz/checkin')).data
+  },
+
+  async getCheckinCalendar(query: QuizCheckinCalendarQuery): Promise<QuizCheckinDay[]> {
+    return (await get<QuizCheckinDay[]>('/api/quiz/checkin/calendar', { ...query })).data
+  },
+
+  async getStats(): Promise<QuizStatsResponse> {
+    return (await get<QuizStatsResponse>('/api/quiz/stats')).data
+  },
+
+  async createExam(body: QuizExamCreate): Promise<QuizExamDetail> {
+    return (await post<QuizExamDetail>('/api/quiz/exams', { ...body })).data
+  },
+
+  async getCurrentExam(): Promise<QuizExamDetail | null> {
+    return (await get<QuizExamDetail | null>('/api/quiz/exams/current')).data
+  },
+
+  async listExams(query: QuizExamListQuery): Promise<QuizPage<QuizExamListItem>> {
+    return (await get<QuizPage<QuizExamListItem>>('/api/quiz/exams', { ...query })).data
+  },
+
+  async getExam(examId: number): Promise<QuizExamDetail> {
+    return (await get<QuizExamDetail>(`/api/quiz/exams/${examId}`)).data
+  },
+
+  async saveExamAnswer(examId: number, examQuestionId: number, body: QuizExamAnswerSave): Promise<QuizExamAnswerSaved> {
+    return (await put<QuizExamAnswerSaved>(`/api/quiz/exams/${examId}/answers/${examQuestionId}`, { ...body })).data
+  },
+
+  async submitExam(examId: number): Promise<QuizExamActionResponse> {
+    return (await post<QuizExamActionResponse>(`/api/quiz/exams/${examId}/submit`)).data
+  },
+
+  async abandonExam(examId: number): Promise<QuizExamActionResponse> {
+    return (await post<QuizExamActionResponse>(`/api/quiz/exams/${examId}/abandon`)).data
+  },
 }
-
-/** GET /api/quiz/checkin — 今日签到状态 */
-export async function getCheckinStatus(): Promise<CheckinStatus | null> {
-  const res = await get<QuizCheckinResponse>('/api/quiz/checkin')
-  const data = res.data
-  if (!data) return null
-  return {
-    id: data.id ?? null,
-    checkinDate: data.checkin_date ?? '',
-    checkedIn: data.checked_in ?? false,
-    questionsCompleted: data.questions_completed ?? 0,
-    consecutiveDays: data.consecutive_days ?? 0,
-  }
-}
-
-// ---- 题库提交 ----
-
-/** POST /api/quiz/submit — 提交单题答案，返回判分结果 */
-export async function submitQuizAnswer(data: {
-  question_id: number
-  user_answer: string
-}): Promise<{
-  question_id: number
-  user_answer: string
-  correct_answer: string
-  is_correct: boolean
-  is_wrong: boolean
-  record_id: number
-  explanation: string | null
-}> {
-  if (USE_MOCK) {
-    return {
-      question_id: data.question_id,
-      user_answer: data.user_answer,
-      correct_answer: 'A',
-      is_correct: true,
-      is_wrong: false,
-      record_id: 0,
-      explanation: null,
-    }
-  }
-  const res = await post<{ question_id: number; user_answer: string; correct_answer: string; is_correct: boolean; is_wrong: boolean; record_id: number; explanation: string | null }>('/api/quiz/submit', { question_id: data.question_id, user_answer: data.user_answer })
-  return res.data
-}
-
-// ---- 题库收藏写操作 ----
-
-/** POST /api/quiz/collections — 加入收藏（传 question_id） */
-export async function addQuizFavorite(questionId: number): Promise<void> {
-  if (USE_MOCK) return
-  await post('/api/quiz/collections', { question_id: questionId })
-}
-
-/** DELETE /api/quiz/collections/{id} — 取消收藏（传 record ID） */
-export async function removeQuizFavorite(id: number): Promise<void> {
-  if (USE_MOCK) return
-  await del(`/api/quiz/collections/${id}`)
-}
-
-// ---- 错题本写操作 ----
-
-/** POST /api/quiz/wrong-book — 加入错题本 */
-export async function addWrongBook(questionId: number): Promise<void> {
-  if (USE_MOCK) return
-  await post('/api/quiz/wrong-book', { question_id: questionId })
-}
-
-/** DELETE /api/quiz/wrong-book/{id} — 移出错题本 */
-export async function removeWrongBook(id: number): Promise<void> {
-  if (USE_MOCK) return
-  await del(`/api/quiz/wrong-book/${id}`)
-}
-
-// ---- 练习统计 ----
-
-/** GET /api/quiz/stats — 用户刷题全局统计 */
-export async function getQuizStats(): Promise<import('@/types/quiz').QuizStats> {
-  if (USE_MOCK) {
-    return {
-      totalAnswers: 0, correctAnswers: 0, accuracy: 0,
-      totalQuestions: 0, answeredQuestions: 0, completionRate: 0,
-      streakDays: 0, totalCheckinDays: 0, wrongCount: 0,
-      collectedCount: 0, todayAnswers: 0, todayCorrect: 0,
-    }
-  }
-  const res = await get<Record<string, unknown>>('/api/quiz/stats')
-  const data = res.data ?? {}
-  return {
-    totalAnswers: (data.total_answers as number) ?? 0,
-    correctAnswers: (data.correct_answers as number) ?? 0,
-    accuracy: (data.accuracy as number) ?? 0,
-    totalQuestions: (data.total_questions as number) ?? 0,
-    answeredQuestions: (data.answered_questions as number) ?? 0,
-    completionRate: (data.completion_rate as number) ?? 0,
-    streakDays: (data.streak_days as number) ?? 0,
-    totalCheckinDays: (data.total_checkin_days as number) ?? 0,
-    wrongCount: (data.wrong_count as number) ?? 0,
-    collectedCount: (data.collected_count as number) ?? 0,
-    todayAnswers: (data.today_answers as number) ?? 0,
-    todayCorrect: (data.today_correct as number) ?? 0,
-  }
-}
-
-/** GET /api/quiz/progress?category_id= — 按分类维度的刷题进度 */
-export async function getQuizProgress(categoryId: string): Promise<import('@/types/quiz').QuizStats> {
-  if (USE_MOCK) {
-    return {
-      totalAnswers: 0, correctAnswers: 0, accuracy: 0,
-      totalQuestions: 0, answeredQuestions: 0, completionRate: 0,
-      streakDays: 0, totalCheckinDays: 0, wrongCount: 0,
-      collectedCount: 0, todayAnswers: 0, todayCorrect: 0,
-    }
-  }
-  const res = await get<Record<string, unknown>>('/api/quiz/progress', { category_id: categoryId })
-  const data = res.data ?? {}
-  if (process.env.NODE_ENV === 'development') {
-    console.log('[getQuizProgress] categoryId:', categoryId, 'raw:', JSON.stringify(data))
-  }
-
-  return {
-    totalAnswers: (data.answered as number) ?? 0,
-    correctAnswers: (data.correct as number) ?? 0,
-    accuracy: (data.accuracy as number) ?? 0,
-    totalQuestions: (data.total as number) ?? 0,
-    answeredQuestions: (data.answered as number) ?? 0,
-    completionRate: data.total ? Number((((data.answered as number) ?? 0) / (data.total as number)).toFixed(2)) : 0,
-    streakDays: 0,
-    totalCheckinDays: 0,
-    wrongCount: 0,
-    collectedCount: 0,
-    todayAnswers: 0,
-    todayCorrect: 0,
-  }
-}
\ No newline at end of file

