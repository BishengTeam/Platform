import { ROUTES, TAB_BAR_CONFIG } from './constants/routes'

export default defineAppConfig({
  pages: [
    ROUTES.INDEX,
    'pages/training/index',
    'pages/activity-zone/index',
    ROUTES.PROFILE,
  ],
  subPackages: [
    {
      root: 'pages/auth',
      pages: ['index'],
    },
    {
      root: 'pages/zones',
      pages: ['index'],
    },
    {
      root: 'pages/exam-zone',
      pages: ['index'],
    },
    {
      root: 'pages/competition-zone',
      pages: ['index'],
    },
    {
      root: 'pages/employment-zone',
      pages: ['index'],
    },
    {
      root: 'pages/orders',
      pages: ['index'],
    },
    {
      root: 'pages/certificates',
      pages: ['index'],
    },
    {
      root: 'pages/feedback',
      pages: ['index'],
    },
    {
      root: 'pages/notifications',
      pages: ['index'],
    },
    {
      root: 'pages/registration',
      pages: ['index', 'form', 'confirm'],
    },
    {
      root: 'pages/payment',
      pages: ['result'],
    },
    {
      root: 'pages/order-detail',
      pages: ['index'],
    },
    {
      root: 'pages/service',
      pages: ['index'],
    },
    {
      root: 'pages/ai-consult',
      pages: ['index'],
    },
  ],
  tabBar: {
    custom: true,
    color: '#999999',
    selectedColor: '#1677FF',
    backgroundColor: '#ffffff',
    borderStyle: 'white',
    list: TAB_BAR_CONFIG.map(tab => ({
      pagePath: tab.key,
      text: tab.label,
      iconPath: `assets/icons/${tab.icon}.png`,
      selectedIconPath: `assets/icons/${tab.icon}-active.png`,
    })),
  },
  window: {
    navigationStyle: 'custom',
    backgroundColor: '#F0F5FF',
  },
})
