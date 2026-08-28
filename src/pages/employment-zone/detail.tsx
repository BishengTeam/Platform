import { useEffect, useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { getJobList } from '@/services/zoneService'
import type { JobBrief } from '@/types'
import styles from './detail.module.scss'

export default function JobDetailPage() {
  const { params } = useRouter()
  const jobId = Number(params?.id)
  const [job, setJob] = useState<JobBrief | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!Number.isFinite(jobId) || jobId <= 0) {
      setLoading(false)
      return
    }
    getJobList()
      .then((items) => setJob(items.find((j) => j.id === jobId) ?? null))
      .catch(() => setJob(null))
      .finally(() => setLoading(false))
  }, [jobId])

  const handleCopyContact = () => {
    if (!job?.contact_info) {
      Taro.showToast({ title: '暂无联系方式', icon: 'none' })
      return
    }
    Taro.setClipboardData({ data: job.contact_info })
  }

  return (
    <View className={styles.container}>
      <PageHeader title='岗位详情' shouldShowBack onBack={() => Taro.navigateBack()} />

      {loading && <View className={styles.placeholder}>加载中…</View>}

      {!loading && !job && (
        <View className={styles.placeholder}>岗位不存在或已下架</View>
      )}

      {!loading && job && (
        <View className={styles.detail}>
          <View className={styles.header}>
            <View className={styles.title}>{job.title}</View>
            {job.salary_range && <View className={styles.salary}>{job.salary_range}</View>}
          </View>
          <View className={styles.company}>{job.company}</View>

          <View className={styles.tagList}>
            {job.location && <View className={styles.tag}>{job.location}</View>}
          </View>

          {job.description && (
            <View className={styles.section}>
              <View className={styles.sectionTitle}>职位描述</View>
              <View className={styles.sectionBody}>{job.description}</View>
            </View>
          )}

          {job.requirements && (
            <View className={styles.section}>
              <View className={styles.sectionTitle}>任职要求</View>
              <View className={styles.sectionBody}>{job.requirements}</View>
            </View>
          )}

          <View className={styles.section}>
            <View className={styles.sectionTitle}>联系方式</View>
            <View className={styles.contactRow}>
              <Text className={styles.contactValue}>{job.contact_info || '暂无联系方式'}</Text>
            </View>
          </View>

          <View className={styles.actions}>
            <Button variant='primary' onClick={handleCopyContact} className={styles.actionBtn}>
              复制联系方式
            </Button>
          </View>
        </View>
      )}
    </View>
  )
}
