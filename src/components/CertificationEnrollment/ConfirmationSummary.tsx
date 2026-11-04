import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import type { CertificationVendor, EnrollmentNotice } from '@/services/certificationJourney'
import { enrollmentDeadline, rememberEnrollmentContact, type EnrollmentContactDraft } from '@/utils/enrollment'
import styles from './index.module.scss'

export function ConfirmationSummary({ vendor, batchId, type, notice, contact, disabled, correcting }: {
  vendor: CertificationVendor; batchId: number; type?: string; notice: EnrollmentNotice | null
  contact?: EnrollmentContactDraft; disabled?: boolean; correcting?: boolean
}) {
  if (correcting) return null
  const modify = () => {
    if (disabled || !batchId) return
    if (contact) rememberEnrollmentContact(contact)
    void Taro.navigateTo({ url: `/pages/registration/notice?type=${vendor}&batch_id=${batchId}&editing=1${vendor === 'h3c' && type ? `&registration_type=${type}` : ''}` })
  }
  return <View className={styles.card}>
    <Text className={styles.title}>本次报考</Text>
    {notice ? <><Text className={styles.paragraph}>{notice.subject.name} · {notice.price.label}</Text><Text className={styles.paragraph}>{notice.batch.name}</Text>
      <Text className={styles.deadline}>报名截止：{enrollmentDeadline(notice.batch.apply_end)}</Text>
      <View className={styles.row}><Text>报名费用</Text><Text>¥{(notice.price.price_cents / 100).toFixed(2)}</Text></View></>
      : <Text className={styles.error}>请先确认当前科目、批次及报名须知，再提交报名。</Text>}
    <Text className={styles.link} onClick={modify}>{notice ? '修改／重新确认须知' : '选择科目并阅读报名须知'}</Text>
  </View>
}
