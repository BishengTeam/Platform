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
  assert.match(form, /nispService\.uploadMaterial\(filePath, fileType\)/)
  assert.equal(form.includes("fileType === 'image' ? 'portrait_photo' : 'id_card_both_sides'"), false)
})

test('NISP order creation goes to the unified payment confirm page with order id', async () => {
  const form = await readFile(file('pages/nisp/form.tsx'), 'utf8')

  assert.match(form, /Taro\.redirectTo\(\{\s*url: `\/\$\{ROUTES\.REGISTRATION_CONFIRM\}\?order_id=\$\{registration\.order_id\}/)
  assert.doesNotMatch(form, /PAYMENT_RESULT\?order_id=\$\{registration\.id\}/)
})

test('NISP submission gates the latest certification registration agreement', async () => {
  const form = await readFile(file('pages/nisp/form.tsx'), 'utf8')

  assert.match(form, /ensureAgreementSigned\(\s*'cert_registration'/)
  assert.match(form, /AGREEMENT_TYPE_CERT_REGISTRATION/)
  assert.match(form, /提交认证报名前，请先阅读并同意认证报名信息处理授权协议/)

  const beforeCreateOrder = form.indexOf('ensureAgreementSigned')
  const createOrderCall = form.indexOf('nispService.createOrder(payload)')
  assert.ok(beforeCreateOrder > -1)
  assert.ok(createOrderCall > beforeCreateOrder)
})
