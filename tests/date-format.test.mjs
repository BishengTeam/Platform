import assert from 'node:assert/strict'
import test from 'node:test'
import { formatDate, formatDateTime } from '../src/utils/format.ts'

test('formatDate converts UTC deadline to local timezone instead of slicing', () => {
  // 2026-10-02T16:00:00Z 在北京时间是 2026-10-03 00:00，
  // 直接 slice(0, 10) 会显示成 10-02，被误读为「今天已截止」。
  const result = formatDate('2026-10-02T16:00:00Z')
  const expectedDay = new Date('2026-10-02T16:00:00Z').getDate()
  assert.ok(result.endsWith(`-${String(expectedDay).padStart(2, '0')}`))
})

test('formatDateTime keeps local hours and minutes', () => {
  const d = new Date('2026-10-02T16:00:00Z')
  const expected = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  assert.equal(formatDateTime('2026-10-02T16:00:00Z'), expected)
})

test('date helpers fall back on null or invalid values', () => {
  assert.equal(formatDate(null, '待定'), '待定')
  assert.equal(formatDateTime(undefined, '不限'), '不限')
  assert.equal(formatDate('not-a-date', '待定'), '待定')
})
