/**
 * v1 提审口径（冻结清单）：第一版只开放题库、竞赛、招聘展示与打卡，
 * 其余入口一律隐藏。与 2026.10.21 微信提审版本完全一致。
 * 本清单不得随手修改，tests/features-edition.test.mjs 有冻结断言拦防；
 * 恢复功能请改 features.full.ts，走全量构建。
 */
export const FEATURES_TRIM = {
  /** 首页金刚区「报名认证」入口（认证报名链路） */
  certRegistration: false,
  /** 首页 AI 智能咨询卡 */
  aiConsult: false,
  /** 发现页「活动」tab */
  activityTab: false,
  /** 我的页「订单」（认证/课程支付链路） */
  orders: false,
  /** 我的页「视频登录」 */
  videoLogin: false,
  /** 我的页「激活码」 */
  videoCodes: false,
  /** 我的页「查成绩」 */
  examQuery: false,
  /** 我的页「积分」入口（积分页含兑换商城，兑换不上线则入口保持隐藏；打卡已恢复） */
  points: false,
  /** 打卡：我的页入口 + 题库页打卡条 */
  checkin: true,
} as const
