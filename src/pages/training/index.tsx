import { useState, useMemo, useCallback } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { TagFilter } from '@/components/TagFilter'
import { ZoneCard } from '@/components/ZoneCard'
import { Button } from '@/components/Button'
import { CustomTabBar } from '@/components/TabBar'
import { STRINGS } from '@/constants/strings'
import { ROUTES } from '@/constants/routes'
import { getCourseList, getQuizCategories, getCheckinRecords } from '@/services/dataService'
import type { TagFilterItem } from '@/types/registration'
import styles from './index.module.scss'

const MAIN_TABS = [STRINGS.TRAINING_TAB_TECH, STRINGS.TRAINING_TAB_COURSE, STRINGS.TRAINING_TAB_QUIZ]
const TECH_TAGS: TagFilterItem[] = [
  { label: '全部', activeColor: '#1677FF', activeBg: '#1677FF', activeText: '#ffffff', inactiveBg: '#F0F5FF' },
  { label: STRINGS.TAG_H3C, activeColor: '#1677FF', activeBg: '#1677FF', activeText: '#ffffff', inactiveBg: '#E8F2FF' },
  { label: STRINGS.TAG_SANGFOR, activeColor: '#52C41A', activeBg: '#52C41A', activeText: '#ffffff', inactiveBg: '#F6FFED' },
  { label: STRINGS.TAG_NISP, activeColor: '#FA8C16', activeBg: '#FA8C16', activeText: '#ffffff', inactiveBg: '#FFF7E6' },
]
const COURSE_TAGS: TagFilterItem[] = [
  { label: '全部', activeColor: '#1677FF', activeBg: '#1677FF', activeText: '#ffffff', inactiveBg: '#F0F5FF' },
  { label: STRINGS.TRAINING_FREE_COURSE, activeColor: '#52C41A', activeBg: '#52C41A', activeText: '#ffffff', inactiveBg: '#F6FFED' },
  { label: STRINGS.TRAINING_PAID_COURSE, activeColor: '#FA8C16', activeBg: '#FA8C16', activeText: '#ffffff', inactiveBg: '#FFF7E6' },
]
const TECH_CATEGORIES = ['h3c', 'sangfor', 'nisp']

const QUIZ_GRID = [
  { label: STRINGS.QUIZ_SECTION_PRACTICE, icon: '📝', mode: 'practice' },
  { label: STRINGS.QUIZ_MOCK_EXAM, icon: '📋', mode: 'mock' },
  { label: STRINGS.QUIZ_CHALLENGE, icon: '⚡', mode: 'challenge' },
  { label: STRINGS.QUIZ_ASSESSMENT, icon: '🎯', mode: 'assessment' },
]

const QUIZ_BOTTOM = [
  { label: STRINGS.QUIZ_WRONG_BOOK_TITLE, icon: '📕', route: ROUTES.QUIZ_WRONG_BOOK },
  { label: STRINGS.QUIZ_COLLECTIONS_TITLE, icon: '⭐', route: ROUTES.QUIZ_COLLECTIONS },
  { label: STRINGS.QUIZ_CHECKIN_TITLE, icon: '📅', route: ROUTES.QUIZ_CHECKIN },
]

