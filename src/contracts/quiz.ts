/**
 * Frozen Platform view of the Backend quiz contract (2026-08-14).
 *
 * `unknown` is deliberately accepted only by the parsers in this file. Quiz
 * pages and services receive fully validated, non-optional DTOs.
 */

export type QuizAnswer = string | string[]
export type QuizQuestionType = 'single_choice' | 'multiple_choice' | 'judge'
export type QuizQuestionStatus = 'draft' | 'published' | 'disabled' | 'deleted'
export type QuizPracticeMode = 'normal' | 'wrong' | 'full' | 'wrong_only' | 'legacy_limited'
export type QuizPracticeStatus = 'in_progress' | 'paused' | 'completed' | 'abandoned' | 'expired' | 'terminated'
export type QuizPracticeScopeType = 'library' | 'module' | 'knowledge_point'
export type QuizPracticePauseReason = 'quiz_library_suspended' | 'quiz_entitlement_inactive'
export type QuizExamStatus = 'in_progress' | 'completed' | 'timed_out' | 'abandoned'

export interface QuizCategoryNode {
  id: number
  name: string
  parent_id: number | null
  depth: 1 | 2 | 3
  description: string | null
  sort_order: number
  question_count: number
  children: QuizCategoryNode[]
}

export type QuizLibraryAccessMode = 'free' | 'course_entitlement'

export interface QuizKnowledgePointCatalogItem {
  id: number
  module_id: number
  name: string
  description: string | null
  sort_order: number
  question_count: number
}

export interface QuizModuleCatalogItem {
  id: number
  library_id: number
  name: string
  description: string | null
  sort_order: number
  question_count: number
  knowledge_points: QuizKnowledgePointCatalogItem[]
}

export interface QuizLibraryCatalogItem {
  id: number
  library_code: string
  name: string
  description: string
  cover_url: string
  access_mode: QuizLibraryAccessMode
  question_count: number
  module_count: number
}

export interface QuizLibraryCatalogDetail extends QuizLibraryCatalogItem {
  details: string | null
  modules: QuizModuleCatalogItem[]
}

export interface QuizKnowledgePointProgress {
  knowledge_point_id: number
  question_count: number
  answered_questions: number
  accuracy: number
}

export interface QuizModuleProgress {
  module_id: number
  question_count: number
  answered_questions: number
  accuracy: number
  knowledge_points: QuizKnowledgePointProgress[]
}

export interface QuizLibraryProgress {
  library_id: number
  question_count: number
  answered_questions: number
  accuracy: number
  modules: QuizModuleProgress[]
}

export interface QuizPracticeScopePreview {
  library_id: number
  scope_type: QuizPracticeScopeType
  scope_id: number
  mode: 'full' | 'wrong_only'
  question_count: number
  estimated_minutes: number
  valid_days: 7
  requires_large_scope_confirmation: boolean
  unfinished_session_id: number | null
  unfinished_session_expires_at: string | null
}

export interface QuizPublicQuestion {
  id: number
  category_id: number | null
  library_id?: number | null
  knowledge_point_id?: number | null
  question_revision_id?: number | null
  question_type: QuizQuestionType
  question_text: string
  options: Record<string, string>
  image_urls: string[]
  option_image_urls: Record<string, string>
}

export interface QuizCategoryPathItem {
  id: number
  name: string
  kind?: 'library' | 'module' | 'knowledge_point' | 'category' | null
}

export interface QuizPracticeAttemptResult {
  attempt_id: number
  attempt_no: number
  user_answer: QuizAnswer
  is_correct: boolean
  correct_answer: QuizAnswer
  explanation: string
  submitted_at: string
}

export interface QuizPracticeQuestionState extends QuizPublicQuestion {
  session_question_id: number
  position: number
  category_path: QuizCategoryPathItem[]
  answered: boolean
  user_answer: QuizAnswer | null
  answer_lock_version: number
  correct_answer: QuizAnswer | null
  explanation: string | null
  is_correct: boolean | null
  attempt_count: number
  latest_result: QuizPracticeAttemptResult | null
}

export interface QuizPracticeAnswerSaved {
  session_id: number
  session_question_id: number
  user_answer: QuizAnswer
  lock_version: number
  saved_at: string
}

export interface QuizPracticeSession {
  id: number
  mode: QuizPracticeMode
  category_id: number | null
  library_id: number | null
  scope_type: QuizPracticeScopeType | null
  scope_id: number | null
  requested_count: number
  actual_count: number
  status: QuizPracticeStatus
  started_at: string
  completed_at: string | null
  abandoned_at: string | null
  expires_at: string | null
  paused_at: string | null
  pause_reason: QuizPracticePauseReason | null
  answered_count: number
  remaining_count: number
  current_position: number | null
  created_new: boolean
  resume_available: boolean
  lock_version: number
  questions: QuizPracticeQuestionState[]
}

export interface QuizPracticeSkipResult {
  session_id: number
  session_question_id: number
  skip_count: 1
  next_question: QuizPracticeQuestionState | null
}

export interface QuizPracticeAbandonResult {
  session_id: number
  status: 'abandoned'
  abandoned_at: string
}

export interface QuizPracticeHistoryItem {
  attempt_id: number
  session_id: number
  session_question_id: number
  question_id: number
  category_path: QuizCategoryPathItem[]
  question_type: QuizQuestionType
  question_text: string
  options: Record<string, string>
  user_answer: QuizAnswer
  correct_answer: QuizAnswer
  explanation: string
  is_correct: boolean
  attempt_no: number
  submitted_at: string
  current_question_status: QuizQuestionStatus | null
}

export interface QuizWrongBookItem {
  id: number
  question_id: number
  status: 'active' | 'cleared'
  question: QuizPublicQuestion
  question_status: QuizQuestionStatus
  usable_for_practice: boolean
  first_wrong_at: string
  latest_wrong_at: string
  wrong_count: number
}

export interface QuizCollectionItem {
  id: number
  question_id: number
  question: QuizPublicQuestion
  question_status: QuizQuestionStatus
  is_active: boolean
  collected_at: string
}

export interface QuizCollectionMutation {
  question_id: number
  is_active: boolean
  updated_at: string
}

export interface QuizCheckinStatus {
  checkin_date: string
  checked_in: boolean
  questions_completed: number
  consecutive_days: number
}

export interface QuizCheckinDay {
  checkin_date: string
  questions_completed: number
  consecutive_days: number
}

