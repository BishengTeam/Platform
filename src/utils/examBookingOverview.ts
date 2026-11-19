export interface BookingLike {
  id: number
  registration_id: number
  status: string
}

/**
 * 总览写入规则：带 registration_id 的新数据中若没有本报名有效预约，
 * 清掉本地乐观预约；否则保留刚创建的本地状态。
 */
export function applyBookingOverview<T extends BookingLike>(
  rows: T[],
  registrationId: number,
  optimistic: T | null,
): { bookings: T[]; optimistic: T | null } {
  const hasRegistrationIds = rows.some(row => Number.isSafeInteger(row.registration_id))
  const hasActive = rows.some(
    row => row.registration_id === registrationId && row.status === 'booked',
  )
  return {
    bookings: rows,
    optimistic: hasRegistrationIds && !hasActive ? null : optimistic,
  }
}
