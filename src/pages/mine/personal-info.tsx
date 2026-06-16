import { useState, useEffect } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { STRINGS } from '@/constants/strings'
import { ROUTES } from '@/constants/routes'
import { getUserProfile } from '@/services/dataService'
import type { UserProfileAggregated } from '@/types/profile'
import styles from './personal-info.module.scss'

const idMap = STRINGS.IDENTITY_STATUS_MAP
const genderMap = STRINGS.GENDER_MAP

function statusBadgeClass(s: string): string {
  if (s === 'verified') return styles.badgeGreen
  if (s === 'rejected') return styles.badgeRed
  return styles.badgeOrange
}

function fmtTime(t: string | null): string {
  if (!t) return '-'
  return t.slice(0, 10)
}

export default function PersonalInfoPage() {
  const [profile, setProfile] = useState<UserProfileAggregated | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getUserProfile().then(p => setProfile(p))
      .catch(() => Taro.showToast({ title: '加载失败', icon: 'none' }))
      .finally(() => setLoading(false))
  }, [])

  if (loading || !profile) return null

  const { profile: l1, realname, student, enterprise, openid, created_at } = profile
  const isStudent = realname?.user_type === 'student'

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.MINE_PROFILE_TITLE} shouldShowBack />
        <ScrollView className={styles.body} scrollY>

          {/* ============================================================ */}
          {/* 实名认证状态 */}
          {/* ============================================================ */}
          {realname && (
            <View className={styles.statusRow}>
              <View className={`${styles.statusBadge} ${statusBadgeClass(realname.identity_status || '')}`}>
                <Text>{idMap[realname.identity_status || ''] || realname.identity_status || '未认证'}</Text>
              </View>
              {realname.reject_reason && (
                <Text className={styles.rejectReason}>驳回原因：{realname.reject_reason}</Text>
              )}
            </View>
          )}

          {/* ============================================================ */}
          {/* 基础信息 */}
          {/* ============================================================ */}
          <View className={styles.card}>
            <Text className={styles.cardTitle}>基础信息</Text>
            {field('OpenID', openid)}
            {field('注册时间', fmtTime(created_at))}
            {field('昵称', l1.nickname)}
            {field('邮箱', l1.email)}
            {field('手机号', l1.phone)}
          </View>

          {/* ============================================================ */}
          {/* 实名认证 */}
          {/* ============================================================ */}
          <View className={styles.card}>
            <Text className={styles.cardTitle}>实名认证</Text>
            {field('真实姓名', realname?.real_name)}
            {field('身份证号', realname?.id_card)}
            {field('性别', genderMap[realname?.gender || ''] || realname?.gender || '-')}
            {field('年龄', realname?.age != null ? `${realname.age} 岁` : '-')}
            {field('户籍', realname?.census_register)}
            {realname?.verified_at && field('认证时间', fmtTime(realname.verified_at))}
          </View>

          {/* ============================================================ */}
          {/* 学生信息（仅 student） */}
          {/* ============================================================ */}
          {isStudent && student && (
            <View className={styles.card}>
              <Text className={styles.cardTitle}>学生信息</Text>
              <View className={styles.statusInline}>
                <Text className={styles.statusLabel}>审核状态：</Text>
                <Text className={`${styles.statusTag} ${statusBadgeClass(student.student_status || '')}`}>
                  {idMap[student.student_status || ''] || student.student_status || '未知'}
                </Text>
              </View>
              {student.reject_reason && (
                <Text className={styles.rejectReason}>驳回原因：{student.reject_reason}</Text>
              )}
              {field('学历', student.education)}
              {field('学校', student.school)}
              {field('专业', student.major)}
              {field('学生证', student.student_card_oss ? '已上传' : '未上传')}
            </View>
          )}

          {/* ============================================================ */}
          {/* 企业信息（仅 enterprise） */}
          {/* ============================================================ */}
          {!isStudent && enterprise && (
            <View className={styles.card}>
              <Text className={styles.cardTitle}>企业信息</Text>
              <View className={styles.statusInline}>
                <Text className={styles.statusLabel}>审核状态：</Text>
                <Text className={`${styles.statusTag} ${statusBadgeClass(enterprise.enterprise_status || '')}`}>
                  {idMap[enterprise.enterprise_status || ''] || enterprise.enterprise_status || '未知'}
                </Text>
              </View>
              {enterprise.reject_reason && (
                <Text className={styles.rejectReason}>驳回原因：{enterprise.reject_reason}</Text>
              )}
              {field('单位名称', enterprise.organization)}
            </View>
          )}

          {/* ============================================================ */}
          {/* 编辑按钮 */}
          {/* ============================================================ */}
          <View className={styles.btnWrap}>
            <Button variant='gradient' size='lg' onClick={() => Taro.navigateTo({ url: `/${ROUTES.MINE_EDIT_PROFILE}` })}>
              {STRINGS.MINE_EDIT_PROFILE_TITLE}
            </Button>
          </View>
        </ScrollView>
      </View>
    </AuthGuard>
  )
}

function field(label: string, value: string | null | undefined) {
  return (
    <View className={styles.fieldRow}>
      <Text className={styles.fieldLabel}>{label}</Text>
      <Text className={styles.fieldValue}>{value || '-'}</Text>
    </View>
  )
}
