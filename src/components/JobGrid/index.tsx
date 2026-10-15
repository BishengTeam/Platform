import { View, Text } from '@tarojs/components'
import styles from './index.module.scss'

export interface JobGridItem {
  id: number
  /** 岗位名称，单行截断 */
  title: string
  /** 微型标签（公司/招聘人数等），单行放不下即隐藏 */
  tags?: string[]
  location?: string | null
  /** 为空时展示"面议" */
  salary?: string | null
}

interface Props {
  items: JobGridItem[]
  onCardClick?: (item: JobGridItem) => void
}

export function JobGrid({ items, onCardClick }: Props) {
  return (
    <View className={styles.grid}>
      {items.map((item) => (
        <View
          key={item.id}
          className={styles.card}
          onClick={() => onCardClick?.(item)}
        >
          <Text className={styles.title}>{item.title}</Text>
          {item.tags && item.tags.length > 0 && (
            <View className={styles.tags}>
              {item.tags.map((tag) => (
                <Text key={tag} className={styles.tag}>
                  {tag}
                </Text>
              ))}
            </View>
          )}
          <View className={styles.footer}>
            <Text className={styles.location}>{item.location ?? ''}</Text>
            {item.salary ? (
              <Text className={styles.salary}>{item.salary}</Text>
            ) : (
              <Text className={styles.salaryFallback}>面议</Text>
            )}
          </View>
        </View>
      ))}
    </View>
  )
}
