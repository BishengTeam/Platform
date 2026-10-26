import { useEffect, useState } from 'react'
import { useDidShow } from '@tarojs/taro'
import { restoreAuthSession } from '@/utils/request'
import { getToken, getAuthSessionId, subscribeAuth, accessTokenExpired } from '@/utils/authState'

export function useAuth() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => Boolean(getToken()) && !accessTokenExpired())
  const [isChecked, setIsChecked] = useState(false)
  const [revision, setRevision] = useState(0)
  useEffect(() => subscribeAuth(() => setRevision(value => value + 1)), [])
  useDidShow(() => setRevision(value => value + 1))

  useEffect(() => {
    let mounted = true
    restoreAuthSession()
      .catch(() => false)
      .then(loggedIn => {
        if (!mounted) return
        setIsLoggedIn(loggedIn)
        setIsChecked(true)
      })
    return () => { mounted = false }
  }, [revision])

  return { isLoggedIn: isLoggedIn && Boolean(getToken()) && !accessTokenExpired(), isChecked, sessionId: getAuthSessionId() }
}
