import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import Taro from '@tarojs/taro'
import { navigateToCertRegistration } from '../src/utils/certNavigation.ts'

test('all four vendors have one registration channel rather than a product CTA per card', async () => {
  const vendors = { h3c: 'H3C', nisp: 'NISP', renshe: '人社', sangfor: '深信服' }
  const calls = []
  Taro.navigateTo = value => calls.push(value.url)
  for (const [key, vendor] of Object.entries(vendors)) {
    const page = await readFile(`src/pages/${key}/index.tsx`, 'utf8')
    assert.match(page, new RegExp(`<CertificationLanding vendor='${key}'`))
    navigateToCertRegistration({ id: 7, vendor, code: 'TEST-SUBJECT' })
    assert.equal(calls.at(-1), '/pages/registration/category?vendor=' + encodeURIComponent(vendor))
  }
  const landing = await readFile('src/components/CertificationEnrollment/index.tsx', 'utf8')
  assert.equal((landing.match(/>立即报名<\/Button>/g) || []).length, 1)
  assert.match(landing, /\/pages\/registration\/notice\?type=/)
  assert.match(landing, /RefreshableScrollView/)
})

test('notice keeps subject, batch, H3C method and real fees in a single selection flow', async () => {
  const page = await readFile('src/pages/registration/notice.tsx', 'utf8')
  assert.match(page, /报考科目/)
  assert.match(page, /报名批次/)
  assert.match(page, /报名方式/)
  assert.match(page, /subject_id === subjectId/)
  assert.match(page, /batch\.prices\.map/)
  assert.match(page, /notice\.price\.price_cents/)
  assert.match(page, /setAgreedHash\(''\)/)
  assert.match(page, /latest\.notice_hash !== notice\.notice_hash/)
})
