import { useEffect, useState } from 'react'
import { View, Text, Image, Input } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { getCompetitionList, signupCompetition } from '@/services/zoneService'
import type { CompetitionBrief, CompetitionTrackBrief } from '@/types'
import styles from './detail.module.scss'

function fmtDate(iso: string | null): string {
  if (!iso) return '待定'
  return iso.slice(0, 10)
}

export default function CompetitionDetailPage() {
  const { params } = useRouter()
  const competitionId = Number(params?.id)
  const [competition, setCompetition] = useState<CompetitionBrief | null>(null)
  const [loading, setLoading] = useState(true)
  const [enrollTrack, setEnrollTrack] = useState<CompetitionTrackBrief | null>(null)
  const [school, setSchool] = useState('')
  const [realName, setRealName] = useState('')
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [enrolledTrackIds, setEnrolledTrackIds] = useState<number[]>([])

  useEffect(() => {
    if (!Number.isFinite(competitionId) || competitionId <= 0) {
      setLoading(false)
      return
    }
    getCompetitionList()
      .then((items) => setCompetition(items.find((c) => c.id === competitionId) ?? null))
      .catch(() => setCompetition(null))
      .finally(() => setLoading(false))
  }, [competitionId])

  const deadlinePassed = (() => {
    if (!competition?.registration_deadline) return false
    return new Date(competition.registration_deadline) <= new Date()
  })()

  const submitEnroll = async () => {
    if (!enrollTrack || submitting) return
    if (!school.trim()) {
      Taro.showToast({ title: '请输入学校', icon: 'none' })
      return
    }
    if (!realName.trim()) {
      Taro.showToast({ title: '请输入姓名', icon: 'none' })
      return
    }
    if (!/^1\d{10}$/.test(phone.trim())) {
      Taro.showToast({ title: '请输入正确的手机号', icon: 'none' })
      return
    }
    setSubmitting(true)
    try {
      await signupCompetition(enrollTrack.id, school.trim(), realName.trim(), phone.trim())
      setEnrolledTrackIds((prev) => [...prev, enrollTrack.id])
      setEnrollTrack(null)
      Taro.showToast({ title: '报名成功', icon: 'success' })
    } catch { /* 错误已由 request 层统一 toast */ } finally {
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
            <Image className={styles.cover} src={competition.cover_url} mode='aspectFill' />
          )}
          <View className={styles.title}>{competition.name}</View>

          <View className={styles.metaList}>
            <View className={styles.metaItem}>
              <Text className={styles.metaLabel}>比赛时间</Text>
              <Text className={styles.metaValue}>
                {fmtDate(competition.start_time)} ~ {fmtDate(competition.end_time)}
              </Text>
            </View>
            <View className={styles.metaItem}>
              <Text className={styles.metaLabel}>报名截止</Text>
              <Text className={styles.metaValue}>
                {competition.registration_deadline
                  ? competition.registration_deadline.slice(0, 16).replace('T', ' ')
                  : '不限（赛前均可报）'}
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
            {deadlinePassed && (
              <View className={styles.closedTip}>报名已截止</View>
            )}
            <View className={styles.trackList}>
              {competition.tracks.map((t) => {
                const enrolled = enrolledTrackIds.includes(t.id)
                const full = trackFull(t)
                const disabled = enrolled || full || deadlinePassed
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
                      {enrolled ? '已报名' : full ? '已满' : deadlinePassed ? '已截止' : '报名'}
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

            <View className={styles.fieldLabel}>学校 <Text className={styles.required}>*</Text></View>
            <Input
              className={styles.fieldInput}
              placeholder='请输入学校名称'
              value={school}
              maxlength={128}
              onInput={(e) => setSchool(e.detail.value)}
            />

            <View className={styles.fieldLabel}>姓名 <Text className={styles.required}>*</Text></View>
            <Input
              className={styles.fieldInput}
              placeholder='请输入真实姓名'
              value={realName}
              maxlength={64}
              onInput={(e) => setRealName(e.detail.value)}
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
