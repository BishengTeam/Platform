import { useState, useCallback } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { PageHeader } from '@/components/PageHeader'
import { get } from '@/utils/request'
import './index.module.scss'

interface Schedule {
  id: number
  name: string
  open_date_start: string
  open_date_end: string
}

interface Slot {
  slot_id: number
  label: string
  start_time: string
  remaining: number
}

interface Booking {
  id: number
  schedule_name: string
  subject_name: string
  slot_label: string
  slot_time: string
  exam_date: string
  status: string
}

export default function ExamBookingPage() {
  const registrationId = Taro.getCurrentInstance().router?.params?.registration_id
  const [step, setStep] = useState<'select_schedule' | 'select_date' | 'select_slot' | 'done'>('select_schedule')
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null)
  const [dates, setDates] = useState<string[]>([])
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [slots, setSlots] = useState<Slot[]>([])
  const [notice, setNotice] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const loadSchedules = useCallback(async () => {
    if (!registrationId) return
    setLoading(true)
    try {
      const res = await get<Schedule[]>(`/api/h3c/exam/schedules?registration_id=${registrationId}`)
      setSchedules(res.data || [])
    } catch {
      Taro.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }, [registrationId])

  const selectSchedule = async (schedule: Schedule) => {
    setSelectedSchedule(schedule)
    setLoading(true)
    try {
      const [datesRes, noticeRes] = await Promise.all([
        get<{ dates: string[] }>(`/api/h3c/exam/schedules/${schedule.id}/dates`),
        get<{ notice: string }>(`/api/h3c/exam/schedules/${schedule.id}/notice`),
      ])
      setDates(datesRes.data?.dates || [])
      setNotice(noticeRes.data?.notice || '')
      setStep('select_date')
    } catch {
      Taro.showToast({ title: '加载日期失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  const selectDate = async (date: string) => {
    setSelectedDate(date)
    if (!selectedSchedule) return
    setLoading(true)
    try {
      const res = await get<{ slots: Slot[] }>(
        `/api/h3c/exam/schedules/${selectedSchedule.id}/slots?date=${date}`
      )
      setSlots(res.data?.slots || [])
      setStep('select_slot')
    } catch {
      Taro.showToast({ title: '加载时段失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  const bookSlot = async (slot: Slot) => {
    if (!selectedSchedule || !registrationId) return
    if (slot.remaining === 0) {
      Taro.showToast({ title: '该时段已满', icon: 'none' })
      return
    }
    Taro.showModal({
      title: '确认预约',
      content: `${selectedDate} ${slot.label}（${slot.start_time}）`,
      success: async (res) => {
        if (!res.confirm) return
        try {
          const { post } = await import('@/utils/request')
          await post(`/api/h3c/exam/schedules/${selectedSchedule.id}/book?registration_id=${registrationId}`, {
            slot_id: slot.slot_id,
            exam_date: selectedDate,
          })
          Taro.showToast({ title: '预约成功', icon: 'success' })
          setStep('done')
        } catch (e: any) {
          Taro.showToast({ title: e?.message || '预约失败', icon: 'none' })
        }
      },
    })
  }

  return (
    <View className='examBookingPage'>
      <PageHeader title='预约考试' />

      {step === 'select_schedule' && (
        <ScrollView scrollY className='scheduleList'>
          <Text className='sectionTitle'>选择考场计划</Text>
          {loading && <Text className='loading'>加载中...</Text>}
          {schedules.map(s => (
            <View key={s.id} className='scheduleCard' onClick={() => selectSchedule(s)}>
              <Text className='scheduleName'>{s.name}</Text>
              <Text className='scheduleDate'>
                {s.open_date_start} ~ {s.open_date_end}
              </Text>
            </View>
          ))}
          {!loading && schedules.length === 0 && (
            <View className='empty'>
              <Text>暂无可预约的考场计划</Text>
            </View>
          )}
        </ScrollView>
      )}

      {step === 'select_date' && selectedSchedule && (
        <ScrollView scrollY className='dateList'>
          <Text className='sectionTitle'>{selectedSchedule.name}</Text>
          <Text className='sectionSub'>选择考试日期（仅周五）</Text>
          <View className='dateGrid'>
            {dates.map(d => (
              <View key={d} className='dateItem' onClick={() => selectDate(d)}>
                <Text className='dateText'>{d.slice(5)}</Text>
                <Text className='dateWeek'>周五</Text>
              </View>
            ))}
          </View>
          {notice && (
            <View className='noticeCard'>
              <Text className='noticeTitle'>📋 考前注意事项</Text>
              <Text className='noticeText'>{notice}</Text>
            </View>
          )}
        </ScrollView>
      )}

      {step === 'select_slot' && (
        <ScrollView scrollY className='slotList'>
          <Text className='sectionTitle'>{selectedDate}（周五）</Text>
          <Text className='sectionSub'>选择考试时段</Text>
          {slots.map(s => (
            <View
              key={s.slot_id}
              className={`slotCard ${s.remaining === 0 ? 'full' : ''}`}
              onClick={() => bookSlot(s)}
            >
              <View className='slotInfo'>
                <Text className='slotLabel'>{s.label}</Text>
                <Text className='slotTime'>{s.start_time}</Text>
              </View>
              <Text className={`slotRemaining ${s.remaining === 0 ? 'full' : ''}`}>
                {s.remaining === -1 ? '不限' : s.remaining === 0 ? '已满' : `剩余 ${s.remaining} 位`}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}

      {step === 'done' && (
        <View className='successCard'>
          <Text className='successIcon'>✅</Text>
          <Text className='successTitle'>预约成功</Text>
          <Text className='successInfo'>
            {selectedDate} {selectedSchedule?.name}
          </Text>
          <View className='successActions'>
            <Text
              className='actionLink'
              onClick={() => { setStep('select_schedule'); loadSchedules() }}
            >
              返回列表
            </Text>
          </View>
        </View>
      )}
    </View>
  )
}
