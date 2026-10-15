import { useCallback, useEffect, useState } from 'react'
import { ScrollView, Text, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { FormInput } from '@/components/FormInput'
import { PriceRow } from '@/components/PriceRow'
import { useIdentityCheck } from '@/hooks/useIdentityCheck'
import { ROUTES } from '@/constants/routes'
import { getUserProfile } from '@/services/dataService'
import {
  rensheService,
  type RensheApplicationDetail,
  type RenshePlan,
} from '@/services/rensheService'
import type { UserProfileAggregated } from '@/types/profile'
import { ensureAgreementSigned } from '@/utils/agreementGate'
import { formatDate, formatDateTime } from '@/utils/format'
import { validateEmail, validatePhone, validateRequired } from '@/utils/validator'
import type { ValidationResult } from '@/utils/validator'
import styles from './renshe.module.scss'

export default function RensheFormPage() {
  const [planId, setPlanId] = useState(0)
  const [applicationId, setApplicationId] = useState<number | null>(null)
  const [plan, setPlan] = useState<RenshePlan | null>(null)
  const [application, setApplication] = useState<RensheApplicationDetail | null>(null)
  const [profile, setProfile] = useState<UserProfileAggregated | null>(null)
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [errors, setErrors] = useState<Record<string, ValidationResult>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const identity = useIdentityCheck()

  useLoad((options) => {
    setPlanId(Number(options?.plan_id || 0))
    setApplicationId(Number(options?.application_id || 0) || null)
  })

  const load = useCallback(async () => {
    if (!planId) return
    setLoading(true)
    try {
      const [planDetail, profileDetail, applicationDetail] = await Promise.all([
        rensheService.getBatch(planId),
        getUserProfile().catch(() => null),
        applicationId
          ? rensheService.getApplication(applicationId).catch(() => null)
          : Promise.resolve(null),
      ])
      setPlan(planDetail)
      setProfile(profileDetail)
      setApplication(applicationDetail)
      const draft = applicationDetail?.draft_data
      setPhone(draft?.contact_phone || profileDetail?.profile.phone || '')
      setEmail(draft?.email || profileDetail?.profile.email || '')
      setAddress(draft?.mailing_address || profileDetail?.profile.address || '')
    } finally {
      setLoading(false)
    }
  }, [applicationId, planId])

  useEffect(() => { void load() }, [load])

  const realname = profile?.realname
  const student = profile?.student
  const legacyMaterialChecks = [
    { label: '身份证正面', value: realname?.id_card_front_oss },
    { label: '身份证反面', value: realname?.id_card_back_oss },
    { label: '二寸免冠照', value: realname?.avatar_oss },
    { label: '学生证', value: student?.student_card_oss },
    { label: '学信网电子注册备案表', value: student?.enrollment_pdf_oss },
    { label: '学历证明', value: student?.degree_cert_oss },
  ]
  const sources: Record<string, string | null | undefined> = {
    id_card_front: realname?.id_card_front_oss, id_card_back: realname?.id_card_back_oss, portrait: realname?.avatar_oss,
    student_card: student?.student_card_oss, xuexin_registration: student?.enrollment_pdf_oss, education_proof: student?.degree_cert_oss,
  }
  const materialChecks = plan?.renshe_config?.materials.map(item => ({ label: item.name, value: sources[item.kind], required: item.required }))
    ?? legacyMaterialChecks.map(item => ({ ...item, required: true }))
  const identityReady = identity.phase === 'verified'
    && realname?.identity_status === 'verified'
    && student?.student_status === 'verified'
  const materialsReady = materialChecks.every(item => !item.required || Boolean(item.value))
  const canSubmit = identityReady && materialsReady && !submitting

  const handleValidate = useCallback(() => {
    const next: Record<string, ValidationResult> = {
      phone: validatePhone(phone),
      email: validateEmail(email),
      address: validateRequired(address, '通讯地址'),
    }
    setErrors(next)
    return Object.values(next).every(item => item.valid)
  }, [address, email, phone])

  const handleSubmit = async () => {
    if (!plan || !canSubmit || !handleValidate()) return
    if (!(await ensureAgreementSigned(
      'cert_registration',
      '认证报名信息处理授权协议',
      '提交人社认证报名前，请先阅读并同意授权协议',
    ))) return

    setSubmitting(true)
    try {
      const saved = await rensheService.saveDraft({
        plan_id: plan.id,
        contact_phone: phone.trim(),
        mailing_address: address.trim(),
        email: email.trim(),
      })
      const submitted = await rensheService.submit(saved.id)
      Taro.showToast({ title: '报名信息已提交', icon: 'success' })
      if (submitted.payment_required) {
        Taro.navigateTo({
          url: `/${ROUTES.REGISTRATION_CONFIRM}?order_id=${submitted.order_id}`,
        })
        return
      }
      Taro.redirectTo({
        url: `/${ROUTES.MINE_REGISTRATION_DETAIL}?type=renshe&id=${saved.id}`,
      })
    } catch (error) {
      Taro.showToast({
        title: error instanceof Error ? error.message : '提交失败，请稍后重试',
        icon: 'none',
        duration: 3000,
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (identity.phase === 'checking' || loading) {
    return (
      <AuthGuard>
        <View className={styles.page}>
          <PageHeader title='人社认证报名' shouldShowBack />
          <View className={styles.loading}>加载中...</View>
        </View>
      </AuthGuard>
    )
  }

  if (!plan) {
    return (
      <AuthGuard>
        <View className={styles.page}>
          <PageHeader title='人社认证报名' shouldShowBack />
          <View className={styles.empty}>批次不存在或已关闭</View>
        </View>
      </AuthGuard>
    )
  }

  if (identity.phase !== 'verified') {
    return (
      <AuthGuard>
        <View className={styles.page}>
          <PageHeader title='实名认证检查' shouldShowBack />
          <View className={styles.body}>
            <View className={styles.card}>
              <Text className={styles.sectionTitle}>请先完成本人实名认证</Text>
              <Text className={styles.sectionDesc}>
                人社认证报名必须由本人提交。系统将锁定已审核通过的实名身份，不能在报名页手工更换姓名或身份证号。
              </Text>
              <Button
                variant='gradient'
                size='lg'
                className={styles.primaryButton}
                onClick={() => Taro.navigateTo({ url: '/pages/mine/edit-profile' })}
              >
                去完善实名与学生信息
              </Button>
            </View>
          </View>
        </View>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title='人社认证报名' shouldShowBack />
        <ScrollView className={`${styles.body} ${styles.bodyWithFooter}`} scrollY>
          <View className={styles.card}>
            <View className={styles.cardHeader}>
              <Text className={styles.title}>{plan.name}</Text>
              <Text className={styles.badge}>{plan.occupation_name}</Text>
            </View>
            <View className={styles.row}><Text className={styles.label}>报考项目</Text><Text className={styles.value}>{plan.project_name || plan.occupation_name}</Text></View>
            <View className={styles.row}>
              <Text className={styles.label}>报名时间</Text>
              <Text className={styles.value}>
                {formatDate(plan.apply_start)} ~ {formatDate(plan.apply_end)}
              </Text>
            </View>
            <View className={styles.row}>
              <Text className={styles.label}>考试安排</Text>
              <Text className={styles.value}>
                {formatDateTime(plan.exam_date, '待定')} · {plan.exam_location || '以批次安排为准'}
              </Text>
            </View>
            <View className={styles.row}>
              <Text className={styles.label}>技能等级</Text>
              <Text className={styles.value}>{plan.skill_level || '待核实'}</Text>
            </View>
            <View className={styles.row}>
              <Text className={styles.label}>考试 / 申报</Text>
              <Text className={styles.value}>
                {plan.exam_type || '待核实'} · {plan.application_type || '待核实'}
              </Text>
            </View>
          </View>

          <View className={styles.card}>
            <Text className={styles.sectionTitle}>本人身份</Text>
            <View className={styles.row}>
              <Text className={styles.label}>姓名</Text>
              <Text className={styles.value}>{realname?.real_name || '-'}</Text>
            </View>
            <View className={styles.row}>
              <Text className={styles.label}>身份证号</Text>
              <Text className={styles.value}>{realname?.id_card || '-'}</Text>
            </View>
            <View className={styles.row}>
              <Text className={styles.label}>学校</Text>
              <Text className={styles.value}>{student?.school || '-'}</Text>
            </View>
            <View className={styles.row}>
              <Text className={styles.label}>专业</Text>
              <Text className={styles.value}>{student?.major || '-'}</Text>
            </View>
          </View>

          <View className={styles.card}>
            <Text className={styles.sectionTitle}>申报前材料检查</Text>
            <View className={styles.requirementList}>
              {materialChecks.map(item => (
                <View className={styles.requirementItem} key={item.label}>
                  {item.label}（{item.required ? '必填' : '选填'}）：{item.value ? '已提交' : '待提交'}
                </View>
              ))}
            </View>
            {!identityReady && (
              <View className={styles.warning}>
                实名或学生信息尚未审核通过，请先前往「我的-编辑资料」完成审核后再报名。
              </View>
            )}
            {identityReady && !materialsReady && (
              <View className={styles.warning}>
                本批次必填材料不完整，请先在「我的-编辑资料」补齐。提交后将保留本次材料版本。
              </View>
            )}
          </View>

          {application?.latest_rejection_reason && (
            <View className={styles.card}>
              <Text className={styles.sectionTitle}>补正要求</Text>
              <View className={styles.warning}>
                {application.latest_rejection_stage === 'external' ? '外审退回' : '初审退回'}：
                {application.latest_rejection_reason}
              </View>
              {Boolean(application.required_changes?.length) && (
                <View className={styles.requirementList}>
                  {application.required_changes?.map(change => (
                    <View className={styles.requirementItem} key={change}>{change}</View>
                  ))}
                </View>
              )}
            </View>
          )}

          <View className={styles.card}>
            <Text className={styles.sectionTitle}>报名联系信息</Text>
            <FormInput
              label='联系电话'
              required
              placeholder='请输入手机号'
              value={phone}
              type='number'
              maxlength={11}
              error={errors.phone}
              onChange={setPhone}
            />
            <FormInput
              label='电子邮箱'
              required
              placeholder='用于接收报名和证书信息'
              value={email}
              error={errors.email}
              onChange={setEmail}
            />
            <FormInput
              label='通讯地址'
              required
              placeholder='请填写证书邮寄地址'
              value={address}
              maxlength={256}
              error={errors.address}
              onChange={setAddress}
            />
          </View>

          <View className={styles.card}>
            <Text className={styles.sectionTitle}>费用</Text>
            <PriceRow label='报名费' value={plan.price_cents / 100} />
            <PriceRow label='合计' value={plan.price_cents / 100} isTotal />
          </View>
        </ScrollView>

        <View className={styles.fixedFooter}>
          <Button
            variant='gradient'
            size='lg'
            loading={submitting}
            disabled={!canSubmit}
            className={styles.primaryButton}
            onClick={() => { void handleSubmit() }}
          >
            {applicationId ? '重新提交审核' : '提交报名'}
          </Button>
        </View>
      </View>
    </AuthGuard>
  )
}
