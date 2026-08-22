import { useCallback, useEffect, useRef, useState } from 'react'
import { View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { Icon } from '@/components/Icon'
import { useWindowSize } from '@/hooks/useWindowSize'
import styles from './index.module.scss'

const DRAG_THRESHOLD = 6
const BTN_SIZE_RPX = 96
const EDGE_GAP_RPX = 24
const SPRING_RESPONSE_SECONDS = 0.3
const SPRING_DAMPING_RATIO = 0.8
const DECELERATION_RATE = 0.998

function rpxToPx(rpx: number, windowWidth: number) {
  return (rpx / 750) * windowWidth
}

function rubberBand(overshoot: number, dimension: number) {
  const constant = 0.55
  return (
    (overshoot * dimension * constant) /
    (dimension + constant * Math.abs(overshoot))
  )
}

function softBound(
  value: number,
  minimum: number,
  maximum: number,
  dimension: number,
) {
  if (value < minimum) return minimum - rubberBand(minimum - value, dimension)
  if (value > maximum) return maximum + rubberBand(value - maximum, dimension)
  return value
}

function hardBound(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(value, maximum))
}

function projectVelocity(velocity: number) {
  return (
    (velocity / 1000) *
    (DECELERATION_RATE / (1 - DECELERATION_RATE))
  )
}

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function nowMilliseconds() {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now()
}

function scheduleFrame(callback: (now: number) => void): FrameId {
  if (typeof requestAnimationFrame === 'function') {
    return requestAnimationFrame(callback)
  }
  return setTimeout(() => callback(nowMilliseconds()), 16)
}

function cancelFrame(frameId: FrameId) {
  if (typeof cancelAnimationFrame === 'function') {
    cancelAnimationFrame(frameId as number)
    return
  }
  clearTimeout(frameId)
}

interface FloatingServiceProps {
  onPress?: () => void
}

type FrameId = number | ReturnType<typeof setTimeout>

