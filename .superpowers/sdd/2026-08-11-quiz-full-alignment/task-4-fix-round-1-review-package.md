bc7aa0b fix: respect quiz error status precedence
 src/features/quiz/__tests__/errors.test.ts | 7 +++++++
 src/features/quiz/errors.ts                | 4 +++-
 2 files changed, 10 insertions(+), 1 deletion(-)
diff --git a/src/features/quiz/__tests__/errors.test.ts b/src/features/quiz/__tests__/errors.test.ts
index f62e32d..046179e 100644
--- a/src/features/quiz/__tests__/errors.test.ts
+++ b/src/features/quiz/__tests__/errors.test.ts
@@ -42,20 +42,27 @@ describe('toQuizErrorState', () => {
     expect(toQuizErrorState(new ApiError('Request-specific detail', code, 0)).kind).toBe(kind)
   })
 
   it('uses statusCode before code when the two values disagree', () => {
     expect(toQuizErrorState(new ApiError('Conflict detail', 404, 409))).toEqual({
       kind: 'conflict',
       message: 'Conflict detail',
     })
   })
 
+  it('uses an available unmapped statusCode instead of falling back to code', () => {
+    expect(toQuizErrorState(new ApiError('Server failure', 404, 500))).toEqual({
+      kind: 'network',
+      message: 'Server failure',
+    })
+  })
+
   it('keeps a regular Error message in the network state', () => {
     expect(toQuizErrorState(new Error('Connection refused'))).toEqual({
       kind: 'network',
       message: 'Connection refused',
     })
   })
 
   it('uses a safe network message for unknown values and unmapped API errors', () => {
     expect(toQuizErrorState(undefined)).toEqual({ kind: 'network', message: 'Network request failed' })
     expect(toQuizErrorState(new ApiError('', 500, 500))).toEqual({ kind: 'network', message: 'Network request failed' })
diff --git a/src/features/quiz/errors.ts b/src/features/quiz/errors.ts
index 5b3a3ce..cdf9981 100644
--- a/src/features/quiz/errors.ts
+++ b/src/features/quiz/errors.ts
@@ -43,21 +43,23 @@ function errorKindForCode(code: number): QuizErrorKind | undefined {
       return undefined
   }
 }
 
 function withMessage(kind: Exclude<QuizErrorKind, 'unauthorized'>, message: string): QuizErrorState {
   return { kind, message }
 }
 
 export function toQuizErrorState(error: unknown): QuizErrorState {
   if (isApiError(error)) {
-    const kind = errorKindForCode(error.statusCode) ?? errorKindForCode(error.code)
+    const kind = error.statusCode !== 0
+      ? errorKindForCode(error.statusCode)
+      : errorKindForCode(error.code)
     if (kind === 'unauthorized') return { kind }
     if (kind !== undefined) return withMessage(kind, error.message || safeNetworkMessage)
     return withMessage('network', error.message || safeNetworkMessage)
   }
 
   if (error instanceof Error && error.message) {
     return withMessage('network', error.message)
   }
 
   return withMessage('network', safeNetworkMessage)

