import Taro from '@tarojs/taro'
import { ROUTES } from '../constants/routes.ts'
import { getNispLevelFromCertCode } from '../services/nispService.ts'
import type { CertificationResponse } from '../types'

/**
 * 按认证厂商跳转对应报名入口（与报名分类页 handleCardClick 同一规则）：
 * H3C 走 H3C 报名首页，NISP 按编码等级进入，人社走人社报名首页，其余按 cert_id 进报名表单。
 */
export function navigateToCertRegistration(cert: CertificationResponse) {
  if (cert.vendor === '深信服') {
    Taro.navigateTo({ url: `/${ROUTES.SANGFOR_INDEX}?cert_code=${encodeURIComponent(cert.code)}` })
    return
  }
  if (cert.vendor === 'H3C') {
    Taro.navigateTo({
      url: `/${ROUTES.H3C_INDEX}?cert_code=${encodeURIComponent(cert.code)}&product_name=${encodeURIComponent(cert.chinese_name || cert.name)}`,
    })
    return
  }
  if (cert.vendor === 'NISP') {
    const level = getNispLevelFromCertCode(cert.code)
    Taro.navigateTo({ url: `/${ROUTES.NISP_INDEX}?level=${level}` })
    return
  }
  if (cert.vendor === '人社') {
    Taro.navigateTo({
      url: `/${ROUTES.RENSHE_INDEX}?project_id=${cert.id}&product_name=${encodeURIComponent(cert.chinese_name || cert.name)}`,
    })
    return
  }
  Taro.navigateTo({ url: `/pages/registration/form?cert_id=${cert.id}&cert_name=${encodeURIComponent(cert.name)}` })
}
