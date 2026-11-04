import assert from 'node:assert/strict'
import test from 'node:test'
import Taro from '@tarojs/taro'
import { currentNotice, rememberNotice, enrollmentDeadline, enrollmentFormUrl, enrollmentDetailUrl, rememberEnrollmentContact, enrollmentContactDraft } from '../src/utils/enrollment.ts'
import { safeLoginTarget, isPublicPage } from '../src/utils/loginTargets.ts'
import { certificationBatchState } from '../src/utils/certificationBatch.ts'
import { clearAuthTokens } from '../src/utils/authState.ts'

const batch = { id: 7, plan_id: 28, level: '2', status: 'published', apply_start: '2026-11-01T00:00:00+08:00', apply_end: '2026-11-20T23:59:00+08:00', remaining_count: 2, can_apply: true }
test('one selected batch dispatches to the correct dedicated form with no personal data', () => {
  assert.equal(enrollmentFormUrl('h3c', batch, 'student'), '/pages/h3c/form?batch_id=7&registration_type=student')
  assert.equal(enrollmentFormUrl('nisp', batch, '2'), '/pages/nisp/form?batch_id=7&level=2')
  assert.equal(enrollmentFormUrl('renshe', batch, 'default'), '/pages/renshe/form?plan_id=7')
  assert.equal(enrollmentFormUrl('sangfor', batch, 'default'), '/pages/sangfor/form?batch_id=7')
  for (const vendor of ['h3c', 'nisp', 'renshe', 'sangfor']) assert.ok(safeLoginTarget(enrollmentFormUrl(vendor, batch, 'student')))
})
test('confirmation is scoped to vendor, batch and H3C registration method', () => {
  rememberNotice({ vendor: 'h3c', batch, price: { value: 'student' }, notice_hash: 'confirmed' })
  assert.equal(currentNotice('h3c', 7, 'student').notice_hash, 'confirmed')
  assert.equal(currentNotice('h3c', 7, 'coupon'), null)
  assert.equal(currentNotice('h3c', 8, 'student'), null)
  assert.equal(currentNotice('nisp', 7), null)
})
test('notice is public and dates stay Beijing time on any client timezone', () => {
  assert.equal(isPublicPage('/pages/registration/notice?type=nisp'), true)
  assert.equal(enrollmentDeadline(batch.apply_end), '2026年11月20日 23:59（北京时间）')
  for (const state of ['cancelled', 'registration_closed', 'archived', 'draft']) assert.equal(certificationBatchState({ ...batch, status: state }, Date.parse('2026-11-04')).canApply, false)
  assert.equal(certificationBatchState(batch, Date.parse(batch.apply_end)).canApply, false)
})
test('detail targets preserve certification identity and contact drafts never cross sessions', () => {
  Taro.removeStorageSync = () => {}
  Taro.setStorageSync = () => {}
  Taro.getStorageSync = () => ''
  Taro.getStorageInfoSync = () => ({ keys: [] })
  assert.equal(enrollmentDetailUrl('sangfor', 7), '/pages/sangfor/detail?id=7')
  assert.equal(enrollmentDetailUrl('renshe', 7), '/pages/mine/registration-detail?type=renshe&id=7')
  rememberEnrollmentContact({ phone: '13800138000' })
  assert.equal(enrollmentContactDraft().phone, '13800138000')
  clearAuthTokens()
  assert.deepEqual(enrollmentContactDraft(), {})
})
