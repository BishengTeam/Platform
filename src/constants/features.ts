/**
 * 功能开关入口：按构建注入的 process.env.TARO_EDITION 选择口径。
 * - full（默认）：全量口径，见 features.full.ts；
 * - trim：v1 提审口径（冻结清单），见 features.trim.ts。
 * 切换用 npm run dev:weapp:trim / build:weapp:trim，不要改本文件。
 */
import { FEATURES_FULL } from './features.full.ts'
import { FEATURES_TRIM } from './features.trim.ts'

export type EditionName = 'trim' | 'full'

const edition: EditionName = process.env.TARO_EDITION === 'trim' ? 'trim' : 'full'

export const FEATURES = edition === 'trim' ? FEATURES_TRIM : FEATURES_FULL
