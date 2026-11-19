/** 只允许最新一次请求写入状态，防止乱序响应覆盖当前选择。 */
export interface LatestGuard {
  next(): number
  isCurrent(token: number): boolean
  invalidate(): void
}

export function createLatestGuard(): LatestGuard {
  let current = 0
  return {
    next: () => ++current,
    isCurrent: (token: number) => token === current,
    invalidate: () => { current += 1 },
  }
}
