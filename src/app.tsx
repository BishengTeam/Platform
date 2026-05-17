import { useLaunch } from '@tarojs/taro'
import { type PropsWithChildren } from 'react'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import '@nutui/nutui-react-taro/dist/style.css'
import './app.scss'

export default function App({ children }: PropsWithChildren) {
  useLaunch(() => {})

  return <ErrorBoundary>{children}</ErrorBoundary>
}
