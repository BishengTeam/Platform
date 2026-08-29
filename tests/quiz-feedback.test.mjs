import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const PRACTICE_FILE = new URL('../src/pages/quiz/practice.tsx', import.meta.url)
const USER_SERVICE_FILE = new URL('../src/services/userService.ts', import.meta.url)

test('practice feedback replaces answer state and reuses the customer ticket API', async () => {
  const [practiceSource, userServiceSource] = await Promise.all([
    readFile(PRACTICE_FILE, 'utf8'),
    readFile(USER_SERVICE_FILE, 'utf8'),
  ])

  assert.match(practiceSource, /className=\{styles\.feedbackTrigger\}/)
  assert.doesNotMatch(practiceSource, /\{styles\.saveState\}/)
  assert.match(practiceSource, /createTicket\(\{/)
  assert.match(practiceSource, /【题目反馈】/)
  assert.match(practiceSource, /题目ID：\$\{currentQuestion\.id\}/)
  assert.match(practiceSource, /题目：\$\{currentQuestion\.question_text\}/)
  assert.match(practiceSource, /description\.length < 5 \|\| description\.length > 500/)
  assert.match(userServiceSource, /post<\{ id: string \}>\('\/api\/tickets', data/)
})
