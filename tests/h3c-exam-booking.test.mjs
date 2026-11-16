import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { safeLoginTarget } from '../src/utils/loginTargets.ts'

test('H3C booking page follows schedule, date, slot order and scopes slots to registration', async () => {
  const page = await readFile('src/pages/h3c/exam-booking/index.tsx', 'utf8')
  const detail = await readFile('src/pages/mine/registration-detail.tsx', 'utf8')

  assert.match(page, /1\. 选择考场计划/)
  assert.match(page, /2\. 选择考试日期/)
  assert.match(page, /3\. 选择考试时段/)
  assert.match(page, /h3cService\.listExamSlots\(scheduleId, examDate, registrationId\)/)
  assert.match(page, /h3cService\.bookExamSeat\(scheduleId, registrationId, slotId, examDate\)/)
  assert.match(page, /剩余 \$\{item\.remaining\} 位/)
  assert.match(page, /考前 3 天内不可自助取消/)
  assert.match(detail, /H3C_EXAM_BOOKING\}\?registration_id=\$\{certRegistration\.id\}/)
  assert.equal(
    safeLoginTarget('/pages/h3c/exam-booking/index?registration_id=12'),
    '/pages/h3c/exam-booking/index?registration_id=12',
  )
})
