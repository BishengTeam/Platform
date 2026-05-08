import { useState, useRef, useCallback } from 'react'
import { View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { Icon } from '@/components/Icon'
import styles from './index.module.scss'

const DRAG_THRESHOLD = 6
const BTN_SIZE_RPX = 96
const EDGE_GAP_RPX = 24

function rpxToPx(rpx: number) {
  try {
    return (rpx / 750) * Taro.getSystemInfoSync().windowWidth
  } catch {
    return rpx
  }
}

export function FloatingService() {
  const [side, setSide] = useState<'left' | 'right'>('right')
  const [y, setY] = useState(300)
  const startRef = useRef({ y: 0, moved: 0, lastTouchX: 0 })
  const dragY = useRef(y)

  const btnPx = rpxToPx(BTN_SIZE_RPX)
  const edgeGap = rpxToPx(EDGE_GAP_RPX)

  const x = side === 'left' ? edgeGap : Taro.getSystemInfoSync().windowWidth - btnPx - edgeGap

  const handleTouchStart = useCallback((e: any) => {
    const touch = e.touches[0]
    startRef.current = { y: touch.clientY - y, moved: 0, lastTouchX: touch.clientX }
    dragY.current = y
  }, [y])

  const handleTouchMove = useCallback((e: any) => {
    const touch = e.touches[0]
    const newY = touch.clientY - startRef.current.y
    const dy = Math.abs(newY - dragY.current)
    startRef.current.moved += dy
    startRef.current.lastTouchX = touch.clientX
    dragY.current = newY

    const maxY = Taro.getSystemInfoSync().windowHeight - btnPx * 3
    setY(Math.max(0, Math.min(newY, maxY)))
  }, [btnPx])

  const handleTouchEnd = useCallback(() => {
    if (startRef.current.moved < DRAG_THRESHOLD) {
      Taro.reLaunch({ url: '/pages/service/index' })
      return
    }
    const midX = Taro.getSystemInfoSync().windowWidth / 2
    setSide(startRef.current.lastTouchX < midX ? 'left' : 'right')
  }, [])

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
