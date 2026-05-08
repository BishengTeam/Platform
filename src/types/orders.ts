export interface Order {
  id: string
  title: string
  description: string
  status: '待付款' | '已报名' | '已取消'
  date: string
  amount: string
}
