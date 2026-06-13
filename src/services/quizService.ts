/**
 * @note 题库服务：答题、错题本、收藏、打卡相关 API
 * @note USE_MOCK 开关控制 mock/API 双模切换
 * @note 2026-06-09 对齐后端 OpenAPI schema：
 *   - getQuizCategories: 后端返回递归树 QuizCategoryTreeResponse[]，前端展平为 QuizCategory[]
 *   - getQuizQuestions: 后端 question_text/question_type/options(dict) → 前端 stem/type/options(array)
 *   - submitQuizAnswer: 返回 QuizSubmitResponse，不再 void
 *   - getCheckinRecords: 适配 QuizCheckinResponse 结构
 */

import { quizCategories, quizQuestions, wrongBook, favoriteQuestions, checkinRecords } from '@/constants/mock'
import { get, post, del } from '@/utils/request'
import type { QuizCategory, QuizQuestion, QuizOption } from '@/types/quiz'
import type { WrongQuestion, CheckinRecord, CheckinStatus } from '@/types/quiz'

const USE_MOCK = false

// ---- 内部转换工具 ----

/** 将后端 dict 风格的 options 转为前端 QuizOption[] */
function optionsToArray(raw: Record<string, string> | null | undefined): QuizOption[] {
  if (!raw) return []
  return Object.entries(raw).map(([label, text]) => ({ label, text }))
}

/** 将后端 QuizQuestionResponse 转为前端 QuizQuestion */
function toQuizQuestion(raw: any): QuizQuestion {
  return {
    id: String(raw.id),
    categoryId: String(raw.category_id ?? ''),
    stem: raw.question_text ?? '',
    options: optionsToArray(raw.options),
    correctAnswer: [],
    type: raw.question_type === 'multiple_choice' ? 'multiple' : 'single',
    explanation: raw.explanation ?? '',
  }
}

/** 递归展平后端分类树 */
function flattenCategoryTree(nodes: any[]): QuizCategory[] {
  const result: QuizCategory[] = []
  for (const node of nodes) {
    result.push({
      id: String(node.id),
      name: node.name ?? '',
      questionCount: node.question_count ?? 0,
      icon: '',
    })
    if (Array.isArray(node.children)) {
      result.push(...flattenCategoryTree(node.children))
    }
  }
  return result
}

// ---- 答题 ----

export async function getQuizCategories(): Promise<QuizCategory[]> {
  if (USE_MOCK) return quizCategories
  const res = await get<any[]>('/api/quiz/categories')
  // 后端返回递归树，展平为平铺列表
  return flattenCategoryTree(res.data || [])
}

export async function getQuizQuestions(categoryId?: string) {
  if (USE_MOCK) {
    if (categoryId) return quizQuestions.filter(q => q.categoryId === categoryId)
    return quizQuestions
  }
  const res = await get<any>('/api/quiz/questions', categoryId ? { category_id: categoryId } : undefined)
  const data = res.data as any
  const items: any[] = data?.items || data || []
  // 将后端 QuizQuestionResponse 转为前端 QuizQuestion（C 端不返回 correct_answer）
  return items.map(toQuizQuestion)
}

/** GET /api/quiz/wrong-book — 错题本列表（返回带 recordId 的 WrongQuestion） */
export async function getWrongBook(): Promise<WrongQuestion[]> {
  if (USE_MOCK) return wrongBook
  const res = await get<any>('/api/quiz/wrong-book')
  const data = res.data as any
  const items: any[] = data?.items || data || []
  return items.map(item => ({
    ...toQuizQuestion(item.question),
    recordId: item.id as number,
    wrongDate: (item.updated_at as string)?.slice(0, 10) ?? '',
    wrongCount: (item.wrong_count as number) ?? 1,
  }))
}

/** GET /api/quiz/collections — 收藏列表（返回带 recordId 的 QuizQuestion） */
export async function getFavoriteQuestions(): Promise<(QuizQuestion & { recordId: number })[]> {
  if (USE_MOCK) return favoriteQuestions.map(q => ({ ...q, recordId: 0 }))
  const res = await get<any>('/api/quiz/collections')
  const data = res.data as any
  const items: any[] = data?.items || data || []
  return items.map(item => ({
    ...toQuizQuestion(item.question),
    recordId: item.id as number,
  }))
}

/** GET /api/quiz/checkin/calendar?days=30 — 打卡日历历史记录 */
export async function getCheckinRecords(days = 30): Promise<CheckinRecord[]> {
  if (USE_MOCK) return checkinRecords
  const res = await get<any[]>('/api/quiz/checkin/calendar', { days })
  const data = res.data
  if (!data) return []
  // 后端返回 list[QuizCheckinResponse]: { checkin_date, checked_in, questions_completed, consecutive_days }
  return data.map((item: any) => ({
    id: item.id ?? null,
    checkinDate: item.checkin_date ?? '',
    checkedIn: item.checked_in ?? false,
    questionsCompleted: item.questions_completed ?? 0,
    consecutiveDays: item.consecutive_days ?? 0,
  }))
}

/** GET /api/quiz/checkin — 今日签到状态 */
export async function getCheckinStatus(): Promise<CheckinStatus | null> {
  const res = await get<any>('/api/quiz/checkin')
  const data = res.data
  if (!data) return null
  return {
    id: data.id ?? null,
    checkinDate: data.checkin_date ?? '',
    checkedIn: data.checked_in ?? false,
    questionsCompleted: data.questions_completed ?? 0,
    consecutiveDays: data.consecutive_days ?? 0,
  }
}

// ---- 题库提交 ----

/** POST /api/quiz/submit — 提交单题答案，返回判分结果 */
export async function submitQuizAnswer(data: {
  question_id: number
  user_answer: string
}): Promise<{
  question_id: number
  user_answer: string
  correct_answer: string
  is_correct: boolean
  is_wrong: boolean
  record_id: number
  explanation: string | null
}> {
  if (USE_MOCK) {
    return {
      question_id: data.question_id,
      user_answer: data.user_answer,
      correct_answer: 'A',
      is_correct: true,
      is_wrong: false,
      record_id: 0,
      explanation: null,
    }
  }
  const res = await post<any>('/api/quiz/submit', { question_id: data.question_id, user_answer: data.user_answer })
  return res.data
}

// ---- 题库收藏写操作 ----

/** POST /api/quiz/collections — 加入收藏（传 question_id） */
export async function addQuizFavorite(questionId: number): Promise<void> {
  if (USE_MOCK) return
  await post('/api/quiz/collections', { question_id: questionId })
}

/** DELETE /api/quiz/collections/{id} — 取消收藏（传 record ID） */
export async function removeQuizFavorite(id: number): Promise<void> {
  if (USE_MOCK) return
  await del(`/api/quiz/collections/${id}`)
}

// ---- 错题本写操作 ----

/** POST /api/quiz/wrong-book — 加入错题本 */
export async function addWrongBook(questionId: number): Promise<void> {
  if (USE_MOCK) return
  await post('/api/quiz/wrong-book', { question_id: questionId })
}

/** DELETE /api/quiz/wrong-book/{id} — 移出错题本 */
export async function removeWrongBook(id: number): Promise<void> {
  if (USE_MOCK) return
  await del(`/api/quiz/wrong-book/${id}`)
}