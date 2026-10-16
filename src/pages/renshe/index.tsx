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
import { GRADUATED_RULE } from '@/utils/rensheGraduated'

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
              subtitle={[project.description, project.admission_notice].filter(Boolean).join('。') || undefined}
              tags={[project.occupation_name, project.skill_level, ...(project.qualification_rule === GRADUATED_RULE ? ['学历型', '已取得毕业证'] : [])]}
              buttonText='查看批次'
              buttonVariant='primary'
              onButtonClick={() => openProject(project)}
              onCardClick={() => openProject(project)}
            />
          ))}

          {!loading && !error && selectedProject && <View className={styles.card}>
            <Text className={styles.sectionTitle}>{selectedProject.occupation_name} · {selectedProject.skill_level}</Text>
            {selectedProject.description && <Text className={styles.sectionDesc}>{selectedProject.description}</Text>}
            <Text className={styles.sectionDesc}>职业编码：{selectedProject.occupation_code}</Text>
            {selectedProject.admission_notice && <View className={styles.warning}>{selectedProject.admission_notice}</View>}
            {selectedProject.qualification_rule === GRADUATED_RULE && <>
              <Text className={styles.sectionTitle}>报名前准备</Text>
              <Text className={styles.sectionDesc}>本人实名；毕业院校、学历、专业、毕业日期及证书编号；手机号、邮箱、通讯地址。</Text>
              <Text className={styles.sectionDesc}>身份证正反面、一寸白底近期照（≤500 KB）、毕业证、学信网学历备案表（验证有效期设置为6个月）、签字按手印承诺书。</Text>
              <Text className={styles.sectionDesc}>报名页可下载承诺书模板并直接上传材料。支付后依次办理初审、线下报送和外审登记。</Text>
            </>}
          </View>}

          {!loading && !error && selectedProject && batches.length === 0 && (
            <View className={styles.empty}>
              <Text>该产品暂无开放批次</Text>
            </View>
          )}

          {!loading && !error && selectedProject && batches.map((batch) => {
            const acceptsNew = batch.renshe_config?.qualification_rule === GRADUATED_RULE && batch.renshe_config?.reporting_policy?.contract_version === 2
            const full = batch.capacity > 0 && batch.enrolled >= batch.capacity
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
              ...(batch.renshe_config?.qualification_rule === GRADUATED_RULE ? [{ label: '报考条件', value: '已取得毕业证 · 本专业或相关专业 · 学历型', full: true }] : []),
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
                badge={!acceptsNew ? '历史批次' : full ? '名额已满' : '报名中'}
                badgeTone={!acceptsNew || full ? 'gray' : 'green'}
                infoItems={infoItems}
                actionText={!acceptsNew ? '已有报名请前往我的报名' : full ? '名额已满' : '查看条件并报名'}
                actionDisabled={!acceptsNew || full}
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