export interface QuizPracticeStats {
  total_attempts: number
  first_attempts: number
  first_correct_attempts: number
  accuracy: number
  answered_questions: number
  active_wrong_count: number
  active_collection_count: number
  checkin_days: number
  consecutive_days: number
  today_questions: number
}

export interface QuizExamStats {
  completed_exam_count: number
  timed_out_exam_count: number
  total_questions: number
  correct_count: number
  wrong_count: number
  unanswered_count: number
  average_score: number | null
  highest_score: number | null
  latest_score: number | null
}

export interface QuizStats {
  practice: QuizPracticeStats
  exam: QuizExamStats
}

interface QuizExamBase {
  id: number
  category_id: number | null
  library_id: number | null
  scope_type: QuizPracticeScopeType | null
  scope_id: number | null
  question_count: number
  duration_seconds: 3600
  started_at: string
  deadline_at: string
}

export interface QuizExamQuestionState extends QuizPublicQuestion {
  exam_question_id: number
  position: number
  category_path: QuizCategoryPathItem[]
  user_answer: QuizAnswer | null
  answer_lock_version: number | null
}

export interface QuizExamInProgress extends QuizExamBase {
  status: 'in_progress'
  server_time: string
  questions: QuizExamQuestionState[]
}

export interface QuizExamAbandonedQuestion extends QuizPublicQuestion {
  exam_question_id: number
  position: number
  answered: boolean
}

export interface QuizExamAbandoned extends QuizExamBase {
  status: 'abandoned'
  abandoned_at: string
  questions: QuizExamAbandonedQuestion[]
}

export interface QuizExamQuestionResult extends QuizPublicQuestion {
  exam_question_id: number
  position: number
  user_answer: QuizAnswer | null
  correct_answer: QuizAnswer
  explanation: string
  is_correct: boolean
}

export interface QuizExamSettled extends QuizExamBase {
  status: 'completed' | 'timed_out'
  finished_at: string
  correct_count: number
  wrong_count: number
  unanswered_count: number
  score: number
  questions: QuizExamQuestionResult[]
}

export type QuizExamDetail = QuizExamInProgress | QuizExamAbandoned | QuizExamSettled

export interface QuizExamListItem {
  id: number
  category_id: number | null
  library_id: number | null
  scope_type: QuizPracticeScopeType | null
  scope_id: number | null
  question_count: number
  duration_seconds: 3600
  status: QuizExamStatus
  started_at: string
  deadline_at: string
  finished_at: string | null
  score: number | null
}

export interface QuizExamAnswerSaved {
  exam_id: number
  exam_question_id: number
  user_answer: QuizAnswer
  lock_version: number
  saved_at: string
}

export interface QuizExamAction {
  exam_id: number
  status: QuizExamStatus
  finished_at: string
  score: number | null
}

export interface PageData<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

export class QuizContractError extends Error {
  constructor(path: string, expected: string) {
    super(`题库接口契约不匹配：${path} 应为 ${expected}`)
    this.name = 'QuizContractError'
  }
}

type JsonObject = Record<string, unknown>

function objectAt(value: unknown, path: string): JsonObject {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new QuizContractError(path, 'object')
  }
  return value as JsonObject
}

function exactObject(value: unknown, path: string, keys: readonly string[]): JsonObject {
  const object = objectAt(value, path)
  const allowed = new Set(keys)
  for (const key of Object.keys(object)) {
    if (!allowed.has(key)) throw new QuizContractError(`${path}.${key}`, '不存在的字段')
  }
  for (const key of keys) {
    if (!(key in object)) throw new QuizContractError(`${path}.${key}`, '必填字段')
  }
  return object
}

function numberAt(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new QuizContractError(path, 'number')
  }
  return value
}

function decimalAt(value: unknown, path: string): number {
  if (typeof value === 'number') return numberAt(value, path)
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  throw new QuizContractError(path, 'finite decimal number')
}

function integerAt(value: unknown, path: string): number {
  const number = numberAt(value, path)
  if (!Number.isInteger(number)) throw new QuizContractError(path, 'integer')
  return number
}

function positiveIntegerAt(value: unknown, path: string): number {
  const number = integerAt(value, path)
  if (number < 1) throw new QuizContractError(path, 'positive integer')
  return number
}

function stringAt(value: unknown, path: string): string {
  if (typeof value !== 'string') throw new QuizContractError(path, 'string')
  return value
}

function booleanAt(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') throw new QuizContractError(path, 'boolean')
  return value
}

function nullable<T>(value: unknown, path: string, parser: (value: unknown, path: string) => T): T | null {
  return value === null ? null : parser(value, path)
}

function arrayOf<T>(value: unknown, path: string, parser: (value: unknown, path: string) => T): T[] {
  if (!Array.isArray(value)) throw new QuizContractError(path, 'array')
  return value.map((item, index) => parser(item, `${path}[${index}]`))
}

function literalAt<const T extends string>(value: unknown, path: string, values: readonly T[]): T {
  const parsed = stringAt(value, path)
  if (!values.includes(parsed as T)) throw new QuizContractError(path, values.join(' | '))
  return parsed as T
}

function dateTimeAt(value: unknown, path: string): string {
  const parsed = stringAt(value, path)
  if (!Number.isFinite(Date.parse(parsed))) throw new QuizContractError(path, 'ISO date-time')
  return parsed
}

function dateAt(value: unknown, path: string): string {
  const parsed = stringAt(value, path)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(parsed)) throw new QuizContractError(path, 'YYYY-MM-DD')
  return parsed
}

function answerAt(value: unknown, path: string): QuizAnswer {
  if (typeof value === 'string') return literalAt(value, path, ['A', 'B', 'C', 'D'] as const)
  const answer = arrayOf(value, path, (item, itemPath) => literalAt(item, itemPath, ['A', 'B', 'C', 'D'] as const))
  if (answer.length === 0) throw new QuizContractError(path, 'non-empty answer array')
  return answer
}

function optionsAt(value: unknown, path: string): Record<string, string> {
  const object = objectAt(value, path)
  const options: Record<string, string> = {}
  for (const [key, item] of Object.entries(object)) {
    if (!['A', 'B', 'C', 'D'].includes(key)) throw new QuizContractError(`${path}.${key}`, 'A | B | C | D')
    options[key] = stringAt(item, `${path}.${key}`)
  }
  return options
}