export function FloatingService({ onPress }: FloatingServiceProps) {
  const { width: windowWidth, height: windowHeight } = useWindowSize()
  const [side, setSide] = useState<'left' | 'right'>('right')
  const [x, setX] = useState(() => windowWidth)
  const [y, setY] = useState(300)
  const [isDragging, setIsDragging] = useState(false)
  const frameRef = useRef<FrameId | null>(null)
  const dragRef = useRef({
    originX: 0,
    originY: 0,
    grabOffsetX: 0,
    grabOffsetY: 0,
    moved: 0,
    velocityX: 0,
    velocityY: 0,
    lastX: 0,
    lastY: 0,
    lastTime: 0,
  })

  const btnPx = rpxToPx(BTN_SIZE_RPX, windowWidth)
  const edgeGap = rpxToPx(EDGE_GAP_RPX, windowWidth)
  const minX = edgeGap
  const maxX = windowWidth - btnPx - edgeGap
  const minY = 0
  const maxY = windowHeight - btnPx * 3

  const cancelSettlement = useCallback(() => {
    if (frameRef.current !== null) {
      cancelFrame(frameRef.current)
      frameRef.current = null
    }
  }, [])

  useEffect(() => cancelSettlement, [cancelSettlement])

  useEffect(() => {
    if (isDragging) return
    setX(current => hardBound(current, minX, maxX))
    setY(current => hardBound(current, minY, maxY))
  }, [isDragging, maxX, maxY, minX, minY])

  const handleTouchStart = useCallback((e: any) => {
    const touch = e.touches[0]
    cancelSettlement()
    dragRef.current = {
      originX: x,
      originY: y,
      grabOffsetX: touch.clientX - x,
      grabOffsetY: touch.clientY - y,
      moved: 0,
      velocityX: 0,
      velocityY: 0,
      lastX: touch.clientX,
      lastY: touch.clientY,
      lastTime: Date.now(),
    }
    setIsDragging(true)
  }, [cancelSettlement, x, y])

  const handleTouchMove = useCallback((e: any) => {
    const touch = e.touches[0]
    const now = Date.now()
    const elapsedSeconds = Math.max((now - dragRef.current.lastTime) / 1000, 0.001)
    const instantaneousX = (touch.clientX - dragRef.current.lastX) / elapsedSeconds
    const instantaneousY = (touch.clientY - dragRef.current.lastY) / elapsedSeconds
    dragRef.current.velocityX =
      dragRef.current.velocityX * 0.75 + instantaneousX * 0.25
    dragRef.current.velocityY =
      dragRef.current.velocityY * 0.75 + instantaneousY * 0.25
    dragRef.current.lastX = touch.clientX
    dragRef.current.lastY = touch.clientY
    dragRef.current.lastTime = now
    dragRef.current.moved = Math.max(
      dragRef.current.moved,
      Math.hypot(
        touch.clientX - dragRef.current.grabOffsetX - dragRef.current.originX,
        touch.clientY - dragRef.current.grabOffsetY - dragRef.current.originY,
      ),
    )

    setX(softBound(touch.clientX - dragRef.current.grabOffsetX, minX, maxX, windowWidth))
    setY(softBound(touch.clientY - dragRef.current.grabOffsetY, minY, maxY, windowHeight))
  }, [maxX, maxY, minX, minY, windowHeight])

  const handleTouchEnd = useCallback(() => {
    if (dragRef.current.moved < DRAG_THRESHOLD) {
      setX(dragRef.current.originX)
      setY(dragRef.current.originY)
      setIsDragging(false)
      onPress?.()
      return
    }

    const projectedX =
      x + projectVelocity(dragRef.current.velocityX)
    const nextSide = projectedX + btnPx / 2 < windowWidth / 2 ? 'left' : 'right'
    if (nextSide !== side) {
      void Taro.vibrateShort({ type: 'light' }).catch(() => {})
    }
    const targetX = nextSide === 'left' ? minX : maxX
    const projectedY = y + projectVelocity(dragRef.current.velocityY)
    const targetY = hardBound(projectedY, minY, maxY)

    setIsDragging(false)
    setSide(nextSide)

    if (prefersReducedMotion()) {
      setX(targetX)
      setY(targetY)
      return
    }

    let currentX = x
    let currentY = y
    let velocityX = dragRef.current.velocityX
    let velocityY = dragRef.current.velocityY
    let lastTime = nowMilliseconds()
    const omega = (2 * Math.PI) / SPRING_RESPONSE_SECONDS

    const step = (now: number) => {
      const deltaTime = Math.min((now - lastTime) / 1000, 0.032)
      lastTime = now
      const accelerationX =
        -2 * SPRING_DAMPING_RATIO * omega * velocityX -
        omega * omega * (currentX - targetX)
      const accelerationY =
        -2 * SPRING_DAMPING_RATIO * omega * velocityY -
        omega * omega * (currentY - targetY)
      velocityX += accelerationX * deltaTime
      velocityY += accelerationY * deltaTime
      currentX += velocityX * deltaTime
      currentY += velocityY * deltaTime

      const settled =
        Math.abs(targetX - currentX) < 0.5 &&
        Math.abs(targetY - currentY) < 0.5 &&
        Math.abs(velocityX) < 8 &&
        Math.abs(velocityY) < 8
      if (settled) {
        setX(targetX)
        setY(targetY)
        frameRef.current = null
        return
      }

      setX(currentX)
      setY(currentY)
      frameRef.current = scheduleFrame(step)
    }

    frameRef.current = scheduleFrame(step)
  }, [
    btnPx,
    maxX,
    minX,
    maxY,
    onPress,
    side,
    windowWidth,
    x,
    y,
  ])

  return (
    <View
      className={styles.btn}
      style={{
        transform: `translate3d(${x}px, ${y}px, 0)`,
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
