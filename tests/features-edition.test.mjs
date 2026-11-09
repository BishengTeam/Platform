import assert from 'node:assert/strict'
import test from 'node:test'

import { FEATURES_FULL } from '../src/constants/features.full.ts'
import { FEATURES_TRIM } from '../src/constants/features.trim.ts'
import { FEATURES } from '../src/constants/features.ts'

test('features.trim 冻结为 v1 提审口径（2026.10.21 提审版）', () => {
  // 冻结断言：改动 trim 清单必须显式更新此用例并说明提审口径变化。
  // 2026.10.22：积分海报入口上线（points=true，只读积分页），兑换商城仍关闭（pointsExchange=false）。
  // 2026.10.26：就业专区隐藏（employmentZone=false，首页板块 tab 与活动页「就业」tab 一并隐藏）。
  // 2026.11.04：除就业专区外其余入口全开（认证/AI咨询/活动tab/订单/视频登录/激活码/查成绩/积分兑换），
  // 仅保留 employmentZone=false。
  // 2026.11.09：就业专区彻底关闭（无资质），employmentZone 开关退役，原位更名
  // yingcaiZone（英才计划专区）；trim 归档口径该专区保持关闭（yingcaiZone=false）。
  assert.deepEqual({ ...FEATURES_TRIM }, {
    certRegistration: true,
    aiConsult: true,
    activityTab: true,
    yingcaiZone: false,
    orders: true,
    videoLogin: true,
    videoCodes: true,
    examQuery: true,
    points: true,
    pointsExchange: true,
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
