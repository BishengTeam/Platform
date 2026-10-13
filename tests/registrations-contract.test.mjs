import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('my registrations uses a standalone detail page for every vendor', async () => {
  const page = await readFile('src/pages/mine/registrations.tsx', 'utf8')
  const detail = await readFile('src/pages/mine/registration-detail.tsx', 'utf8')
  const routes = await readFile('src/constants/routes.ts', 'utf8')
  const appConfig = await readFile('src/app.config.ts', 'utf8')

  assert.match(page, /type H3cRegistrationCard = H3cRegistration & \{ type: 'H3C' \}/)
  assert.match(page, /type NispRegistrationCard = NispRegistration & \{\s*type: 'NISP'/)
  assert.match(page, /type UnifiedRegistration = H3cRegistrationCard \| NispRegistrationCard/)
  assert.match(page, /ROUTES\.MINE_REGISTRATION_DETAIL\}\?type=\$\{type\}&id=\$\{id\}/)
  assert.match(page, /openRegistrationDetail\('competition', reg\.id\)/)
  assert.doesNotMatch(page, /detailMask|detailSheet|setSelected\(/)
  assert.match(routes, /MINE_REGISTRATION_DETAIL: 'pages\/mine\/registration-detail'/)
  assert.match(appConfig, /'registration-detail'/)

  assert.match(detail, /const kind = parseRegistrationKind\(params\?\.type\)/)
  assert.match(detail, /if \(kind === 'h3c'\) \{[\s\S]*h3cService\.getRegistration\(registrationId\)/)
  assert.match(detail, /if \(kind === 'nisp'\) \{[\s\S]*nispService\.getRegistration\(registrationId\)/)
  assert.match(detail, /getMyCompetitionRegistrations\(\)/)
  assert.match(detail, /competitions\.find\(item => item\.id === registrationId\)/)
  assert.match(detail, /if \(certRegistration\.kind === 'H3C'\) \{[\s\S]*h3cService\.cancelPayment/)
  assert.match(detail, /nispService\.cancelPayment\(certRegistration\.id\)/)
  assert.match(detail, /nispService\.resubmitMaterials\(registration\.id/)
  assert.match(detail, /snapshotText\(certRegistration\?\.candidate_snapshot, 'exam_date'\)/)
  assert.match(detail, /certRegistration\.kind === 'NISP'[\s\S]*certRegistration\.status === 'final_approved'/)
  assert.match(detail, /www\.cisp\.cn/)
  assert.match(detail, /官网登录账号/)
  assert.match(detail, /snapshotText\(certRegistration\.candidate_snapshot, 'phone'\)/)
  assert.match(detail, /resolveMediaUrl\(certRegistration\.consultation_group_qrcode_url\)/)
  assert.match(detail, /批次咨询群聊码/)
  assert.match(detail, /加入本批次咨询群/)
  assert.match(detail, /<Image[\s\S]*?src=\{nispQrcodeUrl\}[\s\S]*?mode='aspectFit'/)
})

test('NISP picker indexes options with a validated numeric index', async () => {
  const page = await readFile('src/pages/nisp/form.tsx', 'utf8')

  assert.match(page, /const index = Number\(e\.detail\.value\)/)
  assert.match(page, /Number\.isInteger\(index\) && index >= 0 && index < options\.length/)
  assert.doesNotMatch(page, /options\[e\.detail\.value\]/)
})
