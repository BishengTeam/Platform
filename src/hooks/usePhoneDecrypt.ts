import { useState, useCallback } from 'react'
import Taro from '@tarojs/taro'
import { decryptPhone } from '@/services/authService'

/**
 * 微信手机号解密 hook
 *
 * 配合 Taro Button openType='getPhoneNumber' 使用，
 * 用户在微信授权弹窗确认后自动解密手机号。
 *
 * 用法:
 *   const { decrypting, handleGetPhoneNumber } = usePhoneDecrypt()
 *   <TaroButton openType='getPhoneNumber' onGetPhoneNumber={async (e) => {
 *     const phone = await handleGetPhoneNumber(e)
 *     if (phone) setPhone(phone)
 *   }} />
 */
export function usePhoneDecrypt() {
  const [decrypting, setDecrypting] = useState(false)

  const handleGetPhoneNumber = useCallback(
    async (e: { detail: { encryptedData?: string; iv?: string; errMsg?: string } }) => {
      const { encryptedData, iv, errMsg } = e.detail
      // 用户取消授权或授权失败
      if (errMsg && !errMsg.includes(':ok')) {
        return null
      }
      if (!encryptedData || !iv) return null

      setDecrypting(true)
      try {
        const res = await decryptPhone({ encrypted_data: encryptedData, iv })
        return res.phone
      } catch {
        Taro.showToast({ title: '获取手机号失败，请重试', icon: 'none' })
        return null
      } finally {
        setDecrypting(false)
      }
    },
    [],
  )

  return { decrypting, handleGetPhoneNumber }
}
