import { globalNuxt } from '../../globals'
import { getCurrentInstance } from '../../utils'

export const isSsrHydration = (vm = getCurrentInstance()) =>
  !!(vm?.$vnode?.elm as any)?.dataset?.ssrRef

export function isInitialLoad() {
  return process.client && !(window[globalNuxt] as any).__isReady
}
