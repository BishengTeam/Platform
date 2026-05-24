export interface Order {
  id: string
  title: string
  description: string
  status: 'pending' | 'enrolled' | 'cancelled'
  date: string
  amount: string
}

export interface OrderDetail {
  orderId: string
  courseCover: string
  courseTitle: string
  courseSubtitle: string
  amountPaid: string
  paymentMethod: string
  paymentTime: string
  orderTime: string
}
