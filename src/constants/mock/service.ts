import { STRINGS } from '@/constants/strings'
import type { ContactItem } from '@/types'

export const contactList: ContactItem[] = [
  { icon: 'phone', label: STRINGS.SERVICE_PHONE_LABEL, value: STRINGS.SERVICE_PHONE_VALUE, action: STRINGS.SERVICE_ACTION_CALL },
  { icon: 'message-circle', label: STRINGS.SERVICE_WECHAT_LABEL, value: STRINGS.SERVICE_WECHAT_VALUE, action: STRINGS.SERVICE_ACTION_QR },
  { icon: 'mail', label: STRINGS.SERVICE_EMAIL_LABEL, value: STRINGS.SERVICE_EMAIL_VALUE, action: STRINGS.SERVICE_ACTION_COPY },
]
