import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeGenderZh } from '../src/utils/gender.ts'

test('后端中文性别原样通过', () => {
  assert.equal(normalizeGenderZh('男'), '男')
  assert.equal(normalizeGenderZh('女'), '女')
})

test('历史英文性别映射为中文', () => {
  assert.equal(normalizeGenderZh('male'), '男')
  assert.equal(normalizeGenderZh('female'), '女')
})

test('未知性别不预填', () => {
  assert.equal(normalizeGenderZh(undefined), undefined)
  assert.equal(normalizeGenderZh(null), undefined)
  assert.equal(normalizeGenderZh(''), undefined)
  assert.equal(normalizeGenderZh('other'), undefined)
})
