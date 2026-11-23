import { useEffect, useState } from 'react'
import { Checkbox, ScrollView, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { certificationJourneyService, type CertificationVendor, type EnrollmentNotice } from '@/services/certificationJourney'
import { Button } from '../Button'
import { PressableLink } from '../PressableLink'
import { NoticeDetail } from './NoticeDetail'
import styles from './index.module.scss'

/**
 * 报名须知弹窗：表单页已锁定科目与批次，再阅读须知时不必跳转报名须知页往返。
 * 需要换科目／批次时仍回报名须知页选择（保留原有能力），不在此弹窗内重选。
 */
export function NoticeDialog({ vendor, batchId, type, batchProjectId, onClose, onConfirm }: {
  vendor: CertificationVendor; batchId: number; type?: string; batchProjectId?: number
  onClose: () => void; onConfirm: (notice: EnrollmentNotice) => void
}) {
  const [notice, setNotice] = useState<EnrollmentNotice | null>(null)
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState(''), [loading, setLoading] = useState(true), [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    setNotice(null); setAgreed(false); setLoading(true); setError('')
    certificationJourneyService.notice(vendor, batchId, type, batchProjectId)
      .then(value => { if (active) setNotice(value) })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : '须知加载失败') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [vendor, batchId, type, batchProjectId, retry])
  const changeTarget = () => {
    // 换批次会改变表单绑定的报名对象，必须回真正会重建表单的报名须知页
    onClose()
    void Taro.navigateTo({ url: `/pages/registration/notice?type=${vendor}&batch_id=${batchId}&editing=1${vendor === 'h3c' && type ? `&registration_type=${type}` : ''}${batchProjectId ? `&batch_project_id=${batchProjectId}` : ''}` })
  }
  return <View className={styles.dialogMask} onClick={onClose}>
    <View className={styles.dialog} onClick={event => event.stopPropagation()}>
      <View className={styles.dialogHeader}><Text className={styles.dialogTitle}>报名须知</Text>
        <Text className={styles.dialogClose} onClick={onClose} aria-role='button' aria-label='关闭报名须知'>关闭</Text></View>
      <ScrollView scrollY className={styles.dialogBody}>
        {loading && <Text className={styles.hint}>正在加载…</Text>}
        {!loading && error && <View className={styles.card}><Text className={styles.error}>{error}</Text><Button variant='secondary' onClick={() => setRetry(value => value + 1)}>重新加载</Button></View>}
        {notice && <>
          <NoticeDetail vendor={vendor} notice={notice} />
          <View className={styles.agreement} onClick={() => setAgreed(old => !old)}><Checkbox value='notice' checked={agreed} /><Text>我已阅读并了解本次报名须知</Text></View>
          <Text className={styles.hint}>确认后继续在当前页填写报名信息；换科目或批次请用下方入口。</Text>
        </>}
        <PressableLink onClick={changeTarget} ariaLabel='更换报考科目或批次'>更换报考科目／批次</PressableLink>
      </ScrollView>
      <View className={styles.dialogFooter}>
        <View className={styles.dialogCancel}><Button variant='secondary' onClick={onClose}>取消</Button></View>
        <View className={styles.dialogConfirm}><Button variant='gradient' disabled={!notice || !agreed} onClick={() => { if (notice) onConfirm(notice) }}>确认须知</Button></View>
      </View>
    </View>
  </View>
}
