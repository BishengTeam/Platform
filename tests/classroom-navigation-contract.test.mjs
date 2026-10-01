import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('profile temporarily hides learning entries while training courses are hidden', async () => {
  const source = await readFile('src/constants/mock/profile.ts', 'utf8')

  assert.doesNotMatch(source, /route: 'pages\/mine\/courses'/)
  assert.doesNotMatch(source, /route: 'pages\/classroom\/join'/)
  assert.match(source, /学习相关入口随学习专区在线课程一起暂时下线/)
})

test('settings no longer exposes a standalone classroom entry', async () => {
  const source = await readFile('src/pages/mine/profile.tsx', 'utf8')

  assert.doesNotMatch(source, /label: '加入课堂'/)
  assert.doesNotMatch(source, /label: '我的课堂'/)
})

test('classroom join always submits a trimmed six-digit string', async () => {
  const page = await readFile('src/pages/classroom/join.tsx', 'utf8')
  const service = await readFile('src/services/classroomService.ts', 'utf8')

  assert.match(page, /function normalizeClassroomCode[\s\S]*replace\(\/\\D\/g, ''\)/)
  assert.match(page, /joinClassroom\(normalizedCode\)/)
  assert.match(page, /maxlength=\{6\}/)
  assert.match(service, /const normalizedCode = String\(code\)\.trim\(\)/)
  assert.match(service, /code: normalizedCode/)
})
