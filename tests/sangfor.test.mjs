import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import Taro from '@tarojs/taro'
import { sangforService } from '../src/services/sangforService.ts'
import { validateSangforForm, canApplySangfor } from '../src/utils/sangforForm.ts'
import { navigateToCertRegistration } from '../src/utils/certNavigation.ts'
import { isPublicPage, safeLoginTarget } from '../src/utils/loginTargets.ts'

const values = { phone: '13800000000', organization: '测试学院', first_name: 'Xiaofu', last_name: 'Shen', exam_voucher_code: 'VENDOR-123', email: '', mailing_address: '', remark1: '', remark2: '' }

test('Sangfor requires the actual vendor voucher and separate given/family pinyin without adding student documents or a dynamic code', () => {
  assert.deepEqual(validateSangforForm(values), {})
  for (const key of ['phone', 'organization', 'first_name', 'last_name', 'exam_voucher_code']) assert.ok(validateSangforForm({ ...values, [key]: ' ' })[key])
  assert.ok(validateSangforForm({ ...values, first_name: '小服' }).first_name)
  assert.ok(validateSangforForm({ ...values, email: 'invalid' }).email)
  assert.deepEqual(validateSangforForm({ ...values, first_name: 'Xiao Fu', last_name: "O'Neil" }), {})
})

test('public batches respect windows, capacity and batch state', () => {
  const batch = { status: 'published', exam_date: '2030-01-12', apply_start: '2030-01-01', apply_end: '2030-01-10', remaining_count: -1 }
  const time = Date.parse('2030-01-05')
  assert.equal(canApplySangfor(batch, time), true)
  for (const change of [{ status: 'registration_closed' }, { remaining_count: 0 }, { apply_end: '2030-01-03' }, { apply_start: '2030-01-08' }, { exam_date: null }]) assert.equal(canApplySangfor({ ...batch, ...change }, time), false)
})

test('Sangfor product cards go to public batches and login resume only accepts safe batch or correction parameters', () => {
  const calls = []
  Taro.navigateTo = options => calls.push(options)
  navigateToCertRegistration({ vendor: '深信服', code: 'SCSA-T' })
  assert.deepEqual(calls, [{ url: '/pages/sangfor/index?cert_code=SCSA-T' }])
  assert.equal(isPublicPage('/pages/sangfor/index?cert_code=SCSA-T'), true)
  assert.equal(isPublicPage('/pages/sangfor/form?batch_id=1'), false)
  assert.equal(safeLoginTarget('/pages/sangfor/form?batch_id=1'), '/pages/sangfor/form?batch_id=1')
  assert.equal(safeLoginTarget('/pages/sangfor/form?registration_id=2'), '/pages/sangfor/form?registration_id=2')
  assert.equal(safeLoginTarget('/pages/sangfor/form'), null)
  assert.equal(safeLoginTarget('/pages/sangfor/form?batch_id=1&exam_voucher_code=secret'), null)
})

test('Sangfor service separates anonymous batch reads from authenticated typed submissions and corrections', async () => {
  const storage = new Map(), calls = []
  Taro.getStorageSync = key => storage.get(key) || ''
  Taro.setStorageSync = (key, value) => storage.set(key, value)
  Taro.showLoading = () => {}; Taro.hideLoading = () => {}; Taro.showToast = () => {}
  Taro.request = async options => { calls.push(options); return { statusCode: 200, data: { code: 0, data: [], message: 'ok' } } }
  await sangforService.listBatches('SCSA-T')
  assert.equal(calls[0].header.Authorization, undefined)
  await assert.rejects(sangforService.create(7, values), error => error.statusCode === 401)
  assert.equal(calls.length, 1)
  storage.set('auth_token', 'token')
  await sangforService.create(7, values)
  await sangforService.resubmit(9, 3, values)
  assert.deepEqual(calls[1].data, { ...values, batch_id: 7 })
  assert.deepEqual(calls[2].data, { ...values, expected_revision: 3 })
  assert.equal(calls[1].header.Authorization, 'Bearer token')
  assert.equal(calls[1].data.coupon_code, undefined)
  assert.equal(calls[1].data.verification_code, undefined)
})

test('legacy Sangfor links redirect to public batches; active form and details use the shared registration layout', async () => {
  const legacy = await readFile('src/pages/registration/form-sangfor.tsx', 'utf8')
  const form = await readFile('src/pages/sangfor/form.tsx', 'utf8')
  assert.match(legacy, /redirectTo/); assert.doesNotMatch(legacy, /createOrder|验证码/)
  assert.match(form, /RegistrationSummary/); assert.match(form, /RegistrationSubmitBar/)
  assert.doesNotMatch(form, /validateCoupon|verification_code|xuexin|portrait_photo/)
})
