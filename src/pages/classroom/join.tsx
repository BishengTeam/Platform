import { useState } from 'react'
import { View, Text, Input } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { joinClassroom, getMyClassrooms } from '@/services/classroomService'
import type { ClassroomMyItem } from '@/types/classroom'
import styles from './join.module.scss'

function normalizeClassroomCode(value: unknown): string {
  return String(value ?? '').replace(/\D/g, '').slice(0, 6)
}

export default function ClassroomJoinPage() {
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [mine, setMine] = useState<ClassroomMyItem[]>([])
  const [listError, setListError] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [focusInput, setFocusInput] = useState(false)

  const loadMine = async () => {
    try {
      setMine(await getMyClassrooms())
      setListError(false)
    } catch {
      setMine([])
      setListError(true)
    }
  }

  useDidShow(() => { void loadMine() })

  const submit = async () => {
    const normalizedCode = normalizeClassroomCode(code)
    if (!/^\d{6}$/.test(normalizedCode)) {
      Taro.showToast({ title: '请输入完整课堂码', icon: 'none' })
      return
    }
    setSubmitting(true)
    try {
      const result = await joinClassroom(normalizedCode)
      Taro.showToast({ title: `已加入 ${result.name}`, icon: 'success' })
      setSheetOpen(false)
      setTimeout(() => {
        void loadMine()
        Taro.navigateTo({ url: `/pages/classroom/detail?id=${result.classroom_id}` })
      }, 800)
    } catch { /* request 层 toast */ } finally {
      setSubmitting(false)
    }
  }

  const digits = code.padEnd(6, ' ')
  const cells = Array.from({ length: 6 }, (_, i) => digits[i])

  const handleCellTap = (index: number) => {
    setFocusInput(true)
  }

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title='我的课堂' shouldShowBack />
        <View className={styles.body}>
          <View className={styles.mySection}>
            <Text className={styles.sectionTitle}>已加入的课堂</Text>
            {listError && (
              <View className={styles.listState} onClick={() => { void loadMine() }}>
                <Text className={styles.stateText}>加载失败，点击重试</Text>
              </View>
            )}
            {!listError && mine.length === 0 && (
              <View className={styles.listState}>
                <Text className={styles.stateText}>暂无已加入的课堂</Text>
              </View>
            )}
            {!listError && mine.map((c) => (
              <View
                key={c.id}
                className={styles.myItem}
                onClick={() => Taro.navigateTo({ url: `/pages/classroom/detail?id=${c.id}` })}
              >
                <View className={styles.myInfo}>
                  <View className={styles.nameRow}>
                    <Text className={styles.myName}>{c.name}</Text>
                    {c.status === 'stopped' && <Text className={styles.endedBadge}>已结束</Text>}
                  </View>
                  <Text className={styles.myMeta}>
                    {c.video_count} 个视频{c.ongoing_quiz_id ? ' · 测验进行中' : ''}
                  </Text>
                </View>
                {c.ongoing_quiz_id && <Text className={styles.quizBadge}>测验中</Text>}
              </View>
            ))}
          </View>

          <View className={styles.joinBtnWrap}>
            <Button variant='primary' onClick={() => setSheetOpen(true)} className={styles.joinBtn}>
              + 加入课堂
            </Button>
          </View>
        </View>
      </View>

      {sheetOpen && (
        <View className={styles.mask} onClick={() => setSheetOpen(false)}>
          <View className={styles.sheet} onClick={(e) => e.stopPropagation()}>
            <View className={styles.sheetBar} onClick={() => setSheetOpen(false)} />
            <Text className={styles.sheetTitle}>输入课堂码</Text>

            <View className={styles.codeRow} onClick={() => setFocusInput(true)}>
              {cells.map((d, i) => (
                <View key={i} className={styles.codeCell}>
                  <Text className={styles.codeDigit}>{d.trim() || ''}</Text>
                  {code.length === i && focusInput && <View className={styles.cursor} />}
                </View>
              ))}
            </View>

            <Input
              className={styles.hiddenInput}
              type='number'
              maxlength={6}
              value={code}
              focus={focusInput}
              onBlur={() => setFocusInput(false)}
              onInput={(e) => {
                setCode(normalizeClassroomCode(e.detail.value))
              }}
            />

            <Text className={styles.sheetTip}>课堂码 30 分钟内有效，加入需完成实名认证</Text>

            <Button variant='primary' disabled={submitting || code.length !== 6} onClick={submit} className={styles.sheetBtn}>
              {submitting ? '加入中…' : '加入课堂'}
            </Button>
          </View>
        </View>
      )}
    </AuthGuard>
  )
}
