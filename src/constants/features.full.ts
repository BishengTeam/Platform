/**
 * 全量口径：生产统一开启已上线能力，日常构建默认且唯一使用这份。
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
