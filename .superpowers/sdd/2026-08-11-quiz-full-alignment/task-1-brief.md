# Task 1: 建立可执行的类型检查与测试门禁

## Context

This is the foundation task for the full WeChat mini-program quiz alignment. Work only in `Platform`. Do not implement quiz business behavior yet.

## Files

- Modify: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`
- Create: `src/features/quiz/__tests__/testHarness.test.ts`

## Required interface

Produce these commands:

- `npm run typecheck`
- `npm test -- --run`
- `npm run build:weapp`
- `npm run quality:quiz`

## Requirements

1. First locate a usable Node/npm installation that may not be on PATH. Record exact paths and versions. If none exists, report BLOCKED before editing dependency files because RED/GREEN verification would be impossible.
2. Add scripts: `typecheck: tsc --noEmit -p tsconfig.json`, `test: vitest`, and `quality:quiz: npm run typecheck && npm test -- --run && npm run build:weapp`.
3. Add dev dependencies `@testing-library/react ^16.3.0`, `@testing-library/jest-dom ^6.6.3`, `jsdom ^26.1.0`, `vitest ^3.2.4`.
4. Create strict project-level `tsconfig.json`: `strict`, `noEmit`, `jsx: react-jsx`, `baseUrl: .`, alias `@/* -> src/*`; include `src`, `types`, `config`, `vitest.config.ts`; exclude `dist`, `node_modules`. Follow Taro's existing type requirements. Do not weaken strictness or hide business errors with broad exclusions.
5. Create `vitest.config.ts` with `@` resolving to `src`, `jsdom`, and `src/test/setup.ts`.
6. Setup imports `@testing-library/jest-dom/vitest`.
7. TDD: write a real config loading test first. It must load the Vitest config and assert the observable alias target ends in `/src` and the environment is `jsdom`. Do not write `expect(true)` or a source-text grep.
8. Run the test and observe the expected failure before implementation; then install/update the lockfile, implement the minimum config, and observe it pass.
9. Run `npm run typecheck`. Existing source errors may remain for later tasks, but list every error; do not lower compiler strictness to make them disappear.
10. Self-review the diff. Commit with `git -c core.hooksPath=NUL commit -m "test: add quiz frontend quality gates"` because this Windows checkout's Husky hook requires unavailable `/usr/bin/env sh`.

## Global constraints

- Backend 22 user operations are the only eventual API scope.
- No old quiz compatibility endpoints, mock fallbacks, manual wrong-book writes, manual check-in, or local exam settlement.
- All feature/bug behavior must follow RED-GREEN-REFACTOR.

## Report contract

Write the full report to `.superpowers/sdd/2026-08-11-quiz-full-alignment/task-1-report.md` with: status (`DONE`, `DONE_WITH_CONCERNS`, `NEEDS_CONTEXT`, or `BLOCKED`), files changed, RED evidence, GREEN evidence, typecheck output, commit hash, self-review, and concerns. Return only status, commits, one-line test summary, and concerns.

