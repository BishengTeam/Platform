import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  CourseAssignmentContractError,
  parseCourseAssignmentDetail,
  parseCourseAssignmentList,
} from '../src/contracts/courseAssignment.ts'

const question = {
  question_id: 31,
  position: 1,
  question_type: 'essay',
  question_text: '简述课程作业的评阅流程',
  options: {},
  option_image_urls: {},
  image_urls: [],
  score: '20.00',
  is_essay: true,
  user_answer: '学生答案',
  is_answered: true,
  correct_answer: null,
  explanation: null,
  earned_score: null,
  manual_score: null,
  review_comment: null,
  requires_review: true,
}

const listItem = {
  assignment_id: 3,
  library_id: 11,
  library_name: '课程题库',
  library_code: 'QL00000011',
  description: '课程作业',
  cover_url: '',
  question_count: 9,
  essay_count: 2,
  status: 'draft',
  display_status: 'draft',
  can_withdraw: false,
  total_score: null,
  submitted_at: null,
  graded_at: null,
}

const detail = {
  assignment_id: 3,
  library_id: 11,
  library_name: '课程题库',
  status: 'draft',
  display_status: 'draft',
  assignment_status: 'published',
  config_version_no: 2,
  can_edit: true,
  can_submit: true,
  can_withdraw: false,
  result_available: false,
  total_score: null,
  submitted_at: null,
  graded_at: null,
  questions: [question],
}

test('course assignment list parser accepts the frozen shape', () => {
  const parsed = parseCourseAssignmentList([listItem])
  assert.equal(parsed[0].assignment_id, 3)
  assert.equal(parsed[0].display_status, 'draft')
  assert.equal(parsed[0].total_score, null)
})

test('course assignment detail parser keeps essay answers and hides review fields before grading', () => {
  const parsed = parseCourseAssignmentDetail(detail)
  assert.equal(parsed.questions[0].user_answer, '学生答案')
  assert.equal(parsed.questions[0].score, 20)
  assert.equal(parsed.questions[0].correct_answer, null)
  assert.equal(parsed.questions[0].explanation, null)
})

test('course assignment parsers reject contract drift', () => {
  assert.throws(() => parseCourseAssignmentList([{ ...listItem, extra: true }]), CourseAssignmentContractError)
  assert.throws(() => parseCourseAssignmentDetail({ ...detail, questions: [{ ...question, unknown: true }] }), CourseAssignmentContractError)
})

test('course assignment service exposes the six student operations and page route', async () => {
  const [serviceSource, routesSource, appConfigSource, quizIndexSource] = await Promise.all([
    readFile(new URL('../src/services/courseAssignmentService.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/constants/routes.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/app.config.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/pages/quiz/index.tsx', import.meta.url), 'utf8'),
  ])
  assert.match(serviceSource, /get<unknown>\(BASE, courseId \? \{ course_id: courseId \} : undefined\)/)
  assert.match(serviceSource, /post<unknown>\(`\$\{BASE\}\/\$\{assignmentId\}\/start`\)/)
  assert.match(serviceSource, /get<unknown>\(`\$\{BASE\}\/\$\{assignmentId\}`\)/)
  assert.match(serviceSource, /put<unknown>\(`\$\{BASE\}\/\$\{assignmentId\}\/answers`, \{ answers \}\)/)
  assert.match(serviceSource, /post<unknown>\(`\$\{BASE\}\/\$\{assignmentId\}\/submit`\)/)
  assert.match(serviceSource, /post<unknown>\(`\$\{BASE\}\/\$\{assignmentId\}\/withdraw`\)/)
  assert.match(routesSource, /QUIZ_ASSIGNMENT:\s*'pages\/quiz\/assignment'/)
  assert.match(appConfigSource, /root:\s*'pages\/quiz'[\s\S]*pages:\s*\[[^\]]*'assignment'/)
  assert.match(quizIndexSource, /library\.access_mode !== 'course_entitlement' \|\| Boolean\(assignments\[library\.id\]\)/)
})
