3a53892 test: isolate Vitest config loading from jsdom
 src/features/quiz/__tests__/domEnvironment.test.ts | 9 +++++++++
 src/features/quiz/__tests__/testHarness.test.ts    | 4 +++-
 2 files changed, 12 insertions(+), 1 deletion(-)
diff --git a/src/features/quiz/__tests__/domEnvironment.test.ts b/src/features/quiz/__tests__/domEnvironment.test.ts
new file mode 100644
index 0000000..3c2b68a
--- /dev/null
+++ b/src/features/quiz/__tests__/domEnvironment.test.ts
@@ -0,0 +1,9 @@
+import { expect, it } from 'vitest'
+
+it('provides DOM assertions in the default test environment', () => {
+  const element = document.createElement('div')
+
+  document.body.append(element)
+  expect(element).toBeInTheDocument()
+  element.remove()
+})
diff --git a/src/features/quiz/__tests__/testHarness.test.ts b/src/features/quiz/__tests__/testHarness.test.ts
index d4ed603..350963d 100644
--- a/src/features/quiz/__tests__/testHarness.test.ts
+++ b/src/features/quiz/__tests__/testHarness.test.ts
@@ -1,14 +1,16 @@
+// @vitest-environment node
+
 import vitestConfig from '../../../../vitest.config'
 import { describe, expect, it } from 'vitest'
 
 describe('quiz test harness', () => {
-  it('loads the src alias in the jsdom environment', () => {
+  it('loads the src alias and declares jsdom as the default environment', () => {
     const alias = vitestConfig.resolve?.alias
     const srcAlias = Array.isArray(alias)
       ? alias.find((entry) => entry.find === '@')?.replacement
       : (alias as Record<string, string> | undefined)?.['@']
 
     expect(srcAlias?.replace(/\\/g, '/')).toMatch(/\/src$/)
     expect(vitestConfig.test?.environment).toBe('jsdom')
   })
 })

