import { useState, useCallback, useEffect } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { usePhoneDecrypt } from '@/hooks/usePhoneDecrypt'
import { STRINGS } from '@/constants/strings'
import { getCertDetail, uploadFile, createOrder, getUserProfile } from '@/services/dataService'
import type { CertificationDetail } from '@/types'
import { validateName, validatePhone, validateIdCard, validateEmail, validateRequired } from '@/utils/validator'
import type { ValidationResult } from '@/utils/validator'
import { autoPinyin } from '@/utils/pinyin'
import {
  IdentityCheckGate, CertSummaryCard, BaseInfoSection, PriceSummary,
  H3CExtraSection, SangforExtraSection, NispExtraSection, RensheExtraSection,
} from './components'
import styles from './form.module.scss'

// ================================================================
// 统一的认证报名表单页面
// 根据 cert.vendor 自动渲染对应厂商的专有字段
// ================================================================

export default function RegistrationFormPage() {
  // ---- 路由参数 ----
  const [certId, setCertId] = useState('')
  const [cert, setCert] = useState<CertificationDetail | null>(null)

  useLoad((options) => {
    setCertId(options?.cert_id || '')
  })

  useEffect(() => {
    const id = Number(certId)
    if (!id) return
    getCertDetail(id).then(setCert).catch(() => {})
  }, [certId])

  // ---- 手机号解密 ----
  const { decrypting, handleGetPhoneNumber } = usePhoneDecrypt()

  // ============================================================
  // 基础信息 — 所有认证类型共用
  // ============================================================
  const [realName, setRealName] = useState('')
  const [phone, setPhone] = useState('')
  const [idCard, setIdCard] = useState('')

  // ============================================================
  // H3C 专有字段
  // ============================================================
  const [identityType, setIdentityType] = useState<'personal' | 'enterprise'>('personal')
  const [email, setEmail] = useState('')
  const [idPhotoPath, setIdPhotoPath] = useState('')
  const [h3cEducation, setH3cEducation] = useState('')
  const [h3cOrg, setH3cOrg] = useState('')
  const [h3cExamDate, setH3cExamDate] = useState('')
  const [h3cGender, setH3cGender] = useState('')
  const [h3cCountry, setH3cCountry] = useState('')
  const [h3cLanguage, setH3cLanguage] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')

  // ============================================================
  // 深信服 专有字段
  // ============================================================
  const [mailingAddress, setMailingAddress] = useState('')
  const [sangforOrg, setSangforOrg] = useState('')
  const [examDirection, setExamDirection] = useState('')
  const [verifyCode, setVerifyCode] = useState('')
  const [sangforExamDate, setSangforExamDate] = useState('')

  // ============================================================
  // NISP 专有字段
  // ============================================================
  const [nispEmail, setNispEmail] = useState('')
  const [school, setSchool] = useState('')
  const [major, setMajor] = useState('')
  const [province, setProvince] = useState('')
  const [level, setLevel] = useState<'1' | '2'>('1')
  const [nispGender, setNispGender] = useState<'male' | 'female'>('male')
  const [age, setAge] = useState('')
  const [nispEducation, setNispEducation] = useState('')
  const [address, setAddress] = useState('')
  const [zipCode, setZipCode] = useState('')
  const [portraitPhotoPath, setPortraitPhotoPath] = useState('')
  const [nispIdPhotoPath, setNispIdPhotoPath] = useState('')
  const [xuexinReportPath, setXuexinReportPath] = useState('')
  const [templatePath, setTemplatePath] = useState('')

  // ============================================================
  // 人社 专有字段
  // ============================================================
  const [branch, setBranch] = useState('')

  // ============================================================
  // 通用状态
  // ============================================================
  const [errors, setErrors] = useState<Record<string, ValidationResult>>({})

  // ---- 用户资料预填 ----
  useEffect(() => {
    getUserProfile().then(profile => {
      if (profile.profile.phone && !phone) setPhone(profile.profile.phone)
      if (profile.realname.real_name && !realName) setRealName(profile.realname.real_name)
      if (profile.realname.user_type === 'enterprise') setIdentityType('enterprise')
      if (!cert) return
      switch (cert.vendor) {
        case 'H3C':
          if (profile.profile.email && !email) setEmail(profile.profile.email)
          break
        case '深信服':
          if (profile.profile.email && !email) setEmail(profile.profile.email)
          break
        case 'NISP':
          if (profile.profile.email && !nispEmail) setNispEmail(profile.profile.email)
          if (profile.student?.school && !school) setSchool(profile.student.school)
          if (profile.student?.major && !major) setMajor(profile.student.major)
          break
      }
    }).catch(() => {})
  }, [cert])

  // ============================================================
  // 文件上传
  // ============================================================
  const handleUpload = useCallback((setter: (v: string) => void) => {
    Taro.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
    }).then(res => {
      uploadFile(res.tempFilePaths[0]).then(({ url }) => setter(url))
    }).catch(() => {})
  }, [])

  const handleChooseIdPhoto = useCallback(() => {
    handleUpload(setIdPhotoPath)
  }, [handleUpload])

  const handlePickExamDate = useCallback(() => {
    Taro.showToast({ title: STRINGS.FORM_PICK_EXAM_DATE, icon: 'none' })
  }, [])

  // ============================================================
  // 校验 — 基础 + 厂商差异化
  // ============================================================
  const handleValidate = useCallback(() => {
    const next: Record<string, ValidationResult> = {
      realName: validateName(realName),
      phone: validatePhone(phone),
      idCard: validateIdCard(idCard),
    }

    if (!cert) return false

    switch (cert.vendor) {
      case 'H3C':
        if (email.trim()) next.email = validateEmail(email)
        break
      case '深信服':
        next.mailingAddress = validateRequired(mailingAddress, STRINGS.FORM_MAILING_ADDRESS)
        next.organization = validateRequired(sangforOrg, STRINGS.FORM_ORGANIZATION)
        next.examDirection = validateRequired(examDirection, STRINGS.FORM_EXAM_DIRECTION)
        next.verifyCode = validateRequired(verifyCode, STRINGS.FORM_VERIFICATION_CODE)
        if (email.trim()) next.email = validateEmail(email)
        break
      case 'NISP':
        next.email = validateEmail(nispEmail)
        next.school = validateRequired(school, STRINGS.FORM_SCHOOL)
        next.major = validateRequired(major, STRINGS.FORM_MAJOR)
        next.province = validateRequired(province, STRINGS.FORM_PROVINCE)
        break
      case '人社':
        if (!branch.trim()) next.branch = { valid: false, message: STRINGS.FORM_RENSHE_BRANCH_PLACEHOLDER }
        break
    }

    setErrors(next)
    return Object.values(next).every(v => v.valid)
  }, [realName, phone, idCard, cert, email, mailingAddress, sangforOrg, examDirection, verifyCode,
      nispEmail, school, major, province, branch])

  // ============================================================
  // 提交
  // ============================================================
  const handleSubmit = async () => {
    if (!cert || !handleValidate()) return

    const base = {
      cert_type: cert.code,
      candidate_name: realName.trim(),
      candidate_phone: phone.trim(),
      candidate_idcard: idCard.trim(),
    }
    let extra_data: Record<string, unknown> = {}
    let attachments: string[] = []

    switch (cert.vendor) {
      case 'H3C':
        extra_data = {
          email: email.trim(), education: h3cEducation.trim(),
          organization: h3cOrg.trim(), exam_date: h3cExamDate,
          gender: h3cGender || undefined, country: h3cCountry || undefined,
          language: h3cLanguage || undefined,
          first_name: firstName.trim() || undefined, last_name: lastName.trim() || undefined,
          identity_type: identityType,
        }
        attachments = [idPhotoPath].filter(Boolean)
        break
      case '深信服':
        extra_data = {
          mailing_address: mailingAddress.trim(), organization: sangforOrg.trim(),
          exam_direction: examDirection, verification_code: verifyCode.trim(),
          exam_date: sangforExamDate || undefined,
          email: email.trim() || undefined,
          first_name: firstName.trim() || undefined, last_name: lastName.trim() || undefined,
        }
        break
      case 'NISP':
        extra_data = {
          name: realName.trim(), pinyin: autoPinyin(realName),
          email: nispEmail.trim(), school: school.trim(), major: major.trim(),
          province: province.trim(), level,
          gender: level === '2' ? nispGender : undefined,
          age: level === '2' ? age : undefined,
          education: level === '2' ? nispEducation : undefined,
          address: level === '2' ? address : undefined,
          zip_code: level === '2' ? zipCode : undefined,
        }
        attachments = [portraitPhotoPath, nispIdPhotoPath, xuexinReportPath, templatePath].filter(Boolean)
        break
      case '人社':
        extra_data = { branch }
        break
    }

    const order = await createOrder({ ...base, extra_data, attachments })
    Taro.navigateTo({ url: `/pages/registration/confirm?order_id=${order.order_id}` })
  }

  // ============================================================
  // NISP 模板下载
  // ============================================================
  const handleDownloadTemplate = useCallback(() => {
    Taro.downloadFile({ url: '/api/nisp/template/download' })
      .then(() => Taro.showToast({ title: '模板下载成功', icon: 'success' }))
      .catch(() => Taro.showToast({ title: '下载失败，请稍后重试', icon: 'none' }))
  }, [])

  const handleNispUpload = useCallback((target: 'portrait' | 'idPhoto' | 'xuexin' | 'template') => {
    const setters: Record<string, (v: string) => void> = {
      portrait: setPortraitPhotoPath,
      idPhoto: setNispIdPhotoPath,
      xuexin: setXuexinReportPath,
      template: setTemplatePath,
    }
    handleUpload(setters[target])
  }, [handleUpload])

  // ============================================================
  // 渲染
  // ============================================================
  if (!cert) {
    return (
      <AuthGuard>
        <View className={styles.page}>
          <PageHeader title={STRINGS.FORM_TITLE} shouldShowBack />
          <View className={styles.empty}><Text>{STRINGS.FORM_ERROR_CERT_NOT_FOUND}</Text></View>
        </View>
      </AuthGuard>
    )
  }

  const title = {
    'H3C': STRINGS.FORM_TITLE,
    '深信服': STRINGS.SANGFOR_FORM_TITLE,
    'NISP': STRINGS.NISP_FORM_TITLE,
    '人社': STRINGS.RENSHE_FORM_TITLE,
  }[cert.vendor] || STRINGS.FORM_TITLE

  return (
    <IdentityCheckGate>
      <AuthGuard>
        <View className={styles.page}>
          <PageHeader title={title} shouldShowBack />
          <ScrollView className={styles.body} scrollY>

            {/* 认证摘要 */}
            <CertSummaryCard cert={cert} />

            {/* 人社：分支选择放在基础信息前 */}
            {cert.vendor === '人社' && (
              <RensheExtraSection branch={branch} setBranch={setBranch} errors={errors} />
            )}

            {/* 基础信息（共用的姓名/手机/身份证） */}
            <BaseInfoSection
              realName={realName} setRealName={setRealName}
              phone={phone} setPhone={setPhone}
              idCard={idCard} setIdCard={setIdCard}
              errors={errors}
              decrypting={decrypting} handleGetPhoneNumber={handleGetPhoneNumber}
              afterRealName={
                cert.vendor === 'H3C' ? (
                  <H3CExtraSection
                    identityType={identityType} setIdentityType={setIdentityType}
                    email={email} setEmail={setEmail}
                    idPhotoPath={idPhotoPath}
                    education={h3cEducation} setEducation={setH3cEducation}
                    organization={h3cOrg} setOrganization={setH3cOrg}
                    examDate={h3cExamDate}
                    gender={h3cGender} setGender={setH3cGender}
                    country={h3cCountry} setCountry={setH3cCountry}
                    language={h3cLanguage} setLanguage={setH3cLanguage}
                    firstName={firstName} setFirstName={setFirstName}
                    lastName={lastName} setLastName={setLastName}
                    errors={errors}
                    onChooseIdPhoto={handleChooseIdPhoto}
                    onPickExamDate={handlePickExamDate}
                  />
                ) : undefined
              }
            />

            {/* 深信服 */}
            {cert.vendor === '深信服' && (
              <SangforExtraSection
                mailingAddress={mailingAddress} setMailingAddress={setMailingAddress}
                organization={sangforOrg} setOrganization={setSangforOrg}
                examDirection={examDirection} setExamDirection={setExamDirection}
                verifyCode={verifyCode} setVerifyCode={setVerifyCode}
                examDate={sangforExamDate} setExamDate={setSangforExamDate}
                email={email} setEmail={setEmail}
                firstName={firstName} setFirstName={setFirstName}
                lastName={lastName} setLastName={setLastName}
                errors={errors}
              />
            )}

            {/* NISP */}
            {cert.vendor === 'NISP' && (
              <NispExtraSection
                email={nispEmail} setEmail={setNispEmail}
                school={school} setSchool={setSchool}
                major={major} setMajor={setMajor}
                province={province} setProvince={setProvince}
                level={level} setLevel={setLevel}
                gender={nispGender} setGender={setNispGender}
                age={age} setAge={setAge}
                education={nispEducation} setEducation={setNispEducation}
                address={address} setAddress={setAddress}
                zipCode={zipCode} setZipCode={setZipCode}
                pinyin={autoPinyin(realName)}
                trainingType={(cert as any).categoryName || ''}
                portraitPhotoPath={portraitPhotoPath}
                idPhotoPath={nispIdPhotoPath}
                xuexinReportPath={xuexinReportPath}
                templatePath={templatePath}
                errors={errors}
                onUpload={handleNispUpload}
                onDownloadTemplate={handleDownloadTemplate}
              />
            )}

            {/* 价格 + 提交 */}
            <PriceSummary price={cert.price} onSubmit={handleSubmit} />

          </ScrollView>
        </View>
      </AuthGuard>
    </IdentityCheckGate>
  )
}
