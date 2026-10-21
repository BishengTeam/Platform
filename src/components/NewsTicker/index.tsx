import { View, Text } from '@tarojs/components'

import { Icon } from '@/components/Icon'
import { STRINGS } from '@/constants/strings'
import type { GzhArticleBrief } from '@/types'
import styles from './index.module.scss'

interface NewsTickerProps {
  article: GzhArticleBrief
  onClick?: (article: GzhArticleBrief) => void
}

/** 首页公众号资讯通告栏：微信绿 badge + 单行省略标题 + 浅灰折角箭头。 */
export function NewsTicker({ article, onClick }: NewsTickerProps) {
  return (
    <View className={styles.ticker} onClick={() => onClick?.(article)}>
      <Text className={styles.badge}>{STRINGS.INDEX_GZH_BADGE}</Text>
      <Text className={styles.title}>{article.title}</Text>
      <Icon name='chevron-right' size={16} color='#C0C4CC' />
    </View>
  )
}
