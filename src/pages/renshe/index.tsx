import { useCallback, useState } from 'react'
import { Text, View } from '@tarojs/components'
import Taro, { useLoad, usePullDownRefresh } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { RefreshableScrollView } from '@/components/RefreshableScrollView'
import { Button } from '@/components/Button'
import { ROUTES } from '@/constants/routes'
import { rensheService, type RenshePlan, type RensheProject } from '@/services/rensheService'
import { formatDateTime, formatDate } from '@/utils/format'
import styles from './renshe.module.scss'

export default function RensheIndexPage() {
  const [batches, setBatches] = useState<RenshePlan[]>([])
  const [projects, setProjects] = useState<RensheProject[]>([])
  const [selectedProject, setSelectedProject] = useState<RensheProject | null>(null)
  const [projectBatches, setProjectBatches] = useState<RenshePlan[] | null>(null)
  const [selecting, setSelecting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError(false)
    return Promise.all([rensheService.listBatches(), rensheService.listProjects()])
      .then(([items, available]) => { setBatches(items); setProjects(available); setSelectedProject(null); setProjectBatches(null) })
      .catch(() => {
        setBatches([])
        setError(true)
      })
      .finally(() => setLoading(false))
  }, [])

  const selectProject = async (project: RensheProject) => {
    setSelecting(true)
    try {
      const items = await rensheService.listBatches(project.id)
      setSelectedProject(project)
      setProjectBatches(items)
    } catch { Taro.showToast({ title: '加载项目批次失败，请重试', icon: 'none' }) }
    finally { setSelecting(false) }
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
          <Button
            variant='secondary'
            size='lg'
            onClick={() => Taro.navigateTo({ url: `/${ROUTES.MINE_REGISTRATIONS}` })}
          >
            我的报名
          </Button>

          <Text className={styles.sectionTitle}>职业技能等级认证</Text>
          <Text className={styles.sectionDesc}>
            请选择报考项目，查看职业、等级及可报名批次。报名资格和材料要求以所选批次为准。
          </Text>

          {!loading && !error && !selectedProject && projects.map(project => <View className={styles.card} key={project.id}>
            <View className={styles.cardHeader}><Text className={styles.title}>{project.name}</Text><Text className={styles.badge}>{project.skill_level}</Text></View>
            <Text className={styles.sectionDesc}>{project.occupation_name} · {project.description || '查看项目要求及开放报名批次'}</Text>
            <Button variant='secondary' loading={selecting} onClick={() => { void selectProject(project) }}>查看项目与批次</Button>
          </View>)}
          {selectedProject && <View className={styles.card}>
            <Text className={styles.title}>{selectedProject.name}</Text>
            <Text className={styles.sectionDesc}>{selectedProject.occupation_name} · {selectedProject.skill_level}</Text>
            <Text className={styles.sectionDesc}>{selectedProject.description || '具体资格与材料要求请查看本期报名页面。'}</Text>
            <Button variant='secondary' onClick={() => { setSelectedProject(null); setProjectBatches(null) }}>查看全部项目</Button>
          </View>}
          {!loading && !error && <Text className={styles.sectionTitle}>{selectedProject ? '本项目可报名批次' : '可报名批次'}</Text>}

          {loading && <View className={styles.loading}>正在加载认证批次...</View>}
          {error && (
            <View className={styles.empty} onClick={() => { void load() }}>
              <Text>加载失败，点击重试</Text>
            </View>
          )}

          {!loading && !error && (projectBatches ?? batches).length === 0 && (
            <View className={styles.empty}>
              <Text>暂无开放报名批次</Text>
              <Text className={styles.emptyHint}>请联系老师发布人社认证批次</Text>
            </View>
          )}

          {!loading && !error && (projectBatches ?? batches).map(batch => {
            const remaining = batch.capacity === 0
              ? '不限'
              : `${Math.max(batch.capacity - batch.enrolled, 0)} 名`
            return (
              <View key={batch.id} className={styles.card}>
                <View className={styles.cardHeader}>
                  <Text className={styles.title}>{batch.name}</Text>
                  <Text className={styles.badge}>{batch.occupation_name}</Text>
                </View>
                <Text className={styles.sectionDesc}>{batch.project_name || batch.occupation_name} · {batch.skill_level}</Text>

                <View className={styles.row}>
                  <Text className={styles.label}>报名时间</Text>
                  <Text className={styles.value}>
                    {formatDate(batch.apply_start)} ~ {formatDate(batch.apply_end)}
                  </Text>
                </View>
                <View className={styles.row}>
                  <Text className={styles.label}>考试时间</Text>
                  <Text className={styles.value}>{formatDateTime(batch.exam_date, '待定')}</Text>
                </View>
                <View className={styles.row}>
                  <Text className={styles.label}>考试地点</Text>
                  <Text className={styles.value}>{batch.exam_location || '以批次安排为准'}</Text>
                </View>
                <View className={styles.row}>
                  <Text className={styles.label}>申报类型</Text>
                  <Text className={styles.value}>
                    {batch.application_type} · {batch.exam_type} · {batch.skill_level}
                  </Text>
                </View>

                <View className={styles.footer}>
                  <View>
                    <Text className={styles.label}>剩余名额</Text>
                    <Text className={styles.value}>{remaining}</Text>
                  </View>
                  <Text className={styles.price}>¥{(batch.price_cents / 100).toFixed(2)}</Text>
                  <Button
                    variant='primary'
                    onClick={() => Taro.navigateTo({
                      url: `/${ROUTES.RENSHE_FORM}?plan_id=${batch.id}`,
                    })}
                  >
                    立即报名
                  </Button>
                </View>
              </View>
            )
          })}
        </RefreshableScrollView>
      </View>
    </AuthGuard>
  )
}
