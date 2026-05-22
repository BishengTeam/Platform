import { Component } from 'react'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

// React 尚未提供函数式 Error Boundary 的官方 Hook，Taro 框架也未支持，
// 因此必须使用 Class 组件实现 componentDidCatch / getDerivedStateFromError。
// 待 React/Taro 官方支持 useErrorBoundary Hook 后可迁移为函数组件。
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(_error: Error) {}

  render() {
    if (this.state.hasError) {
      return null
    }
    return this.props.children
  }
}
