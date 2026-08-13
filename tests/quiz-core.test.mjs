import assert from 'node:assert/strict'
import test from 'node:test'
import {
  addCalendarDays,
  answerFingerprint,
  canonicalAnswer,
  clearStoredAttemptKey,
  clearStoredExamId,
  clearStoredPracticeAttemptKeys,
  clearStoredPracticeSessionId,
  clearStoredQuizCache,
  createIdempotencyKey,
  formatCountdown,
  getStoredExamId,
  getStoredPracticeSessionId,
  getOrCreateStoredAttemptKey,
  remainingSeconds,
  serverClockOffset,
  setStoredExamId,
  setStoredPracticeSessionId,
  shanghaiDate,
} from '../src/utils/quizCore.ts'

function memoryStorage() {
  const data = new Map()
  return {
    data,
    get: key => data.get(key),
    set: (key, value) => data.set(key, value),
    remove: key => data.delete(key),
    keys: () => [...data.keys()],
  }
}

test('answers are canonical and fingerprints are stable', () => {
  assert.equal(canonicalAnswer(' a '), 'A')
  assert.deepEqual(canonicalAnswer(['C', 'A', 'A']), ['A', 'C'])
  assert.equal(answerFingerprint(['C', 'A', 'A']), 'A,C')
})

test('idempotency key is reused only for the same pending answer', () => {
  const storage = memoryStorage()
  let sequence = 0
  const factory = () => `attempt-key-${++sequence}`
  const first = getOrCreateStoredAttemptKey(storage, 7, 9, ['C', 'A'], factory)
  const retry = getOrCreateStoredAttemptKey(storage, 7, 9, ['A', 'C'], factory)
  const changed = getOrCreateStoredAttemptKey(storage, 7, 9, ['A'], factory)
  assert.equal(first, retry)
  assert.notEqual(first, changed)
  clearStoredAttemptKey(storage, 7, 9)
  assert.equal(storage.keys().length, 0)
})

test('session cache cleanup never removes another session', () => {
  const storage = memoryStorage()
  getOrCreateStoredAttemptKey(storage, 1, 1, 'A', () => 'key-11111111')
  getOrCreateStoredAttemptKey(storage, 1, 2, 'B', () => 'key-22222222')
  getOrCreateStoredAttemptKey(storage, 2, 1, 'A', () => 'key-33333333')
  clearStoredPracticeAttemptKeys(storage, 1)
  assert.deepEqual(storage.keys(), ['quiz_attempt_pending:2:1'])
})

test('account cleanup removes all quiz caches but preserves unrelated storage', () => {
  const storage = memoryStorage()
  getOrCreateStoredAttemptKey(storage, 1, 1, 'A', () => 'key-11111111')
  getOrCreateStoredAttemptKey(storage, 2, 1, 'B', () => 'key-22222222')
  setStoredPracticeSessionId(storage, 7)
  setStoredExamId(storage, 8)
  storage.set('activityZoneTab', 'competition')
  clearStoredQuizCache(storage)
  assert.deepEqual(storage.keys(), ['activityZoneTab'])
})

test('activity IDs are validated and conditionally cleared', () => {
  const storage = memoryStorage()
  assert.equal(getStoredPracticeSessionId(storage), null)
  assert.equal(getStoredExamId(storage), null)
  setStoredPracticeSessionId(storage, 7)
  setStoredExamId(storage, 8)
  assert.equal(getStoredPracticeSessionId(storage), 7)
  assert.equal(getStoredExamId(storage), 8)
  clearStoredPracticeSessionId(storage, 99)
  clearStoredExamId(storage, 99)
  assert.equal(getStoredPracticeSessionId(storage), 7)
  assert.equal(getStoredExamId(storage), 8)
  clearStoredPracticeSessionId(storage, 7)
  clearStoredExamId(storage, 8)
  assert.equal(getStoredPracticeSessionId(storage), null)
  assert.equal(getStoredExamId(storage), null)
  assert.throws(() => setStoredExamId(storage, 0), /正整数/)
})

test('keys satisfy the backend 8 to 64 character contract', () => {
  const key = createIdempotencyKey(1_700_000_000_000, 0.5)
  assert.ok(key.length >= 8 && key.length <= 64)
})

test('countdown follows server clock and never becomes negative', () => {
  const received = Date.parse('2026-08-12T00:00:00Z')
  const offset = serverClockOffset('2026-08-12T00:00:10Z', received)
  assert.equal(offset, 10_000)
  assert.equal(remainingSeconds('2026-08-12T00:01:10Z', offset, received), 60)
  assert.equal(remainingSeconds('2026-08-11T23:00:00Z', offset, received), 0)
  assert.equal(formatCountdown(3600), '60:00')
})

test('Shanghai date is independent from the device timezone', () => {
  assert.equal(shanghaiDate(Date.parse('2026-08-11T16:30:00Z')), '2026-08-12')
  assert.equal(addCalendarDays('2026-08-01', -1), '2026-07-31')
})
