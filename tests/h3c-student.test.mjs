import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { H3C_EDUCATIONS, studentQualificationError, studentProofLabel } from '../src/utils/h3cStudent.ts'

test('H3C education uses only its five supported values without reclassifying unmatched profile values', async () => {
  assert.deepEqual(H3C_EDUCATIONS, ['本科', '中职', '高职', '硕士', '博士'])
  assert.equal(H3C_EDUCATIONS.includes('大学本科'), false)
  const form = await readFile('src/pages/h3c/form.tsx', 'utf8')
  assert.match(form, /<Picker mode='selector' range=\{H3C_EDUCATIONS\}/)
  assert.match(form, /个人资料中的学历不匹配，请重新选择/)
})

test('both student paths enforce their own required fields', () => {
  assert.equal(studentQualificationError('', 'CODE', 'proof'), '请选择学生资格核验方式')
  assert.equal(studentQualificationError('online_code', ' ', 'proof'), '请填写学信网在线验证码')
  assert.equal(studentQualificationError('online_code', 'CODE', ''), '请上传身份证人像面图片')
  assert.equal(studentQualificationError('online_code', 'CODE', 'proof'), null)
  assert.equal(studentQualificationError('stamped_certificate', '', ''), '请上传学院盖章的学籍证图片')
  assert.equal(studentQualificationError('stamped_certificate', '', 'proof'), null)
  assert.equal(studentProofLabel('stamped_certificate'), '学院盖章的学籍证图片')
})

test('changing verification method clears old material and code, and correction explicitly clears unused code', async () => {
  const form = await readFile('src/pages/h3c/form.tsx', 'utf8')
  const detail = await readFile('src/pages/mine/registration-detail.tsx', 'utf8')
  assert.match(form, /setStudentMethod\(event.detail.value[^]*?setStudentKey\(''\)[^]*?update\('verify_code', ''\)/)
  assert.match(form, /verify_code: type === 'student' && studentMethod === 'online_code' \? form.verify_code.trim\(\) : null/)
  assert.match(detail, /else fieldValues.verify_code = null/)
  assert.match(detail, /student_verification_method: verificationMethod/)
  assert.match(detail, /H3C_STUDENT_METHODS.map\(item => item.label\)/)
})