function imageUrlsAt(value: unknown, path: string): string[] {
  return arrayOf(value, path, stringAt)
}

function optionImageUrlsAt(value: unknown, path: string): Record<string, string> {
  const object = objectAt(value, path)
  const result: Record<string, string> = {}
  for (const [key, item] of Object.entries(object)) {
    if (!['A', 'B', 'C', 'D'].includes(key)) throw new QuizContractError(`${path}.${key}`, '选项图片键只能为 A-D')
    result[key] = stringAt(item, `${path}.${key}`)
  }
  return result
}

function questionTypeAt(value: unknown, path: string): QuizQuestionType {
  return literalAt(value, path, ['single_choice', 'multiple_choice', 'judge'] as const)
}

function questionStatusAt(value: unknown, path: string): QuizQuestionStatus {
  return literalAt(value, path, ['draft', 'published', 'disabled', 'deleted'] as const)
}

function categoryPathAt(value: unknown, path: string): QuizCategoryPathItem[] {
  return arrayOf(value, path, (item, itemPath) => {
    const object = objectAt(item, itemPath)
    const keys = Object.keys(object).sort().join(',')
    if (keys !== 'id,name' && keys !== 'id,kind,name') {
      throw new QuizContractError(itemPath, 'id/name 或 id/name/kind 对象')
    }
    return {
      id: integerAt(object.id, `${itemPath}.id`),
      name: stringAt(object.name, `${itemPath}.name`),
      ...(object.kind !== undefined ? { kind: nullable(object.kind, `${itemPath}.kind`, (entry, entryPath) => literalAt(entry, entryPath, ['library', 'module', 'knowledge_point', 'category'] as const)) } : {}),
    }
  })
}

function parseKnowledgePoint(value: unknown, path: string): QuizKnowledgePointCatalogItem {
  const object = exactObject(value, path, ['id', 'module_id', 'name', 'description', 'sort_order', 'question_count'])
  return {
    id: integerAt(object.id, `${path}.id`),
    module_id: integerAt(object.module_id, `${path}.module_id`),
    name: stringAt(object.name, `${path}.name`),
    description: nullable(object.description, `${path}.description`, stringAt),
    sort_order: integerAt(object.sort_order, `${path}.sort_order`),
    question_count: integerAt(object.question_count, `${path}.question_count`),
  }
}

function parseModule(value: unknown, path: string): QuizModuleCatalogItem {
  const object = exactObject(value, path, ['id', 'library_id', 'name', 'description', 'sort_order', 'question_count', 'knowledge_points'])
  return {
    id: integerAt(object.id, `${path}.id`),
    library_id: integerAt(object.library_id, `${path}.library_id`),
    name: stringAt(object.name, `${path}.name`),
    description: nullable(object.description, `${path}.description`, stringAt),
    sort_order: integerAt(object.sort_order, `${path}.sort_order`),
    question_count: integerAt(object.question_count, `${path}.question_count`),
    knowledge_points: arrayOf(object.knowledge_points, `${path}.knowledge_points`, parseKnowledgePoint),
  }
}

function parseLibraryBase(value: unknown, path: string, detail: boolean): QuizLibraryCatalogItem | QuizLibraryCatalogDetail {
  const keys = ['id', 'library_code', 'name', 'description', 'cover_url', 'access_mode', 'question_count', 'module_count']
  const object = exactObject(value, path, detail ? [...keys, 'details', 'modules'] : keys)
  const base: QuizLibraryCatalogItem = {
    id: integerAt(object.id, `${path}.id`),
    library_code: stringAt(object.library_code, `${path}.library_code`),
    name: stringAt(object.name, `${path}.name`),
    description: stringAt(object.description, `${path}.description`),
    cover_url: stringAt(object.cover_url, `${path}.cover_url`),
    access_mode: literalAt(object.access_mode, `${path}.access_mode`, ['free', 'course_entitlement'] as const),
    question_count: integerAt(object.question_count, `${path}.question_count`),
    module_count: integerAt(object.module_count, `${path}.module_count`),
  }
  if (!detail) return base
  return {
    ...base,
    details: nullable(object.details, `${path}.details`, stringAt),
    modules: arrayOf(object.modules, `${path}.modules`, parseModule),
  }
}

export function parseQuizLibraries(value: unknown): QuizLibraryCatalogItem[] {
  return arrayOf(value, 'data', (item, path) => parseLibraryBase(item, path, false) as QuizLibraryCatalogItem)
}

export function parseQuizLibrary(value: unknown): QuizLibraryCatalogDetail {
  return parseLibraryBase(value, 'data', true) as QuizLibraryCatalogDetail
}

function parseKnowledgePointProgress(value: unknown, path: string): QuizKnowledgePointProgress {
  const object = exactObject(value, path, ['knowledge_point_id', 'question_count', 'answered_questions', 'accuracy'])
  const questionCount = integerAt(object.question_count, `${path}.question_count`)
  const answeredQuestions = integerAt(object.answered_questions, `${path}.answered_questions`)
  if (answeredQuestions > questionCount) throw new QuizContractError(`${path}.answered_questions`, '不能超过总题数')
  return {
    knowledge_point_id: integerAt(object.knowledge_point_id, `${path}.knowledge_point_id`),
    question_count: questionCount,
    answered_questions: answeredQuestions,
    accuracy: decimalAt(object.accuracy, `${path}.accuracy`),
  }
}

function parseModuleProgress(value: unknown, path: string): QuizModuleProgress {
  const object = exactObject(value, path, ['module_id', 'question_count', 'answered_questions', 'accuracy', 'knowledge_points'])
  const questionCount = integerAt(object.question_count, `${path}.question_count`)
  const answeredQuestions = integerAt(object.answered_questions, `${path}.answered_questions`)
  if (answeredQuestions > questionCount) throw new QuizContractError(`${path}.answered_questions`, '不能超过总题数')
  return {
    module_id: integerAt(object.module_id, `${path}.module_id`),
    question_count: questionCount,
    answered_questions: answeredQuestions,
    accuracy: decimalAt(object.accuracy, `${path}.accuracy`),
    knowledge_points: arrayOf(object.knowledge_points, `${path}.knowledge_points`, parseKnowledgePointProgress),
  }
}

