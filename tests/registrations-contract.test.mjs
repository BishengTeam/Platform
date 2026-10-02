import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('my registrations dispatches details and actions by certification vendor', async () => {
  const page = await readFile('src/pages/mine/registrations.tsx', 'utf8')

  assert.match(page, /type H3cRegistrationCard = H3cRegistration & \{ type: 'H3C' \}/)
  assert.match(page, /type NispRegistrationCard = NispRegistration & \{\s*type: 'NISP'/)
  assert.match(page, /type UnifiedRegistration = H3cRegistrationCard \| NispRegistrationCard/)
  assert.match(page, /if \(item\.type === 'H3C'\) \{[\s\S]*h3cService\.getRegistration/)
  assert.match(page, /nispService\.getRegistration\(item\.id\)/)
  assert.match(page, /if \(registration\.type === 'H3C'\) \{[\s\S]*h3cService\.cancelPayment/)
  assert.match(page, /nispService\.cancelPayment\(registration\.id\)/)
  assert.match(page, /nispService\.resubmitMaterials\(registration\.id/)
  assert.match(page, /snapshotText\(selected\?\.candidate_snapshot, 'exam_date'\)/)
})

test('NISP picker indexes options with a validated numeric index', async () => {
  const page = await readFile('src/pages/nisp/form.tsx', 'utf8')

  assert.match(page, /const index = Number\(e\.detail\.value\)/)
  assert.match(page, /Number\.isInteger\(index\) && index >= 0 && index < options\.length/)
  assert.doesNotMatch(page, /options\[e\.detail\.value\]/)
})
