import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const file = (p) => new URL(`../src/${p}`, import.meta.url)

test('NISP pages are registered in the subpackage and reachable via ROUTES', async () => {
  const appConfig = await readFile(file('app.config.ts'), 'utf8')
  const nispBlock = appConfig.match(/root: 'pages\/nisp',\s*pages: \[([^\]]*)\]/)?.[1] ?? ''
  assert.match(nispBlock, /'index'/)
  assert.match(nispBlock, /'form'/)

  // ROUTES 键缺失会让运行时拼出 /undefined，NISP 报名入口直接失联
  const routes = await readFile(file('constants/routes.ts'), 'utf8')
  assert.match(routes, /NISP_INDEX: 'pages\/nisp\/index'/)
  assert.match(routes, /NISP_FORM: 'pages\/nisp\/form'/)
  // 两个使用点必须走 ROUTES 常量，保证键值同步
  const nispIndexPage = await readFile(file('pages/nisp/index.tsx'), 'utf8')
  assert.match(nispIndexPage, /ROUTES\.NISP_FORM\}\?batch_id=/)
  const categoryPage = await readFile(file('pages/registration/category.tsx'), 'utf8')
  assert.match(categoryPage, /ROUTES\.NISP_INDEX/)
})

test('NISP form uploads each material with its own backend material type', async () => {
  const form = await readFile(file('pages/nisp/form.tsx'), 'utf8')

  assert.match(form, /uploadFile\(setIdCardKey, 'id_card_both_sides'\)/)
  assert.match(form, /uploadFile\(setPortraitKey, 'portrait_photo'\)/)
  assert.match(form, /uploadFile\(setXuexinKey, 'xuexin_report'\)/)
  assert.match(form, /uploadFile\(setAppFormKey, 'application_form'\)/)
  assert.match(form, /nispService\.uploadMaterial\(\s*filePath,\s*fileType,\s*originalFilename,/)
  assert.match(form, /extension: \['pdf'\]/)
  assert.match(form, /batch\?\.max_material_bytes/)
  assert.equal(form.includes("fileType === 'image' ? 'portrait_photo' : 'id_card_both_sides'"), false)
})

test('NISP level-two form exposes managed report guide and application template', async () => {
  const form = await readFile(file('pages/nisp/form.tsx'), 'utf8')
  const service = await readFile(file('services/documentService.ts'), 'utf8')
  const styles = await readFile(file('pages/nisp/nisp.module.scss'), 'utf8')

  assert.match(service, /NISP_EDUCATION_REPORT_GUIDE_SCENE = 'nisp_education_report_guide'/)
  assert.match(service, /NISP_LEVEL2_APPLICATION_FORM_SCENE = 'nisp_level2_application_form'/)
  assert.match(form, /getDocumentScene\(NISP_EDUCATION_REPORT_GUIDE_SCENE\)/)
  assert.match(form, /getDocumentScene\(NISP_LEVEL2_APPLICATION_FORM_SCENE\)/)
  assert.match(form, /DEFAULT_NISP_EDUCATION_REPORT_ENTRY_TEXT/)
  assert.match(form, /DEFAULT_NISP_APPLICATION_FORM_ENTRY_TEXT/)
  assert.match(form, /Taro\.downloadFile\(\{ url: document\.download_url \}\)/)
  assert.match(form, /Taro\.openDocument\(/)
  assert.match(form, /文档暂未配置，请联系管理员/)
  assert.match(service, /查看《学历证书电子注册备案表》查询步骤PDF/)
  assert.match(service, /下载《NISP二级考试报名申请表》PDF/)
  assert.match(styles, /\.guideLink\s*\{/)
})

test('NISP order creation goes to the unified payment confirm page with order id', async () => {
  const form = await readFile(file('pages/nisp/form.tsx'), 'utf8')

  assert.match(form, /Taro\.redirectTo\(\{\s*url: `\/\$\{ROUTES\.REGISTRATION_CONFIRM\}\?order_id=\$\{registration\.order_id\}/)
  assert.doesNotMatch(form, /PAYMENT_RESULT\?order_id=\$\{registration\.id\}/)
})

test('NISP submission gates the latest certification registration agreement', async () => {
  const form = await readFile(file('pages/nisp/form.tsx'), 'utf8')

  assert.match(form, /const \[agreed, setAgreed\] = useState\(false\)/)
  assert.match(form, /if \(!agreed\)/)
  assert.match(form, /<AgreementCheckbox agreed=\{agreed\} onChange=\{setAgreed\}>/)
  assert.match(form, /AGREEMENT_VIEW\}\?type=cert_registration&requireSign=1/)
  assert.match(form, /ensureAgreementSigned\(\s*'cert_registration'/)
  assert.match(form, /AGREEMENT_TYPE_CERT_REGISTRATION/)
  assert.match(form, /提交认证报名前，请先阅读并同意认证报名信息处理授权协议/)

  const beforeCreateOrder = form.indexOf('ensureAgreementSigned')
  const createOrderCall = form.indexOf('nispService.createOrder(payload)')
  assert.ok(beforeCreateOrder > -1)
  assert.ok(createOrderCall > beforeCreateOrder)
})

test('NISP uses only the dedicated batch form route', async () => {
  const appConfig = await readFile(file('app.config.ts'), 'utf8')
  const routes = await readFile(file('constants/routes.ts'), 'utf8')

  assert.doesNotMatch(appConfig, /form-nisp/)
  assert.doesNotMatch(routes, /REGISTRATION_FORM_NISP/)
  assert.doesNotMatch(routes, /pages\/registration\/form-nisp/)
})

test('NISP level entry isolates batches while preserving the legacy all-level route', async () => {
  const service = await readFile(file('services/nispService.ts'), 'utf8')
  const index = await readFile(file('pages/nisp/index.tsx'), 'utf8')
  const category = await readFile(file('pages/registration/category.tsx'), 'utf8')
  const activityDetail = await readFile(file('pages/activity-zone/detail.tsx'), 'utf8')

  assert.match(service, /async listBatches\(level\?: NispLevel\)/)
  assert.match(service, /level \? \{ level \} : undefined/)
  assert.match(service, /getNispLevelFromCertCode/)

  assert.match(index, /const routeLevel = params\?\.level/)
  assert.match(index, /routeLevel === '1' \|\| routeLevel === '2'/)
  assert.match(index, /nispService\.listBatches\(level\)/)
  assert.match(index, /level === '1' \? 'NISP 一级' : level === '2' \? 'NISP 二级' : 'NISP 认证'/)
  assert.match(index, /该级别批次暂未开放，敬请期待/)

  for (const page of [category, activityDetail]) {
    assert.match(page, /getNispLevelFromCertCode\(cert\.code\)/)
    assert.match(page, /ROUTES\.NISP_INDEX\}\?level=\$\{level\}/)
  }
})

test('NISP pages keep symmetric margins and use compact field groups', async () => {
  const styles = await readFile(file('pages/nisp/nisp.module.scss'), 'utf8')
  const body = styles.match(/\.body \{[\s\S]*?\}/)?.[0] ?? ''

  assert.match(body, /box-sizing:\s*border-box/)
  assert.match(body, /width:\s*100%/)
  assert.match(body, /overflow-x:\s*hidden/)
  assert.match(body, /padding:\s*\$spacing-md \$spacing-lg/)
  assert.match(styles, /\.fieldGrid,[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/)
  assert.match(styles, /\.uploadGrid[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/)
  assert.match(styles, /\.fieldWide \{ grid-column: 1 \/ -1; \}/)
})
