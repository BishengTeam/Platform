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

function pickIdCard(p: any): string {
  return p?.id_card_raw || ''
}

/**
 * 实名认证检查网关（v4 — 阻断时弹出提示并跳回）
 *
 *   verified     → 渲染 children
 *   pending      → modal 提示 → 跳回首页
 *   rejected     → modal 提示 → 跳回首页
 *   无资料       → modal 提示 → 跳回首页
 *   unverified   → 尝试自动提交，失败则提示跳回
 */
export function IdentityCheckGate({ children }: Props) {
  const identity = useIdentityCheck()
  const [handled, setHandled] = useState(false)

  useEffect(() => {
    if (handled) return

    getUserProfile()
      .then((profile: any) => {
        // 资料不完整
        if (!profile?.real_name) {
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

        // unverified → 尝试自动提交
        if (identity.phase === 'unverified') {
          const rawIdCard = pickIdCard(profile)
          if (!rawIdCard) {
            Taro.showModal({
              title: '提示',
              content: '实名认证需要您的身份证信息，请先在个人资料中完善',
              showCancel: false,
              success: () => Taro.switchTab({ url: '/pages/profile/index' }),
            })
            setHandled(true)
            return
          }
          const userType = (profile?.user_type === 'enterprise' ? 'enterprise' : 'student') as 'student' | 'enterprise'
          identity.submit(userType, profile?.real_name || '', rawIdCard).then((ok) => {
            if (!ok) {
              Taro.showModal({
                title: STRINGS.IDENTITY_REJECTED_TITLE,
                content: STRINGS.IDENTITY_CHECK_FAILED,
                showCancel: false,
                success: () => Taro.switchTab({ url: '/pages/profile/index' }),
              })
            }
            // 成功 → phase 变为 verified，children 自然渲染
            setHandled(ok)
          })
          return
        }
      })
      .catch(() => {
        Taro.showModal({
          title: '提示',
          content: '加载用户信息失败，请稍后重试',
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
              <Text className={styles.loadingText}>加载中...</Text>
            </View>
          </View>
        </View>
      </AuthGuard>
    )
  }

  return <>{children}</>
}
