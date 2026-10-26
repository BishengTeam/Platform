/**
 * 全量口径：功能恢复/新增后把对应开关置 true，日常构建默认走这份。
 * 提审裁剪版用 npm run build:weapp:trim（冻结清单见 features.trim.ts）。
 */
export const FEATURES_FULL = {
  certRegistration: true,
  aiConsult: true,
  activityTab: true,
  employmentZone: true,
  orders: true,
  videoLogin: true,
  videoCodes: true,
  examQuery: true,
  points: true,
  pointsExchange: true,
  checkin: true,
} as const
