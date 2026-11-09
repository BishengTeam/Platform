/**
 * 全量口径：生产统一开启已上线能力，日常构建默认且唯一使用这份。
 * 2026.11.09：就业专区关闭（无资质），原位新增英才计划专区（yingcaiZone）。
 */
export const FEATURES_FULL = {
  certRegistration: true,
  aiConsult: true,
  activityTab: true,
  yingcaiZone: true,
  orders: true,
  videoLogin: true,
  videoCodes: true,
  examQuery: true,
  points: true,
  pointsExchange: true,
  checkin: true,
} as const
