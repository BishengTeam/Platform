import type { CompetitionBannerItem, Competition, CompetitionTagFilter } from '@/types'

export const competitionBannerItems: CompetitionBannerItem[] = [
  { id: 'profile', title: '以赛促学 技创未来', description: '参与技术竞赛，展示你的实力，赢取丰厚奖励', gradient: 'gradient-orange', icon: 'trophy', buttonText: '查看我的竞赛', buttonColor: '#FA8C16' },
  { id: 1, title: '2024全国大学生网络技术大赛', description: '面向全国大学生的网络技术竞赛，展示技术实力，赢取丰厚奖金', gradient: 'gradient-red', icon: 'trophy', buttonText: '立即报名', buttonColor: '#FF4D4F' },
  { id: 2, title: '华为ICT大赛2024', description: '华为官方举办的全球性ICT技术竞赛，获奖可获得华为就业绿色通道', gradient: 'gradient-blue', icon: 'trophy', buttonText: '立即报名', buttonColor: '#1677FF' },
  { id: 3, title: '网络安全攻防大赛', description: '实战型网络安全竞赛，考验真实攻防能力', gradient: 'gradient-purple', icon: 'trophy', buttonText: '进入赛场', buttonColor: '#722ED1' },
]

export const ongoingCompetitions: Competition[] = [
  { id: 1, title: '2024全国大学生网络技术大赛', description: '面向全国大学生的网络技术竞赛，展示技术实力，赢取丰厚奖金', prize: '总奖金¥100万', startTime: '2024-05-01', endTime: '2024-05-10', status: '报名中' },
  { id: 2, title: '华为ICT大赛2024', description: '华为官方举办的全球性ICT技术竞赛，获奖可获得华为就业绿色通道', prize: '总奖金¥200万', startTime: '2024-05-15', endTime: '2024-06-20', status: '报名中' },
  { id: 3, title: '网络安全攻防大赛', description: '实战型网络安全竞赛，考验真实攻防能力', prize: '总奖金¥50万', startTime: '2024-04-25', endTime: '2024-04-27', status: '进行中' },
]

export const upcomingCompetitions: Competition[] = [
  { id: 4, title: 'H3C杯网络技术大赛', description: '华三官方举办的网络技术竞赛，获奖可获得H3C认证直通资格', prize: '总奖金¥80万', startTime: '2024-06-01', endTime: '2024-06-10', status: '预约中' },
  { id: 5, title: '全国职业院校技能大赛', description: '教育部主办的职业院校技能大赛，获奖可获得保送资格', prize: '获奖可保送本科', startTime: '2024-07-01', endTime: '2024-07-05', status: '即将开始' },
]

export const endedCompetitions: Competition[] = [
  { id: 6, title: '2023网络安全挑战赛', description: '2023年度网络安全技术挑战赛', prize: '总奖金¥60万', startTime: '2023-12-01', endTime: '2023-12-15', status: '已结束' },
  { id: 7, title: '华为ICT大赛2023', description: '2023年度华为ICT技术竞赛', prize: '总奖金¥180万', startTime: '2023-11-01', endTime: '2023-11-20', status: '已结束' },
]

export const competitionTagFilters: CompetitionTagFilter[] = [
  { label: '进行中', activeColor: '#FA8C16', activeBg: '#FA8C16', activeText: '#ffffff' },
  { label: '即将开始', activeColor: '#FA8C16', activeBg: '#FA8C16', activeText: '#ffffff' },
  { label: '已结束', activeColor: '#999999', activeBg: '#999999', activeText: '#ffffff' },
]
