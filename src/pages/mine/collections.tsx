import { useState, useEffect } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { TagFilter } from '@/components/TagFilter'
import { EmptyState } from '@/components/EmptyState'
import { STRINGS } from '@/constants/strings'
import { getMyCollections } from '@/services/dataService'
import styles from './collections.module.scss'

const TABS = [STRINGS.MINE_COLLECTIONS_COURSES, STRINGS.MINE_COLLECTIONS_MATERIALS]

export default function MineCollectionsPage() {
  const [activeTab, setActiveTab] = useState<string>(TABS[0])
  const [data, setData] = useState<{ courses: any[]; materials: any[] }>({ courses: [], materials: [] })

  useEffect(() => {
    getMyCollections().then(setData).catch(() => {})
  }, [])

  const items = activeTab === TABS[0] ? data.courses : data.materials

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.MINE_COLLECTIONS_TITLE} shouldShowBack />
        <View className={styles.body}>
          <View className={styles.filterRow}>
            <TagFilter tags={TABS} activeTag={activeTab} onChange={setActiveTab} />
          </View>
          {items.length === 0 ? (
            <EmptyState title={STRINGS.MINE_COLLECTIONS_EMPTY} />
          ) : (
            <View className={styles.list}>
              {items.map((item, idx) => (
                <View key={idx} className={styles.card}>
                  <Text className={styles.itemTitle}>{item.title}</Text>
                  {activeTab === TABS[0] && 'instructor' in item && (
                    <Text className={styles.itemSub}>
                      {item.instructor}  |  ¥{item.price}
                    </Text>
                  )}
                  {activeTab === TABS[1] && 'type' in item && (
                    <Text className={styles.itemSub}>{item.type}</Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </AuthGuard>
  )
}
