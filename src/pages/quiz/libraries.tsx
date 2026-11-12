import { useCallback, useRef, useState } from 'react'
import { Image, ScrollView, Text, View } from '@tarojs/components'
import { useDidShow, useLoad } from '@tarojs/taro'
import { Icon } from '@/components/Icon'
import { PageHeader } from '@/components/PageHeader'
import { ROUTES } from '@/constants/routes'
import { listQuizLibraries } from '@/services/dataService'
import { navigateWithLogin } from '@/utils/loginCoordinator'
import { rememberScope } from '@/utils/practiceScope'
import type { QuizLibraryCatalogItem, QuizVendorTag } from '@/contracts/quiz'
import styles from './libraries.module.scss'

// 左侧厂商栏：与练习助手旧页签同源的四个厂商，顺序沿用（深信服→H3C→NISP→其他）。
const VENDORS: Array<{ tag: QuizVendorTag; label: string; logo?: string }> = [
  { tag: 'sangfor', label: '深信服', logo: '/assets/vendor/sangfor.png' },
  { tag: 'h3c', label: 'H3C', logo: '/assets/vendor/h3c.png' },
  { tag: 'nisp', label: 'NISP', logo: '/assets/vendor/nisp.png' },
  { tag: 'none', label: '其他' },
]

const DEFAULT_VENDOR_TAG: QuizVendorTag = 'sangfor'

export default function QuizLibrariesPage() {
  const [libraries, setLibraries] = useState<QuizLibraryCatalogItem[]>([])
  const [activeVendor, setActiveVendor] = useState<QuizVendorTag>(DEFAULT_VENDOR_TAG)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  // 首次加载转圈，之后 useDidShow 静默刷新（激活码兑换后 accessible 会变化）
  const loadedRef = useRef(false)

  const refresh = useCallback((silent: boolean) => {
    if (!silent) setLoading(true)
    return listQuizLibraries()
      .then(items => {
        setLibraries(items)
        setLoadError('')
        loadedRef.current = true
      })
      .catch(() => {
        if (!loadedRef.current) setLoadError('题库列表加载失败，请下拉重试')
      })
      .finally(() => {
        if (!silent) setLoading(false)
      })
  }, [])

  useLoad(() => { void refresh(false) })
  useDidShow(() => {
    // 首次进入由 useLoad 负责，避免并发双请求
    if (loadedRef.current) void refresh(true)
  })

  const vendorLibraries = libraries.filter(item => item.vendor_tag === activeVendor)

  const handleVendorChange = useCallback((tag: QuizVendorTag) => {
    setActiveVendor(tag)
  }, [])

  const openLibrary = useCallback((item: QuizLibraryCatalogItem) => {
    rememberScope({
      type: 'library',
      id: item.id,
      name: item.name,
      libraryId: item.id,
      libraryName: item.name,
      questionCount: item.question_count,
    })
    void navigateWithLogin(
      `/${ROUTES.QUIZ_PREPARE}?scopeType=library&scopeId=${item.id}&scopeName=${encodeURIComponent(item.name)}`,
    )
  }, [])

  return (
    <View className={styles.page}>
      <PageHeader title='选择题库' shouldShowBack />
      <View className={styles.body}>
        <View className={styles.vendorRail}>
          {VENDORS.map(vendor => {
            const active = vendor.tag === activeVendor
            return (
              <View
                key={vendor.tag}
                className={`${styles.vendorItem} ${active ? styles.vendorItemActive : ''}`}
                onClick={() => handleVendorChange(vendor.tag)}
              >
                <View className={styles.vendorLogoBox}>
                  {vendor.logo
                    ? <Image className={styles.vendorLogo} src={vendor.logo} mode='aspectFit' />
                    : <Icon name='book-open' size={28} color={active ? '#1677FF' : '#999999'} />}
                </View>
                <Text className={active ? styles.vendorLabelActive : styles.vendorLabel}>{vendor.label}</Text>
              </View>
            )
          })}
        </View>

        <View className={styles.libraryPanel}>
          {loading && <Text className={styles.stateText}>正在加载题库列表…</Text>}
          {!loading && loadError && (
            <View className={styles.errorBox} onClick={() => { void refresh(false) }}>
              <Text className={styles.stateText}>{loadError}</Text>
            </View>
          )}
          {!loading && !loadError && vendorLibraries.length === 0 && (
            <Text className={styles.stateText}>该厂商题库筹备中</Text>
          )}
          {!loading && !loadError && vendorLibraries.length > 0 && (
            <ScrollView className={styles.libraryList} scrollY showScrollbar={false}>
              <View className={styles.listCard}>
                {vendorLibraries.map(item => (
                  <View key={item.id} className={styles.libraryRow} onClick={() => openLibrary(item)}>
                    <View className={styles.rowInfo}>
                      <Text className={styles.rowName}>{item.name}</Text>
                      <Text className={styles.rowMeta}>{item.question_count} 题 · {item.module_count} 章</Text>
                    </View>
                    <Icon name='chevron-right' size={16} color='#C0C4CC' />
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </View>
  )
}
