import { useCallback, useState } from 'react'
import { Text, View } from '@tarojs/components'
import Taro, { useLoad, usePullDownRefresh } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { RefreshableScrollView } from '@/components/RefreshableScrollView'
import { Button } from '@/components/Button'
import { getRensheBatchStatus } from '@/components/RensheBatchCard'
import {
  RensheProjectCard,
  type RensheBatchLoadState,
} from '@/components/RensheProjectCard'
import { ROUTES } from '@/constants/routes'
import { rensheService, type RensheProject } from '@/services/rensheService'
import styles from './renshe.module.scss'

interface BatchState {
  state: RensheBatchLoadState
  openCount: number
}

export default function RensheIndexPage() {
  const [projects, setProjects] = useState<RensheProject[]>([])
  const [batchStates, setBatchStates] = useState<Record<number, BatchState>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    setError(false)
    try {
      const items = await rensheService.listProjects()
      setProjects(items)

      // 项目列表与批次状态分别处理；单个项目批次加载失败不影响其他项目展示。
      const results = await Promise.allSettled(
        items.map(project => rensheService.listBatches(project.id)),
      )
      const nextStates: Record<number, BatchState> = {}
      results.forEach((result, index) => {
        const project = items[index]
        nextStates[project.id] = result.status === 'fulfilled'
          ? {
              state: result.value.some(batch => getRensheBatchStatus(batch, false).mode === 'selectable')
                ? 'available'
                : 'empty',
              openCount: result.value.filter(
                batch => getRensheBatchStatus(batch, false).mode === 'selectable',
              ).length,
            }
          : { state: 'error', openCount: 0 }
      })
      setBatchStates(nextStates)
    } catch {
      setProjects([])
      setBatchStates({})
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  const openProject = (project: RensheProject) => {
    Taro.navigateTo({ url: `/${ROUTES.RENSHE_DETAIL}?project_id=${project.id}` })
  }

  useLoad(() => { void load() })
  usePullDownRefresh(async () => {
    await load()
    Taro.stopPullDownRefresh()
  })

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title='人社认证' shouldShowBack />
        <RefreshableScrollView className={styles.body} onRefresh={load}>
          <View className={styles.listHeader}>
            <View>
              <Text className={styles.sectionTitle}>职业技能等级认证</Text>
              <Text className={styles.sectionDesc}>
                先选择报考项目，了解考什么、能不能报、准备什么材料、什么时候报名和多少钱。
              </Text>
            </View>
            <Button
              variant='secondary'
              size='sm'
              onClick={() => Taro.navigateTo({ url: `/${ROUTES.MINE_REGISTRATIONS}` })}
            >
              我的报名
            </Button>
          </View>

          {loading && <View className={styles.loading}>正在加载报考项目...</View>}
          {error && (
            <View className={styles.empty} onClick={() => { void load() }}>
              <Text>项目加载失败，点击重试</Text>
            </View>
          )}

          {!loading && !error && projects.length === 0 && (
            <View className={styles.empty}>
              <Text>暂无可报考项目</Text>
              <Text className={styles.emptyHint}>后续开放后会在这里展示</Text>
            </View>
          )}

          {!loading && !error && projects.map(project => {
            const batchState = batchStates[project.id] ?? { state: 'loading' as const, openCount: 0 }
            return (
              <RensheProjectCard
                key={project.id}
                project={project}
                batchState={batchState.state}
                openCount={batchState.openCount}
                onClick={() => openProject(project)}
              />
            )
          })}

          {!loading && !error && (
            <Text className={styles.pageNote}>
              报名资格和材料要求以所选批次为准；进入填写前请先核对批次卡片中的条件。
            </Text>
          )}
        </RefreshableScrollView>
      </View>
    </AuthGuard>
  )
}
