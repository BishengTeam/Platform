import { formatDate } from './format.ts'

interface NispApplyPeriod {
  apply_start: string | null
  apply_end: string | null
}

export function formatNispApplyRange(batch: NispApplyPeriod): string {
  const start = formatDate(batch.apply_start, '')
  const end = formatDate(batch.apply_end, '')
  if (start && end) return `${start} ~ ${end}`
  if (start) return `${start} 起`
  if (end) return `${end} 截止`
  return '以批次安排为准'
}
