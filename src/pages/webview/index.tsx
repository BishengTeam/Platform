import { useEffect, useMemo } from 'react'
import { View, WebView } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'

import { STRINGS } from '@/constants/strings'
import { safeNavigateBack } from '@/utils/navigation'
import styles from './index.module.scss'

// web-view 仅放行已关联公众号的文章域名与自有域名；后续 videoweb 等
// 外链复用本页时在此扩名单（须与小程序后台配置的合法域名一致）。
const ALLOWED_HOST_SUFFIXES = ['mp.weixin.qq.com', 'ztyyx.cn']

/** 校验并解析目标链接：仅接受 https + 白名单域名，防止本页沦为任意跳板 */
function resolveTarget(rawUrl?: string): string | null {
  if (!rawUrl) return null
  let candidate = rawUrl
  try {
    candidate = decodeURIComponent(rawUrl)
  } catch {
    // 编码异常时按原值继续校验
  }
  const matched = candidate.match(/^https:\/\/([^/:?#]+)/i)
  if (!matched) return null
  const host = matched[1].toLowerCase()
  const allowed = ALLOWED_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`)
  )
  return allowed ? candidate : null
}

/**
 * 通用 webview 容器页（打开已关联公众号文章 / 自有域名外链）
 * 用法：navigateTo(`/${ROUTES.WEBVIEW}?url=${encodeURIComponent(target)}`)
 * 页面级恢复原生导航栏：web-view 自动铺满整页，自定义导航没有返回键可用。
 */
export default function WebViewPage() {
  const { params } = useRouter()
  const target = useMemo(() => resolveTarget(params.url), [params.url])

  useEffect(() => {
    if (target) return
    Taro.showToast({ title: STRINGS.WEBVIEW_LINK_INVALID, icon: 'none' })
    const timer = setTimeout(() => {
      void safeNavigateBack()
    }, 600)
    return () => clearTimeout(timer)
  }, [target])

  return (
    <View className={styles.page}>
      {target ? <WebView src={target} /> : <View className={styles.placeholder} />}
    </View>
  )
}
