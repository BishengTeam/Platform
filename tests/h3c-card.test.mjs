import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('H3C exam batch card separates prices and highlights urgent quota', async () => {
  const page = await readFile('src/pages/h3c/index.tsx', 'utf8')
  const stylesheet = await readFile('src/pages/h3c/h3c.module.scss', 'utf8')

  assert.match(page, /type: 'student', label: '学生价'/)
  assert.match(page, /type: 'coupon', label: '考券价'/)
  assert.match(page, /const formatPrice = \(batch: H3cExamBatch, type: H3cRegistrationType\)/)
  assert.match(page, /仅剩 \{batch\.remaining_count\} 名/)
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
