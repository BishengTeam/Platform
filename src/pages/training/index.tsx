import { useState, useMemo, useCallback, useEffect } from 'react'
import { View, Text, ScrollView, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { TagFilter } from '@/components/TagFilter'
import { Icon } from '@/components/Icon'
import { QuizBottomNav } from '@/components/QuizBottomNav'
import { CustomTabBar } from '@/components/TabBar'
import { STRINGS } from '@/constants/strings'
import { ROUTES } from '@/constants/routes'
import type { QuizBottomItem } from '@/constants/quiz'
import { getCourseList, getQuizCategoryTree, getQuizProgress } from '@/services/dataService'
import { formatPrice, formatCategory, CATEGORY_LABEL_MAP } from '@/utils/format'
import type { CourseBrief, QuizCategory, QuizStats } from '@/types'
import styles from './index.module.scss'

const MAIN_TABS = [STRINGS.TRAINING_TAB_COURSE, STRINGS.TRAINING_TAB_QUIZ]

const TRAINING_QUIZ_BOTTOM: QuizBottomItem[] = [
  { label: '模拟考试', icon: '📋', route: ROUTES.QUIZ_MOCK },
  { label: '错题', icon: '📕', route: ROUTES.QUIZ_WRONG_BOOK },
  { label: '收藏', icon: '⭐', route: ROUTES.QUIZ_COLLECTIONS },
]

export default function TrainingPage() {
  const [mainTab, setMainTab] = useState<string>(MAIN_TABS[0])
  const [techTag, setTechTag] = useState(STRINGS.STUDY_TAG_ALL)

  const [allCourses, setAllCourses] = useState<CourseBrief[]>([])
  const [failedCovers, setFailedCovers] = useState<Set<number>>(new Set())
  const [quizCategories, setQuizCategories] = useState<QuizCategory[]>([])
  const [quizTree, setQuizTree] = useState<QuizCategory[]>([])
  const [selectedQuizId, setSelectedQuizId] = useState('')
  const [quizStats, setQuizStats] = useState<QuizStats | null>(null)

  useEffect(() => {
    getCourseList().then((data) => {
      setAllCourses(data)
    }).catch((err) => {
      // 课程数据加载失败静默处理
    })
    getQuizCategoryTree().then((tree) => {
      setQuizTree(tree)
      // 从树中提取平铺列表，用于 selectedQuiz 查找
      const flat: QuizCategory[] = []
      const walk = (nodes: QuizCategory[]) => {
        for (const n of nodes) {
          flat.push(n)
          if (n.children) walk(n.children)
        }
      }
      walk(tree)
      setQuizCategories(flat)
      setSelectedQuizId(flat[0]?.id || '')
    }).catch((err) => {
      // 题库分类加载失败静默处理
    })
  }, [])

  // 切换题库分类时重新获取统计数据
  useEffect(() => {
    if (!selectedQuizId) return
    getQuizProgress(selectedQuizId).then((stats) => {
      setQuizStats(stats)
    }).catch(() => {})
  }, [selectedQuizId])


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

  const selectedQuiz = quizCategories.find(q => q.id === selectedQuizId) || quizCategories[0]

  const techCourses = useMemo(() => {
    if (techTag === STRINGS.STUDY_TAG_ALL) return allCourses
    const eng = CATEGORY_LABEL_MAP[techTag] || techTag
    const lower = eng.toLowerCase()
    return allCourses.filter(c => c.category?.toLowerCase() === lower)
  }, [techTag, allCourses])

  const handleQuizSelect = useCallback(() => {
    const parents = quizTree
    if (!parents.length) return
    Taro.showActionSheet({
      itemList: parents.map(p => p.name),
      success: (res1) => {
        const parent = parents[res1.tapIndex]
        if (!parent) return
        // 无子分类 → 直接选中叶子节点
        if (!parent.children?.length) {
          setSelectedQuizId(parent.id)
          return
        }
        // 有子分类 → 弹出第二级；取消则默认选中父分类
        Taro.showActionSheet({
          itemList: parent.children.map(c => c.name),
          success: (res2) => {
            const child = parent.children[res2.tapIndex]
            if (child) setSelectedQuizId(child.id)
          },
          fail: () => {
            setSelectedQuizId(parent.id)
          },
        })
      },
      fail: () => {
        // 用户取消选择，不做任何操作
      },
    })
  }, [quizTree])

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
          <Text className={styles.quizSelectorTitle}>{selectedQuiz?.name || '请选择题库'}</Text>
          <Text className={styles.quizSelectorHint}>点击可选择/切换题库</Text>
        </View>
        <Text className={styles.quizSelectorArrow}>▼</Text>
      </View>

      <View className={styles.statsCard}>
        <View className={styles.statsRow}>
          <View className={styles.statsItem}>
            <Text className={styles.statsValue}>
              {(() => {
                const total = quizStats?.totalQuestions || selectedQuiz?.questionCount || 0
                const done = quizStats?.answeredQuestions ?? 0
                return quizStats ? total - done : '-'
              })()}
            </Text>
            <Text className={styles.statsLabel}>未做题</Text>
          </View>
          <View className={styles.statsItem}>
            <Text className={styles.statsValue}>
              {quizStats ? (quizStats.answeredQuestions ?? 0) : '-'}
            </Text>
            <Text className={styles.statsLabel}>已做题</Text>
          </View>
          <View className={styles.statsItem}>
            <Text className={styles.statsValue}>
              {quizStats ? `${quizStats.accuracy ?? 0}%` : '-'}
            </Text>
            <Text className={styles.statsLabel}>正确率</Text>
          </View>
        </View>
        <View className={styles.statsCta} onClick={() => Taro.navigateTo({ url: `/${ROUTES.QUIZ_PRACTICE}?categoryId=${selectedQuizId}` })}>
          <Text className={styles.statsCtaText}>开始练习</Text>
        </View>
      </View>

      <QuizBottomNav items={TRAINING_QUIZ_BOTTOM} onItemClick={handleQuizBottomNav} />
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
    </View>
  )
}