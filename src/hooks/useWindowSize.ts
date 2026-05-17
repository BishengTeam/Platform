import Taro from '@tarojs/taro'

interface WindowSize {
  width: number
  height: number
}

let cached: WindowSize | null = null

function getWindowSize(): WindowSize {
  if (cached) return cached
  try {
    const info = Taro.getSystemInfoSync()
    cached = { width: info.windowWidth, height: info.windowHeight }
  } catch {
    cached = { width: 375, height: 667 }
  }
  return cached
}

export function useWindowSize(): WindowSize {
  return getWindowSize()
}
