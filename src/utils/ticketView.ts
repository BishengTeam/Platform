/**
 * 工单展示视图层 — 解析客服工单的 content 文本协议。
 *
 * 协议与 Admin 端保持同源：
 *   【意见反馈】/【题目反馈】为协议头；「题目：」「说明：」「图片：」为字段行。
 */

export type TicketTypeKey = 'feedback' | 'quiz' | 'general'

export interface TicketTypeMeta {
  key: TicketTypeKey
  label: string
}

export type TicketStatusTone = 'pending' | 'processing' | 'resolved'

export interface TicketStatusMeta {
  label: string
  tone: TicketStatusTone
}

const FIELD_LINE_PATTERN = /^(题目|类型|说明|图片)[：:]\s*(.*)$/
const IMAGE_LINE_PATTERN = /^图片[：:]\s*(.+)$/
const IMAGE_URL_PATTERN = /^\/api\/media\/[A-Za-z0-9][A-Za-z0-9_-]*\.(?:jpe?g|png|webp|gif)$/i
const ISO_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/

export function parseTicketType(content: string | null | undefined): TicketTypeMeta {
  if (content?.includes('【题目反馈】')) return { key: 'quiz', label: '题目反馈' }
  if (content?.includes('【意见反馈】')) return { key: 'feedback', label: '意见反馈' }
  return { key: 'general', label: '咨询' }
}

/** 列表/详情正文：意见反馈取「说明」，题目反馈取「题目」，兜底取首个非协议行。 */
export function ticketSummary(content: string | null | undefined): string {
  if (!content) return ''
  const lines = content.split('\n')
  const fields = new Map<string, string>()
  for (const line of lines) {
    const matched = line.match(FIELD_LINE_PATTERN)
    if (matched && !fields.has(matched[1])) fields.set(matched[1], matched[2].trim())
  }
  if (fields.has('题目')) return fields.get('题目') || ''
  if (fields.has('说明')) return fields.get('说明') || ''
  const fallback = lines
    .map(line => line.trim())
    .find(line => line && !line.startsWith('【') && !FIELD_LINE_PATTERN.test(line))
  return fallback || ''
}

/** 解析「图片：」行的图片相对 URL；与 Admin 端一样只接受图片扩展名。 */
export function parseTicketImages(content: string | null | undefined): string[] {
  if (!content) return []
  const urls: string[] = []
  for (const line of content.split('\n')) {
    const matched = line.match(IMAGE_LINE_PATTERN)
    if (!matched) continue
    for (const part of matched[1].split(/[，,]/)) {
      const url = part.trim()
      if (IMAGE_URL_PATTERN.test(url) && !urls.includes(url)) urls.push(url)
    }
  }
  return urls
}

export function ticketStatusMeta(status: string): TicketStatusMeta {
  if (status === 'processing') return { label: '处理中', tone: 'processing' }
  if (status === 'resolved') return { label: '已解决', tone: 'resolved' }
  if (status === 'waiting_manual') return { label: '待处理', tone: 'pending' }
  return { label: status, tone: 'pending' }
}

/**
 * 工单时间展示：同年省略年份（如 10-02 03:53），跨年补全年份。
 * 直接按字符串切片，避免把无时区的后端时间再次做时区偏移。
 */
export function formatTicketTime(value: string | null | undefined): string {
  if (!value) return ''
  const matched = value.match(ISO_TIME_PATTERN)
  if (!matched) return value.slice(0, 16).replace('T', ' ')
  const [, year, month, day, hour, minute] = matched
  const currentYear = String(new Date().getFullYear())
  return year === currentYear
    ? `${month}-${day} ${hour}:${minute}`
    : `${year}-${month}-${day} ${hour}:${minute}`
}
