import type { RensheWorkExperience } from '../services/rensheService.ts'
import { chinaDate } from './rensheGraduated.ts'

const DAY = 86400000
const day = (value: string) => Date.parse(`${value}T00:00:00Z`)

export function workAnniversary(value: string, years: number): string {
  const [year, month, date] = value.split('-').map(Number)
  const targetYear = year + years
  const last = new Date(Date.UTC(targetYear, month, 0)).getUTCDate()
  return `${targetYear}-${String(month).padStart(2, '0')}-${String(Math.min(date, last)).padStart(2, '0')}`
}

/** Same inclusive end dates, merged intervals and calendar years as the server. */
export function cumulativeWorkYears(experiences: RensheWorkExperience[], asOf = chinaDate(), after?: string): number {
  const intervals: Array<[number, number]> = []
  for (const item of experiences) {
    const originalStart = day(item.start_date)
    const start = Math.max(originalStart, after ? day(after) : -Infinity)
    const end = day(item.end_date || asOf)
    if (!Number.isFinite(start) || !Number.isFinite(end) || originalStart > end || end > day(asOf)) return NaN
    if (start <= end) intervals.push([start, end + DAY])
  }
  intervals.sort((a, b) => a[0] - b[0])
  const merged: Array<[number, number]> = []
  for (const [start, end] of intervals) {
    const previous = merged[merged.length - 1]
    if (previous && start <= previous[1]) previous[1] = Math.max(previous[1], end)
    else merged.push([start, end])
  }
  let total = 0
  for (const [start, end] of merged) {
    const startDate = new Date(start).toISOString().slice(0, 10)
    let years = new Date(end).getUTCFullYear() - new Date(start).getUTCFullYear()
    if (day(workAnniversary(startDate, years)) > end) years -= 1
    const last = day(workAnniversary(startDate, years))
    const next = day(workAnniversary(startDate, years + 1))
    total += years + (end - last) / (next - last)
  }
  return total
}