export function parseLibraryProgress(value: unknown): QuizLibraryProgress {
  const object = exactObject(value, 'data', ['library_id', 'question_count', 'answered_questions', 'accuracy', 'modules'])
  const questionCount = integerAt(object.question_count, 'data.question_count')
  const answeredQuestions = integerAt(object.answered_questions, 'data.answered_questions')
  if (answeredQuestions > questionCount) throw new QuizContractError('data.answered_questions', '不能超过总题数')
  return {
    library_id: integerAt(object.library_id, 'data.library_id'),
    question_count: questionCount,
    answered_questions: answeredQuestions,
    accuracy: decimalAt(object.accuracy, 'data.accuracy'),
    modules: arrayOf(object.modules, 'data.modules', parseModuleProgress),
  }
}

export function parsePracticeScopePreview(value: unknown): QuizPracticeScopePreview {
  const object = exactObject(value, 'data', ['library_id', 'scope_type', 'scope_id', 'mode', 'question_count', 'estimated_minutes', 'valid_days', 'requires_large_scope_confirmation', 'unfinished_session_id', 'unfinished_session_expires_at'])
  const validDays = integerAt(object.valid_days, 'data.valid_days')
  if (validDays !== 7) throw new QuizContractError('data.valid_days', '7')
  return {
    library_id: integerAt(object.library_id, 'data.library_id'),
    scope_type: literalAt(object.scope_type, 'data.scope_type', ['library', 'module', 'knowledge_point'] as const),
    scope_id: integerAt(object.scope_id, 'data.scope_id'),
    mode: literalAt(object.mode, 'data.mode', ['full', 'wrong_only'] as const),
    question_count: integerAt(object.question_count, 'data.question_count'),
    estimated_minutes: integerAt(object.estimated_minutes, 'data.estimated_minutes'),
    valid_days: 7,
    requires_large_scope_confirmation: booleanAt(object.requires_large_scope_confirmation, 'data.requires_large_scope_confirmation'),
    unfinished_session_id: nullable(object.unfinished_session_id, 'data.unfinished_session_id', integerAt),
    unfinished_session_expires_at: nullable(object.unfinished_session_expires_at, 'data.unfinished_session_expires_at', dateTimeAt),
  }
}

export function parseQuizCategory(value: unknown, path = 'data'): QuizCategoryNode {
  const object = exactObject(value, path, ['id', 'name', 'parent_id', 'depth', 'description', 'sort_order', 'question_count', 'children'])
  const depth = integerAt(object.depth, `${path}.depth`)
  if (depth !== 1 && depth !== 2 && depth !== 3) throw new QuizContractError(`${path}.depth`, '1 | 2 | 3')
  return {
    id: integerAt(object.id, `${path}.id`),
    name: stringAt(object.name, `${path}.name`),
    parent_id: nullable(object.parent_id, `${path}.parent_id`, integerAt),
    depth,
    description: nullable(object.description, `${path}.description`, stringAt),
    sort_order: integerAt(object.sort_order, `${path}.sort_order`),
    question_count: integerAt(object.question_count, `${path}.question_count`),
    children: arrayOf(object.children, `${path}.children`, parseQuizCategory),
  }
}

export function parseQuizCategories(value: unknown): QuizCategoryNode[] {
  return arrayOf(value, 'data', parseQuizCategory)
}

export function parseQuizQuestion(value: unknown, path = 'data'): QuizPublicQuestion {
  const object = objectAt(value, path)
  const required = ['id', 'category_id', 'question_type', 'question_text', 'options', 'image_urls']
  const allowed = new Set([...required, 'option_image_urls', 'library_id', 'knowledge_point_id', 'question_revision_id'])
  for (const key of Object.keys(object)) if (!allowed.has(key)) throw new QuizContractError(`${path}.${key}`, '不存在的字段')
  for (const key of required) if (!(key in object)) throw new QuizContractError(`${path}.${key}`, '必填字段')
  return {
    id: integerAt(object.id, `${path}.id`),
    category_id: nullable(object.category_id, `${path}.category_id`, integerAt),
    ...(object.library_id !== undefined ? { library_id: nullable(object.library_id, `${path}.library_id`, integerAt) } : {}),
    ...(object.knowledge_point_id !== undefined ? { knowledge_point_id: nullable(object.knowledge_point_id, `${path}.knowledge_point_id`, integerAt) } : {}),
    ...(object.question_revision_id !== undefined ? { question_revision_id: nullable(object.question_revision_id, `${path}.question_revision_id`, integerAt) } : {}),
    question_type: questionTypeAt(object.question_type, `${path}.question_type`),
    question_text: stringAt(object.question_text, `${path}.question_text`),
    options: optionsAt(object.options, `${path}.options`),
    image_urls: imageUrlsAt(object.image_urls, `${path}.image_urls`),
    option_image_urls: object.option_image_urls === undefined ? {} : optionImageUrlsAt(object.option_image_urls, `${path}.option_image_urls`),
  }
}

function parsePage<T>(value: unknown, parser: (value: unknown, path: string) => T): PageData<T> {
  const object = exactObject(value, 'data', ['items', 'total', 'page', 'page_size'])
  return {
    items: arrayOf(object.items, 'data.items', parser),
    total: integerAt(object.total, 'data.total'),
    page: integerAt(object.page, 'data.page'),
    page_size: integerAt(object.page_size, 'data.page_size'),
  }
}

export const parseQuizQuestionPage = (value: unknown): PageData<QuizPublicQuestion> => parsePage(value, parseQuizQuestion)

export function parsePracticeAttempt(value: unknown, path = 'data'): QuizPracticeAttemptResult {
  const object = exactObject(value, path, ['attempt_id', 'attempt_no', 'user_answer', 'is_correct', 'correct_answer', 'explanation', 'submitted_at'])
  return {
    attempt_id: integerAt(object.attempt_id, `${path}.attempt_id`),
    attempt_no: integerAt(object.attempt_no, `${path}.attempt_no`),
    user_answer: answerAt(object.user_answer, `${path}.user_answer`),
    is_correct: booleanAt(object.is_correct, `${path}.is_correct`),
    correct_answer: answerAt(object.correct_answer, `${path}.correct_answer`),
    explanation: stringAt(object.explanation, `${path}.explanation`),
    submitted_at: dateTimeAt(object.submitted_at, `${path}.submitted_at`),
  }
}

