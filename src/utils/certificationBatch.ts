/** Public registration availability. Existing applications use their own correction deadlines. */
export interface CertificationBatchWindow {
  status: string
  apply_start: string | null
  apply_end: string | null
  remaining_count?: number
  capacity?: number
  enrolled?: number
  can_apply?: boolean
}

type BatchState = 'open' | 'upcoming' | 'closed' | 'ended' | 'full' | 'unavailable'
const STATES: Record<BatchState, { label: string; action: string; tone: 'green' | 'orange' | 'gray'; message: string }> = {
  open: { label: '报名中', action: '立即报名', tone: 'green', message: '' },
  upcoming: { label: '未开始', action: '报名尚未开始', tone: 'orange', message: '该批次报名尚未开始' },
  closed: { label: '已截止', action: '报名已截止', tone: 'gray', message: '该批次报名已截止，请返回选择其他批次' },
  ended: { label: '已结束', action: '报名已结束', tone: 'gray', message: '该批次已结束，请返回选择其他批次' },
  full: { label: '名额已满', action: '名额已满', tone: 'gray', message: '该批次名额已满，请返回选择其他批次' },
  unavailable: { label: '暂不可报名', action: '暂不可报名', tone: 'gray', message: '该批次已下架或暂不可报名，请返回重新选择' },
}

export function certificationBatchState(batch: CertificationBatchWindow | null | undefined, now = Date.now()) {
  let state: BatchState = 'unavailable'
  if (batch?.status === 'finalized') state = 'ended'
  else if (batch?.status === 'registration_closed') state = 'closed'
  else if (batch?.status === 'published') {
    const start = batch.apply_start ? Date.parse(batch.apply_start) : NaN
    const end = batch.apply_end ? Date.parse(batch.apply_end) : NaN
    if (Number.isFinite(start) && Number.isFinite(end) && start < end) {
      if (now >= end) state = 'closed'
      else if (batch.can_apply === false) state = 'unavailable'
      else if (now < start) state = 'upcoming'
      else if (batch.remaining_count === 0 || ((batch.capacity ?? 0) > 0 && (batch.enrolled ?? 0) >= batch.capacity!)) state = 'full'
      else state = 'open'
    }
  }
  return { state, ...STATES[state], canApply: state === 'open', visible: ['open', 'upcoming', 'full'].includes(state) }
}

export function assertCertificationBatchOpen(batch: CertificationBatchWindow | null | undefined) {
  const availability = certificationBatchState(batch)
  if (!availability.canApply) throw new Error(availability.message)
}

export function nextCertificationTransition(batches: readonly CertificationBatchWindow[], now: number, deadlines: readonly (string | null | undefined)[] = []) {
  const times = [...batches.filter(batch => batch.status === 'published').flatMap(batch => [batch.apply_start, batch.apply_end]), ...deadlines]
    .map(value => value ? Date.parse(value) : NaN).filter(time => Number.isFinite(time) && time > now)
  return times.length ? Math.min(...times) : null
}

/** Avoid device timezone differences and date-only ambiguity at midnight. */
export function formatCertificationTime(value: string | null | undefined, fallback = '待公布') {
  const time = value ? Date.parse(value) : NaN
  if (!Number.isFinite(time)) return fallback
  const date = new Date(time + 8 * 3600000)
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`
}

export function formatCertificationApplyRange(batch: Pick<CertificationBatchWindow, 'apply_start' | 'apply_end'>) {
  const start = formatCertificationTime(batch.apply_start, '')
  const end = formatCertificationTime(batch.apply_end, '')
  if (start && end) return `${start} 至 ${end}（北京时间）`
  if (start) return `${start} 起（北京时间）`
  if (end) return `${end} 截止（北京时间）`
  return '以批次安排为准'
}
