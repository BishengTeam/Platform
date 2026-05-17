import { useState, useRef, useCallback } from 'react'
import { View } from '@tarojs/components'
import type { ITouchEvent } from '@tarojs/components'
import { Icon } from '@/components/Icon'
import { useWindowSize } from '@/hooks/useWindowSize'
import styles from './index.module.scss'

const DRAG_THRESHOLD = 6
const BTN_SIZE_RPX = 96
const EDGE_GAP_RPX = 24

function rpxToPx(rpx: number, windowWidth: number) {
  return (rpx / 750) * windowWidth
}

interface FloatingServiceProps {
  onPress?: () => void
}

export function FloatingService({ onPress }: FloatingServiceProps) {
  const { width: windowWidth, height: windowHeight } = useWindowSize()
  const [side, setSide] = useState<'left' | 'right'>('right')
  const [y, setY] = useState(300)
  const startRef = useRef({ y: 0, moved: 0, lastTouchX: 0 })
  const dragY = useRef(y)

  const btnPx = rpxToPx(BTN_SIZE_RPX, windowWidth)
  const edgeGap = rpxToPx(EDGE_GAP_RPX, windowWidth)

  const x = side === 'left' ? edgeGap : windowWidth - btnPx - edgeGap

  const handleTouchStart = useCallback((e: ITouchEvent) => {
    const touch = e.touches[0]
    startRef.current = { y: touch.clientY - y, moved: 0, lastTouchX: touch.clientX }
    dragY.current = y
  }, [y])

  const handleTouchMove = useCallback((e: ITouchEvent) => {
    const touch = e.touches[0]
    const newY = touch.clientY - startRef.current.y
    const dy = Math.abs(newY - dragY.current)
    startRef.current.moved += dy
    startRef.current.lastTouchX = touch.clientX
    dragY.current = newY

    const maxY = windowHeight - btnPx * 3
    setY(Math.max(0, Math.min(newY, maxY)))
  }, [btnPx, windowHeight])

  const handleTouchEnd = useCallback(() => {
    if (startRef.current.moved < DRAG_THRESHOLD) {
      onPress?.()
      return
    }
    const midX = windowWidth / 2
    setSide(startRef.current.lastTouchX < midX ? 'left' : 'right')
  }, [windowWidth, onPress])

  return (
    <View
      className={styles.btn}
      style={{
        left: `${x}px`,
        top: `${y}px`,
      }}
      catchMove
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <Icon name='headset' size={32} color='#1677FF' />
    </View>
  )
}
