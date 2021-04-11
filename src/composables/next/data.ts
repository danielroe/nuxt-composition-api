import { isReactive, reactive, UnwrapRef } from '@vue/composition-api'

import { globalContext } from '../globals'
import { getCurrentInstance } from '../utils'

import { useNuxt } from './nuxt'

export function ensureReactive<
  T extends Record<string, any>,
  K extends keyof T
>(data: T, key: K): UnwrapRef<T[K]> {
  if (!isReactive(data[key])) {
    data[key] = reactive(data[key] || ({} as T[K]))
  }
  return data[key]
}

/**
 * Returns a unique string suitable for syncing data between server and client.
 * @param nuxt (optional) A Nuxt instance
 * @param vm (optional) A Vue component - by default it will use the current instance
 */
export function useSSRRef(nuxt = useNuxt(), vm = getCurrentInstance()): string {
  if (!vm) throw new Error('This must be called within a setup function.')

  // Server
  if (process.server) {
    if (!vm.$vnode.data) vm.$vnode.data = {}
    const attrs = (vm.$vnode.data.attrs = vm.$vnode.data.attrs || {})

    if (!attrs['data-ssr-ref']) {
      nuxt._refCtr = nuxt._refCtr || 1
      attrs['data-ssr-ref'] = String(nuxt._refCtr++)
    }
    return attrs['data-ssr-ref']
  }

  // Client
  return (
    (vm.$vnode.elm as any)?.dataset?.ssrRef || String(Math.random())
  ) /* TODO: unique value for multiple calls */
}

/**
 * Allows accessing reactive data that can be synced between server and client.
 * @param nuxt (optional) A Nuxt instance
 * @param vm (optional) A Vue component - by default it will use the current instance
 */
export function useData<T = Record<string, any>>(
  nuxt = useNuxt(),
  vm = getCurrentInstance()
): UnwrapRef<T> {
  const ssrRef = useSSRRef(nuxt, vm)

  const nuxtState =
    nuxt.context.ssrContext?.nuxt || (window as any)[globalContext]

  nuxtState.data = nuxtState.data || {}

  return ensureReactive(nuxtState.data, ssrRef)
}
