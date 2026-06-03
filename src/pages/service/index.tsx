import { useCallback, useState, useEffect } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { Icon } from '@/components/Icon'
import { PageHeader } from '@/components/PageHeader'
import { STRINGS } from '@/constants/strings'
import { ROUTES } from '@/constants/routes'
import { getContactList, getTickets } from '@/services/dataService'
import styles from './index.module.scss'

interface Ticket {
  id: string
  title: string
  status: string
  created_at: string
}

export default function ServicePage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [ticketsLoaded, setTicketsLoaded] = useState(false)

  useEffect(() => {
    getTickets().then(data => {
      setTickets(data)
      setTicketsLoaded(true)
    })
  }, [])

  const handleBack = useCallback(() => {
    Taro.switchTab({ url: `/${ROUTES.INDEX}` })
  }, [])

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader
          title={STRINGS.SERVICE_HEADER}
          shouldShowBack
          onBack={handleBack}
        />

        <View className={styles.body}>
          <View className={styles.card}>
            <View className={styles.avatar}>H</View>
            <View className={styles.cardTitle}>{STRINGS.SERVICE_CARD_TITLE}</View>
            <View className={styles.cardSubtitle}>{STRINGS.SERVICE_CARD_SUBTITLE}</View>

            <View className={styles.contacts}>
              {getContactList().map((contact, idx) => (
                <View key={idx} className={styles.contactItem}>
                  <View className={styles.contactLeft}>
                    <View className={styles.contactIcon}>
                      <Icon name={contact.icon} size={16} color='#1677FF' />
                    </View>
                    <View>
                      <View className={styles.contactLabel}>{contact.label}</View>
                      <View className={styles.contactValue}>{contact.value}</View>
                    </View>
                  </View>
                  <View className={styles.contactAction}>{contact.action}</View>
                </View>
              ))}
            </View>
          </View>

          {ticketsLoaded && (
            <View className={styles.card}>
              <View className={styles.cardTitle}>{STRINGS.SERVICE_TICKETS_TITLE}</View>
              {tickets.length === 0 ? (
                <View className={styles.cardSubtitle}>{STRINGS.SERVICE_TICKETS_EMPTY}</View>
              ) : (
                <View className={styles.contacts}>
                  {tickets.map(ticket => (
                    <View key={ticket.id} className={styles.contactItem}>
                      <View className={styles.contactLeft}>
                        <View>
                          <View className={styles.contactLabel}>{ticket.title}</View>
                          <View className={styles.contactValue}>
                            {STRINGS.SERVICE_TICKETS_STATUS} {ticket.status}
                          </View>
                        </View>
                      </View>
                      <View className={styles.contactAction}>{ticket.created_at}</View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    </AuthGuard>
  )
}
