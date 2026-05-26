import type { MyCourse, PointRecord, Agreement, ExamIntention, TeacherContact } from '@/types'

export const myCourses: MyCourse[] = [
  {
    id: 'mc1', title: 'H3CNE-RS+ 系统培训课程', cover: '',
    progress: 65, status: 'active', instructor: '张老师',
    totalLessons: 48, completedLessons: 31,
  },
  {
    id: 'mc2', title: '深信服安全技术认证培训', cover: '',
    progress: 0, status: 'pending', instructor: '李老师',
    totalLessons: 36, completedLessons: 0,
  },
  {
    id: 'mc3', title: '网络工程师入门到精通', cover: '',
    progress: 100, status: 'expired', instructor: '赵老师',
    totalLessons: 24, completedLessons: 24,
  },
]

export const pointsBalance = 320

export const pointRecords: PointRecord[] = [
  { id: 'pr1', type: 'earn', amount: 50, description: '学习课程 H3CNE-RS+ 课时积分', createdAt: '2026-05-24' },
  { id: 'pr2', type: 'earn', amount: 30, description: '每日打卡奖励', createdAt: '2026-05-23' },
  { id: 'pr3', type: 'redeem', amount: -50, description: '考试费减免兑换（本月）', createdAt: '2026-05-20' },
  { id: 'pr4', type: 'earn', amount: 100, description: '完成模拟考试满分奖励', createdAt: '2026-05-18' },
  { id: 'pr5', type: 'earn', amount: 20, description: '连续打卡7天奖励', createdAt: '2026-05-15' },
  { id: 'pr6', type: 'redeem', amount: -50, description: '考试费减免兑换', createdAt: '2026-04-25' },
]

export const agreements: Agreement[] = [
  {
    id: 'ag1', title: 'H3CNE-RS+ 培训协议',
    status: 'stamped', content: '甲方（培训机构）：四川智天远教育科技有限公司\n乙方（学员）：张三\n\n一、培训内容\nH3CNE-RS+ 认证培训课程，共 128 课时...\n\n二、培训费用\n...',
    createdAt: '2026-05-10', signedAt: '2026-05-11',
  },
  {
    id: 'ag2', title: '深信服安全培训协议',
    status: 'pending_sign', content: '甲方（培训机构）：四川智天远教育科技有限公司\n乙方（学员）：张三\n\n一、培训内容\n深信服安全技术认证培训课程...',
    createdAt: '2026-05-22',
  },
  {
    id: 'ag3', title: 'NISP 一级培训协议',
    status: 'completed', content: '甲方（培训机构）：四川智天远教育科技有限公司...',
    createdAt: '2026-05-01', signedAt: '2026-05-02',
  },
]

export const examIntentions: ExamIntention[] = [
  { id: 'ei1', category: 'H3CNE', notes: '计划在7月份参加考试', createdAt: '2026-05-10' },
]

export const teacherContacts: TeacherContact[] = [
  {
    id: 'tc1', name: '张老师', title: 'H3CNE 金牌讲师 / 考官',
    phone: '13812345678', wechat: 'H3C_TeacherZhang', qq: '123456789', avatar: '',
  },
  {
    id: 'tc2', name: '李老师', title: '深信服安全认证讲师',
    phone: '13987654321', wechat: 'Sangfor_Li', qq: '987654321', avatar: '',
  },
  {
    id: 'tc3', name: '王老师', title: 'NISP 信息安全讲师',
    phone: '13611112222', wechat: 'NISP_Wang', qq: '555666777', avatar: '',
  },
]

export const myCollections = {
  courses: [
    { id: 'col1', title: 'H3CNE-RS+ 系统培训课程', instructor: '张老师', price: 599 },
    { id: 'col2', title: '网络安全攻防实战', instructor: '陈老师', price: 899 },
  ],
  materials: [
    { id: 'mat1', title: 'H3CNE 路由交换实验手册', type: 'PDF' },
    { id: 'mat2', title: 'OSPF 协议详解文档', type: 'PDF' },
  ],
}

export const registeredExams = [
  { id: 're1', name: 'H3CNE-RS+ 认证工程师', examCode: 'GB0-191', date: '2026-07-15', status: '已报名', link: 'https://example.com/exam' },
  { id: 're2', name: 'SCSA 安全工程师认证', examCode: 'SCSA-01', date: '2026-08-10', status: '待缴费', link: 'https://example.com/exam' },
]
