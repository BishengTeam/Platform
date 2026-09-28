import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildCheckinMonthGrid,
  checkinMonthLabel,
  checkinMonthOf,
  checkinMonthRange,
  shiftCheckinMonth,
} from '../src/utils/checkinCalendar.ts'

test('month helpers label, range and shift correctly', () => {
  assert.equal(checkinMonthOf('2026-09-28'), '2026-09')
  assert.equal(checkinMonthLabel('2026-09'), '2026年9月')
  assert.deepEqual(checkinMonthRange('2026-09'), { dateFrom: '2026-09-01', dateTo: '2026-09-30' })
  assert.deepEqual(checkinMonthRange('2026-02'), { dateFrom: '2026-02-01', dateTo: '2026-02-28' })
  assert.equal(shiftCheckinMonth('2026-01', -1), '2025-12')
  assert.equal(shiftCheckinMonth('2026-12', 1), '2027-01')
  assert.equal(shiftCheckinMonth('2026-09', -10), '2025-11')
})

test('month grid starts on Monday column and completes trailing week', () => {
  // 2026-09-01 is a Tuesday -> one leading day from August
  const cells = buildCheckinMonthGrid('2026-09', '2026-09-28', new Set(['2026-09-05']))
  assert.equal(cells.length, 35)
  assert.equal(cells[0].date, '2026-08-31')
  assert.equal(cells[0].day, 31)
  assert.equal(cells[0].inMonth, false)
  assert.equal(cells[1].date, '2026-09-01')
  const inMonth = cells.filter(cell => cell.inMonth)
  assert.equal(inMonth.length, 30)
  const completed = cells.filter(cell => cell.completed)
  assert.deepEqual(completed.map(cell => cell.date), ['2026-09-05'])
  const todayCell = cells.find(cell => cell.isToday)
  assert.equal(todayCell?.date, '2026-09-28')
  assert.equal(cells[cells.length - 1].date, '2026-10-04')
})

test('month grid marks future days without interactive states', () => {
  // 2026-10-01 is a Thursday -> three leading days
  const cells = buildCheckinMonthGrid('2026-10', '2026-10-15', new Set(['2026-10-03']))
  assert.equal(cells[0].date, '2026-09-28')
  assert.equal(cells[3].date, '2026-10-01')
  const inMonthPast = cells.filter(cell => cell.inMonth && cell.date < '2026-10-15')
  assert.equal(inMonthPast.length, 14)
  assert.equal(inMonthPast.some(cell => cell.isFuture), false)
  const future = cells.filter(cell => cell.isFuture).slice(0, 2).map(cell => cell.date)
  assert.deepEqual(future, ['2026-10-16', '2026-10-17'])
  assert.equal(cells.some(cell => cell.isToday && cell.date !== '2026-10-15'), false)
})

test('month grid handles February without placeholders', () => {
  // 2026-02-01 is a Sunday -> six leading days, 28 days, one trailing day
  const cells = buildCheckinMonthGrid('2026-02', '2026-02-10', new Set())
  assert.equal(cells.length, 35)
  assert.equal(cells[0].date, '2026-01-26')
  assert.equal(cells[6].date, '2026-02-01')
  assert.equal(cells[33].date, '2026-02-28')
  assert.equal(cells[34].date, '2026-03-01')
})

test('invalid month strings are rejected', () => {
  assert.throws(() => checkinMonthLabel('2026-13'), /invalid check-in month/)
  assert.throws(() => shiftCheckinMonth('2026-00', 1), /invalid check-in month/)
  assert.throws(() => checkinMonthRange('202609'), /invalid check-in month/)
})