function parsePracticeQuestion(value: unknown, path: string): QuizPracticeQuestionState {
  const object = objectAt(value, path)
  const baseKeys = ['id', 'category_id', 'question_type', 'question_text', 'options', 'image_urls', 'session_question_id', 'position', 'category_path', 'answered', 'user_answer', 'answer_lock_version', 'attempt_count', 'latest_result']
  const optionalResultKeys = ['correct_answer', 'explanation', 'is_correct']
  const optionalKeys = ['library_id', 'knowledge_point_id', 'question_revision_id']
  const optionalShapeKeys = [...optionalKeys, 'option_image_urls']
  const allowed = new Set([...baseKeys, ...optionalResultKeys, ...optionalShapeKeys])
  for (const key of Object.keys(object)) if (!allowed.has(key)) throw new QuizContractError(`${path}.${key}`, '不存在的字段')
  for (const key of baseKeys) if (!(key in object)) throw new QuizContractError(`${path}.${key}`, '必填字段')
  return {
    ...parseQuizQuestion(Object.fromEntries([...['id', 'category_id', 'question_type', 'question_text', 'options', 'image_urls', 'option_image_urls'], ...optionalKeys].filter(key => object[key] !== undefined).map(key => [key, object[key]])), path),
    session_question_id: integerAt(object.session_question_id, `${path}.session_question_id`),
    position: integerAt(object.position, `${path}.position`),
    category_path: categoryPathAt(object.category_path, `${path}.category_path`),
    answered: booleanAt(object.answered, `${path}.answered`),
    user_answer: nullable(object.user_answer, `${path}.user_answer`, answerAt),
    answer_lock_version: integerAt(object.answer_lock_version, `${path}.answer_lock_version`),
    correct_answer: object.correct_answer === undefined ? null : nullable(object.correct_answer, `${path}.correct_answer`, answerAt),
    explanation: object.explanation === undefined ? null : nullable(object.explanation, `${path}.explanation`, stringAt),
    is_correct: object.is_correct === undefined ? null : nullable(object.is_correct, `${path}.is_correct`, booleanAt),
    attempt_count: integerAt(object.attempt_count, `${path}.attempt_count`),
    latest_result: nullable(object.latest_result, `${path}.latest_result`, parsePracticeAttempt),
  }
}

export function parsePracticeSession(value: unknown): QuizPracticeSession {
  const object = objectAt(value, 'data')
  const legacyKeys = ['id', 'mode', 'category_id', 'requested_count', 'actual_count', 'status', 'started_at', 'completed_at', 'abandoned_at', 'lock_version', 'questions']
  const extendedKeys = [...legacyKeys, 'library_id', 'scope_type', 'scope_id', 'expires_at', 'paused_at', 'pause_reason', 'answered_count', 'remaining_count', 'current_position', 'created_new', 'resume_available']
  const hasExtendedShape = 'scope_type' in object
  const expected = hasExtendedShape ? extendedKeys : legacyKeys
  exactObject(value, 'data', expected)
  const status = literalAt(object.status, 'data.status', ['in_progress', 'paused', 'completed', 'abandoned', 'expired', 'terminated'] as const)
  const questions = arrayOf(object.questions, 'data.questions', parsePracticeQuestion)
  for (const [index, question] of questions.entries()) {
    if (status !== 'completed' && (question.correct_answer !== null || question.explanation !== null || question.is_correct !== null)) {
      throw new QuizContractError(`data.questions[${index}]`, '交卷前不得包含答案、正误或解析')
    }
    if (status === 'completed') {
      if (question.correct_answer === null || question.explanation === null) {
        throw new QuizContractError(`data.questions[${index}]`, '交卷结果必须包含标准答案和解析')
      }
      if ((question.user_answer === null) !== (question.is_correct === null)) {
        throw new QuizContractError(`data.questions[${index}].is_correct`, '必须与是否作答一致')
      }
    }
  }
  return {
    id: integerAt(object.id, 'data.id'),
    mode: literalAt(object.mode, 'data.mode', ['normal', 'wrong', 'full', 'wrong_only', 'legacy_limited'] as const),
    category_id: nullable(object.category_id, 'data.category_id', integerAt),
    library_id: hasExtendedShape ? nullable(object.library_id, 'data.library_id', integerAt) : null,
    scope_type: hasExtendedShape ? nullable(object.scope_type, 'data.scope_type', (entry, path) => literalAt(entry, path, ['library', 'module', 'knowledge_point'] as const)) : null,
    scope_id: hasExtendedShape ? nullable(object.scope_id, 'data.scope_id', integerAt) : null,
    requested_count: integerAt(object.requested_count, 'data.requested_count'),
    actual_count: integerAt(object.actual_count, 'data.actual_count'),
    status,
    started_at: dateTimeAt(object.started_at, 'data.started_at'),
    completed_at: nullable(object.completed_at, 'data.completed_at', dateTimeAt),
    abandoned_at: nullable(object.abandoned_at, 'data.abandoned_at', dateTimeAt),
    expires_at: hasExtendedShape ? nullable(object.expires_at, 'data.expires_at', dateTimeAt) : null,
    paused_at: hasExtendedShape ? nullable(object.paused_at, 'data.paused_at', dateTimeAt) : null,
    pause_reason: hasExtendedShape ? nullable(object.pause_reason, 'data.pause_reason', (entry, path) => literalAt(entry, path, ['quiz_library_suspended', 'quiz_entitlement_inactive'] as const)) : null,
    answered_count: hasExtendedShape ? integerAt(object.answered_count, 'data.answered_count') : 0,
    remaining_count: hasExtendedShape ? integerAt(object.remaining_count, 'data.remaining_count') : 0,
    current_position: hasExtendedShape ? nullable(object.current_position, 'data.current_position', integerAt) : null,
    created_new: hasExtendedShape ? booleanAt(object.created_new, 'data.created_new') : true,
    resume_available: hasExtendedShape ? booleanAt(object.resume_available, 'data.resume_available') : false,
    lock_version: integerAt(object.lock_version, 'data.lock_version'),
    questions,
  }
}

export function parsePracticeSkip(value: unknown): QuizPracticeSkipResult {
  const object = exactObject(value, 'data', ['session_id', 'session_question_id', 'skip_count', 'next_question'])
  const skipCount = integerAt(object.skip_count, 'data.skip_count')
  if (skipCount !== 1) throw new QuizContractError('data.skip_count', '1')
  return {
    session_id: integerAt(object.session_id, 'data.session_id'),
    session_question_id: integerAt(object.session_question_id, 'data.session_question_id'),
    skip_count: 1,
    next_question: nullable(object.next_question, 'data.next_question', parsePracticeQuestion),
  }
}

