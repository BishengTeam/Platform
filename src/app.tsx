import { useLaunch } from '@tarojs/taro'
import { type PropsWithChildren } from 'react'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import '@nutui/nutui-react-taro/dist/style.css'
import './app.scss'

function App({ children }: PropsWithChildren) {
  useLaunch(() => {
    console.log('App launched.')
  })

  return <ErrorBoundary>{children}</ErrorBoundary>
}

export default App
