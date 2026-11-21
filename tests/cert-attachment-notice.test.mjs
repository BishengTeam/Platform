import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

test('registration notice shows batch and vendor attachments before the notice body', async () => {
  const page = await readFile('src/pages/registration/notice.tsx', 'utf8')

  assert.match(page, /certificationJourneyService\.planAttachments\(vendor, batch\.plan_id\)/)
  assert.match(page, /<CertAttachmentList attachments=\{attachments\}/)
  assert.match(page, /attachmentsGuard\.current\.isCurrent\(token\)/)
  assert.match(page, /\}, \[vendor, batch\]\)/)
  assert.match(page, /报名注意事项/)
  assert.match(page, /notice\.registration_notice/)
  // 深信服与 H3C 一样由预约决定考试时间/地点
  assert.match(page, /vendor === 'h3c' \|\| vendor === 'sangfor' \? '报名审核通过后预约'/)
  assert.match(page, /vendor === 'h3c' \|\| vendor === 'sangfor' \? '考场地址以预约结果为准'/)
  // 附件卡位置必须在须知正文之前
  assert.ok(
    page.indexOf('<CertAttachmentList') < page.indexOf('{notice.notice.title}'),
    'attachment card should render before the notice body',
  )
})

test('sangfor form surfaces registration notice and compact attachments', async () => {
  const page = await readFile('src/pages/sangfor/form.tsx', 'utf8')

  assert.match(page, /batch\?\.registration_notice/)
  assert.match(page, /registration\?\.registration_notice/)
  assert.match(page, /registration\?\.batch_snapshot\?\.registration_notice/)
  assert.match(page, /certificationJourneyService\.planAttachments\('sangfor'/)
  assert.match(page, /attachmentsGuard\.current\.isCurrent\(token\)/)
  assert.match(page, /registration\?\.batch_id/)
  assert.match(page, /<CertAttachmentList attachments=\{attachments\}/)
})

test('journey panel renders activation guidance and revoked state', async () => {
  const panel = await readFile('src/components/CertificationEnrollment/JourneyPanel.tsx', 'utf8')

  assert.match(panel, /registration_code_info\?\.revoked/)
  assert.match(panel, /报名码已失效（退款关闭）/)
  assert.match(panel, /激活步骤/)
  assert.match(panel, /复制官网地址/)
  assert.match(panel, /报名码仅限本人使用/)
})

test('attachment list copies links for non-previewable files and guards duplicate taps', async () => {
  const component = await readFile('src/components/CertAttachmentList/index.tsx', 'utf8')

  assert.match(component, /const OPENABLE = \['pdf'/)
  assert.match(component, /if \(downloading\) return/)
  assert.match(component, /下载链接已复制，请在浏览器打开/)
  assert.match(component, /aria-role='button'/)
})
