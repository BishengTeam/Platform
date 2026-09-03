import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

test('my classrooms list is always visible with empty, retry and ended states', async () => {
  const page = await readFile('src/pages/classroom/join.tsx', 'utf8')

  assert.doesNotMatch(page, /mine\.length > 0 &&/)
  assert.match(page, /useDidShow/)
  assert.match(page, /暂无已加入的课堂/)
  assert.match(page, /加载失败，点击重试/)
  assert.match(page, /c\.status === 'stopped'/)
  assert.match(page, /已结束/)
})

test('detail exposes review entry gated by submission status and stopped badge', async () => {
  const page = await readFile('src/pages/classroom/detail.tsx', 'utf8')
  const types = await readFile('src/types/classroom.ts', 'utf8')

  assert.match(page, /q\.submission_status === 'approved' \? '已批改 · 查看结果' : '待批改'/)
  assert.match(page, /goQuiz\(q\.id, true\)/)
  assert.match(page, /detail\?\.status === 'stopped'/)
  assert.match(types, /submission_status: 'pending_review' \| 'approved' \| null/)
})
