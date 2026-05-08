import type { ActivityBannerItem, Activity, ActivityTagFilter } from '@/types'

export const activityBannerItems: ActivityBannerItem[] = [
  { id: 'profile', title: '精彩活动 福利不断', description: '参与各类活动，获取更多优惠和惊喜', gradient: 'gradient-purple', icon: 'gift', buttonText: '我的奖品', buttonColor: '#ffffff' },
  { id: 1, title: '五一学习狂欢节', description: '全场课程5折起，报名认证考试立减200元，还有机会赢取iPad大奖', gradient: 'gradient-red', icon: 'gift', buttonText: '立即参与', buttonColor: '#ffffff' },
  { id: 2, title: '邀请好友得现金红包', description: '邀请好友注册并购买课程，双方都可获得¥50现金红包，多邀多得上不封顶', gradient: 'gradient-green', icon: 'gift', buttonText: '立即参与', buttonColor: '#ffffff' },
  { id: 3, title: '学习打卡赢奖学金', description: '连续学习打卡30天，即可获得¥100奖学金，可用于购买任意课程', gradient: 'gradient-blue', icon: 'gift', buttonText: '立即参与', buttonColor: '#ffffff' },
]

export const ongoingActivities: Activity[] = [
  { id: 1, title: '五一学习狂欢节', description: '全场课程5折起，报名认证考试立减200元，还有机会赢取iPad大奖', benefit: '最高优惠¥500', startTime: '2024-05-01', endTime: '2024-05-07', status: '火热进行中' },
  { id: 2, title: '邀请好友得现金红包', description: '邀请好友注册并购买课程，双方都可获得¥50现金红包，多邀多得上不封顶', benefit: '最高得¥1000现金', startTime: '2024-04-01', endTime: '2024-06-30', status: '长期有效' },
  { id: 3, title: '学习打卡赢奖学金', description: '连续学习打卡30天，即可获得¥100奖学金，可用于购买任意课程', benefit: '最高得¥500奖学金', startTime: '2024-04-15', endTime: '2024-05-15', status: '进行中' },
]

export const upcomingActivities: Activity[] = [
  { id: 4, title: '618年中大促', description: '年中最大优惠活动，全场课程3折起，认证考试报名费半价', benefit: '最高优惠¥1000', startTime: '2024-06-18', endTime: '2024-06-20', status: '即将开始' },
  { id: 5, title: '毕业季专属优惠', description: '应届毕业生购买课程享额外8折优惠，凭学生证还可获得免费就业指导', benefit: '额外8折优惠', startTime: '2024-06-01', endTime: '2024-07-31', status: '即将开始' },
]

export const endedActivities: Activity[] = [
  { id: 6, title: '清明小长假学习季', description: '小长假期间购买课程享7折优惠', benefit: '7折优惠', startTime: '2024-04-01', endTime: '2024-04-07' },
  { id: 7, title: '春季招聘季优惠', description: '春季招聘季，就业课程享优惠', benefit: '立减300元', startTime: '2024-03-01', endTime: '2024-03-31' },
]

export const activityTagFilters: ActivityTagFilter[] = [
  { label: '进行中', activeColor: '#722ED1', activeBg: '#722ED1', activeText: '#ffffff', inactiveBg: '#F9F0FF' },
  { label: '即将开始', activeColor: '#722ED1', activeBg: '#722ED1', activeText: '#ffffff', inactiveBg: '#F9F0FF' },
  { label: '已结束', activeColor: '#999999', activeBg: '#999999', activeText: '#ffffff', inactiveBg: '#F5F5F5' },
]
