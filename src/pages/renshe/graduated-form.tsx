import { useEffect, useRef, useState } from 'react'
import { Checkbox, Picker, ScrollView, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { FormInput } from '@/components/FormInput'
import { ROUTES } from '@/constants/routes'
import { canSendCommitmentTemplate, TEMPLATE_SHARE_UNSUPPORTED, rensheService, type RenshePlan, type RensheApplicationDetail, type RensheEducationInfo, type RensheUploadedMaterial, type RensheReportingInfo, type RensheReportingOptions, type RensheEmploymentInfo } from '@/services/rensheService'
import type { UserProfileAggregated } from '@/types/profile'
import { ensureAgreementSigned } from '@/utils/agreementGate'
import { validatePhone, validateEmail } from '@/utils/validator'
import { formatDateTime } from '@/utils/format'
import { CHANGE_LABELS, INSTITUTION_LABELS, EDUCATION_LABELS, chinaDate, correctionAvailable, validateGraduatedFile, validateReportingInfo, validateDegreeEducation } from '@/utils/rensheGraduated'
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
  const templateOperation = useRef(false)
  const [fileShareSupported, setFileShareSupported] = useState(canSendCommitmentTemplate)
  const [error, setError] = useState('')
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
    if (busy || templateOperation.current || locked || !identityReady || !options) return
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

  const operateTemplate = async (action: 'preview' | 'send') => {
    if (busy || templateOperation.current) return
    setError('')
    if (!options?.commitment_template) { setError('暂无可用承诺书模板，请联系管理员'); return }
    if (action === 'send') {
      const supported = canSendCommitmentTemplate()
      setFileShareSupported(supported)
      if (!supported) { setError(TEMPLATE_SHARE_UNSUPPORTED); return }
    }
    // The ref blocks a second tap before React has rendered the busy state.
    templateOperation.current = true
    setBusy(`template-${action}`)
    try {
      const file = await rensheService.getCommitmentTemplateFile(plan.id, options.commitment_template.filename)
      if (action === 'preview') await rensheService.previewCommitmentTemplate(file)
      else await rensheService.sendCommitmentTemplate(file)
    } catch (value) { fail(value) }
    finally { templateOperation.current = false; setBusy('') }
  }

  const submit = async () => {
    if (busy || templateOperation.current || locked) return
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
    if (uploadRequirements.some(item => item.required && !materials[item.kind])) { setError('请上传全部必填报名材料'); return }
    if (!realname?.id_card_front_oss || !realname?.id_card_back_oss || (requirements.some(item => item.kind === 'portrait' && item.required) && !realname?.avatar_oss)) { setError('实名材料不完整，请通过实名更正流程补齐'); return }
    setBusy('submit')
    try {
      if (!(await ensureAgreementSigned('cert_registration', '认证报名信息处理授权协议', '请阅读并同意认证报名信息处理授权协议'))) return
      const saved = await rensheService.saveDraft({ plan_id: plan.id, contact_phone: phone.trim(), email: email.trim(), mailing_address: address.trim(), ...(employment ? { qualification_info: qualification } : {}), ...(educationRequired ? { education_info: { ...education, graduated: true } as RensheEducationInfo } : {}), reporting_info: { ...reporting, work_start_date: reporting.has_work_experience ? workDate || null : null, enrollment_date: enrollmentDate || null, occupation_years: years === '' || years == null ? null : years } as RensheReportingInfo })
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
  const reportPicker = (field: 'occupation_status' | 'ethnicity' | 'political_status', label: string, values: string[]) => <View className={styles.pickerField}><Text className={styles.label}>{label} *</Text><Picker mode='selector' range={values} disabled={locked || Boolean(busy) || !options} onChange={event => reportField(field, values[Number(event.detail.value)])}><View className={styles.readonlyValue}>{reporting[field] || '请选择'} ›</View></Picker></View>
  const reportDatePicker = (field: 'work_start_date' | 'enrollment_date', label: string) => <View className={styles.pickerField}><Text className={styles.label}>{label}</Text><Picker mode='date' start='1900-01-01' end={chinaDate()} value={reporting[field] || ''} disabled={locked || Boolean(busy)} onChange={event => reportField(field, event.detail.value)}><View className={styles.readonlyValue}>{reporting[field] || '请选择真实日期'} ›</View></Picker>{reporting[field] && <Text onClick={() => { if (!locked && !busy) reportField(field, null) }}>清除日期</Text>}</View>

  return <AuthGuard><View className={styles.page}>
    <PageHeader title={levelThree ? '三级报名' : employment ? '工龄及证书路径报名' : '已毕业学历型报名'} shouldShowBack />
    <ScrollView scrollY className={`${styles.body} ${styles.bodyWithFooter}`}>
      <View className={styles.card}>
        <Text className={styles.sectionTitle}>{plan.occupation_name} · {plan.skill_level}</Text>
        <Text className={styles.sectionDesc}>{plan.name} · {plan.application_type}</Text>
        <View className={styles.warning}>{levelThree ? branch?.condition || '请先选择具体三级申报路径，按所选条件填写并上传材料。涉及学历的路径仅接受已取得毕业证人员。' : employment ? levelFive ? '五级工龄型须在首次正式提交当日年满16周岁，实际从事本职业或相关职业；不设最低工作年数，须提交工龄及社保证明。年龄按本人实名资料核验，补正沿用首次提交日期。' : compound ? '本路径须取得本职业或相关职业五级证书，取得证书后累计相关工作满3年。' : '本路径须累计本职业或相关职业工作满5年，提交工龄及社保证明。' : '本期仅接受已取得毕业证、本专业或相关专业的申请人。不接受在读证明、学生证或应届替代证明。学历及专业由本次报名初审核验。'}</View>
        <Text className={styles.sectionDesc}>实名 → {employment ? '经历、证书及材料' : '学历与材料'} → 提交支付 → 初审 → 线下报送 → 外审结果</Text>
        {employment ? options?.rule_profile?.related_occupations && <Text className={styles.sectionDesc}>相关职业：{options.rule_profile.related_occupations}</Text> : options?.rule_profile?.related_majors && <Text className={styles.sectionDesc}>本工种相关专业：{options.rule_profile.related_majors}</Text>}
        {options?.rule_profile?.project_limits?.map(item => <Text key={item} className={styles.sectionDesc}>{item}</Text>)}
      </View>
      {application?.latest_rejection_reason && <View className={styles.warning}>
        <Text>补正原因：{application.latest_rejection_reason}</Text>
        <Text className={styles.sectionDesc}>待修改：{application.required_changes?.map(key => CHANGE_LABELS[key] || key).join('、')}</Text>
        <Text className={styles.sectionDesc}>补正截止：{formatDateTime(application.correction_due_at, '请联系管理员设置')}</Text>
        <Text className={styles.sectionDesc}>已支付报名补正后重新初审，复用原订单。</Text>
      </View>}
      {!options && <View className={styles.warning}><Text>{optionsError || '正在加载本批次填报要求…'}</Text>{optionsError && <Button variant='secondary' onClick={() => setRetry(value => value + 1)}>重新加载</Button>}</View>}
      {locked && <View className={styles.warning}>
        <Text>{application?.frozen_at ? '退款处理中，资料已冻结。' : correcting ? '补正期限或批次状态不允许修改，请联系管理员。' : '报名已提交，可在报名详情查看进度、继续支付或取消待支付订单。'}</Text>
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
        <Text className={styles.sectionDesc}>切换路径会清空资格字段，必交材料随当前路径变化；同一职业与等级的不同条件分别核验。</Text>
      </View>}
      {employment && (!levelThree || branch) && <EmploymentFields value={qualification} onChange={setQualification} compound={levelThree ? Boolean(branch?.skill) : compound} levelFive={levelFive} skillGrade={levelThree ? 4 : 5} requiredYears={levelThree ? branch?.years : undefined} showWork={!levelThree || Boolean(branch?.work)} educationRequired={educationRequired} options={options} disabled={locked || Boolean(busy)} />}
      {levelThree && branch?.title && <TitleCertificateFields value={qualification} onChange={setQualification} disabled={locked || Boolean(busy)} />}
      {educationRequired && <View className={styles.card}>
        <Text className={styles.sectionTitle}>毕业学历信息</Text>
        <Text className={styles.sectionDesc}>已有院校、专业可预填，请按毕业证核对；预填不代表资格审核通过。</Text>
        <View className={styles.declaration} onClick={() => { if (!locked && !busy) setGraduated(!graduated) }}><Checkbox value='graduated' checked={graduated} disabled={locked || Boolean(busy)} color='#3366ff' /><Text>本人已取得本次申报学历的毕业证</Text></View>
        <FormInput label='毕业院校' required placeholder='按毕业证填写完整院校名称' value={education.school || ''} disabled={locked || Boolean(busy)} onChange={value => setField('school', value)} maxlength={128} />
        {picker('institution_type', '院校类型', options?.institution_types || [], INSTITUTION_LABELS)}
        {picker('education', '学历层次', options?.education_levels || [], options?.education_labels || EDUCATION_LABELS)}
        <FormInput label='所学专业' required placeholder='按毕业证原文填写，不可自行认定相关专业' value={education.major || ''} disabled={locked || Boolean(busy)} onChange={value => setField('major', value)} maxlength={128} />
        <View className={styles.pickerField}><Text className={styles.label}>毕业日期 *</Text><Picker mode='date' start='1900-01-01' end={chinaDate()} disabled={locked || Boolean(busy)} value={education.graduation_date || ''} onChange={event => setField('graduation_date', event.detail.value)}><View className={styles.readonlyValue}>{education.graduation_date || '请选择毕业日期'} ›</View></Picker></View>
        {levelThree && branch?.id === 'technical_senior' && <View className={styles.pickerField}><Text className={styles.label}>技工院校培养层次 *</Text><Picker mode='selector' range={['高级工班', '预备技师班', '技师班']} disabled={locked || Boolean(busy)} onChange={event => setField('training_level', ['senior_worker', 'preparatory_technician', 'technician'][Number(event.detail.value)])}><View className={styles.readonlyValue}>{education.training_level ? { senior_worker: '高级工班', preparatory_technician: '预备技师班', technician: '技师班' }[education.training_level] : '请选择毕业证对应培养层次'} ›</View></Picker></View>}
        {levelThree && branch?.id === 'evaluated_college' && <FormInput label='院校评估论证依据' required value={education.evaluation_reference || ''} placeholder='填写备案等级认定评价机构相关依据，初审核验' disabled={locked || Boolean(busy)} onChange={value => setField('evaluation_reference', value)} maxlength={256} />}
        <FormInput label='毕业证书编号' required placeholder='按毕业证填写' value={education.certificate_number || ''} disabled={locked || Boolean(busy)} onChange={value => setField('certificate_number', value)} maxlength={128} />
      </View>}
      <View className={styles.card}>
        <Text className={styles.sectionTitle}>模板填报信息</Text>
        <Text className={styles.sectionDesc}>考生来源：社会人员。请填写本人实际情况；职业状态与学历资格分别核验。</Text>
        {reportPicker('occupation_status', '从事职业', options?.occupations || [])}
        {reportPicker('ethnicity', '民族', options?.ethnicities || [])}
        {reportPicker('political_status', '政治面貌', options?.political_statuses || [])}
        <View className={styles.pickerField}><Text className={styles.label}>是否参加过工作 *</Text><Picker mode='selector' range={['参加过工作', '尚未参加工作']} disabled={locked || Boolean(busy)} onChange={event => setReporting(previous => ({ ...previous, has_work_experience: Number(event.detail.value) === 0, work_start_date: Number(event.detail.value) === 0 ? previous.work_start_date : null }))}><View className={styles.readonlyValue}>{reporting.has_work_experience === undefined ? '请选择' : reporting.has_work_experience ? '参加过工作' : '尚未参加工作'} ›</View></Picker></View>
        {reporting.has_work_experience && reportDatePicker('work_start_date', options?.employment_reporting.work_date_required === false ? '参加工作日期（选填）' : '参加工作日期 *')}
        <Text className={styles.sectionDesc}>报送必须填写真实参加工作日期，不能用入学日期、毕业日期替代。尚未参加工作、无法提供该日期的，请联系管理员核实。</Text>
        <FormInput label='实际职业年限（年）' required={options?.employment_reporting.years_rule === 'required'} placeholder='如实填写，可保留两位小数' value={String(reporting.occupation_years ?? '')} disabled={locked || Boolean(busy)} onChange={value => reportField('occupation_years', value)} maxlength={7} />
        <Text className={styles.sectionDesc}>{employment ? '职业年限须满足本路径条件，系统按提交时的实际经历核算；重叠时间不重复累计。' : '参加工作日期可不填，由管理员人工审核；职业年限用于模板报送，不作为学历型报考的工龄门槛。' + (options?.employment_reporting.allow_zero_years ? '尚未参加工作可如实填写0。' : '本批次未确认接受零年限，请联系管理员，不要填写虚假年限。')}</Text>
        <FormInput label='工作单位（选填）' value={reporting.work_unit || ''} placeholder='按实际情况填写' disabled={locked || Boolean(busy)} onChange={value => reportField('work_unit', value)} maxlength={128} />
        <FormInput label='社保参保单位（选填）' value={reporting.social_insurance_unit || ''} placeholder='按实际情况填写' disabled={locked || Boolean(busy)} onChange={value => reportField('social_insurance_unit', value)} maxlength={128} />
        <Text className={styles.sectionDesc}>模板申报条件：{levelThree ? branch?.condition || '请先选择具体申报路径' : options?.application_condition || '加载中'}{!employment && ' 本期报名范围仍仅限已取得毕业证人员。'}</Text>
      </View>
      <View className={styles.card}>
        <Text className={styles.sectionTitle}>联系信息</Text>
        <FormInput label='手机号' required placeholder='接收报名及补正通知' value={phone} maxlength={11} disabled={locked || Boolean(busy)} onChange={setPhone} />
        <FormInput label='邮箱' required placeholder='请输入常用邮箱' value={email} maxlength={128} disabled={locked || Boolean(busy)} onChange={setEmail} />
        <FormInput label='通讯地址' required placeholder='请输入完整通讯地址' value={address} maxlength={256} disabled={locked || Boolean(busy)} onChange={setAddress} />
      </View>
      <View className={styles.card}>
        <Text className={styles.sectionTitle}>报名材料 · 已上传 {uploadedCount}/{uploadRequirements.length} · 实名材料 {requirements.length - uploadRequirements.length} 类</Text>
        <Text className={styles.sectionDesc}>身份证材料复用本人实名资料；其他材料按本批次要求上传，以下文件仅用于本次报名。</Text>
        <View className={styles.warning}>{levelThree ? '材料按当前具体路径必交：技能或职称证书与网查截图合并JPEG；学历网查截图整理为PDF，证书加学历路径须有效学信网备案表（6个月）。仅涉及工作年限的路径要求工龄及社保证明。' : employment ? '工龄证明独立上传；社保证明须为PDF，参保单位和工作单位一致且验证码可验证。证书与完整网查截图须合并为同一张清晰JPEG图片上传，不改扩展名伪装格式。' : requirements.some(item => item.kind === 'registration_portrait') ? '本期仅接受已取得毕业证的申请人。一寸白底近期证件照≤500 KB；毕业证、对应学信网学历备案表及本人签字按手印承诺书必传，学历报告验证有效期设置为6个月。不能提供既定材料请联系管理员。' : '历史批次继续使用原材料清单及格式要求；无法提供材料请联系管理员。'}</View>
        {uploadRequirements.map(item => <View key={item.kind} className={styles.uploadItem}>
          <Text className={styles.sectionTitle}>{item.name} {item.required ? '*' : ''}</Text>
          {item.kind === 'commitment_letter' && <>
            <Text className={styles.sectionDesc}>请打印模板，由本人亲笔签名并按手印后，上传清晰扫描件或照片。此承诺书与信息处理授权协议分别提交。</Text>
            <View className={styles.templateActions}>
              <View className={styles.templateAction}><Button variant='secondary' className={styles.templateButton} loading={busy === 'template-preview'} disabled={Boolean(busy) || !options} onClick={() => void operateTemplate('preview')}>{busy === 'template-preview' ? '正在预览…' : '预览模板'}</Button></View>
              <View className={styles.templateAction}><Button variant='secondary' className={styles.templateButton} loading={busy === 'template-send'} disabled={Boolean(busy) || !options || !fileShareSupported} onClick={() => void operateTemplate('send')}>{busy === 'template-send' ? '正在发送…' : '发送到微信'}</Button></View>
            </View>
            <Text className={styles.sectionDesc}>{fileShareSupported ? '可发送给文件传输助手或打印店。文件保存方式以当前微信及系统支持为准。' : TEMPLATE_SHARE_UNSUPPORTED}</Text>
          </>}
          <Text className={styles.sectionDesc}>{item.extensions.join(' / ')} · {item.kind === 'registration_portrait' ? '一寸、白底、近期、≤500 KB' : '图片≤10 MB，PDF≤20 MB'}</Text>
          {materials[item.kind] && <Text className={styles.fileName}>已上传：{materials[item.kind].original_filename} · {Math.ceil(materials[item.kind].size_bytes / 1024)} KB</Text>}
          <Button variant='secondary' disabled={locked || Boolean(busy) || !identityReady || !options} onClick={() => void upload(item.kind, item.extensions)}>{busy === item.kind ? '上传中…' : materials[item.kind] ? '替换材料' : item.kind === 'commitment_letter' ? '上传已签署承诺书' : '上传材料'}</Button>
        </View>)}
      </View>
      <View className={styles.card}><Text className={styles.sectionTitle}>协议、费用与提交</Text><Text className={styles.sectionDesc}>报名费 ¥{(plan.price_cents / 100).toFixed(2)}。提交前需签署认证报名信息处理授权协议。补正保存独立版本，保留历史记录。</Text>{error && <View className={styles.warning}>{error}</View>}</View>
    </ScrollView>
    <View className={styles.fixedFooter}>{error && <View className={styles.warning}>{error}</View>}<Button variant='gradient' size='lg' className={styles.primaryButton} disabled={locked || Boolean(busy) || !identityReady || !options} onClick={() => void submit()}>{busy === 'submit' ? '提交中…' : correcting ? '提交补正 · 无需重复支付' : `提交并支付 ¥${(plan.price_cents / 100).toFixed(2)}`}</Button></View>
  </View></AuthGuard>
}
