import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { STRINGS } from '../src/constants/strings.ts'

const TRAINING_PAGE_FILE = new URL('../src/pages/training/index.tsx', import.meta.url)

test('training page displays practice assistant', async () => {
  const source = await readFile(TRAINING_PAGE_FILE, 'utf8')
  assert.equal(STRINGS.TRAINING_TAB_QUIZ, '练习助手')
  assert.match(source, /const MAIN_TABS = \[STRINGS\.TRAINING_TAB_QUIZ\]/)
})

test('training page renders quiz features for the only tab', async () => {
  const source = await readFile(TRAINING_PAGE_FILE, 'utf8')
  // 隐藏在线课程后唯一 tab 是「练习助手」，必须渲染 renderQuizTab；
  // a4013ab 曾让 MAIN_TABS[0] 落到课程列表，练习功能整体失联。
  assert.match(source, /\{mainTab === MAIN_TABS\[0\] && renderQuizTab\(\)\}/)
  assert.doesNotMatch(source, /\{mainTab === MAIN_TABS\[\d\] && renderTechTab\(\)\}/)
})
