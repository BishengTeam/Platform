/**
 * 小程序 rich-text 无法通过页面 CSS 控制内部标签样式，
 * 因此在渲染协议富文本前注入内联样式并清理空段落。
 */

const TABLE_STYLE =
  'width:100%;max-width:100%;border-collapse:collapse;table-layout:fixed;'
const CELL_STYLE =
  'border:1px solid #d9d9d9;padding:8px 10px;word-break:break-word;'
const PARAGRAPH_STYLE = 'margin:0 0 12px;'
const IMAGE_STYLE = 'max-width:100%;height:auto;'

function mergeStyle(tag: string, html: string, style: string): string {
  const pattern = new RegExp(`<${tag}(\\s[^>]*)?>`, 'gi')
  return html.replace(pattern, (match, attrs: string | undefined) => {
    const attrText = attrs ?? ''
    const styleMatch = attrText.match(/style\s*=\s*"([^"]*)"/i)
    if (styleMatch) {
      const existing = styleMatch[1].trim().replace(/;$/, '')
      const merged = existing ? `${existing};${style}` : style
      return match.replace(styleMatch[0], `style="${merged}"`)
    }
    return `<${tag} style="${style}"${attrText}>`
  })
}

export interface NormalizeAgreementHtmlOptions {
  /** 微信 rich-text 对表格百分比宽度支持不可靠，传入像素宽度可避免表格撑破容器。 */
  tableWidthPx?: number
}

export function normalizeAgreementHtml(
  html: string,
  options: NormalizeAgreementHtmlOptions = {},
): string {
  if (!html) return html

  const tableStyle = options.tableWidthPx
    ? `width:${options.tableWidthPx}px;max-width:100%;border-collapse:collapse;table-layout:fixed;`
    : TABLE_STYLE

  let next = html.replace(/<p\b[^>]*>(?:\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, '')
  next = mergeStyle('table', next, tableStyle)
  next = mergeStyle('th', next, CELL_STYLE)
  next = mergeStyle('td', next, CELL_STYLE)
  next = mergeStyle('p', next, PARAGRAPH_STYLE)
  next = mergeStyle('img', next, IMAGE_STYLE)
  return next
}
