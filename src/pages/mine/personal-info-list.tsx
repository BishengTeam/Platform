import { View, Text, ScrollView } from '@tarojs/components'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { STRINGS } from '@/constants/strings'
import styles from './personal-info-list.module.scss'

/** 各信息类型：收集的字段与用途（字段口径与个人主页/编辑资料/题库实际收集一致） */
const SECTIONS = [
  {
    title: '账号信息',
    fields: ['OpenID（微信登录时生成）、昵称（您自行填写）'],
    purpose: '用于创建和标识您的账号，展示个人主页。',
  },
  {
    title: '联系方式',
    fields: ['手机号（通过微信授权获取）、邮箱、省/市、详细地址'],
    purpose: '用于考试报名联系、通知推送及地址信息的填写与展示。',
  },
  {
    title: '实名认证信息',
    fields: [
      '真实姓名、身份证号、性别、出生日期、年龄',
      '民族、政治面貌、户籍、中文姓名、拼音姓名',
      '二寸证件照片',
    ],
    purpose: '用于实名认证审核及人社、NISP、H3C、深信服等认证考试的报名。',
  },
  {
    title: '学生身份信息',
    fields: ['学历、学校、专业', '学生证照片、学信网电子注册备案表、学信网学历证明'],
    purpose: '用于审核您的学生身份，开放学生专属功能与优惠。',
  },
  {
    title: '企业身份信息',
    fields: ['单位名称'],
    purpose: '用于审核您的企业身份，开放企业专属功能。',
  },
  {
    title: '学习记录',
    fields: ['练习与考试答题记录、错题本、题目收藏、签到记录、学习统计'],
    purpose: '用于为您提供刷题、错题回顾、学习统计等题库功能。',
  },
  {
    title: '反馈信息',
    fields: ['反馈内容描述、截图（自愿提供）'],
    purpose: '用于受理和处理您的意见反馈。',
  },
]

/** 个人信息收集清单 — 合规说明页：列出收集的信息类型、字段与用途 */
export default function PersonalInfoListPage() {
  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.SETTINGS_PERSONAL_INFO_LIST} shouldShowBack />
        <ScrollView className={styles.body} scrollY>
          <View className={styles.bodyInner}>
            <View className={styles.card}>
              <Text className={styles.paragraph}>
                我们在您使用小程序的过程中，遵循合法、正当、必要和最小必要原则收集个人信息。本清单说明我们收集的信息类型、具体字段及用途；您可在「个人主页」查看和更正相关信息。
              </Text>
            </View>

            {SECTIONS.map(section => (
              <View key={section.title} className={styles.card}>
                <View className={styles.sectionTag}>
                  <Text className={styles.sectionTagText}>{section.title}</Text>
                </View>
                <View className={styles.fieldList}>
                  {section.fields.map(item => (
                    <View key={item} className={styles.fieldItem}>
                      <View className={styles.fieldBullet} />
                      <Text className={styles.fieldText}>{item}</Text>
                    </View>
                  ))}
                </View>
                <View className={styles.purposeRow}>
                  <Text className={styles.purposeLabel}>收集用途</Text>
                  <Text className={styles.purposeValue}>{section.purpose}</Text>
                </View>
              </View>
            ))}

            <View className={styles.card}>
              <Text className={styles.paragraph}>
                如对个人信息处理有任何疑问，您可通过「意见反馈」或客服渠道与我们联系；如需注销账号，可在「设置 - 注销账号」中操作。
              </Text>
              <Text className={styles.updateDate}>更新日期：2026-10-21</Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </AuthGuard>
  )
}
