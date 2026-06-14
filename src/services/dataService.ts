/**
 * dataService — 统一数据服务入口（barrel file）
 *
 * 所有 API 函数已拆分到按领域的 service 文件：
 *   authService   — 登录/认证/身份
 *   zoneService   — 专区聚合 + 活动/竞赛/就业
 *   courseService — 课程
 *   quizService   — 题库
 *   userService   — 用户/订单/报名/杂项
 *
 * 现有调用方无需修改 — 所有函数通过此文件重导出。
 */

// Quiz
export {
  getQuizCategories, getQuizQuestions, getWrongBook,
  getFavoriteQuestions, getCheckinRecords,
  getCheckinStatus, addWrongBook, removeWrongBook, submitQuizAnswer,
  addQuizFavorite, removeQuizFavorite,
  getQuizStats, getQuizProgress, getQuizCategoryTree,
} from './quizService'

// Auth
export {
  wxLogin, refreshToken, logout,
  submitIdentity, getIdentityStatus,
  unbindAccount, deleteAccount, decryptPhone,
} from './authService'

// Zone
export {
  getHomeAggregation, getCourseList, getActivityList,
  getJobList, getCertificationList, getCompetitionList,
  enrollActivity, remindActivity, signupCompetition, applyJob,
  getZoneIcons, getQuickQuestions, getInitialMessages,
  getContactList, getOrderItems, getProfileFunctions, getExamBannerItems,
} from './zoneService'

// Course
export {
  getCourseListExpanded, getCourseCategories,
  getCourseById, getMyCourses, enrollCourse,
} from './courseService'

// User & misc
export {
  getCertifications, getCertDetail, getRegistrationTagFilters,
  getOrders, getOrderDetail, getPointsBalance, getPointRecords,
  getAgreements,
  getMyCollections, getRegisteredExams,
  createOrder, prepayOrder,
  addFavorite, removeFavorite, submitCheckin,
  validateCoupon,
  getUserProfile, updateUserProfile,
  updateIdentity, submitStudent, updateStudent, submitEnterprise, updateEnterprise,
  sendChatMessage,
  signAgreement, getCoupons, getTickets,
  uploadFile,
  getSangforCoupons, getSangforVerifyCode,
  getNispPinyin, getNispTemplate,
  claimPoints, redeemPoints, getPrices,
  addCollection, removeCollection,
  getActivities, registerActivity,
  getCompetitionStats, getCompetitionTracks,
  getJobs, createTicket, getTicketDetail,
  createShare, getShareInfo, getMediaUrl,
  assignCoupon, verifyCoupon, streamChatMessage,
  getPoster, uploadToOss, getSystemMediaUrl,
  fetchQuickQuestions,
} from './userService'