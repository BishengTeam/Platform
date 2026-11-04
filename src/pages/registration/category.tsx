import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import { useLoad } from '@tarojs/taro'
import { CertificationLanding } from '@/components/CertificationEnrollment'
import type { CertificationVendor } from '@/services/certificationJourney'
import { VENDOR_KEYS } from '@/utils/enrollment'
import RegistrationIndexPage from './index'

export default function RegistrationCategoryPage() {
  const [vendor, setVendor] = useState<CertificationVendor | null>(null), [ready, setReady] = useState(false)
  useLoad(options => {
    let raw = options?.vendor || ''
    try { raw = decodeURIComponent(raw) } catch { /* Invalid vendor uses the type selector. */ }
    setVendor(VENDOR_KEYS[raw] || null); setReady(true)
  })
  if (!ready) return <View><Text>加载中…</Text></View>
  return vendor ? <CertificationLanding vendor={vendor} /> : <RegistrationIndexPage />
}
