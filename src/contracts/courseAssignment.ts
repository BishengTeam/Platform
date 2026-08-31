export type CourseAssignmentQuestionType = 'single_choice' | 'multiple_choice' | 'judge' | 'essay'
export type CourseAssignmentStatus = 'draft' | 'submitted' | 'claimed' | 'graded'
export type CourseAssignmentDisplayStatus = 'not_started' | 'draft' | 'submitted' | 'reviewing' | 'graded'
export type CourseAssignmentAnswer = string | string[]

export interface CourseAssignmentListItem {
  assignment_id: number
  library_id: number
  library_name: string
  library_code: string
  description: string
  cover_url: string
  question_count: number
  essay_count: number
  status: CourseAssignmentStatus | null
  display_status: CourseAssignmentDisplayStatus
  can_withdraw: boolean
  total_score: number | null
  submitted_at: string | null
  graded_at: string | null
}

export interface CourseAssignmentQuestion {
  question_id: number
  position: number
  question_type: CourseAssignmentQuestionType
  question_text: string
  options: Record<string, string>
  option_image_urls: Record<string, string>
  image_urls: string[]
  score: number
  is_essay: boolean
  user_answer: CourseAssignmentAnswer | null
  is_answered: boolean
  correct_answer: CourseAssignmentAnswer | null
  explanation: string | null
  earned_score: number | null
  manual_score: number | null
  review_comment: string | null
  requires_review: boolean
}

export interface CourseAssignmentDetail {
  assignment_id: number
  library_id: number
  library_name: string
  status: CourseAssignmentStatus | null
  display_status: CourseAssignmentDisplayStatus
  assignment_status: 'draft' | 'published' | 'disabled'
  config_version_no: number
  can_edit: boolean
  can_submit: boolean
  can_withdraw: boolean
  result_available: boolean
  total_score: number | null
  submitted_at: string | null
  graded_at: string | null
  questions: CourseAssignmentQuestion[]
}

export interface CourseAssignmentAnswerSaved {
  assignment_id: number
  saved_count: number
  config_version_no: number
}

export interface CourseAssignmentSubmitResult {
  assignment_id: number
  status: CourseAssignmentStatus
  display_status: CourseAssignmentDisplayStatus
  total_score: number | null
  submitted_at: string
}

export interface CourseAssignmentWithdrawResult {
  assignment_id: number
  status: 'draft'
}

export class CourseAssignmentContractError extends Error {
  constructor(path: string, expected: string) {
    super(`课程作业接口契约不匹配：${path} 应为 ${expected}`)
    this.name = 'CourseAssignmentContractError'
  }
}

type JsonObject = Record<string, unknown>

function objectAt(value: unknown, path: string): JsonObject {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new CourseAssignmentContractError(path, 'object')
  }
  return value as JsonObject
}

function exactObject(value: unknown, path: string, keys: readonly string[]): JsonObject {
  const object = objectAt(value, path)
  const allowed = new Set(keys)
  for (const key of Object.keys(object)) {
    if (!allowed.has(key)) throw new CourseAssignmentContractError(`${path}.${key}`, '不存在的字段')
  }
  for (const key of keys) {
    if (!(key in object)) throw new CourseAssignmentContractError(`${path}.${key}`, '必填字段')
  }
  return object
}

function stringAt(value: unknown, path: string): string {
  if (typeof value !== 'string') throw new CourseAssignmentContractError(path, 'string')
  return value
}

function nullableStringAt(value: unknown, path: string): string | null {
  return value === null ? null : stringAt(value, path)
}

function numberAt(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new CourseAssignmentContractError(path, 'number')
  }
  return value
}

function integerAt(value: unknown, path: string): number {
  const number = numberAt(value, path)
  if (!Number.isInteger(number)) throw new CourseAssignmentContractError(path, 'integer')
  return number
}

function decimalAt(value: unknown, path: string): number {
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return numberAt(value, path)
}

function nullableDecimalAt(value: unknown, path: string): number | null {
  return value === null ? null : decimalAt(value, path)
}

function booleanAt(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') throw new CourseAssignmentContractError(path, 'boolean')
  return value
}

function nullableDateTimeAt(value: unknown, path: string): string | null {
  if (value === null) return null
  const parsed = stringAt(value, path)
  if (!Number.isFinite(Date.parse(parsed))) throw new CourseAssignmentContractError(path, 'ISO date-time')
  return parsed
}

