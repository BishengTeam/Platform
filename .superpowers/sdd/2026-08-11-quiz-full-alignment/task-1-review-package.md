5357822 test: add quiz frontend quality gates
 package.json                                    | 11 +++++++++--
 src/features/quiz/__tests__/testHarness.test.ts | 14 ++++++++++++++
 src/test/setup.ts                               |  1 +
 tsconfig.json                                   | 22 ++++++++++++++++++++++
 vitest.config.ts                                | 14 ++++++++++++++
 5 files changed, 60 insertions(+), 2 deletions(-)
diff --git a/package.json b/package.json
index 3b6855c..d963e92 100644
--- a/package.json
+++ b/package.json
@@ -22,21 +22,24 @@
     "build:jd": "taro build --type jd",
     "build:harmony-hybrid": "taro build --type harmony-hybrid",
     "dev:weapp": "npm run build:weapp -- --watch",
     "dev:swan": "npm run build:swan -- --watch",
     "dev:alipay": "npm run build:alipay -- --watch",
     "dev:tt": "npm run build:tt -- --watch",
     "dev:h5": "npm run build:h5 -- --watch",
     "dev:rn": "npm run build:rn -- --watch",
     "dev:qq": "npm run build:qq -- --watch",
     "dev:jd": "npm run build:jd -- --watch",
-    "dev:harmony-hybrid": "npm run build:harmony-hybrid -- --watch"
+    "dev:harmony-hybrid": "npm run build:harmony-hybrid -- --watch",
+    "typecheck": "tsc --noEmit -p tsconfig.json",
+    "test": "vitest",
+    "quality:quiz": "npm run typecheck && npm test -- --run && npm run build:weapp"
   },
   "browserslist": [
     "last 3 versions",
     "Android >= 4.1",
     "ios >= 8"
   ],
   "author": "",
   "dependencies": {
     "@babel/runtime": "^7.24.4",
     "@nutui/nutui-react-taro": "^3.0.19-cpp.29-beta.1",
@@ -79,13 +82,17 @@
     "husky": "^9.1.7",
     "lint-staged": "^16.1.2",
     "postcss": "^8.5.6",
     "react-refresh": "^0.14.0",
     "sass": "^1.99.0",
     "sharp": "^0.34.5",
     "stylelint": "^16.4.0",
     "stylelint-config-standard": "^38.0.0",
     "terser": "^5.30.4",
     "typescript": "^5.4.5",
-    "vite": "^4.2.0"
+    "vite": "^4.2.0",
+    "@testing-library/react": "^16.3.0",
+    "@testing-library/jest-dom": "^6.6.3",
+    "jsdom": "^26.1.0",
+    "vitest": "^3.2.4"
   }
 }
diff --git a/src/features/quiz/__tests__/testHarness.test.ts b/src/features/quiz/__tests__/testHarness.test.ts
new file mode 100644
index 0000000..d4ed603
--- /dev/null
+++ b/src/features/quiz/__tests__/testHarness.test.ts
@@ -0,0 +1,14 @@
+import vitestConfig from '../../../../vitest.config'
+import { describe, expect, it } from 'vitest'
+
+describe('quiz test harness', () => {
+  it('loads the src alias in the jsdom environment', () => {
+    const alias = vitestConfig.resolve?.alias
+    const srcAlias = Array.isArray(alias)
+      ? alias.find((entry) => entry.find === '@')?.replacement
+      : (alias as Record<string, string> | undefined)?.['@']
+
+    expect(srcAlias?.replace(/\\/g, '/')).toMatch(/\/src$/)
+    expect(vitestConfig.test?.environment).toBe('jsdom')
+  })
+})
diff --git a/src/test/setup.ts b/src/test/setup.ts
new file mode 100644
index 0000000..a9d0dd3
--- /dev/null
+++ b/src/test/setup.ts
@@ -0,0 +1 @@
+import '@testing-library/jest-dom/vitest'
diff --git a/tsconfig.json b/tsconfig.json
new file mode 100644
index 0000000..25fadd7
--- /dev/null
+++ b/tsconfig.json
@@ -0,0 +1,22 @@
+{
+  "compilerOptions": {
+    "target": "ESNext",
+    "module": "ESNext",
+    "moduleResolution": "Bundler",
+    "strict": true,
+    "noEmit": true,
+    "jsx": "react-jsx",
+    "baseUrl": ".",
+    "paths": {
+      "@/*": ["src/*"]
+    },
+    "allowJs": true,
+    "allowSyntheticDefaultImports": true,
+    "esModuleInterop": true,
+    "resolveJsonModule": true,
+    "skipLibCheck": true,
+    "types": ["@tarojs/components", "@tarojs/taro", "vitest/globals"]
+  },
+  "include": ["src", "types", "config", "vitest.config.ts"],
+  "exclude": ["dist", "node_modules"]
+}
diff --git a/vitest.config.ts b/vitest.config.ts
new file mode 100644
index 0000000..77fa20b
--- /dev/null
+++ b/vitest.config.ts
@@ -0,0 +1,14 @@
+import path from 'node:path'
+import { defineConfig } from 'vitest/config'
+
+export default defineConfig({
+  resolve: {
+    alias: {
+      '@': path.resolve(__dirname, 'src'),
+    },
+  },
+  test: {
+    environment: 'jsdom',
+    setupFiles: './src/test/setup.ts',
+  },
+})

