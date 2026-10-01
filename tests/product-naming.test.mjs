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
