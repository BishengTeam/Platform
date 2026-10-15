import { useMemo, useState } from 'react'
import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { Button } from '@/components/Button'
import { ROUTES } from '@/constants/routes'
import type { RenshePlan } from '@/services/rensheService'
import { formatDate, formatDateTime, formatPrice } from '@/utils/format'
import styles from './index.module.scss'

interface Props {
  batch: RenshePlan
  activeApplicationId?: number
  projectId?: number
  selecting?: boolean
  onSelect?: (batch: RenshePlan, mode: ReturnType<typeof getRensheBatchStatus>['mode']) => void
}

const QUALIFICATION_RULES: Record<string, string> = {
  related_major_current_graduating_student: '相关专业在读应届学生，人工审核专业与应届资格',
}

const EDUCATION_LABELS: Record<string, string> = {
  associate: '专科',
  bachelor: '本科',
  master: '硕士',
  doctorate: '博士',
  secondary_vocational: '中职',
}

export function getRensheBatchStatus(batch: RenshePlan, hasActiveApplication: boolean) {
  if (hasActiveApplication) return { text: '已有报名', color: 'blue', disabled: false, mode: 'registration' as const }
  if (batch.status !== 'published') return { text: '报名已结束', color: 'gray', disabled: true, mode: 'ended' as const }

  const now = Date.now()
  const start = batch.apply_start ? new Date(batch.apply_start).getTime() : null
  const end = batch.apply_end ? new Date(batch.apply_end).getTime() : null
  if (start !== null && Number.isFinite(start) && now < start) {
    return { text: '尚未开始', color: 'orange', disabled: true, mode: 'not-started' as const }
  }
  if (end !== null && Number.isFinite(end) && now >= end) {
    return { text: '报名已结束', color: 'gray', disabled: true, mode: 'ended' as const }
  }
  const remaining = batch.capacity === 0 ? null : Math.max(batch.capacity - batch.enrolled, 0)
  if (remaining === 0) return { text: '名额已满', color: 'orange', disabled: true, mode: 'full' as const }
  return { text: '报名中', color: 'green', disabled: false, mode: 'selectable' as const }
}

export function RensheBatchCard({
  batch,
  activeApplicationId,
  projectId,
  selecting,
  onSelect,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const status = getRensheBatchStatus(batch, Boolean(activeApplicationId))
  const remaining = useMemo(() => (
    batch.capacity === 0 ? null : Math.max(batch.capacity - batch.enrolled, 0)
  ), [batch.capacity, batch.enrolled])
  const config = batch.renshe_config
  const qualification = config?.qualification_rule
    ? QUALIFICATION_RULES[config.qualification_rule] ?? config.qualification_rule
    : null
  const educationLevels = config?.education_levels?.map(level => EDUCATION_LABELS[level] ?? level) ?? []
  const requiredMaterials = config?.materials?.filter(material => material.required) ?? []

  const handleAction = () => {
    if (onSelect) {
      onSelect(batch, status.mode)
      return
    }
    if (status.mode === 'registration' && activeApplicationId) {
      Taro.navigateTo({
        url: `/${ROUTES.MINE_REGISTRATION_DETAIL}?type=renshe&id=${activeApplicationId}`,
      })
      return
    }
    if (status.mode !== 'selectable') return
    Taro.navigateTo({
      url: `/${ROUTES.RENSHE_FORM}?plan_id=${batch.id}${projectId ? `&project_id=${projectId}` : ''}`,
    })
  }

  return (
    <View className={styles.card}>
      <View className={styles.header}>
        <Text className={styles.title}>{batch.name}</Text>
        <View className={`${styles.status} ${styles[status.color]}`}>
          <Text className={styles.statusText}>{status.text}</Text>
        </View>
      </View>

      <View className={styles.row}>
        <Text className={styles.label}>报名截止</Text>
        <Text className={styles.value}>{formatDateTime(batch.apply_end, '待公布')}</Text>
      </View>
      <View className={styles.row}>
        <Text className={styles.label}>考试时间</Text>
        <Text className={styles.value}>{formatDate(batch.exam_date, '待公布')}</Text>
      </View>
      <View className={styles.row}>
        <Text className={styles.label}>考试地点</Text>
        <Text className={styles.value}>{batch.exam_location || '待公布'}</Text>
      </View>
      <View className={styles.row}>
        <Text className={styles.label}>报考方式</Text>
        <Text className={styles.value}>{batch.exam_type} · {batch.application_type}</Text>
      </View>

      <View className={styles.requirementToggle} onClick={() => setExpanded(value => !value)}>
        <Text className={styles.requirementToggleText}>
          查看本批次资格与材料要求
        </Text>
        <Text className={styles.requirementArrow}>{expanded ? '收起' : '展开'}</Text>
      </View>

      {expanded && (
        <View className={styles.requirements}>
          <View className={styles.requirementBlock}>
            <Text className={styles.requirementTitle}>资格条件</Text>
            <Text className={styles.requirementText}>{qualification || '以报名表提交时校验结果为准'}</Text>
            {educationLevels.length > 0 && (
              <Text className={styles.requirementText}>适用学历：{educationLevels.join(' / ')}</Text>
            )}
          </View>
          <View className={styles.requirementBlock}>
            <Text className={styles.requirementTitle}>必交材料</Text>
            {requiredMaterials.length > 0
              ? requiredMaterials.map(material => (
                <Text className={styles.requirementText} key={material.kind}>
                  {material.name}（{material.extensions.join(' / ')}，最多 {material.max_count} 份）
                </Text>
              ))
              : <Text className={styles.requirementText}>以报名表材料清单为准</Text>}
          </View>
          <View className={styles.requirementBlock}>
            <Text className={styles.requirementTitle}>完整报名时间</Text>
            <Text className={styles.requirementText}>
              {formatDateTime(batch.apply_start, '待公布')} 至 {formatDateTime(batch.apply_end, '待公布')}
            </Text>
            {remaining !== null && <Text className={styles.requirementText}>剩余名额：{remaining} 人</Text>}
            {(batch.contact_name || batch.contact_phone) && (
              <Text className={styles.requirementText}>
                批次咨询：{batch.contact_name || '老师'}{batch.contact_phone ? ` ${batch.contact_phone}` : ''}
              </Text>
            )}
          </View>
        </View>
      )}

      <View className={styles.footer}>
        <Text className={styles.price}>{formatPrice(batch.price_cents)}</Text>
        <Button
          variant={status.mode === 'selectable' ? 'gradient' : 'secondary'}
          size='sm'
          disabled={status.disabled || Boolean(selecting)}
          loading={selecting}
          onClick={handleAction}
        >
          {status.mode === 'registration'
            ? '查看我的报名'
            : status.mode === 'not-started'
              ? `${formatDate(batch.apply_start)} 开始`
              : status.mode === 'full' ? '名额已满' : status.mode === 'ended' ? '报名已结束' : '选择本批次'}
        </Button>
      </View>
    </View>
  )
}
