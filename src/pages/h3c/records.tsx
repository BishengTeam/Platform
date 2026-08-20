import { useCallback, useEffect, useState } from 'react'
import { Text, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { h3cService } from '@/services/h3cService'
import type { H3cRegistration } from '@/types/h3c'
import styles from './h3c.module.scss'

const STATUS_LABELS: Record<string, string> = {
  pending_payment: '待支付',
  pending_review: '待审核',
  rejected_awaiting_resubmission: '待补交材料',
  pending_refund_confirmation: '待确认退款',
  refund_processing: '退款中',
  approved: '审核通过',
  refunded_closed: '已退款关闭',
  cancelled: '已取消',
}

export default function H3CRecordsPage() {
  const [items, setItems] = useState<H3cRegistration[]>([])
  const [selected, setSelected] = useState<H3cRegistration | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await h3cService.listRegistrations()
      setItems(result.items)
      if (selected) setSelected(await h3cService.getRegistration(selected.id))
    } finally {
      setLoading(false)
    }
  }, [selected])

  useLoad(() => {
    h3cService.listRegistrations()
      .then((result) => setItems(result.items))
      .finally(() => setLoading(false))
  })

  useEffect(() => {
    if (!selected) return
    h3cService.getRegistration(selected.id).then(setSelected)
  }, [selected?.id])

  const upload = async (registration: H3cRegistration) => {
    const materialType = registration.latest_review?.rejected_material_types?.[0]
    if (!materialType) return
    const result = await Taro.chooseImage({ count: 1, sizeType: ['compressed'], sourceType: ['album', 'camera'] })
    const filePath = result.tempFilePaths[0]
    if (!filePath) return
    Taro.showLoading({ title: '上传中', mask: true })
    try {
      const uploaded = await h3cService.uploadMaterial(filePath, registration.batch_id, materialType as 'coupon_proof' | 'student_proof')
      await h3cService.resubmitMaterials(registration.id, {
        coupon_proof_key: materialType === 'coupon_proof' ? uploaded.storage_key : null,
        student_proof_key: materialType === 'student_proof' ? uploaded.storage_key : null,
      })
      Taro.showToast({ title: '补交成功', icon: 'success' })
      await load()
    } finally {
      Taro.hideLoading()
    }
  }

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title='我的 H3C 报名' shouldShowBack />
        <View className={styles.body}>
          {loading && <View className={styles.empty}>加载中...</View>}
          {!loading && items.length === 0 && <View className={styles.empty}>暂无 H3C 报名记录</View>}
          {items.map((item) => (
            <View key={item.id} className={styles.card} onClick={() => setSelected(item)}>
              <Text className={styles.title}>{item.registration_no}</Text>
              <View className={styles.row}>
                <Text className={styles.label}>状态</Text>
                <Text className={styles.status}>{STATUS_LABELS[item.status] || item.status}</Text>
              </View>
              <View className={styles.row}>
                <Text className={styles.label}>金额</Text>
                <Text className={styles.value}>{(item.price_cents / 100).toFixed(2)} 元</Text>
              </View>
            </View>
          ))}

          {selected && (
            <View className={styles.card}>
              <Text className={styles.title}>报名详情</Text>
              {Object.entries(selected.candidate_snapshot).map(([key, value]) => (
                <View className={styles.row} key={key}>
                  <Text className={styles.label}>{key}</Text>
                  <Text className={styles.value}>{String(value ?? '-')}</Text>
                </View>
              ))}
              {selected.status === 'rejected_awaiting_resubmission' && (
                <>
                  <Text className={styles.desc}>
                    拒绝原因：{selected.latest_review?.reason_detail || selected.latest_review?.reason_code}
                  </Text>
                  <View style={{ marginTop: 12 }}>
                    <Button variant='gradient' onClick={() => upload(selected)}>重新上传材料</Button>
                  </View>
                </>
              )}
              {selected.status === 'pending_payment' && (
                <View style={{ marginTop: 12 }}>
                  <Button variant='secondary' onClick={async () => {
                    await h3cService.cancelPayment(selected.id)
                    Taro.showToast({ title: '已取消', icon: 'success' })
                    await load()
                  }}>取消报名</Button>
                </View>
              )}
              <View style={{ marginTop: 8 }}>
                <Button variant='secondary' onClick={() => setSelected(null)}>收起详情</Button>
              </View>
            </View>
          )}
        </View>
      </View>
    </AuthGuard>
  )
}
