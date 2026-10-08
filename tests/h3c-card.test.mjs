import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('H3C exam batch card separates prices and highlights urgent quota', async () => {
  const page = await readFile('src/pages/h3c/index.tsx', 'utf8')
  const stylesheet = await readFile('src/pages/h3c/h3c.module.scss', 'utf8')

  assert.match(page, /type: 'student', label: '学生价'/)
  assert.match(page, /type: 'coupon', label: '考券价'/)
  assert.match(page, /const formatPrice = \(batch: H3cExamBatch, type: H3cRegistrationType\)/)
  assert.match(page, /仅剩 \$\{batch\.remaining_count\} 名/)
  assert.match(page, /🕒/)
  assert.match(page, /👥/)
  assert.equal(page.includes("join(' / ')"), false)

  assert.match(stylesheet, /\.examCard\s*\{/)
  assert.match(stylesheet, /border-radius: 32px;/)
  assert.match(stylesheet, /box-shadow: 0 8px 40px rgba\(0, 0, 0, \.05\);/)
  assert.match(stylesheet, /border: 1px solid #f1f5f9;/)
  assert.match(stylesheet, /color: #1d2129;/)
  assert.match(stylesheet, /color: #ff7d00;/)
  assert.match(stylesheet, /font-family: 'DIN Alternate', 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif;/)
  assert.match(stylesheet, /background: #165dff;/)
  assert.match(stylesheet, /border-radius: 999px;/)
  assert.match(stylesheet, /\.actionButton:active\s*\{[^}]*opacity: \.92;/)
})

test('H3C cards stay visible after enrollment closes or exam finishes', async () => {
  const page = await readFile('src/pages/h3c/index.tsx', 'utf8')

  assert.match(page, /published: \{ label: '报名中', buttonLabel: '立即报名'/)
  assert.match(page, /registration_closed: \{ label: '报名已关闭', buttonLabel: '报名已关闭'/)
  assert.match(page, /finalized: \{ label: '已结束', buttonLabel: '已结束'/)
  assert.match(page, /const canRegister = batch\.status === 'published'/)
  assert.match(page, /disabled=\{!canRegister\}/)
  assert.match(page, /\{statusMeta\.buttonLabel\}/)
  assert.match(page, /color=\{canRegister \? '#165DFF' : '#94A3B8'\}/)
  assert.match(page, /\{canRegister \? `仅剩 \$\{batch\.remaining_count\} 名` : `\$\{batch\.remaining_count\} 名`\}/)
  assert.equal(page.includes('暂无可报名考试'), false)
})

test('H3C student registration keeps xuexin code required and links to the PDF guide', async () => {
  const page = await readFile('src/pages/h3c/form.tsx', 'utf8')
  const config = await readFile('config/index.ts', 'utf8')
  const service = await readFile('src/services/documentService.ts', 'utf8')

  assert.match(service, /h3c\.xuexin_verification_guide/)
  assert.match(service, /\/api\/documents\/\$\{documentKey\}/)
  assert.match(page, /H3C_XUEXIN_VERIFICATION_GUIDE_KEY/)
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
