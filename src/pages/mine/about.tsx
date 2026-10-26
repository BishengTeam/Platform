import { View, Text, ScrollView, Image } from '@tarojs/components'
import { PageHeader } from '@/components/PageHeader'
import { Icon } from '@/components/Icon'
import { STRINGS } from '@/constants/strings'
import styles from './about.module.scss'

const CULTURE_ITEMS = [
  { label: STRINGS.ABOUT_CULTURE_VISION_LABEL, value: STRINGS.ABOUT_CULTURE_VISION },
  { label: STRINGS.ABOUT_CULTURE_MISSION_LABEL, value: STRINGS.ABOUT_CULTURE_MISSION },
  { label: STRINGS.ABOUT_CULTURE_VALUES_LABEL, value: STRINGS.ABOUT_CULTURE_VALUES },
]

/** 关于我们 — 企业简介 / 企业文化 / 企业资质 / 公众号 / 地址（内容取自甲方企业宣传页） */
export default function AboutPage() {
  return (
    <>
      <View className={styles.page}>
        <PageHeader title={STRINGS.SETTINGS_ABOUT_US} shouldShowBack />
        <ScrollView className={styles.body} scrollY>
          <View className={styles.bodyInner}>
            {/* 企业简介 */}
            <View className={styles.card}>
              <Image className={styles.brandLogo} src='/assets/logo/zhi-tian-yuan.svg' mode='aspectFit' />
              <View className={styles.sectionTag}>
                <Text className={styles.sectionTagText}>{STRINGS.ABOUT_SECTION_INTRO}</Text>
              </View>
              <Text className={styles.paragraph}>{STRINGS.ABOUT_INTRO_1}</Text>
              <Text className={styles.paragraph}>{STRINGS.ABOUT_INTRO_2}</Text>
              <View className={styles.photoRow}>
                <Image className={styles.photo} src='/assets/about/office-1.jpg' mode='aspectFill' />
                <Image className={styles.photo} src='/assets/about/office-2.jpg' mode='aspectFill' />
              </View>
            </View>

            {/* 企业文化 */}
            <View className={styles.card}>
              <View className={styles.sectionTag}>
                <Text className={styles.sectionTagText}>{STRINGS.ABOUT_SECTION_CULTURE}</Text>
              </View>
              <View className={styles.cultureList}>
                {CULTURE_ITEMS.map(item => (
                  <View key={item.label} className={styles.cultureItem}>
                    <View className={styles.cultureLabel}>
                      <Text className={styles.cultureLabelText}>{item.label}</Text>
                    </View>
                    <Text className={styles.cultureValue}>{item.value}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* 企业资质 */}
            <View className={styles.card}>
              <View className={styles.sectionTag}>
                <Text className={styles.sectionTagText}>{STRINGS.ABOUT_SECTION_QUALIFICATION}</Text>
              </View>
              <View className={styles.qualList}>
                {STRINGS.ABOUT_QUALIFICATIONS.map(item => (
                  <View key={item} className={styles.qualItem}>
                    <View className={styles.qualBullet} />
                    <Text className={styles.qualText}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* 微信公众号 */}
            <View className={styles.card}>
              <View className={styles.qrWrap}>
                <Image
                  className={styles.qrImage}
                  src='/assets/about/gzh-qr.jpg'
                  mode='aspectFit'
                  showMenuByLongpress
                />
              </View>
              <Text className={styles.qrHint}>{STRINGS.ABOUT_GZH_QR_HINT}</Text>
            </View>

            {/* 地址 */}
            <View className={styles.addressBar}>
              <Icon name='map-pin' size={28} color='#1677FF' />
              <Text className={styles.addressText}>{STRINGS.ABOUT_ADDRESS}</Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </>
  )
}
