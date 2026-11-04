import { useCallback, useEffect, useState } from 'react'
import { useDidShow } from '@tarojs/taro'
import { certificationJourneyService, type CertificationVendor } from '@/services/certificationJourney'
import { currentNotice, rememberNotice } from '@/utils/enrollment'

export function useEnrollmentConfirmation(vendor: CertificationVendor, batchId: number, type?: string) {
  const [notice, setNotice] = useState(() => currentNotice(vendor, batchId, type))
  const refresh = useCallback(() => setNotice(currentNotice(vendor, batchId, type)), [vendor, batchId, type])
  useEffect(refresh, [refresh])
  useDidShow(refresh)
  const requireConfirmation = async () => {
    const confirmed = currentNotice(vendor, batchId, type)
    if (!confirmed) throw new Error('请先阅读并确认本次科目和批次的报名须知')
    const latest = await certificationJourneyService.notice(vendor, batchId, type)
    if (latest.notice_hash !== confirmed.notice_hash) throw new Error('报名须知、费用或批次要求已变化，请点击“修改／重新确认须知”；已填资料仍保留')
    rememberNotice(latest); setNotice(latest)
    return latest.notice_hash
  }
  return { notice, requireConfirmation }
}
