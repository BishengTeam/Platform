import { useState, useEffect, useMemo } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { FormInput } from '@/components/FormInput'
import { FormPicker } from '@/components/FormPicker'
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
import { validateIdCard } from '@/utils/validator'
import styles from './edit-profile.module.scss'

// ---- 省/市选项数据（前端静态常量） ----
const REGION_MAP: Record<string, string[]> = {
  '北京': ['东城区', '西城区', '朝阳区', '海淀区', '丰台区', '石景山区', '通州区', '大兴区', '顺义区', '昌平区'],
  '上海': ['黄浦区', '徐汇区', '长宁区', '静安区', '普陀区', '虹口区', '浦东新区', '闵行区', '宝山区', '嘉定区'],
  '天津': ['和平区', '河东区', '河西区', '南开区', '河北区', '红桥区', '滨海新区', '东丽区', '西青区', '北辰区'],
  '重庆': ['渝中区', '江北区', '沙坪坝区', '九龙坡区', '南岸区', '渝北区', '巴南区', '北碚区', '万州区', '涪陵区'],
  '广东': ['广州', '深圳', '珠海', '东莞', '佛山', '中山', '惠州', '汕头', '江门', '湛江'],
  '浙江': ['杭州', '宁波', '温州', '嘉兴', '湖州', '绍兴', '金华', '台州', '丽水', '衢州'],
  '江苏': ['南京', '苏州', '无锡', '常州', '南通', '徐州', '扬州', '镇江', '盐城', '泰州'],
  '山东': ['济南', '青岛', '烟台', '潍坊', '威海', '淄博', '临沂', '济宁', '泰安', '日照'],
  '四川': ['成都', '绵阳', '德阳', '宜宾', '南充', '泸州', '乐山', '达州', '广元', '眉山'],
  '湖北': ['武汉', '宜昌', '襄阳', '荆州', '黄石', '十堰', '鄂州', '荆门', '孝感', '黄冈'],
  '湖南': ['长沙', '株洲', '湘潭', '衡阳', '岳阳', '常德', '郴州', '益阳', '娄底', '邵阳'],
  '河南': ['郑州', '洛阳', '开封', '南阳', '许昌', '新乡', '安阳', '焦作', '平顶山', '信阳'],
  '河北': ['石家庄', '唐山', '保定', '邯郸', '秦皇岛', '廊坊', '沧州', '邢台', '张家口', '承德'],
  '福建': ['福州', '厦门', '泉州', '漳州', '龙岩', '三明', '莆田', '南平', '宁德'],
  '安徽': ['合肥', '芜湖', '蚌埠', '马鞍山', '安庆', '淮南', '阜阳', '滁州', '六安', '亳州'],
  '辽宁': ['沈阳', '大连', '鞍山', '抚顺', '本溪', '丹东', '锦州', '营口', '盘锦', '葫芦岛'],
  '陕西': ['西安', '咸阳', '宝鸡', '渭南', '汉中', '榆林', '延安', '安康', '商洛', '铜川'],
  '江西': ['南昌', '九江', '赣州', '景德镇', '萍乡', '新余', '鹰潭', '宜春', '上饶', '吉安'],
  '云南': ['昆明', '曲靖', '玉溪', '大理', '丽江', '红河', '楚雄', '昭通', '保山', '普洱'],
  '贵州': ['贵阳', '遵义', '毕节', '六盘水', '安顺', '铜仁', '黔东南', '黔南', '黔西南'],
  '广西': ['南宁', '柳州', '桂林', '梧州', '北海', '玉林', '贵港', '钦州', '百色', '河池'],
  '山西': ['太原', '大同', '阳泉', '长治', '晋城', '朔州', '晋中', '运城', '忻州', '临汾'],
  '吉林': ['长春', '吉林', '四平', '辽源', '通化', '白山', '松原', '白城', '延边'],
  '黑龙江': ['哈尔滨', '齐齐哈尔', '牡丹江', '佳木斯', '大庆', '鸡西', '鹤岗', '双鸭山', '伊春', '绥化'],
  '内蒙古': ['呼和浩特', '包头', '鄂尔多斯', '赤峰', '通辽', '呼伦贝尔', '乌兰察布', '巴彦淖尔', '乌海'],
  '甘肃': ['兰州', '天水', '白银', '武威', '张掖', '酒泉', '平凉', '庆阳', '定西', '陇南'],
  '新疆': ['乌鲁木齐', '克拉玛依', '吐鲁番', '哈密', '昌吉', '石河子', '伊犁', '喀什', '阿克苏'],
  '海南': ['海口', '三亚', '儋州', '三沙', '琼海', '文昌', '万宁'],
  '宁夏': ['银川', '石嘴山', '吴忠', '固原', '中卫'],
  '青海': ['西宁', '海东', '海西', '海南', '海北', '黄南', '果洛', '玉树'],
  '西藏': ['拉萨', '日喀则', '昌都', '林芝', '山南', '那曲', '阿里'],
}
const PROVINCES = Object.keys(REGION_MAP)

