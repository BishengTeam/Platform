import Taro from '@tarojs/taro'
import { ROUTES } from '../constants/routes.ts'
import { VENDOR_KEYS } from './enrollment.ts'
import type { CertificationResponse } from '../types'

/** Products are subjects within a single vendor enrollment channel. */
export function navigateToCertRegistration(cert: CertificationResponse) {
  if (VENDOR_KEYS[cert.vendor]) {
    void Taro.navigateTo({ url: `/${ROUTES.REGISTRATION_CATEGORY}?vendor=${encodeURIComponent(cert.vendor)}` })
    return
  }
  Taro.showToast({ title: '该认证暂未开放报名', icon: 'none' })
}
