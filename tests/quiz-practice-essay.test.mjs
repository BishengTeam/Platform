import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const PRACTICE_FILE = new URL('../src/pages/quiz/practice.tsx', import.meta.url)

test('practice essay questions keep a local draft for self-comparison', async () => {
  const source = await readFile(PRACTICE_FILE, 'utf8')

  assert.match(source, /const \[essayDrafts, setEssayDrafts\] = useState<Record<number, string>>\(\{\}\)/)
  assert.match(source, /essayDrafts\[currentQuestion\.session_question_id\] \?\? ''/)
  assert.match(source, /className=\{styles\.essayDraftTextarea\}/)
  assert.match(source, /maxlength=\{2000\}/)
  assert.match(source, /仅本机对照，不会提交/)
  assert.match(source, /先写下你的作答，再展开参考答案对照/)
  assert.doesNotMatch(source, /submitAttempt\(currentQuestion, essayDraft\)/)
})
