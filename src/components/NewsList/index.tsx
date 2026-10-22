import { Image, View, Text } from '@tarojs/components'

import { Icon } from '@/components/Icon'
import { formatDate } from '@/utils/format'
import { resolveMediaUrl } from '@/utils/media'
import type { GzhArticleBrief } from '@/types'
import styles from './index.module.scss'

interface NewsListProps {
  articles: GzhArticleBrief[]
  onArticleClick?: (article: GzhArticleBrief) => void
}

/**
 * 首页「新闻资讯」板块列表：公众号推文「左文右图」行（标题两行省略 +
 * 发布日期 + 封面方图），点击进 webview 打开原文。封面缺失时退回
 * 纯文字行（保留折角箭头作为可点暗示）。
 */
export function NewsList({ articles, onArticleClick }: NewsListProps) {
  return (
    <View className={styles.list}>
      {articles.map((article) => (
        <View
          key={article.id}
          className={styles.item}
          onClick={() => onArticleClick?.(article)}
        >
          <View className={styles.itemMain}>
            <Text className={styles.itemTitle}>{article.title}</Text>
            <Text className={styles.itemDate}>{formatDate(article.publish_time, '')}</Text>
          </View>
          {article.thumb_url ? (
            <Image
              className={styles.itemThumb}
              src={resolveMediaUrl(article.thumb_url)}
              mode='aspectFill'
              lazyLoad
            />
          ) : (
            <Icon name='chevron-right' size={16} color='#C0C4CC' />
          )}
        </View>
      ))}
    </View>
  )
}
