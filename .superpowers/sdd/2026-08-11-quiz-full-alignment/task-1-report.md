# Task 1 report: quiz frontend quality gates

## Status

BLOCKED

Node/npm discovery: `E:\Users\21202\AppData\Local\Doubao\User Data\Default\sandbox_envs_dir\envs\234e00a2-2766-427c-848b-7c3727495eac\node\node.exe` is Node `v20.20.2`; the sibling `npm.cmd` is npm `10.8.2`. `node` and `npm` were not on PATH. The registry's `E:\Program Files\nodejs` entry was stale.

## Files changed

- `package.json` — adds `typecheck`, `test`, and `quality:quiz`, plus the four requested dev-dependency ranges.
- `tsconfig.json` — strict no-emit project typecheck, Taro types, and `@/*` alias.
- `vitest.config.ts` — `@` resolves to `src`, uses jsdom, and loads test setup.
- `src/test/setup.ts` — loads `@testing-library/jest-dom/vitest`.
- `src/features/quiz/__tests__/testHarness.test.ts` — loads the real Vitest config and asserts the observable alias target ends in `/src` and the environment is `jsdom`.

`package-lock.json` is deliberately unchanged; see concerns.

## RED evidence

Test written before the test command/config existed, then executed:

```text
> npm test -- --run src/features/quiz/__tests__/testHarness.test.ts
npm error Missing script: "test"
```

This was the expected pre-implementation failure: the required test gate did not exist.

## GREEN evidence

After adding the scripts and minimum config:

```text
> npm test -- --run
 RUN  v4.1.10
 Test Files  1 passed (1)
 Tests  1 passed (1)
```

`npm run build:weapp` exited `0`; Taro built 1189 modules. It emitted existing Sass legacy-API and dependency `eval` warnings.

`npm run quality:quiz` executes the intended chain and stops at the strict typecheck gate (exit `1`), so it does not run test/build in that chained invocation.

## Typecheck output

`npm run typecheck` exits `1`. All reported diagnostics are existing source issues; the new config/test files have no typecheck diagnostic after the final test-harness correction.

```text
src/components/FloatingService/index.tsx:67:7 TS2322
src/components/FloatingService/index.tsx:68:7 TS2322
src/components/ZoneBanner/index.tsx:71:46 TS2538
src/components/ZoneBanner/index.tsx:80:30 TS2322
src/pages/activity-zone/index.tsx:254:23 TS2322
src/pages/activity-zone/index.tsx:255:28 TS2339
src/pages/mine/agreements.tsx:103:41 TS2339
src/pages/mine/edit-profile.tsx:309:30 TS2345
src/pages/mine/edit-profile.tsx:361:29 TS2345
src/pages/mine/edit-profile.tsx:434:14 TS2741
src/pages/mine/profile.tsx:74:21 TS2322
src/pages/profile/index.tsx:23:19 TS2345
src/pages/profile/index.tsx:24:21 TS2345
src/pages/quiz/mock.tsx:96:20,97:21,100:18,110:20,111:21,114:18 TS2345
src/pages/quiz/mock.tsx:195:88,198:89 TS2345
src/pages/quiz/practice.tsx:86:20,87:21,90:18,100:20,101:21,105:18 TS2345
src/pages/quiz/practice.tsx:175:88,178:89 TS2345
src/pages/registration/components/IdentityCheckGate.tsx:14:42,36:41 TS2694
src/pages/registration/components/NispExtraSection.tsx:50:57 TS2551
src/pages/registration/form-nisp.tsx:165:33 TS2554
src/pages/registration/form-renshe.tsx:102:33 TS2554
src/pages/registration/form-sangfor.tsx:134:33 TS2554
src/pages/training/index.tsx:15:42 TS2305
src/pages/training/index.tsx:109:27 TS18048
src/pages/training/index.tsx:138:58 TS2322
src/services/userService.ts:41:25 TS2304
src/services/userService.ts:54:75 TS2339
src/services/userService.ts:130:9 TS2322
src/services/userService.ts:152:50 TS2367
src/services/userService.ts:494:17 TS2739
src/services/userService.ts:556:38 TS2339
src/services/userService.ts:556:43 TS7006
src/services/userService.ts:635:3 TS2322
src/services/userService.ts:665:3 TS2322
src/services/userService.ts:692:3 TS2322
src/services/userService.ts:829:5 TS2739
src/services/userService.ts:851:5,852:5,853:5,854:5 TS2783
src/services/userService.ts:864:5 TS2739
src/services/userService.ts:879:5 TS2739
src/services/userService.ts:894:5,895:5 TS2322
src/services/userService.ts:904:5 TS2739
src/services/userService.ts:919:5 TS2739
src/services/zoneService.ts:90:12 TS2352
src/services/zoneService.ts:93:25,94:25 TS2339
src/services/zoneService.ts:154:16 TS2339
src/services/zoneService.ts:154:20 TS7006
src/services/zoneService.ts:161:3 TS2322
src/services/zoneService.ts:168:3 TS2322
```

