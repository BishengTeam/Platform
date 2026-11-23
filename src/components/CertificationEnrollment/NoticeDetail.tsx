import { useCallback, useEffect, useRef, useState } from 'react'
import { Text, View } from '@tarojs/components'
import { certificationJourneyService, type CertAttachmentItem, type CertificationVendor, type EnrollmentNotice } from '@/services/certificationJourney'
import { enrollmentDeadline } from '@/utils/enrollment'
import { createLatestGuard } from '@/utils/latestRequest'
import { CertAttachmentList } from '../CertAttachmentList'
import { NoticeBlocks } from './index'
import styles from './index.module.scss'

/**
 * 报名须知正文：报名须知页与表单页的须知弹窗共用同一份渲染，
 * 避免两处文案、顺序漂移（附件必须排在须知正文之前）。
 */
export function NoticeDetail({ vendor, notice, countdown }: { vendor: CertificationVendor; notice: EnrollmentNotice; countdown?: string }) {
  const [attachments, setAttachments] = useState<CertAttachmentItem[]>([])
  const [attachmentsLoading, setAttachmentsLoading] = useState(false)
  const [attachmentsError, setAttachmentsError] = useState('')
  const attachmentsGuard = useRef(createLatestGuard())
  const planId = notice.batch.plan_id
  const fetchAttachments = useCallback(async () => {
    const token = attachmentsGuard.current.next()
    if (!planId) { setAttachments([]); return }
    setAttachmentsLoading(true)
    setAttachmentsError('')
    try {
      const rows = await certificationJourneyService.planAttachments(vendor, planId)
      if (attachmentsGuard.current.isCurrent(token)) setAttachments(rows)
    } catch {
      if (!attachmentsGuard.current.isCurrent(token)) return
      setAttachments([])
      setAttachmentsError('附件加载失败，可稍后重试')
    } finally {
      if (attachmentsGuard.current.isCurrent(token)) setAttachmentsLoading(false)
    }
  }, [vendor, planId])
  useEffect(() => { void fetchAttachments() }, [fetchAttachments])
  return <>
    <View className={styles.card}>
      <Text className={styles.deadline}>报名截止：{enrollmentDeadline(notice.batch.apply_end)}</Text>
      {countdown && <Text className={styles.hint}>{countdown}</Text>}
      <View className={styles.row}><Text>考试时间</Text><Text className={styles.rowValue}>
        {`${vendor === 'h3c' || vendor === 'sangfor' ? '报名审核通过后预约' : enrollmentDeadline(notice.batch.exam_date)}${notice.exam_date_note ? `（${notice.exam_date_note}）` : ''}`}
      </Text></View>
      {notice.batch.time_segments?.length ? notice.batch.time_segments.map(seg => (
        <View key={seg.id} className={styles.row}><Text>{seg.label}</Text><Text className={styles.rowValue}>{seg.start_time.slice(11, 16)} – {seg.end_time.slice(11, 16)}</Text></View>
      )) : null}
      <View className={styles.row}><Text>考试地点</Text><Text className={styles.rowValue}>{vendor === 'h3c' || vendor === 'sangfor' ? '考场地址以预约结果为准' : (notice.batch.exam_location || '待公布')}</Text></View>
      {notice.exam_org_name && <View className={styles.row}><Text>考试机构</Text><Text className={styles.rowValue}>{notice.exam_org_name}</Text></View>}
      <View className={styles.row}><Text>报名费用</Text><Text className={styles.rowValue}>¥{(notice.price.price_cents / 100).toFixed(2)}</Text></View>
    </View>
    {notice.registration_notice && <View className={styles.card}>
      <Text className={styles.title}>报名注意事项</Text>
      <Text className={styles.paragraph}>{notice.registration_notice}</Text>
    </View>}
    <CertAttachmentList attachments={attachments} loading={attachmentsLoading} error={attachmentsError} onRetry={() => void fetchAttachments()} />
    <View className={styles.card}><Text className={styles.title}>{notice.notice.title}</Text><NoticeBlocks blocks={notice.notice.blocks} />
      {notice.requirements_summary?.map((text, index) => <Text key={index} className={styles.paragraph}>{text}</Text>)}
      {notice.batch_description && <><Text className={styles.title}>批次说明</Text><Text className={styles.paragraph}>{notice.batch_description}</Text></>}
      {notice.supplement.blocks.length > 0 && <><Text className={styles.title}>{notice.supplement.title}</Text><NoticeBlocks blocks={notice.supplement.blocks} /></>}
    </View>
  </>
}
