import { getToken, getAuthSessionId } from '@/utils/authState'
import { navigateWithLogin, requireLogin } from '@/utils/loginCoordinator'
import { useCallback, useEffect, useState } from 'react'
import { Image, Input, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { CheckinBar } from '@/components/CheckinBar'
import { PageHeader } from '@/components/PageHeader'
import { QuizBottomNav } from '@/components/QuizBottomNav'
import { RefreshableScrollView } from '@/components/RefreshableScrollView'
import { QuizGrid } from '@/components/QuizGrid'
import { QUIZ_BOTTOM, QUIZ_GRID } from '@/constants/quiz'
import type { QuizBottomItem } from '@/constants/quiz'
import { FEATURES } from '@/constants/features'
import { ROUTES } from '@/constants/routes'
import { STRINGS } from '@/constants/strings'
import type { QuizLibraryCatalogDetail, QuizLibraryCatalogItem, QuizLibraryProgress, QuizPracticeScopeType, QuizStats } from '@/contracts/quiz'
import { useAuth } from '@/hooks/useAuth'
import { getQuizCheckinStatus, getQuizLibrary, getQuizLibraryProgress, getQuizStats, listQuizLibraries, redeemLibraryCode } from '@/services/dataService'
import { ApiError } from '@/utils/request'
import { splitBilingualQuizTitle } from '@/utils/quizView'
import styles from './index.module.scss'

interface StatCard { label: string; value: string; color: string; onClick?: () => void }

const COLORS = ['#1677FF', '#52C41A', '#722ED1', '#FF4D4F', '#FA8C16', '#13C2C2', '#EB2F96']

export default function QuizIndexPage() {
  const { isChecked, isLoggedIn, sessionId } = useAuth()
  const [libraries, setLibraries] = useState<QuizLibraryCatalogItem[]>([])
  const [expanded, setExpanded] = useState<Record<number, QuizLibraryCatalogDetail>>({})
  const [progress, setProgress] = useState<Record<number, QuizLibraryProgress>>({})
  const [stats, setStats] = useState<QuizStats | null>(null)
  const [streakDays, setStreakDays] = useState(0)
  const [loading, setLoading] = useState(true)
  const [catalogError, setCatalogError] = useState(false)
  const [activationOpen, setActivationOpen] = useState<Record<number, boolean>>({})
  const [codeDrafts, setCodeDrafts] = useState<Record<number, string>>({})
  const [redeeming, setRedeeming] = useState<Record<number, boolean>>({})
  useEffect(() => { setStats(null); setProgress({}); setStreakDays(0) }, [sessionId])

  const loadPersonal = useCallback(() => {
    if (!isChecked || !isLoggedIn) return
    const session = getAuthSessionId()
    return Promise.all([getQuizCheckinStatus(), getQuizStats()])
      .then(([checkin, nextStats]) => {
        if (!getToken() || getAuthSessionId() !== session) return
        setStreakDays(checkin.consecutive_days)
        setStats(nextStats)
      })
      .catch(() => undefined)
  }, [isChecked, isLoggedIn, sessionId])

  const loadProgress = useCallback((libraryIds: number[]) => {
    if (!isChecked || !isLoggedIn || libraryIds.length === 0) return
    const session = getAuthSessionId()
    for (const libraryId of libraryIds) {
      getQuizLibraryProgress(libraryId)
        .then(result => { if (getToken() && getAuthSessionId() === session) setProgress(previous => ({ ...previous, [libraryId]: result })) })
        .catch(() => undefined)
    }
  }, [isChecked, isLoggedIn, sessionId])

  useEffect(() => {
    loadProgress(Object.keys(expanded).map(Number))
  }, [expanded, loadProgress])

  const refreshCatalog = useCallback(async () => {
    setLoading(true)
    setCatalogError(false)
    try {
      setLibraries(await listQuizLibraries())
    } catch {
      setCatalogError(true)
    } finally {
      setLoading(false)
    }
    void loadPersonal()
  }, [loadPersonal])

  useDidShow(() => {
    void refreshCatalog()
    loadProgress(Object.keys(expanded).map(Number))
  })

  // Authentication restoration can finish after the first page-show event.
  // React to that transition so a restored user receives personal data on the
  // first visit without having to leave and reopen the page.
  useEffect(() => {
    if (!isChecked) return
    if (!isLoggedIn) {
      setStats(null)
      setProgress({})
      setStreakDays(0)
      return
    }
    loadPersonal()
  }, [isChecked, isLoggedIn, loadPersonal])

  const handleGrid = useCallback((item: { mode: string }) => {
    const routes: Record<string, string> = { mock: ROUTES.QUIZ_MOCK, history: ROUTES.QUIZ_HISTORY, stats: ROUTES.QUIZ_STATS }
    if (routes[item.mode]) void navigateWithLogin(`/${routes[item.mode]}`)
    else Taro.showToast({ title: '请从下方题库目录选择练习范围', icon: 'none' })
  }, [])

  const toggleLibrary = useCallback(async (libraryId: number) => {
    const library = libraries.find(item => item.id === libraryId)
    if (library && library.access_mode === 'activation_code' && !library.accessible) {
      // 锁定题库不拉目录，展开的是激活码输入面板
      setActivationOpen(previous => ({ ...previous, [libraryId]: !previous[libraryId] }))
      return
    }
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
  }, [expanded, libraries])

  const submitActivation = useCallback(async (library: QuizLibraryCatalogItem) => {
    const draft = (codeDrafts[library.id] ?? '').trim()
    if (!draft) {
      Taro.showToast({ title: '请输入激活码', icon: 'none' })
      return
    }
    if (!(await requireLogin(`/${ROUTES.QUIZ_INDEX}`))) return
    setRedeeming(previous => ({ ...previous, [library.id]: true }))
    try {
      await redeemLibraryCode(library.id, draft)
      setLibraries(previous => previous.map(item => item.id === library.id ? { ...item, accessible: true } : item))
      setCodeDrafts(previous => ({ ...previous, [library.id]: '' }))
      setActivationOpen(previous => ({ ...previous, [library.id]: false }))
      Taro.showToast({ title: '激活成功，开始练习吧', icon: 'success' })
      try {
        const detail = await getQuizLibrary(library.id)
        setExpanded(previous => ({ ...previous, [library.id]: detail }))
      } catch { /* 目录拉取失败时保持收起，下次展开会重试 */ }
    } catch (error) {
      Taro.showToast({
        title: error instanceof ApiError ? error.message : '激活失败，请稍后重试',
        icon: 'none',
        duration: 2500,
      })
    } finally {
      setRedeeming(previous => ({ ...previous, [library.id]: false }))
    }
  }, [codeDrafts])

  const practiceUrl = (scopeType: QuizPracticeScopeType, scopeId: number) =>
    `/${ROUTES.QUIZ_PREPARE}?scopeType=${scopeType}&scopeId=${scopeId}`

  const openWrongBook = () => void navigateWithLogin(`/${ROUTES.QUIZ_WRONG_BOOK}`)

  const progressLabel = (item: { question_count: number; answered_questions: number; latest_accuracy: number }) =>
    `已做 ${item.answered_questions}/${item.question_count} · 正确率 ${item.answered_questions > 0 ? `${item.latest_accuracy}%` : '—'}`

  const totalQuestionCount = libraries.reduce((sum, library) => sum + library.question_count, 0)
  const unansweredCount = stats
    ? Math.max(0, totalQuestionCount - stats.practice.answered_questions)
    : 0

  const statCards: StatCard[] = stats ? [
    { label: '已练', value: String(stats.practice.total_attempts), color: COLORS[0] },
    { label: '正确率', value: `${stats.practice.latest_accuracy}%`, color: COLORS[1] },
    { label: '已答', value: String(stats.practice.answered_questions), color: COLORS[2] },
    { label: '未做', value: String(unansweredCount), color: COLORS[6] },
    { label: '错题', value: String(stats.practice.active_wrong_count), color: COLORS[3], onClick: openWrongBook },
    { label: '连续', value: `${stats.practice.consecutive_days}天`, color: COLORS[4] },
    { label: '今日', value: String(stats.practice.today_questions), color: COLORS[5] },
  ] : []

  return (
    <View className={styles.page}>
      <PageHeader title={STRINGS.QUIZ_HEADER} shouldShowBack />
      <RefreshableScrollView className={styles.body} onRefresh={refreshCatalog}>
        {FEATURES.checkin && isLoggedIn && (
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
            const locked = library.access_mode === 'activation_code' && !library.accessible
            const activationShown = Boolean(activationOpen[library.id])
            return (
              <View key={library.id} className={styles.libraryCard}>
                <View className={styles.libraryHeader} onClick={() => void toggleLibrary(library.id)}>
                  {library.cover_url ? <Image className={styles.libraryCover} src={library.cover_url} mode='aspectFill' /> : <View className={styles.libraryCoverPlaceholder}><Text>题库</Text></View>}
                  <View className={styles.libraryInfo}>
                    <Text className={styles.libraryName}>{library.name}</Text>
                    <Text className={styles.libraryDescription}>{library.description}</Text>
                    <Text className={styles.libraryMeta}>{library.module_count} 个模块 · {library.question_count} 题 · {library.access_mode === 'free' ? '免费' : library.access_mode === 'activation_code' ? (library.accessible ? '已激活' : '激活码解锁') : '课程附赠'}</Text>
                  </View>
                  <Text className={styles.expandIcon}>{detail || (locked && activationShown) ? '收起' : '展开'}</Text>
                </View>
                {locked && activationShown && (
                  <View className={styles.activationPanel}>
                    <Text className={styles.activationTitle}>输入激活码解锁练习</Text>
                    <Text className={styles.activationHint}>请输入发放方提供的激活码，一个激活码仅可激活一次</Text>
                    <View className={styles.activationForm}>
                      <Input
                        className={styles.activationInput}
                        value={codeDrafts[library.id] ?? ''}
                        placeholder='例如 ABCD-1234-EFGH-5678'
                        maxlength={24}
                        onInput={event => setCodeDrafts(previous => ({ ...previous, [library.id]: event.detail.value }))}
                      />
                      <Text
                        className={`${styles.activationBtn} ${redeeming[library.id] ? styles.activationBtnDisabled : ''}`}
                        onClick={() => { if (!redeeming[library.id]) void submitActivation(library) }}
                      >{redeeming[library.id] ? '激活中…' : '激活'}</Text>
                    </View>
                  </View>
                )}
                {detail && !locked && (
                  <View className={styles.catalogTree}>
                    <View className={styles.scopeRow} onClick={() => void navigateWithLogin(practiceUrl('library', library.id))}>
                      <View className={styles.scopeMain}>
                        <Text className={styles.scopeName}>练习整库全部 {detail.question_count} 题</Text>
                        {libraryProgress && <Text className={styles.scopeMeta}>{progressLabel(libraryProgress)}</Text>}
                      </View>
                      <Text className={styles.scopeAction}>开始</Text>
                    </View>
                    {detail.modules.map(module => {
                      const moduleProgress = libraryProgress?.modules.find(item => item.module_id === module.id)
                      const moduleTitle = splitBilingualQuizTitle(module.name)
                      return (
                      <View key={module.id} className={styles.moduleBlock}>
                        <View className={styles.scopeRow} onClick={() => void navigateWithLogin(practiceUrl('module', module.id))}>
                          <View className={styles.scopeMain}>
                            <View className={styles.moduleTitleGroup}>
                              <Text className={styles.moduleName}>{moduleTitle.primary}</Text>
                              <Text className={styles.moduleSubname}>
                                {[moduleTitle.secondary, `${module.question_count} 题`]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </Text>
                            </View>
                            {moduleProgress && <Text className={styles.scopeMeta}>{progressLabel(moduleProgress)}</Text>}
                          </View>
                          <View className={styles.scopeActions}>
                            <Text className={styles.scopeAction}>练习模块</Text>
                            <Text
                              className={styles.scopeAction}
                              onClick={e => {
                                e.stopPropagation()
                                void navigateWithLogin(`/${ROUTES.QUIZ_QUESTION_SELECT}?scopeType=module&scopeId=${module.id}`)
                              }}
                            >选题</Text>
                          </View>
                        </View>
                        {module.knowledge_points
                          // 模块下仅一个同名知识点（厂商单级分类导入的 SR/SR）与模块行完全冗余，不重复渲染
                          .filter(point => !(module.knowledge_points.length === 1 && point.name === module.name))
                          .map(point => {
                          const pointProgress = moduleProgress?.knowledge_points.find(item => item.knowledge_point_id === point.id)
                          return (
                            <View key={point.id} className={styles.pointRow} onClick={() => void navigateWithLogin(practiceUrl('knowledge_point', point.id))}>
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
                                    void navigateWithLogin(`/${ROUTES.QUIZ_QUESTION_SELECT}?scopeType=knowledge_point&scopeId=${point.id}`)
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
        <QuizBottomNav items={QUIZ_BOTTOM} onItemClick={(item: QuizBottomItem) => void navigateWithLogin(`/${item.route}`)} />
      </RefreshableScrollView>
    </View>
  )
}
