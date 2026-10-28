import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { certificationBatchState } from '../src/utils/certificationBatch.ts'

test('H3C exam batch card separates prices and highlights urgent quota', async () => {
  const [page, shared, stylesheet] = await Promise.all([
    readFile('src/pages/h3c/index.tsx', 'utf8'),
    readFile('src/components/CertBatchCard/index.tsx', 'utf8'),
    readFile('src/components/CertBatchCard/index.module.scss', 'utf8'),
  ])

  assert.match(page, /student: '学生价'/)
  assert.match(page, /coupon: '考券价'/)
  assert.match(page, /full: '全额价'/)
  assert.match(page, /batch\.prices\.map/)
  assert.match(page, /剩余名额/)
  assert.match(page, /batch\.remaining_count/)
  assert.match(page, /考试时间/)
  assert.match(page, /CertBatchCard/)
  assert.match(shared, /badgeTone/)
  assert.match(stylesheet, /\.card\s*\{/)
  assert.match(stylesheet, /border-radius: 20px;/)
  assert.match(stylesheet, /box-shadow: 0 6px 20px rgba\(15, 23, 42, \.06\);/)
  assert.match(stylesheet, /linear-gradient\(90deg, #3366ff, #7c3aed\)/)
})

test('H3C public cards hide closed and finished batches using the shared state mechanism', async () => {
  const page = await readFile('src/pages/h3c/index.tsx', 'utf8')

  assert.match(page, /useCertificationBatchClock\(batches, load\)/)
  assert.match(page, /certificationBatchState\(batch, now\)\.visible/)
  const window = { apply_start: '2026-10-01T00:00:00+08:00', apply_end: '2026-10-20T00:00:00+08:00' }
  const time = Date.parse('2026-10-20T00:00:00+08:00')
  for (const status of ['published', 'registration_closed', 'finalized']) assert.equal(certificationBatchState({ ...window, status }, time).visible, false)
  assert.match(page, /actionText=\{statusMeta\.action\}/)
  assert.match(page, /actionDisabled=\{!canRegister\}/)
  assert.equal(page.includes('暂无可报名考试'), false)
})

test('H3C online-code branch links to the PDF guide and offers the alternative stamped-certificate branch', async () => {
  const page = await readFile('src/pages/h3c/form.tsx', 'utf8')
  const config = await readFile('config/index.ts', 'utf8')
  const service = await readFile('src/services/documentService.ts', 'utf8')

  assert.match(service, /h3c\.xuexin_verification_guide/)
  assert.match(service, /h3c_student_xuexin_guide/)
  assert.match(service, /\/api\/documents\/\$\{documentKey\}/)
  assert.match(service, /\/api\/documents\/scenes\/\$\{scene\}/)
  assert.match(service, /DEFAULT_H3C_XUEXIN_GUIDE_ENTRY_TEXT/)
  assert.match(page, /H3C_STUDENT_XUEXIN_GUIDE_SCENE/)
  assert.match(page, /getDocumentScene\(/)
  assert.match(page, /guideSlot\?\.entry_text/)
  assert.match(page, /<DocumentActions scene=\{H3C_STUDENT_XUEXIN_GUIDE_SCENE\}/)
  assert.match(page, /previewLabel='预览教程'/)
  assert.match(page, /学信网在线验证码必填/)
  assert.match(page, /studentMethod === 'online_code'/)
  assert.match(page, /上传清晰身份证人像面，用于核验学籍信息/)
  assert.match(page, /请上传有学院盖章的学籍证图片/)
  assert.doesNotMatch(config, /h3c\/assets\/docs/)
})
