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
  assert.match(page, /h3cService\.bookExamSeat\(\s*scheduleId,\s*registrationId,\s*slotId,\s*examDate,?\s*\)/)
  assert.match(page, /剩余 \$\{item\.remaining\} 位/)
  assert.match(page, /考前 3 天内不可自助取消/)
  assert.match(detail, /H3C_EXAM_BOOKING\}\?registration_id=\$\{certRegistration\.id\}/)
  assert.equal(
    safeLoginTarget('/pages/h3c/exam-booking/index?registration_id=12'),
    '/pages/h3c/exam-booking/index?registration_id=12',
  )
})

test('H3C booking success keeps the current booking visible immediately', async () => {
  const [page, style] = await Promise.all([
    readFile('src/pages/h3c/exam-booking/index.tsx', 'utf8'),
    readFile('src/pages/h3c/exam-booking/index.module.scss', 'utf8'),
  ])

  assert.match(page, /const exactBooking = bookings\.find\(/)
  assert.match(page, /const currentBooking = exactBooking \|\| optimisticBooking \|\| legacyActiveBooking/)
  assert.match(page, /const legacyActiveBooking = listHasRegistrationIds \|\| bookings\.length === 0/)
  assert.match(page, /setBookings\(previous => \[/)
  assert.match(page, /setOptimisticBooking\(booked\)/)
  assert.match(page, /setJustBooked\(true\)/)
  assert.match(page, /scrollIntoView=\{justBooked \? 'booking-summary' : ''\}/)
  assert.match(page, /\{justBooked \? '✅ 当前预约' : '当前预约'\}/)
  assert.match(style, /\.bookingHighlight\s*\{[\s\S]*?border: 3rpx solid #22c55e;[\s\S]*?animation: booking-pulse/)
  assert.match(style, /@keyframes booking-pulse\s*\{[\s\S]*?transform: scale\(1\.02\)/)
})
