import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { STRINGS } from '../src/constants/strings.ts'

const TRAINING_PAGE_FILE = new URL('../src/pages/training/index.tsx', import.meta.url)

test('training page displays practice assistant', async () => {
  const source = await readFile(TRAINING_PAGE_FILE, 'utf8')
  assert.equal(STRINGS.TRAINING_TAB_QUIZ, '练习助手')
  assert.match(source, /\{renderQuizTab\(\)\}/)
  assert.doesNotMatch(source, /MAIN_TABS|renderTechTab|courseTags|techTag|getCourseList/)
})

test('training page renders quiz features for the only tab', async () => {
  const source = await readFile(TRAINING_PAGE_FILE, 'utf8')
  // 课程列表已随在线课程下线清理，学习页数据加载只依赖题库目录。
  assert.match(source, /return listQuizLibraries\(\)/)
  assert.doesNotMatch(source, /CourseBrief|allCourses|failedCovers/)
})
