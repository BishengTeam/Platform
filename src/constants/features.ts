/**
 * 功能开关入口：按构建注入的 process.env.TARO_EDITION 选择口径。
 * - full（默认）：全量口径，见 features.full.ts；
 * - trim：提审冻结口径（仅归档），见 features.trim.ts。
 * 生产统一使用 full；不要改本文件。
 */
import { FEATURES_FULL } from './features.full.ts'
import { FEATURES_TRIM } from './features.trim.ts'

export type EditionName = 'trim' | 'full'

const edition: EditionName = process.env.TARO_EDITION === 'trim' ? 'trim' : 'full'

const EDITION_FEATURES = edition === 'trim' ? FEATURES_TRIM : FEATURES_FULL

/**
 * 临时屏蔽口径：env 显式传 false 才生效（默认全开），叠加在版本清单之上。
 * 不修改 full/trim 原文件与 features-edition 冻结断言；屏蔽版构建时在命令行传参即可。
 */
export const FEATURES = {
  ...EDITION_FEATURES,
  /** 认证专区展示层（首页板块 tab+认证卡+金刚区入口）：TARO_APP_CERT_ZONE_VISIBLE=false 屏蔽；报名页保留在包内 */
  certRegistration: EDITION_FEATURES.certRegistration && process.env.TARO_APP_CERT_ZONE_VISIBLE !== 'false',
  /** 活动内容（活动页「活动」子tab+首页在线培训板块+金刚区活动入口）：TARO_APP_ACTIVITY_VISIBLE=false 屏蔽；竞赛/英才不受影响 */
  activityTab: EDITION_FEATURES.activityTab && process.env.TARO_APP_ACTIVITY_VISIBLE !== 'false',
  /** 英才计划展示层（首页板块 tab+内容卡+金刚区入口+活动页英才子tab）：TARO_APP_YINGCAI_VISIBLE=false 屏蔽；活动详情页保留在包内 */
  yingcaiZone: EDITION_FEATURES.yingcaiZone && process.env.TARO_APP_YINGCAI_VISIBLE !== 'false',
}

/** 首页「在线练习」板块（后台课程卡片）：TARO_APP_STUDY_COURSES_VISIBLE=false 屏蔽；学习 tab 与金刚区学习入口不受影响 */
export const studyCoursesVisible = process.env.TARO_APP_STUDY_COURSES_VISIBLE !== 'false'

/** 金刚区「新闻资讯」入口：TARO_APP_NEWS_VISIBLE=false 屏蔽；首页资讯板块 tab/资讯条/内容不受影响（2026-11-11 口径：瀑布流保留新闻内容） */
export const newsVisible = process.env.TARO_APP_NEWS_VISIBLE !== 'false'

/** 仅控制首页快捷按钮；不改变认证内容区、报名或订单功能。 */
export const homeCertEntryVisible = process.env.TARO_APP_HOME_CERT_ENTRY_VISIBLE === 'true'
