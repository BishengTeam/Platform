import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const SERVICE_FILE = new URL('../src/services/quizService.ts', import.meta.url)
const MANIFEST_FILE = new URL('../src/contracts/quiz-contract.json', import.meta.url)

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
    .replaceAll('${questionId}', '{question_id}')
    .replaceAll('${examId}', '{exam_id}')
    .replaceAll('${examQuestionId}', '{exam_question_id}')
}

test('quiz service implements exactly the frozen 22 user operations', async () => {
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

  assert.equal(expected.length, 22)
  assert.deepEqual(actual, expected)
})
