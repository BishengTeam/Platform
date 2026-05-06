import { type PropsWithChildren, useEffect } from 'react'
import Taro from '@tarojs/taro'
import { useAuth } from '@/hooks/useAuth'
import { ROUTES } from '@/constants/routes'

export function AuthGuard({ children }: PropsWithChildren) {
  const { isChecked, isLoggedIn } = useAuth()

  useEffect(() => {
    if (isChecked && !isLoggedIn) {
      Taro.reLaunch({ url: `/${ROUTES.AUTH}` })
    }
  }, [isChecked, isLoggedIn])

  if (!isChecked || !isLoggedIn) return null
  return <>{children}</>
}
