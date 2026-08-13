import { useEffect, useState } from 'react'
import { restoreAuthSession } from '@/utils/request'

export function useAuth() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isChecked, setIsChecked] = useState(false)

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
  }, [])

  return { isLoggedIn, isChecked }
}
