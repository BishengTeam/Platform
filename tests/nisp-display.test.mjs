import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { formatNispApplyRange } from '../src/utils/nisp.ts'

test('NISP apply period is formatted for batch cards and order summary', () => {
  assert.equal(
    formatNispApplyRange({
      apply_start: '2026-10-06T12:00:00Z',
      apply_end: '2026-10-31T12:00:00Z',
    }),
    '2026-10-06 ~ 2026-10-31',
  )
  assert.equal(
    formatNispApplyRange({ apply_start: '2026-10-06T12:00:00Z', apply_end: null }),
    '2026-10-06 起',
  )
  assert.equal(
    formatNispApplyRange({ apply_start: null, apply_end: '2026-10-31T12:00:00Z' }),
    '2026-10-31 截止',
  )
  assert.equal(formatNispApplyRange({ apply_start: null, apply_end: null }), '以批次安排为准')
})

test('NISP batch and form cards show the apply period', async () => {
  const index = await readFile(new URL('../src/pages/nisp/index.tsx', import.meta.url), 'utf8')
  const form = await readFile(new URL('../src/pages/nisp/form.tsx', import.meta.url), 'utf8')

  assert.match(index, /formatNispApplyRange\(batch\)/)
  assert.match(index, /label: '报名时间'/)
  assert.match(form, /formatNispApplyRange\(batch\)/)
  assert.match(form, /label: '报名时间'/)
})
