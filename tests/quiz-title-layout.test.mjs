import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { splitBilingualQuizTitle } from '../src/utils/quizView.ts'

test('bilingual quiz module titles move English to a secondary line', () => {
  assert.deepEqual(
    splitBilingualQuizTitle('章节 01 Network Fundamentals 网络基础'),
    { primary: '章节 01 网络基础', secondary: 'Network Fundamentals' },
  )
  assert.deepEqual(
    splitBilingualQuizTitle('网络基础'),
    { primary: '网络基础', secondary: null },
  )
  assert.deepEqual(
    splitBilingualQuizTitle('Network Fundamentals'),
    { primary: 'Network Fundamentals', secondary: null },
  )
})

test('quiz module rows use a primary title and truncatable metadata line', async () => {
  const [source, style] = await Promise.all([
    readFile(new URL('../src/pages/quiz/index.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/pages/quiz/index.module.scss', import.meta.url), 'utf8'),
  ])

  assert.match(source, /splitBilingualQuizTitle\(module\.name\)/)
  assert.match(source, /styles\.moduleTitleGroup/)
  assert.match(source, /styles\.moduleSubname/)
  assert.match(style, /\.moduleTitleGroup\s*\{[\s\S]*?min-width: 0/)
  assert.match(style, /\.moduleSubname\s*\{[\s\S]*?text-overflow: ellipsis/)
})
