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

// ---- 后端响应 DTO ----

interface QuizQuestionResponse {
  id: number
  category_id?: number
  question_text?: string
  options?: Record<string, string>
  question_type?: string
  explanation?: string
}

interface QuizCategoryTreeNode {
  id: number
  name?: string
  question_count?: number
  children?: QuizCategoryTreeNode[]
}

interface QuizCheckinResponse {
  id?: number
  checkin_date?: string
  checked_in?: boolean
  questions_completed?: number
  consecutive_days?: number
}

interface QuizWrongBookItem {
  id: number
  question: QuizQuestionResponse
  updated_at?: string
  wrong_count?: number
}

interface QuizCollectionItem {
  id: number
  question: QuizQuestionResponse
}

// ---- 内部转换工具 ----

/** 将后端 dict 风格的 options 转为前端 QuizOption[] */
function optionsToArray(raw: Record<string, string> | null | undefined): QuizOption[] {
  if (!raw) return []
  return Object.entries(raw).map(([label, text]) => ({ label, text }))
}

/** 将后端 QuizQuestionResponse 转为前端 QuizQuestion */
function toQuizQuestion(raw: QuizQuestionResponse): QuizQuestion {
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
function flattenCategoryTree(nodes: QuizCategoryTreeNode[], parentId?: string): QuizCategory[] {
  const result: QuizCategory[] = []
  for (const node of nodes) {
    result.push({
      id: String(node.id),
      name: node.name ?? '',
      questionCount: node.question_count ?? 0,
      icon: '',
      parentId,
    })
    if (Array.isArray(node.children)) {
      result.push(...flattenCategoryTree(node.children, String(node.id)))
    }
  }
  return result
}

/** 递归转换后端分类树为前端树结构（保留层级） */
function convertCategoryTree(nodes: QuizCategoryTreeNode[], parentId?: string): QuizCategory[] {
  return nodes.map(node => ({
    id: String(node.id),
    name: node.name ?? '',
    questionCount: node.question_count ?? 0,
    icon: '',
    parentId,
    children: node.children?.length ? convertCategoryTree(node.children, String(node.id)) : undefined,
  }))
}

// ---- 答题 ----

export async function getQuizCategories(): Promise<QuizCategory[]> {
  if (USE_MOCK) return quizCategories
  const res = await get<QuizCategoryTreeNode[]>('/api/quiz/categories')
  // 后端返回递归树，展平为平铺列表
  return flattenCategoryTree(res.data || [])
}

/** 获取题库分类树（保留父子层级，用于多级选择器） */
export async function getQuizCategoryTree(): Promise<QuizCategory[]> {
  if (USE_MOCK) return quizCategories
  const res = await get<QuizCategoryTreeNode[]>('/api/quiz/categories')
  return convertCategoryTree(res.data || [])
}

export async function getQuizQuestions(categoryId?: string) {
  if (USE_MOCK) {
    if (categoryId) return quizQuestions.filter(q => q.categoryId === categoryId)
    return quizQuestions
  }
  const res = await get<{ items?: QuizQuestionResponse[] }>('/api/quiz/questions', categoryId ? { category_id: categoryId } : undefined)
  const data = res.data
  const items: QuizQuestionResponse[] = data?.items || (Array.isArray(data) ? data : [])
  // 将后端 QuizQuestionResponse 转为前端 QuizQuestion（C 端不返回 correct_answer）
  return items.map(toQuizQuestion)
}

/** GET /api/quiz/wrong-book — 错题本列表（返回带 recordId 的 WrongQuestion） */
export async function getWrongBook(): Promise<WrongQuestion[]> {
  if (USE_MOCK) return wrongBook
  const res = await get<{ items?: QuizWrongBookItem[] }>('/api/quiz/wrong-book')
  const data = res.data
  const items: QuizWrongBookItem[] = data?.items || (Array.isArray(data) ? data : [])
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
  const res = await get<{ items?: QuizCollectionItem[] }>('/api/quiz/collections')
  const data = res.data
  const items: QuizCollectionItem[] = data?.items || (Array.isArray(data) ? data : [])
  return items.map(item => ({
    ...toQuizQuestion(item.question),
    recordId: item.id as number,
  }))
}

/** GET /api/quiz/checkin/calendar?days=30 — 打卡日历历史记录 */
export async function getCheckinRecords(days = 30): Promise<CheckinRecord[]> {
  if (USE_MOCK) return checkinRecords
  const res = await get<QuizCheckinResponse[]>('/api/quiz/checkin/calendar', { days })
  const data = res.data
  if (!data) return []
  // 后端返回 list[QuizCheckinResponse]: { checkin_date, checked_in, questions_completed, consecutive_days }
  return data.map((item: QuizCheckinResponse) => ({
    id: item.id ?? null,
    checkinDate: item.checkin_date ?? '',
    checkedIn: item.checked_in ?? false,
    questionsCompleted: item.questions_completed ?? 0,
    consecutiveDays: item.consecutive_days ?? 0,
  }))
}

/** GET /api/quiz/checkin — 今日签到状态 */
export async function getCheckinStatus(): Promise<CheckinStatus | null> {
  const res = await get<QuizCheckinResponse>('/api/quiz/checkin')
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
  const res = await post<{ question_id: number; user_answer: string; correct_answer: string; is_correct: boolean; is_wrong: boolean; record_id: number; explanation: string | null }>('/api/quiz/submit', { question_id: data.question_id, user_answer: data.user_answer })
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

// ---- 练习统计 ----

/** GET /api/quiz/stats — 用户刷题全局统计 */
export async function getQuizStats(): Promise<import('@/types/quiz').QuizStats> {
  if (USE_MOCK) {
    return {
      totalAnswers: 0, correctAnswers: 0, accuracy: 0,
      totalQuestions: 0, answeredQuestions: 0, completionRate: 0,
      streakDays: 0, totalCheckinDays: 0, wrongCount: 0,
      collectedCount: 0, todayAnswers: 0, todayCorrect: 0,
    }
  }
  const res = await get<Record<string, unknown>>('/api/quiz/stats')
  const data = res.data ?? {}
  return {
    totalAnswers: (data.total_answers as number) ?? 0,
    correctAnswers: (data.correct_answers as number) ?? 0,
    accuracy: (data.accuracy as number) ?? 0,
    totalQuestions: (data.total_questions as number) ?? 0,
    answeredQuestions: (data.answered_questions as number) ?? 0,
    completionRate: (data.completion_rate as number) ?? 0,
    streakDays: (data.streak_days as number) ?? 0,
    totalCheckinDays: (data.total_checkin_days as number) ?? 0,
    wrongCount: (data.wrong_count as number) ?? 0,
    collectedCount: (data.collected_count as number) ?? 0,
    todayAnswers: (data.today_answers as number) ?? 0,
    todayCorrect: (data.today_correct as number) ?? 0,
  }
}

/** GET /api/quiz/progress?category_id= — 按分类维度的刷题进度 */
export async function getQuizProgress(categoryId: string): Promise<import('@/types/quiz').QuizStats> {
  if (USE_MOCK) {
    return {
      totalAnswers: 0, correctAnswers: 0, accuracy: 0,
      totalQuestions: 0, answeredQuestions: 0, completionRate: 0,
      streakDays: 0, totalCheckinDays: 0, wrongCount: 0,
      collectedCount: 0, todayAnswers: 0, todayCorrect: 0,
    }
  }
  const res = await get<Record<string, unknown>>('/api/quiz/progress', { category_id: categoryId })
  const data = res.data ?? {}
  if (process.env.NODE_ENV === 'development') {
    console.log('[getQuizProgress] categoryId:', categoryId, 'raw:', JSON.stringify(data))
  }

  /** 从多个候选字段名中取第一个有效数值，兼容不同后端命名 */
  const num = (...keys: string[]): number => {
    for (const k of keys) {
      const v = (data as Record<string, unknown>)[k]
      if (typeof v === 'number') return v
    }
    return 0
  }

  return {
    totalAnswers: num('total_answers', 'total'),
    correctAnswers: num('correct_answers', 'correct'),
    accuracy: num('accuracy'),
    totalQuestions: num('total_questions', 'total', 'question_count'),
    answeredQuestions: num('answered_questions', 'answered', 'completed'),
    completionRate: num('completion_rate', 'completion'),
    streakDays: num('streak_days', 'streak'),
    totalCheckinDays: num('total_checkin_days', 'checkin_days', 'total_checkin'),
    wrongCount: num('wrong_count', 'wrong'),
    collectedCount: num('collected_count', 'collected', 'favorite_count'),
    todayAnswers: num('today_answers', 'today'),
    todayCorrect: num('today_correct'),
  }
}