import { useState } from 'react'
import { Checkbox, Picker, ScrollView, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { FormInput } from '@/components/FormInput'
import { ROUTES } from '@/constants/routes'
import { rensheService, type RenshePlan, type RensheApplicationDetail, type RensheEducationInfo, type RensheUploadedMaterial } from '@/services/rensheService'
import type { UserProfileAggregated } from '@/types/profile'
import { ensureAgreementSigned } from '@/utils/agreementGate'
import { validatePhone, validateEmail } from '@/utils/validator'
import { formatDateTime } from '@/utils/format'
import { CHANGE_LABELS, INSTITUTION_LABELS, EDUCATION_LABELS, chinaDate, correctionAvailable, validateGraduatedFile } from '@/utils/rensheGraduated'
import styles from './renshe.module.scss'

interface Props { plan: RenshePlan; profile: UserProfileAggregated | null; application: RensheApplicationDetail | null }

export default function GraduatedForm({ plan, profile, application }: Props) {
  const draft = application?.draft_data
  const [education, setEducation] = useState<Partial<RensheEducationInfo>>(draft?.education_info || {
    school: profile?.student?.school || '', major: profile?.student?.major || '', education: profile?.student?.education || '',
  })
  const [graduated, setGraduated] = useState(Boolean(draft?.education_info?.graduated))
  const [phone, setPhone] = useState(draft?.contact_phone || profile?.profile.phone || '')
  const [email, setEmail] = useState(draft?.email || profile?.profile.email || '')
  const [address, setAddress] = useState(draft?.mailing_address || profile?.profile.address || '')
  const [materials, setMaterials] = useState<Record<string, RensheUploadedMaterial>>(draft?.materials || {})
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const realname = profile?.realname
  const identityReady = realname?.identity_status === 'verified'
  const correcting = Boolean(application && ['initial_rejected', 'external_rejected'].includes(application.status))
  const editable = !application || application.status === 'draft' || (correcting && correctionAvailable(application, plan))
  const locked = !editable || Boolean(application?.frozen_at)
  const requirements = plan.renshe_config?.materials || []
  const uploadRequirements = requirements.filter(item => !['id_card_front', 'id_card_back'].includes(item.kind))
  const uploadedCount = uploadRequirements.filter(item => materials[item.kind]).length
  const setField = (field: keyof RensheEducationInfo, value: string) => setEducation(previous => ({ ...previous, [field]: value }))
  const fail = (value: unknown) => setError(value instanceof Error ? value.message : '操作失败，请重试')

  const upload = async (kind: string, extensions: string[]) => {
    if (busy || locked || !identityReady) return
    setError('')
    try {
      let path: string; let size: number; let filename: string
      if (kind === 'registration_portrait') {
        const selected = await Taro.chooseMedia({ count: 1, mediaType: ['image'], sizeType: ['original'], sourceType: ['album', 'camera'] })
        path = selected.tempFiles[0].tempFilePath; size = selected.tempFiles[0].size; filename = path
      } else {
        const choice = await Taro.showActionSheet({ itemList: ['从聊天文件选择（图片或PDF）', '拍照或从相册选择图片'] })
        if (choice.tapIndex === 0) {
          const selected = await Taro.chooseMessageFile({ count: 1, type: 'file', extension: extensions.map(value => value.slice(1)) })
          path = selected.tempFiles[0].path; size = selected.tempFiles[0].size; filename = selected.tempFiles[0].name
        } else {
          const selected = await Taro.chooseMedia({ count: 1, mediaType: ['image'], sizeType: ['original'] })
          path = selected.tempFiles[0].tempFilePath; size = selected.tempFiles[0].size; filename = path
        }
      }
      const validation = validateGraduatedFile(kind, filename, size, extensions)
      if (validation) { setError(validation); return }
      setBusy(kind)
      const uploaded = await rensheService.uploadMaterial(plan.id, kind, path)
      setMaterials(previous => ({ ...previous, [kind]: uploaded }))
    } catch (value) {
      if (!String((value as { errMsg?: string })?.errMsg || '').includes('cancel')) fail(value)
    } finally { setBusy('') }
  }

  const downloadTemplate = async () => {
    if (busy) return
    setBusy('template'); setError('')
    try { await rensheService.downloadCommitmentTemplate(plan.id, plan.renshe_config?.reporting_policy?.commitment_template?.filename) }
    catch (value) { fail(value) } finally { setBusy('') }
  }

  const submit = async () => {
    if (busy || locked) return
    setError('')
    if (!identityReady) { setError('请先完成本人实名认证'); return }
    if (!graduated) { setError('本期仅接受已取得毕业证的申请人，请确认毕业情况'); return }
    if (['school', 'institution_type', 'education', 'major', 'graduation_date', 'certificate_number'].some(key => !String(education[key as keyof RensheEducationInfo] || '').trim())) { setError('请完整填写毕业学历信息'); return }
    if (education.graduation_date! > chinaDate() || education.graduation_date! < '1900-01-01') { setError('毕业日期不得晚于今天'); return }
    if (!validatePhone(phone).valid || !validateEmail(email).valid || !address.trim()) { setError('请填写有效手机号、邮箱和通讯地址'); return }
    if (uploadRequirements.some(item => item.required && !materials[item.kind])) { setError('请上传全部必填报名材料'); return }
    if (!realname?.id_card_front_oss || !realname?.id_card_back_oss) { setError('实名身份证材料不完整，请通过实名更正流程补齐'); return }
    setBusy('submit')
    try {
      if (!(await ensureAgreementSigned('cert_registration', '认证报名信息处理授权协议', '请阅读并同意认证报名信息处理授权协议'))) return
      const saved = await rensheService.saveDraft({ plan_id: plan.id, contact_phone: phone.trim(), email: email.trim(), mailing_address: address.trim(), education_info: { ...education, graduated: true } as RensheEducationInfo })
      const result = await rensheService.submit(saved.id)
      if (result.payment_required) await Taro.navigateTo({ url: `/${ROUTES.REGISTRATION_CONFIRM}?order_id=${result.order_id}` })
      else await Taro.redirectTo({ url: `/${ROUTES.MINE_REGISTRATION_DETAIL}?type=renshe&id=${saved.id}` })
    } catch (value) { fail(value) } finally { setBusy('') }
  }

  const picker = (field: 'institution_type' | 'education', label: string, values: string[], labels: Record<string, string>) => (
    <View className={styles.pickerField}>
      <Text className={styles.label}>{label} *</Text>
      <Picker mode='selector' range={values.map(value => labels[value] || value)} disabled={locked || Boolean(busy)} onChange={event => setField(field, values[Number(event.detail.value)])}>
        <View className={styles.readonlyValue}>{labels[education[field] || ''] || '请选择'} ›</View>
      </Picker>
    </View>
  )

  return <AuthGuard><View className={styles.page}>
    <PageHeader title='已毕业学历型报名' shouldShowBack />
    <ScrollView scrollY className={`${styles.body} ${styles.bodyWithFooter}`}>
      <View className={styles.card}>
        <Text className={styles.sectionTitle}>{plan.occupation_name} · 四级 / 中级工</Text>
        <Text className={styles.sectionDesc}>{plan.name} · {plan.application_type}</Text>
        <View className={styles.warning}>本期仅接受已取得毕业证、本专业或相关专业的申请人。不接受在读证明、学生证或应届替代证明。学历及专业由本次报名初审核验。</View>
        <Text className={styles.sectionDesc}>实名 → 学历与材料 → 提交支付 → 初审 → 线下报送 → 外审结果</Text>
      </View>
      {application?.latest_rejection_reason && <View className={styles.warning}>
        <Text>补正原因：{application.latest_rejection_reason}</Text>
        <Text className={styles.sectionDesc}>待修改：{application.required_changes?.map(key => CHANGE_LABELS[key] || key).join('、')}</Text>
        <Text className={styles.sectionDesc}>补正截止：{formatDateTime(application.correction_due_at, '请联系管理员设置')}</Text>
        <Text className={styles.sectionDesc}>已支付报名补正后重新初审，复用原订单。</Text>
      </View>}
      {locked && <View className={styles.warning}>
        <Text>{application?.frozen_at ? '退款处理中，资料已冻结。' : correcting ? '补正期限或批次状态不允许修改，请联系管理员。' : '报名已提交，可在报名详情查看进度、继续支付或取消待支付订单。'}</Text>
        {application && <Button variant='secondary' onClick={() => Taro.redirectTo({ url: `/${ROUTES.MINE_REGISTRATION_DETAIL}?type=renshe&id=${application.id}` })}>查看报名详情</Button>}
      </View>}
      <View className={styles.card}>
        <Text className={styles.sectionTitle}>本人身份</Text>
        <Text className={styles.readonlyValue}>{realname?.real_name || '未实名'}　{realname?.id_card || ''}</Text>
        <Text className={styles.sectionDesc}>姓名、身份证及证件正反面来自本人已验证资料。身份有误请走实名更正流程。</Text>
        {!identityReady && <Button onClick={() => Taro.navigateTo({ url: '/pages/mine/edit-profile' })}>去完成本人实名</Button>}
      </View>
      <View className={styles.card}>
        <Text className={styles.sectionTitle}>毕业学历信息</Text>
        <Text className={styles.sectionDesc}>已有院校、专业可预填，请按毕业证核对；预填不代表资格审核通过。</Text>
        <View className={styles.declaration} onClick={() => { if (!locked && !busy) setGraduated(!graduated) }}><Checkbox value='graduated' checked={graduated} disabled={locked || Boolean(busy)} color='#3366ff' /><Text>本人已取得本次申报学历的毕业证</Text></View>
        <FormInput label='毕业院校' required placeholder='按毕业证填写完整院校名称' value={education.school || ''} disabled={locked || Boolean(busy)} onChange={value => setField('school', value)} maxlength={128} />
        {picker('institution_type', '院校类型', plan.renshe_config?.institution_types || [], INSTITUTION_LABELS)}
        {picker('education', '学历层次', plan.renshe_config?.education_levels || [], EDUCATION_LABELS)}
        <FormInput label='所学专业' required placeholder='按毕业证原文填写，不可自行认定相关专业' value={education.major || ''} disabled={locked || Boolean(busy)} onChange={value => setField('major', value)} maxlength={128} />
        <View className={styles.pickerField}><Text className={styles.label}>毕业日期 *</Text><Picker mode='date' start='1900-01-01' end={chinaDate()} disabled={locked || Boolean(busy)} value={education.graduation_date || ''} onChange={event => setField('graduation_date', event.detail.value)}><View className={styles.readonlyValue}>{education.graduation_date || '请选择毕业日期'} ›</View></Picker></View>
        <FormInput label='毕业证书编号' required placeholder='按毕业证填写' value={education.certificate_number || ''} disabled={locked || Boolean(busy)} onChange={value => setField('certificate_number', value)} maxlength={128} />
      </View>
      <View className={styles.card}>
        <Text className={styles.sectionTitle}>联系信息</Text>
        <FormInput label='手机号' required placeholder='接收报名及补正通知' value={phone} maxlength={11} disabled={locked || Boolean(busy)} onChange={setPhone} />
        <FormInput label='邮箱' required placeholder='请输入常用邮箱' value={email} maxlength={128} disabled={locked || Boolean(busy)} onChange={setEmail} />
        <FormInput label='通讯地址' required placeholder='请输入完整通讯地址' value={address} maxlength={256} disabled={locked || Boolean(busy)} onChange={setAddress} />
      </View>
      <View className={styles.card}>
        <Text className={styles.sectionTitle}>报名材料 · 已上传 {uploadedCount}/{uploadRequirements.length}</Text>
        <Text className={styles.sectionDesc}>身份证正反面复用实名材料，请保证证件有效、图像清晰完整。以下文件仅用于本次报名。</Text>
        <View className={styles.warning}>学历备案表须对应本次已毕业学历，在线验证有效期设置为6个月。无法提供既定材料请联系管理员，暂不支持替代材料线上报名。</View>
        {uploadRequirements.map(item => <View key={item.kind} className={styles.uploadItem}>
          <Text className={styles.sectionTitle}>{item.name} {item.required ? '*' : ''}</Text>
          {item.kind === 'commitment_letter' && <><Text className={styles.sectionDesc}>下载模板 → 本人亲笔签名并按手印 → 上传清晰扫描件。此承诺书与信息处理授权协议分别提交。</Text><Button variant='secondary' disabled={Boolean(busy)} onClick={() => void downloadTemplate()}>下载承诺书模板</Button></>}
          <Text className={styles.sectionDesc}>{item.extensions.join(' / ')} · {item.kind === 'registration_portrait' ? '一寸、白底、近期、≤500 KB' : '图片≤10 MB，PDF≤20 MB'}</Text>
          {materials[item.kind] && <Text className={styles.fileName}>已上传：{materials[item.kind].original_filename} · {Math.ceil(materials[item.kind].size_bytes / 1024)} KB</Text>}
          <Button variant='secondary' disabled={locked || Boolean(busy) || !identityReady} onClick={() => void upload(item.kind, item.extensions)}>{busy === item.kind ? '上传中…' : materials[item.kind] ? '替换材料' : '上传材料'}</Button>
        </View>)}
      </View>
      <View className={styles.card}><Text className={styles.sectionTitle}>协议、费用与提交</Text><Text className={styles.sectionDesc}>报名费 ¥{(plan.price_cents / 100).toFixed(2)}。提交前需签署认证报名信息处理授权协议。补正保存独立版本，保留历史记录。</Text>{error && <View className={styles.warning}>{error}</View>}</View>
    </ScrollView>
    <View className={styles.fixedFooter}>{error && <View className={styles.warning}>{error}</View>}<Button variant='gradient' size='lg' className={styles.primaryButton} disabled={locked || Boolean(busy) || !identityReady} onClick={() => void submit()}>{busy === 'submit' ? '提交中…' : correcting ? '提交补正 · 无需重复支付' : `提交并支付 ¥${(plan.price_cents / 100).toFixed(2)}`}</Button></View>
  </View></AuthGuard>
}
