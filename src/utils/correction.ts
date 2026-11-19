export interface CorrectionAvailability {
  open: boolean
  expired: boolean
  missingDue: boolean
}

/**
 * 补正可用性：必须处于 returned 且有有效截止时间。
 * JourneyPanel 与表单页共用，避免两处结论不一致。
 */
export function correctionAvailability(
  status: string | null | undefined,
  dueAt: string | null | undefined,
  now: number,
): CorrectionAvailability {
  if (status !== 'returned') return { open: false, expired: false, missingDue: false }
  if (!dueAt) return { open: false, expired: false, missingDue: true }
  const due = Date.parse(dueAt)
  if (!Number.isFinite(due)) return { open: false, expired: false, missingDue: true }
  return due > now
    ? { open: true, expired: false, missingDue: false }
    : { open: false, expired: true, missingDue: false }
}
