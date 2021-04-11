import {
  onMounted,
  onUnmounted,
  Ref,
  ref,
  set,
  watch,
  UnwrapRef,
} from '@vue/composition-api'

import { getCurrentInstance } from '../utils'

import { ensureReactive, useData } from './data'
import { Nuxt, useNuxt } from './nuxt'
import { isInitialLoad, isSsrHydration } from './compat'

export type AsyncDataFn<T> = (ctx?: Nuxt) => Promise<T>

export interface AsyncDataOptions {
  server?: boolean
  defer?: boolean
}

export interface AsyncDataObj<T> {
  data: UnwrapRef<T>
  pending: Ref<boolean>
  refresh: () => Promise<void>
  error?: any
}

export function useAsyncData(defaults?: AsyncDataOptions) {
  const nuxt = useNuxt()
  const vm = getCurrentInstance()

  const data = useData(nuxt, vm)
  let dataRef = 1

  const onMountedCbs: Array<() => Promise<void>> = []

  if (process.client) {
    onMounted(() => {
      onMountedCbs.forEach(cb => cb())
      onMountedCbs.splice(0, onMountedCbs.length)
      onMountedCbs.push = cb => {
        cb()
        return 0
      }
    })

    onUnmounted(() => onMountedCbs.splice(0, onMountedCbs.length))
  }

  return async function asyncData<T = Record<string, any>>(
    handler: AsyncDataFn<T>,
    options?: AsyncDataOptions
  ): Promise<AsyncDataObj<T>> {
    if (typeof handler !== 'function') {
      throw new TypeError('asyncData handler must be a function')
    }
    options = {
      server: true,
      defer: false,
      ...defaults,
      ...options,
    }

    const key = String(dataRef++)
    const pending = ref(true)

    const datastore = ensureReactive(data, key)

    const fetch = async () => {
      pending.value = true
      const _handler = handler(nuxt)

      if (_handler instanceof Promise) {
        // Let user resolve if request is promise
        // TODO: handle error
        const result = await _handler

        for (const _key in result) {
          set(datastore, _key, result[_key])
        }

        pending.value = false
      } else {
        // Invalid request
        throw new TypeError('Invalid asyncData handler: ' + _handler)
      }
    }

    const clientOnly = options.server === false

    // Client side
    if (process.client) {
      const isHydrating = isInitialLoad() || isSsrHydration(vm)
      // 1. Hydration (server: true): no fetch
      if (isHydrating && options.server) {
        pending.value = false
      }
      // 2. Initial load (server: false): fetch on mounted
      if (isHydrating && !options.server) {
        // Fetch on mounted (initial load or deferred fetch)
        onMountedCbs.push(fetch)
      } else if (!isHydrating) {
        if (options.defer) {
          // 3. Navigation (defer: true): fetch on mounted
          onMountedCbs.push(fetch)
        } else {
          // 4. Navigation (defer: false): await fetch
          await fetch()
        }
      }
      // Watch handler
      watch(handler.bind(null, nuxt), fetch)
    }

    // Server side
    if (process.server && !clientOnly) {
      await fetch()
    }

    return {
      data: datastore,
      pending,
      refresh: fetch,
    }
  }
}

export function asyncData<T = Record<string, any>>(
  handler: AsyncDataFn<T>,
  options?: AsyncDataOptions
): Promise<AsyncDataObj<T>> {
  return useAsyncData()(handler, options)
}
