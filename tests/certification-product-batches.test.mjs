import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('three certification vendors share the NISP product and batch presentation', async () => {
  const [
    registrationIndex,
    category,
    navigation,
    sharedCard,
    nispIndex,
    h3cIndex,
    rensheIndex,
  ] = await Promise.all([
    readFile('src/pages/registration/index.tsx', 'utf8'),
    readFile('src/pages/registration/category.tsx', 'utf8'),
    readFile('src/utils/certNavigation.ts', 'utf8'),
    readFile('src/components/CertBatchCard/index.tsx', 'utf8'),
    readFile('src/pages/nisp/index.tsx', 'utf8'),
    readFile('src/pages/h3c/index.tsx', 'utf8'),
    readFile('src/pages/renshe/index.tsx', 'utf8'),
  ])

  assert.match(registrationIndex, /category\?vendor=\$\{encodeURIComponent\(vendor\)\}/)
  assert.doesNotMatch(registrationIndex, /ROUTES\.H3C_INDEX/)
  assert.match(category, /ZoneCard/)
  assert.match(category, /resolveMediaUrl\(cert\.home_cover_url\)/)
  assert.match(category, /rensheService\.listProjects\(\)/)
  assert.match(category, /title=\{cert\.chinese_name \|\| cert\.name\}/)
  assert.match(
    category,
    /cert\.vendor === '人社' \? occupationCodes\[cert\.id\] : undefined/,
  )

  assert.match(navigation, /ROUTES\.NISP_INDEX\}\?level=\$\{level\}/)
  assert.match(navigation, /ROUTES\.H3C_INDEX\}\?cert_code=\$\{encodeURIComponent\(cert\.code\)\}/)
  assert.match(navigation, /ROUTES\.RENSHE_INDEX\}\?project_id=\$\{cert\.id\}/)

  for (const page of [nispIndex, h3cIndex, rensheIndex]) {
    assert.match(page, /CertBatchCard/)
    assert.match(page, /RefreshableScrollView/)
    assert.match(page, /加载失败，点击重试/)
  }
  assert.match(sharedCard, /badgeTone/)
  assert.match(sharedCard, /infoItems/)
  assert.match(sharedCard, /actionDisabled/)
})

test('certification batch cards preserve vendor-specific business data', async () => {
  const [nispIndex, h3cIndex, rensheIndex] = await Promise.all([
    readFile('src/pages/nisp/index.tsx', 'utf8'),
    readFile('src/pages/h3c/index.tsx', 'utf8'),
    readFile('src/pages/renshe/index.tsx', 'utf8'),
  ])

  assert.match(nispIndex, /formatNispApplyRange\(batch\)/)
  assert.match(nispIndex, /level1_price_cents/)
  assert.match(nispIndex, /level2_price_cents/)

  assert.match(h3cIndex, /batch\.certification_code === certCode/)
  assert.match(h3cIndex, /batch\.prices\.map/)
  assert.match(h3cIndex, /actionDisabled=\{!canRegister\}/)
  assert.match(h3cIndex, /H3C_FORM\}\?batch_id=/)

  assert.match(rensheIndex, /listBatches\(validProjectId\)/)
  assert.match(rensheIndex, /batch\.exam_type/)
  assert.match(rensheIndex, /batch\.application_type/)
  assert.match(rensheIndex, /batch\.price_cents/)
  assert.match(rensheIndex, /RENSHE_FORM\}\?plan_id=/)
})
