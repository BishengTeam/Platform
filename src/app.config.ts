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
      root: 'pages/orders',
      pages: ['index'],
    },
    {
      root: 'pages/registration',
      pages: ['index', 'form', 'form-sangfor', 'form-nisp', 'form-renshe', 'xuexin-guide', 'confirm'],
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
    {
      root: 'pages/course',
      pages: ['index', 'detail'],
    },
    {
      root: 'pages/quiz',
      pages: ['index', 'practice', 'mock', 'wrong-book', 'collections', 'checkin'],
    },
    {
      root: 'pages/mine',
      pages: ['courses', 'profile', 'personal-info', 'edit-profile', 'points', 'agreements', 'collections', 'exam-query', 'share', 'deactivate', 'exam-intention', 'contact-teachers'],
    },
    {
      root: 'pages/employment-zone',
      pages: ['index'],
    },
    {
      root: 'pages/login-poster',
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