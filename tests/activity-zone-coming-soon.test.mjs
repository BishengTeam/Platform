import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { STRINGS } from '../src/constants/strings.ts'

const file = (p) => new URL(`../src/${p}`, import.meta.url)

test('activity zone defaults to competition and shows preparing empty states', async () => {
  const source = await readFile(file('pages/activity-zone/index.tsx'), 'utf8')
  assert.match(source, /useState<MainTab>\('competition'\)/)
  assert.match(source, /showActivityEmpty = activitiesLoaded && allActivities\.length === 0/)
  assert.match(source, /showCompetitionEmpty = competitionsLoaded && allCompetitions\.length === 0/)
  assert.match(source, /showEmploymentEmpty = jobsLoaded && allJobs\.length === 0/)
  // 活动/竞赛空态时不得再渲染“全部/进行中/即将开始/已结束”筛选标签
  assert.match(source, /showTagFilter =\s*\(mainTab === 'competition' && !showCompetitionEmpty\) \|\|\s*\(mainTab === 'activity' && !showActivityEmpty\)/)
  assert.match(source, /title=\{STRINGS\.ACTIVITY_EMPTY_TITLE\}/)
  assert.match(source, /title=\{STRINGS\.COMPETITION_EMPTY_TITLE\}/)
  assert.match(source, /title=\{STRINGS\.EMPLOYMENT_EMPTY_TITLE\}/)
  // 竞赛子页不展示运营横幅，列表内容直接从筛选区开始。
  assert.doesNotMatch(source, /ZoneBanner|currentBanner|bannerWrap/)
  // 薪资只保留价格槽位；按钮统一为"了解详情"，联系方式在详情页查看。
  assert.match(source, /tags=\{\[job\.location \?\? ''\]\}/)
  assert.match(source, /price=\{job\.salary_range \?\? ''\}/)
  assert.match(source, /buttonText='了解详情'/)
  assert.doesNotMatch(source, /`联系：\$\{item\.contact_info\}`/)
  // 活动卡片与竞赛卡片同构：仅封面 + 标题 + 状态角标，明细（时间/地点/描述）一律进详情页。
  // 断言限定在活动区块内，就业卡片的按钮不受影响。
  const activityBlock = source.match(/mainTab === 'activity' && \([\s\S]*?mainTab === 'competition'/)?.[0] ?? ''
  assert.ok(activityBlock, 'activity list block should exist')
  assert.doesNotMatch(activityBlock, /subtitle=|tags=\{|buttonText=|remindActivity/)
  assert.match(activityBlock, /coverUrl=\{resolveMediaUrl\(item\.cover_url\)\}/)
  // 已结束活动保留淡化样式标识。
  assert.match(activityBlock, /isFaded=\{status\.label === STRINGS\.ACTIVITY_ENDED\}/)
  assert.doesNotMatch(source, /\$\{item\.start_time[^}]*\}-\$\{item\.end_time/)
})

test('home activity and employment surfaces follow backend content visibility', async () => {
  const source = await readFile(file('pages/index/index.tsx'), 'utf8')
  // 金刚区第 4 格只跟随活动：有上架活动显示活动入口，无活动显示敬请期待占位。
  // 岗位不设金刚区入口，就业走首页瀑布流与活动 tab 子页。
  assert.match(source, /if \(activities\.length > 0\)[\s\S]*?tab: 'activity'/)
  assert.match(source, /\} else \{[\s\S]*?INDEX_ZONE_COMING_SOON/)
  assert.match(
    source,
    /INDEX_ZONE_COMING_SOON,[\s\S]*?bg: '#F9F0FF',[\s\S]*?iconColor: '#722ED1'/
  )
  const activeSource = source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '')
  assert.doesNotMatch(activeSource, /tab: 'employment'/)
  // 首页瀑布流：活动/就业均按内容有无整块显示/隐藏。
  assert.match(source, /activities\.length > 0 && \(/)
  assert.match(source, /employmentJobs\.length > 0 && \(/)
  assert.equal(STRINGS.INDEX_ZONE_COMING_SOON, '敬请期待')
})

test('home king-kong grid keeps the study zone entry visible', async () => {
  const source = await readFile(file('pages/index/index.tsx'), 'utf8')
  assert.match(source, /name: STRINGS\.INDEX_ZONE_STUDY,[\s\S]*?url: '\/pages\/training\/index'/)
  // 2026-10-01 甲方要求：学习专区入口不再隐藏，金刚区保持 2x2 填满。
  assert.doesNotMatch(source, /学习专区暂时隐藏/)
})

test('home certification waterfall renders active certification products', async () => {
  const source = await readFile(file('pages/index/index.tsx'), 'utf8')
  const homeCard = await readFile(file('components/HomeCard/index.tsx'), 'utf8')

  // /api/zones 的认证数据来自 CertProduct，并放在 certifications 字段；
  // items 是旧 Zone 卡片配置，生产环境为空，不能作为开放报名的数据源。
  assert.match(source, /zones\['cert'\]\?\.certifications/)
  assert.doesNotMatch(source, /zones\['cert'\]\?\.items/)
  assert.match(source, /title: cert\.chinese_name \|\| cert\.name/)
  assert.match(source, /certificationCards\.length > 0 && \(/)
  // 2026-10-15 甲方要求：认证卡与竞赛卡同构（大图/渐变 + 角标 + 标题），
  // 不再有“认证代码”描述行和“报名入口”按钮，点击整卡直达对应认证报名。
  assert.doesNotMatch(source, /actionText/)
  assert.match(source, /navigateToCertRegistration/)
  assert.doesNotMatch(homeCard, /actionText|<Button/)
  assert.equal(homeCard.includes('>>'), false)
})

test('ai consult no longer advertises unavailable activities or jobs', async () => {
  const source = await readFile(file('pages/ai-consult/index.tsx'), 'utf8')
  const activityBlock = source.match(/activity: \(id\) => \(\{[\s\S]*?\}\),/)?.[0] ?? ''
  const employmentBlock = source.match(/employment: \(id\) => \(\{[\s\S]*?\}\),/)?.[0] ?? ''
  assert.ok(activityBlock, 'activity intent builder should exist')
  assert.ok(employmentBlock, 'employment intent builder should exist')
  assert.doesNotMatch(activityBlock, /card:/)
  assert.doesNotMatch(employmentBlock, /card:/)
  assert.ok(STRINGS.INDEX_AI_ACTIVITY.includes('筹备中'))
  assert.ok(STRINGS.INDEX_AI_EMPLOYMENT.includes('筹备中'))
  assert.equal(STRINGS.AI_COMPETITION_CARD_DESC, '最新赛事报名与赛道信息')
})

test('home ad popup shows once per launch with dismiss-today storage', async () => {
  const source = await readFile(file('pages/index/index.tsx'), 'utf8')
  const adPopup = await readFile(file('components/AdPopup/index.tsx'), 'utf8')

  // 废弃的写死演示页已删除，登录后弹窗改由后台 popup 配置驱动。
  // 每次冷启动只尝试弹一次；选「今日不再弹出」后按天写本地存储。
  assert.match(source, /import \{ AdPopup \} from '@\/components\/AdPopup'/)
  assert.match(source, /popupShownRef\.current = true/)
  assert.match(source, /popupDismissKey\(/)
  assert.match(source, /AD_POPUP_DISMISS_TODAY|onDismissToday=\{dismissPopupToday\}/)
  assert.match(adPopup, /AD_POPUP_DISMISS_TODAY/)
  assert.match(adPopup, /navigateToUrl\(jumpLink\)/)
  assert.ok(STRINGS.AD_POPUP_DISMISS_TODAY, '今日不再弹出')
})
