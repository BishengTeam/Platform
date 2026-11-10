import assert from 'node:assert/strict'
import test from 'node:test'

// env 必须在模块加载前设置：features.ts 在模块顶层读取一次 env。
// 屏蔽口径（2026.11.09）：认证专区 / 活动内容 / 首页在线练习板块可按 env 单独屏蔽。
process.env.TARO_APP_CERT_ZONE_VISIBLE = 'false'
process.env.TARO_APP_ACTIVITY_VISIBLE = 'false'
process.env.TARO_APP_STUDY_COURSES_VISIBLE = 'false'

const { FEATURES, studyCoursesVisible } = await import('../src/constants/features.ts')
const { FEATURES_FULL } = await import('../src/constants/features.full.ts')

test('屏蔽口径：三个 env 显式 false 后认证/活动/在线练习关闭，其余键不受影响', () => {
  assert.equal(FEATURES.certRegistration, false)
  assert.equal(FEATURES.activityTab, false)
  assert.equal(studyCoursesVisible, false)
  // 未屏蔽的键保持全量口径原值
  assert.equal(FEATURES.aiConsult, true)
  assert.equal(FEATURES.yingcaiZone, true)
  assert.equal(FEATURES.orders, true)
  assert.equal(FEATURES.points, true)
  assert.equal(FEATURES.pointsExchange, true)
  assert.equal(FEATURES.checkin, true)
})

test('屏蔽口径不引入新键：FEATURES 键集合仍与全量清单一致', () => {
  assert.deepEqual(Object.keys(FEATURES).sort(), Object.keys(FEATURES_FULL).sort())
})
