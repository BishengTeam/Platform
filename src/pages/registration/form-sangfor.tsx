import Taro, { useLoad } from '@tarojs/taro'
import { ROUTES } from '@/constants/routes'

/** Old bookmarks lead to real public batches rather than the retired generic form. */
export default function LegacySangforFormPage() {
  useLoad(() => { void Taro.redirectTo({ url: `/${ROUTES.SANGFOR_INDEX}` }) })
  return null
}
