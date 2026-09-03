import { useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { useIdentityCheck } from '@/hooks/useIdentityCheck'
import { getUserProfile } from '@/services/dataService'
import { STRINGS } from '@/constants/strings'
import styles from '../form.module.scss'

interface Props { children: ReactNode }

/**
 * 实名认证检查网关（v4 — 阻断时弹出提示并跳回）
 *
 *   verified     → 渲染 children
 *   pending      → modal → 跳首页
 *   rejected     → modal → 跳个人资料
 *   无资料       → modal → 跳个人资料
 *   unverified   → 自动提交，失败则 modal → 跳个人资料
 */
export function IdentityCheckGate({ children }: Props) {
  const identity = useIdentityCheck()
  const [handled, setHandled] = useState(false)

  useEffect(() => {
    if (handled) return
    if (identity.phase === 'checking') return

    getUserProfile()
      .then((profile: import('@/types/profile').UserProfileAggregated | null) => {
        // 资料不完整
        if (!profile?.realname?.real_name) {
          Taro.showModal({
            title: '提示',
            content: STRINGS.IDENTITY_PROFILE_INCOMPLETE,
            showCancel: false,
            success: () => Taro.switchTab({ url: '/pages/profile/index' }),
          })
          setHandled(true)
          return
        }

        // 已认证 → 什么都不做，children 自然渲染
        if (identity.phase === 'verified') {
          setHandled(true)
          return
        }

        // 审核中
        if (identity.phase === 'pending') {
          Taro.showModal({
            title: STRINGS.IDENTITY_PENDING_TITLE,
            content: STRINGS.IDENTITY_PENDING_DESC,
            showCancel: false,
            success: () => Taro.switchTab({ url: '/pages/index/index' }),
          })
          setHandled(true)
          return
        }

        // 无认证记录
        if (identity.phase === 'null') {
          Taro.showModal({
            title: '提示',
            content: '请先完善个人资料（姓名、身份证号等），才能报名认证考试',
            showCancel: false,
            success: () => Taro.switchTab({ url: '/pages/profile/index' }),
          })
          setHandled(true)
          return
        }

        // 已拒绝
        if (identity.phase === 'rejected') {
          const reason = identity.rejectReason
            ? `${STRINGS.IDENTITY_REJECTED_DESC}：${identity.rejectReason}`
            : STRINGS.IDENTITY_REJECTED_DESC
          Taro.showModal({
            title: STRINGS.IDENTITY_REJECTED_TITLE,
            content: reason,
            showCancel: false,
            success: () => Taro.switchTab({ url: '/pages/profile/index' }),
          })
          setHandled(true)
          return
        }

        // unverified → 引导去编辑资料完成完整实名（材料必填后无法在此自动提交）
        if (identity.phase === 'unverified') {
          Taro.showModal({
            title: '提示',
            content: '实名认证需上传身份证照片等材料，请先在「我的-编辑资料」完成完整实名认证',
            showCancel: false,
            success: () => Taro.navigateTo({ url: '/pages/mine/edit-profile' }),
          })
          setHandled(true)
        }
      })
      .catch(() => {
        Taro.showModal({
          title: '提示',
          content: STRINGS.IDENTITY_LOAD_FAILED,
          showCancel: false,
          success: () => Taro.switchTab({ url: '/pages/profile/index' }),
        })
        setHandled(true)
      })
  }, [identity.phase, handled])

  // 非 verified 且未处理完 → 加载中
  if (identity.phase !== 'verified' || !handled) {
    return (
      <AuthGuard>
        <View className={styles.page}>
          <PageHeader title={STRINGS.IDENTITY_CHECK_TITLE} shouldShowBack />
          <View className={styles.body}>
            <View className={styles.loadingWrap}>
              <Text className={styles.loadingText}>{STRINGS.IDENTITY_LOADING}</Text>
            </View>
          </View>
        </View>
      </AuthGuard>
    )
  }

  return <>{children}</>
}
