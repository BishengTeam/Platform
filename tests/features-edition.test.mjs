import assert from 'node:assert/strict'
import test from 'node:test'

import { FEATURES_FULL } from '../src/constants/features.full.ts'
import { FEATURES_TRIM } from '../src/constants/features.trim.ts'
import { FEATURES } from '../src/constants/features.ts'

test('features.trim 冻结为 v1 提审口径（2026.10.21 提审版）', () => {
  // 冻结断言：改动 trim 清单必须显式更新此用例并说明提审口径变化。
  assert.deepEqual({ ...FEATURES_TRIM }, {
    certRegistration: false,
    aiConsult: false,
    activityTab: false,
    orders: false,
    videoLogin: false,
    videoCodes: false,
    examQuery: false,
    points: false,
    checkin: true,
  })
})

test('features.full 全开且与 trim 键集合一致', () => {
  assert.deepEqual(Object.keys(FEATURES_FULL).sort(), Object.keys(FEATURES_TRIM).sort())
  for (const key of Object.keys(FEATURES_TRIM)) {
    assert.equal(FEATURES_FULL[key], true, `全量口径必须开启 ${key}`)
  }
})

test('未注入 TARO_EDITION 时 FEATURES 默认解析为全量', () => {
  assert.deepEqual({ ...FEATURES }, { ...FEATURES_FULL })
})
