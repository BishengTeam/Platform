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
import { getCourseList, getQuizStats, listQuizCategories } from '@/services/dataService'
import { formatPrice, formatCategory, CATEGORY_LABEL_MAP } from '@/utils/format'
import type { CourseBrief } from '@/types'
import type { QuizCategoryNode, QuizStats } from '@/contracts/quiz'
import styles from './index.module.scss'

const MAIN_TABS = [STRINGS.TRAINING_TAB_COURSE, STRINGS.TRAINING_TAB_QUIZ]

const TRAINING_QUIZ_BOTTOM: QuizBottomItem[] = [
  { label: '模拟考试', icon: '📋', route: ROUTES.QUIZ_MOCK },
  { label: '错题', icon: '📕', route: ROUTES.QUIZ_WRONG_BOOK },
  { label: '收藏', icon: '⭐', route: ROUTES.QUIZ_COLLECTIONS },
]

export default function TrainingPage() {
  const [mainTab, setMainTab] = useState<string>(MAIN_TABS[0])
  const [techTag, setTechTag] = useState<string>(STRINGS.STUDY_TAG_ALL)

  const [allCourses, setAllCourses] = useState<CourseBrief[]>([])
  const [failedCovers, setFailedCovers] = useState<Set<number>>(new Set())
  const [quizCategories, setQuizCategories] = useState<QuizCategoryNode[]>([])
  const [quizTree, setQuizTree] = useState<QuizCategoryNode[]>([])
  const [selectedQuizId, setSelectedQuizId] = useState<number | null>(null)
  const [quizStats, setQuizStats] = useState<QuizStats | null>(null)

  useEffect(() => {
    getCourseList().then((data) => {
      setAllCourses(data)
    }).catch(() => {
      // 课程数据加载失败静默处理
    })
    listQuizCategories().then((tree) => {
      setQuizTree(tree)
      // 从树中提取平铺列表，用于 selectedQuiz 查找
      const flat: QuizCategoryNode[] = []
      const walk = (nodes: QuizCategoryNode[]) => {
        for (const n of nodes) {
          flat.push(n)
          walk(n.children)
        }
      }
      walk(tree)
      setQuizCategories(flat)
      setSelectedQuizId(flat[0]?.id ?? null)
    }).catch(() => {
      // 题库分类加载失败静默处理
    })
    getQuizStats().then(setQuizStats).catch(() => {})
  }, [])


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
    const choose = (nodes: QuizCategoryNode[]) => {
      if (nodes.length === 0) return
      Taro.showActionSheet({
        itemList: nodes.map(node => `${node.name}（${node.question_count}题）`),
        success: result => {
          const selected = nodes[result.tapIndex]
          if (!selected) return
          setSelectedQuizId(selected.id)
          if (selected.children.length > 0) choose(selected.children)
        },
      })
    }
    choose(quizTree)
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
                return selectedQuiz?.question_count ?? '-'
              })()}
            </Text>
            <Text className={styles.statsLabel}>分类可用题量</Text>
          </View>
          <View className={styles.statsItem}>
            <Text className={styles.statsValue}>
              {quizStats ? quizStats.practice.answered_questions : '-'}
            </Text>
            <Text className={styles.statsLabel}>全局已答题目</Text>
          </View>
          <View className={styles.statsItem}>
            <Text className={styles.statsValue}>
              {quizStats ? `${quizStats.practice.accuracy}%` : '-'}
            </Text>
            <Text className={styles.statsLabel}>全局首答正确率</Text>
          </View>
        </View>
        <View className={styles.statsCta} onClick={() => selectedQuizId && Taro.navigateTo({ url: `/${ROUTES.QUIZ_PRACTICE}?categoryId=${selectedQuizId}` })}>
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