export function parsePracticeAnswerSaved(value: unknown): QuizPracticeAnswerSaved {
  const object = exactObject(value, 'data', ['session_id', 'session_question_id', 'user_answer', 'lock_version', 'saved_at'])
  return {
    session_id: integerAt(object.session_id, 'data.session_id'),
    session_question_id: integerAt(object.session_question_id, 'data.session_question_id'),
    user_answer: answerAt(object.user_answer, 'data.user_answer'),
    lock_version: integerAt(object.lock_version, 'data.lock_version'),
    saved_at: dateTimeAt(object.saved_at, 'data.saved_at'),
  }
}

export function parseNullablePracticeSession(value: unknown): QuizPracticeSession | null {
  return value === null ? null : parsePracticeSession(value)
}

export function parsePracticeAbandon(value: unknown): QuizPracticeAbandonResult {
  const object = exactObject(value, 'data', ['session_id', 'status', 'abandoned_at'])
  return {
    session_id: integerAt(object.session_id, 'data.session_id'),
    status: literalAt(object.status, 'data.status', ['abandoned'] as const),
    abandoned_at: dateTimeAt(object.abandoned_at, 'data.abandoned_at'),
  }
}

function parseHistoryItem(value: unknown, path: string): QuizPracticeHistoryItem {
  const object = exactObject(value, path, ['attempt_id', 'session_id', 'session_question_id', 'question_id', 'category_path', 'question_type', 'question_text', 'options', 'user_answer', 'correct_answer', 'explanation', 'is_correct', 'attempt_no', 'submitted_at', 'current_question_status'])
  return {
    attempt_id: integerAt(object.attempt_id, `${path}.attempt_id`),
    session_id: integerAt(object.session_id, `${path}.session_id`),
    session_question_id: integerAt(object.session_question_id, `${path}.session_question_id`),
    question_id: integerAt(object.question_id, `${path}.question_id`),
    category_path: categoryPathAt(object.category_path, `${path}.category_path`),
    question_type: questionTypeAt(object.question_type, `${path}.question_type`),
    question_text: stringAt(object.question_text, `${path}.question_text`),
    options: optionsAt(object.options, `${path}.options`),
    user_answer: answerAt(object.user_answer, `${path}.user_answer`),
    correct_answer: answerAt(object.correct_answer, `${path}.correct_answer`),
    explanation: stringAt(object.explanation, `${path}.explanation`),
    is_correct: booleanAt(object.is_correct, `${path}.is_correct`),
    attempt_no: integerAt(object.attempt_no, `${path}.attempt_no`),
    submitted_at: dateTimeAt(object.submitted_at, `${path}.submitted_at`),
    current_question_status: nullable(object.current_question_status, `${path}.current_question_status`, questionStatusAt),
  }
}

export const parsePracticeHistoryPage = (value: unknown): PageData<QuizPracticeHistoryItem> => parsePage(value, parseHistoryItem)

function parseWrongBookItem(value: unknown, path: string): QuizWrongBookItem {
  const object = exactObject(value, path, ['id', 'question_id', 'status', 'question', 'question_status', 'usable_for_practice', 'first_wrong_at', 'latest_wrong_at', 'wrong_count'])
  return {
    id: integerAt(object.id, `${path}.id`),
    question_id: integerAt(object.question_id, `${path}.question_id`),
    status: literalAt(object.status, `${path}.status`, ['active', 'cleared'] as const),
    question: parseQuizQuestion(object.question, `${path}.question`),
    question_status: questionStatusAt(object.question_status, `${path}.question_status`),
    usable_for_practice: booleanAt(object.usable_for_practice, `${path}.usable_for_practice`),
    first_wrong_at: dateTimeAt(object.first_wrong_at, `${path}.first_wrong_at`),
    latest_wrong_at: dateTimeAt(object.latest_wrong_at, `${path}.latest_wrong_at`),
    wrong_count: positiveIntegerAt(object.wrong_count, `${path}.wrong_count`),
  }
}

export const parseWrongBookPage = (value: unknown): PageData<QuizWrongBookItem> => parsePage(value, parseWrongBookItem)

function parseCollectionItem(value: unknown, path: string): QuizCollectionItem {
  const object = exactObject(value, path, ['id', 'question_id', 'question', 'question_status', 'is_active', 'collected_at'])
  return {
    id: integerAt(object.id, `${path}.id`),
    question_id: integerAt(object.question_id, `${path}.question_id`),
    question: parseQuizQuestion(object.question, `${path}.question`),
    question_status: questionStatusAt(object.question_status, `${path}.question_status`),
    is_active: booleanAt(object.is_active, `${path}.is_active`),
    collected_at: dateTimeAt(object.collected_at, `${path}.collected_at`),
  }
}

export const parseCollectionPage = (value: unknown): PageData<QuizCollectionItem> => parsePage(value, parseCollectionItem)

export function parseCollectionMutation(value: unknown): QuizCollectionMutation {
  const object = exactObject(value, 'data', ['question_id', 'is_active', 'updated_at'])
  return {
    question_id: integerAt(object.question_id, 'data.question_id'),
    is_active: booleanAt(object.is_active, 'data.is_active'),
    updated_at: dateTimeAt(object.updated_at, 'data.updated_at'),
  }
}

export function parseCheckinStatus(value: unknown): QuizCheckinStatus {
  const object = exactObject(value, 'data', ['checkin_date', 'checked_in', 'questions_completed', 'consecutive_days'])
  return {
    checkin_date: dateAt(object.checkin_date, 'data.checkin_date'),
    checked_in: booleanAt(object.checked_in, 'data.checked_in'),
    questions_completed: integerAt(object.questions_completed, 'data.questions_completed'),
    consecutive_days: integerAt(object.consecutive_days, 'data.consecutive_days'),
  }
}

function parseCheckinDay(value: unknown, path: string): QuizCheckinDay {
  const object = exactObject(value, path, ['checkin_date', 'questions_completed', 'consecutive_days'])
  return {
    checkin_date: dateAt(object.checkin_date, `${path}.checkin_date`),
    questions_completed: integerAt(object.questions_completed, `${path}.questions_completed`),
    consecutive_days: integerAt(object.consecutive_days, `${path}.consecutive_days`),
  }
}