const idMap = STRINGS.IDENTITY_STATUS_MAP

type IdentityStatus = 'pending' | 'verified' | 'rejected' | null

/** 状态 → UI 配置 */
function statusConfig(s: IdentityStatus) {
  if (s === 'verified') return { label: idMap.verified || '已认证', color: '#52C41A', disabled: false }
  if (s === 'rejected') return { label: idMap.rejected || '已驳回', color: '#FF4D4F', disabled: false }
  if (s === 'pending') return { label: idMap.pending || '审核中', color: '#FA8C16', disabled: true }
  return { label: '未认证', color: '#999', disabled: false }
}

/** 状态 → 胶囊样式类名 */
function capsuleClass(s: IdentityStatus): string {
  if (s === 'verified') return styles.capsuleGreen
  if (s === 'rejected') return styles.capsuleRed
  if (s === 'pending') return styles.capsuleOrange
  return styles.capsuleDefault
}

/** 小时数 → 可读重置时间，null 时返回 null */
function formatResetHours(hours: number | null | undefined): string | null {
  if (hours == null) return null
  if (hours === 0) return '即将恢复'
  const d = Math.floor(hours / 24)
  const h = hours % 24
  if (d > 0 && h > 0) return `${d}天${h}小时`
  if (d > 0) return `${d}天`
  return `${hours}小时`
}

