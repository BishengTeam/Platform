import { useCallback, useMemo, useState } from 'react'
import { Text, View } from '@tarojs/components'
import Taro, { useLoad, usePullDownRefresh, useRouter } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { RefreshableScrollView } from '@/components/RefreshableScrollView'
import { CertBatchCard, type CertBatchInfoItem } from '@/components/CertBatchCard'
import { ZoneCard } from '@/components/ZoneCard'
import { ROUTES } from '@/constants/routes'
import { rensheService, type RenshePlan, type RensheProject } from '@/services/rensheService'
import { formatDate, formatDateTime } from '@/utils/format'
import { resolveMediaUrl } from '@/utils/media'
import styles from './renshe.module.scss'

export default function RensheIndexPage() {
  const { params } = useRouter()
  const routeProjectId = Number(params?.project_id || 0)
  const validProjectId = Number.isInteger(routeProjectId) && routeProjectId > 0
    ? routeProjectId
    : 0
  const routeProductName = params?.product_name
    ? decodeURIComponent(params.product_name)
    : ''

  const [projects, setProjects] = useState<RensheProject[]>([])
  const [selectedProject, setSelectedProject] = useState<RensheProject | null>(null)
  const [batches, setBatches] = useState<RenshePlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError(false)
    const requests: [Promise<RensheProject[]>, Promise<RenshePlan[]>] = [
      rensheService.listProjects(),
      validProjectId
        ? rensheService.listBatches(validProjectId)
        : rensheService.listBatches(),
    ]

    return Promise.all(requests)
      .then(([available, items]) => {
        setProjects(available)
        setBatches(items)
        setSelectedProject(
          validProjectId
            ? available.find(project => project.id === validProjectId) ?? null
            : null,
        )
      })
      .catch(() => {
        setProjects([])
        setBatches([])
        setSelectedProject(null)
        setError(true)
      })
      .finally(() => setLoading(false))
  }, [validProjectId])

  useLoad(() => { void load() })
  usePullDownRefresh(async () => {
    await load()
    Taro.stopPullDownRefresh()
  })

  const pageTitle = useMemo(() => (
    routeProductName
      || selectedProject?.name
      || (validProjectId ? '人社项目' : '人社认证')
  ), [routeProductName, selectedProject?.name, validProjectId])

  const openProject = (project: RensheProject) => {
    Taro.redirectTo({
      url: `/${ROUTES.RENSHE_INDEX}?project_id=${project.id}&product_name=${encodeURIComponent(project.name)}`,
    })
  }

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={pageTitle} shouldShowBack />
        <RefreshableScrollView className={styles.body} onRefresh={load}>
          {loading && <View className={styles.empty}>加载中...</View>}
          {error && (
            <View className={styles.empty} onClick={() => { void load() }}>
              <Text>加载失败，点击重试</Text>
            </View>
          )}

          {!loading && !error && !validProjectId && projects.length === 0 && (
            <View className={styles.empty}>
              <Text>暂无可报考项目</Text>
            </View>
          )}
          {!loading && !error && validProjectId && !selectedProject && (
            <View className={styles.empty}>
              <Text>项目不存在或已下架</Text>
            </View>
          )}

          {!loading && !error && !validProjectId && projects.map(project => (
            <ZoneCard
              key={project.id}
              coverUrl={resolveMediaUrl(project.home_cover_url)}
              title={project.name}
              subtitle={project.description || undefined}
              tags={[project.occupation_name, project.skill_level]}
              buttonText='查看批次'
              buttonVariant='primary'
              onButtonClick={() => openProject(project)}
              onCardClick={() => openProject(project)}
            />
          ))}

          {!loading && !error && selectedProject && batches.length === 0 && (
            <View className={styles.empty}>
              <Text>该产品暂无开放批次</Text>
            </View>
          )}

          {!loading && !error && selectedProject && batches.map((batch) => {
            const remaining = batch.capacity === 0
              ? '不限'
              : `${Math.max(batch.capacity - batch.enrolled, 0)} 人`
            const infoItems: CertBatchInfoItem[] = [
              {
                label: '报名时间',
                value: `${formatDate(batch.apply_start)} ~ ${formatDate(batch.apply_end)}`,
                full: true,
              },
              { label: '考试时间', value: formatDateTime(batch.exam_date, '待公布') },
              { label: '剩余名额', value: remaining },
              ...(batch.exam_location
                ? [{ label: '考试地点', value: batch.exam_location, full: true }]
                : []),
              {
                label: '报考方式',
                value: `${batch.exam_type} · ${batch.application_type}`,
                full: true,
              },
              {
                label: '报名费',
                value: `¥${(batch.price_cents / 100).toFixed(2)}`,
                full: true,
              },
            ]

            return (
              <CertBatchCard
                key={batch.id}
                title={batch.name}
                badge='报名中'
                badgeTone='green'
                infoItems={infoItems}
                actionText='立即报名'
                onAction={() => Taro.navigateTo({
                  url: `/${ROUTES.RENSHE_FORM}?plan_id=${batch.id}`,
                })}
              />
            )
          })}

          <View className={styles.secondaryAction}>
            <Button
              variant='secondary'
              onClick={() => Taro.navigateTo({ url: `/${ROUTES.MINE_REGISTRATIONS}` })}
            >
              我的报名
            </Button>
          </View>
        </RefreshableScrollView>
      </View>
    </AuthGuard>
  )
}