export default function TrainingPage() {
  const [mainTab, setMainTab] = useState<string>(MAIN_TABS[0])
  const [techTag, setTechTag] = useState('全部')
  const [courseTag, setCourseTag] = useState('全部')

  const allCourses = getCourseList()
  const quizCategories = getQuizCategories()
  const checkinRecords = getCheckinRecords()
  const streakDays = checkinRecords.filter(r => r.completed).length

  const techCourses = useMemo(() => {
    if (techTag === '全部') return allCourses.filter(c => TECH_CATEGORIES.includes(c.category))
    const cat = techTag === STRINGS.TAG_H3C ? 'h3c' : techTag === STRINGS.TAG_SANGFOR ? 'sangfor' : 'nisp'
    return allCourses.filter(c => c.category === cat)
  }, [techTag, allCourses])

  const onlineCourses = useMemo(() => {
    if (courseTag === '全部') return allCourses.filter(c => c.category === 'free' || c.category === 'paid')
    if (courseTag === STRINGS.TRAINING_FREE_COURSE) return allCourses.filter(c => c.category === 'free')
    return allCourses.filter(c => c.category === 'paid')
  }, [courseTag, allCourses])

  const handleQuizGrid = useCallback((mode: string) => {
    if (mode === 'mock') {
      Taro.navigateTo({ url: `/pages/quiz/mock` })
    } else {
      Taro.navigateTo({ url: `/pages/quiz/practice?mode=${mode}` })
    }
  }, [])

  const handleQuizCategory = useCallback((categoryId: string) => {
    Taro.navigateTo({ url: `/pages/quiz/practice?categoryId=${categoryId}` })
  }, [])

  const renderTechTab = () => (
    <View>
      <View className={styles.filterRow}>
        <TagFilter tags={TECH_TAGS} activeTag={techTag} onChange={setTechTag} className={styles.tagSm} />
      </View>
      <View className={styles.cardList}>
        {techCourses.map(course => (
          <ZoneCard
            key={course.id}
            title={course.title}
            subtitle={course.description}
            tags={[course.tag, course.duration, `${course.rating}分`]}
            price={course.price === 0 ? STRINGS.ORDERS_FREE : `¥${course.price}`}
            originalPrice={course.originalPrice > 0 ? `¥${course.originalPrice}` : undefined}
            buttonText={STRINGS.STUDY_ENROLL}
            onButtonClick={() => Taro.navigateTo({ url: `/pages/course/detail?id=${course.id}` })}
          />
        ))}
      </View>
    </View>
  )

  const renderCourseTab = () => (
    <View>
      <View className={styles.filterRow}>
        <TagFilter tags={COURSE_TAGS} activeTag={courseTag} onChange={setCourseTag} className={styles.tagSm} />
      </View>
      <View className={styles.cardList}>
        {onlineCourses.map(course => (
          <ZoneCard
            key={course.id}
            title={course.title}
            subtitle={course.description}
            tags={[course.tag, course.duration, `${course.rating}分`]}
            price={course.price === 0 ? STRINGS.ORDERS_FREE : `¥${course.price}`}
            originalPrice={course.originalPrice > 0 ? `¥${course.originalPrice}` : undefined}
            buttonText={course.price === 0 ? STRINGS.COURSE_VIEW_DETAIL : STRINGS.STUDY_ENROLL}
            onButtonClick={() => Taro.navigateTo({ url: `/pages/course/detail?id=${course.id}` })}
          />
        ))}
      </View>
    </View>
  )

  const renderQuizTab = () => (
    <View>
      <View className={styles.checkinBar}>
        <View className={styles.checkinInfo}>
          <Text className={styles.checkinStreak}>
            {STRINGS.QUIZ_CHECKIN_STREAK} {streakDays} {STRINGS.QUIZ_CHECKIN_DAYS}
          </Text>
        </View>
        <Button size='sm' onClick={() => Taro.navigateTo({ url: `/pages/quiz/checkin` })}>
          {STRINGS.QUIZ_CHECKIN_BTN}
        </Button>
      </View>

      <View className={styles.quizGrid}>
        {QUIZ_GRID.map(item => (
          <View key={item.mode} className={styles.quizGridItem} onClick={() => handleQuizGrid(item.mode)}>
            <Text className={styles.quizGridIcon}>{item.icon}</Text>
            <Text className={styles.quizGridLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      <View className={styles.quizCategoryList}>
        {quizCategories.map(cat => (
          <View key={cat.id} className={styles.quizCategoryCard}>
            <View className={styles.quizCategoryInfo}>
              <Text className={styles.quizCategoryName}>{cat.name}</Text>
              <Text className={styles.quizCategoryCount}>{cat.questionCount}{STRINGS.FORM_QUESTION_SUFFIX}</Text>
            </View>
            <Button size='sm' variant='secondary' onClick={() => handleQuizCategory(cat.id)}>
              {STRINGS.QUIZ_START_PRACTICE}
            </Button>
          </View>
        ))}
      </View>

      <View className={styles.quizBottom}>
        {QUIZ_BOTTOM.map(item => (
          <View key={item.route} className={styles.quizBottomItem} onClick={() => Taro.navigateTo({ url: `/pages/${item.route}` })}>
            <Text className={styles.quizBottomIcon}>{item.icon}</Text>
            <Text className={styles.quizBottomLabel}>{item.label}</Text>
          </View>
        ))}
      </View>
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
          {mainTab === MAIN_TABS[1] && renderCourseTab()}
          {mainTab === MAIN_TABS[2] && renderQuizTab()}
        </ScrollView>
      </AuthGuard>
      <CustomTabBar activeTabKey='pages/training/index' onSwitch={(url: string) => Taro.switchTab({ url })} />
    </View>
  )
}
