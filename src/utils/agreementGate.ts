import Taro from '@tarojs/taro'
import { hasAcceptedLatest } from '@/services/agreementService'
import type { AgreementType } from '@/services/agreementService'

/**
 * 业务前置协议签署门槛。模板未配置时后端会放行，这里同样不阻断。
 */
export async function ensureAgreementSigned(
  type: AgreementType,
  title: string,
  description: string,
): Promise<boolean> {
  if (await hasAcceptedLatest(type)) return true

  const modal = await Taro.showModal({
    title,
    content: description,
    confirmText: '去签署',
  })
  if (modal.confirm) {
    Taro.navigateTo({ url: `/pages/agreement/view?type=${type}&requireSign=1` })
  }
  return false
}
