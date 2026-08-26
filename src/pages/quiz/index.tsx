import { useCallback, useEffect, useState } from 'react'
import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { CheckinBar } from '@/components/CheckinBar'
import { PageHeader } from '@/components/PageHeader'
import { QuizBottomNav } from '@/components/QuizBottomNav'
import { QuizGrid } from '@/components/QuizGrid'
import { QUIZ_BOTTOM, QUIZ_GRID } from '@/constants/quiz'
import type { QuizBottomItem } from '@/constants/quiz'
import { ROUTES } from '@/constants/routes'
import { STRINGS } from '@/constants/strings'
import type { QuizLibraryCatalogDetail, QuizLibraryCatalogItem, QuizLibraryProgress, QuizPracticeScopeType, QuizStats } from '@/contracts/quiz'
import { useAuth } from '@/hooks/useAuth'
import { getQuizCheckinStatus, getQuizLibrary, getQuizLibraryProgress, getQuizStats, listQuizLibraries } from '@/services/dataService'
import styles from './index.module.scss'

interface StatCard { label: string; value: string; color: string; onClick?: () => void }

const COLORS = ['#1677FF', '#52C41A', '#722ED1', '#FF4D4F', '#FA8C16', '#13C2C2']

export default function QuizIndexPage() {
  const { isChecked, isLoggedIn } = useAuth()
  const [libraries, setLibraries] = useState<QuizLibraryCatalogItem[]>([])
  const [expanded, setExpanded] = useState<Record<number, QuizLibraryCatalogDetail>>({})
  const [progress, setProgress] = useState<Record<number, QuizLibraryProgress>>({})
  const [stats, setStats] = useState<QuizStats | null>(null)
  const [streakDays, setStreakDays] = useState(0)
  const [loading, setLoading] = useState(true)
  const [catalogError, setCatalogError] = useState(false)

  const requireLogin = useCallback((action: () => void) => {
    if (isLoggedIn) action()
    else Taro.navigateTo({ url: `/${ROUTES.AUTH}` })
  }, [isLoggedIn])

  const loadPersonal = useCallback(() => {
    if (!isChecked || !isLoggedIn) return
    Promise.all([getQuizCheckinStatus(), getQuizStats()])
      .then(([checkin, nextStats]) => {
        setStreakDays(checkin.consecutive_days)
        setStats(nextStats)
      })
      .catch(() => undefined)
  }, [isChecked, isLoggedIn])

  const loadProgress = useCallback((libraryIds: number[]) => {
    if (!isChecked || !isLoggedIn || libraryIds.length === 0) return
    for (const libraryId of libraryIds) {
      getQuizLibraryProgress(libraryId)
        .then(result => setProgress(previous => ({ ...previous, [libraryId]: result })))
        .catch(() => undefined)
    }
  }, [isChecked, isLoggedIn])

  useEffect(() => {
    loadProgress(Object.keys(expanded).map(Number))
  }, [expanded, loadProgress])

  useDidShow(() => {
    setLoading(true)
    setCatalogError(false)
    listQuizLibraries()
      .then(setLibraries)
      .catch(() => setCatalogError(true))
      .finally(() => setLoading(false))
    loadPersonal()
    loadProgress(Object.keys(expanded).map(Number))
  })

  // Authentication restoration can finish after the first page-show event.
  // React to that transition so a restored user receives personal data on the
  // first visit without having to leave and reopen the page.
  useEffect(() => {
    if (!isChecked) return
    if (!isLoggedIn) {
      setStats(null)
      setStreakDays(0)
      return
    }
    loadPersonal()
  }, [isChecked, isLoggedIn, loadPersonal])

  const handleGrid = useCallback((item: { mode: string }) => requireLogin(() => {
    if (item.mode === 'mock') Taro.navigateTo({ url: `/${ROUTES.QUIZ_MOCK}` })
    else if (item.mode === 'history') Taro.navigateTo({ url: `/${ROUTES.QUIZ_HISTORY}` })
    else if (item.mode === 'stats') Taro.navigateTo({ url: `/${ROUTES.QUIZ_STATS}` })
    else Taro.showToast({ title: '请从下方题库目录选择练习范围', icon: 'none' })
  }), [requireLogin])

  const toggleLibrary = useCallback(async (libraryId: number) => {
    if (expanded[libraryId]) {
      setExpanded(previous => {
        const next = { ...previous }
        delete next[libraryId]
        return next
      })
      return
    }
    try {
      const detail = await getQuizLibrary(libraryId)
      setExpanded(previous => ({ ...previous, [libraryId]: detail }))
    } catch {
      Taro.showToast({ title: '题库目录加载失败', icon: 'none' })
    }
  }, [expanded])

  const practiceUrl = (scopeType: QuizPracticeScopeType, scopeId: number) =>
    `/${ROUTES.QUIZ_PRACTICE}?scopeType=${scopeType}&scopeId=${scopeId}`

  const openWrongBook = () => requireLogin(() => {
    Taro.navigateTo({ url: `/${ROUTES.QUIZ_WRONG_BOOK}` })
      .catch(() => Taro.showToast({ title: '错题本入口打开失败，请稍后重试', icon: 'none' }))
  })

  const progressLabel = (item: { question_count: number; answered_questions: number; accuracy: number }) =>
    `已做 ${item.answered_questions}/${item.question_count} · 正确率 ${item.answered_questions > 0 ? `${item.accuracy}%` : '—'}`

  const statCards: StatCard[] = stats ? [
    { label: '已练', value: String(stats.practice.total_attempts), color: COLORS[0] },
    { label: '正确率', value: `${stats.practice.accuracy}%`, color: COLORS[1] },
    { label: '已答', value: String(stats.practice.answered_questions), color: COLORS[2] },
    { label: '错题', value: String(stats.practice.active_wrong_count), color: COLORS[3], onClick: openWrongBook },
    { label: '连续', value: `${stats.practice.consecutive_days}天`, color: COLORS[4] },
    { label: '今日', value: String(stats.practice.today_questions), color: COLORS[5] },
  ] : []

  return (
    <View className={styles.page}>
      <PageHeader title={STRINGS.QUIZ_HEADER} shouldShowBack />
      <ScrollView className={styles.body} scrollY>
        {isLoggedIn && (
          <CheckinBar streakDays={streakDays} onCheckin={() => Taro.navigateTo({ url: `/${ROUTES.QUIZ_CHECKIN}` })} />
        )}

        {statCards.length > 0 && (
          <View className={styles.statsPanel}>
            <View className={styles.statsGrid}>
              {statCards.map(card => (
                <View key={card.label} className={`${styles.statCard} ${card.onClick ? styles.statCardClickable : ''}`} onClick={card.onClick}>
                  <Text className={styles.statValue} style={{ color: card.color }}>{card.value}</Text>
                  <Text className={styles.statLabel}>{card.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <QuizGrid items={QUIZ_GRID} onItemClick={handleGrid} />
        {loading && <Text className={styles.stateText}>正在加载题库…</Text>}
        {!loading && catalogError && <Text className={styles.stateText}>题库加载失败，请稍后重试</Text>}
        {!loading && !catalogError && libraries.length === 0 && <Text className={styles.stateText}>暂无可用题库</Text>}
        <View className={styles.libraryList}>
          {libraries.map(library => {
            const detail = expanded[library.id]
            const libraryProgress = progress[library.id]
            return (
              <View key={library.id} className={styles.libraryCard}>
                <View className={styles.libraryHeader} onClick={() => void toggleLibrary(library.id)}>
                  {library.cover_url ? <Image className={styles.libraryCover} src={library.cover_url} mode='aspectFill' /> : <View className={styles.libraryCoverPlaceholder}><Text>题库</Text></View>}
                  <View className={styles.libraryInfo}>
                    <Text className={styles.libraryName}>{library.name}</Text>
                    <Text className={styles.libraryDescription}>{library.description}</Text>
                    <Text className={styles.libraryMeta}>{library.module_count} 个模块 · {library.question_count} 题 · {library.access_mode === 'free' ? '免费' : '课程附赠'}</Text>
                  </View>
                  <Text className={styles.expandIcon}>{detail ? '收起' : '展开'}</Text>
                </View>
                {detail && (
                  <View className={styles.catalogTree}>
                    <View className={styles.scopeRow} onClick={() => requireLogin(() => Taro.navigateTo({ url: practiceUrl('library', library.id) }))}>
                      <View className={styles.scopeMain}>
                        <Text className={styles.scopeName}>练习整库全部 {detail.question_count} 题</Text>
                        {libraryProgress && <Text className={styles.scopeMeta}>{progressLabel(libraryProgress)}</Text>}
                      </View>
                      <Text className={styles.scopeAction}>开始</Text>
                    </View>
                    {detail.modules.map(module => {
                      const moduleProgress = libraryProgress?.modules.find(item => item.module_id === module.id)
                      return (
                      <View key={module.id} className={styles.moduleBlock}>
                        <View className={styles.scopeRow} onClick={() => requireLogin(() => Taro.navigateTo({ url: practiceUrl('module', module.id) }))}>
                          <View className={styles.scopeMain}>
                            <Text className={styles.moduleName}>{module.name} · {module.question_count} 题</Text>
                            {moduleProgress && <Text className={styles.scopeMeta}>{progressLabel(moduleProgress)}</Text>}
                          </View>
                          <View className={styles.scopeActions}>
                            <Text className={styles.scopeAction}>练习模块</Text>
                            <Text
                              className={styles.scopeAction}
                              onClick={e => {
                                e.stopPropagation()
                                requireLogin(() => Taro.navigateTo({
                                  url: `/${ROUTES.QUIZ_QUESTION_SELECT}?scopeType=module&scopeId=${module.id}`,
                                }))
                              }}
                            >选题</Text>
                          </View>
                        </View>
                        {module.knowledge_points.map(point => {
                          const pointProgress = moduleProgress?.knowledge_points.find(item => item.knowledge_point_id === point.id)
                          return (
                            <View key={point.id} className={styles.pointRow} onClick={() => requireLogin(() => Taro.navigateTo({ url: practiceUrl('knowledge_point', point.id) }))}>
                              <View className={styles.scopeMain}>
                                <Text>{point.name}</Text>
                                {pointProgress && <Text className={styles.scopeMeta}>{progressLabel(pointProgress)}</Text>}
                              </View>
                              <View className={styles.scopeActions}>
                                <Text className={styles.scopeAction}>{point.question_count} 题</Text>
                                <Text
                                  className={styles.scopeAction}
                                  onClick={e => {
                                    e.stopPropagation()
                                    requireLogin(() => Taro.navigateTo({
                                      url: `/${ROUTES.QUIZ_QUESTION_SELECT}?scopeType=knowledge_point&scopeId=${point.id}`,
                                    }))
                                  }}
                                >选题 ›</Text>
                              </View>
                            </View>
                          )
                        })}
                      </View>
                    )})}
                  </View>
                )}
              </View>
            )
          })}
        </View>
        <QuizBottomNav items={QUIZ_BOTTOM} onItemClick={(item: QuizBottomItem) => requireLogin(() => Taro.navigateTo({ url: `/${item.route}` }))} />
      </ScrollView>
    </View>
  )
}
