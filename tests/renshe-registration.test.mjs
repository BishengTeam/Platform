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
  assert.match(routes, /RENSHE_DETAIL: 'pages\/renshe\/detail'/)
  assert.match(routes, /RENSHE_FORM: 'pages\/renshe\/form'/)
  assert.match(appConfig, /root: 'pages\/renshe'/)
  assert.match(appConfig, /'index', 'detail', 'form'/)
  // 分类页按认证跳转委托给 certNavigation 统一处理，人社分支收敛在其中
  assert.match(category, /navigateToCertRegistration\(cert\)/)
  assert.match(certNavigation, /ROUTES\.RENSHE_INDEX/)
  assert.match(genericForm, /ROUTES\.RENSHE_INDEX/)
  assert.doesNotMatch(appConfig, /form-renshe/)
  const rensheIndex = await readFile('src/pages/renshe/index.tsx', 'utf8')
  assert.doesNotMatch(rensheIndex, /学历型/)
  assert.match(rensheIndex, /先选择报考项目/)
  assert.match(rensheIndex, /报名资格和材料要求以所选批次为准/)
  assert.doesNotMatch(rensheIndex, /请联系老师发布/)
})

test('Renshe separates project list, project detail, and batch-bound form', async () => {
  const [index, detail, batchCard, projectCard, form] = await Promise.all([
    readFile('src/pages/renshe/index.tsx', 'utf8'),
    readFile('src/pages/renshe/detail.tsx', 'utf8'),
    readFile('src/components/RensheBatchCard/index.tsx', 'utf8'),
    readFile('src/components/RensheProjectCard/index.tsx', 'utf8'),
    readFile('src/pages/renshe/form.tsx', 'utf8'),
  ])

  assert.match(index, /RENSHE_DETAIL\}.*project_id=\$\{project\.id\}/)
  assert.match(index, /Promise\.allSettled/)
  assert.doesNotMatch(index, /selectedProject/)

  assert.match(detail, /useRouter\(\)/)
  assert.match(detail, /listBatches\(projectId\)/)
  assert.match(detail, /项目概览/)
  assert.match(detail, /报考须知/)
  assert.match(detail, /报名流程/)
  assert.match(detail, /可报名批次/)
  assert.match(detail, /RensheBatchCard/)
  assert.match(detail, /listApplications\(1, 100\)/)
  assert.match(detail, /getBatch\(batch\.id\)/)
  assert.match(detail, /该批次名额已满/)
  assert.match(detail, /该批次报名已结束/)

  assert.match(projectCard, /home_cover_url/)
  assert.match(projectCard, /resolveMediaUrl/)
  assert.match(projectCard, /暂无开放批次/)
  assert.match(projectCard, /批次状态待确认/)

  assert.match(batchCard, /查看本批次资格与材料要求/)
  assert.match(batchCard, /选择本批次/)
  assert.match(batchCard, /查看我的报名/)
  assert.match(batchCard, /名额已满/)
  assert.match(batchCard, /报名已结束/)
  assert.match(batchCard, /project_id=/)
  assert.match(batchCard, /onSelect/)
  assert.doesNotMatch(batchCard, /batch\.skill_level/)

  assert.match(form, /project_id/)
  assert.match(form, /RENSHE_DETAIL/)
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
