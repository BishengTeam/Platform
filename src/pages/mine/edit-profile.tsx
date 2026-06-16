import { useState, useEffect } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { FormInput } from '@/components/FormInput'
import { Button } from '@/components/Button'
import { Icon } from '@/components/Icon'
import { STRINGS } from '@/constants/strings'
import {
  getUserProfile, updateUserProfile,
  submitIdentity, updateIdentity,
  submitStudent, updateStudent,
  submitEnterprise, updateEnterprise,
  uploadFile,
} from '@/services/dataService'
import type { UserProfileAggregated, UserRealnameL2, UserStudentL2, UserEnterpriseL2 } from '@/types/profile'
import { validateIdCard, validateName } from '@/utils/validator'
import styles from './edit-profile.module.scss'

const idMap = STRINGS.IDENTITY_STATUS_MAP
const MAX_LEVEL2_EDITS = 5

type IdentityStatus = 'pending' | 'verified' | 'rejected' | null

/** 状态 → UI 配置 */
function statusConfig(s: IdentityStatus) {
  if (s === 'verified') return { label: idMap.verified || '已认证', color: '#52C41A', disabled: false }
  if (s === 'rejected') return { label: idMap.rejected || '已驳回', color: '#FF4D4F', disabled: false }
  if (s === 'pending') return { label: idMap.pending || '审核中', color: '#FA8C16', disabled: true }
  return { label: '未认证', color: '#999', disabled: false }
}