export default function EditProfilePage() {
  const [profile, setProfile] = useState<UserProfileAggregated | null>(null)
  const [loading, setLoading] = useState(true)

  // ---- Level 1 ----
  const [nickname, setNickname] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  // L1 新增 — 地址
  const [province, setProvince] = useState('')
  const [city, setCity] = useState('')
  const [address, setAddress] = useState('')

  // ---- Level 2 实名 ----
  const [userType, setUserType] = useState<'student' | 'enterprise'>('student')
  const [idCardNumber, setIdCardNumber] = useState('')
  const [idCardFrontOss, setIdCardFrontOss] = useState<string | null>(null)
  const [idCardBackOss, setIdCardBackOss] = useState<string | null>(null)
  /** 本地临时文件（用户新选图片，提交时上传） */
  const [idCardFrontFile, setIdCardFrontFile] = useState<string | null>(null)
  const [idCardBackFile, setIdCardBackFile] = useState<string | null>(null)
  // L2 实名新增
  const [lastNameZh, setLastNameZh] = useState('')
  const [firstNameZh, setFirstNameZh] = useState('')
  const [avatarOss, setAvatarOss] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<string | null>(null)
  const [politicalStatus, setPoliticalStatus] = useState('')
  const [ethnicity, setEthnicity] = useState('')

  // ---- Level 2 学生 ----
  const [education, setEducation] = useState('')
  const [school, setSchool] = useState('')
  const [major, setMajor] = useState('')
  const [studentCardOss, setStudentCardOss] = useState<string | null>(null)
  const [studentCardFile, setStudentCardFile] = useState<string | null>(null)
  // L2 学生新增
  const [enrollmentPdfOss, setEnrollmentPdfOss] = useState<string | null>(null)
  const [enrollmentPdfFile, setEnrollmentPdfFile] = useState<string | null>(null)
  const [degreeCertOss, setDegreeCertOss] = useState<string | null>(null)
  const [degreeCertFile, setDegreeCertFile] = useState<string | null>(null)

  // ---- Level 2 企业 ----
  const [organization, setOrganization] = useState('')

  // ---- 提交状态 ----
  const [savingL1, setSavingL1] = useState(false)
  const [savingIdentity, setSavingIdentity] = useState(false)
  const [savingStudent, setSavingStudent] = useState(false)
  const [savingEnterprise, setSavingEnterprise] = useState(false)
  // 提交后视觉反馈
  const [identitySubmitted, setIdentitySubmitted] = useState(false)
  const [studentSubmitted, setStudentSubmitted] = useState(false)
  const [enterpriseSubmitted, setEnterpriseSubmitted] = useState(false)

  // ---- L2 编辑次数 ----
  const [level2EditCount, setLevel2EditCount] = useState(0)

  // ---- 驳回弹窗 ----
  const [rejectModalVisible, setRejectModalVisible] = useState(false)
  const [rejectReasons, setRejectReasons] = useState<{ section: string, reason: string }[]>([])

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
      // L1 地址
      setProvince(p.profile.province || '')
      setCity(p.profile.city || '')
      setAddress(p.profile.address || '')
      // L2 实名
      if (p.realname) {
        setUserType(p.realname.user_type === 'enterprise' ? 'enterprise' : 'student')
        setIdCardNumber(idCardForEdit(p.realname))
        setIdCardFrontOss(p.realname.id_card_front_oss)
        setIdCardBackOss(p.realname.id_card_back_oss)
        // 新增实名字段
        setLastNameZh(p.realname.last_name_zh || '')
        setFirstNameZh(p.realname.first_name_zh || '')
        setAvatarOss(p.realname.avatar_oss)
        setPoliticalStatus(p.realname.political_status || '')
        setEthnicity(p.realname.ethnicity || '')

        // 学生 / 企业
        if (p.student) {
          setEducation(p.student.education || '')
          setSchool(p.student.school || '')
          setMajor(p.student.major || '')
          setStudentCardOss(p.student.student_card_oss)
          setEnrollmentPdfOss(p.student.enrollment_pdf_oss)
          setDegreeCertOss(p.student.degree_cert_oss)
        }
        if (p.enterprise) {
          setOrganization(p.enterprise.organization || '')
        }
      }
      setLevel2EditCount(p.level2_edit_count)

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
    }).catch(() => {
      Taro.showToast({ title: '加载失败', icon: 'none' })
    }).finally(() => setLoading(false))
  }, [])

  const cityOptions = useMemo(() => REGION_MAP[province] || [], [province])

  if (loading || !profile) return null

  const editCountLimit = profile.edit_count_limit ?? 5
  const isL2Exhausted = level2EditCount >= editCountLimit

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
        province: province.trim() || undefined,
        city: city.trim() || undefined,
        address: address.trim() || undefined,
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
    if (!idCardNumber.trim()) return Taro.showToast({ title: '请输入身份证号', icon: 'none' })
    const v = validateIdCard(idCardNumber)
    if (!v.valid) return Taro.showToast({ title: v.message, icon: 'none' })
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

    // 上传二寸照（如果有新选的）
    let avatarOssFinal = avatarOss
    try {
      if (avatarFile) { Taro.showLoading({ title: '上传二寸照...' }); const r = await uploadFile(avatarFile); avatarOssFinal = r.url; Taro.hideLoading() }
    } catch { Taro.hideLoading(); Taro.showToast({ title: '二寸照上传失败', icon: 'none' }); return }

    setSavingIdentity(true)
    const payload = {
      user_type: userType,
      id_card_number: idCardNumber.trim(),
      id_card_front_oss: frontOss,
      id_card_back_oss: backOss,
      last_name_zh: lastNameZh.trim() || undefined,
      first_name_zh: firstNameZh.trim() || undefined,
      avatar_oss: avatarOssFinal || undefined,
      political_status: politicalStatus.trim() || undefined,
      ethnicity: ethnicity.trim() || undefined,
    }
    try {
      if (realname && identityStatus !== null) {
        await updateIdentity(payload)
      } else {
        await submitIdentity(payload)
      }
      Taro.showToast({ title: '实名信息已提交，等待审核', icon: 'success' })
      setIdentitySubmitted(true)
      setTimeout(reloadProfile, 600)
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
      if (studentCardFile) { Taro.showLoading({ title: '上传学生证...' }); const r = await uploadFile(studentCardFile); cardOss = r.url }
    } catch {
      Taro.showToast({ title: '图片上传失败，请重试', icon: 'none' })
      return
    } finally { Taro.hideLoading() }

    // 上传学信网电子注册表
    let pdfOss = enrollmentPdfOss
    try {
      if (enrollmentPdfFile) { Taro.showLoading({ title: '上传学信网电子注册表...' }); const r = await uploadFile(enrollmentPdfFile); pdfOss = r.url }
    } catch { Taro.showToast({ title: '学信网电子注册表上传失败', icon: 'none' }); return } finally { Taro.hideLoading() }

    // 上传学信网学历证明
    let certOss = degreeCertOss
    try {
      if (degreeCertFile) { Taro.showLoading({ title: '上传学信网学历证明...' }); const r = await uploadFile(degreeCertFile); certOss = r.url }
    } catch { Taro.showToast({ title: '学信网学历证明上传失败', icon: 'none' }); return } finally { Taro.hideLoading() }
    setSavingStudent(true)
    const payload = {
      education: education.trim(),
      school: school.trim(),
      major: major.trim(),
      student_card_oss: cardOss || undefined,
      enrollment_pdf_oss: pdfOss || undefined,
      degree_cert_oss: certOss || undefined,
    }
    try {
      if (student && studentStatus !== null) {
        await updateStudent(payload)
      } else {
        await submitStudent(payload)
      }
      Taro.showToast({ title: '学生信息已提交，等待审核', icon: 'success' })
      setStudentSubmitted(true)
      setTimeout(reloadProfile, 600)
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
      setEnterpriseSubmitted(true)
      setTimeout(reloadProfile, 600)
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

  const resetTimeText = formatResetHours(profile.edit_count_reset_hours)
  const l2Tip = isL2Exhausted
    ? (
      resetTimeText != null
        ? STRINGS.MINE_LEVEL2_EDIT_EXHAUSTED.replace('{max}', String(editCountLimit)).replace('{days}', resetTimeText)
        : `本月修改次数已用完（共${editCountLimit}次）`
    )
    : `本月还可修改 ${editCountLimit - level2EditCount} 次（共 ${editCountLimit} 次）`

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.MINE_EDIT_PROFILE_TITLE} shouldShowBack />
        <ScrollView className={styles.body} scrollY>

          {/* ================================================================ */}
          {/* Level 1 — 基础资料 */}
          {/* ================================================================ */}
          <View className={styles.section}>
            <View className={styles.sectionHead}>
              <Text className={styles.sectionTitle}>基础资料</Text>
            </View>
            <FormInput label='昵称' placeholder='请输入昵称' value={nickname} onChange={setNickname} />
            <FormInput label={STRINGS.FORM_EMAIL} placeholder={STRINGS.FORM_EMAIL_PLACEHOLDER} value={email} onChange={setEmail} />
            <FormInput label={STRINGS.FORM_PHONE} placeholder='手机号通过微信授权获取' value={phone} disabled />
            <Text className={styles.subTitle}>通讯地址</Text>
            <View className={styles.formPair}>
              <View className={styles.formHalf}>
                <FormPicker label='省' options={PROVINCES} value={province} onChange={v => { setProvince(v); setCity('') }} />
              </View>
              <View className={styles.formHalf}>
                <FormPicker label='市' options={cityOptions} value={city} onChange={setCity} placeholder='请先选择省' />
              </View>
            </View>
            <FormInput label='地址' placeholder='请输入详细地址' value={address} onChange={setAddress} />
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
              <Text className={`${styles.statusBadge} ${capsuleClass(identityStatus)}`}>
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

            <FormInput label='身份证号' placeholder='请输入 18 位身份证号' value={idCardNumber} onChange={setIdCardNumber} type='idcard' maxlength={18} disabled={isIdentityDisabled} />

            {/* 后端推导字段（只读展示） */}
            {realname && (
              <View className={styles.derivedRow}>
                {realname.birth_date && <Text className={styles.derivedText}>出生：{realname.birth_date}</Text>}
                {realname.zip_code && <Text className={styles.derivedText}>邮编：{realname.zip_code}</Text>}
              </View>
            )}

            <FormInput label='中文姓' placeholder='姓' value={lastNameZh} onChange={setLastNameZh} disabled={isIdentityDisabled} />
            <FormInput label='中文名' placeholder='名' value={firstNameZh} onChange={setFirstNameZh} disabled={isIdentityDisabled} />

            {/* 后端推导字段 */}
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

            {/* 二寸免冠照 */}
            <View className={styles.uploadRow}>
              <Text className={styles.fieldLabel}>二寸免冠照</Text>
              <Button size='sm' variant='secondary' onClick={() => handlePickImage(setAvatarFile, '二寸照')} disabled={isIdentityDisabled}>
                {(avatarFile || avatarOss) ? '已选择 ✓' : '选择'}
              </Button>
            </View>

            <FormInput label='政治面貌' placeholder='如 共青团员' value={politicalStatus} onChange={setPoliticalStatus} disabled={isIdentityDisabled} />
            <FormInput label='民族' placeholder='如 汉族' value={ethnicity} onChange={setEthnicity} disabled={isIdentityDisabled} />

            <View className={styles.btnWrap}>
              {identitySubmitted ? (
                <View className={styles.btnDone}>✓ 已提交，等待审核</View>
              ) : (
                <Button variant='gradient' size='lg' onClick={handleSubmitIdentity} loading={savingIdentity} disabled={isIdentityDisabled}>
                  {identityStatus === 'rejected' ? '重新提交实名认证' : identityStatus === 'verified' ? '修改实名信息' : '提交实名认证'}
                </Button>
              )}
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
                  <Text className={`${styles.statusBadge} ${capsuleClass(studentStatus)}`}>
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
              <View className={styles.uploadRow}>
                <Text className={styles.fieldLabel}>学信网电子注册表</Text>
                <Button size='sm' variant='secondary' onClick={() => handlePickImage(setEnrollmentPdfFile, '学信网电子注册表')} disabled={isStudentDisabled}>
                  {(enrollmentPdfFile || enrollmentPdfOss) ? '已选择 ✓' : '选择'}
                </Button>
              </View>
              <View className={styles.uploadRow}>
                <Text className={styles.fieldLabel}>学信网学历证明</Text>
                <Button size='sm' variant='secondary' onClick={() => handlePickImage(setDegreeCertFile, '学信网学历证明')} disabled={isStudentDisabled}>
                  {(degreeCertFile || degreeCertOss) ? '已选择 ✓' : '选择'}
                </Button>
              </View>
              <View className={styles.btnWrap}>
                {studentSubmitted ? (
                  <View className={styles.btnDone}>✓ 已提交，等待审核</View>
                ) : (
                  <Button variant='gradient' size='lg' onClick={handleSubmitStudent} loading={savingStudent} disabled={isStudentDisabled}>
                    {studentStatus === 'rejected' ? '重新提交学生信息' : studentStatus === 'verified' ? '修改学生信息' : '提交学生信息'}
                  </Button>
                )}
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
                  <Text className={`${styles.statusBadge} ${capsuleClass(enterpriseStatus)}`}>
                    {enterpriseCfg.label}
                  </Text>
                )}
              </View>
              <FormInput label='单位名称' placeholder='请输入单位全称' value={organization} onChange={setOrganization} disabled={isEnterpriseDisabled} />
              <View className={styles.btnWrap}>
                {enterpriseSubmitted ? (
                  <View className={styles.btnDone}>✓ 已提交，等待审核</View>
                ) : (
                  <Button variant='gradient' size='lg' onClick={handleSubmitEnterprise} loading={savingEnterprise} disabled={isEnterpriseDisabled}>
                    {enterpriseStatus === 'rejected' ? '重新提交企业信息' : enterpriseStatus === 'verified' ? '修改企业信息' : '提交企业信息'}
                  </Button>
                )}
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

/** 编辑模式下优先展示明文，否则展示脱敏 */
function idCardForEdit(r: UserRealnameL2): string {
  return r.id_card_raw || r.id_card || ''
}