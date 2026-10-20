import assert from 'node:assert/strict'
import test from 'node:test'
import { findNispBatch, validateNispForm, nispErrorMessage } from '../src/utils/nispForm.ts'
import { workDateHint } from '../src/utils/rensheGraduated.ts'

const form = { name: '张三', pinyin: 'ZHANG SAN', major: '信息安全', school: '示例学校', id_card: '110101199001011234', phone: '13800138000', email: 'user@example.cn', province: '四川', gender: '男', age: '22', education: '本科', address: '示例地址', zip_code: '610000' }
const materials = { id_card_both_sides: 'id.pdf', portrait_photo: 'photo.jpg', xuexin_report: 'report.pdf', application_form: 'form.pdf' }

test('level one ignores level-two-only fields and materials', () => {
  const values = { ...form, gender: '', age: '', education: '', address: '', zip_code: '' }
  assert.deepEqual(validateNispForm(values, '1', { id_card_both_sides: 'id', portrait_photo: 'photo' }), {})
  const errors = validateNispForm(values, '2', {})
  for (const key of ['gender', 'age', 'education', 'address', 'zip_code', 'xuexin_report', 'application_form']) assert.ok(errors[key], key)
})

test('all visible missing fields have Chinese labels and deterministic first-error order', () => {
  const errors = validateNispForm({ ...form, pinyin: '  ', phone: '', email: '' }, '1', materials)
  assert.equal(Object.keys(errors)[0], 'pinyin')
  assert.equal(errors.pinyin, '请填写姓名拼音')
  assert.equal(errors.phone, '请填写手机号码')
  assert.equal(errors.email, '请填写邮箱')
})

test('format checks accept legitimate addresses and the server age boundaries', () => {
  for (const age of ['16', '80']) assert.deepEqual(validateNispForm({ ...form, age, email: '  name+tag@school.edu.cn  ' }, '2', materials), {})
  for (const age of ['15', '81', '22abc', '22.5']) assert.match(validateNispForm({ ...form, age }, '2', materials).age, /16至80之间的整数/)
  assert.match(validateNispForm({ ...form, email: 'bad@' }, '1', materials).email, /邮箱格式/)
  assert.match(validateNispForm({ ...form, zip_code: '61000x' }, '2', materials).zip_code, /6位数字/)
  assert.match(validateNispForm({ ...form, phone: '123' }, '1', materials).phone, /手机号格式/)
})

test('length checks follow API limits without inventing a pinyin-character eligibility rule', () => {
  assert.deepEqual(validateNispForm({ ...form, pinyin: 'a'.repeat(128), school: '校'.repeat(128) }, '1', materials), {})
  const errors = validateNispForm({ ...form, pinyin: 'a'.repeat(129), school: '校'.repeat(129) }, '1', materials)
  assert.match(errors.pinyin, /128/)
  assert.match(errors.school, /128/)
  assert.deepEqual(validateNispForm(form, '2', materials), {})
})

test('material errors identify each applicable upload independently', () => {
  const errors = validateNispForm(form, '2', { id_card_both_sides: 'id', portrait_photo: 'portrait' })
  assert.deepEqual(errors, { xuexin_report: '请上传学籍验证报告', application_form: '请上传二级申请表' })
})

test('invalid or unavailable batches are distinct from a failed request; failures can retry', async () => {
  let calls = 0
  const batch = { id: 42, level: '2', name: '二级批次' }
  const load = async () => { calls++; if (calls === 1) throw new Error('offline'); return [batch] }
  await assert.rejects(findNispBatch(42, load), /offline/)
  assert.equal(await findNispBatch(42, load), batch)
  assert.equal(await findNispBatch(43, async () => [batch]), null)
  for (const id of [0, -1, NaN, 1.5]) assert.equal(await findNispBatch(id, () => { throw new Error('must not request') }), null)
})

test('server field identifiers become Chinese and network internals do not leak into feedback', () => {
  assert.equal(nispErrorMessage(new Error('NISP二级必须填写 pinyin'), '提交失败'), 'NISP二级必须填写 姓名拼音')
  assert.equal(nispErrorMessage(new Error('request:fail timeout'), '提交失败，请重试'), '提交失败，请重试')
  assert.match(nispErrorMessage(new Error('UNAUTHORIZED'), '失败'), /重新登录/)
})

test('work-date hints follow actual batch requirements for both Renshe entry points', () => {
  const rules = { confirmed: true, date_rule: 'work_only', years_rule: 'required', allow_zero_years: true }
  for (const worked of [true, false, undefined]) {
    const optional = workDateHint({ ...rules, work_date_required: false }, worked)
    assert.doesNotMatch(optional, /必须|须填写/)
    assert.match(optional, /管理员人工审核/)
  }
  assert.match(workDateHint({ ...rules, work_date_required: true }, true), /须填写真实参加工作日期/)
  assert.match(workDateHint({ ...rules, work_date_required: true }, false), /核实适用路径/)
  assert.match(workDateHint(undefined), /正在加载/)
})
