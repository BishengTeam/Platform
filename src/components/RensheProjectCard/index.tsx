import { Image, Text, View } from '@tarojs/components'
import { Button } from '@/components/Button'
import type { RensheProject } from '@/services/rensheService'
import { resolveMediaUrl } from '@/utils/media'
import styles from './index.module.scss'

export type RensheBatchLoadState = 'loading' | 'available' | 'empty' | 'error'

interface Props {
  project: RensheProject
  batchState: RensheBatchLoadState
  openCount: number
  onClick: () => void
}

export function RensheProjectCard({ project, batchState, openCount, onClick }: Props) {
  const statusText = batchState === 'loading'
    ? '批次加载中'
    : batchState === 'error'
      ? '批次状态待确认'
      : batchState === 'empty'
        ? '暂无开放批次'
        : openCount > 1 ? `${openCount} 个可报批次` : '有可报名批次'

  return (
    <View className={styles.card} onClick={onClick}>
      <View className={styles.cover}>
        {project.home_cover_url
          ? <Image className={styles.coverImage} src={resolveMediaUrl(project.home_cover_url)} mode='aspectFill' />
          : <View className={styles.coverPlaceholder}><Text className={styles.coverInitial}>{project.name.slice(0, 2)}</Text></View>}
        <View className={styles.statusTag}>
          <Text className={styles.statusText}>{statusText}</Text>
        </View>
      </View>

      <View className={styles.content}>
        <Text className={styles.title}>{project.name}</Text>
        <View className={styles.tagRow}>
          <View className={styles.tag}><Text className={styles.tagText}>{project.occupation_name}</Text></View>
          <View className={styles.tag}><Text className={styles.tagText}>{project.skill_level}</Text></View>
        </View>
        <Text className={styles.description}>
          {project.description || '查看报考资格、材料要求、费用与开放批次。'}
        </Text>
        <View className={styles.footer}>
          <Text className={styles.hint}>进入项目详情</Text>
          <Button size='sm' onClick={onClick}>查看详情</Button>
        </View>
      </View>
    </View>
  )
}
