import { View, Swiper, SwiperItem } from '@tarojs/components'
import { Icon } from '@/components/Icon'
import { Button } from '@/components/Button'
import styles from './index.module.scss'

export interface ZoneBannerItem {
  id: string | number
  title: string
  description: string
  gradient: string
  icon?: string
  buttonText: string
  buttonColor: string
}

interface ZoneBannerProps {
  items: ZoneBannerItem[]
}

export function ZoneBanner({ items }: ZoneBannerProps) {
  return (
    <View className={styles.container}>
      <Swiper
        className={styles.swiper}
        circular
        autoplay
        interval={3000}
        indicatorColor='#999999'
        indicatorActiveColor='#1677FF'
      >
        {items.map((item) => (
          <SwiperItem key={item.id}>
            <View
              className={styles.slide}
              style={{ background: `var(--${item.gradient}, var(--gradient-blue))` }}
            >
              <View className={styles.content}>
                <View className={styles.title}>{item.title}</View>
                <View className={styles.desc}>{item.description}</View>
                <Button
                  size='sm'
                  className={styles.bannerBtn}
                  style={{ color: item.buttonColor }}
                  variant='secondary'
                >
                  {item.buttonText}
                </Button>
              </View>
              {item.icon && (
                <View className={styles.iconWrap}>
                  <Icon name={item.icon} size={80} color='rgba(255,255,255,0.2)' />
                </View>
              )}
            </View>
          </SwiperItem>
        ))}
      </Swiper>
    </View>
  )
}
