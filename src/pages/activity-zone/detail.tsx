import { useEffect, useState } from 'react'
import { View, Text, Image, Input, Textarea } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { getActivityList, getCertificationList, enrollActivity, remindActivity } from '@/services/zoneService'
import type { ActivityBrief } from '@/types'
import styles from './detail.module.scss'

function fmtTime(iso: string | null): string {
  if (!iso) return '待定'
  return iso.slice(0, 16).replace('T', ' ')
}

export default function ActivityDetailPage() {
  const { params } = useRouter()
  const activityId = Number(params?.id)
  const [activity, setActivity] = useState<ActivityBrief | null>(null)
  const [loading, setLoading] = useState(true)
  const [reminded, setReminded] = useState(false)
  const [enrollOpen, setEnrollOpen] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [remark, setRemark] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [enrolled, setEnrolled] = useState(false)

  useEffect(() => {
    if (!Number.isFinite(activityId) || activityId <= 0) {
      setLoading(false)
      return
    }
    getActivityList()
      .then((items) => setActivity(items.find((a) => a.id === activityId) ?? null))
      .catch(() => setActivity(null))
      .finally(() => setLoading(false))
  }, [activityId])

  const openEnroll = () => {
    if (enrolled) return
    setEnrollOpen(true)
  }

  const submitEnroll = async () => {
    if (!activity || submitting) return
    if (!name.trim()) {
      Taro.showToast({ title: '请输入姓名', icon: 'none' })
      return
    }
    if (!/^1\d{10}$/.test(phone.trim())) {
      Taro.showToast({ title: '请输入正确的手机号', icon: 'none' })
      return
    }
    setSubmitting(true)
    try {
      await enrollActivity(activity.id, name.trim(), phone.trim(), remark.trim() || undefined)
      setEnrolled(true)
      setEnrollOpen(false)
      Taro.showToast({ title: '报名成功', icon: 'success' })
    } catch (error) { Taro.showToast({ title: error instanceof Error ? error.message : '操作失败', icon: 'none', duration: 3000 }) } finally {
      setSubmitting(false)
    }
  }

  const goRelatedCert = async () => {
    if (!activity?.related_cert_id) return
    try {
      const certs = await getCertificationList()
      const cert = certs.find((c) => c.id === activity.related_cert_id)
      if (!cert) {
        Taro.showToast({ title: '认证不存在', icon: 'none' })
        return
      }
      if (cert.vendor === 'H3C') {
        Taro.navigateTo({ url: '/pages/h3c/index' })
        return
      }
      Taro.navigateTo({
        url: `/pages/registration/form?cert_id=${cert.id}&cert_name=${encodeURIComponent(cert.name)}`,
      })
    } catch (error) { Taro.showToast({ title: error instanceof Error ? error.message : '操作失败', icon: 'none', duration: 3000 }) }
  }

  const goRelatedCourse = () => {
    if (!activity?.related_course_id) return
    Taro.navigateTo({ url: `/pages/course/detail?id=${activity.related_course_id}` })
  }

  const copyLiveUrl = () => {
    if (!activity?.live_url) return
    Taro.setClipboardData({ data: activity.live_url })
  }

  const handleRemind = async () => {
    if (!activity || reminded) return
    try {
      await remindActivity(activity.id)
      setReminded(true)
      Taro.showToast({ title: '已设置提醒', icon: 'success' })
    } catch (error) { Taro.showToast({ title: error instanceof Error ? error.message : '操作失败', icon: 'none', duration: 3000 }) }
  }

  return (
    <View className={styles.container}>
      <PageHeader title='活动详情' shouldShowBack onBack={() => Taro.navigateBack()} />

      {loading && <View className={styles.placeholder}>加载中…</View>}

      {!loading && !activity && (
        <View className={styles.placeholder}>活动不存在或已下架</View>
      )}

      {!loading && activity && (
        <View className={styles.detail}>
          {activity.cover_url && (
            <Image className={styles.cover} src={activity.cover_url} mode='aspectFill' />
          )}
          <View className={styles.title}>{activity.title}</View>

          <View className={styles.metaList}>
            <View className={styles.metaItem}>
              <Text className={styles.metaLabel}>时间</Text>
              <Text className={styles.metaValue}>
                {fmtTime(activity.start_time)} ~ {fmtTime(activity.end_time)}
              </Text>
            </View>
            <View className={styles.metaItem}>
              <Text className={styles.metaLabel}>地点</Text>
              <Text className={styles.metaValue}>{activity.location || '待定'}</Text>
            </View>
            {activity.max_participants != null && activity.max_participants > 0 && (
              <View className={styles.metaItem}>
                <Text className={styles.metaLabel}>名额</Text>
                <Text className={styles.metaValue}>{activity.max_participants} 人</Text>
              </View>
            )}
          </View>

          {activity.description && (
            <View className={styles.section}>
              <View className={styles.sectionTitle}>活动介绍</View>
              <View className={styles.sectionBody}>{activity.description}</View>
            </View>
          )}

          {(activity.live_url || activity.group_qrcode_url) && (
            <View className={styles.section}>
              <View className={styles.sectionTitle}>参与方式</View>
              <View className={styles.entryRow}>
                {activity.live_url && (
                  <Button variant='primary' onClick={copyLiveUrl} className={styles.entryBtn}>
                    进入直播（复制链接）
                  </Button>
                )}
              </View>
              {activity.group_qrcode_url && (
                <View className={styles.qrcodeWrap}>
                  <Image className={styles.qrcode} src={activity.group_qrcode_url} mode='aspectFit' />
                  <Text className={styles.qrcodeTip}>长按识别二维码进答疑群</Text>
                </View>
              )}
            </View>
          )}

          {(activity.related_cert_id || activity.related_course_id) && (
            <View className={styles.section}>
              <View className={styles.sectionTitle}>活动推荐</View>
              <View className={styles.entryRow}>
                {activity.related_cert_id && (
                  <Button variant='primary' onClick={goRelatedCert} className={styles.entryBtn}>
                    立即报名认证
                  </Button>
                )}
                {activity.related_course_id && (
                  <Button variant='secondary' onClick={goRelatedCourse} className={styles.entryBtn}>
                    查看课程
                  </Button>
                )}
              </View>
            </View>
          )}

          <View className={styles.actions}>
            <Button variant='primary' onClick={openEnroll} className={styles.actionBtn}>
              {enrolled ? '已报名' : '立即报名'}
            </Button>
            <Button variant='secondary' onClick={handleRemind} className={styles.actionBtn}>
              {reminded ? '已设提醒' : '开赛提醒'}
            </Button>
          </View>
        </View>
      )}

      {enrollOpen && (
        <View className={styles.enrollMask} onClick={() => setEnrollOpen(false)}>
          <View className={styles.enrollSheet} onClick={(e) => e.stopPropagation()}>
            <View className={styles.enrollTitle}>活动报名</View>
            <View className={styles.enrollSub}>{activity?.title}</View>

            <View className={styles.fieldLabel}>姓名 <Text className={styles.required}>*</Text></View>
            <Input
              className={styles.fieldInput}
              placeholder='请输入报名人姓名'
              value={name}
              maxlength={64}
              onInput={(e) => setName(e.detail.value)}
            />

            <View className={styles.fieldLabel}>手机号 <Text className={styles.required}>*</Text></View>
            <Input
              className={styles.fieldInput}
              type='number'
              placeholder='请输入联系电话'
              value={phone}
              maxlength={11}
              onInput={(e) => setPhone(e.detail.value)}
            />

            <View className={styles.fieldLabel}>备注</View>
            <Textarea
              className={styles.fieldArea}
              placeholder='选填'
              value={remark}
              maxlength={500}
              onInput={(e) => setRemark(e.detail.value)}
            />

            <Button
              variant='primary'
              onClick={submitEnroll}
              disabled={submitting}
              className={styles.enrollSubmit}
            >
              {submitting ? '提交中…' : '确认报名'}
            </Button>
          </View>
        </View>
      )}
    </View>
  )
}
