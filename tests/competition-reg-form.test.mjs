import assert from 'node:assert/strict'
import test from 'node:test'
import {
  emptyCompetitionRegFormValues,
  validateCompetitionRegForm,
} from '../src/components/CompetitionRegForm/validate.ts'

const fields = [
  { key: 'student_id', label: '学号', type: 'text', required: true, sort_order: 0 },
  { key: 'idcard', label: '身份证号', type: 'idcard', required: false, sort_order: 1 },
  { key: 'skills', label: '技能标签', type: 'checkbox', required: true, options: ['前端', '安全'], sort_order: 2 },
]

test('base form requires school, name and phone', () => {
  assert.equal(validateCompetitionRegForm(emptyCompetitionRegFormValues(), []), '请输入学校')
  assert.equal(
    validateCompetitionRegForm({ ...emptyCompetitionRegFormValues(), school: '成都工业' }, []),
    '请输入姓名',
  )
  assert.equal(
    validateCompetitionRegForm({ ...emptyCompetitionRegFormValues(), school: '成都工业', real_name: '林安', phone: '123' }, []),
    '请输入正确的手机号',
  )
})

test('custom required and format rules are enforced', () => {
  const base = { ...emptyCompetitionRegFormValues(), school: '成都工业', real_name: '林安', phone: '13800138000' }
  assert.equal(validateCompetitionRegForm(base, fields), '请填写学号')
  assert.equal(
    validateCompetitionRegForm({ ...base, custom: { student_id: '20260001', skills: [] } }, fields),
    '请填写技能标签',
  )
  assert.equal(
    validateCompetitionRegForm(
      { ...base, custom: { student_id: '20260001', skills: ['前端'], idcard: '123' } },
      fields,
    ),
    '身份证号必须为18位',
  )
  assert.equal(
    validateCompetitionRegForm(
      { ...base, custom: { student_id: '20260001', skills: ['前端'], idcard: '510101199001011234' } },
      fields,
    ),
    null,
  )
})
