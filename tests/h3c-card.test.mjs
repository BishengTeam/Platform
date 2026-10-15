import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

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

test('H3C cards stay visible after enrollment closes or exam finishes', async () => {
  const page = await readFile('src/pages/h3c/index.tsx', 'utf8')

  assert.match(page, /published: \{ label: '报名中', buttonLabel: '立即报名'/)
  assert.match(page, /registration_closed: \{ label: '已截止', buttonLabel: '报名已结束'/)
  assert.match(page, /finalized: \{ label: '已结束', buttonLabel: '报名已结束'/)
  assert.match(page, /const canRegister = batch\.status === 'published'/)
  assert.match(page, /actionText=\{statusMeta\.buttonLabel\}/)
  assert.match(page, /actionDisabled=\{!canRegister\}/)
  assert.equal(page.includes('暂无可报名考试'), false)
})

test('H3C student registration keeps xuexin code required and links to the PDF guide', async () => {
  const page = await readFile('src/pages/h3c/form.tsx', 'utf8')
  const config = await readFile('config/index.ts', 'utf8')
  const service = await readFile('src/services/documentService.ts', 'utf8')

  assert.match(service, /h3c\.xuexin_verification_guide/)
  assert.match(service, /h3c_student_xuexin_guide/)
  assert.match(service, /\/api\/documents\/\$\{documentKey\}/)
  assert.match(service, /\/api\/documents\/scenes\/\$\{scene\}/)
  assert.match(service, /DEFAULT_H3C_XUEXIN_GUIDE_ENTRY_TEXT/)
  assert.match(page, /H3C_XUEXIN_VERIFICATION_GUIDE_KEY/)
  assert.match(page, /H3C_STUDENT_XUEXIN_GUIDE_SCENE/)
  assert.match(page, /getDocumentScene\(/)
  assert.match(page, /guideSlot\?\.entry_text/)
  assert.match(page, /getDocument\(/)
  assert.match(page, /Taro\.downloadFile\(\{ url: document\.download_url \}\)/)
  assert.match(page, /Taro\.openDocument\(/)
  assert.match(page, /fileType: 'pdf'/)
  assert.match(page, /教程文档暂未配置/)
  assert.match(page, /学信网在线验证码必填/)
  assert.match(page, /请上传身份证人像面清晰图片，JPG 格式/)
  assert.doesNotMatch(page, /如无学信网在线验证码/)
  assert.doesNotMatch(config, /h3c\/assets\/docs/)
})
