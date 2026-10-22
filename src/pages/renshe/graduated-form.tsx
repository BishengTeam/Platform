import { useEffect, useRef, useState } from 'react'
import { Checkbox, Picker, ScrollView, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { FormInput } from '@/components/FormInput'
import { MaterialItem, RegistrationSummary, RegistrationSubmitBar, RequirementDisclosure } from '@/components/RegistrationParts'
import { DocumentActions } from '@/components/DocumentActions'
import type { DocumentActionsController } from '@/hooks/useDocumentActions'
import { currentWorkUnit, materialSources } from '@/utils/registrationMaterial'
import { ROUTES } from '@/constants/routes'
import { canSendCommitmentTemplate, TEMPLATE_SHARE_UNSUPPORTED, rensheService, type RenshePlan, type RensheApplicationDetail, type RensheEducationInfo, type RensheUploadedMaterial, type RensheReportingInfo, type RensheReportingOptions, type RensheEmploymentInfo } from '@/services/rensheService'
import type { UserProfileAggregated } from '@/types/profile'
import { ensureAgreementSigned } from '@/utils/agreementGate'
import { validatePhone, validateEmail } from '@/utils/validator'
import { formatDateTime } from '@/utils/format'
import { CHANGE_LABELS, INSTITUTION_LABELS, EDUCATION_LABELS, chinaDate, correctionAvailable, validateGraduatedFile, validateReportingInfo, validateDegreeEducation, workDateHint } from '@/utils/rensheGraduated'
import styles from './renshe.module.scss'
import EmploymentFields, { emptyExperience } from './employment-fields'
import { validateEmploymentInfo } from '@/utils/rensheEmployment'
import { isEmploymentRule, LEVEL_FIVE_EMPLOYMENT_RULE, LEVEL_THREE_RULE } from '@/utils/rensheGraduated'

import { validateLevelThreeInfo } from '@/utils/rensheLevelThree'
import TitleCertificateFields from './title-certificate-fields'
import { levelFiveAgeBasis, validateLevelFiveAge } from '@/utils/rensheLevelFive'

interface Props { plan: RenshePlan; profile: UserProfileAggregated | null; application: RensheApplicationDetail | null }

export default function GraduatedForm({ plan, profile, application }: Props) {
  const draft = application?.draft_data
  const employment = isEmploymentRule(plan.renshe_config?.qualification_rule)
  const levelThree = plan.renshe_config?.qualification_rule === LEVEL_THREE_RULE
  const levelFive = plan.renshe_config?.qualification_rule === LEVEL_FIVE_EMPLOYMENT_RULE
  const compound = plan.application_type === '复合型'
  const [qualification, setQualification] = useState<RensheEmploymentInfo>(draft?.qualification_info || { cultural_education: profile?.student?.education || '', work_experiences: [emptyExperience()] })
  const [education, setEducation] = useState<Partial<RensheEducationInfo>>(draft?.education_info || {
    school: profile?.student?.school || '', major: profile?.student?.major || '', education: profile?.student?.education || '',
  })
  const [graduated, setGraduated] = useState(Boolean(draft?.education_info?.graduated))
  const [phone, setPhone] = useState(draft?.contact_phone || profile?.profile.phone || '')
  const [email, setEmail] = useState(draft?.email || profile?.profile.email || '')
  const [address, setAddress] = useState(draft?.mailing_address || profile?.profile.address || '')
  const [materials, setMaterials] = useState<Record<string, RensheUploadedMaterial>>(draft?.materials || {})
  const [busy, setBusy] = useState('')
  const operationLock = useRef(false)
  const [fileShareSupported, setFileShareSupported] = useState(canSendCommitmentTemplate)
  const [error, setError] = useState('')
  const [materialErrors, setMaterialErrors] = useState<Record<string, string>>({})
  const [templateError, setTemplateError] = useState('')
  const [options, setOptions] = useState<RensheReportingOptions | null>(null)
  const [optionsError, setOptionsError] = useState('')
  const [retry, setRetry] = useState(0)
  const [reporting, setReporting] = useState<Partial<RensheReportingInfo>>(draft?.reporting_info || {
    ethnicity: profile?.realname?.ethnicity || '', political_status: profile?.realname?.political_status || '',
  })
  const reportField = (field: keyof RensheReportingInfo, value: string | boolean | null) => setReporting(previous => ({ ...previous, [field]: value }))
  useEffect(() => {
    let active = true
    setOptions(null); setOptionsError('')
    rensheService.getReportingOptions(plan.id).then(value => { if (active) setOptions(value) }).catch(value => { if (active) setOptionsError(value instanceof Error ? value.message : '报送要求加载失败，请重试') })
    return () => { active = false }
  }, [plan.id, retry])
  const admissionPaths = options?.rule_profile?.admission_paths || plan.renshe_config?.rule_profile?.admission_paths || []
  const branch = admissionPaths.find(item => item.id === qualification.admission_path)
  const educationRequired = levelThree ? Boolean(branch?.education) : !employment
  const realname = profile?.realname
  const fiveAgeError = levelFive ? validateLevelFiveAge(realname?.birth_date, application?.versions) : null
  const identityReady = realname?.identity_status === 'verified'
  const correcting = Boolean(application && ['initial_rejected', 'external_rejected'].includes(application.status))
  const editable = !application || application.status === 'draft' || (correcting && correctionAvailable(application, plan))
  const locked = !editable || Boolean(application?.frozen_at)
  const requirements = (plan.renshe_config?.materials || []).filter(item => !levelThree || (branch ? branch.material_kinds.includes(item.kind) : ['id_card_front', 'id_card_back', 'registration_portrait', 'commitment_letter'].includes(item.kind))).map(item => levelThree ? { ...item, required: true } : item)
  const uploadRequirements = requirements.filter(item => !['id_card_front', 'id_card_back', 'portrait'].includes(item.kind))
  const uploadedCount = uploadRequirements.filter(item => materials[item.kind]).length
  const setField = (field: keyof RensheEducationInfo, value: string) => setEducation(previous => ({ ...previous, [field]: value }))
  const fail = (value: unknown) => setError(value instanceof Error ? value.message : '操作失败，请重试')

  const upload = async (kind: string, extensions: string[]) => {
    if (busy || operationLock.current || locked || !identityReady || !options) return
    operationLock.current = true
    setBusy(kind)
    setMaterialErrors(previous => ({ ...previous, [kind]: '' }))
    try {
      let path: string; let size: number; let filename: string
      const sources = materialSources(extensions)
      let source = sources[0]
      if (sources.length > 1) {
        const choice = await Taro.showActionSheet({ itemList: ['从微信聊天文件选择', '拍照或从相册选择图片'] })
        source = sources[choice.tapIndex]
      }
      if (source === 'image') {
        const selected = await Taro.chooseMedia({ count: 1, mediaType: ['image'], sizeType: ['original'], sourceType: ['album', 'camera'] })
        if (!selected.tempFiles[0]) return
        path = selected.tempFiles[0].tempFilePath; size = selected.tempFiles[0].size; filename = path
      } else if (source === 'file') {
        const selected = await Taro.chooseMessageFile({ count: 1, type: 'file', extension: extensions.map(value => value.replace(/^\./, '')) })
        if (!selected.tempFiles[0]) return
        path = selected.tempFiles[0].path; size = selected.tempFiles[0].size; filename = selected.tempFiles[0].name
      } else return
      const validation = validateGraduatedFile(kind, filename, size, extensions)
      if (validation) { setMaterialErrors(previous => ({ ...previous, [kind]: validation })); return }
      setBusy(kind)
      const uploaded = await rensheService.uploadMaterial(plan.id, kind, path)
      setMaterials(previous => ({ ...previous, [kind]: uploaded }))
    } catch (value) {
      if (!/cancel/i.test(String((value as { errMsg?: string })?.errMsg || (value as Error)?.message || ''))) setMaterialErrors(previous => ({ ...previous, [kind]: value instanceof Error ? value.message : '材料上传失败，请重试' }))
    } finally { operationLock.current = false; setBusy('') }
  }

  const operateTemplate = async (action: 'preview' | 'send') => {
    if (busy || operationLock.current) return
    setTemplateError('')
    if (!options?.commitment_template) { setTemplateError('暂无可用承诺书模板，请联系管理员'); return }
    if (action === 'send') {
      const supported = canSendCommitmentTemplate()
      setFileShareSupported(supported)
      if (!supported) { setTemplateError(TEMPLATE_SHARE_UNSUPPORTED); return }
    }
    // The ref blocks a second tap before React has rendered the busy state.
    operationLock.current = true
    setBusy(`template-${action}`)
    try {
      const file = await rensheService.getCommitmentTemplateFile(plan.id, options.commitment_template.filename)
      if (action === 'preview') await rensheService.previewCommitmentTemplate(file)
      else await rensheService.sendCommitmentTemplate(file)
    } catch (value) { setTemplateError(value instanceof Error ? value.message : '模板操作失败，请重试') }
    finally { operationLock.current = false; setBusy('') }
  }

  const submit = async () => {
    if (busy || operationLock.current || locked) return
    setError('')
    if (!identityReady) { setError('请先完成本人实名认证'); return }
    if (levelFive) {
      const ageError = validateLevelFiveAge(realname?.birth_date, application?.versions)
      if (ageError) { setError(ageError); return }
    }
    if (!options) { setError(optionsError || '正在加载本批次报送要求，请稍候'); return }
    const reportingError = validateReportingInfo(reporting, options)
    if (reportingError) { setError(reportingError); return }
    const workDate = reporting.work_start_date
    const enrollmentDate = reporting.enrollment_date
    const years = reporting.occupation_years
    if (levelThree) {
      const qualificationError = validateLevelThreeInfo(qualification, branch, reporting, education)
      if (qualificationError) { setError(qualificationError); return }
    } else if (employment) {
      const qualificationError = validateEmploymentInfo(qualification, compound, reporting, levelFive)
      if (qualificationError) { setError(qualificationError); return }
    }
    if (educationRequired) {
    if (!graduated) { setError('本期仅接受已取得毕业证的申请人，请确认毕业情况'); return }
    if (['school', 'institution_type', 'education', 'major', 'graduation_date', 'certificate_number'].some(key => !String(education[key as keyof RensheEducationInfo] || '').trim())) { setError('请完整填写毕业学历信息'); return }
    if (education.graduation_date! > chinaDate() || education.graduation_date! < '1900-01-01') { setError('毕业日期不得晚于今天'); return }
    const educationError = validateDegreeEducation(education, options)
    if (educationError) { setError(educationError); return }
    }
    if (!validatePhone(phone).valid || !validateEmail(email).valid || !address.trim()) { setError('请填写有效手机号、邮箱和通讯地址'); return }
    const missing = uploadRequirements.filter(item => item.required && !materials[item.kind])
    if (missing.length) { setMaterialErrors(Object.fromEntries(missing.map(item => [item.kind, `请上传${item.name}`]))); setError('请补齐标记为必填的报名材料'); return }
    if (!realname?.id_card_front_oss || !realname?.id_card_back_oss || (requirements.some(item => item.kind === 'portrait' && item.required) && !realname?.avatar_oss)) { setError('实名材料不完整，请通过实名更正流程补齐'); return }
    operationLock.current = true
    setBusy('submit')
    try {
      if (!(await ensureAgreementSigned('cert_registration', '认证报名信息处理授权协议', '请阅读并同意认证报名信息处理授权协议'))) return
      const saved = await rensheService.saveDraft({ plan_id: plan.id, contact_phone: phone.trim(), email: email.trim(), mailing_address: address.trim(), ...(employment ? { qualification_info: qualification } : {}), ...(educationRequired ? { education_info: { ...education, graduated: true } as RensheEducationInfo } : {}), reporting_info: { ...reporting, work_start_date: reporting.has_work_experience ? workDate || null : null, enrollment_date: enrollmentDate || null, occupation_years: years === '' || years == null ? null : years } as RensheReportingInfo })
      const result = await rensheService.submit(saved.id)
      if (result.payment_required) await Taro.navigateTo({ url: `/${ROUTES.REGISTRATION_CONFIRM}?order_id=${result.order_id}` })
      else await Taro.redirectTo({ url: `/${ROUTES.MINE_REGISTRATION_DETAIL}?type=renshe&id=${saved.id}` })
    } catch (value) { fail(value) } finally { operationLock.current = false; setBusy('') }
  }

  const picker = (field: 'institution_type' | 'education', label: string, values: string[], labels: Record<string, string>) => (
    <View className={styles.pickerField}>
      <Text className={styles.label}>{label} *</Text>
      <Picker mode='selector' range={values.map(value => labels[value] || value)} disabled={locked || Boolean(busy)} onChange={event => setField(field, values[Number(event.detail.value)])}>
        <View className={styles.readonlyValue}>{labels[education[field] || ''] || '请选择'} ›</View>
      </Picker>
    </View>
  )
  const reportPicker = (field: 'occupation_status' | 'ethnicity' | 'political_status', label: string, values: string[]) => <View className={styles.pickerField}><Text className={styles.label}>{label} *</Text><Picker mode='selector' range={values} disabled={locked || Boolean(busy) || !options} onChange={event => reportField(field, values[Number(event.detail.value)])}><View className={styles.readonlyValue}>{reporting[field] || '请选择'} ›</View></Picker></View>
  const reportDatePicker = (field: 'work_start_date' | 'enrollment_date', label: string) => <View className={styles.pickerField}><Text className={styles.label}>{label}</Text><Picker mode='date' start='1900-01-01' end={chinaDate()} value={reporting[field] || ''} disabled={locked || Boolean(busy)} onChange={event => reportField(field, event.detail.value)}><View className={styles.readonlyValue}>{reporting[field] || '请选择真实日期'} ›</View></Picker>{reporting[field] && <Text onClick={() => { if (!locked && !busy) reportField(field, null) }}>清除日期</Text>}</View>

  const commitmentActions: DocumentActionsController = {
    busy: busy === 'template-preview' || busy === 'template-send' ? { scene: 'renshe-commitment', action: busy === 'template-preview' ? 'preview' : 'send' } : null,
    error: templateError ? { scene: 'renshe-commitment', message: templateError } : null,
    shareSupported: fileShareSupported, run: (_scene, action) => operateTemplate(action), isBusy: () => operationLock.current,
  }
  const unitSuggestion = currentWorkUnit(qualification.work_experiences)
  const requiresWorkInfo = employment && (!levelThree || Boolean(branch?.work))

  return <AuthGuard><View className={styles.page}>
    <PageHeader title={levelThree ? '三级报名' : employment ? '工龄及证书路径报名' : '已毕业学历型报名'} shouldShowBack />
    <ScrollView scrollY className={`${styles.body} ${styles.bodyWithFooter}`}>
      <RegistrationSummary title={plan.name} subtitle={`${plan.occupation_name} · ${plan.skill_level}`} badge={plan.application_type} priceCents={plan.price_cents}
        items={[{ label: '报名时间', value: `${formatDateTime(plan.apply_start, '待公布')} 至 ${formatDateTime(plan.apply_end, '待公布')}`, wide: true }, { label: '考试时间', value: formatDateTime(plan.exam_date, '待公布') }, { label: '考试地点', value: plan.exam_location || '以批次安排为准' }]}>
        <RequirementDisclosure title='查看报考要求'>
          <Text className={styles.sectionDesc}>{levelThree ? branch?.condition || '请选择符合本人情况的具体三级申报路径。' : employment ? levelFive ? '五级须年满16周岁并从事相关职业，不设最低工龄。' : compound ? '须取得五级证书后累计相关工作满3年。' : '须累计相关职业工作满5年。' : '仅接受已取得毕业证、本专业或相关专业的申请人。'}</Text>
          {options?.rule_profile?.related_majors && <Text className={styles.sectionDesc}>相关专业：{options.rule_profile.related_majors}</Text>}
          {options?.rule_profile?.related_occupations && <Text className={styles.sectionDesc}>相关职业：{options.rule_profile.related_occupations}</Text>}
          {options?.rule_profile?.project_limits?.map(item => <Text key={item} className={styles.sectionDesc}>{item}</Text>)}
        </RequirementDisclosure>
      </RegistrationSummary>
      {application?.latest_rejection_reason && <View className={styles.warning}>
        <Text>补正原因：{application.latest_rejection_reason}</Text>
        <Text className={styles.sectionDesc}>待修改：{application.required_changes?.map(key => CHANGE_LABELS[key] || key).join('、')}</Text>
        <Text className={styles.sectionDesc}>补正截止：{formatDateTime(application.correction_due_at, '请联系管理员设置')}</Text>
        <Text className={styles.sectionDesc}>已支付报名补正后重新初审，复用原订单。</Text>
      </View>}
      {!options && <View className={styles.warning}><Text>{optionsError || '正在加载本批次填报要求…'}</Text>{optionsError && <Button variant='secondary' onClick={() => setRetry(value => value + 1)}>重新加载</Button>}</View>}
      {locked && <View className={styles.warning}>
        <Text>{application?.frozen_at ? '退款处理中，资料已冻结。' : correcting ? '补正期限或批次状态不允许修改，请联系管理员。' : '报名已提交，可在报名详情查看进度、查看付款进度或取消待支付订单。'}</Text>
        {application && <Button variant='secondary' onClick={() => Taro.redirectTo({ url: `/${ROUTES.MINE_REGISTRATION_DETAIL}?type=renshe&id=${application.id}` })}>查看报名详情</Button>}
      </View>}
      <View className={styles.card}>
        <Text className={styles.sectionTitle}>本人身份</Text>
        <Text className={styles.readonlyValue}>{realname?.real_name || '未实名'}　{realname?.id_card || ''}</Text>
        <Text className={styles.sectionDesc}>姓名、身份证及证件正反面来自本人已验证资料。身份有误请走实名更正流程。</Text>
        {levelFive && <Text className={styles.sectionDesc}>实名出生日期：{realname?.birth_date || '未提供'}；年龄核算日期：{levelFiveAgeBasis(application?.versions) || '待核实'}{application?.versions.length ? '（首次正式提交，北京时间）' : '（北京时间；正式提交时重新核验）'}。须年满16周岁。</Text>}
        {fiveAgeError && identityReady && <View className={styles.warning}>{fiveAgeError}</View>}
        {!identityReady && <Button onClick={() => Taro.navigateTo({ url: '/pages/mine/edit-profile' })}>去完成本人实名</Button>}
      </View>
      {levelThree && <View className={styles.card}>
        <Text className={styles.sectionTitle}>具体申报路径 *</Text>
        <Picker mode='selector' range={admissionPaths.map(item => item.condition)} disabled={locked || Boolean(busy)} onChange={event => {
          const next = admissionPaths[Number(event.detail.value)]
          if (!next) return
          setQualification({ admission_path: next.id, cultural_education: qualification.cultural_education, work_experiences: next.work ? [emptyExperience()] : [] })
          setEducation({}); setGraduated(false); setError('')
        }}><View className={styles.readonlyValue}>{branch?.condition || '请选择符合本人情况的一条条件'} ›</View></Picker>
        <Text className={styles.sectionDesc}>切换路径会清空资格字段，必交材料随当前路径变化；请按当前条件核对材料。</Text>
      </View>}
      {employment && (!levelThree || branch) && <EmploymentFields value={qualification} onChange={setQualification} compound={levelThree ? Boolean(branch?.skill) : compound} levelFive={levelFive} skillGrade={levelThree ? 4 : 5} requiredYears={levelThree ? branch?.years : undefined} showWork={!levelThree || Boolean(branch?.work)} educationRequired={educationRequired} options={options} disabled={locked || Boolean(busy)} />}
      {levelThree && branch?.title && <TitleCertificateFields value={qualification} onChange={setQualification} disabled={locked || Boolean(busy)} />}
      {educationRequired && <View className={styles.card}>
        <Text className={styles.sectionTitle}>毕业学历信息</Text>
        <Text className={styles.sectionDesc}>已有院校、专业可预填，请按毕业证核对；预填不代表资格审核通过。</Text>
        <View className={styles.declaration} onClick={() => { if (!locked && !busy) setGraduated(!graduated) }}><Checkbox value='graduated' checked={graduated} disabled={locked || Boolean(busy)} color='#3366ff' /><Text>本人已取得本次申报学历的毕业证</Text></View>
        <FormInput compact label='毕业院校' required placeholder='按毕业证填写完整院校名称' value={education.school || ''} disabled={locked || Boolean(busy)} onChange={value => setField('school', value)} maxlength={128} />
        <View className={styles.fieldGrid}>
        {picker('institution_type', '院校类型', options?.institution_types || [], INSTITUTION_LABELS)}
        {picker('education', '学历层次', options?.education_levels || [], options?.education_labels || EDUCATION_LABELS)}
        </View>
        <FormInput compact label='所学专业' required placeholder='按毕业证原文填写，不可自行认定相关专业' value={education.major || ''} disabled={locked || Boolean(busy)} onChange={value => setField('major', value)} maxlength={128} />
        <View className={styles.pickerField}><Text className={styles.label}>毕业日期 *</Text><Picker mode='date' start='1900-01-01' end={chinaDate()} disabled={locked || Boolean(busy)} value={education.graduation_date || ''} onChange={event => setField('graduation_date', event.detail.value)}><View className={styles.readonlyValue}>{education.graduation_date || '请选择毕业日期'} ›</View></Picker></View>
        {levelThree && branch?.id === 'technical_senior' && <View className={styles.pickerField}><Text className={styles.label}>技工院校培养层次 *</Text><Picker mode='selector' range={['高级工班', '预备技师班', '技师班']} disabled={locked || Boolean(busy)} onChange={event => setField('training_level', ['senior_worker', 'preparatory_technician', 'technician'][Number(event.detail.value)])}><View className={styles.readonlyValue}>{education.training_level ? { senior_worker: '高级工班', preparatory_technician: '预备技师班', technician: '技师班' }[education.training_level] : '请选择毕业证对应培养层次'} ›</View></Picker></View>}
        {levelThree && branch?.id === 'evaluated_college' && <FormInput compact label='院校评估论证依据' required value={education.evaluation_reference || ''} placeholder='填写备案等级认定评价机构相关依据，初审核验' disabled={locked || Boolean(busy)} onChange={value => setField('evaluation_reference', value)} maxlength={256} />}
        <FormInput compact label='毕业证书编号' required placeholder='按毕业证填写' value={education.certificate_number || ''} disabled={locked || Boolean(busy)} onChange={value => setField('certificate_number', value)} maxlength={128} />
      </View>}
      <View className={styles.card}>
        <Text className={styles.sectionTitle}>个人补充信息</Text>
        <Text className={styles.sectionDesc}>职业状态用于记录个人情况，与工作经历中的职业／岗位分别填写。</Text>
        {reportPicker('occupation_status', '职业状态', options?.occupations || [])}
        <View className={styles.fieldGrid}>
        {reportPicker('ethnicity', '民族', options?.ethnicities || [])}
        {reportPicker('political_status', '政治面貌', options?.political_statuses || [])}
        </View>
      </View>
      <View className={styles.card}>
        <Text className={styles.sectionTitle}>工作相关信息</Text>
        <View className={styles.pickerField}><Text className={styles.label}>是否参加过工作 *</Text><Picker mode='selector' range={['参加过工作', '尚未参加工作']} disabled={locked || Boolean(busy)} onChange={event => setReporting(previous => ({ ...previous, has_work_experience: Number(event.detail.value) === 0, work_start_date: Number(event.detail.value) === 0 ? previous.work_start_date : null }))}><View className={styles.readonlyValue}>{reporting.has_work_experience === undefined ? '请选择' : reporting.has_work_experience ? '参加过工作' : '尚未参加工作'} ›</View></Picker></View>
        {reporting.has_work_experience && reportDatePicker('work_start_date', options?.employment_reporting.work_date_required === false ? '参加工作日期（选填）' : '参加工作日期 *')}
        <Text className={styles.sectionDesc}>{workDateHint(options?.employment_reporting, reporting.has_work_experience)}</Text>
        <FormInput compact label='实际职业年限（年）' required={options?.employment_reporting.years_rule === 'required'} placeholder='如实填写，可保留两位小数' value={String(reporting.occupation_years ?? '')} disabled={locked || Boolean(busy)} onChange={value => reportField('occupation_years', value)} maxlength={7} />
        <Text className={styles.sectionDesc}>{options?.employment_reporting.work_date_required === false ? '职业年限如实填写，不作为学历型报考的工龄门槛。' : '职业年限须符合当前路径要求；涉及工作年限时按实际经历核算，重叠时间不重复累计。'}</Text>
        <FormInput compact required={requiresWorkInfo} label={requiresWorkInfo ? '工作单位' : '工作单位（选填）'} value={reporting.work_unit || ''} placeholder='按实际情况填写' disabled={locked || Boolean(busy)} onChange={value => reportField('work_unit', value)} maxlength={128} />
        {unitSuggestion && !reporting.work_unit?.trim() && <Text className={styles.agreementLink} onClick={() => { if (!locked && !busy) reportField('work_unit', unitSuggestion) }}>使用当前工作经历单位：{unitSuggestion}（请核对）</Text>}
        <FormInput compact required={requiresWorkInfo} label={requiresWorkInfo ? '社保参保单位' : '社保参保单位（选填）'} value={reporting.social_insurance_unit || ''} placeholder='按实际情况填写' disabled={locked || Boolean(busy)} onChange={value => reportField('social_insurance_unit', value)} maxlength={128} />

      </View>
      <View className={styles.card}>
        <Text className={styles.sectionTitle}>联系信息</Text>
        <View className={styles.fieldGrid}>
        <FormInput compact label='手机号' required placeholder='接收报名及补正通知' value={phone} maxlength={11} disabled={locked || Boolean(busy)} onChange={setPhone} />
        <FormInput compact label='邮箱' required placeholder='请输入常用邮箱' value={email} maxlength={128} disabled={locked || Boolean(busy)} onChange={setEmail} />
        </View>
        <FormInput compact label='通讯地址' required placeholder='请输入完整通讯地址' value={address} maxlength={256} disabled={locked || Boolean(busy)} onChange={setAddress} />
      </View>
      <View className={styles.card}>
        <Text className={styles.sectionTitle}>报名材料</Text>
        <Text className={styles.sectionDesc}>已上传 {uploadedCount}/{uploadRequirements.length} 项；身份证材料按本人实名资料带入。</Text>
        <RequirementDisclosure title='查看材料详细要求'><Text className={styles.sectionDesc}>{levelThree ? '材料按当前具体路径必交：技能或职称证书与网查截图合并JPEG；学历网查截图整理为PDF，证书加学历路径须有效学信网备案表（6个月）。仅涉及工作年限的路径要求工龄及社保证明。' : employment ? '工龄证明独立上传；社保证明须为PDF，参保单位和工作单位一致且验证码可验证。证书与完整网查截图须合并为同一张清晰JPEG图片上传，不改扩展名伪装格式。' : requirements.some(item => item.kind === 'registration_portrait') ? '本期仅接受已取得毕业证的申请人。一寸白底近期证件照≤500 KB；毕业证、对应学信网学历备案表及本人签字按手印承诺书必传，学历报告验证有效期设置为6个月。不能提供既定材料请联系管理员。' : '历史批次继续使用原材料清单及格式要求；无法提供材料请联系管理员。'}</Text></RequirementDisclosure>
        <View className={styles.materialList}>
          {uploadRequirements.map(item => {
            const file = materials[item.kind]
            return <MaterialItem key={item.kind} id={`renshe-material-${item.kind}`} title={item.name} required={item.required}
              requirement={`${item.extensions.join(' / ')}，${item.kind === 'registration_portrait' ? '一寸白底近期照，≤500 KB' : item.extensions.every(ext => ext.toLowerCase() === '.pdf') ? 'PDF≤20 MB' : item.extensions.every(ext => ['.jpg', '.jpeg', '.png'].includes(ext.toLowerCase())) ? '图片≤10 MB' : '图片≤10 MB，PDF≤20 MB'}`}
              file={file ? { name: file.original_filename, size: file.size_bytes } : undefined} uploading={busy === item.kind}
              disabled={locked || Boolean(busy) || !identityReady || !options} error={materialErrors[item.kind]} onUpload={() => void upload(item.kind, item.extensions)} uploadLabel={item.kind === 'commitment_letter' ? '上传已签署承诺书' : undefined}>
              {item.kind === 'commitment_letter' && <>
                <Text className={styles.sectionDesc}>打印后由本人亲笔签名并按手印，再上传清晰扫描件或照片。</Text>
                <DocumentActions scene='renshe-commitment' title='承诺书模板' controller={commitmentActions} disabled={Boolean(busy) || !options} />
              </>}
            </MaterialItem>
          })}
        </View>
      </View>
      <View className={styles.card}>
        <Text className={styles.sectionTitle}>协议与提交</Text>
        <Text className={styles.sectionDesc}>提交前需签署<Text className={styles.agreementLink} onClick={() => Taro.navigateTo({ url: `/${ROUTES.AGREEMENT_VIEW}?type=cert_registration&requireSign=1` })}>《认证报名信息处理授权协议》</Text>。请核对资料后提交；填写信息不会自动保存，请核对后提交。</Text>
        {error && <Text className={styles.submissionError}>{error}</Text>}
      </View>
    </ScrollView>
    <RegistrationSubmitBar priceCents={plan.price_cents} priceLabel={correcting ? '本次补正' : '报名费'} priceText={correcting ? '无需重复支付' : undefined}
      disabled={locked || Boolean(busy) || !identityReady || !options} loading={busy === 'submit'} onSubmit={() => void submit()}
      label={correcting ? '提交补正' : plan.price_cents === 0 ? '提交报名' : '提交报名，前往付款'} />
  </View></AuthGuard>
}