export const parseCheckinCalendar = (value: unknown): QuizCheckinDay[] => arrayOf(value, 'data', parseCheckinDay)

export function parseQuizStats(value: unknown): QuizStats {
  const object = exactObject(value, 'data', ['practice', 'exam'])
  const practice = exactObject(object.practice, 'data.practice', ['total_attempts', 'first_attempts', 'first_correct_attempts', 'accuracy', 'answered_questions', 'active_wrong_count', 'active_collection_count', 'checkin_days', 'consecutive_days', 'today_questions'])
  const exam = exactObject(object.exam, 'data.exam', ['completed_exam_count', 'timed_out_exam_count', 'total_questions', 'correct_count', 'wrong_count', 'unanswered_count', 'average_score', 'highest_score', 'latest_score'])
  return {
    practice: {
      total_attempts: integerAt(practice.total_attempts, 'data.practice.total_attempts'),
      first_attempts: integerAt(practice.first_attempts, 'data.practice.first_attempts'),
      first_correct_attempts: integerAt(practice.first_correct_attempts, 'data.practice.first_correct_attempts'),
      accuracy: decimalAt(practice.accuracy, 'data.practice.accuracy'),
      answered_questions: integerAt(practice.answered_questions, 'data.practice.answered_questions'),
      active_wrong_count: integerAt(practice.active_wrong_count, 'data.practice.active_wrong_count'),
      active_collection_count: integerAt(practice.active_collection_count, 'data.practice.active_collection_count'),
      checkin_days: integerAt(practice.checkin_days, 'data.practice.checkin_days'),
      consecutive_days: integerAt(practice.consecutive_days, 'data.practice.consecutive_days'),
      today_questions: integerAt(practice.today_questions, 'data.practice.today_questions'),
    },
    exam: {
      completed_exam_count: integerAt(exam.completed_exam_count, 'data.exam.completed_exam_count'),
      timed_out_exam_count: integerAt(exam.timed_out_exam_count, 'data.exam.timed_out_exam_count'),
      total_questions: integerAt(exam.total_questions, 'data.exam.total_questions'),
      correct_count: integerAt(exam.correct_count, 'data.exam.correct_count'),
      wrong_count: integerAt(exam.wrong_count, 'data.exam.wrong_count'),
      unanswered_count: integerAt(exam.unanswered_count, 'data.exam.unanswered_count'),
      average_score: nullable(exam.average_score, 'data.exam.average_score', decimalAt),
      highest_score: nullable(exam.highest_score, 'data.exam.highest_score', decimalAt),
      latest_score: nullable(exam.latest_score, 'data.exam.latest_score', decimalAt),
    },
  }
}

function parseExamBase(value: JsonObject, path: string): QuizExamBase {
  const duration = integerAt(value.duration_seconds, `${path}.duration_seconds`)
  if (duration !== 3600) throw new QuizContractError(`${path}.duration_seconds`, '3600')
  return {
    id: integerAt(value.id, `${path}.id`),
    category_id: nullable(value.category_id, `${path}.category_id`, integerAt),
    library_id: nullable(value.library_id, `${path}.library_id`, integerAt),
    scope_type: nullable(value.scope_type, `${path}.scope_type`, (entry, entryPath) => literalAt(entry, entryPath, ['library', 'module', 'knowledge_point'] as const)),
    scope_id: nullable(value.scope_id, `${path}.scope_id`, integerAt),
    question_count: integerAt(value.question_count, `${path}.question_count`),
    duration_seconds: 3600,
    started_at: dateTimeAt(value.started_at, `${path}.started_at`),
    deadline_at: dateTimeAt(value.deadline_at, `${path}.deadline_at`),
  }
}

function parseExamQuestionState(value: unknown, path: string): QuizExamQuestionState {
  const object = objectAt(value, path)
  const baseKeys = ['id', 'category_id', 'question_type', 'question_text', 'options', 'image_urls', 'exam_question_id', 'position', 'category_path', 'user_answer', 'answer_lock_version']
  const optionalKeys = ['library_id', 'knowledge_point_id', 'question_revision_id']
  for (const key of Object.keys(object)) if (![...baseKeys, ...optionalKeys, 'option_image_urls'].includes(key)) throw new QuizContractError(`${path}.${key}`, '不存在的字段')
  for (const key of baseKeys) if (!(key in object)) throw new QuizContractError(`${path}.${key}`, '必填字段')
  return {
    ...parseQuizQuestion(Object.fromEntries([...['id', 'category_id', 'question_type', 'question_text', 'options', 'image_urls', 'option_image_urls'], ...optionalKeys].filter(key => object[key] !== undefined).map(key => [key, object[key]])), path),
    exam_question_id: integerAt(object.exam_question_id, `${path}.exam_question_id`),
    position: integerAt(object.position, `${path}.position`),
    category_path: categoryPathAt(object.category_path, `${path}.category_path`),
    user_answer: nullable(object.user_answer, `${path}.user_answer`, answerAt),
    answer_lock_version: nullable(object.answer_lock_version, `${path}.answer_lock_version`, integerAt),
  }
}

function parseExamAbandonedQuestion(value: unknown, path: string): QuizExamAbandonedQuestion {
  const object = objectAt(value, path)
  const baseKeys = ['id', 'category_id', 'question_type', 'question_text', 'options', 'image_urls', 'exam_question_id', 'position', 'answered']
  const optionalKeys = ['library_id', 'knowledge_point_id', 'question_revision_id']
  for (const key of Object.keys(object)) if (![...baseKeys, ...optionalKeys, 'option_image_urls'].includes(key)) throw new QuizContractError(`${path}.${key}`, '不存在的字段')
  for (const key of baseKeys) if (!(key in object)) throw new QuizContractError(`${path}.${key}`, '必填字段')
  return {
    ...parseQuizQuestion(Object.fromEntries([...['id', 'category_id', 'question_type', 'question_text', 'options', 'image_urls', 'option_image_urls'], ...optionalKeys].filter(key => object[key] !== undefined).map(key => [key, object[key]])), path),
    exam_question_id: integerAt(object.exam_question_id, `${path}.exam_question_id`),
    position: integerAt(object.position, `${path}.position`),
    answered: booleanAt(object.answered, `${path}.answered`),
  }
}

