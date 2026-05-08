export const STRINGS = {
  // ---- Tab / Navigation ----
  TAB_QA: '问答',
  TAB_ZONES: '专区',
  TAB_SERVICE: '客服',
  TAB_PROFILE: '我的',

  // ---- Index Page ----
  INDEX_NAV_TITLE: '智能助手',
  INDEX_WELCOME_TITLE: '欢迎来到数字世界！',
  INDEX_WELCOME_SUB: '您可以直接向我提问，或者探索下方专区。',
  INDEX_PLACEHOLDER: '问我任何问题...',
  INDEX_COPY_WECHAT: '复制微信号',
  INDEX_LABEL_WECHAT: '微信号',
  INDEX_LABEL_PHONE: '电话',
  INDEX_AI_TEACHER: '为您找到以下 H3CNE 认证讲师的联系方式，您可以直接添加微信进行咨询。',
  INDEX_AI_DEFAULT: (query: string) => `这是一个模拟的AI回复关于 "${query}" 的内容。基于您的需求，我推荐您查看以下信息。`,

  // ---- Zones Page ----
  ZONES_HEADER: '专区',
  ZONES_BANNER_TITLE: 'H3CNE 认证考试',
  ZONES_BANNER_DESC: '构建中小企业网络，开启网络工程师之路',
  ZONES_BANNER_BTN: '立即报名',
  ZONES_GRID_TITLE: '全部专区',
  ZONES_GRID_DETAIL: '查看详情',
  ZONE_NAMES: ['考试专区', '学习专区', '竞赛专区', '活动专区', '就业专区'] as const,

  // ---- Service Page ----
  SERVICE_HEADER: '人工客服',
  SERVICE_CARD_TITLE: '官方客服助理',
  SERVICE_CARD_SUBTITLE: '在线时间: 09:00 - 18:00',

  // ---- Profile Page ----
  PROFILE_ORDERS: '我的订单',
  PROFILE_ALL_ORDERS: '全部订单',
  PROFILE_LOGOUT: '退出登录',

  // ---- Orders Page ----
  ORDERS_TITLE: '我的订单',
  ORDERS_TAG_ALL: '全部',
  ORDERS_TAG_PENDING: '待付款',
  ORDERS_TAG_ENROLLED: '已报名',
  ORDERS_TAG_CANCELLED: '已取消',

  // ---- Certificates Page ----
  CERTIFICATES_TITLE: '证书中心',
  CERTIFICATES_ISSUE_DATE: '发证日期',
  CERTIFICATES_AUTHORITY: '发证机构',

  // ---- Feedback Page ----
  FEEDBACK_TITLE: '问题反馈',
  FEEDBACK_DESC_LABEL: '问题描述',
  FEEDBACK_DESC_PLACEHOLDER: '请详细描述您遇到的问题...',
  FEEDBACK_CONTACT_LABEL: '联系方式（选填）',
  FEEDBACK_CONTACT_PLACEHOLDER: '请输入手机号或微信号',
  FEEDBACK_SUBMIT: '提交反馈',
  FEEDBACK_SUCCESS: '感谢您的反馈，我们会尽快处理！',

  // ---- Notifications Page ----
  NOTIFICATIONS_TITLE: '消息通知',

  // ---- Auth Page ----
  AUTH_APP_NAME: 'H3CNE 数字世界',
  AUTH_APP_DESC: '开启您的网络工程师认证之旅',
  AUTH_WECHAT_BTN: '微信用户一键登录',
  AUTH_PHONE_BTN: '手机号快捷登录',
  AUTH_AGREEMENT_PREFIX: '我已阅读并同意',
  AUTH_AGREEMENT_TERMS: '《用户服务协议》',
  AUTH_AGREEMENT_PRIVACY: '《隐私政策》',
  AUTH_AGREEMENT_AND: '和',
  AUTH_AGREEMENT_SUFFIX: '，未注册手机号将自动注册',

  // ---- Exam Zone ----
  EXAM_TITLE: '考试专区',
  EXAM_TAG_ALL: '全部',
  EXAM_VIEW: '立即查看',
  EXAM_SIGNUP: '立即报名',
  EXAM_ALL_EXAMS: '全部考试',
  EXAM_SECTION_COUNT: '近7天10000+人报名',

  // ---- Study Zone ----
  STUDY_TITLE: '学习专区',
  STUDY_TAG_ALL: '全部课程',
  STUDY_ENROLL: '立即学习',

  // ---- Competition Zone ----
  COMPETITION_TITLE: '竞赛专区',
  COMPETITION_ONGOING: '进行中',
  COMPETITION_UPCOMING: '即将开始',
  COMPETITION_ENDED: '已结束',
  COMPETITION_VIEW_RESULT: '查看结果',
  COMPETITION_SIGNUP: '立即报名',
  COMPETITION_ENTER: '进入赛场',

  // ---- Activity Zone ----
  ACTIVITY_TITLE: '活动专区',
  ACTIVITY_ONGOING: '进行中',
  ACTIVITY_UPCOMING: '即将开始',
  ACTIVITY_ENDED: '已结束',
  ACTIVITY_VIEW_DETAIL: '查看详情',
  ACTIVITY_REMIND: '预约提醒',
  ACTIVITY_JOIN: '立即参与',

  // ---- Employment Zone ----
  EMPLOYMENT_TITLE: '就业专区',
  EMPLOYMENT_TAG_RECOMMEND: '推荐职位',
  EMPLOYMENT_APPLY: '立即投递',

  // ---- Error Boundary ----
  ERROR_TITLE: '页面出现异常',
  ERROR_DESC: '请稍后重试或联系客服',
} as const
