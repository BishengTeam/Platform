import { useEffect, useMemo } from 'react'
import { View, WebView } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'

import { STRINGS } from '@/constants/strings'
import { safeNavigateBack } from '@/utils/navigation'
import { resolveWebViewTarget } from '@/utils/webviewUrl'
import styles from './index.module.scss'

/**
 * 通用 webview 容器页（打开已关联公众号文章 / 自有域名外链）
 * 用法：navigateTo(`/${ROUTES.WEBVIEW}?url=${encodeURIComponent(target)}`)
 * 页面级恢复原生导航栏：web-view 自动铺满整页，自定义导航没有返回键可用。
 */
export default function WebViewPage() {
  const { params } = useRouter()
  const target = useMemo(() => resolveWebViewTarget(params.url), [params.url])

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
