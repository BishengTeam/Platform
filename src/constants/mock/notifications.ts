import type { Notification } from '@/types'

export const notifications: Notification[] = [
  {
    id: '1',
    title: '考试报名成功',
    content: '您已成功报名 H3CNE 认证考试（2024年6月批次），请按时参加考试。',
    time: '2024-03-10 14:30',
    read: false,
  },
  {
    id: '2',
    title: '证书已发放',
    content: '恭喜您！H3CNE 网络工程师证书已正式发放，可前往证书中心查看。',
    time: '2024-03-16 09:00',
    read: false,
  },
  {
    id: '3',
    title: '系统维护通知',
    content: '平台将于 2024年3月20日 凌晨 02:00-04:00 进行系统维护，届时部分功能暂不可用。',
    time: '2024-03-15 10:00',
    read: true,
  },
  {
    id: '4',
    title: '新课程上线提醒',
    content: '《H3CNE 实验精讲》新课已上线，包含20个实验案例，助你轻松通过实验考试。',
    time: '2024-03-08 16:00',
    read: true,
  },
  {
    id: '5',
    title: '订单支付提醒',
    content: '您有一笔 H3CNE 认证考试报名的订单尚未支付，请在24小时内完成支付以确认考位。',
    time: '2024-03-05 12:00',
    read: true,
  },
]
