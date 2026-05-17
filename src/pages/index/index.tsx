import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { Avatar } from '@nutui/nutui-react-taro'
import { Icon } from '@/components/Icon'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { ZoneBanner } from '@/components/ZoneBanner'
import TabBar from '@/components/TabBar'
import { STRINGS } from '@/constants/strings'
import { ROUTES } from '@/constants/routes'
import { getExamBannerItems } from '@/services/dataService'
import styles from './index.module.scss'

const ZONES = [
  {
    name: '认证专区',
    title: 'H3CNE 认证考试',
    desc: '构建中小企业网络，开启网络工程师之路',
    tag: '新华三',
    meta: '¥1,200',
    gradient: 'linear-gradient(135deg, #1677FF, #4096FF)',
    icon: 'award',
    url: '/pages/registration/index',
  },
  {
    name: '学习专区',
    title: '网络工程师入门到精通',
    desc: '零基础学习网络基础知识，TCP/IP协议，路由交换技术',
    tag: '热门',
    meta: '48小时',
    gradient: 'linear-gradient(135deg, #52C41A, #73D13D)',
    icon: 'book-open',
    url: '/pages/study-zone/index',
  },
  {
    name: '竞赛专区',
    title: '2024全国大学生网络技术大赛',
    desc: '面向全国大学生的网络技术竞赛，展示技术实力',
    tag: '报名中',
    meta: '总奖金¥1xx万',
    gradient: 'linear-gradient(135deg, #FA8C16, #FFC53D)',
    icon: 'trophy',
    url: '/pages/competition-zone/index',
  },
  {
    name: '培训专区',
    title: '业务培训',
    desc: '线上线下培训项目，助力技能提升',
    tag: '即将上线',
    meta: '敬请期待',
    gradient: 'linear-gradient(135deg, #722ED1, #9254DE)',
    icon: 'briefcase',
    url: '',
  },
]

export default function IndexPage() {
  const handleGoConsult = () => {
    Taro.navigateTo({ url: `/${ROUTES.AI_CONSULT}` })
  }

  const handleZoneTap = (url: string) => {
    if (url) {
      Taro.navigateTo({ url })
    }
  }

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.INDEX_NAV_TITLE} />

        <View className={styles.main}>
          {/* Banner */}
          <View className={styles.bannerWrap}>
            <ZoneBanner items={getExamBannerItems()} />
          </View>

          {/* AI Assistant Card */}
          <View className={styles.aiCard} onClick={handleGoConsult}>
            <View className={styles.aiCardLeft}>
              <View className={styles.aiAvatarWrap}>
                <Avatar
                  size='64'
                  icon={<Icon name='sparkles' size={28} color='#1677FF' />}
                  background='#ffffff'
                />
              </View>
              <View className={styles.aiCardInfo}>
                <Text className={styles.aiCardName}>智小通</Text>
                <Text className={styles.aiCardDesc}>您的专属 H3CNE 学习助手</Text>
              </View>
            </View>
            <View className={styles.aiCardRight}>
              <Text className={styles.aiCardBtn}>去咨询</Text>
              <Icon name='chevron-right' size={16} color='#1677FF' />
            </View>
          </View>

          <View className={styles.content}>
            <View className={styles.zoneGrid}>
              {ZONES.map((zone) => (
                <View
                  key={zone.name}
                  className={styles.zoneCard}
                  onClick={() => handleZoneTap(zone.url)}
                >
                  <View
                    className={styles.zoneImage}
                    style={{ background: zone.gradient }}
                  >
                    <Icon name={zone.icon} size={48} color='rgba(255,255,255,0.9)' />
                  </View>
                  <View className={styles.zoneBody}>
                    <Text className={styles.zoneTitle}>{zone.title}</Text>
                    <Text className={styles.zoneDesc}>{zone.desc}</Text>
                    <View className={styles.zoneFooter}>
                      <Text className={styles.zoneMeta}>{zone.meta}</Text>
                      <Text className={styles.zoneTag}>{zone.tag}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>

        <TabBar />
      </View>
    </AuthGuard>
  )
}
