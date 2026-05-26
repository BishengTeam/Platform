import type { QuizCategory, QuizQuestion, CheckinRecord, WrongQuestion } from '@/types'
import { STRINGS } from '@/constants/strings'

export const quizCategories: QuizCategory[] = [
  { id: 'cat-h3cne', name: 'H3CNE 题库', questionCount: 500, icon: 'book-open' },
  { id: 'cat-sangfor', name: '深信服安全题库', questionCount: 300, icon: 'shield' },
  { id: 'cat-nisp', name: 'NISP 题库', questionCount: 200, icon: 'award' },
]

const baseQuestions: QuizQuestion[] = [
  {
    id: 'q1', categoryId: 'cat-h3cne', type: 'single',
    stem: '以下关于OSPF协议的说法，正确的是？',
    options: [
      { label: 'A', text: 'OSPF使用TCP协议传输' },
      { label: 'B', text: 'OSPF是距离矢量协议' },
      { label: 'C', text: 'OSPF使用链路状态算法' },
      { label: 'D', text: 'OSPF不支持区域划分' },
    ],
    correctAnswer: 2, explanation: 'OSPF（Open Shortest Path First）是一种链路状态路由协议，使用IP协议直接传输（协议号89），支持区域划分。',
  },
  {
    id: 'q2', categoryId: 'cat-h3cne', type: 'single',
    stem: 'IPv4地址中，以下哪个是私有地址？',
    options: [
      { label: 'A', text: '8.8.8.8' },
      { label: 'B', text: '172.16.1.1' },
      { label: 'C', text: '100.100.1.1' },
      { label: 'D', text: '200.1.1.1' },
    ],
    correctAnswer: 1, explanation: '172.16.0.0-172.31.255.255是B类私有地址范围。',
  },
  {
    id: 'q3', categoryId: 'cat-h3cne', type: 'single',
    stem: '以下哪条命令用于查看路由表？',
    options: [
      { label: 'A', text: 'display ip routing-table' },
      { label: 'B', text: 'display ip interface' },
      { label: 'C', text: 'display arp' },
      { label: 'D', text: 'display vlan' },
    ],
    correctAnswer: 0, explanation: 'display ip routing-table 用于查看设备的路由表信息。',
  },
  {
    id: 'q4', categoryId: 'cat-h3cne', type: 'single',
    stem: 'TCP三次握手中，客户端发送的第一个报文标志位是什么？',
    options: [
      { label: 'A', text: 'ACK' },
      { label: 'B', text: 'SYN' },
      { label: 'C', text: 'FIN' },
      { label: 'D', text: 'RST' },
    ],
    correctAnswer: 1, explanation: 'TCP三次握手的第一步，客户端发送SYN=1的报文，表示请求建立连接。',
  },
  {
    id: 'q5', categoryId: 'cat-h3cne', type: 'multiple',
    stem: '以下哪些属于路由协议？（多选）',
    options: [
      { label: 'A', text: 'OSPF' },
      { label: 'B', text: 'BGP' },
      { label: 'C', text: 'HTTP' },
      { label: 'D', text: 'RIP' },
    ],
    correctAnswer: [0, 1, 3], explanation: 'OSPF、BGP、RIP都是路由协议，HTTP是应用层协议。',
  },
  {
    id: 'q6', categoryId: 'cat-sangfor', type: 'single',
    stem: '深信服SSL VPN的默认端口号是？',
    options: [
      { label: 'A', text: '443' },
      { label: 'B', text: '4430' },
      { label: 'C', text: '8080' },
      { label: 'D', text: '8443' },
    ],
    correctAnswer: 0, explanation: '深信服SSL VPN默认使用443端口进行通信。',
  },
  {
    id: 'q7', categoryId: 'cat-sangfor', type: 'single',
    stem: '以下哪种攻击属于DDoS攻击？',
    options: [
      { label: 'A', text: 'SQL注入' },
      { label: 'B', text: 'SYN Flood' },
      { label: 'C', text: 'XSS跨站脚本' },
      { label: 'D', text: '文件上传漏洞' },
    ],
    correctAnswer: 1, explanation: 'SYN Flood是一种典型的DDoS（分布式拒绝服务）攻击方式。',
  },
  {
    id: 'q8', categoryId: 'cat-nisp', type: 'single',
    stem: '信息安全的三大基本属性不包括以下哪项？',
    options: [
      { label: 'A', text: '机密性' },
      { label: 'B', text: '完整性' },
      { label: 'C', text: '可用性' },
      { label: 'D', text: '可扩展性' },
    ],
    correctAnswer: 3, explanation: '信息安全的三大基本属性是机密性（Confidentiality）、完整性（Integrity）和可用性（Availability），简称CIA三要素。',
  },
  {
    id: 'q9', categoryId: 'cat-h3cne', type: 'single',
    stem: '以太网帧中，目的MAC地址字段占用多少字节？',
    options: [
      { label: 'A', text: '4字节' },
      { label: 'B', text: '6字节' },
      { label: 'C', text: '8字节' },
      { label: 'D', text: '2字节' },
    ],
    correctAnswer: 1, explanation: 'MAC地址长度为48位（6字节），以太网帧中目的MAC地址和源MAC地址各占6字节。',
  },
  {
    id: 'q10', categoryId: 'cat-h3cne', type: 'multiple',
    stem: '以下哪些是有效的子网掩码？（多选）',
    options: [
      { label: 'A', text: '255.255.255.0' },
      { label: 'B', text: '255.255.255.1' },
      { label: 'C', text: '255.255.224.0' },
      { label: 'D', text: '255.255.240.0' },
    ],
    correctAnswer: [0, 2, 3], explanation: '子网掩码必须是连续的1后面跟连续的0，255.255.255.1不是有效掩码。',
  },
]

export const quizQuestions: QuizQuestion[] = baseQuestions

export const wrongBook: WrongQuestion[] = [
  {
    id: 'q1', categoryId: 'cat-h3cne', type: 'single',
    stem: '以下关于OSPF协议的说法，正确的是？',
    options: [
      { label: 'A', text: 'OSPF使用TCP协议传输' },
      { label: 'B', text: 'OSPF是距离矢量协议' },
      { label: 'C', text: 'OSPF使用链路状态算法' },
      { label: 'D', text: 'OSPF不支持区域划分' },
    ],
    correctAnswer: 2, explanation: 'OSPF（Open Shortest Path First）是一种链路状态路由协议。',
    wrongDate: '2026-05-20', wrongCount: 3,
  },
  {
    id: 'q4', categoryId: 'cat-h3cne', type: 'single',
    stem: 'TCP三次握手中，客户端发送的第一个报文标志位是什么？',
    options: [
      { label: 'A', text: 'ACK' },
      { label: 'B', text: 'SYN' },
      { label: 'C', text: 'FIN' },
      { label: 'D', text: 'RST' },
    ],
    correctAnswer: 1, explanation: 'TCP三次握手的第一步，客户端发送SYN=1的报文。',
    wrongDate: '2026-05-22', wrongCount: 1,
  },
]

export const favoriteQuestions: QuizQuestion[] = [quizQuestions[0], quizQuestions[2]]

function generateCheckinData(): CheckinRecord[] {
  const records: CheckinRecord[] = []
  const today = new Date()
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    records.push({
      date: dateStr,
      completed: i > 0 && i < 8,
      questionCount: i > 0 && i < 8 ? 10 : 0,
    })
  }
  return records
}

export const checkinRecords: CheckinRecord[] = generateCheckinData()
