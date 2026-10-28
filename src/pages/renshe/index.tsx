import { navigateWithLogin } from '@/utils/loginCoordinator'
import { useCallback, useMemo, useState } from 'react'
import { Text, View } from '@tarojs/components'
import Taro, { useLoad, usePullDownRefresh, useRouter } from '@tarojs/taro'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { RefreshableScrollView } from '@/components/RefreshableScrollView'
import { CertBatchCard, type CertBatchInfoItem } from '@/components/CertBatchCard'
import { ZoneCard } from '@/components/ZoneCard'
import { ROUTES } from '@/constants/routes'
import { rensheService, type RenshePlan, type RensheProject } from '@/services/rensheService'
import { formatDateTime } from '@/utils/format'
import { resolveMediaUrl } from '@/utils/media'
import styles from './renshe.module.scss'
import { GRADUATED_RULE, isEmploymentRule, rensheBatchWindow } from '@/utils/rensheGraduated'
import { useCertificationBatchClock } from '@/hooks/useCertificationBatchClock'
import { certificationBatchState, formatCertificationApplyRange } from '@/utils/certificationBatch'

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
  const now = useCertificationBatchClock(batches, load)
  const visibleBatches = batches.filter(batch => certificationBatchState(rensheBatchWindow(batch), now).visible)
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
    <>
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
              tags={[project.occupation_name, project.skill_level, ...(project.application_types || []), ...(project.qualification_rule === GRADUATED_RULE ? ['已取得毕业证'] : [])]}
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
            {isEmploymentRule(selectedProject.qualification_rule) && <View><Text className={styles.sectionTitle}>报名前准备</Text><Text className={styles.sectionDesc}>本人实名、文化程度、联系方式、签字按手印承诺书；工作经历、工龄和社保证明、技能证书、职称或毕业学历按本批次具体申报路径准备，不同等级分别核验。</Text><Text className={styles.sectionDesc}>一寸白底近期证件照≤500 KB；工作经历重叠时间不重复累计。具体材料在报名页直接上传。</Text></View>}
            {selectedProject.qualification_rule === GRADUATED_RULE && <>
              <Text className={styles.sectionTitle}>报名前准备</Text>
              <Text className={styles.sectionDesc}>本人实名；毕业院校、学历、专业、毕业日期及证书编号；手机号、邮箱、通讯地址。</Text>
              <Text className={styles.sectionDesc}>身份证正反面、一寸白底近期照（≤500 KB）、毕业证、学信网学历备案表（验证有效期设置为6个月）、签字按手印承诺书。</Text>
              <Text className={styles.sectionDesc}>报名页可下载承诺书模板并直接上传材料。支付后依次办理初审、线下报送和外审登记。</Text>
            </>}
          </View>}

          {!loading && !error && selectedProject && visibleBatches.length === 0 && (
            <View className={styles.empty}>
              <Text>该产品暂无开放批次</Text>
            </View>
          )}

          {!loading && !error && selectedProject && visibleBatches.map((batch) => {
            const availability = certificationBatchState(rensheBatchWindow(batch), now)
            const remaining = batch.capacity === 0
              ? '不限'
              : `${Math.max(batch.capacity - batch.enrolled, 0)} 人`
            const infoItems: CertBatchInfoItem[] = [
              {
                label: '报名时间',
                value: formatCertificationApplyRange(batch),
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
              ...(isEmploymentRule(batch.renshe_config?.qualification_rule) ? [{ label: '报考条件', value: batch.renshe_config?.rule_profile?.source_conditions?.[0] || '按相关工作经历及本路径证书核验', full: true }] : []),
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
                badge={availability.label}
                badgeTone={availability.tone}
                infoItems={infoItems}
                actionText={availability.canApply ? '查看条件并报名' : availability.action}
                actionDisabled={!availability.canApply}
                onAction={() => {
                  const current = certificationBatchState(rensheBatchWindow(batch))
                  if (!current.canApply) { Taro.showToast({ title: current.message, icon: 'none' }); void load(); return }
                  void navigateWithLogin(`/${ROUTES.RENSHE_FORM}?plan_id=${batch.id}`)
                }}
              />
            )
          })}

          <View className={styles.secondaryAction}>
            <Button
              variant='secondary'
              onClick={() => void navigateWithLogin(`/${ROUTES.MINE_REGISTRATIONS}`)}
            >
              我的报名
            </Button>
          </View>
        </RefreshableScrollView>
      </View>
    </>
  )
}
