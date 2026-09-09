/**
 * agreementService — P0 电子协议（模板查看 / 签署记录）
 *
 * 后端契约（Backend agr001）：
 * - GET  /api/agreement-templates?type=   → 当前生效模板（公开，登录页可用）
 * - POST /api/agreement-acceptances      → 批量记录签署（同版本幂等）
 * - GET  /api/agreement-acceptances      → 我的签署记录
 */
import { get, post } from '../utils/request.ts'

export type AgreementType = 'user_terms' | 'privacy' | 'identity_auth'

export interface AgreementTemplate {
  type: AgreementType
  title: string
  content: string
  version: number
}

interface AgreementAcceptanceBackendItem {
  id: number
  type: AgreementType
  title: string
  version: number
  accepted_at: string
}

export interface AgreementAcceptance {
  id: string
  type: AgreementType
  title: string
  version: number
  acceptedAt: string
}

const LOGIN_AGREEMENT_TYPES: AgreementType[] = ['user_terms', 'privacy']

export async function getAgreementTemplate(type: AgreementType): Promise<AgreementTemplate> {
  const res = await get<AgreementTemplate>('/api/agreement-templates', { type })
  return res.data
}

export async function acceptAgreements(
  items: Array<{ type: AgreementType; version: number }>,
): Promise<AgreementAcceptance[]> {
  const res = await post<AgreementAcceptanceBackendItem[]>('/api/agreement-acceptances', { items })
  return (res.data || []).map(toAcceptance)
}

export async function getMyAgreementAcceptances(): Promise<AgreementAcceptance[]> {
  const res = await get<AgreementAcceptanceBackendItem[]>('/api/agreement-acceptances')
  return (res.data || []).map(toAcceptance)
}

/**
 * 是否已签署指定类型的最新生效版本。
 * 模板未配置 / 查询失败时返回 true（不阻断，由后端实名接口强制校验兜底）。
 */
export async function hasAcceptedLatest(type: AgreementType): Promise<boolean> {
  try {
    const [template, acceptances] = await Promise.all([
      getAgreementTemplate(type),
      getMyAgreementAcceptances(),
    ])
    return acceptances.some((item) => item.type === type && item.version >= template.version)
  } catch {
    return true
  }
}

/**
 * 登录成功后记录《用户服务协议》《隐私政策》签署。
 * 尽力而为：未配置模板的类型跳过，失败不阻断登录流程。
 */
export async function acceptLoginAgreements(): Promise<void> {
  const items: Array<{ type: AgreementType; version: number }> = []
  await Promise.all(
    LOGIN_AGREEMENT_TYPES.map(async (type) => {
      try {
        const template = await getAgreementTemplate(type)
        items.push({ type, version: template.version })
      } catch {
        // 模板未配置或网络异常时跳过该类型
      }
    }),
  )
  if (items.length > 0) {
    await acceptAgreements(items)
  }
}

function toAcceptance(item: AgreementAcceptanceBackendItem): AgreementAcceptance {
  return {
    id: String(item.id),
    type: item.type,
    title: item.title,
    version: item.version,
    acceptedAt: item.accepted_at,
  }
}
