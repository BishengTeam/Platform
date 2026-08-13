import { ScrollView, Text, View } from '@tarojs/components'
import type { ReactNode } from 'react'
import type { QuizCategoryNode } from '@/contracts/quiz'
import styles from './index.module.scss'

interface QuizCategoryPickerProps {
  visible: boolean
  tree: QuizCategoryNode[]
  selectedId: number | null
  onSelect: (node: QuizCategoryNode) => void
  onClose: () => void
}

// 源码 px，Taro 会按 designWidth=750 转成 rpx（1px = 1rpx）。
const INDENT_BASE = 32
const INDENT_STEP = 48

export function QuizCategoryPicker({ visible, tree, selectedId, onSelect, onClose }: QuizCategoryPickerProps) {
  if (!visible) return null

  const renderNodes = (nodes: QuizCategoryNode[]): ReactNode[] => nodes.map(node => {
    const isSelected = node.id === selectedId
    const hasChildren = node.children.length > 0
    const indent = INDENT_BASE + Math.max(0, node.depth - 1) * INDENT_STEP
    return (
      <View key={node.id}>
        <View
          className={`${styles.item} ${isSelected ? styles.itemSelected : ''}`}
          style={{ paddingLeft: `${indent}px` }}
          onClick={() => onSelect(node)}
        >
          <Text className={`${styles.itemName} ${isSelected ? styles.itemNameSelected : ''}`}>
            {node.depth > 1 ? '└─ ' : ''}{node.name}
          </Text>
          <Text className={`${styles.itemCount} ${isSelected ? styles.itemCountSelected : ''}`}>
            {hasChildren ? `全部 ${node.question_count} 题` : `${node.question_count} 题`}
          </Text>
        </View>
        {hasChildren && renderNodes(node.children)}
      </View>
    )
  })

  return (
    <View className={styles.overlay} onClick={onClose}>
      <View className={styles.panel} onClick={e => e.stopPropagation()}>
        <View className={styles.header}>
          <Text className={styles.title}>选择题库</Text>
          <View className={styles.close} onClick={onClose}>
            <Text className={styles.closeText}>✕</Text>
          </View>
        </View>
        <ScrollView className={styles.list} scrollY>
          {renderNodes(tree)}
        </ScrollView>
      </View>
    </View>
  )
}
