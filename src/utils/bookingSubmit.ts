export interface BookingSubmitInput {
  hasSelectedSlot: boolean
  hasCurrentBooking: boolean
  submitting: boolean
  bookingError: string
  bookingLoading: boolean
}

export function bookingSubmitState(input: BookingSubmitInput): {
  disabled: boolean
  label: string
} {
  if (input.bookingError) {
    return { disabled: true, label: '预约状态未确认，请先重试' }
  }
  if (input.bookingLoading) {
    return { disabled: true, label: '正在确认预约状态…' }
  }
  if (input.hasCurrentBooking) {
    return { disabled: true, label: '已预约' }
  }
  if (!input.hasSelectedSlot) {
    return { disabled: true, label: '请选择考试时段' }
  }
  return { disabled: input.submitting, label: '确认预约' }
}
