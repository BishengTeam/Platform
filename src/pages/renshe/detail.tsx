import { useCallback, useState } from 'react'
import { Image, Text, View } from '@tarojs/components'
import Taro, { useDidShow, usePullDownRefresh, useRouter } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { RefreshableScrollView } from '@/components/RefreshableScrollView'
import { Button } from '@/components/Button'
import { getRensheBatchStatus, RensheBatchCard } from '@/components/RensheBatchCard'
import { ROUTES } from '@/constants/routes'
import {
  rensheService,
  type RensheApplicationListItem,
  type RenshePlan,
  type RensheProject,
} from '@/services/rensheService'
import { safeNavigateBack } from '@/utils/navigation'
import { resolveMediaUrl } from '@/utils/media'
import styles from './renshe.module.scss'

const ACTIVE_APPLICATION_STATUSES = new Set([
  'draft',
  'pending_payment',
  'pending_initial_review',
  'initial_rejected',
  'pending_external_review',
  'external_rejected',
  'external_approved',
])

const QUALIFICATION_RULES: Record<string, string> = {
  related_major_current_graduating_student: '相关专业在读应届学生，人工审核专业与应届资格',
}

const EDUCATION_LABELS: Record<string, string> = {
  associate: '专科',
  bachelor: '本科',
  master: '硕士',
  doctorate: '博士',
  secondary_vocational: '中职',
}

const APPLICATION_STEPS = [
  '选择批次并核对资格、材料与费用',
  '填写联系信息并提交报名',
  '完成报名费支付',
  '后台初审，需补正时按提示修改',
  '初审通过后统一报送资料',
  '外部审核并公布结果',
]

