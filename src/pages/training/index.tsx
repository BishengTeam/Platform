import { useState, useMemo, useCallback, useEffect } from 'react'
import { View, Text, ScrollView, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { TagFilter } from '@/components/TagFilter'
import { Icon } from '@/components/Icon'
import { QuizBottomNav } from '@/components/QuizBottomNav'
import { QuizCategoryPicker } from '@/components/QuizCategoryPicker'
import { CustomTabBar } from '@/components/TabBar'
import { STRINGS } from '@/constants/strings'
import { ROUTES } from '@/constants/routes'
import type { QuizBottomItem } from '@/constants/quiz'
import { getCourseList, getQuizLibrary, getQuizStats, listQuizLibraries } from '@/services/dataService'
import { formatPrice, formatCategory, CATEGORY_LABEL_MAP } from '@/utils/format'
import type { CourseBrief } from '@/types'
import type { QuizLibraryCatalogDetail, QuizLibraryCatalogItem, QuizPracticeScopeType, QuizStats } from '@/contracts/quiz'
import styles from './index.module.scss'

const MAIN_TABS = [STRINGS.TRAINING_TAB_COURSE, STRINGS.TRAINING_TAB_QUIZ]

const TRAINING_QUIZ_BOTTOM: QuizBottomItem[] = [
  { label: '模拟考试', icon: 'clipboard', color: '#1677FF', route: ROUTES.QUIZ_MOCK },
  { label: '练习历史', icon: 'file-text', color: '#722ED1', route: ROUTES.QUIZ_HISTORY },
  { label: '错题', icon: 'book-open', color: '#FF4D4F', route: ROUTES.QUIZ_WRONG_BOOK },
  { label: '收藏', icon: 'star', color: '#FA8C16', route: ROUTES.QUIZ_COLLECTIONS },
]

interface TrainingScope {
  type: QuizPracticeScopeType
  id: number
  name: string
  questionCount: number
}

interface TrainingScopePickerNode extends TrainingScope {
  question_count: number
  children: TrainingScopePickerNode[]
}

export default function TrainingPage() {
  const [mainTab, setMainTab] = useState<string>(MAIN_TABS[0])
  const [techTag, setTechTag] = useState<string>(STRINGS.STUDY_TAG_ALL)

  const [allCourses, setAllCourses] = useState<CourseBrief[]>([])
  const [failedCovers, setFailedCovers] = useState<Set<number>>(new Set())
  const [quizLibraries, setQuizLibraries] = useState<QuizLibraryCatalogItem[]>([])
  const [selectedLibrary, setSelectedLibrary] = useState<QuizLibraryCatalogDetail | null>(null)
  const [selectedScope, setSelectedScope] = useState<TrainingScope | null>(null)
  const [scopePickerVisible, setScopePickerVisible] = useState(false)
  const [quizStats, setQuizStats] = useState<QuizStats | null>(null)

  useEffect(() => {
    getCourseList().then((data) => {
      setAllCourses(data)
    }).catch(() => {
      // 课程数据加载失败静默处理
    })
    listQuizLibraries().then((libraries) => {
      setQuizLibraries(libraries)
      const first = libraries[0]
      if (!first) return undefined
      return getQuizLibrary(first.id).then(detail => {
        setSelectedLibrary(detail)
        setSelectedScope({ type: 'library', id: detail.id, name: detail.name, questionCount: detail.question_count })
      })
    }).catch(() => {
      // 无权益时服务端返回空目录；加载失败保持题库区域为空。
    })
  }, [])

  useEffect(() => {
    if (!selectedScope) {
      setQuizStats(null)
      return
    }
    setQuizStats(null)
    let active = true
    getQuizStats({ scope_type: selectedScope.type, scope_id: selectedScope.id })
      .then(stats => {
        if (active) setQuizStats(stats)
      })
      .catch(() => {
        if (active) setQuizStats(null)
      })
    return () => { active = false }
  }, [selectedScope?.id, selectedScope?.type])


  // 从课程数据动态提取分类标签，统一使用品牌蓝/灰配色
  const courseTags = useMemo(() => {
    const categories = [...new Set(allCourses.map(c => c.category).filter(Boolean))]
    const tagStyle = { activeColor: '#1677FF', activeBg: '#1677FF', activeText: '#ffffff', inactiveBg: '#F5F5F5' }
    return [
      { label: STRINGS.STUDY_TAG_ALL, ...tagStyle },
      ...categories.map((cat) => ({
        label: formatCategory(cat),
        ...tagStyle,
      })),
    ]
  }, [allCourses])

  const techCourses = useMemo(() => {
    if (techTag === STRINGS.STUDY_TAG_ALL) return allCourses
    const eng = CATEGORY_LABEL_MAP[techTag] || techTag
    const lower = eng.toLowerCase()
    return allCourses.filter(c => c.category?.toLowerCase() === lower)
  }, [techTag, allCourses])

  const scopeTree = useMemo<TrainingScopePickerNode[]>(() => {
    if (!selectedLibrary) return []
    return [{
      type: 'library',
      id: selectedLibrary.id,
      name: selectedLibrary.name,
      questionCount: selectedLibrary.question_count,
      question_count: selectedLibrary.question_count,
      children: selectedLibrary.modules.map(module => ({
        type: 'module',
        id: module.id,
        name: module.name,
        questionCount: module.question_count,
        question_count: module.question_count,
        children: module.knowledge_points.map(point => ({
          type: 'knowledge_point',
          id: point.id,
          name: point.name,
          questionCount: point.question_count,
          question_count: point.question_count,
          children: [],
        })),
      })),
    }]
  }, [selectedLibrary])

  const openLibraryScope = useCallback((library: QuizLibraryCatalogItem) => {
    getQuizLibrary(library.id).then(detail => {
      setSelectedLibrary(detail)
      setSelectedScope({ type: 'library', id: detail.id, name: detail.name, questionCount: detail.question_count })
      setScopePickerVisible(true)
    }).catch(() => Taro.showToast({ title: '题库目录加载失败', icon: 'none' }))
  }, [])

  const handleQuizSelect = useCallback(() => {
    if (quizLibraries.length === 0) return
    if (quizLibraries.length === 1) {
      if (selectedLibrary?.id === quizLibraries[0].id) setScopePickerVisible(true)
      else openLibraryScope(quizLibraries[0])
      return
    }
    Taro.showActionSheet({
      itemList: quizLibraries.map(item => `${item.name}（${item.question_count}题）`),
      success: result => {
        const library = quizLibraries[result.tapIndex]
        if (!library) return
        if (selectedLibrary?.id === library.id) setScopePickerVisible(true)
        else openLibraryScope(library)
      },
    })
  }, [openLibraryScope, quizLibraries, selectedLibrary?.id])

  const handleScopeSelect = useCallback((node: TrainingScopePickerNode) => {
    setSelectedScope({
      type: node.type,
      id: node.id,
      name: node.name,
      questionCount: node.questionCount,
    })
    setScopePickerVisible(false)
  }, [])

  const handleQuizBottomNav = useCallback((item: QuizBottomItem) => {
    Taro.navigateTo({ url: `/${item.route}` })
  }, [])

  const handleCourseClick = useCallback((course: CourseBrief) => {
    Taro.navigateTo({ url: `/pages/course/detail?id=${course.id}` })
  }, [])

  const handleCoverError = useCallback((courseId: number) => {
    setFailedCovers(prev => new Set(prev).add(courseId))
  }, [])

  const renderTechTab = () => (
    <View>
      <View className={styles.filterRow}>
        <TagFilter tags={courseTags} activeTag={techTag} onChange={setTechTag} className={styles.tagSm} />
      </View>
      <View className={styles.cardList}>
        {techCourses.map(course => (
          <View
            key={course.id}
            className={styles.courseCard}
            hoverClass={styles.courseCardActive}
            onClick={() => handleCourseClick(course)}
          >
            <View className={styles.coverWrap}>
              {course.cover_url && !failedCovers.has(course.id) ? (
                <Image
                  className={styles.coverImage}
                  src={course.cover_url}
                  mode='aspectFill'
                  onError={() => handleCoverError(course.id)}
                />
              ) : (
                <View className={styles.coverPlaceholder}>
                  <Icon name='play-circle' size={32} color='#1677FF' />
                </View>
              )}
            </View>
            <View className={styles.courseInfo}>
              <View className={styles.courseHeader}>
                <Text className={styles.courseTitle}>{course.title}</Text>
                {course.category && (
                  <Text className={styles.courseTag}>{formatCategory(course.category)}</Text>
                )}
              </View>

              <Text className={styles.courseDesc}>
                {[course.teacher_name && `${STRINGS.COURSE_INSTRUCTOR}: ${course.teacher_name}`, course.description].filter(Boolean).join(' | ')}
              </Text>

              <View className={styles.courseFooter}>
                <Text className={styles.coursePrice}>
                  {course.price === 0 ? STRINGS.ORDERS_FREE : formatPrice(course.price)}
                </Text>
                <View className={styles.studyBtn}>
                  <Icon name='play-circle' size={14} color='#ffffff' />
                  <Text className={styles.studyBtnText}>{STRINGS.STUDY_ENROLL}</Text>
                </View>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  )

  const renderQuizTab = () => (
    <View>
      <View className={styles.quizSelector} onClick={handleQuizSelect}>
        <View className={styles.quizSelectorInfo}>
          <Text className={styles.quizSelectorTitle}>{selectedScope?.name || selectedLibrary?.name || '暂无可用题库'}</Text>
          <Text className={styles.quizSelectorHint}>点击按题库、模块或知识点选择范围</Text>
        </View>
        <Text className={styles.quizSelectorArrow}>▼</Text>
      </View>

      <View className={styles.statsCard}>
        <View className={styles.statsRow}>
          <View className={styles.statsItem}>
            <Text className={styles.statsValue}>
              {(() => {
                return selectedScope?.questionCount ?? '-'
              })()}
            </Text>
            <Text className={styles.statsLabel}>范围全部题量</Text>
          </View>
          <View className={styles.statsItem}>
            <Text className={styles.statsValue}>
              {quizStats ? quizStats.practice.answered_questions : '-'}
            </Text>
            <Text className={styles.statsLabel}>范围已答题目</Text>
          </View>
          <View className={styles.statsItem}>
            <Text className={styles.statsValue}>
              {quizStats ? `${quizStats.practice.accuracy}%` : '-'}
            </Text>
            <Text className={styles.statsLabel}>范围首答正确率</Text>
          </View>
        </View>
        <View className={styles.statsCta} onClick={() => selectedScope && Taro.navigateTo({ url: `/${ROUTES.QUIZ_PREPARE}?scopeType=${selectedScope.type}&scopeId=${selectedScope.id}` })}>
          <Text className={styles.statsCtaText}>开始练习</Text>
        </View>
      </View>

      <QuizBottomNav items={TRAINING_QUIZ_BOTTOM} onItemClick={handleQuizBottomNav} iconSize={32} />
    </View>
  )

  return (
    <View className={styles.page}>
      <AuthGuard>
        <PageHeader title={STRINGS.STUDY_TITLE} shouldShowBack={false} />
        <View className={styles.tabBar}>
          <TagFilter tags={MAIN_TABS} activeTag={mainTab} onChange={setMainTab} variant='underline' />
        </View>
        <ScrollView className={styles.body} scrollY>
          {mainTab === MAIN_TABS[0] && renderTechTab()}
          {mainTab === MAIN_TABS[1] && renderQuizTab()}
        </ScrollView>
      </AuthGuard>
      <CustomTabBar activeTabKey='pages/training/index' onSwitch={(url: string) => Taro.switchTab({ url })} />
      <QuizCategoryPicker
        visible={scopePickerVisible}
        tree={scopeTree}
        selectedId={selectedScope?.id ?? null}
        onSelect={handleScopeSelect}
        onClose={() => setScopePickerVisible(false)}
        title='选择练习范围'
      />
    </View>
  )
}
