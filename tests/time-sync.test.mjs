import assert from 'node:assert/strict'
import test from 'node:test'
import Taro from '@tarojs/taro'
import {
  getServerOffsetMs,
  resetServerTimeForTest,
  serverNow,
  syncServerTime,
} from '../src/utils/timeSync.ts'

function installTimeEndpointMock(responder) {
  const calls = []
  Taro.request = async options => {
    calls.push(options)
    return responder(options)
  }
  return calls
}

test('server time sync uses a public quiet request and compensates half round-trip', async () => {
  resetServerTimeForTest()
  const fakeServerAheadMs = 5_000
  const calls = installTimeEndpointMock(async options => {
    assert.equal(options.url.endsWith('/api/system/time'), true)
    assert.equal('Authorization' in options.header, false)
    await new Promise(resolve => setTimeout(resolve, 10))
    return {
      statusCode: 200,
      data: {
        code: 0,
        data: { unix: 0, unix_ms: Date.now() + fakeServerAheadMs },
        message: 'ok',
      },
      header: {},
      cookies: [],
      errMsg: 'ok',
    }
  })

  const offset = await syncServerTime()
  assert.ok(offset >= fakeServerAheadMs && offset <= fakeServerAheadMs + 15)
  assert.ok(serverNow() - Date.now() >= fakeServerAheadMs)
  assert.ok(serverNow() - Date.now() <= fakeServerAheadMs + 15)
  assert.equal(getServerOffsetMs(), offset)
  assert.equal(calls.length, 1)
})

test('parallel sync requests share one flight and unix seconds remain a fallback', async () => {
  resetServerTimeForTest()
  const seconds = Math.floor(Date.now() / 1000)
  const calls = installTimeEndpointMock(async () => {
    await new Promise(resolve => setTimeout(resolve, 10))
    return {
      statusCode: 200,
      data: { code: 0, data: { unix: seconds }, message: 'ok' },
      header: {},
      cookies: [],
      errMsg: 'ok',
    }
  })

  const [first, second] = await Promise.all([syncServerTime(), syncServerTime()])
  assert.equal(first, second)
  assert.equal(calls.length, 1)
})
