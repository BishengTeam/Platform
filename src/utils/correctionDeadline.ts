import { formatCertificationTime } from './certificationBatch.ts'

interface CorrectionRegistration {
  status: string
  resubmission_due_at?: string | null
  pending_correction?: { due_at: string } | null
}

export function correctionDeadlineState(registration: CorrectionRegistration | null, now = Date.now()) {
  if (registration?.status !== 'rejected_awaiting_resubmission') return null
  const deadline = registration.pending_correction?.due_at || registration.resubmission_due_at
  const time = deadline ? Date.parse(deadline) : NaN
  if (!Number.isFinite(time)) return { expired: false, label: '待确认', message: '请联系管理员确认补正期限。' }
  const expired = now >= time
  return {
    expired,
    label: `${formatCertificationTime(deadline)}（北京时间）`,
    message: expired ? '补正期限已过，暂不能提交，请联系管理员。' : '请在截止时间前完成补正并提交，逾期将按报名规则处理。',
  }
}
