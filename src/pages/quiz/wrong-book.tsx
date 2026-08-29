import { useState } from 'react'
import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { Button } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import type { PageData, QuizWrongBookItem } from '@/contracts/quiz'
import { listWrongBook } from '@/services/dataService'
import { quizImageUrls, quizOptions, quizTypeLabel } from '@/utils/quizView'
import styles from './wrong-book.module.scss'

const PAGE_SIZE = 20

export default function WrongBookPage() {
  const [page, setPage] = useState<PageData<QuizWrongBookItem> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = (pageNumber = 1) => {
    setLoading(true)
    setError(false)
    listWrongBook({ page: pageNumber, page_size: PAGE_SIZE })
      .then(setPage)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  useDidShow(() => load())

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title='错题本' shouldShowBack />
        <View className={styles.notice}>
          <Text>错题完全由系统维护；练习中连续三次答对后自动移出。列表只展示题干和选项，进入错题专项作答后立即展示答案与解析。</Text>
          <Button size='sm' variant='gradient' disabled={(page?.total ?? 0) === 0} onClick={() => Taro.navigateTo({ url: '/pages/quiz/practice?mode=wrong' })}>最近 20 题专项</Button>
        </View>
        <ScrollView className={styles.body} scrollY>
          {loading && <Text className={styles.state}>正在加载错题本…</Text>}
          {!loading && error && <EmptyState title='错题本加载失败' />}
          {!loading && !error && page?.items.length === 0 && <EmptyState title='暂无错题' />}
          {page?.items.map(item => (
            <View key={item.id} className={styles.card}>
              <View className={styles.cardHeader}>
                <Text className={styles.wrongCount}>
                  {quizTypeLabel(item.question.question_type)} · 已错 {item.wrong_count} 次
                </Text>
                <Text className={styles.wrongDate}>{item.latest_wrong_at.slice(0, 10)}</Text>
              </View>
              <Text className={styles.stem}>{item.question.question_text}</Text>
              {quizImageUrls(item.question.image_urls).length > 0 && (
                <View className={styles.questionImages}>
                  {quizImageUrls(item.question.image_urls).map(url => <Image key={url} className={styles.questionImage} src={url} mode='widthFix' />)}
                </View>
              )}
              <View className={styles.options}>{quizOptions(item.question.options).map(option => (
                <View key={option.label} className={styles.optionBlock}>
                  <Text className={styles.optionText}>{option.label}. {option.text}</Text>
                  {item.question.option_image_urls?.[option.label] && (
                    <Image className={styles.optionImage} src={item.question.option_image_urls[option.label]} mode='widthFix' onClick={() => Taro.previewImage({ urls: [item.question.option_image_urls![option.label]], current: item.question.option_image_urls![option.label] })} />
                  )}
                </View>
              ))}</View>
              {!item.usable_for_practice && <Text className={styles.disabled}>题目已停用，可查看历史内容，但不会进入新的错题专项</Text>}
            </View>
          ))}
          {page && page.total > page.page_size && (
            <View className={styles.pager}>
              <Button variant='secondary' disabled={page.page <= 1 || loading} onClick={() => load(page.page - 1)}>上一页</Button>
              <Text>{page.page} / {Math.ceil(page.total / page.page_size)}</Text>
              <Button variant='secondary' disabled={page.page * page.page_size >= page.total || loading} onClick={() => load(page.page + 1)}>下一页</Button>
            </View>
          )}
        </ScrollView>
      </View>
    </AuthGuard>
  )
}