function parseExamQuestionResult(value: unknown, path: string): QuizExamQuestionResult {
  const object = objectAt(value, path)
  const baseKeys = ['id', 'category_id', 'question_type', 'question_text', 'options', 'image_urls', 'exam_question_id', 'position', 'user_answer', 'correct_answer', 'explanation', 'is_correct']
  const optionalKeys = ['library_id', 'knowledge_point_id', 'question_revision_id']
  for (const key of Object.keys(object)) if (![...baseKeys, ...optionalKeys, 'option_image_urls'].includes(key)) throw new QuizContractError(`${path}.${key}`, '不存在的字段')
  for (const key of baseKeys) if (!(key in object)) throw new QuizContractError(`${path}.${key}`, '必填字段')
  return {
    ...parseQuizQuestion(Object.fromEntries([...['id', 'category_id', 'question_type', 'question_text', 'options', 'image_urls', 'option_image_urls'], ...optionalKeys].filter(key => object[key] !== undefined).map(key => [key, object[key]])), path),
    exam_question_id: integerAt(object.exam_question_id, `${path}.exam_question_id`),
    position: integerAt(object.position, `${path}.position`),
    user_answer: nullable(object.user_answer, `${path}.user_answer`, answerAt),
    correct_answer: answerAt(object.correct_answer, `${path}.correct_answer`),
    explanation: stringAt(object.explanation, `${path}.explanation`),
    is_correct: booleanAt(object.is_correct, `${path}.is_correct`),
  }
}

export function parseExamDetail(value: unknown): QuizExamDetail {
  const object = objectAt(value, 'data')
  const status = literalAt(object.status, 'data.status', ['in_progress', 'completed', 'timed_out', 'abandoned'] as const)
  if (status === 'in_progress') {
    const checked = exactObject(object, 'data', ['id', 'status', 'category_id', 'library_id', 'scope_type', 'scope_id', 'question_count', 'duration_seconds', 'started_at', 'deadline_at', 'server_time', 'questions'])
    return { ...parseExamBase(checked, 'data'), status, server_time: dateTimeAt(checked.server_time, 'data.server_time'), questions: arrayOf(checked.questions, 'data.questions', parseExamQuestionState) }
  }
  if (status === 'abandoned') {
    const checked = exactObject(object, 'data', ['id', 'status', 'category_id', 'library_id', 'scope_type', 'scope_id', 'question_count', 'duration_seconds', 'started_at', 'deadline_at', 'abandoned_at', 'questions'])
    return { ...parseExamBase(checked, 'data'), status, abandoned_at: dateTimeAt(checked.abandoned_at, 'data.abandoned_at'), questions: arrayOf(checked.questions, 'data.questions', parseExamAbandonedQuestion) }
  }
  const checked = exactObject(object, 'data', ['id', 'status', 'category_id', 'library_id', 'scope_type', 'scope_id', 'question_count', 'duration_seconds', 'started_at', 'deadline_at', 'finished_at', 'correct_count', 'wrong_count', 'unanswered_count', 'score', 'questions'])
  return {
    ...parseExamBase(checked, 'data'), status,
    finished_at: dateTimeAt(checked.finished_at, 'data.finished_at'),
    correct_count: integerAt(checked.correct_count, 'data.correct_count'),
    wrong_count: integerAt(checked.wrong_count, 'data.wrong_count'),
    unanswered_count: integerAt(checked.unanswered_count, 'data.unanswered_count'),
    score: decimalAt(checked.score, 'data.score'),
    questions: arrayOf(checked.questions, 'data.questions', parseExamQuestionResult),
  }
}

export function parseNullableExam(value: unknown): QuizExamDetail | null {
  return value === null ? null : parseExamDetail(value)
}

function parseExamListItem(value: unknown, path: string): QuizExamListItem {
  const object = exactObject(value, path, ['id', 'category_id', 'library_id', 'scope_type', 'scope_id', 'question_count', 'duration_seconds', 'status', 'started_at', 'deadline_at', 'finished_at', 'score'])
  const duration = integerAt(object.duration_seconds, `${path}.duration_seconds`)
  if (duration !== 3600) throw new QuizContractError(`${path}.duration_seconds`, '3600')
  return {
    id: integerAt(object.id, `${path}.id`), category_id: nullable(object.category_id, `${path}.category_id`, integerAt),
    library_id: nullable(object.library_id, `${path}.library_id`, integerAt),
    scope_type: nullable(object.scope_type, `${path}.scope_type`, (entry, entryPath) => literalAt(entry, entryPath, ['library', 'module', 'knowledge_point'] as const)),
    scope_id: nullable(object.scope_id, `${path}.scope_id`, integerAt),
    question_count: integerAt(object.question_count, `${path}.question_count`), duration_seconds: 3600,
    status: literalAt(object.status, `${path}.status`, ['in_progress', 'completed', 'timed_out', 'abandoned'] as const),
    started_at: dateTimeAt(object.started_at, `${path}.started_at`), deadline_at: dateTimeAt(object.deadline_at, `${path}.deadline_at`),
    finished_at: nullable(object.finished_at, `${path}.finished_at`, dateTimeAt), score: nullable(object.score, `${path}.score`, decimalAt),
  }
}

export const parseExamListPage = (value: unknown): PageData<QuizExamListItem> => parsePage(value, parseExamListItem)

export function parseExamAnswerSaved(value: unknown): QuizExamAnswerSaved {
  const object = exactObject(value, 'data', ['exam_id', 'exam_question_id', 'user_answer', 'lock_version', 'saved_at'])
  return {
    exam_id: integerAt(object.exam_id, 'data.exam_id'), exam_question_id: integerAt(object.exam_question_id, 'data.exam_question_id'),
    user_answer: answerAt(object.user_answer, 'data.user_answer'), lock_version: integerAt(object.lock_version, 'data.lock_version'),
    saved_at: dateTimeAt(object.saved_at, 'data.saved_at'),
  }
}

export function parseExamAction(value: unknown): QuizExamAction {
  const object = exactObject(value, 'data', ['exam_id', 'status', 'finished_at', 'score'])
  return {
    exam_id: integerAt(object.exam_id, 'data.exam_id'),
    status: literalAt(object.status, 'data.status', ['in_progress', 'completed', 'timed_out', 'abandoned'] as const),
    finished_at: dateTimeAt(object.finished_at, 'data.finished_at'),
    score: nullable(object.score, 'data.score', decimalAt),
  }
}
