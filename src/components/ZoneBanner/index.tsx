import { useCallback } from 'react'
import { View, Swiper, SwiperItem, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { Icon } from '@/components/Icon'
import { Button } from '@/components/Button'
import styles from './index.module.scss'

const GRADIENTS: Record<string, string> = {
  'gradient-blue': 'linear-gradient(to right, #1677FF, #4096FF)',
  'gradient-green': 'linear-gradient(to right, #52C41A, #73D13D)',
  'gradient-orange': 'linear-gradient(to right, #FA8C16, #FFC53D)',
  'gradient-purple': 'linear-gradient(to right, #722ED1, #9254DE)',
  'gradient-teal': 'linear-gradient(to right, #13C2C2, #36CFC9)',
  'gradient-red': 'linear-gradient(to right, #FF4D4F, #FF7875)',
  'gradient-gray': 'linear-gradient(to right, #999999, #BFBFBF)',
}

export interface ZoneBannerItem {
  id: string | number
  title: string
  description?: string
  gradient?: string
  icon?: string
  buttonText?: string
  buttonColor?: string
  image_url?: string
  jump_link?: string | null
}

interface ZoneBannerProps {
  items: ZoneBannerItem[]
  onButtonClick?: (item: ZoneBannerItem) => void
}

export function ZoneBanner({ items, onButtonClick }: ZoneBannerProps) {
  const handleButtonClick = useCallback((e: { stopPropagation: () => void; currentTarget: { dataset: Record<string, string> } }) => {
    if (!onButtonClick) return
    e.stopPropagation()
    const index = Number(e.currentTarget.dataset.index)
    if (items[index]) onButtonClick(items[index])
  }, [items, onButtonClick])

  return (
    <View className={styles.container}>
      <Swiper
        className={styles.swiper}
        circular
        autoplay
        interval={3000}
      >
        {items.map((item, i) => (
          <SwiperItem key={item.id}>
            {item.image_url ? (
              <View
                className={styles.slide}
                style={{ backgroundImage: `url(${item.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                onClick={() => {
                  if (item.jump_link) {
                    Taro.navigateTo({ url: item.jump_link })
                  }
                }}
              >
                <View className={styles.content}>
                  <View className={styles.title}>{item.title}</View>
                  {item.description ? <View className={styles.desc}>{item.description}</View> : null}
                </View>
              </View>
            ) : (
            <View
              className={styles.slide}
              style={{ background: GRADIENTS[item.gradient] || GRADIENTS['gradient-blue'] }}
            >
              <View className={styles.content}>
                <View className={styles.title}>{item.title}</View>
                <View className={styles.desc}>{item.description}</View>
                <View data-index={i} onClick={handleButtonClick}>
                  <Button
                    size='sm'
                    className={styles.bannerBtn}
                    style={{ color: item.buttonColor }}
                    variant='secondary'
                  >
                    {item.buttonText}
                  </Button>
                </View>
              </View>
              {item.icon && (
                <View className={styles.iconWrap}>
                  <Icon name={item.icon} size={80} color='rgba(255,255,255,0.2)' />
                </View>
              )}
            </View>
            )}
          </SwiperItem>
        ))}
      </Swiper>
    </View>
  )
}