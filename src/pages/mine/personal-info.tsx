import { useState, useEffect } from 'react'
import { View, Text, ScrollView, Image } from '@tarojs/components'
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

  // ---- 驳回弹窗 ----
  const [rejectModalVisible, setRejectModalVisible] = useState(false)
  const [rejectReasons, setRejectReasons] = useState<{ section: string, reason: string }[]>([])

  useEffect(() => {
    getUserProfile().then(p => {
      setProfile(p)

      // 收集驳回信息，弹出浮窗
      const reasons: { section: string, reason: string }[] = []
      if (p.realname?.identity_status === 'rejected' && p.realname?.reject_reason) {
        reasons.push({ section: '实名认证', reason: p.realname.reject_reason })
      }
      if (p.student?.student_status === 'rejected' && p.student?.reject_reason) {
        reasons.push({ section: '学生信息', reason: p.student.reject_reason })
      }
      if (p.enterprise?.enterprise_status === 'rejected' && p.enterprise?.reject_reason) {
        reasons.push({ section: '企业信息', reason: p.enterprise.reject_reason })
      }
      if (reasons.length > 0) {
        setRejectReasons(reasons)
        setRejectModalVisible(true)
      }
    })
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
          {/* 个人主页头部 */}
          {/* ============================================================ */}
          <View className={styles.headerPanel}>
            <Image
              className={styles.headerAvatar}
              src={realname?.avatar_oss || ''}
              mode='aspectFill'
            />
            <View className={styles.headerInfo}>
              <Text className={styles.headerNickname}>{l1.nickname || '未设置昵称'}</Text>
              <Text className={styles.headerMeta}>注册于 {fmtTime(created_at)}</Text>
            </View>
            <View className={styles.headerOpenid}>
              <Text
                className={styles.openidText}
                onClick={() => {
                  if (openid) {
                    Taro.setClipboardData({ data: openid })
                      .then(() => Taro.showToast({ title: '已复制', icon: 'success', duration: 1500 }))
                  }
                }}
              >
                OpenID 复制
              </Text>
            </View>
          </View>

          {/* ============================================================ */}
          {/* 基础信息 */}
          {/* ============================================================ */}
          <View className={styles.card}>
            <Text className={styles.cardTitle}>基础信息</Text>
            {field('邮箱', l1.email)}
            {field('手机号', l1.phone)}
            {fieldPair('省', l1.province, '市', l1.city)}
            {field('地址', l1.address)}
          </View>

          {/* ============================================================ */}
          {/* 实名认证 */}
          {/* ============================================================ */}
          <View className={styles.card}>
            <View className={styles.cardTitleRow}>
              <Text className={styles.cardTitle}>实名认证</Text>
              <Text className={`${styles.capsuleBadge} ${statusBadgeClass(realname?.identity_status || '')}`}>
                {idMap[realname?.identity_status || ''] || '未认证'}
              </Text>
            </View>
            {field('真实姓名', realname?.real_name)}
            {field('身份证号', realname?.id_card)}
            {field('性别', genderMap[realname?.gender || ''] || realname?.gender || '-')}
            {field('年龄', realname?.age != null ? `${realname.age} 岁` : '-')}
            {field('户籍', realname?.census_register)}
            {fieldPair('中文姓', realname?.last_name_zh, '中文名', realname?.first_name_zh)}
            {fieldPair('拼音姓', realname?.last_name_en, '拼音名', realname?.first_name_en)}
            {realname?.avatar_oss && field('二寸照', '已上传')}
            {fieldPair('出生日期', realname?.birth_date, '邮编', realname?.zip_code)}
            {fieldPair('政治面貌', realname?.political_status, '民族', realname?.ethnicity)}
            {realname?.verified_at && field('认证时间', fmtTime(realname.verified_at))}
          </View>

          {/* ============================================================ */}
          {/* 学生信息（仅 student） */}
          {/* ============================================================ */}
          {isStudent && student && (
            <View className={styles.card}>
              <View className={styles.cardTitleRow}>
                <Text className={styles.cardTitle}>学生信息</Text>
                <Text className={`${styles.capsuleBadge} ${statusBadgeClass(student.student_status || '')}`}>
                  {idMap[student.student_status || ''] || '未知'}
                </Text>
              </View>
              {field('学历', student.education)}
              {field('学校', student.school)}
              {field('专业', student.major)}
              {field('学生证', student.student_card_oss ? '已上传' : '未上传')}
              {field('学信网电子注册表', student.enrollment_pdf_oss ? '已上传' : '未上传')}
              {field('学信网学历证明', student.degree_cert_oss ? '已上传' : '未上传')}
            </View>
          )}

          {/* ============================================================ */}
          {/* 企业信息（仅 enterprise） */}
          {/* ============================================================ */}
          {!isStudent && enterprise && (
            <View className={styles.card}>
              <View className={styles.cardTitleRow}>
                <Text className={styles.cardTitle}>企业信息</Text>
                <Text className={`${styles.capsuleBadge} ${statusBadgeClass(enterprise.enterprise_status || '')}`}>
                  {idMap[enterprise.enterprise_status || ''] || '未知'}
                </Text>
              </View>
              {field('单位名称', enterprise.organization)}
            </View>
          )}

        </ScrollView>

        {/* 底部吸底操作栏 */}
        <View className={styles.bottomBar}>
          <Button
            variant='gradient'
            size='lg'
            onClick={() => Taro.navigateTo({ url: `/${ROUTES.MINE_EDIT_PROFILE}` })}
          >
            {STRINGS.MINE_EDIT_PROFILE_TITLE}
          </Button>
        </View>

        {/* 驳回理由浮窗 */}
        {rejectModalVisible && (
          <View className={styles.modalOverlay}>
            <View className={styles.modalBox}>
              <Text className={styles.modalTitle}>审核驳回通知</Text>
              <View className={styles.modalContent}>
                {rejectReasons.map((item, i) => (
                  <Text key={i} className={styles.modalItem}>· {item.section}：{item.reason}</Text>
                ))}
              </View>
              <View className={styles.modalBtn} onClick={() => setRejectModalVisible(false)}>
                <Text className={styles.modalBtnText}>知道了</Text>
              </View>
            </View>
          </View>
        )}
      </View>
    </AuthGuard>
  )
}

function field(label: string, value: string | null | undefined) {
  if (!value) return null
  return (
    <View className={styles.fieldRow}>
      <Text className={styles.fieldLabel}>{label}</Text>
      <Text className={styles.fieldValue}>{value}</Text>
    </View>
  )
}

/** 双列字段行：左值或右值任一非空时才渲染 */
function fieldPair(
  leftLabel: string, leftValue: string | null | undefined,
  rightLabel: string, rightValue: string | null | undefined
) {
  const hasLeft = !!leftValue
  const hasRight = !!rightValue
  if (!hasLeft && !hasRight) return null
  return (
    <View className={styles.fieldPair}>
      <View className={styles.fieldHalf}>
        <Text className={styles.fieldLabel}>{leftLabel}</Text>
        <Text className={styles.fieldValue}>{hasLeft ? leftValue : '-'}</Text>
      </View>
      <View className={styles.fieldHalf}>
        <Text className={styles.fieldLabel}>{rightLabel}</Text>
        <Text className={styles.fieldValue}>{hasRight ? rightValue : '-'}</Text>
      </View>
    </View>
  )
}