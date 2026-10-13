import { useEffect, useState } from 'react'
import { View, Image, Text } from '@tarojs/components'
import { useRouter } from '@tarojs/taro'
import { PageHeader } from '@/components/PageHeader'
import { getCompetitionDetail } from '@/services/zoneService'
import { safeNavigateBack } from '@/utils/navigation'
import { resolveMediaUrl } from '@/utils/media'
import type { CompetitionBrief } from '@/types'
import styles from './attachment.module.scss'

/**
 * 赛事在线查阅附件（PDF 转页图）。
 * 「内容可见、文件不可下载」的落地页：只渲染页图，不接预览大图、
 * 不开长按菜单、不提供任何文件打开/保存入口——原件在服务端私有目录，本页无从触达。
 */
export default function CompetitionAttachmentPage() {
  const { params } = useRouter()
  const competitionId = Number(params?.id)
  const attachmentIndex = Number(params?.att)
  const [competition, setCompetition] = useState<CompetitionBrief | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!Number.isFinite(competitionId) || competitionId <= 0) {
      setLoading(false)
      return
    }
    getCompetitionDetail(competitionId)
      .then(setCompetition)
      .catch(() => setCompetition(null))
      .finally(() => setLoading(false))
  }, [competitionId])

  const attachments = competition?.attachments ?? []
  const attachment = Number.isFinite(attachmentIndex)
    ? attachments[attachmentIndex]
    : undefined

  const backToDetail = () =>
    void safeNavigateBack({ fallbackUrl: `/pages/competition/detail?id=${competitionId}` })

  return (
    <View className={styles.container}>
      <PageHeader
        title={attachment?.title || '附件查看'}
        shouldShowBack
        onBack={backToDetail}
      />

      {loading && <View className={styles.placeholder}>加载中…</View>}
      {!loading && !attachment && <View className={styles.placeholder}>附件不存在或已下架</View>}

      {!loading && attachment && (
        <View className={styles.body}>
          {attachment.pages.map((page, index) => (
            <Image
              key={`${index}-${page}`}
              className={styles.page}
              src={resolveMediaUrl(page)}
              mode='widthFix'
              lazyLoad
            />
          ))}
          <Text className={styles.notice}>内容仅供在线查阅，请勿外传</Text>
        </View>
      )}
    </View>
  )
}
