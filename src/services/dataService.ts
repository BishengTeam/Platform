import {
  zoneIcons,
  quickQuestions,
  initialMessages,
  homeCourses,
  homeActivities,
  examBannerItems,
  examCards,
  examTagFilters,
  studyTagFilters,
  studyBannerItems,
  courseList,
  competitionTagFilters,
  competitionBannerItems,
  ongoingCompetitions,
  upcomingCompetitions,
  endedCompetitions,
  activityTagFilters,
  activityBannerItems,
  ongoingActivities,
  upcomingActivities,
  endedActivities,
  employmentTagFilters,
  employmentBannerItems,
  jobList,
  contactList,
  orderItems,
  profileFunctions,
  orders,
  orderDetails,
  certificates,
  notifications,
  certifications,
  registrationTagFilters,
} from '@/constants/mock'

export function getZoneIcons() { return zoneIcons }
export function getQuickQuestions() { return quickQuestions }
export function getInitialMessages() { return initialMessages }
export function getHomeCourses() { return homeCourses }
export function getHomeActivities() { return homeActivities }

export function getExamBannerItems() { return examBannerItems }
export function getExamCards() { return examCards }
export function getExamTagFilters() { return examTagFilters }

export function getStudyTagFilters() { return studyTagFilters }
export function getStudyBannerItems() { return studyBannerItems }
export function getCourseList() { return courseList }

export function getCompetitionTagFilters() { return competitionTagFilters }
export function getCompetitionBannerItems() { return competitionBannerItems }
export function getOngoingCompetitions() { return ongoingCompetitions }
export function getUpcomingCompetitions() { return upcomingCompetitions }
export function getEndedCompetitions() { return endedCompetitions }

export function getActivityTagFilters() { return activityTagFilters }
export function getActivityBannerItems() { return activityBannerItems }
export function getOngoingActivities() { return ongoingActivities }
export function getUpcomingActivities() { return upcomingActivities }
export function getEndedActivities() { return endedActivities }

export function getEmploymentTagFilters() { return employmentTagFilters }
export function getEmploymentBannerItems() { return employmentBannerItems }
export function getJobList() { return jobList }

export function getContactList() { return contactList }

export function getOrderItems() { return orderItems }
export function getProfileFunctions() { return profileFunctions }

export function getOrders() { return orders }

export function getOrderDetail(id: string) {
  if (orderDetails[id]) return orderDetails[id]
  return Object.values(orderDetails).find(d => d.orderId === id) || null
}

export function getCertificates() { return certificates }

export function getNotifications() { return notifications }

export function getCertifications() { return certifications }
export function getRegistrationTagFilters() { return registrationTagFilters }
