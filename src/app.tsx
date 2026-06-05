import { useLaunch } from '@tarojs/taro'
import Taro from '@tarojs/taro'
import type { PropsWithChildren } from 'react'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { wxLogin } from '@/services/dataService'
import { setToken } from '@/utils/request'
import '@nutui/nutui-react-taro/dist/style.css'
import './app.scss'

export default function App({ children }: PropsWithChildren) {
  useLaunch(() => {
    // 每次打开小程序自动调用微信登录，获取 token
    Taro.login({
      success: (loginRes) => {
        if (loginRes.code) {
          wxLogin(loginRes.code)
            .then(({ access_token }) => {
              setToken(access_token)
            })
            .catch(() => {
              // 后端登录失败不阻塞，用户可手动在 auth 页重试
            })
        }
      },
      fail: () => {
        // wx.login 失败静默处理
      },
    })
  })

  return <ErrorBoundary>{children}</ErrorBoundary>
}
