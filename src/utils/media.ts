const API_BASE = (process.env.TARO_APP_API_BASE || '').replace(/\/+$/, '')

const BACKEND_MEDIA_PATH = /^\/api\/media\/.+/
const ABSOLUTE_BACKEND_MEDIA = /^https?:\/\/[^/]+(\/api\/media\/.+)$/i

/**
 * 将运营后台上传的媒体地址规范为小程序可直接渲染的绝对 URL。
 *
 * - 相对路径 `/api/media/...`：拼接 API 域名（小程序图片必须使用绝对地址）
 * - 历史数据曾把后端相对地址拼成管理端域名存储，这里统一改回 API 域名，
 *   避免小程序真机因管理端域名未配置合法域名而无法加载
 * - 其他绝对地址（OSS、微信头像等第三方资源）原样返回
 */
export function resolveMediaUrl(url: string | null | undefined): string {
  if (!url) return ''
  const trimmed = url.trim()
  if (BACKEND_MEDIA_PATH.test(trimmed)) {
    return API_BASE ? `${API_BASE}${trimmed}` : trimmed
  }
  const absoluteMatch = ABSOLUTE_BACKEND_MEDIA.exec(trimmed)
  if (absoluteMatch) {
    return API_BASE ? `${API_BASE}${absoluteMatch[1]}` : trimmed
  }
  return trimmed
}
