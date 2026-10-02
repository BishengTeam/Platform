import { useCallback, useState } from 'react'
import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { Popup } from '@nutui/nutui-react-taro'
import { AuthGuard } from '@/components/AuthGuard'
import { Button } from '@/components/Button'
import { Icon } from '@/components/Icon'
import { PageHeader } from '@/components/PageHeader'
import { STRINGS } from '@/constants/strings'
import { ROUTES } from '@/constants/routes'
import { getContactList, getTicketDetail, getTickets } from '@/services/dataService'
import { resolveUrl } from '@/utils/request'
import {
  formatTicketTime,
  parseTicketImages,
  parseTicketType,
  ticketStatusMeta,
  ticketSummary,
} from '@/utils/ticketView'
import styles from './index.module.scss'

interface Ticket {
  id: string
  content: string
  status: string
  created_at: string
}

interface TicketDetail extends Ticket {
  updated_at: string
}

export default function ServicePage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [ticketsLoaded, setTicketsLoaded] = useState(false)
  const [detailVisible, setDetailVisible] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detail, setDetail] = useState<TicketDetail | null>(null)
  const [qrVisible, setQrVisible] = useState(false)

  const loadTickets = useCallback(() => {
    getTickets().then(data => {
      setTickets(data)
      setTicketsLoaded(true)
    }).catch(() => setTicketsLoaded(true))
  }, [])

  // 从意见反馈页返回时刷新工单列表
  useDidShow(() => {
    loadTickets()
  })

  const handleBack = useCallback(() => {
    Taro.switchTab({ url: `/${ROUTES.INDEX}` })
  }, [])

  const openFeedback = useCallback(() => {
    Taro.navigateTo({ url: `/${ROUTES.MINE_FEEDBACK}` })
  }, [])

  const handleContactAction = useCallback((value: string, action: string) => {
    if (action === STRINGS.SERVICE_ACTION_CALL) {
      Taro.makePhoneCall({ phoneNumber: value }).catch(() => undefined)
      return
    }
    if (action === STRINGS.SERVICE_ACTION_QR) {
      setQrVisible(true)
      return
    }
    Taro.setClipboardData({
      data: value,
      success: () => Taro.showToast({ title: STRINGS.SERVICE_COPY_SUCCESS, icon: 'none', duration: 1500 }),
    })
  }, [])

  const closeDetail = useCallback(() => {
    setDetailVisible(false)
  }, [])

  const closeQr = useCallback(() => {
    setQrVisible(false)
  }, [])

  const openDetail = useCallback((ticket: Ticket) => {
    if (detailLoading) return
    setDetailVisible(true)
    setDetailLoading(true)
    setDetail(null)
    getTicketDetail(ticket.id).then(data => {
      setDetail({
        id: ticket.id,
        content: String(data.content ?? ''),
        status: String(data.status ?? ticket.status),
        created_at: String(data.created_at ?? ticket.created_at),
        updated_at: String(data.updated_at ?? ''),
      })
    }).catch(() => {
      Taro.showToast({ title: '加载详情失败', icon: 'none', duration: 2000 })
      setDetailVisible(false)
    }).finally(() => setDetailLoading(false))
  }, [detailLoading])

  const previewTicketImages = useCallback((urls: string[]) => {
    const absoluteUrls = urls.map(url => resolveUrl(url))
    if (absoluteUrls.length === 0) return
    Taro.previewImage({ urls: absoluteUrls, current: absoluteUrls[0] })
  }, [])

  const detailImages = detail ? parseTicketImages(detail.content) : []
  const detailType = detail ? parseTicketType(detail.content) : null
  const detailStatus = detail ? ticketStatusMeta(detail.status) : null

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader
          title={STRINGS.SERVICE_HEADER}
          shouldShowBack
          onBack={handleBack}
        />

        <ScrollView className={styles.body} scrollY>
          <View className={styles.bodyInner}>
            {/* 顶部客服助手 */}
            <View className={styles.assistantCard}>
              <View className={styles.assistantAvatar}>
                <Image className={styles.assistantLogo} src='/assets/logo/zhi-tian-yuan.svg' mode='aspectFit' />
                <View className={styles.onlineDot} />
              </View>
              <View className={styles.assistantInfo}>
                <Text className={styles.assistantName}>{STRINGS.SERVICE_CARD_TITLE}</Text>
                <View className={styles.onlineRow}>
                  <Text className={styles.onlineText}>
                    {STRINGS.SERVICE_ONLINE} {STRINGS.SERVICE_ONLINE_RANGE}
                  </Text>
                </View>
              </View>
            </View>

            {/* 联系方式 */}
            <View className={styles.card}>
              {getContactList().map((contact, index) => (
                <View key={contact.label}>
                  {index > 0 && <View className={styles.divider} />}
                  <View className={styles.contactItem}>
                    <View className={styles.contactIcon}>
                      <Icon name={contact.icon} size={22} color='#1677FF' />
                    </View>
                    <View className={styles.contactMain}>
                      <Text className={styles.contactTitle}>{contact.label}</Text>
                      <Text className={styles.contactValue}>{contact.value}</Text>
                    </View>
                    <View
                      className={styles.contactAction}
                      onClick={() => handleContactAction(contact.value, contact.action)}
                    >
                      <Text className={styles.contactActionText}>{contact.action}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            {/* 我的工单 */}
            <View className={styles.ticketsHeader}>
              <Text className={styles.ticketsTitle}>{STRINGS.SERVICE_TICKETS_TITLE}</Text>
              <Button size='sm' onClick={openFeedback}>+ {STRINGS.SERVICE_TICKETS_ACTION}</Button>
            </View>

            {!ticketsLoaded && (
              <View className={styles.card}>
                <Text className={styles.ticketsHint}>{STRINGS.SERVICE_TICKETS_LOADING}</Text>
              </View>
            )}
            {ticketsLoaded && tickets.length === 0 && (
              <View className={styles.card}>
                <Text className={styles.ticketsHint}>{STRINGS.SERVICE_TICKETS_EMPTY}</Text>
              </View>
            )}
            {tickets.map(ticket => {
              const type = parseTicketType(ticket.content)
              const status = ticketStatusMeta(ticket.status)
              const summary = ticketSummary(ticket.content) || STRINGS.SERVICE_TICKET_CONTENT_EMPTY
              const imageCount = parseTicketImages(ticket.content).length
              return (
                <View key={ticket.id} className={styles.ticketCard} onClick={() => openDetail(ticket)}>
                  <View className={styles.ticketHeader}>
                    <Text className={styles.typeTag}>{type.label}</Text>
                    <Text className={`${styles.statusBadge} ${styles[`status_${status.tone}`]}`}>
                      {status.label}
                    </Text>
                  </View>
                  <Text className={styles.ticketBody}>{summary}</Text>
                  {imageCount > 0 && (
                    <View className={styles.imageTag}>
                      <Icon name='image' size={18} color='#1677FF' />
                      <Text className={styles.imageTagText}>
                        {imageCount} {STRINGS.SERVICE_TICKET_IMAGES_SUFFIX}
                      </Text>
                    </View>
                  )}
                  <View className={styles.ticketFooter}>
                    <Text className={styles.ticketTime}>{formatTicketTime(ticket.created_at)}</Text>
                    <Text className={styles.ticketMore}>{STRINGS.SERVICE_TICKET_DETAIL} &gt;</Text>
                  </View>
                </View>
              )
            })}
          </View>
        </ScrollView>

        {/* 工单详情 */}
        <Popup visible={detailVisible} position='bottom' round closeOnOverlayClick onClose={closeDetail}>
          <View className={styles.detailSheet}>
            <View className={styles.detailHeader}>
              <Text className={styles.detailTitle}>{STRINGS.SERVICE_TICKET_DETAIL_TITLE} #{detail?.id ?? ''}</Text>
              <Text className={styles.detailClose} onClick={closeDetail}>关闭</Text>
            </View>
            {detailLoading && <Text className={styles.detailHint}>{STRINGS.SERVICE_TICKETS_LOADING}</Text>}
            {!detailLoading && detail && (
              <ScrollView className={styles.detailBody} scrollY>
                <View className={styles.detailMetaRow}>
                  {detailType && <Text className={styles.typeTag}>{detailType.label}</Text>}
                  {detailStatus && (
                    <Text className={`${styles.statusBadge} ${styles[`status_${detailStatus.tone}`]}`}>
                      {detailStatus.label}
                    </Text>
                  )}
                </View>
                <Text className={styles.detailContent}>
                  {detail.content || STRINGS.SERVICE_TICKET_CONTENT_EMPTY}
                </Text>
                {detailImages.length > 0 && (
                  <View className={styles.detailImages}>
                    {detailImages.map(url => (
                      <Image
                        key={url}
                        className={styles.detailImage}
                        src={resolveUrl(url)}
                        mode='aspectFill'
                        onClick={() => previewTicketImages(detailImages)}
                      />
                    ))}
                  </View>
                )}
                <View className={styles.detailTimeRow}>
                  <Text className={styles.detailTimeLabel}>{STRINGS.SERVICE_TICKET_CREATED_AT}</Text>
                  <Text className={styles.detailTimeValue}>{formatTicketTime(detail.created_at)}</Text>
                </View>
                <View className={styles.detailTimeRow}>
                  <Text className={styles.detailTimeLabel}>{STRINGS.SERVICE_TICKET_UPDATED_AT}</Text>
                  <Text className={styles.detailTimeValue}>{formatTicketTime(detail.updated_at)}</Text>
                </View>
              </ScrollView>
            )}
          </View>
        </Popup>

        {/* 微信客服二维码（占位，待替换真实二维码；长按可直接识别） */}
        <Popup visible={qrVisible} position='bottom' round closeOnOverlayClick onClose={closeQr}>
          <View className={styles.qrSheet}>
            <View className={styles.detailHeader}>
              <Text className={styles.detailTitle}>{STRINGS.SERVICE_WECHAT_LABEL}</Text>
              <Text className={styles.detailClose} onClick={closeQr}>关闭</Text>
            </View>
            <View className={styles.qrImageWrap}>
              <Image
                className={styles.qrImage}
                src='/assets/service/wechat-kefu-qr.png'
                mode='aspectFit'
                showMenuByLongpress
              />
            </View>
            <Text className={styles.qrHint}>{STRINGS.SERVICE_WECHAT_QR_HINT}</Text>
            <View className={styles.qrIdRow}>
              <View className={styles.qrIdMain}>
                <Text className={styles.contactTitle}>{STRINGS.SERVICE_WECHAT_LABEL}</Text>
                <Text className={styles.contactValue}>{STRINGS.SERVICE_WECHAT_ID}</Text>
              </View>
              <View
                className={styles.contactAction}
                onClick={() => handleContactAction(STRINGS.SERVICE_WECHAT_ID, STRINGS.SERVICE_ACTION_COPY)}
              >
                <Text className={styles.contactActionText}>{STRINGS.SERVICE_ACTION_COPY}</Text>
              </View>
            </View>
          </View>
        </Popup>
      </View>
    </AuthGuard>
  )
}
