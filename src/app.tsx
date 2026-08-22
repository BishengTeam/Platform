import { useLaunch } from '@tarojs/taro'
import type { PropsWithChildren } from 'react'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { restoreAuthSession } from '@/utils/request'
import '@nutui/nutui-react-taro/dist/style.css'
import './app.scss'

export default function App({ children }: PropsWithChildren) {
  useLaunch(() => {
    // 尊重登录页的协议确认：已有 access token 时不重复 wx.login；仅恢复
    // 已存在的 refresh 会话。无本地会话时由用户在登录页显式发起微信登录。
    void restoreAuthSession()
  })

  return <ErrorBoundary>{children}</ErrorBoundary>
}
