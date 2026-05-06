import { type ReactNode } from 'react'
import { View } from '@tarojs/components'
import { AuthGuard } from '@/components/AuthGuard'
import { ZoneHeader } from '@/components/ZoneHeader'
import { ZoneBanner, type ZoneBannerItem } from '@/components/ZoneBanner'
import { TagFilter, type TagFilterItem } from '@/components/TagFilter'
import styles from './index.module.scss'

interface ZonePageProps {
  title: string
  bannerItems: ZoneBannerItem[]
  tagFilters: TagFilterItem[]
  activeTag: string
  onTagChange: (tag: string) => void
  children: ReactNode
  header?: ReactNode
}

export function ZonePage({
  title,
  bannerItems,
  tagFilters,
  activeTag,
  onTagChange,
  children,
  header,
}: ZonePageProps) {
  return (
    <AuthGuard>
      <View className={styles.page}>
        <ZoneHeader title={title} />
        <View className={styles.body}>
          <ZoneBanner items={bannerItems} />
          <View className={styles.content}>
            <TagFilter tags={tagFilters} activeTag={activeTag} onChange={onTagChange} />
            {header}
            <View className={styles.cardList}>
              {children}
            </View>
          </View>
        </View>
      </View>
    </AuthGuard>
  )
}
