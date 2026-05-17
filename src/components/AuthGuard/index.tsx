import type { PropsWithChildren } from 'react'
import { useEffect } from 'react'
import Taro from '@tarojs/taro'
import { useAuth } from '@/hooks/useAuth'
import { ROUTES } from '@/constants/routes'

interface AuthGuardProps {
  onAuthFail?: () => void
}

function defaultAuthFail() {
  Taro.reLaunch({ url: `/${ROUTES.AUTH}` })
}

export function AuthGuard({ children, onAuthFail = defaultAuthFail }: PropsWithChildren<AuthGuardProps>) {
  const { isChecked, isLoggedIn } = useAuth()

  useEffect(() => {
    if (isChecked && !isLoggedIn) {
      onAuthFail()
    }
  }, [isChecked, isLoggedIn, onAuthFail])

  if (!isChecked || !isLoggedIn) return null
  return <>{children}</>
}
