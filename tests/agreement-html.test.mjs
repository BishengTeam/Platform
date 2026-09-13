import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeAgreementHtml } from '../src/utils/agreementHtml.ts'

test('removes empty paragraphs that render as mystery blank lines', () => {
  assert.equal(
    normalizeAgreementHtml('<p><br></p><p style="text-align: left;"><br></p><p>正文</p>'),
    '<p style="margin:0 0 12px;">正文</p>',
  )
})

test('injects table borders and full width into rich text tables', () => {
  const out = normalizeAgreementHtml('<table><thead><tr><th>类别</th></tr></thead><tbody><tr><td>姓名</td></tr></tbody></table>')
  assert.match(out, /<table style="width:100%;max-width:100%;border-collapse:collapse;table-layout:fixed;">/)
  assert.match(out, /<th style="border:1px solid #d9d9d9;padding:8px 10px;word-break:break-word;">/)
  assert.match(out, /<td style="border:1px solid #d9d9d9;padding:8px 10px;word-break:break-word;">/)
})

test('uses an explicit pixel table width for WeChat rich-text', () => {
  const out = normalizeAgreementHtml('<table><tr><td>a</td></tr></table>', { tableWidthPx: 319 })
  assert.match(out, /<table style="width:319px;max-width:100%;border-collapse:collapse;table-layout:fixed;">/)
})

test('merges injected styles with existing inline styles', () => {
  const out = normalizeAgreementHtml('<p style="text-align: left;">正文</p>')
  assert.equal(out, '<p style="text-align: left;margin:0 0 12px;">正文</p>')
})

test('keeps images inside the card width', () => {
  const out = normalizeAgreementHtml('<img src="https://example.com/a.png">')
  assert.match(out, /<img style="max-width:100%;height:auto;" src="https:\/\/example\.com\/a\.png">/)
})
