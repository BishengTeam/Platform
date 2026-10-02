import { useEffect, useState } from 'react'
import { View, Text, Image } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import {
  CompetitionRegForm,
  emptyCompetitionRegFormValues,
  validateCompetitionRegForm,
  type CompetitionRegFormValues,
} from '@/components/CompetitionRegForm'
import {
  getCompetitionList,
  getMyCompetitionRegistrations,
  signupCompetition,
} from '@/services/zoneService'
import { resolveMediaUrl } from '@/utils/media'
import { formatDate, formatDateTime } from '@/utils/format'
import type { CompetitionBrief, CompetitionTrackBrief } from '@/types'
import styles from './detail.module.scss'

export default function CompetitionDetailPage() {
  const { params } = useRouter()
  const competitionId = Number(params?.id)
  const [competition, setCompetition] = useState<CompetitionBrief | null>(null)
  const [loading, setLoading] = useState(true)
  const [enrollTrack, setEnrollTrack] = useState<CompetitionTrackBrief | null>(null)
  const [formValues, setFormValues] = useState<CompetitionRegFormValues>(emptyCompetitionRegFormValues())
  const [submitting, setSubmitting] = useState(false)
  const [enrolledTrackIds, setEnrolledTrackIds] = useState<number[]>([])

  // 后台配置的自定义报名字段
  const customFields = competition?.custom_fields || []

  useEffect(() => {
    if (!Number.isFinite(competitionId) || competitionId <= 0) {
      setLoading(false)
      return
    }
    getCompetitionList()
      .then((items) => setCompetition(items.find((c) => c.id === competitionId) ?? null))
      .catch(() => setCompetition(null))
      .finally(() => setLoading(false))
    // 进入页面即恢复“已报名”状态（此前仅内存记录，重进页面会丢失）
    getMyCompetitionRegistrations()
      .then((regs) => {
        const trackIds = regs
          .filter((r) => r.competition_id === competitionId && r.track_id !== null)
          .map((r) => r.track_id as number)
        setEnrolledTrackIds(trackIds)
      })
      .catch(() => {})
  }, [competitionId])

  const deadlinePassed = (() => {
    if (!competition?.registration_deadline) return false
    return new Date(competition.registration_deadline) <= new Date()
  })()
  const eventEnded = (() => {
    if (!competition?.end_time) return false
    return new Date(competition.end_time) <= new Date()
  })()
  const registrationClosed = deadlinePassed || eventEnded

  const submitEnroll = async () => {
    if (!enrollTrack || submitting) return
    const error = validateCompetitionRegForm(formValues, customFields)
    if (error) {
      Taro.showToast({ title: error, icon: 'none' })
      return
    }

    setSubmitting(true)
    try {
      await signupCompetition(
        enrollTrack.id,
        formValues.school.trim(),
        formValues.real_name.trim(),
        formValues.phone.trim(),
        Object.keys(formValues.custom).length > 0 ? formValues.custom : undefined,
      )
      setEnrolledTrackIds((prev) => [...prev, enrollTrack.id])
      setEnrollTrack(null)
      setFormValues(emptyCompetitionRegFormValues())
      Taro.showToast({ title: '报名成功', icon: 'success' })
    } catch (err) {
      Taro.showToast({
        title: err instanceof Error ? err.message : '报名失败',
        icon: 'none', duration: 3000,
      })
    } finally {
      setSubmitting(false)
    }
  }

  const trackFull = (t: CompetitionTrackBrief) =>
    t.max_participants > 0 && t.enrolled >= t.max_participants

  return (
    <View className={styles.container}>
      <PageHeader title='赛事详情' shouldShowBack onBack={() => Taro.navigateBack()} />

      {loading && <View className={styles.placeholder}>加载中…</View>}
      {!loading && !competition && <View className={styles.placeholder}>赛事不存在或未发布</View>}

      {!loading && competition && (
        <View className={styles.detail}>
          {competition.cover_url && (
            <Image className={styles.cover} src={resolveMediaUrl(competition.cover_url)} mode='aspectFill' />
          )}
          <View className={styles.title}>{competition.name}</View>

          <View className={styles.metaList}>
            <View className={styles.metaItem}>
              <Text className={styles.metaLabel}>比赛时间</Text>
              <Text className={styles.metaValue}>
                {formatDate(competition.start_time)} ~ {formatDate(competition.end_time)}
              </Text>
            </View>
            <View className={styles.metaItem}>
              <Text className={styles.metaLabel}>报名截止</Text>
              <Text className={styles.metaValue}>
                {formatDateTime(competition.registration_deadline, '不限（赛前均可报）')}
              </Text>
            </View>
          </View>

          {competition.description && (
            <View className={styles.section}>
              <View className={styles.sectionTitle}>赛事介绍</View>
              <View className={styles.sectionBody}>{competition.description}</View>
            </View>
          )}

          <View className={styles.section}>
            <View className={styles.sectionTitle}>选择赛道报名</View>
            {registrationClosed && (
              <View className={styles.closedTip}>{eventEnded ? '比赛已结束' : '报名已截止'}</View>
            )}
            <View className={styles.trackList}>
              {competition.tracks.map((t) => {
                const enrolled = enrolledTrackIds.includes(t.id)
                const full = trackFull(t)
                const disabled = enrolled || full || registrationClosed
                return (
                  <View key={t.id} className={styles.trackItem}>
                    <View className={styles.trackInfo}>
                      <Text className={styles.trackName}>{t.name}</Text>
                      <Text className={styles.trackQuota}>
                        {t.max_participants > 0
                          ? `${t.enrolled}/${t.max_participants} 人`
                          : `${t.enrolled} 人 · 不限`}
                      </Text>
                    </View>
                    <Button
                      variant={disabled ? 'secondary' : 'primary'}
                      disabled={disabled}
                      onClick={() => setEnrollTrack(t)}
                      className={styles.trackBtn}
                    >
                      {enrolled ? '已报名' : full ? '已满' : eventEnded ? '已结束' : deadlinePassed ? '已截止' : '报名'}
                    </Button>
                  </View>
                )
              })}
            </View>
          </View>
        </View>
      )}

      {enrollTrack && (
        <View className={styles.enrollMask} onClick={() => setEnrollTrack(null)}>
          <View className={styles.enrollSheet} onClick={(e) => e.stopPropagation()}>
            <View className={styles.enrollTitle}>赛道报名</View>
            <View className={styles.enrollSub}>{enrollTrack.name}</View>

            <CompetitionRegForm fields={customFields} values={formValues} onChange={setFormValues} />

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
