import { useState, useEffect } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { AgreementCheckbox } from '@/components/AgreementCheckbox'
import { STRINGS } from '@/constants/strings'
import { getAgreementTemplate, acceptAgreements } from '@/services/dataService'
import type { AgreementType, AgreementTemplate } from '@/services/dataService'
import styles from './view.module.scss'

const TYPE_TITLES: Record<string, string> = {
  user_terms: STRINGS.AUTH_AGREEMENT_TERMS,
  privacy: STRINGS.AUTH_AGREEMENT_PRIVACY,
  identity_auth: STRINGS.AGREEMENT_TYPE_IDENTITY_AUTH,
}

/**
 * 协议查看页（P0 电子协议）
 *
 * - 只读模式：展示当前生效模板全文（登录页链接 / 我的协议列表进入）
 * - 签署模式（requireSign=1）：底部出现勾选 + 「同意并签署」，签署后返回
 * - 公开页面：无需登录即可查看（后端 GET 模板接口为公开）
 */
export default function AgreementViewPage() {
  const { params } = useRouter()
  const type = (params.type || 'user_terms') as AgreementType
  const requireSign = params.requireSign === '1'

  const [template, setTemplate] = useState<AgreementTemplate | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let active = true
    getAgreementTemplate(type)
      .then((tpl) => {
        if (active) setTemplate(tpl)
      })
      .catch(() => {
        if (active) setFailed(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [type])

  const handleSign = async () => {
    if (!template || !agreed || submitting) return
    setSubmitting(true)
    try {
      await acceptAgreements([{ type, version: template.version }])
      Taro.showToast({ title: STRINGS.AGREEMENT_SIGN_SUCCESS, icon: 'success' })
      setTimeout(() => {
        Taro.navigateBack({
          fail: () => Taro.reLaunch({ url: '/pages/index/index' }),
        })
      }, 600)
    } catch (error) {
      Taro.showToast({
        title: error instanceof Error ? error.message : STRINGS.AGREEMENT_SIGN_FAILED,
        icon: 'none',
        duration: 3000,
      })
    } finally {
      setSubmitting(false)
    }
  }

  const headerTitle = template?.title || TYPE_TITLES[type] || STRINGS.AGREEMENT_TITLE_FALLBACK

  return (
    <View className={styles.page}>
      <PageHeader title={headerTitle} shouldShowBack />
      <ScrollView className={styles.body} scrollY>
        {loading || failed ? (
          <View className={styles.statusWrap}>
            <Text className={styles.statusText}>
              {loading ? STRINGS.AGREEMENT_LOADING : STRINGS.AGREEMENT_NOT_CONFIGURED}
            </Text>
          </View>
        ) : (
          template && (
            <View className={styles.card}>
              <View className={styles.cardMeta}>
                <Text className={styles.metaText}>
                  {STRINGS.AGREEMENT_VERSION} v{template.version}
                </Text>
              </View>
              <RichText className={styles.content} nodes={template.content} />
            </View>
          )
        )}
      </ScrollView>

      {requireSign && !loading && !failed && (
        <View className={styles.signBar}>
          <AgreementCheckbox agreed={agreed} onChange={setAgreed}>
            {STRINGS.AGREEMENT_SIGN_AGREE}
            <Text className={styles.metaText}>{template?.title || headerTitle}</Text>
          </AgreementCheckbox>
          <Button disabled={!agreed} loading={submitting} onClick={handleSign}>
            {STRINGS.AGREEMENT_SIGN_SUBMIT}
          </Button>
        </View>
      )}
    </View>
  )
}
