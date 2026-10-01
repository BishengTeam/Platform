import { useEffect, useState } from 'react'
import { View, Text, Image, Input, Picker, Textarea } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { getCompetitionList, signupCompetition } from '@/services/zoneService'
import type { CompetitionBrief, CompetitionTrackBrief } from '@/types'
import styles from './detail.module.scss'

/** Custom form field definition from backend */
interface CustomField {
  key: string
  label: string
  type: string
  required: boolean
  placeholder?: string | null
  max_length?: number | null
  options?: string[] | null
  sort_order: number
}

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
  const [customValues, setCustomValues] = useState<Record<string, string | string[]>>({})
  const [submitting, setSubmitting] = useState(false)
  const [enrolledTrackIds, setEnrolledTrackIds] = useState<number[]>([])

  // Get custom fields from competition (needs to be added to CompetitionBrief type)
  const customFields: CustomField[] = (competition as any)?.custom_fields || []

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

  const setCustomValue = (key: string, value: string | string[]) => {
    setCustomValues(prev => ({ ...prev, [key]: value }))
  }

  const validateCustomFields = (): boolean => {
    for (const field of customFields) {
      const value = customValues[field.key]
      if (field.required) {
        if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
          Taro.showToast({ title: `请填写${field.label}`, icon: 'none' })
          return false
        }
      }
      if (field.type === 'phone' && value) {
        if (!/^1\d{10}$/.test(String(value))) {
          Taro.showToast({ title: `${field.label}格式不正确`, icon: 'none' })
          return false
        }
      }
      if (field.type === 'idcard' && value) {
        if (!/^\d{17}[\dX]$/i.test(String(value))) {
          Taro.showToast({ title: `${field.label}必须为18位`, icon: 'none' })
          return false
        }
      }
    }
    return true
  }

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
    if (!validateCustomFields()) return

    setSubmitting(true)
    try {
      await signupCompetition(
        enrollTrack.id,
        school.trim(),
        realName.trim(),
        phone.trim(),
        Object.keys(customValues).length > 0 ? customValues : undefined,
      )
      setEnrolledTrackIds((prev) => [...prev, enrollTrack.id])
      setEnrollTrack(null)
      setCustomValues({})
      Taro.showToast({ title: '报名成功', icon: 'success' })
    } catch (error) {
      Taro.showToast({
        title: error instanceof Error ? error.message : '报名失败',
        icon: 'none', duration: 3000,
      })
    } finally {
      setSubmitting(false)
    }
  }

  const trackFull = (t: CompetitionTrackBrief) =>
    t.max_participants > 0 && t.enrolled >= t.max_participants

  const renderCustomField = (field: CustomField) => {
    const value = customValues[field.key]

    if (field.type === 'select' || field.type === 'radio') {
      const options = field.options || []
      const selectedIndex = options.indexOf(String(value ?? ''))
      return (
        <View key={field.key}>
          <View className={styles.fieldLabel}>
            {field.label}
            {field.required && <Text className={styles.required}> *</Text>}
          </View>
          <Picker
            mode='selector'
            range={options}
            value={selectedIndex >= 0 ? selectedIndex : 0}
            onChange={(e) => setCustomValue(field.key, options[e.detail.value])}
          >
            <View className={styles.fieldInput} style={{ display: 'flex', alignItems: 'center' }}>
              <Text style={{ color: value ? '#17233d' : '#98a2b3' }}>
                {value || field.placeholder || `请选择${field.label}`}
              </Text>
            </View>
          </Picker>
        </View>
      )
    }

    if (field.type === 'checkbox') {
      const options = field.options || []
      const selected = Array.isArray(value) ? value : []
      return (
        <View key={field.key}>
          <View className={styles.fieldLabel}>
            {field.label}
            {field.required && <Text className={styles.required}> *</Text>}
          </View>
          <View style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
            {options.map(opt => (
              <View
                key={opt}
                className={`${styles.tagOption} ${selected.includes(opt) ? styles.tagSelected : ''}`}
                onClick={() => {
                  if (selected.includes(opt)) {
                    setCustomValue(field.key, selected.filter(s => s !== opt))
                  } else {
                    setCustomValue(field.key, [...selected, opt])
                  }
                }}
              >
                <Text>{opt}</Text>
              </View>
            ))}
          </View>
        </View>
      )
    }

    if (field.type === 'date') {
      return (
        <View key={field.key}>
          <View className={styles.fieldLabel}>
            {field.label}
            {field.required && <Text className={styles.required}> *</Text>}
          </View>
          <Picker
            mode='date'
            value={String(value || '2000-01-01')}
            onChange={(e) => setCustomValue(field.key, e.detail.value)}
          >
            <View className={styles.fieldInput} style={{ display: 'flex', alignItems: 'center' }}>
              <Text style={{ color: value ? '#17233d' : '#98a2b3' }}>
                {value || field.placeholder || `请选择${field.label}`}
              </Text>
            </View>
          </Picker>
        </View>
      )
    }

    if (field.type === 'textarea') {
      return (
        <View key={field.key}>
          <View className={styles.fieldLabel}>
            {field.label}
            {field.required && <Text className={styles.required}> *</Text>}
          </View>
          <Textarea
            className={styles.fieldTextarea}
            placeholder={field.placeholder || `请输入${field.label}`}
            value={String(value ?? '')}
            maxlength={field.max_length || 1000}
            onInput={(e) => setCustomValue(field.key, e.detail.value)}
          />
        </View>
      )
    }

    // text, number, phone, email, idcard → use Input
    const inputType = field.type === 'number' ? 'digit' as const
      : field.type === 'phone' ? 'number' as const
      : 'text' as const

    return (
      <View key={field.key}>
        <View className={styles.fieldLabel}>
          {field.label}
          {field.required && <Text className={styles.required}> *</Text>}
        </View>
        <Input
          className={styles.fieldInput}
          type={inputType}
          placeholder={field.placeholder || `请输入${field.label}`}
          value={String(value ?? '')}
          maxlength={field.type === 'phone' ? 11 : field.type === 'idcard' ? 18 : (field.max_length || 128)}
          onInput={(e) => setCustomValue(field.key, e.detail.value)}
        />
      </View>
    )
  }

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

            {/* 固定字段 */}
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

            {/* 动态自定义字段 */}
            {customFields.map(field => renderCustomField(field))}

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