export default function EditProfilePage() {
  const [profile, setProfile] = useState<UserProfileAggregated | null>(null)
  const [loading, setLoading] = useState(true)

  // ---- Level 1 ----
  const [nickname, setNickname] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  // ---- Level 2 实名 ----
  const [userType, setUserType] = useState<'student' | 'enterprise'>('student')
  const [realName, setRealName] = useState('')
  const [idCardNumber, setIdCardNumber] = useState('')
  const [idCardFrontOss, setIdCardFrontOss] = useState<string | null>(null)
  const [idCardBackOss, setIdCardBackOss] = useState<string | null>(null)
  /** 本地临时文件（用户新选图片，提交时上传） */
  const [idCardFrontFile, setIdCardFrontFile] = useState<string | null>(null)
  const [idCardBackFile, setIdCardBackFile] = useState<string | null>(null)

  // ---- Level 2 学生 ----
  const [education, setEducation] = useState('')
  const [school, setSchool] = useState('')
  const [major, setMajor] = useState('')
  const [studentCardOss, setStudentCardOss] = useState<string | null>(null)
  const [studentCardFile, setStudentCardFile] = useState<string | null>(null)

  // ---- Level 2 企业 ----
  const [organization, setOrganization] = useState('')

  // ---- 提交状态 ----
  const [savingL1, setSavingL1] = useState(false)
  const [savingIdentity, setSavingIdentity] = useState(false)
  const [savingStudent, setSavingStudent] = useState(false)
  const [savingEnterprise, setSavingEnterprise] = useState(false)

  // ---- L2 编辑次数 ----
  const [level2EditCount, setLevel2EditCount] = useState(0)
  const isL2Exhausted = level2EditCount >= MAX_LEVEL2_EDITS

  // ================================================================
  // 初始化
  // ================================================================
  useEffect(() => {
    getUserProfile().then(p => {
      setProfile(p)
      // L1
      setNickname(p.profile.nickname || '')
      setEmail(p.profile.email || '')
      setPhone(p.profile.phone || '')
      // L2 实名
      if (p.realname) {
        setUserType(p.realname.user_type === 'enterprise' ? 'enterprise' : 'student')
        setRealName(p.realname.real_name || '')
        setIdCardNumber(idCardForEdit(p.realname))
        setIdCardFrontOss(p.realname.id_card_front_oss)
        setIdCardBackOss(p.realname.id_card_back_oss)
        // 学生 / 企业
        if (p.student) {
          setEducation(p.student.education || '')
          setSchool(p.student.school || '')
          setMajor(p.student.major || '')
          setStudentCardOss(p.student.student_card_oss)
        }
        if (p.enterprise) {
          setOrganization(p.enterprise.organization || '')
        }
      }
      setLevel2EditCount(p.level2_edit_count)
    }).catch(() => {
      Taro.showToast({ title: '加载失败', icon: 'none' })
    }).finally(() => setLoading(false))
  }, [])

  if (loading || !profile) return null

  const { realname, student, enterprise } = profile
  const identityStatus: IdentityStatus = (realname?.identity_status as IdentityStatus) ?? null
  const studentStatus: IdentityStatus = (student?.student_status as IdentityStatus) ?? null
  const enterpriseStatus: IdentityStatus = (enterprise?.enterprise_status as IdentityStatus) ?? null

  const identityCfg = statusConfig(identityStatus)
  const studentCfg = statusConfig(studentStatus)
  const enterpriseCfg = statusConfig(enterpriseStatus)

  // ================================================================
  // Level 1 保存
  // ================================================================
  const handleSaveL1 = async () => {
    setSavingL1(true)
    try {
      await updateUserProfile({
        nickname: nickname.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
      })
      Taro.showToast({ title: '基础资料已保存', icon: 'success' })
    } catch {
      Taro.showToast({ title: '保存失败', icon: 'none' })
    } finally {
      setSavingL1(false)
    }
  }

  // ================================================================
  // 图片上传
  // ================================================================
  /** 选择本地图片（不上传服务器），存临时路径，提交时统一上传 */
  const handlePickImage = async (setFile: (v: string) => void, label: string) => {
    try {
      const res = await Taro.chooseImage({ count: 1, sizeType: ['compressed'] })
      if (!res.tempFilePaths?.length) return
      setFile(res.tempFilePaths[0])
      Taro.showToast({ title: `${label}已选择`, icon: 'success' })
    } catch (err: any) {
      if (err?.errMsg?.includes('cancel')) return
      Taro.showToast({ title: '选择失败', icon: 'none' })
    }
  }

  // ================================================================
  // Level 2 提交：实名认证
  // ================================================================
  const handleSubmitIdentity = async () => {
    if (!realName.trim()) return Taro.showToast({ title: '请输入真实姓名', icon: 'none' })
    if (!idCardNumber.trim()) return Taro.showToast({ title: '请输入身份证号', icon: 'none' })
    const v = validateIdCard(idCardNumber)
    if (!v.valid) return Taro.showToast({ title: v.message, icon: 'none' })
    const vn = validateName(realName)
    if (!vn.valid) return Taro.showToast({ title: vn.message, icon: 'none' })
    // 上传本地图片（如果有新选的），否则用已有 OSS key
    let frontOss = idCardFrontOss
    let backOss = idCardBackOss
    try {
      if (idCardFrontFile) { Taro.showLoading({ title: '上传正面...' }); const r = await uploadFile(idCardFrontFile); frontOss = r.url; Taro.hideLoading() }
      if (idCardBackFile) { Taro.showLoading({ title: '上传反面...' }); const r = await uploadFile(idCardBackFile); backOss = r.url; Taro.hideLoading() }
    } catch {
      Taro.hideLoading()
      Taro.showToast({ title: '图片上传失败，请重试', icon: 'none' })
      return
    }
    if (!frontOss) return Taro.showToast({ title: '请上传身份证正面照片', icon: 'none' })
    if (!backOss) return Taro.showToast({ title: '请上传身份证反面照片', icon: 'none' })

    setSavingIdentity(true)
    const payload = {
      user_type: userType,
      real_name: realName.trim(),
      id_card_number: idCardNumber.trim(),
      id_card_front_oss: frontOss,
      id_card_back_oss: backOss,
    }
    try {
      if (realname && identityStatus !== null) {
        await updateIdentity(payload)
      } else {
        await submitIdentity(payload)
      }
      Taro.showToast({ title: '实名信息已提交，等待审核', icon: 'success' })
      reloadProfile()
    } catch {
      Taro.showToast({ title: '提交失败', icon: 'none' })
    } finally {
      setSavingIdentity(false)
    }
  }

  // ================================================================
  // Level 2 提交：学生信息
  // ================================================================
  const handleSubmitStudent = async () => {
    if (!education.trim() || !school.trim() || !major.trim()) {
      return Taro.showToast({ title: '请完整填写学历/学校/专业', icon: 'none' })
    }
    // 上传学生证（如果有新选的）
    let cardOss = studentCardOss
    try {
      if (studentCardFile) { Taro.showLoading({ title: '上传学生证...' }); const r = await uploadFile(studentCardFile); cardOss = r.url; Taro.hideLoading() }
    } catch {
      Taro.hideLoading()
      Taro.showToast({ title: '图片上传失败，请重试', icon: 'none' })
      return
    }
    setSavingStudent(true)
    const payload = {
      education: education.trim(),
      school: school.trim(),
      major: major.trim(),
      student_card_oss: cardOss || undefined,
    }
    try {
      if (student && studentStatus !== null) {
        await updateStudent(payload)
      } else {
        await submitStudent(payload)
      }
      Taro.showToast({ title: '学生信息已提交，等待审核', icon: 'success' })
      reloadProfile()
    } catch {
      Taro.showToast({ title: '提交失败', icon: 'none' })
    } finally {
      setSavingStudent(false)
    }
  }

  // ================================================================
  // Level 2 提交：企业信息
  // ================================================================
  const handleSubmitEnterprise = async () => {
    if (!organization.trim()) return Taro.showToast({ title: '请输入单位名称', icon: 'none' })
    setSavingEnterprise(true)
    const payload = { organization: organization.trim() }
    try {
      if (enterprise && enterpriseStatus !== null) {
        await updateEnterprise(payload)
      } else {
        await submitEnterprise(payload)
      }
      Taro.showToast({ title: '企业信息已提交，等待审核', icon: 'success' })
      reloadProfile()
    } catch {
      Taro.showToast({ title: '提交失败', icon: 'none' })
    } finally {
      setSavingEnterprise(false)
    }
  }

  const reloadProfile = () => {
    getUserProfile().then(p => {
      setProfile(p)
      setLevel2EditCount(p.level2_edit_count)
    }).catch(() => {})
  }

  // ================================================================
  // 渲染
  // ================================================================
  const isIdentityDisabled = identityCfg.disabled || isL2Exhausted
  const isStudentDisabled = studentCfg.disabled || isL2Exhausted
  const isEnterpriseDisabled = enterpriseCfg.disabled || isL2Exhausted
  const l2Tip = isL2Exhausted
    ? STRINGS.MINE_LEVEL2_EDIT_EXHAUSTED.replace('{max}', String(MAX_LEVEL2_EDITS)).replace('{days}', '--')
    : `本月还可修改 ${MAX_LEVEL2_EDITS - level2EditCount} 次（共 ${MAX_LEVEL2_EDITS} 次）  |  ${STRINGS.MINE_PROFILE_EDIT_TIP}`

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.MINE_EDIT_PROFILE_TITLE} shouldShowBack />
        <ScrollView className={styles.body} scrollY>

          {/* ================================================================ */}
          {/* Level 1 — 基础资料 */}
          {/* ================================================================ */}
          <View className={styles.section}>
            <Text className={styles.sectionTitle}>基础资料</Text>
            <FormInput label='昵称' placeholder='请输入昵称' value={nickname} onChange={setNickname} />
            <FormInput label={STRINGS.FORM_EMAIL} placeholder={STRINGS.FORM_EMAIL_PLACEHOLDER} value={email} onChange={setEmail} />
            <FormInput label={STRINGS.FORM_PHONE} placeholder='手机号通过微信授权获取' value={phone} disabled />
            <View className={styles.btnWrap}>
              <Button variant='gradient' size='lg' onClick={handleSaveL1} loading={savingL1}>
                保存基础资料
              </Button>
            </View>
          </View>

          {/* ================================================================ */}
          {/* Level 2 — 实名认证 */}
          {/* ================================================================ */}
          <View className={styles.section}>
            <View className={styles.sectionHead}>
              <Text className={styles.sectionTitle}>实名认证</Text>
              <Text className={styles.statusBadge} style={{ color: identityCfg.color }}>
                {identityCfg.label}
              </Text>
            </View>

            {/* 用户类型 */}
            <View className={styles.userTypeRow}>
              <Text className={styles.fieldLabel}>用户类型</Text>
              <View className={styles.userTypeOptions}>
                <View
                  className={`${styles.userTypeOption} ${userType === 'student' ? styles.userTypeActive : ''}`}
                  onClick={() => !isIdentityDisabled && setUserType('student')}
                >
                  <Text>学生</Text>
                </View>
                <View
                  className={`${styles.userTypeOption} ${userType === 'enterprise' ? styles.userTypeActive : ''}`}
                  onClick={() => !isIdentityDisabled && setUserType('enterprise')}
                >
                  <Text>企业</Text>
                </View>
              </View>
            </View>

            <FormInput label={STRINGS.FORM_REAL_NAME} placeholder='请输入真实姓名' value={realName} onChange={setRealName} disabled={isIdentityDisabled} />
            <FormInput label='身份证号' placeholder='请输入 18 位身份证号' value={idCardNumber} onChange={setIdCardNumber} type='idcard' maxlength={18} disabled={isIdentityDisabled} />

            {/* 后端推导字段（只读展示） */}
            {realname && (
              <View className={styles.derivedRow}>
                <Text className={styles.derivedText}>性别：{realname.gender || '-'}</Text>
                <Text className={styles.derivedText}>年龄：{realname.age != null ? `${realname.age} 岁` : '-'}</Text>
                <Text className={styles.derivedText}>户籍：{realname.census_register || '-'}</Text>
              </View>
            )}

            {/* 身份证照片 */}
            <View className={styles.uploadRow}>
              <Text className={styles.fieldLabel}>身份证正面</Text>
              <Button size='sm' variant='secondary' onClick={() => handlePickImage(setIdCardFrontFile, '正面')} disabled={isIdentityDisabled}>
                {(idCardFrontFile || idCardFrontOss) ? '已选择 ✓' : '选择'}
              </Button>
            </View>
            <View className={styles.uploadRow}>
              <Text className={styles.fieldLabel}>身份证反面</Text>
              <Button size='sm' variant='secondary' onClick={() => handlePickImage(setIdCardBackFile, '反面')} disabled={isIdentityDisabled}>
                {(idCardBackFile || idCardBackOss) ? '已选择 ✓' : '选择'}
              </Button>
            </View>

            <View className={styles.btnWrap}>
              <Button variant='gradient' size='lg' onClick={handleSubmitIdentity} loading={savingIdentity} disabled={isIdentityDisabled}>
                {identityStatus === 'rejected' ? '重新提交实名认证' : identityStatus === 'verified' ? '修改实名信息' : '提交实名认证'}
              </Button>
            </View>
          </View>

          {/* ================================================================ */}
          {/* Level 2 — 学生信息（user_type=student） */}
          {/* ================================================================ */}
          {userType === 'student' && (
            <View className={styles.section}>
              <View className={styles.sectionHead}>
                <Text className={styles.sectionTitle}>学生信息</Text>
                {student && (
                  <Text className={styles.statusBadge} style={{ color: studentCfg.color }}>
                    {studentCfg.label}
                  </Text>
                )}
              </View>
              <FormInput label='学历' placeholder='如 本科' value={education} onChange={setEducation} disabled={isStudentDisabled} />
              <FormInput label='学校' placeholder='请输入学校全称' value={school} onChange={setSchool} disabled={isStudentDisabled} />
              <FormInput label='专业' placeholder='请输入专业名称' value={major} onChange={setMajor} disabled={isStudentDisabled} />
              <View className={styles.uploadRow}>
                <Text className={styles.fieldLabel}>学生证</Text>
                <Button size='sm' variant='secondary' onClick={() => handlePickImage(setStudentCardFile, '学生证')} disabled={isStudentDisabled}>
                  {(studentCardFile || studentCardOss) ? '已选择 ✓' : '选择'}
                </Button>
              </View>
              <View className={styles.btnWrap}>
                <Button variant='gradient' size='lg' onClick={handleSubmitStudent} loading={savingStudent} disabled={isStudentDisabled}>
                  {studentStatus === 'rejected' ? '重新提交学生信息' : studentStatus === 'verified' ? '修改学生信息' : '提交学生信息'}
                </Button>
              </View>
            </View>
          )}

          {/* ================================================================ */}
          {/* Level 2 — 企业信息（user_type=enterprise） */}
          {/* ================================================================ */}
          {userType === 'enterprise' && (
            <View className={styles.section}>
              <View className={styles.sectionHead}>
                <Text className={styles.sectionTitle}>企业信息</Text>
                {enterprise && (
                  <Text className={styles.statusBadge} style={{ color: enterpriseCfg.color }}>
                    {enterpriseCfg.label}
                  </Text>
                )}
              </View>
              <FormInput label='单位名称' placeholder='请输入单位全称' value={organization} onChange={setOrganization} disabled={isEnterpriseDisabled} />
              <View className={styles.btnWrap}>
                <Button variant='gradient' size='lg' onClick={handleSubmitEnterprise} loading={savingEnterprise} disabled={isEnterpriseDisabled}>
                  {enterpriseStatus === 'rejected' ? '重新提交企业信息' : enterpriseStatus === 'verified' ? '修改企业信息' : '提交企业信息'}
                </Button>
              </View>
            </View>
          )}

          {/* ================================================================ */}
          {/* 修改次数提示 */}
          {/* ================================================================ */}
          <View className={styles.quotaBanner}>
            <Icon name='info' size={20} color='#1677FF' />
            <Text className={styles.quotaText}>{l2Tip}</Text>
          </View>

        </ScrollView>
      </View>
    </AuthGuard>
  )
}

/** 编辑模式下优先展示明文，否则展示脱敏 */
function idCardForEdit(r: UserRealnameL2): string {
  return r.id_card_raw || r.id_card || ''
}
