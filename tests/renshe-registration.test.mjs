import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('Renshe uses the dedicated batch, draft, and submission services', async () => {
  const service = await readFile('src/services/rensheService.ts', 'utf8')

  assert.match(service, /getPublic<RenshePlan\[\]>\('\/api\/renshe\/batches'/)
  assert.match(service, /'\/api\/renshe\/applications\/draft'/)
  assert.match(service, /post<RensheSubmitResult>\(`\/api\/renshe\/applications\/\$\{id\}\/submit`, noticeHash/)
  assert.doesNotMatch(service, /post\(['`]\/api\/orders/)
  assert.match(service, /plan: RenshePlan/)
})

test('Renshe has a dedicated batch list and batch-bound form route', async () => {
  const [routes, appConfig, category, genericForm, certNavigation] = await Promise.all([
    readFile('src/constants/routes.ts', 'utf8'),
    readFile('src/app.config.ts', 'utf8'),
    readFile('src/pages/registration/category.tsx', 'utf8'),
    readFile('src/pages/registration/form.tsx', 'utf8'),
    readFile('src/utils/certNavigation.ts', 'utf8'),
  ])

  assert.match(routes, /RENSHE_INDEX: 'pages\/renshe\/index'/)
  assert.match(routes, /RENSHE_FORM: 'pages\/renshe\/form'/)
  assert.match(appConfig, /root: 'pages\/renshe'/)
  assert.match(appConfig, /'index', 'form'/)
  assert.match(category, /<CertificationLanding vendor=\{vendor\}/)
  assert.match(certNavigation, /ROUTES\.REGISTRATION_CATEGORY\}\?vendor=/)
  assert.match(genericForm, /ROUTES\.RENSHE_INDEX/)
  assert.doesNotMatch(appConfig, /form-renshe/)
  const rensheIndex = await readFile('src/pages/renshe/index.tsx', 'utf8')
  assert.match(rensheIndex, /<CertificationLanding vendor='renshe'/)
  assert.doesNotMatch(rensheIndex, /summaryCard/)
})

test('Renshe form freezes verified identity and prechecks all six materials', async () => {
  const form = await readFile('src/pages/renshe/form.tsx', 'utf8')

  assert.match(form, /useIdentityCheck\(\)/)
  assert.match(form, /身份证正面/)
  assert.match(form, /学信网电子注册备案表/)
  assert.match(form, /学历证明/)
  assert.match(form, /rensheService\.saveDraft/)
  assert.match(form, /rensheService\.submit\(saved\.id, correcting/)
  assert.match(form, /payment_required/)
  assert.match(form, /plan\.skill_level/)
  assert.match(form, /plan\.exam_type/)
  assert.match(form, /plan\.application_type/)
  assert.doesNotMatch(form, /createOrder/)
})

test('graduated Renshe form reads batch materials and retains historical profile support', async () => {
  const form = await readFile('src/pages/renshe/graduated-form.tsx', 'utf8')

  assert.match(form, /'id_card_front', 'id_card_back', 'portrait'/)
  assert.match(form, /avatar_oss/)
  assert.match(form, /registration_portrait/)
  assert.match(form, /毕业证/)
  assert.match(form, /学信网学历备案表/)
  assert.match(form, /500 KB/)
  assert.match(form, /历史批次继续使用原材料清单/)
  assert.match(form, /承诺书/)
})

test('Renshe forms keep the selected project through refreshes and isolate local drafts', async () => {
  const [form, graduated] = await Promise.all([
    readFile('src/pages/renshe/form.tsx', 'utf8'),
    readFile('src/pages/renshe/graduated-form.tsx', 'utf8'),
  ])
  assert.match(form, /function applyProjectPlan/)
  assert.match(form, /applyProjectPlan\(latestPlan/)
  assert.match(form, /loadRequest/)
  assert.match(form, /renshe:\$\{planDetail\.id\}:\$\{resolvedProjectId\}/)
  assert.match(form, /newRegistrationBlocked/)
  assert.match(graduated, /renshe_grad:\$\{plan\.id\}:\$\{batchProjectId \|\| 0\}/)
  assert.match(graduated, /newRegistrationBlocked/)
})

test('My registrations and the standalone detail page include Renshe records', async () => {
  const [list, detail] = await Promise.all([
    readFile('src/pages/mine/registrations.tsx', 'utf8'),
    readFile('src/pages/mine/registration-detail.tsx', 'utf8'),
  ])

  assert.match(list, /rensheService\.listApplications\(\)/)
  assert.match(list, /function rensheCard\(item: RensheApplicationListItem\)/)
  assert.match(list, /registrationDetailUrl\('renshe', item\.id\)/)
  assert.match(detail, /value === 'renshe'/)
  assert.match(detail, /rensheService\.getApplication\(registrationId\)/)
  assert.match(detail, /setRenshePlan\(detail\.plan\)/)
  assert.match(detail, /renshePlan\?\.skill_level/)
  assert.match(detail, /batch_project_id=\$\{rensheRegistration\.batch_project_id\}/)
  assert.match(detail, /cancelRenshePayment/)
  assert.match(detail, /requestRensheRefund/)
  assert.match(detail, /ROUTES\.RENSHE_FORM/)
})

test('Renshe form inputs scroll the inner view instead of pushing the page up', async () => {
  const [form, graduated, employment, title, reporting] = await Promise.all([
    readFile('src/pages/renshe/form.tsx', 'utf8'),
    readFile('src/pages/renshe/graduated-form.tsx', 'utf8'),
    readFile('src/pages/renshe/employment-fields.tsx', 'utf8'),
    readFile('src/pages/renshe/title-certificate-fields.tsx', 'utf8'),
    readFile('src/pages/renshe/reporting-fields.tsx', 'utf8'),
  ])

  for (const source of [form, graduated]) {
    assert.match(source, /scrollIntoView=\{scrollTarget\}/)
    assert.match(source, /Taro\.nextTick\(\(\) => setScrollTarget\(id\)\)/)
  }
  // 原生输入框不再由系统上推整页，改为聚焦时滚到字段
  assert.match(form, /adjustPosition=\{false\}/)
  assert.match(graduated, /adjustPosition=\{false\}/)
  assert.match(employment, /adjustPosition: false/)
  assert.match(title, /adjustPosition: false/)
  assert.match(reporting, /adjustPosition: false/)
})

test('Renshe submit failures are visible even when the form is scrolled away', async () => {
  const [form, graduated] = await Promise.all([
    readFile('src/pages/renshe/form.tsx', 'utf8'),
    readFile('src/pages/renshe/graduated-form.tsx', 'utf8'),
  ])

  // 固定底栏任意位置可点：阻断原因必须 toast，并滚到错误卡片
  assert.match(graduated, /const reject = \(message: string\)/)
  assert.match(graduated, /Taro\.showToast\(\{ title: message, icon: 'none', duration: 3000 \}\)/)
  assert.match(graduated, /focusField\('renshe-submit-error'\)/)
  assert.match(graduated, /id='renshe-submit-error'/)
  assert.match(form, /Taro\.showToast\(\{ title: firstError, icon: 'none', duration: 3000 \}\)/)
  assert.match(form, /id='renshe-submit-error'/)
})

test('Draft Renshe applications can resume from the detail page', async () => {
  const detail = await readFile('src/pages/mine/registration-detail.tsx', 'utf8')

  assert.match(detail, /const showRensheDraft = rensheRegistration\?\.status === 'draft'/)
  assert.match(detail, /showRensheDraft && rensheRegistration/)
  assert.match(detail, /继续填写报名/)
})

test('Commitment letter states the upload format before the user picks a file', async () => {
  const form = await readFile('src/pages/renshe/graduated-form.tsx', 'utf8')

  assert.match(form, /item\.kind === 'commitment_letter'/)
  assert.match(form, /请勿直接回传 docx/)
})

test('Education pickers stay disabled until reporting options load', async () => {
  const form = await readFile('src/pages/renshe/graduated-form.tsx', 'utf8')

  assert.match(form, /disabled=\{locked \|\| Boolean\(busy\) \|\| !options\}/)
})
