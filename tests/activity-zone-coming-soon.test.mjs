import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { STRINGS } from '../src/constants/strings.ts'
import { getHomeQuickEntries } from '../src/constants/homeEntries.ts'

const file = (p) => new URL(`../src/${p}`, import.meta.url)

test('activity zone defaults to competition and shows preparing empty states', async () => {
  const source = await readFile(file('pages/activity-zone/index.tsx'), 'utf8')
  assert.match(source, /useState<MainTab>\('competition'\)/)
  assert.match(source, /showActivityEmpty = activitiesLoaded && allActivities\.length === 0/)
  assert.match(source, /showCompetitionEmpty = competitionsLoaded && allCompetitions\.length === 0/)
  assert.match(source, /showYingcaiEmpty = yingcaiLoaded && allYingcai\.length === 0/)
  // 活动/竞赛/英才空态时不得再渲染“全部/进行中/即将开始/已结束”筛选标签
  assert.match(source, /showTagFilter =\s*\(mainTab === 'competition' && !showCompetitionEmpty\) \|\|\s*\(mainTab === 'activity' && !showActivityEmpty\) \|\|\s*\(mainTab === 'yingcai' && !showYingcaiEmpty\)/)
  assert.match(source, /title=\{STRINGS\.ACTIVITY_EMPTY_TITLE\}/)
  assert.match(source, /title=\{STRINGS\.COMPETITION_EMPTY_TITLE\}/)
  assert.match(source, /title=\{STRINGS\.YINGCAI_EMPTY_TITLE\}/)
  // 竞赛子页不展示运营横幅，列表内容直接从筛选区开始。
  assert.doesNotMatch(source, /ZoneBanner|currentBanner|bannerWrap/)
  assert.doesNotMatch(source, /`联系：\$\{item\.contact_info\}`/)
  // 活动卡片与竞赛卡片同构：仅封面 + 标题 + 状态角标，明细（时间/地点/描述）一律进详情页。
  const activityBlock = source.match(/mainTab === 'activity' && \([\s\S]*?mainTab === 'competition'/)?.[0] ?? ''
  assert.ok(activityBlock, 'activity list block should exist')
  assert.doesNotMatch(activityBlock, /subtitle=|tags=\{|buttonText=|remindActivity/)
  assert.match(activityBlock, /coverUrl=\{resolveMediaUrl\(item\.cover_url\)\}/)
  // 已结束活动保留淡化样式标识。
  assert.match(activityBlock, /isFaded=\{status\.label === STRINGS\.ACTIVITY_ENDED\}/)
  // 英才计划 tab 与活动卡同构（封面 + 状态角标），点击直达活动详情页；就业岗位卡（薪资/按钮）已随专区关闭移除。
  assert.ok(source.includes("mainTab === 'yingcai' && ("), 'yingcai list block should exist')
  assert.doesNotMatch(source, /salary_range|employment-zone\/detail|getJobList/)
  assert.match(source, /getActivityList\(\{ category: 'yingcai' \}\)/)
  assert.doesNotMatch(source, /\$\{item\.start_time[^}]*\}-\$\{item\.end_time/)
})

test('home activity and employment surfaces follow backend content visibility', async () => {
  const source = await readFile(file('pages/index/index.tsx'), 'utf8')
  // 活动入口只随可用内容出现，无活动不补占位。
  // 岗位不设金刚区入口；2026-11-09 起就业专区关闭，英才计划原位替代且同样不设金刚区入口。
  assert.match(source, /hasActivities: activities\.length > 0/)
  const entries = getHomeQuickEntries({ homeCertEntryVisible: false, certRegistration: true, hasActivities: true })
  assert.equal(entries.find(item => item.tab === 'activity')?.url, '/pages/activity-zone/index')
  assert.equal(entries.some(item => item.tab === 'employment'), false)
  assert.equal(entries.some(item => item.tab === 'yingcai'), false)
  assert.doesNotMatch(source, /INDEX_ZONE_COMING_SOON|CERT_REG_PLACEHOLDER_ITEM/)
  const activeSource = source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '')
  assert.doesNotMatch(activeSource, /tab: 'employment'/)
  assert.doesNotMatch(activeSource, /tab: 'yingcai'/)
  // 首页板块导航（2026-10-15 起）：活动/英才 tab 均按内容有无显示/隐藏。
  assert.match(source, /activities\.length > 0\) tabs\.push\(\{ key: 'activity'/)
  assert.match(source, /FEATURES\.yingcaiZone && yingcaiActivities\.length > 0\) tabs\.push\(\{ key: 'yingcai'/)
  assert.equal(STRINGS.INDEX_ZONE_COMING_SOON, '敬请期待')
})

test('home waterfall replaced by content-driven section tabs', async () => {
  const source = await readFile(file('pages/index/index.tsx'), 'utf8')
  const tabs = await readFile(file('components/HomeSectionTabs/index.tsx'), 'utf8')
  const tabsStyle = await readFile(file('components/HomeSectionTabs/index.module.scss'), 'utf8')

  // 2026-10-15 甲方要求：首页瀑布流改为导航栏切换，筛选栏位于金刚区（各专区宫格）下方、板块列表之前。
  assert.match(source, /tabs=\{sectionTabs\}[\s\S]*?activeKey=\{activeSection\}/)
  const kingKongAt = source.indexOf('<KingKongZone')
  const tabsAt = source.indexOf('<HomeSectionTabs')
  const tabContentAt = source.indexOf("{activeSection === 'cert'")
  assert.ok(kingKongAt !== -1, 'KingKongZone should render')
  assert.ok(tabsAt > kingKongAt, 'section tabs must sit below the KingKong zone grid')
  assert.ok(tabContentAt > tabsAt, 'tab content must sit below the section tabs')
  // 五个板块全部内容驱动：无内容不出现 tab，顺序与原瀑布流一致。
  assert.match(source, /certificationCards\.length > 0\) tabs\.push\(\{ key: 'cert'/)
  assert.match(source, /studyCourses\.length > 0\) tabs\.push\(\{ key: 'study'/)
  assert.match(source, /competitionList\.length > 0\) tabs\.push\(\{ key: 'competition'/)
  assert.match(source, /activities\.length > 0\) tabs\.push\(\{ key: 'activity'/)
  assert.match(source, /FEATURES\.yingcaiZone && yingcaiActivities\.length > 0\) tabs\.push\(\{ key: 'yingcai'/)
  // 后台下架导致当前 tab 消失时回落到第一个 tab。
  assert.match(source, /!sectionTabs\.some\(tab => tab\.key === activeSection\)/)
  // 原五段堆叠板块的「查看全部」小节头不再渲染。
  assert.doesNotMatch(source, /SectionHeader/)
  // 组件：横排 tab 点击切换 + 激活态主色下划线。
  assert.match(tabs, /onChange\(tab\.key\)/)
  assert.match(tabsStyle, /background: \$color-primary/)
})

test('home king-kong grid keeps the study zone entry visible', async () => {
  const source = await readFile(file('pages/index/index.tsx'), 'utf8')
  const entries = getHomeQuickEntries({ homeCertEntryVisible: false, certRegistration: true, hasActivities: false })
  assert.equal(entries.find(item => item.name === STRINGS.INDEX_ZONE_STUDY)?.url, '/pages/training/index')
  assert.match(source, /getHomeQuickEntries\(\{/)
  assert.match(source, /columns=\{kingKongItems\.length === 3 \? 3 : 2\}/)
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
  assert.match(source, /certificationCards\.length > 0\) tabs\.push\(\{ key: 'cert'/)
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
  assert.ok(activityBlock, 'activity intent builder should exist')
  assert.doesNotMatch(activityBlock, /card:/)
  assert.ok(STRINGS.INDEX_AI_ACTIVITY.includes('筹备中'))
  // 2026-11-09 就业专区彻底关闭：岗位意图与话术整体移除，相关提问走默认回复。
  assert.doesNotMatch(source, /employment/)
  assert.equal('INDEX_AI_EMPLOYMENT' in STRINGS, false)
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
