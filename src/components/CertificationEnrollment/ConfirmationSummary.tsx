import { useState } from 'react'
import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import type { CertificationVendor, EnrollmentNotice } from '@/services/certificationJourney'
import { enrollmentDeadline, rememberEnrollmentContact, type EnrollmentContactDraft } from '@/utils/enrollment'
import styles from './index.module.scss'
import { PressableLink } from '../PressableLink'
import { NoticeDialog } from './NoticeDialog'

export function ConfirmationSummary({ vendor, batchId, type, notice, contact, disabled, correcting, onNoticeConfirmed }: {
  vendor: CertificationVendor; batchId: number; type?: string; notice: EnrollmentNotice | null
  contact?: EnrollmentContactDraft; disabled?: boolean; correcting?: boolean
  /** 须知弹窗确认后回写表单页的须知状态（useEnrollmentConfirmation.acceptNotice） */
  onNoticeConfirmed?: (value: EnrollmentNotice) => void
}) {
  const [dialogOpen, setDialogOpen] = useState(false)
  if (correcting) return null
  const modify = () => {
    if (disabled || !batchId) return
    if (contact) rememberEnrollmentContact(contact)
    setDialogOpen(true)
  }
  return <>
    <View className={styles.card}>
      <Text className={styles.title}>本次报考</Text>
      {notice ? <><Text className={styles.paragraph}>{notice.subject.name} · {notice.price.label}</Text><Text className={styles.paragraph}>{notice.batch.name}</Text>
        <Text className={styles.deadline}>报名截止：{enrollmentDeadline(notice.batch.apply_end)}</Text>
        <View className={styles.row}><Text>报名费用</Text><Text>¥{(notice.price.price_cents / 100).toFixed(2)}</Text></View></>
        : <Text className={styles.error}>请先确认当前科目、批次及报名须知，再提交报名。</Text>}
      <PressableLink onClick={modify} disabled={disabled} ariaLabel={notice ? '修改／重新确认须知' : '选择科目并阅读报名须知'}>
        {notice ? '修改／重新确认须知' : '选择科目并阅读报名须知'}
      </PressableLink>
    </View>
    {dialogOpen && batchId > 0 && <NoticeDialog
      vendor={vendor} batchId={batchId} type={type}
      onClose={() => setDialogOpen(false)}
      onConfirm={value => { onNoticeConfirmed?.(value); setDialogOpen(false); void Taro.showToast({ title: '已确认本次报名须知', icon: 'none' }).catch(() => {}) }}
    />}
  </>
}
