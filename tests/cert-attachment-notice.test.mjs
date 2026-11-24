import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import {
  attachmentBytesMatchType,
  attachmentDocumentType,
} from '../src/utils/attachmentFile.ts'

test('registration notice shows batch and vendor attachments before the notice body', async () => {
  const detail = await readFile('src/components/CertificationEnrollment/NoticeDetail.tsx', 'utf8')

  assert.match(detail, /certificationJourneyService\.planAttachments\(vendor, planId\)/)
  assert.match(detail, /<CertAttachmentList attachments=\{attachments\}/)
  assert.match(detail, /attachmentsGuard\.current\.isCurrent\(token\)/)
  assert.match(detail, /\}, \[vendor, planId\]\)/)
  assert.match(detail, /报名注意事项/)
  assert.match(detail, /notice\.registration_notice/)
  assert.match(detail, /notice\.exam_org_name/)
  assert.match(detail, /notice\.exam_date_note/)
  // 深信服与 H3C 一样由预约决定考试时间/地点
  assert.match(detail, /vendor === 'h3c' \|\| vendor === 'sangfor' \? '报名审核通过后预约'/)
  assert.match(detail, /vendor === 'h3c' \|\| vendor === 'sangfor' \? '考场地址以预约结果为准'/)
  // 附件卡位置必须在须知正文之前
  assert.ok(
    detail.indexOf('<CertAttachmentList') < detail.indexOf('{notice.notice.title}'),
    'attachment card should render before the notice body',
  )
})

test('notice page and form-page dialog share the same notice body', async () => {
  const page = await readFile('src/pages/registration/notice.tsx', 'utf8')
  const dialog = await readFile('src/components/CertificationEnrollment/NoticeDialog.tsx', 'utf8')

  assert.match(page, /<NoticeDetail vendor=\{vendor\} notice=\{notice\}/)
  assert.match(dialog, /<NoticeDetail vendor=\{vendor\} notice=\{notice\}/)
  // 表单页已锁定批次，再确认须知走弹窗而不是再跳一次报名须知页
  const summary = await readFile('src/components/CertificationEnrollment/ConfirmationSummary.tsx', 'utf8')
  assert.match(summary, /<NoticeDialog[\s>]/)
  assert.doesNotMatch(summary, /Taro\.navigateTo\(\{ url: `\/pages\/registration\/notice/)
  // 弹窗内仍保留换科目／批次的入口，回真正会重建表单的报名须知页
  assert.match(dialog, /\/pages\/registration\/notice\?type=\$\{vendor\}/)
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

  // txt 不在微信 openDocument 支持范围内，必须走复制链接，不能被当成可预览
  assert.doesNotMatch(component, /txt: 'txt'/)
  assert.equal(attachmentDocumentType('/api/media/cert-attachments/guide.pdf?download=1'), 'pdf')
  assert.equal(attachmentDocumentType('/api/media/cert-attachments/template.DOCX'), 'docx')
  assert.equal(attachmentDocumentType('/api/media/cert-attachments/archive.zip'), null)
  assert.equal(attachmentBytesMatchType('pdf', new TextEncoder().encode('%PDF-1.7')), true)
  assert.equal(attachmentBytesMatchType('docx', new Uint8Array([0x50, 0x4b, 0x03, 0x04])), true)
  assert.equal(attachmentBytesMatchType('pdf', new TextEncoder().encode('<html>error</html>')), false)
  assert.match(component, /fileType,[\s\S]*showMenu: true/)
  assert.match(component, /result\.statusCode !== 200/)
  assert.match(component, /附件内容无效或已损坏/)
  assert.match(component, /if \(downloading\) return/)
  assert.match(component, /下载链接已复制，请在浏览器打开/)
  assert.match(component, /aria-role='button'/)
})

test('attachment downloads pass an explicit fileType and reject failed responses', async () => {
  const component = await readFile('src/components/CertAttachmentList/index.tsx', 'utf8')

  // 临时文件路径没有可靠后缀，openDocument 必须显式传 fileType
  assert.match(component, /openDocument\(\{[\s\S]*?filePath: result\.tempFilePath,[\s\S]*?fileType,[\s\S]*?showMenu: true,[\s\S]*?\}\)/)
  // downloadFile 对 404/500 也会 resolve，必须自己校验 statusCode
  assert.match(component, /result\.statusCode !== 200/)
})
