import { Text, View } from '@tarojs/components'
import { Button } from '../Button'
import type { DocumentActionsController } from '../../hooks/useDocumentActions'
import { FILE_SHARE_UNSUPPORTED } from '../../utils/documentFile'
import styles from './index.module.scss'

interface Props {
  scene: string
  title: string
  controller: DocumentActionsController
  previewLabel?: string
  disabled?: boolean
}

export function DocumentActions({ scene, title, controller, previewLabel = '预览模板', disabled }: Props) {
  const current = controller.busy?.scene === scene ? controller.busy.action : null
  return <View className={styles.document}>
    <Text className={styles.description}>{title.replace(/^(下载|查看)/, '')}</Text>
    <View className={styles.actions}>
      <View className={styles.action}><Button className={styles.button} variant='secondary' size='sm' disabled={disabled || Boolean(controller.busy)} loading={current === 'preview'} onClick={() => void controller.run(scene, 'preview')}>{current === 'preview' ? '正在预览…' : previewLabel}</Button></View>
      <View className={styles.action}><Button className={styles.button} variant='secondary' size='sm' disabled={disabled || Boolean(controller.busy) || !controller.shareSupported} loading={current === 'send'} onClick={() => void controller.run(scene, 'send')}>{current === 'send' ? '正在发送…' : '发送到微信'}</Button></View>
    </View>
    <Text className={styles.description}>{controller.shareSupported ? '可发送给文件传输助手或打印店。文件保存方式以当前微信及系统支持为准。' : FILE_SHARE_UNSUPPORTED}</Text>
    {controller.error?.scene === scene && <Text className={styles.error}>{controller.error.message}</Text>}
  </View>
}
