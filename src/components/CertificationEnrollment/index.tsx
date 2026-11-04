import { useCallback, useEffect, useRef, useState } from 'react'
import { Image, Text, View } from '@tarojs/components'
import Taro, { usePullDownRefresh } from '@tarojs/taro'
import { Button } from '../Button'
import { PageHeader } from '../PageHeader'
import { RefreshableScrollView } from '../RefreshableScrollView'
import { certificationJourneyService, type CertificationVendor, type EnrollmentCatalog, type NoticeBlock } from '@/services/certificationJourney'
import { CERTIFICATION_LABELS } from '@/utils/enrollment'
import { resolveMediaUrl } from '@/utils/media'
import styles from './index.module.scss'

export function NoticeBlocks({ blocks }: { blocks: NoticeBlock[] }) {
  return <>{blocks.map((block, index) => block.type === 'image' ? <NoticeImage key={`${index}:${block.url}`} block={block} /> : <Text key={index} className={styles.paragraph}>{block.text}</Text>)}</>
}
function NoticeImage({ block }: { block: NoticeBlock }) {
  const [failed, setFailed] = useState(false), [retry, setRetry] = useState(0)
  const url = resolveMediaUrl(block.url)
  return <View className={styles.imageBlock}>{failed ? <Text className={styles.link} onClick={() => { setFailed(false); setRetry(value => value + 1) }}>图片加载失败，点击重试</Text>
    : <Image key={retry} src={url} mode='widthFix' className={styles.noticeImage} onError={() => setFailed(true)} onClick={() => void Taro.previewImage({ urls: [url] }).catch(() => Taro.showToast({ title: '图片预览失败，请重试', icon: 'none' }))} />}
    {block.caption && <Text className={styles.hint}>{block.caption}</Text>}</View>
}

export function CertificationLanding({ vendor }: { vendor: CertificationVendor }) {
  const [catalog, setCatalog] = useState<EnrollmentCatalog | null>(null), [error, setError] = useState(''), [loading, setLoading] = useState(true)
  const seq = useRef(0)
  const load = useCallback(async () => {
    const request = ++seq.current; setLoading(true); setError('')
    try { const value = await certificationJourneyService.catalog(vendor); if (request === seq.current) setCatalog(value) }
    catch (reason) { if (request === seq.current) setError(reason instanceof Error ? reason.message : '认证信息加载失败') }
    finally { if (request === seq.current) setLoading(false) }
  }, [vendor])
  useEffect(() => { setCatalog(null); void load(); return () => { seq.current++ } }, [load])
  usePullDownRefresh(async () => { try { await load() } finally { Taro.stopPullDownRefresh() } })
  return <View className={styles.page}><PageHeader title={CERTIFICATION_LABELS[vendor]} shouldShowBack />
    <RefreshableScrollView className={styles.body} onRefresh={load}>
      {loading && <Text className={styles.hint}>正在加载认证信息…</Text>}
      {error && <View className={styles.card}><Text className={styles.error}>{error}</Text><Button variant='secondary' onClick={() => void load()}>重新加载</Button></View>}
      {catalog && !error && <><View className={styles.card}><Text className={styles.title}>认证介绍</Text><Text className={styles.paragraph}>{catalog.introduction}</Text></View>
        <View className={styles.card}><Text className={styles.title}>可报科目简介</Text>{catalog.subjects.length ? catalog.subjects.map(subject => <View key={subject.id} className={styles.subject}><Text className={styles.subjectName}>{subject.name}</Text>{subject.description && <Text className={styles.hint}>{subject.description}</Text>}</View>) : <Text className={styles.hint}>暂无开放科目</Text>}</View>
        <View className={styles.card}><Button variant='gradient' disabled={!catalog.batches.some(batch => batch.can_apply)} onClick={() => void Taro.navigateTo({ url: `/pages/registration/notice?type=${vendor}` })}>立即报名</Button>
          {!catalog.batches.some(batch => batch.can_apply) && <Text className={styles.hint}>暂无可报名批次，请留意后续安排。</Text>}</View></>}
    </RefreshableScrollView>
  </View>
}
