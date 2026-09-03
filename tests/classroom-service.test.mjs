import assert from 'node:assert/strict'
import test from 'node:test'
import Taro from '@tarojs/taro'
import { resetRequestStateForTest } from '../src/utils/request.ts'
import { getMyClassrooms } from '../src/services/classroomService.ts'

test('my classrooms parses the backend array response', async () => {
  resetRequestStateForTest()
  const calls = []
  Taro.getStorageSync = () => ''
  Taro.setStorageSync = () => undefined
  Taro.removeStorageSync = () => undefined
  Taro.showLoading = () => undefined
  Taro.hideLoading = () => undefined
  Taro.showToast = () => undefined
  Taro.request = async options => {
    calls.push(options)
    assert.equal(options.url.endsWith('/api/classroom/my'), true)
    return {
      statusCode: 200,
      data: {
        code: 0,
        message: 'ok',
        data: [{
          id: 8,
          name: '晚间课堂',
          status: 'active',
          video_count: 2,
          ongoing_quiz_id: null,
          joined_at: '2026-09-02T20:00:00+08:00',
        }],
      },
      header: {},
      cookies: [],
      errMsg: 'ok',
    }
  }

  const classrooms = await getMyClassrooms()

  assert.equal(classrooms.length, 1)
  assert.equal(classrooms[0]?.id, 8)
  assert.equal(classrooms[0]?.name, '晚间课堂')
  assert.equal(calls.length, 1)
})
