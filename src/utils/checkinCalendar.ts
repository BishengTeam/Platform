export interface CheckinCalendarCell {
  date: string
  day: number
  inMonth: boolean
  isToday: boolean
  isFuture: boolean
  completed: boolean
}

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/

function requireMonth(month: string): [number, number] {
  if (!MONTH_PATTERN.test(month)) throw new Error(`invalid check-in month: ${month}`)
  const [year, monthPart] = month.split('-').map(Number)
  return [year, monthPart]
}

function toMonth(year: number, month: number): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`
}

function toMonthDate(month: string, day: number): string {
  return `${month}-${String(day).padStart(2, '0')}`
}

export function checkinMonthOf(date: string): string {
  return date.slice(0, 7)
}

export function shiftCheckinMonth(month: string, delta: number): string {
  const [year, monthPart] = requireMonth(month)
  const shifted = new Date(Date.UTC(year, monthPart - 1 + delta, 1))
  return toMonth(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1)
}

export function checkinMonthLabel(month: string): string {
  const [year, monthPart] = requireMonth(month)
  return `${year}年${monthPart}月`
}

export function checkinMonthRange(month: string): { dateFrom: string; dateTo: string } {
  const [year, monthPart] = requireMonth(month)
  const lastDay = new Date(Date.UTC(year, monthPart, 0)).getUTCDate()
  return { dateFrom: toMonthDate(month, 1), dateTo: toMonthDate(month, lastDay) }
}

function weekdayOffset(year: number, month: number): number {
  // Monday-first column index: Monday = 0 ... Sunday = 6
  return (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7
}

export function buildCheckinMonthGrid(
  month: string,
  today: string,
  completedDates: ReadonlySet<string>,
): CheckinCalendarCell[] {
  const [year, monthPart] = requireMonth(month)
  const daysInMonth = new Date(Date.UTC(year, monthPart, 0)).getUTCDate()
  const leading = weekdayOffset(year, monthPart)
  const cells: CheckinCalendarCell[] = []

  const previousMonth = shiftCheckinMonth(month, -1)
  const previousRange = checkinMonthRange(previousMonth)
  const previousDayCount = Number(previousRange.dateTo.slice(-2))
  for (let index = leading; index > 0; index -= 1) {
    const day = previousDayCount - index + 1
    cells.push({
      date: toMonthDate(previousMonth, day),
      day,
      inMonth: false,
      isToday: false,
      isFuture: false,
      completed: false,
    })
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = toMonthDate(month, day)
    const completed = completedDates.has(date)
    cells.push({
      date,
      day,
      inMonth: true,
      isToday: date === today,
      isFuture: date > today,
      completed,
    })
  }

  const nextMonth = shiftCheckinMonth(month, 1)
  const trailing = (7 - (cells.length % 7)) % 7
  for (let day = 1; day <= trailing; day += 1) {
    cells.push({
      date: toMonthDate(nextMonth, day),
      day,
      inMonth: false,
      isToday: false,
      isFuture: false,
      completed: false,
    })
  }

  return cells
}
