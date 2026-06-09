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

export async function getWrongBook() {
  if (USE_MOCK) return wrongBook
  const res = await get<any>('/api/quiz/wrong-book')
  const data = res.data as any
  const items: any[] = data?.items || data || []
  return items.map(toQuizQuestion)
}

export async function getFavoriteQuestions() {
  if (USE_MOCK) return favoriteQuestions
  const res = await get<any>('/api/quiz/collections')
  const data = res.data as any
  const items: any[] = data?.items || data || []
  return items.map(toQuizQuestion)
}

export async function getCheckinRecords(): Promise<{ date: string; completed: boolean; consecutiveDays?: number }[]> {
  if (USE_MOCK) return checkinRecords
  const res = await get<any>('/api/quiz/checkin')
  const data = res.data
  if (!data) return []
  // 后端返回 QuizCheckinResponse: { checkin_date*, checked_in*, questions_completed*, consecutive_days* }
  return [{ date: data.checkin_date ?? '', completed: data.checked_in ?? false, consecutiveDays: data.consecutive_days ?? 0 }]
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
