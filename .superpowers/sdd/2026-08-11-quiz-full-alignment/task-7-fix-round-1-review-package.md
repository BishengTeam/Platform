d7bb046 fix: harden practice session retry state
 .../task-7-report.md                               |  8 +++++
 src/features/quiz/__tests__/idempotency.test.ts    |  9 +++++
 src/features/quiz/idempotency.ts                   |  2 +-
 src/pages/quiz/__tests__/practice.test.tsx         | 40 ++++++++++++++++++++++
 src/pages/quiz/practice.tsx                        | 37 +++++++++++---------
 5 files changed, 78 insertions(+), 18 deletions(-)
diff --git a/.superpowers/sdd/2026-08-11-quiz-full-alignment/task-7-report.md b/.superpowers/sdd/2026-08-11-quiz-full-alignment/task-7-report.md
index 8871db2..bc74875 100644
--- a/.superpowers/sdd/2026-08-11-quiz-full-alignment/task-7-report.md
+++ b/.superpowers/sdd/2026-08-11-quiz-full-alignment/task-7-report.md
@@ -42,10 +42,18 @@ All commands used the repository-bundled isolated Node executable: `.superpowers
 - Full `tsc --noEmit -p tsconfig.json`: exit 1 on the repository's existing unrelated baseline (FloatingService, ZoneBanner, activity/profile/registration/services, legacy quiz mock/checkin/collections/wrong-book, and aggregate type exports). No diagnostic referenced a Task 7 touched source or test file.
 
 ## Commit
 
 `feat: implement resumable quiz practice sessions`
 
 ## Concerns
 
 - The full repository typecheck cannot be made green within Task 7 scope because of numerous pre-existing unrelated diagnostics. Task 7 itself adds no reported TypeScript diagnostic.
 - Session snapshots expose only `latest_result` plus `attempt_count`, so the UI represents prior attempts through those server-owned aggregate fields; full per-attempt history remains the practice-history endpoint's responsibility.
+
+## Fix round 1
+
+- RED: 4 focused failures reproduced unsafe stored-key acceptance, cross-question retry leakage, wrong-mode coupling to category failure, and destructive re-answer mutation of the authoritative result.
+- GREEN: submission errors and pending attempts are keyed by `session_question_id`; a failed attempt locks its exact displayed answer and retry payload across navigation.
+- Wrong mode skips category loading on initial setup, abandon, and next-session transitions.
+- Re-answer uses separate local edit state; `latest_result` and `attempt_count` remain visible and unchanged until a new server snapshot arrives.
+- Stored keys now require the complete `^[A-Za-z0-9_-]{8,64}$` format.
diff --git a/src/features/quiz/__tests__/idempotency.test.ts b/src/features/quiz/__tests__/idempotency.test.ts
index 5d19c68..df2ab5b 100644
--- a/src/features/quiz/__tests__/idempotency.test.ts
+++ b/src/features/quiz/__tests__/idempotency.test.ts
@@ -27,20 +27,29 @@ describe('practice attempt idempotency', () => {
 
   it('persists one valid key for the same logical attempt across retries', () => {
     const first = getOrCreateAttemptKey(31, 401, 'attempt-1')
     const retry = getOrCreateAttemptKey(31, 401, 'attempt-1')
 
     expect(retry).toBe(first)
     expect(first).toMatch(/^[A-Za-z0-9_-]{8,64}$/)
     expect(Taro.setStorageSync).toHaveBeenCalledTimes(1)
   })
 
+  it('replaces a length-valid stored key containing unsafe characters', () => {
+    storage.set('quiz:practice-attempt:31:401:attempt-1', 'bad key!!')
+
+    const replacement = getOrCreateAttemptKey(31, 401, 'attempt-1')
+
+    expect(replacement).not.toBe('bad key!!')
+    expect(replacement).toMatch(/^[A-Za-z0-9_-]{8,64}$/)
+  })
+
   it('uses a new key for an explicit re-answer without disturbing the earlier attempt', () => {
     const first = getOrCreateAttemptKey(31, 401, 'attempt-1')
     const reanswer = getOrCreateAttemptKey(31, 401, 'attempt-2')
 
     expect(reanswer).not.toBe(first)
     expect(getOrCreateAttemptKey(31, 401, 'attempt-1')).toBe(first)
     expect(getOrCreateAttemptKey(31, 401, 'attempt-2')).toBe(reanswer)
   })
 
   it('clears only the confirmed logical attempt key', () => {
diff --git a/src/features/quiz/idempotency.ts b/src/features/quiz/idempotency.ts
index 3a3b914..c42b934 100644
--- a/src/features/quiz/idempotency.ts
+++ b/src/features/quiz/idempotency.ts
@@ -11,21 +11,21 @@ function createKey() {
   return `pa_${Date.now().toString(36)}_${random}`
 }
 
 export function getOrCreateAttemptKey(
   sessionId: number,
   sessionQuestionId: number,
   localAttemptId: string,
 ) {
   const key = storageKey(sessionId, sessionQuestionId, localAttemptId)
   const stored = Taro.getStorageSync<string>(key)
-  if (typeof stored === 'string' && stored.length >= 8 && stored.length <= 64) {
+  if (typeof stored === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(stored)) {
     return stored
   }
 
   const created = createKey()
   Taro.setStorageSync(key, created)
   return created
 }
 
 export function clearAttemptKey(
   sessionId: number,
diff --git a/src/pages/quiz/__tests__/practice.test.tsx b/src/pages/quiz/__tests__/practice.test.tsx
index ea519cc..8c15cba 100644
--- a/src/pages/quiz/__tests__/practice.test.tsx
+++ b/src/pages/quiz/__tests__/practice.test.tsx
@@ -189,37 +189,77 @@ describe('resumable practice sessions', () => {
     const retryPayload = vi.mocked(quizApi.submitPracticeAttempt).mock.calls[1][1]
 
     expect(retryPayload).toEqual(firstPayload)
     expect(firstPayload).toMatchObject({ session_question_id: 401, user_answer: 'A' })
     expect(firstPayload.idempotency_key).toMatch(/^.{8,64}$/)
     expect(screen.getByText('Incorrect')).toBeInTheDocument()
     expect(screen.getByText('Correct answer: B')).toBeInTheDocument()
     expect(quizApi.getPracticeSession).toHaveBeenCalledWith(31)
   })
 
+  it('scopes failed submission to its question and locks the exact pending answer across navigation', async () => {
+    vi.mocked(quizApi.submitPracticeAttempt)
+      .mockRejectedValueOnce(new Error('network unavailable'))
+      .mockResolvedValueOnce(firstResult)
+    vi.mocked(quizApi.getPracticeSession).mockResolvedValue(baseSession)
+    render(<QuizPracticePage />)
+
+    fireEvent.click(await screen.findByText('A. Authoritative result'))
+    fireEvent.click(screen.getByRole('button', { name: 'Submit answer' }))
+    await screen.findByText('Submission failed. Your answer is preserved.')
+    fireEvent.click(screen.getByRole('button', { name: 'Next question' }))
+
+    expect(screen.queryByText('Submission failed. Your answer is preserved.')).not.toBeInTheDocument()
+    expect(screen.queryByRole('button', { name: 'Retry submission' })).not.toBeInTheDocument()
+
+    fireEvent.click(screen.getByRole('button', { name: 'Previous question' }))
+    fireEvent.click(screen.getByText('B. Local comparison'))
+    expect(screen.getByText('A. Authoritative result').closest('[data-selected="true"]')).not.toBeNull()
+    expect(screen.getByText('B. Local comparison').closest('[data-selected="true"]')).toBeNull()
+    fireEvent.click(screen.getByRole('button', { name: 'Retry submission' }))
+
+    await waitFor(() => expect(quizApi.submitPracticeAttempt).toHaveBeenCalledTimes(2))
+    expect(vi.mocked(quizApi.submitPracticeAttempt).mock.calls[1][1]).toEqual(
+      vi.mocked(quizApi.submitPracticeAttempt).mock.calls[0][1],
+    )
+  })
+
+  it('does not load categories for wrong mode, including after abandon and next-session setup', async () => {
+    routerParams.mode = 'wrong'
+    vi.mocked(quizApi.getCurrentPracticeSession).mockResolvedValue(null)
+    vi.mocked(quizApi.listCategories).mockRejectedValue(new Error('categories unavailable'))
+    render(<QuizPracticePage />)
+
+    expect(await screen.findByRole('button', { name: 'Start wrong-question practice' })).toBeInTheDocument()
+    expect(quizApi.listCategories).not.toHaveBeenCalled()
+  })
+
   it('normalizes multi-answer order and creates a fresh logical key for re-answer', async () => {
     const multiResult = { ...firstResult, attempt_id: 801, user_answer: ['A', 'B'], correct_answer: ['A', 'B'], is_correct: true }
     const reanswerResult = { ...multiResult, attempt_id: 802, attempt_no: 2 }
     vi.mocked(quizApi.submitPracticeAttempt).mockResolvedValueOnce(multiResult).mockResolvedValueOnce(reanswerResult)
     vi.mocked(quizApi.getPracticeSession)
       .mockResolvedValueOnce({ ...baseSession, questions: [baseSession.questions[0], { ...baseSession.questions[1], answered: true, attempt_count: 1, latest_result: multiResult }] })
       .mockResolvedValueOnce({ ...baseSession, questions: [baseSession.questions[0], { ...baseSession.questions[1], answered: true, attempt_count: 2, latest_result: reanswerResult }] })
     render(<QuizPracticePage />)
 
     fireEvent.click(await screen.findByRole('button', { name: 'Next question' }))
     fireEvent.click(screen.getByText('B. Re-answer'))
     fireEvent.click(screen.getByText('A. Retry'))
     fireEvent.click(screen.getByRole('button', { name: 'Submit answer' }))
     await waitFor(() => expect(quizApi.submitPracticeAttempt).toHaveBeenCalledTimes(1))
     expect(vi.mocked(quizApi.submitPracticeAttempt).mock.calls[0][1].user_answer).toEqual(['A', 'B'])
 
     fireEvent.click(await screen.findByRole('button', { name: 'Answer again' }))
+    expect(screen.getByText('Attempts: 1')).toBeInTheDocument()
+    expect(screen.getByText('Correct')).toBeInTheDocument()
+    expect(screen.getByText('The server owns grading.')).toBeInTheDocument()
     fireEvent.click(screen.getByText('A. Retry'))
     fireEvent.click(screen.getByText('B. Re-answer'))
     fireEvent.click(screen.getByRole('button', { name: 'Submit answer' }))
     await waitFor(() => expect(quizApi.submitPracticeAttempt).toHaveBeenCalledTimes(2))
 
     const [first, second] = vi.mocked(quizApi.submitPracticeAttempt).mock.calls.map(call => call[1])
     expect(second.idempotency_key).not.toBe(first.idempotency_key)
     expect(await screen.findByText('Attempts: 2')).toBeInTheDocument()
   })
 
diff --git a/src/pages/quiz/practice.tsx b/src/pages/quiz/practice.tsx
index 9cd21b5..a708a08 100644
--- a/src/pages/quiz/practice.tsx
+++ b/src/pages/quiz/practice.tsx
@@ -42,51 +42,54 @@ export default function QuizPracticePage() {
   const [questionCount, setQuestionCount] = useState<number>(10)
   const [categoryId, setCategoryId] = useState<number | null>(null)
   const [categories, setCategories] = useState<QuizCategoryNode[]>([])
   const [session, setSession] = useState<QuizPracticeSessionResponse | null>(null)
   const [currentIndex, setCurrentIndex] = useState(0)
   const [answers, setAnswers] = useState<Record<number, string[]>>({})
   const [pendingAttempts, setPendingAttempts] = useState<Record<number, { localId: string; answer: QuizAnswer }>>({})
   const [loading, setLoading] = useState(false)
   const [submitting, setSubmitting] = useState(false)
   const [error, setError] = useState('')
-  const [submitError, setSubmitError] = useState('')
+  const [submitErrors, setSubmitErrors] = useState<Record<number, string>>({})
   const [refreshError, setRefreshError] = useState('')
+  const [reanswering, setReanswering] = useState<Set<number>>(new Set())
 
   const loadSetup = useCallback(async () => {
     const nextCategories = await quizApi.listCategories()
     setCategories(nextCategories)
     setCategoryId(current => current ?? nextCategories[0]?.id ?? null)
   }, [])
 
   const restore = useCallback(async () => {
     setLoading(true)
     setError('')
     try {
       const current = await quizApi.getCurrentPracticeSession()
       setSession(current)
       setCurrentIndex(0)
-      if (!current) await loadSetup()
+      if (!current && mode === 'normal') await loadSetup()
     } catch {
       setError('Practice session failed to load.')
     } finally {
       setLoading(false)
     }
-  }, [loadSetup])
+  }, [loadSetup, mode])
 
   useEffect(() => {
     if (isChecked && isLoggedIn) void restore()
   }, [isChecked, isLoggedIn, restore])
 
   const currentQuestion = session?.questions[currentIndex]
   const selected = currentQuestion ? answers[currentQuestion.session_question_id] ?? [] : []
   const result = currentQuestion?.latest_result ?? null
+  const isReanswering = currentQuestion ? reanswering.has(currentQuestion.session_question_id) : false
+  const submitError = currentQuestion ? submitErrors[currentQuestion.session_question_id] ?? '' : ''
   const readOnly = session?.status !== 'in_progress'
 
   const progress = useMemo(() => {
     if (!session?.questions.length) return 0
     return ((currentIndex + 1) / session.questions.length) * 100
   }, [currentIndex, session])
 
   const createSession = async () => {
     if (mode === 'normal' && categoryId === null) {
       setError('Select a category before starting.')
@@ -102,69 +105,74 @@ export default function QuizPracticePage() {
       setCurrentIndex(0)
       setAnswers({})
     } catch {
       setError('Session creation failed. Please retry.')
     } finally {
       setLoading(false)
     }
   }
 
   const selectOption = (option: string) => {
-    if (!currentQuestion || readOnly || result) return
-    setSubmitError('')
+    if (!currentQuestion || readOnly || (result && !isReanswering) || pendingAttempts[currentQuestion.session_question_id]) return
+    setSubmitErrors(previous => ({ ...previous, [currentQuestion.session_question_id]: '' }))
     setAnswers(previous => {
       const current = previous[currentQuestion.session_question_id] ?? []
       const next = currentQuestion.question_type === 'multiple_choice'
         ? current.includes(option) ? current.filter(value => value !== option) : [...current, option]
         : [option]
       return { ...previous, [currentQuestion.session_question_id]: next }
     })
   }
 
   const submitAnswer = async () => {
     if (!session || !currentQuestion || selected.length === 0) return
     const sessionQuestionId = currentQuestion.session_question_id
     const existing = pendingAttempts[sessionQuestionId]
     const pending = existing ?? {
       localId: localAttemptId(currentQuestion),
       answer: normalizedAnswer(currentQuestion, selected),
     }
     const idempotencyKey = getOrCreateAttemptKey(session.id, sessionQuestionId, pending.localId)
     setPendingAttempts(previous => ({ ...previous, [sessionQuestionId]: pending }))
     setSubmitting(true)
-    setSubmitError('')
+    setSubmitErrors(previous => ({ ...previous, [sessionQuestionId]: '' }))
     setRefreshError('')
     try {
       const submitted = await quizApi.submitPracticeAttempt(session.id, {
         session_question_id: sessionQuestionId,
         idempotency_key: idempotencyKey,
         user_answer: pending.answer,
       })
       clearAttemptKey(session.id, sessionQuestionId, pending.localId)
       setPendingAttempts(previous => {
         const next = { ...previous }
         delete next[sessionQuestionId]
         return next
       })
+      setReanswering(previous => {
+        const next = new Set(previous)
+        next.delete(sessionQuestionId)
+        return next
+      })
       setSession(previous => previous && ({
         ...previous,
         questions: previous.questions.map(question => question.session_question_id === sessionQuestionId
           ? { ...question, answered: true, attempt_count: submitted.attempt_no, latest_result: submitted }
           : question),
       }))
       try {
         setSession(await quizApi.getPracticeSession(session.id))
       } catch {
         setRefreshError('Answer accepted, but session refresh failed. Retry refresh.')
       }
     } catch {
-      setSubmitError('Submission failed. Your answer is preserved.')
+      setSubmitErrors(previous => ({ ...previous, [sessionQuestionId]: 'Submission failed. Your answer is preserved.' }))
     } finally {
       setSubmitting(false)
     }
   }
 
   const retryRefresh = async () => {
     if (!session) return
     setRefreshError('')
     try {
       setSession(await quizApi.getPracticeSession(session.id))
@@ -173,57 +181,52 @@ export default function QuizPracticePage() {
     }
   }
 
   const reanswer = () => {
     if (!currentQuestion) return
     setAnswers(previous => {
       const next = { ...previous }
       delete next[currentQuestion.session_question_id]
       return next
     })
-    setSession(previous => previous && ({
-      ...previous,
-      questions: previous.questions.map(question => question.session_question_id === currentQuestion.session_question_id
-        ? { ...question, latest_result: null }
-        : question),
-    }))
+    setReanswering(previous => new Set(previous).add(currentQuestion.session_question_id))
   }
 
   const abandon = async () => {
     if (!session) return
     const decision = await Taro.showModal({
       title: 'Abandon practice session?',
       content: 'Submitted attempts remain in your history.',
       confirmText: 'Abandon',
     })
     if (!decision.confirm) return
     setLoading(true)
     setError('')
     try {
       await quizApi.abandonPracticeSession(session.id)
       setSession(null)
       setAnswers({})
-      await loadSetup()
+      if (mode === 'normal') await loadSetup()
     } catch {
       setError('Session abandon failed. Please retry.')
     } finally {
       setLoading(false)
     }
   }
 
   const nextSession = async () => {
     setSession(null)
     setAnswers({})
     setCurrentIndex(0)
     setLoading(true)
     try {
-      await loadSetup()
+      if (mode === 'normal') await loadSetup()
     } catch {
       setError('Practice setup failed to load.')
     } finally {
       setLoading(false)
     }
   }
 
   let content
   if (loading) {
     content = <View className={styles.state}><Text>Loading practice session…</Text></View>
@@ -288,26 +291,26 @@ export default function QuizPracticePage() {
                   <Text>{key}. {value}</Text>
                 </View>
               )
             })}
           </View>
           {result && (
             <View className={`${styles.feedback} ${result.is_correct ? styles.feedbackCorrect : styles.feedbackWrong}`}>
               <Text className={styles.feedbackText}>{result.is_correct ? 'Correct' : 'Incorrect'}</Text>
               <Text>Correct answer: {answerLabels(result.correct_answer)}</Text>
               <Text className={styles.explanation}>{result.explanation}</Text>
-              {!readOnly && <Button onClick={reanswer}>Answer again</Button>}
+              {!readOnly && !isReanswering && <Button onClick={reanswer}>Answer again</Button>}
             </View>
           )}
           {submitError && <View className={styles.errorBox}><Text>{submitError}</Text><Button onClick={() => void submitAnswer()}>Retry submission</Button></View>}
           {refreshError && <View className={styles.errorBox}><Text>{refreshError}</Text><Button onClick={() => void retryRefresh()}>Retry refresh</Button></View>}
-          {!readOnly && !result && !submitError && <Button disabled={selected.length === 0 || submitting} onClick={() => void submitAnswer()}>Submit answer</Button>}
+          {!readOnly && (!result || isReanswering) && !submitError && <Button disabled={selected.length === 0 || submitting} onClick={() => void submitAnswer()}>Submit answer</Button>}
         </View>
         <View className={styles.navRow}>
           <Button variant='secondary' disabled={currentIndex === 0} onClick={() => setCurrentIndex(index => index - 1)}>Previous question</Button>
           <Button variant='secondary' disabled={currentIndex === session.questions.length - 1} onClick={() => setCurrentIndex(index => index + 1)}>Next question</Button>
         </View>
         {session.status === 'in_progress'
           ? <View className={styles.dangerAction}><Button variant='secondary' onClick={() => void abandon()}>Abandon session</Button></View>
           : <View className={styles.dangerAction}><Button variant='gradient' onClick={() => void nextSession()}>Start next session</Button></View>}
       </ScrollView>
     )

