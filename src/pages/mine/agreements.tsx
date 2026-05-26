import { useState } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { STRINGS } from '@/constants/strings'
import { getAgreements } from '@/services/dataService'
import type { Agreement } from '@/types'
import styles from './agreements.module.scss'

const STATUS_MAP: Record<Agreement['status'], { label: string; color: string }> = {
  pending_sign: { label: STRINGS.MINE_AGREEMENTS_STATUS_PENDING_SIGN, color: '#FA8C16' },
  pending_review: { label: STRINGS.MINE_AGREEMENTS_STATUS_PENDING_REVIEW, color: '#1677FF' },
  stamped: { label: STRINGS.MINE_AGREEMENTS_STATUS_STAMPED, color: '#52C41A' },
  completed: { label: STRINGS.MINE_AGREEMENTS_STATUS_COMPLETED, color: '#999' },
}

export default function AgreementsPage() {
  const [items] = useState(getAgreements())
  const [signingId, setSigningId] = useState<string | null>(null)
  const [signPaths, setSignPaths] = useState<{ x: number; y: number }[]>([])

  const handleSignCanvas = (agreementId: string) => {
    // Canvas signature would use Taro.createCanvasContext in production
    Taro.showToast({ title: STRINGS.MINE_AGREEMENTS_SIGN_HINT, icon: 'none' })
  }

  const handleSubmitSign = () => {
    setSigningId(null)
    setSignPaths([])
    Taro.showToast({ title: STRINGS.MINE_AGREEMENTS_SIGN_SUCCESS, icon: 'success' })
  }

  const handleClearSign = () => {
    setSignPaths([])
  }

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.MINE_AGREEMENTS_TITLE} shouldShowBack />
        <ScrollView className={styles.body} scrollY>
          {items.map(item => {
            const statusInfo = STATUS_MAP[item.status]
            return (
              <View key={item.id} className={styles.card}>
                <View className={styles.cardHeader}>
                  <Text className={styles.cardTitle}>{item.title}</Text>
                  <Text className={styles.cardStatus} style={{ color: statusInfo.color }}>
                    {statusInfo.label}
                  </Text>
                </View>
                <Text className={styles.cardContent} numberOfLines={3}>
                  {item.content}
                </Text>
                <View className={styles.cardMeta}>
                  <Text className={styles.metaText}>{STRINGS.FORM_EXAM_DATE}: {item.createdAt}</Text>
                  {item.signedAt && <Text className={styles.metaText}>{STRINGS.MINE_AGREEMENTS_SIGN_TIME} {item.signedAt}</Text>}
                </View>

                {signingId === item.id && (
                  <View className={styles.signArea}>
                    <View
                      className={styles.signCanvas}
                      onTouchMove={(e) => {
                        const touch = e.touches[0]
                        if (touch) {
                          setSignPaths(prev => [...prev, { x: touch.x, y: touch.y }])
                        }
                      }}
                    >
                      <Text className={styles.signPlaceholder}>
                        {signPaths.length === 0 ? STRINGS.MINE_AGREEMENTS_SIGN_CANVAS : ''}
                      </Text>
                    </View>
                    <View className={styles.signActions}>
                      <Button size='sm' variant='secondary' onClick={handleClearSign}>
                        {STRINGS.MINE_AGREEMENTS_CLEAR}
                      </Button>
                      <Button size='sm' onClick={handleSubmitSign}>
                        {STRINGS.MINE_AGREEMENTS_SUBMIT}
                      </Button>
                    </View>
                  </View>
                )}

                {item.status === 'pending_sign' && signingId !== item.id && (
                  <View className={styles.cardFooter}>
                    <Button size='sm' variant='secondary'>
                      {STRINGS.MINE_AGREEMENTS_DETAIL}
                    </Button>
                    <Button size='sm' onClick={() => setSigningId(item.id)}>
                      {STRINGS.MINE_AGREEMENTS_SIGN}
                    </Button>
                  </View>
                )}
              </View>
            )
          })}
        </ScrollView>
      </View>
    </AuthGuard>
  )
}