## Commit

`53578229e9df8558972553362fb697db1f805302` — `test: add quiz frontend quality gates`

## Self-review

- Confirmed the commit contains only the five task implementation files; the controller's staged design document was restored to its original staged state and is not in this commit.
- Confirmed `git diff --check` reported no whitespace errors for the task diff.
- The test exercises imported config behavior; it does not grep config source text.
- Strict compiler settings are not weakened with broad source exclusions.

## Concerns

- The required dependency install/lockfile update could not complete. The first online npm install timed out after 120 seconds; an escalated retry could not access the temporary Node runtime; two bounded offline retries failed with `ENOTCACHED` for `@asamuzakjp/css-color` and `@adobe/css-tools`. Existing `node_modules` supplies extraneous versions (Vitest `4.1.10`, jsdom `29.1.1`, jest-dom `7.0.1`), so GREEN evidence is not against the requested locked dependency versions.
- `package.json` now declares the required ranges but `package-lock.json` does not yet record them. A successful networked `npm install --save-dev @testing-library/react@^16.3.0 @testing-library/jest-dom@^6.6.3 jsdom@^26.1.0 vitest@^3.2.4 --ignore-scripts --no-audit --no-fund` is still required before this gate is reproducible from a clean checkout.
- `typecheck` intentionally exposes the listed pre-existing project errors; `quality:quiz` consequently fails at its first gate.

## Fix round 1/5 — reviewer follow-up

Status: BLOCKED.

### Executable RED evidence

The existing real config-loading test was run by Vitest while the alias was deliberately mutated from `src` to `src-not-configured`. It failed at the expected behavior assertion:

```text
RUN  v4.1.10
Tests  1 failed (1)
AssertionError: expected ".../src-not-configured" to match /\\/src$/
src/features/quiz/__tests__/testHarness.test.ts:11
```

The production config was immediately restored to `path.resolve(__dirname, 'src')`. No implementation change remains from the mutation.

### Lockfile outcome

A workspace-local Node/npm copy was successfully created under ignored `node_modules/.codex-portable-node` and verified as Node `v20.20.2` / npm `10.8.2`. The one approved, time-boxed install command was:

```text
npm install --save-dev @testing-library/react@^16.3.0 @testing-library/jest-dom@^6.6.3 jsdom@^26.1.0 vitest@^3.2.4 --ignore-scripts --legacy-peer-deps --no-audit --no-fund
```

It was interrupted by the controller time box after 364.4 seconds and made no `package.json` or `package-lock.json` diff. Final read-only inspection confirmed the lockfile still does not contain the four root dev-dependency declarations. Therefore `npm ci` reproducibility cannot be verified and no locked-dependency GREEN run was possible. No further install attempts were made.

No fix-round commit was created because there are no fix files to commit; the previous task implementation commit remains `53578229e9df8558972553362fb697db1f805302`.

## Fix round 2/5 — reviewer follow-up

Status: BLOCKED.

The single permitted lockfile-only attempt used the workspace-local npm with the required explicit registry and workspace cache:

```text
node_modules\.codex-portable-node\npm.cmd install --package-lock-only --ignore-scripts --no-audit --no-fund --registry=https://registry.npmjs.org/ --cache=.npm-cache
```

The command produced no output before it was interrupted at the controller's 120-second time box. Per the round instructions, it was not retried and no full install was run. Because the attempt did not complete successfully, root lock-entry verification, the focused config GREEN test, and a package-lock-only commit were not performed. The exact blocker is the bounded npm lockfile-only operation failing to complete within the allowed time.

## Fix round 3/5 — reviewer follow-up

Status: BLOCKED.

The single permitted bounded offline alignment attempt used the workspace-local Node/npm directory on `PATH`:

```text
npm install --offline --ignore-scripts --no-audit --no-fund
```

It exited `1` after 2.5 seconds. Exact terminal evidence:

```text
npm warn cleanup Failed to remove some directories
EPERM: operation not permitted, rmdir 'D:\Users\21202\Documents\文件\工作室\projects\Customer\Platform\node_modules\jsdom'
npm error code ENOTCACHED
npm error request to https://registry.npmjs.org/ws/-/ws-8.21.3.tgz failed: cache mode is 'only-if-cached' but no cached response is available.
npm error Log files were not written due to an error writing to the directory: C:\Users\21202\AppData\Local\npm-cache\_logs
```

