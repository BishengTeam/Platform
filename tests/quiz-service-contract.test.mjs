import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const SERVICE_FILE = new URL('../src/services/quizService.ts', import.meta.url)
const MANIFEST_FILE = new URL('../src/contracts/quiz-contract.json', import.meta.url)
const ROUTES_FILE = new URL('../src/constants/routes.ts', import.meta.url)
const APP_CONFIG_FILE = new URL('../src/app.config.ts', import.meta.url)

const METHOD_BY_HELPER = {
  del: 'DELETE',
  get: 'GET',
  post: 'POST',
  put: 'PUT',
}

function normalizeTemplatePath(path) {
  return path
    .replaceAll('${QUIZ_API}', '/api/quiz')
    .replaceAll('${sessionId}', '{session_id}')
    .replaceAll('${sessionQuestionId}', '{session_question_id}')
    .replaceAll('${libraryId}', '{library_id}')
    .replaceAll('${questionId}', '{question_id}')
    .replaceAll('${examId}', '{exam_id}')
    .replaceAll('${examQuestionId}', '{exam_question_id}')
}

test('quiz service implements exactly the frozen 32 user operations', async () => {
  const [source, manifestText] = await Promise.all([
    readFile(SERVICE_FILE, 'utf8'),
    readFile(MANIFEST_FILE, 'utf8'),
  ])
  const manifest = JSON.parse(manifestText)
  const expected = manifest.operations
    .filter(operation => operation.path.startsWith('/api/quiz/'))
    .map(operation => `${operation.method} ${operation.path}`)
    .sort()

  const actual = []
  const requestPattern = /\b(get|post|put|del)<unknown>\((['`])([^'`]+)\2/g
  for (const match of source.matchAll(requestPattern)) {
    const method = METHOD_BY_HELPER[match[1]]
    const path = normalizeTemplatePath(match[3])
    if (path.startsWith('/api/quiz/')) actual.push(`${method} ${path}`)
  }
  actual.sort()

  assert.equal(expected.length, 32)
  assert.deepEqual(actual, expected)
})

test('stats request reuses the frozen route with an optional exact scope', async () => {
  const source = await readFile(SERVICE_FILE, 'utf8')
  assert.match(source, /getQuizStats\(input\?: \{[\s\S]*scope_type\?: QuizPracticeScopeType[\s\S]*scope_id\?: number/)
  assert.match(source, /get<unknown>\('\/api\/quiz\/stats', input \? queryData\(input\) : undefined\)/)
})

test('wrong-book route is declared and included in the quiz subpackage', async () => {
  const [routesSource, appConfigSource] = await Promise.all([
    readFile(ROUTES_FILE, 'utf8'),
    readFile(APP_CONFIG_FILE, 'utf8'),
  ])
  assert.match(routesSource, /QUIZ_WRONG_BOOK:\s*'pages\/quiz\/wrong-book'/)
  assert.match(appConfigSource, /root:\s*'pages\/quiz'[\s\S]*pages:\s*\[[^\]]*'wrong-book'/)
})

test('question-select route is declared and included in the quiz subpackage', async () => {
  const [routesSource, appConfigSource] = await Promise.all([
    readFile(ROUTES_FILE, 'utf8'),
    readFile(APP_CONFIG_FILE, 'utf8'),
  ])
  assert.match(routesSource, /QUIZ_QUESTION_SELECT:\s*'pages\/quiz\/question-select'/)
  assert.match(appConfigSource, /root:\s*'pages\/quiz'[\s\S]*pages:\s*\[[^\]]*'question-select'/)
})
