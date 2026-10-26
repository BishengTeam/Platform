import type { PropsWithChildren } from 'react'
import { useEffect } from 'react'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'
import { useAuth } from '@/hooks/useAuth'
import { parkProtectedTarget } from '@/utils/loginCoordinator'

interface AuthGuardProps {
  onAuthFail?: () => void
}

function defaultAuthFail() {
  void parkProtectedTarget()
}

export function AuthGuard({ children, onAuthFail = defaultAuthFail }: PropsWithChildren<AuthGuardProps>) {
  const { isChecked, isLoggedIn } = useAuth()
  const router = useRouter()
  const checkActivePage = () => {
    const pages = Taro.getCurrentPages()
    const route = pages[pages.length - 1]?.route
    if (isChecked && !isLoggedIn && route && route === String(router.path || '').replace(/^\//, '')) onAuthFail()
  }
  useDidShow(checkActivePage)

  useEffect(() => {
    checkActivePage()
  }, [isChecked, isLoggedIn, onAuthFail, router.path])

  if (!isChecked || !isLoggedIn) {
    return null
  }
  return <>{children}</>
}