function dateTimeAt(value: unknown, path: string): string {
  return nullableDateTimeAt(value, path)!
}

function literalAt<const T extends string>(value: unknown, path: string, values: readonly T[]): T {
  const parsed = stringAt(value, path)
  if (!values.includes(parsed as T)) throw new CourseAssignmentContractError(path, values.join(' | '))
  return parsed as T
}

function arrayOf<T>(value: unknown, path: string, parser: (item: unknown, itemPath: string) => T): T[] {
  if (!Array.isArray(value)) throw new CourseAssignmentContractError(path, 'array')
  return value.map((item, index) => parser(item, `${path}[${index}]`))
}

function stringRecordAt(value: unknown, path: string): Record<string, string> {
  const object = objectAt(value, path)
  const result: Record<string, string> = {}
  for (const [key, item] of Object.entries(object)) result[key] = stringAt(item, `${path}.${key}`)
  return result
}

function answerAt(value: unknown, path: string, essay: boolean): CourseAssignmentAnswer | null {
  if (value === null) return null
  if (essay) return stringAt(value, path)
  if (typeof value === 'string') return literalAt(value, path, ['A', 'B', 'C', 'D'] as const)
  return arrayOf(value, path, (item, itemPath) => literalAt(item, itemPath, ['A', 'B', 'C', 'D'] as const))
}

function questionTypeAt(value: unknown, path: string): CourseAssignmentQuestionType {
  return literalAt(value, path, ['single_choice', 'multiple_choice', 'judge', 'essay'] as const)
}

const listItemKeys = [
  'assignment_id', 'library_id', 'library_name', 'library_code', 'description', 'cover_url',
  'question_count', 'essay_count', 'status', 'display_status', 'can_withdraw', 'total_score',
  'submitted_at', 'graded_at',
] as const

export function parseCourseAssignmentList(value: unknown): CourseAssignmentListItem[] {
  return arrayOf(value, 'data', item => {
    const object = exactObject(item, 'data.item', listItemKeys)
    return {
      assignment_id: integerAt(object.assignment_id, 'data.item.assignment_id'),
      library_id: integerAt(object.library_id, 'data.item.library_id'),
      library_name: stringAt(object.library_name, 'data.item.library_name'),
      library_code: stringAt(object.library_code, 'data.item.library_code'),
      description: stringAt(object.description, 'data.item.description'),
      cover_url: stringAt(object.cover_url, 'data.item.cover_url'),
      question_count: integerAt(object.question_count, 'data.item.question_count'),
      essay_count: integerAt(object.essay_count, 'data.item.essay_count'),
      status: nullable(object.status, 'data.item.status', (entry, path) => literalAt(entry, path, ['draft', 'submitted', 'claimed', 'graded'] as const)),
      display_status: literalAt(object.display_status, 'data.item.display_status', ['not_started', 'draft', 'submitted', 'reviewing', 'graded'] as const),
      can_withdraw: booleanAt(object.can_withdraw, 'data.item.can_withdraw'),
      total_score: nullableDecimalAt(object.total_score, 'data.item.total_score'),
      submitted_at: nullableDateTimeAt(object.submitted_at, 'data.item.submitted_at'),
      graded_at: nullableDateTimeAt(object.graded_at, 'data.item.graded_at'),
    }
  })
}

function nullable<T>(value: unknown, path: string, parser: (item: unknown, itemPath: string) => T): T | null {
  return value === null ? null : parser(value, path)
}

const questionKeys = [
  'question_id', 'position', 'question_type', 'question_text', 'options', 'option_image_urls',
  'image_urls', 'score', 'is_essay', 'user_answer', 'is_answered', 'correct_answer', 'explanation',
  'earned_score', 'manual_score', 'review_comment', 'requires_review',
] as const

const detailKeys = [
  'assignment_id', 'library_id', 'library_name', 'status', 'display_status', 'assignment_status',
  'config_version_no', 'can_edit', 'can_submit', 'can_withdraw', 'result_available', 'total_score',
  'submitted_at', 'graded_at', 'questions',
] as const

