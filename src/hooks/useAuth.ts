import { useEffect, useState } from 'react'
import { isLoggedIn as checkIsLoggedIn } from '@/utils/storage'

export function useAuth() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isChecked, setIsChecked] = useState(false)

  useEffect(() => {
    const loggedIn = checkIsLoggedIn()
    setIsLoggedIn(loggedIn)
    setIsChecked(true)
  }, [])

  return { isLoggedIn, isChecked }
}
