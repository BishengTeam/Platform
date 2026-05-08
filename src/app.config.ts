import { ROUTES, TAB_BAR_CONFIG } from './constants/routes'

export default defineAppConfig({
  pages: [
    ROUTES.INDEX,
    ROUTES.ZONES,
    ROUTES.SERVICE,
    ROUTES.PROFILE,
  ],
  subPackages: [
    {
      root: 'pages/auth',
      pages: ['index'],
    },
    {
      root: 'pages/exam-zone',
      pages: ['index'],
    },
    {
      root: 'pages/study-zone',
      pages: ['index'],
    },
    {
      root: 'pages/competition-zone',
      pages: ['index'],
    },
    {
      root: 'pages/activity-zone',
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
  ],
  preloadRule: {
    'pages/zones/index': {
      network: 'all',
      packages: [
        'pages/exam-zone',
        'pages/study-zone',
        'pages/competition-zone',
        'pages/activity-zone',
        'pages/employment-zone',
      ],
    },
  },
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
