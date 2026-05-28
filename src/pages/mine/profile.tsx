import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Icon } from '@/components/Icon'
import { Button } from '@/components/Button'
import { STRINGS } from '@/constants/strings'
import { ROUTES } from '@/constants/routes'
import styles from './profile.module.scss'

interface MenuItem {
  icon?: string
  label: string
  route?: string
}

const menuItems: MenuItem[] = [
  { label: STRINGS.MINE_PROFILE_TITLE, route: ROUTES.MINE_PERSONAL_INFO },
  { label: STRINGS.MINE_AGREEMENTS_TITLE, route: ROUTES.MINE_AGREEMENTS },
  { icon: 'info', label: STRINGS.SETTINGS_ABOUT_US },
  { icon: 'edit', label: STRINGS.SETTINGS_FEEDBACK },
  { icon: 'list', label: STRINGS.SETTINGS_PERSONAL_INFO_LIST },
  { icon: 'alert-circle', label: STRINGS.MINE_DEACTIVATE_TITLE, route: ROUTES.MINE_DEACTIVATE },
]

export default function SettingsPage() {
  const handleMenuItemClick = (item: MenuItem) => {
    if (item.route) {
      Taro.navigateTo({ url: `/${item.route}` })
    } else {
      Taro.showToast({ title: STRINGS.PROFILE_FEATURE_IN_DEVELOPMENT, icon: 'none' })
    }
  }

  const handleLogout = () => {
    Taro.showModal({
      title: STRINGS.LOGOUT_MODAL_TITLE,
      content: STRINGS.LOGOUT_MODAL_CONTENT,
      cancelText: STRINGS.LOGOUT_MODAL_CANCEL,
      confirmText: STRINGS.LOGOUT_MODAL_CONFIRM,
      success: (res) => {
        if (res.confirm) {
          Taro.reLaunch({ url: `/${ROUTES.AUTH}` })
        }
      },
    })
  }

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.PROFILE_SETTINGS} shouldShowBack />
        <ScrollView className={styles.body} scrollY>
          <View className={styles.menuSection}>
            {menuItems.map((item, index) => (
              <View key={item.label}>
                {index > 0 && <View className={styles.divider} />}
                <View className={styles.menuItem} onClick={() => handleMenuItemClick(item)}>
                  <View className={styles.menuLeft}>
                    {item.icon && <Icon name={item.icon} size={28} color='#666666' />}
                    <Text className={styles.menuLabel}>{item.label}</Text>
                  </View>
                  <Icon name='chevron-right' size={22} color='#CCCCCC' />
                </View>
              </View>
            ))}
          </View>

          <View className={styles.btnSection}>
            <Button variant='white' size='lg' onClick={handleLogout}>
              {STRINGS.PROFILE_LOGOUT}
            </Button>
          </View>
        </ScrollView>
      </View>
    </AuthGuard>
  )
}