export function parseCourseAssignmentDetail(value: unknown): CourseAssignmentDetail {
  const object = exactObject(value, 'data', detailKeys)
  return {
    assignment_id: integerAt(object.assignment_id, 'data.assignment_id'),
    library_id: integerAt(object.library_id, 'data.library_id'),
    library_name: stringAt(object.library_name, 'data.library_name'),
    status: nullable(object.status, 'data.status', (entry, path) => literalAt(entry, path, ['draft', 'submitted', 'claimed', 'graded'] as const)),
    display_status: literalAt(object.display_status, 'data.display_status', ['not_started', 'draft', 'submitted', 'reviewing', 'graded'] as const),
    assignment_status: literalAt(object.assignment_status, 'data.assignment_status', ['draft', 'published', 'disabled'] as const),
    config_version_no: integerAt(object.config_version_no, 'data.config_version_no'),
    can_edit: booleanAt(object.can_edit, 'data.can_edit'),
    can_submit: booleanAt(object.can_submit, 'data.can_submit'),
    can_withdraw: booleanAt(object.can_withdraw, 'data.can_withdraw'),
    result_available: booleanAt(object.result_available, 'data.result_available'),
    total_score: nullableDecimalAt(object.total_score, 'data.total_score'),
    submitted_at: nullableDateTimeAt(object.submitted_at, 'data.submitted_at'),
    graded_at: nullableDateTimeAt(object.graded_at, 'data.graded_at'),
    questions: arrayOf(object.questions, 'data.questions', item => {
      const question = exactObject(item, 'data.questions.item', questionKeys)
      const type = questionTypeAt(question.question_type, 'data.questions.item.question_type')
      const essay = type === 'essay'
      return {
        question_id: integerAt(question.question_id, 'data.questions.item.question_id'),
        position: integerAt(question.position, 'data.questions.item.position'),
        question_type: type,
        question_text: stringAt(question.question_text, 'data.questions.item.question_text'),
        options: stringRecordAt(question.options, 'data.questions.item.options'),
        option_image_urls: stringRecordAt(question.option_image_urls, 'data.questions.item.option_image_urls'),
        image_urls: arrayOf(question.image_urls, 'data.questions.item.image_urls', stringAt),
        score: decimalAt(question.score, 'data.questions.item.score'),
        is_essay: booleanAt(question.is_essay, 'data.questions.item.is_essay'),
        user_answer: answerAt(question.user_answer, 'data.questions.item.user_answer', essay),
        is_answered: booleanAt(question.is_answered, 'data.questions.item.is_answered'),
        correct_answer: answerAt(question.correct_answer, 'data.questions.item.correct_answer', essay),
        explanation: nullableStringAt(question.explanation, 'data.questions.item.explanation'),
        earned_score: nullableDecimalAt(question.earned_score, 'data.questions.item.earned_score'),
        manual_score: nullableDecimalAt(question.manual_score, 'data.questions.item.manual_score'),
        review_comment: nullableStringAt(question.review_comment, 'data.questions.item.review_comment'),
        requires_review: booleanAt(question.requires_review, 'data.questions.item.requires_review'),
      }
    }),
  }
}

export function parseCourseAssignmentAnswerSaved(value: unknown): CourseAssignmentAnswerSaved {
  const object = exactObject(value, 'data', ['assignment_id', 'saved_count', 'config_version_no'] as const)
  return {
    assignment_id: integerAt(object.assignment_id, 'data.assignment_id'),
    saved_count: integerAt(object.saved_count, 'data.saved_count'),
    config_version_no: integerAt(object.config_version_no, 'data.config_version_no'),
  }
}

export function parseCourseAssignmentSubmitResult(value: unknown): CourseAssignmentSubmitResult {
  const object = exactObject(value, 'data', ['assignment_id', 'status', 'display_status', 'total_score', 'submitted_at'] as const)
  return {
    assignment_id: integerAt(object.assignment_id, 'data.assignment_id'),
    status: literalAt(object.status, 'data.status', ['draft', 'submitted', 'claimed', 'graded'] as const),
    display_status: literalAt(object.display_status, 'data.display_status', ['not_started', 'draft', 'submitted', 'reviewing', 'graded'] as const),
    total_score: nullableDecimalAt(object.total_score, 'data.total_score'),
    submitted_at: dateTimeAt(object.submitted_at, 'data.submitted_at'),
  }
}

export function parseCourseAssignmentWithdrawResult(value: unknown): CourseAssignmentWithdrawResult {
  const object = exactObject(value, 'data', ['assignment_id', 'status'] as const)
  return {
    assignment_id: integerAt(object.assignment_id, 'data.assignment_id'),
    status: literalAt(object.status, 'data.status', ['draft'] as const),
  }
}
