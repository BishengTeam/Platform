import Taro, { useLaunch } from '@tarojs/taro'
import { View } from '@tarojs/components'
import { useState } from 'react'
import type { CSSProperties, PropsWithChildren } from 'react'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { restoreAuthSession } from '@/utils/request'
import '@nutui/nutui-react-taro/dist/style.css'
import './app.scss'

export default function App({ children }: PropsWithChildren) {
  const [fontScale, setFontScale] = useState(1)

  useLaunch(() => {
    try {
      const { fontSizeSetting } = Taro.getSystemInfoSync()
      if (fontSizeSetting && fontSizeSetting > 0) {
        setFontScale(Math.min(1.3, Math.max(0.85, fontSizeSetting / 16)))
      }
    } catch {
      // Keep the platform default when the runtime does not expose text size.
    }
    // 尊重登录页的协议确认：已有 access token 时不重复 wx.login；仅恢复
    // 已存在的 refresh 会话。无本地会话时由用户在登录页显式发起微信登录。
    void restoreAuthSession()
  })

  const shellStyle = {
    '--app-font-scale': String(fontScale),
  } as CSSProperties

  return (
    <View className="app-shell" style={shellStyle}>
      <ErrorBoundary>{children}</ErrorBoundary>
    </View>
  )
}
