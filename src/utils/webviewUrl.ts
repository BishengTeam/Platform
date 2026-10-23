/** 须与微信小程序后台的业务域名配置一致。导航入口和WebView共用此校验。 */
const ALLOWED_HOST_SUFFIXES = ['mp.weixin.qq.com', 'ztyyx.cn']

export function resolveWebViewTarget(rawUrl?: string): string | null {
  if (!rawUrl) return null
  let candidate = rawUrl
  // 路由参数可能编码过一次；已是完整URL时不再次解码，避免破坏查询参数。
  if (!/^https:\/\//i.test(candidate)) {
    try { candidate = decodeURIComponent(candidate) } catch { return null }
  }
  const matched = candidate.match(/^https:\/\/([a-z0-9.-]+)(?::443)?(?:[/?#]|$)/i)
  if (!matched || /[\s\\]/.test(candidate)) return null
  const host = matched[1].toLowerCase()
  return ALLOWED_HOST_SUFFIXES.some(suffix => host === suffix || host.endsWith(`.${suffix}`))
    ? candidate : null
}
