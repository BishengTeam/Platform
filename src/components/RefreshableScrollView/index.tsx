import { useCallback, useState } from 'react'
import { ScrollView, type ScrollViewProps } from '@tarojs/components'

type RefreshableScrollViewProps = Omit<
  ScrollViewProps,
  | 'refresherEnabled'
  | 'refresherThreshold'
  | 'refresherTriggered'
  | 'onRefresherRefresh'
> & {
  onRefresh: () => Promise<unknown> | void
}

/**
 * A vertical ScrollView with the native WeChat refresher enabled.
 *
 * Pages using an internal ScrollView cannot rely on page-level pull refresh:
 * the scroll gesture is consumed by the inner container. This component keeps
 * the list scrollable and puts the refresher in the same container.
 */
export function RefreshableScrollView({
  onRefresh,
  refresherBackground = '#F0F5FF',
  ...props
}: RefreshableScrollViewProps) {
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = useCallback(async () => {
    if (refreshing) return
    setRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setRefreshing(false)
    }
  }, [onRefresh, refreshing])

  return (
    <ScrollView
      {...props}
      scrollY
      refresherEnabled
      refresherThreshold={60}
      refresherDefaultStyle='black'
      refresherBackground={refresherBackground}
      refresherTriggered={refreshing}
      onRefresherRefresh={handleRefresh}
    />
  )
}
