import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('Renshe uses the dedicated batch, draft, and submission services', async () => {
  const service = await readFile('src/services/rensheService.ts', 'utf8')

  assert.match(service, /get<RenshePlan\[\]>\('\/api\/renshe\/batches'/)
  assert.match(service, /'\/api\/renshe\/applications\/draft'/)
  assert.match(service, /post<RensheSubmitResult>\(`\/api\/renshe\/applications\/\$\{id\}\/submit`\)/)
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
  // 分类页按认证跳转委托给 certNavigation 统一处理，人社分支收敛在其中
  assert.match(category, /navigateToCertRegistration\(cert\)/)
  assert.match(certNavigation, /ROUTES\.RENSHE_INDEX\}\?project_id=\$\{cert\.id\}/)
  assert.match(genericForm, /ROUTES\.RENSHE_INDEX/)
  assert.doesNotMatch(appConfig, /form-renshe/)
  const rensheIndex = await readFile('src/pages/renshe/index.tsx', 'utf8')
  assert.match(rensheIndex, /已取得毕业证/)
  assert.match(rensheIndex, /project_id/)
  assert.match(rensheIndex, /CertBatchCard/)
  assert.match(rensheIndex, /ZoneCard/)
  assert.match(rensheIndex, /该产品暂无开放批次/)
  assert.doesNotMatch(rensheIndex, /summaryCard/)
})

test('Renshe form freezes verified identity and prechecks all six materials', async () => {
  const form = await readFile('src/pages/renshe/form.tsx', 'utf8')

  assert.match(form, /useIdentityCheck\(\)/)
  assert.match(form, /身份证正面/)
  assert.match(form, /学信网电子注册备案表/)
  assert.match(form, /学历证明/)
  assert.match(form, /rensheService\.saveDraft/)
  assert.match(form, /rensheService\.submit\(saved\.id\)/)
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

test('My registrations and the standalone detail page include Renshe records', async () => {
  const [list, detail] = await Promise.all([
    readFile('src/pages/mine/registrations.tsx', 'utf8'),
    readFile('src/pages/mine/registration-detail.tsx', 'utf8'),
  ])

  assert.match(list, /rensheService\.listApplications\(\)/)
  assert.match(list, /openRegistrationDetail\('renshe', item\.id\)/)
  assert.match(detail, /value === 'renshe'/)
  assert.match(detail, /rensheService\.getApplication\(registrationId\)/)
  assert.match(detail, /setRenshePlan\(detail\.plan\)/)
  assert.match(detail, /renshePlan\?\.skill_level/)
  assert.match(detail, /cancelRenshePayment/)
  assert.match(detail, /requestRensheRefund/)
  assert.match(detail, /ROUTES\.RENSHE_FORM/)
})
