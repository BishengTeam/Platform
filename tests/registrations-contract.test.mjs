import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('my registrations uses a standalone detail page for every vendor', async () => {
  const page = await readFile('src/pages/mine/registrations.tsx', 'utf8')
  const detail = await readFile('src/pages/mine/registration-detail.tsx', 'utf8')
  const consultation = await readFile(
    'src/components/ConsultationGroupCard/index.tsx',
    'utf8',
  )
  const routes = await readFile('src/constants/routes.ts', 'utf8')
  const appConfig = await readFile('src/app.config.ts', 'utf8')

  assert.match(page, /type H3cRegistrationCard = H3cRegistration & \{ type: 'H3C' \}/)
  assert.match(page, /type NispRegistrationCard = NispRegistration & \{\s*type: 'NISP'/)
  assert.match(page, /type UnifiedRegistration = H3cRegistrationCard \| NispRegistrationCard/)
  assert.match(page, /function registrationDetailUrl\(category: RegistrationCategory, id: number\)/)
  assert.match(page, /registrationDetailUrl\('renshe', item\.id\)/)
  assert.match(page, /registrationDetailUrl\('competition', item\.id\)/)
  assert.match(page, /registrationDetailUrl\('sangfor', item\.id\)/)
  assert.doesNotMatch(page, /detailMask|detailSheet|setSelected\(/)
  assert.match(routes, /MINE_REGISTRATION_DETAIL: 'pages\/mine\/registration-detail'/)
  assert.match(appConfig, /'registration-detail'/)

  assert.match(detail, /const kind = parseRegistrationKind\(params\?\.type\)/)
  assert.match(detail, /if \(kind === 'h3c'\) \{[\s\S]*h3cService\.getRegistration\(registrationId\)/)
  assert.match(detail, /if \(kind === 'nisp'\) \{[\s\S]*nispService\.getRegistration\(registrationId\)/)
  assert.match(detail, /getMyCompetitionRegistrations\(\)/)
  assert.match(detail, /competitions\.find\(item => item\.id === registrationId\)/)
  assert.match(detail, /if \(certRegistration\.kind === 'H3C'\) \{[\s\S]*h3cService\.cancelPayment/)
  assert.match(detail, /nispService\.cancelPayment\(certRegistration\.id\)/)
  assert.match(detail, /nispService\.resubmitMaterials\(registration\.id/)
  assert.match(detail, /snapshotText\(certRegistration\?\.candidate_snapshot, 'exam_date'\)/)
  assert.match(detail, /certRegistration\.kind === 'NISP'[\s\S]*certRegistration\.status === 'final_approved'/)
  assert.match(detail, /www\.cisp\.cn/)
  assert.match(detail, /官网登录账号/)
  assert.match(detail, /snapshotText\(certRegistration\.candidate_snapshot, 'phone'\)/)
  assert.match(detail, /<JourneyPanel vendor=\{kind\} id=\{registrationId\}/)
  const journey = await readFile('src/components/CertificationEnrollment/JourneyPanel.tsx', 'utf8')
  assert.match(journey, /<ConsultationGroupCard group=\{journey\.consultation_group\}/)
  assert.match(consultation, /resolveMediaUrl\(group\.qrcode_url\)/)
  assert.match(consultation, /批次咨询群/)
  assert.match(consultation, /长按识别加入咨询群/)
  assert.match(consultation, /二维码暂时无法显示/)
  assert.match(consultation, /contact_phone/)
})

test('my registrations uses data-driven cascading pill filters', async () => {
  const page = await readFile('src/pages/mine/registrations.tsx', 'utf8')
  const style = await readFile('src/pages/mine/registrations.module.scss', 'utf8')

  assert.match(page, /const CATEGORY_ORDER: RegistrationCategory\[\]/)
  assert.match(page, /const categoryTabs = useMemo\(/)
  assert.match(page, /CATEGORY_ORDER\.filter\(category => present\.has\(category\)\)/)
  assert.match(page, /const statusTabs = useMemo\(/)
  assert.match(page, /STATUS_GROUP_ORDER\.filter\(group => present\.has\(group\)\)/)
  assert.match(page, /const handleCategoryChange = \(key: 'all' \| RegistrationCategory\) => \{[\s\S]*?setActiveStatus\('all'\)/)
  assert.match(page, /activeCategory !== 'all' && !categoryTabs\.some/)
  assert.match(page, /activeStatus !== 'all' && !statusTabs\.some/)
  assert.match(page, /当前筛选无结果/)
  assert.match(page, /暂无报名记录/)
  assert.match(style, /\.filterRow\s*\{[\s\S]*?flex-wrap: wrap/)
  assert.match(style, /\.filterTagActive\s*\{[\s\S]*?background: #e8f3ff/)
})

test('registration navigation hands off an immediate preview and press feedback', async () => {
  const [list, detail, style, auth] = await Promise.all([
    readFile('src/pages/mine/registrations.tsx', 'utf8'),
    readFile('src/pages/mine/registration-detail.tsx', 'utf8'),
    readFile('src/pages/mine/registrations.module.scss', 'utf8'),
    readFile('src/hooks/useAuth.ts', 'utf8'),
  ])

  assert.match(list, /preloadRegistrationPreview\(\{[\s\S]*?key: card\.key/)
  assert.match(list, /const openRegistrationCard = \(card: RegistrationCard\) =>/)
  assert.match(list, /openingKey === card\.key \? styles\.cardOpening/)
  assert.match(style, /\.cardOpening\s*\{[\s\S]*?transform: scale\(\.985\)/)
  assert.match(detail, /readRegistrationPreview\(previewKey\)/)
  assert.match(detail, /loading && preview/)
  assert.match(detail, /详情加载中\.\.\./)
  const sangforDetail = await readFile('src/pages/sangfor/detail.tsx', 'utf8')
  assert.match(sangforDetail, /readRegistrationPreview\(`sangfor-\$\{id\}`\)/)
  assert.match(sangforDetail, /loading && preview/)
  assert.match(auth, /useState\(initiallyLoggedIn\)/)
  assert.match(auth, /const \[isChecked, setIsChecked\] = useState\(initiallyLoggedIn\)/)
})

test('NISP picker indexes options with a validated numeric index', async () => {
  const page = await readFile('src/pages/nisp/form.tsx', 'utf8')

  assert.match(page, /const index = Number\(e\.detail\.value\)/)
  assert.match(page, /Number\.isInteger\(index\) && index >= 0 && index < options\.length/)
  assert.doesNotMatch(page, /options\[e\.detail\.value\]/)
})
