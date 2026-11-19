import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { safeLoginTarget } from '../src/utils/loginTargets.ts'

test('H3C booking page follows schedule, date, slot order and scopes slots to registration', async () => {
  const page = await readFile('src/pages/h3c/exam-booking/index.tsx', 'utf8')
  const detail = await readFile('src/pages/mine/registration-detail.tsx', 'utf8')

  assert.match(page, /① 选择考场计划/)
  assert.match(page, /② 选择考试日期/)
  assert.match(page, /③ 选择考试时段/)
  assert.match(page, /h3cService\.listExamSlots\(scheduleId, examDate, registrationId, vendor\)/)
  assert.match(page, /h3cService\.bookExamSeat\(\s*scheduleId,\s*registrationId,\s*slotId,\s*examDate,\s*vendor,?\s*\)/)
  assert.match(page, /剩余 \$\{item\.remaining\} 位/)
  assert.match(page, /考前 3 天内不可自助取消/)
  assert.match(detail, /findCurrentBooking\(rows, certRegistration\.id\)/)
  assert.match(detail, /useDidShow\(\(\) => \{[\s\S]*?void loadExamBooking\(\)/)
  assert.match(detail, /examBooking \?/)
  assert.match(detail, /📅 \$\{examBooking\.exam_date\.slice\(0, 10\)\} \$\{examBooking\.slot_label\}/)
  assert.match(detail, /: '预约考试日期'/)
  assert.match(detail, /examBooking\?\.exam_location \|\| '以考试预约结果为准'/)
  assert.match(detail, /H3C_EXAM_BOOKING\}\?registration_id=\$\{certRegistration\.id\}/)
  assert.equal(
    safeLoginTarget('/pages/h3c/exam-booking/index?registration_id=12'),
    '/pages/h3c/exam-booking/index?registration_id=12',
  )
  assert.equal(
    safeLoginTarget('/pages/h3c/exam-booking/index?vendor=sangfor&registration_id=12'),
    '/pages/h3c/exam-booking/index?vendor=sangfor&registration_id=12',
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
  assert.match(page, /title=\{currentBooking \? '考试安排' : `\$\{VENDOR_LABELS\[vendor\]\} 考试预约`\}/)
  assert.match(page, /<Text className=\{styles\.successIcon\}>✅<\/Text>/)
  assert.match(page, /<Text className=\{styles\.successTitle\}>\{justBooked \? '预约成功' : '已预约'\}<\/Text>/)
  for (const label of ['考试科目', '考试日期', '考试时段', '考场计划']) {
    assert.match(page, new RegExp(label))
  }
  assert.match(page, /考试地点/)
  assert.match(page, /currentBooking\.exam_location \|\| '待公布'/)
  assert.match(page, /weekdayLabel\(currentBooking\.exam_date\)/)
  assert.match(page, /取消后可重新选择其他日期和时段。/)
  assert.match(page, /getExamNotice\(noticeScheduleId, vendor\)/)
  assert.match(style, /\.bookingHighlight\s*\{[\s\S]*?border: 3rpx solid #22c55e;[\s\S]*?animation: booking-pulse/)
  assert.match(style, /@keyframes booking-pulse\s*\{[\s\S]*?transform: scale\(1\.02\)/)
})

test('exam booking page is vendor-aware and shows schedule attachments', async () => {
  const [page, service, detail] = await Promise.all([
    readFile('src/pages/h3c/exam-booking/index.tsx', 'utf8'),
    readFile('src/services/h3cService.ts', 'utf8'),
    readFile('src/pages/sangfor/detail.tsx', 'utf8'),
  ])

  assert.match(page, /options\?\.vendor === 'sangfor' \? 'sangfor' : 'h3c'/)
  assert.match(page, /h3cService\.listExamSchedules\(registrationId, vendor\)/)
  assert.match(page, /h3cService\.listExamBookings\(vendor\)/)
  assert.match(page, /h3cService\.listExamAttachments\(scheduleId, vendor\)/)
  assert.match(service, /'\/api\/exam\/schedules'/)
  assert.match(service, /`\/api\/exam\/schedules\/\$\{scheduleId\}\/book\?vendor=\$\{vendor\}&registration_id=\$\{registrationId\}`/)
  assert.match(detail, /vendor=sangfor&registration_id=\$\{record\.id\}/)
  assert.match(detail, /examBookingError/)
  assert.match(detail, /预约信息加载失败，点击重试/)
  assert.match(detail, /const firstShow = useRef\(true\)/)

  const journey = await readFile('src/components/CertificationEnrollment/JourneyPanel.tsx', 'utf8')
  assert.match(journey, /journey\.registration_code &&/)
  assert.match(journey, /复制报名码/)
})
