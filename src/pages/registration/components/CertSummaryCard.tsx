import type { ReactNode } from 'react'
import { View, Text } from '@tarojs/components'
import type { CertificationDetail } from '@/types'
import { STRINGS } from '@/constants/strings'
import styles from '../form.module.scss'

interface MetaItem {
  label: string
  value: string
}

interface Props {
  cert: CertificationDetail
  extraMeta?: MetaItem[]
  slot?: ReactNode
}

/**
 * 认证项目摘要卡片
 * 展示认证名称、考试编码、时长、题量、通过分数
 * 可通过 extraMeta 扩展额外信息
 */
export function CertSummaryCard({ cert, extraMeta, slot }: Props) {
  const meta: MetaItem[] = [
    { label: STRINGS.FORM_EXAM_DURATION, value: cert.examDuration },
    { label: STRINGS.FORM_QUESTION_COUNT, value: cert.questionCount + STRINGS.FORM_QUESTION_SUFFIX },
    { label: STRINGS.FORM_PASSING_SCORE, value: cert.passingScore + STRINGS.FORM_SCORE_SUFFIX },
    ...(extraMeta || []),
  ]

  return (
    <View className={styles.section}>
      <Text className={styles.sectionTitle}>{STRINGS.FORM_CERT_SUMMARY}</Text>
      <View className={styles.summaryCard}>
        <Text className={styles.certName}>{cert.name}</Text>
        <View className={styles.certMeta}>
          <Text className={styles.metaItem}>{cert.examCode}</Text>
          {meta.map((m, i) => (
            <Text key={i} className={styles.metaItem}>
              {m.label}: {m.value}
            </Text>
          ))}
        </View>
        {slot}
      </View>
    </View>
  )
}