export default function RensheProjectDetailPage() {
  const { params } = useRouter()
  const projectId = Number(params?.project_id)
  const validProjectId = Number.isInteger(projectId) && projectId > 0

  const [project, setProject] = useState<RensheProject | null>(null)
  const [batches, setBatches] = useState<RenshePlan[]>([])
  const [applications, setApplications] = useState<RensheApplicationListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [projectError, setProjectError] = useState(false)
  const [batchError, setBatchError] = useState(false)
  const [selectingBatchId, setSelectingBatchId] = useState<number | null>(null)

  const load = useCallback(async () => {
    if (!validProjectId) {
      setLoading(false)
      setProjectError(true)
      return
    }

    setProjectError(false)
    setBatchError(false)
    const [projectResult, batchResult, applicationResult] = await Promise.allSettled([
      rensheService.listProjects(),
      rensheService.listBatches(projectId),
      rensheService.listApplications(1, 100),
    ])

    if (projectResult.status === 'fulfilled') {
      const found = projectResult.value.find(item => item.id === projectId) ?? null
      setProject(found)
      setProjectError(found === null)
    } else {
      setProject(null)
      setProjectError(true)
    }

    if (batchResult.status === 'fulfilled') {
      setBatches(batchResult.value)
    } else {
      setBatches([])
      setBatchError(true)
    }

    setApplications(
      applicationResult.status === 'fulfilled'
        ? applicationResult.value.items.filter(item => ACTIVE_APPLICATION_STATUSES.has(item.status))
        : [],
    )
    setLoading(false)
  }, [validProjectId])

  useDidShow(() => { void load() })
  usePullDownRefresh(async () => {
    await load()
    Taro.stopPullDownRefresh()
  })

  const configs = batches
    .map(batch => batch.renshe_config)
    .filter((config): config is NonNullable<RenshePlan['renshe_config']> => Boolean(config))
  const configSignatures = configs.map(config => JSON.stringify(config))
  const sharedConfig = configSignatures.length > 0
    && configSignatures.every(signature => signature === configSignatures[0])
    ? configs[0]
    : null
  const hasDifferentBatchRules = configs.length > 1 && sharedConfig === null
  const activeApplicationByPlan = new Map<number, number>()
  applications.forEach(item => {
    if (!activeApplicationByPlan.has(item.plan_id)) {
      activeApplicationByPlan.set(item.plan_id, item.id)
    }
  })

  const selectBatch = async (
    batch: RenshePlan,
    mode: ReturnType<typeof getRensheBatchStatus>['mode'],
  ) => {
    const activeApplicationId = activeApplicationByPlan.get(batch.id)
    if (mode === 'registration' && activeApplicationId) {
      Taro.navigateTo({
        url: `/${ROUTES.MINE_REGISTRATION_DETAIL}?type=renshe&id=${activeApplicationId}`,
      })
      return
    }
    if (mode !== 'selectable') return

    setSelectingBatchId(batch.id)
    try {
      // The page can stay open for a long time. Re-read the batch before the
      // form route so a just-closed or newly-full batch is explained here.
      const latest = await rensheService.getBatch(batch.id)
      setBatches(current => current.map(item => item.id === latest.id ? latest : item))
      const latestStatus = getRensheBatchStatus(latest, Boolean(activeApplicationId))
      if (latestStatus.mode === 'selectable') {
        Taro.navigateTo({
          url: `/${ROUTES.RENSHE_FORM}?plan_id=${latest.id}&project_id=${projectId}`,
        })
        return
      }
      const reason = latestStatus.mode === 'not-started'
        ? '该批次尚未开始报名'
        : latestStatus.mode === 'full'
          ? '该批次名额已满'
          : '该批次报名已结束'
      Taro.showToast({ title: reason, icon: 'none' })
    } catch {
      Taro.showToast({ title: '批次状态刷新失败，请重试', icon: 'none' })
    } finally {
      setSelectingBatchId(null)
    }
  }

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader
          title={project?.name || '人社项目详情'}
          shouldShowBack
          fallbackUrl={`/${ROUTES.RENSHE_INDEX}`}
        />
        <RefreshableScrollView className={styles.body} onRefresh={load}>
          <View className={styles.listHeader}>
            <Text className={styles.sectionTitle}>项目概览</Text>
            <Button
              variant='secondary'
              size='sm'
              onClick={() => Taro.navigateTo({ url: `/${ROUTES.MINE_REGISTRATIONS}` })}
            >
              我的报名
            </Button>
          </View>

          {loading && <View className={styles.loading}>正在加载项目详情...</View>}

          {!loading && projectError && (
            <View className={styles.empty} onClick={() => { void load() }}>
              <Text>{validProjectId ? '项目加载失败或已下架，点击重试' : '项目参数无效'}</Text>
            </View>
          )}

          {!loading && !projectError && project && (
            <>
              <View className={styles.card}>
                {project.home_cover_url && (
                  <Image
                    className={styles.projectCover}
                    src={resolveMediaUrl(project.home_cover_url)}
                    mode='aspectFill'
                  />
                )}
                <Text className={styles.title}>{project.name}</Text>
                <View className={styles.tagRow}>
                  <View className={styles.chip}><Text className={styles.chipText}>{project.occupation_name}</Text></View>
                  <View className={styles.chip}><Text className={styles.chipText}>{project.skill_level}</Text></View>
                </View>
                <Text className={styles.sectionDesc}>
                  {project.description || '本项目按批次开放报名，具体资格与材料要求以所选批次为准。'}
                </Text>
              </View>

              <Text className={styles.sectionTitle}>报考须知</Text>
              <View className={styles.card}>
                {hasDifferentBatchRules && (
                  <View className={styles.warning}>
                    不同批次的资格与材料要求不完全一致，请在下方对应批次卡片中展开查看。
                  </View>
                )}
                {!hasDifferentBatchRules && sharedConfig && (
                  <>
                    <View className={styles.requirementList}>
                      <Text className={styles.requirementItem}>
                        资格条件：{QUALIFICATION_RULES[sharedConfig.qualification_rule] ?? sharedConfig.qualification_rule}
                      </Text>
                      {sharedConfig.education_levels.length > 0 && (
                        <Text className={styles.requirementItem}>
                          适用学历：{sharedConfig.education_levels.map(level => EDUCATION_LABELS[level] ?? level).join(' / ')}
                        </Text>
                      )}
                      <Text className={styles.requirementItem}>
                        必交材料：{sharedConfig.materials.filter(item => item.required).map(item => item.name).join('、')}
                      </Text>
                    </View>
                    <Text className={styles.sectionDesc}>
                      以上为项目通用说明；最终报名校验以提交时所选批次配置为准。
                    </Text>
                  </>
                )}
                {!hasDifferentBatchRules && !sharedConfig && !batchError && batches.length === 0 && (
                  <Text className={styles.sectionDesc}>暂无开放批次，项目要求待批次开放后展示。</Text>
                )}
                {batchError && (
                  <View className={styles.warning} onClick={() => { void load() }}>
                    批次加载失败，项目介绍仍可查看；点击重试。
                  </View>
                )}
              </View>
            </>
          )}

          {!loading && !projectError && project && (
            <>
              <Text className={styles.sectionTitle}>报名流程</Text>
              <View className={styles.card}>
                <View className={styles.requirementList}>
                  {APPLICATION_STEPS.map((step, index) => (
                    <Text className={styles.requirementItem} key={step}>
                      {index + 1}. {step}
                    </Text>
                  ))}
                </View>
              </View>

              <Text className={styles.sectionTitle}>可报名批次</Text>
              {batchError && (
                <View className={styles.empty} onClick={() => { void load() }}>
                  <Text>批次加载失败，点击重试</Text>
                </View>
              )}
              {!batchError && batches.length === 0 && (
                <View className={styles.empty}>
                  <Text>暂无开放批次</Text>
                  <Text className={styles.emptyHint}>项目介绍会保留，批次开放后可在这里报名</Text>
                </View>
              )}
              {!batchError && batches.map(batch => (
                <RensheBatchCard
                  key={batch.id}
                  batch={batch}
                  activeApplicationId={activeApplicationByPlan.get(batch.id)}
                  projectId={projectId}
                  selecting={selectingBatchId === batch.id}
                  onSelect={(item, mode) => { void selectBatch(item, mode) }}
                />
              ))}

              <View className={styles.bottomActions}>
                <Button
                  variant='secondary'
                  onClick={() => {
                    void safeNavigateBack({ fallbackUrl: `/${ROUTES.RENSHE_INDEX}` })
                  }}
                >
                  返回项目列表
                </Button>
              </View>
              <Text className={styles.pageNote}>批次咨询联系人展示在对应批次卡片内。</Text>
            </>
          )}
        </RefreshableScrollView>
      </View>
    </AuthGuard>
  )
}