The invocation did not bind npm's cache setting to the workspace `.npm-cache`, so npm consulted its default cache and could not find `ws-8.21.3.tgz`. Per the one-attempt constraint, no retry was made. The focused test, `npm ls`, and lockfile commit were not performed because installed dependencies were not successfully aligned.

## Fix round 4/5 — dependency alignment follow-up

Status: DONE_WITH_CONCERNS.

The portable Node/npm runtime was first copied out of `node_modules` to ignored `.superpowers/tools/node` and verified as Node `v20.20.2` / npm `10.8.2`. No running process was using the old `node_modules/.codex-portable-node` runtime. With the isolated runtime first on `PATH`, the prescribed bounded online install completed successfully in 18.1 seconds:

```text
npm install --ignore-scripts --no-audit --no-fund --registry=https://registry.npmjs.org/ --cache=.npm-cache

added 32 packages, removed 20 packages, and changed 32 packages in 17s
```

Installed and locked dependency evidence:

```text
@testing-library/jest-dom@6.9.1
@testing-library/react@16.3.2
jsdom@26.1.0
vitest@3.2.7
```

The focused test under the configured `jsdom` environment exits `1` before collection:

```text
Test Files  1 failed (1)
Tests       no tests
Error: Invariant violation: "new TextEncoder().encode("") instanceof Uint8Array" is incorrectly false
```

Diagnosis: the copied Node runtime itself returns `true` for that invariant, and the same focused test passes (`1 passed`) with the diagnostic CLI override `--environment=node`. The failure is therefore at the Vitest 3.2.7/jsdom 26 realm boundary when the test imports the Vitest config and esbuild initializes, not an incomplete dependency install. No source/config change was made in this lockfile-only round.

Commit: `45f938e999518d1cd28276082e477ee7304bfd3e` (`test: lock quiz frontend quality dependencies`). The commit contains only `package-lock.json`.

## Fix round 5/5 - environment-boundary follow-up

Status: DONE_WITH_CONCERNS.

### Root cause and fix

With the locked Vitest `3.2.7` and jsdom `26.1.0`, the config-loading test inherited the configured jsdom environment. Importing `vitest.config.ts` then initialized esbuild with jsdom's cross-realm globals and violated esbuild's `TextEncoder`/`Uint8Array` identity invariant before test collection. The same unchanged test passed with Vitest's Node-environment CLI control.

The config-loading test now uses the supported per-file `// @vitest-environment node` control comment because build-tool configuration belongs to Node. The global config remains `jsdom`. A separate default-environment test creates and attaches a real DOM element and verifies it with the `toBeInTheDocument()` matcher supplied by `src/test/setup.ts`.

### Files changed

- `src/features/quiz/__tests__/testHarness.test.ts` - runs only config loading under Node while retaining the alias and declared-jsdom assertions.
- `src/features/quiz/__tests__/domEnvironment.test.ts` - proves the configured default jsdom environment and jest-dom setup through real DOM behavior.

### RED evidence

Before the environment control was added, the focused pair ran under the isolated `.superpowers/tools/node` runtime. The new DOM sanity test passed, while the unchanged config-loading test failed before collection with:

```text
Test Files  1 failed | 1 passed (2)
Tests       1 passed (1)
Error: Invariant violation: "new TextEncoder().encode("") instanceof Uint8Array" is incorrectly false
```

### GREEN evidence

Fresh focused verification, again with `.superpowers/tools/node` first on `PATH`:

```text
npm test -- --run src/features/quiz/__tests__/testHarness.test.ts src/features/quiz/__tests__/domEnvironment.test.ts
Test Files  2 passed (2)
Tests       2 passed (2)
```

Installed dependency verification exited `0`:

```text
@testing-library/jest-dom@6.9.1
@testing-library/react@16.3.2
jsdom@26.1.0
vitest@3.2.7
```

`git diff --check` for both fix files exited `0`.

### Typecheck

`npm run typecheck -- --pretty false` still exits `1` on the previously documented application-source diagnostics. Neither changed test file appears in the diagnostics.

### Commit

`3a53892` - `test: isolate Vitest config loading from jsdom`. The commit contains only the two test files above. The unrelated staged design document was preserved outside the commit.

### Self-review and concerns

- The global environment remains `jsdom`; dependency ranges and the lockfile were not changed.
- The config test retains both observable assertions without source-text inspection or weaker matching.
- The DOM test would fail if the configured environment stopped providing `document` or if the jest-dom setup stopped registering its matcher.
- The project-wide strict typecheck remains red on pre-existing application errors, so `quality:quiz` still stops at that first gate.
