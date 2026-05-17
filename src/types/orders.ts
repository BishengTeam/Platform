export interface Order {
  id: string
  title: string
  description: string
  status: 'pending' | 'enrolled' | 'cancelled'
  date: string
  amount: string
}
