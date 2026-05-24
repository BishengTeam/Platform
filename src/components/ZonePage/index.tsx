import type { ReactNode } from 'react'
import { View } from '@tarojs/components'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { ZoneBanner } from '@/components/ZoneBanner'
import type { ZoneBannerItem } from '@/components/ZoneBanner'
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
  footer?: ReactNode
  shouldShowBack?: boolean
  onBack?: () => void
  className?: string
}

export function ZonePage({
  title,
  bannerItems,
  tagFilters,
  activeTag,
  onTagChange,
  children,
  header,
  footer,
  shouldShowBack = true,
  onBack,
  className,
}: ZonePageProps) {
  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={title} shouldShowBack={shouldShowBack} onBack={onBack} />
        <View className={`${styles.body} ${className || ''}`}>
          <View className={styles.bannerWrap}>
            <ZoneBanner items={bannerItems} />
          </View>
          <View className={styles.content}>
            <TagFilter tags={tagFilters} activeTag={activeTag} onChange={onTagChange} />
            {header}
            <View className={styles.cardList}>
              {children}
            </View>
          </View>
          {footer}
        </View>
      </View>
    </AuthGuard>
  )
}
