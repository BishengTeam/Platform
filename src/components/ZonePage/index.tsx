import { type ReactNode } from 'react'
import { View } from '@tarojs/components'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { ZoneBanner, type ZoneBannerItem } from '@/components/ZoneBanner'
import { TagFilter } from '@/components/TagFilter'
import type { TagFilterItem } from '@/types/registration'
import styles from './index.module.scss'

interface ZonePageProps {
  title: string
  bannerItems: ZoneBannerItem[]
  tagFilters: TagFilterItem[]
  activeTag: string
  onTagChange: (tag: string) => void
  children: ReactNode
  header?: ReactNode
  onBack?: () => void
}

export function ZonePage({
  title,
  bannerItems,
  tagFilters,
  activeTag,
  onTagChange,
  children,
  header,
  onBack,
}: ZonePageProps) {
  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={title} shouldShowBack onBack={onBack} />
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
