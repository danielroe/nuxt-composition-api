import {
  ref,
  isRef,
  onBeforeMount,
  onServerPrefetch,
  reactive,
  set,
} from '@vue/composition-api'

import {
  globalContext,
  globalNuxt,
  isFullStatic,
} from '@nuxtjs/composition-api/dist/runtime/globals'
import type { NuxtApp } from '@nuxt/types/app'

import { getCurrentInstance, ComponentInstance } from './utils'

const nuxtState = process.client && (window as any)[globalContext]

function normalizeError(err: any) {
  let message: string
  if (!(err.message || typeof err === 'string')) {
    try {
      message = JSON.stringify(err, null, 2)
    } catch (e) {
      message = `[${err.constructor.name}]`
    }
  } else {
    message = err.message || err
  }
  return {
    ...err,
    message,
    statusCode:
      err.statusCode ||
      err.status ||
      (err.response && err.response.status) ||
      500,
  }
}

function createGetCounter(counterObject: Record<string, any>, defaultKey = '') {
  return function getCounter(id = defaultKey) {
    if (counterObject[id] === undefined) {
      counterObject[id] = 0
    }
    return counterObject[id]++
  }
}

interface Fetch {
  (context: ComponentInstance): any | Promise<any>
}
interface UseFetchOptions {
  expose?: string,
  manual?: boolean,
}

const fetches = new WeakMap<ComponentInstance, Fetch[]>()
const fetchPromises = new Map<Fetch, Promise<any>>()

const isSsrHydration = (vm: ComponentInstance) =>
  (vm.$vnode?.elm as any)?.dataset?.fetchKey

interface AugmentedComponentInstance extends ComponentInstance {
  _fetchKey?: number | string
  _data?: any
  _hydrated?: boolean
  _fetchDelay?: number
  _fetchOnServer?: boolean
}

interface AugmentedNuxtApp extends NuxtApp {
  isPreview?: boolean
  _payloadFetchIndex?: number
  _pagePayload?: any
}

function registerCallback(vm: ComponentInstance, callback: Fetch) {
  const callbacks = fetches.get(vm) || []
  fetches.set(vm, [...callbacks, callback])
}

async function callFetches(this: AugmentedComponentInstance) {
  const fetchesToCall = fetches.get(this)
  if (!fetchesToCall) return
  ;(this[globalNuxt] as any).nbFetching++

  this.$fetchState.pending = true
  this.$fetchState.error = null
  this._hydrated = false

  let error = null
  const startTime = Date.now()

  try {
    await Promise.all(
      fetchesToCall.map(fetch => {
        if (fetchPromises.has(fetch)) return fetchPromises.get(fetch)
        const promise = Promise.resolve(fetch(this)).finally(() =>
          fetchPromises.delete(fetch)
        )
        fetchPromises.set(fetch, promise)
        return promise
      })
    )
  } catch (err) {
    if ((process as any).dev) {
      console.error('Error in fetch():', err)
    }
    error = normalizeError(err)
  }

  const delayLeft = (this._fetchDelay || 0) - (Date.now() - startTime)
  if (delayLeft > 0) {
    await new Promise(resolve => setTimeout(resolve, delayLeft))
  }

  this.$fetchState.error = error
  this.$fetchState.pending = false
  this.$fetchState.timestamp = Date.now()

  this.$nextTick(() => (this[globalNuxt] as any).nbFetching--)
}

const setFetchState = (vm: AugmentedComponentInstance) => {
  vm.$fetchState =
    vm.$fetchState ||
    reactive({
      error: null,
      pending: false,
      timestamp: 0,
    })
}

const loadFullStatic = (vm: AugmentedComponentInstance) => {
  vm._fetchKey = getKey(vm)
  // Check if component has been fetched on server
  const { fetchOnServer } = vm.$options
  const fetchedOnServer =
    typeof fetchOnServer === 'function'
      ? fetchOnServer.call(vm) !== false
      : fetchOnServer !== false

  const nuxt = vm[globalNuxt] as AugmentedNuxtApp
  if (!fetchedOnServer || nuxt?.isPreview || !nuxt?._pagePayload) {
    return
  }
  vm._hydrated = true
  const data = nuxt._pagePayload.fetch[vm._fetchKey!]

  // If fetch error
  if (data && data._error) {
    vm.$fetchState.error = data._error
    return
  }

  onBeforeMount(() => {
    // Merge data
    for (const key in data) {
      set(vm, key, data[key])
    }
  })
}

async function serverPrefetch(vm: AugmentedComponentInstance) {
  if (!vm._fetchOnServer) return

  // Call and await on $fetch
  setFetchState(vm)

  try {
    await callFetches.call(vm)
  } catch (err) {
    if ((process as any).dev) {
      console.error('Error in fetch():', err)
    }
    vm.$fetchState.error = normalizeError(err)
  }
  vm.$fetchState.pending = false

  // Define an ssrKey for hydration
  vm._fetchKey =
    // Nuxt 2.15+ uses a different format - an object rather than an array
    'push' in vm.$ssrContext.nuxt.fetch
      ? vm.$ssrContext.nuxt.fetch.length
      : vm._fetchKey || vm.$ssrContext.fetchCounters['']++

  // Add data-fetch-key on parent element of Component
  if (!vm.$vnode.data) vm.$vnode.data = {}
  const attrs = (vm.$vnode.data.attrs = vm.$vnode.data.attrs || {})
  attrs['data-fetch-key'] = vm._fetchKey

  const data = { ...vm._data }
  Object.entries((vm as any).__composition_api_state__.rawBindings).forEach(
    ([key, val]) => {
      if (val instanceof Function || val instanceof Promise) return

      data[key] = isRef(val) ? val.value : val
    }
  )

  // Add to ssrContext for window.__NUXT__.fetch
  const content = vm.$fetchState.error
    ? { _error: vm.$fetchState.error }
    : JSON.parse(JSON.stringify(data))
  if ('push' in vm.$ssrContext.nuxt.fetch) {
    vm.$ssrContext.nuxt.fetch.push(content)
  } else {
    vm.$ssrContext.nuxt.fetch[vm._fetchKey!] = content
  }
}

function getKey(vm: AugmentedComponentInstance) {
  const nuxtState = vm[globalNuxt] as any
  if (process.server && 'push' in vm.$ssrContext.nuxt.fetch) {
    return undefined
  } else if (process.client && '_payloadFetchIndex' in nuxtState) {
    nuxtState._payloadFetchIndex = nuxtState._payloadFetchIndex || 0
    return nuxtState._payloadFetchIndex++
  }
  const defaultKey = (vm.$options as any)._scopeId || vm.$options.name || ''
  const getCounter = createGetCounter(
    process.server
      ? vm.$ssrContext.fetchCounters
      : (vm[globalNuxt] as any)._fetchCounters,
    defaultKey
  )

  const options: {
    fetchKey:
      | ((getCounter: ReturnType<typeof createGetCounter>) => string)
      | string
  } = vm.$options as any

  if (typeof options.fetchKey === 'function') {
    return options.fetchKey.call(vm, getCounter)
  } else {
    const key =
      'string' === typeof options.fetchKey ? options.fetchKey : defaultKey
    return key ? key + ':' + getCounter(key) : String(getCounter(key))
  }
}

/**
 * Versions of Nuxt newer than v2.12 support a [custom hook called `fetch`](https://nuxtjs.org/api/pages-fetch/) that allows server-side and client-side asynchronous data-fetching.

 * @param callback The async function you want to run.
 * @example

  ```ts
  import { defineComponent, ref, useFetch } from '@nuxtjs/composition-api'
  import axios from 'axios'

  export default defineComponent({
    setup() {
      const name = ref('')

      const { fetch, fetchState } = useFetch(async () => {
        name.value = await axios.get('https://myapi.com/name')
      })

      // Manually trigger a refetch
      fetch()

      // Access fetch error, pending and timestamp
      fetchState

      return { name }
    },
  })
  ```

  ```ts
  import { defineComponent, ref, useFetch } from '@nuxtjs/composition-api'
  import axios from 'axios'

  export default defineComponent({
    setup() {
      const { fetch, fetchState, data } = useFetch(
        async () => {
          // The return value will be set to
          return await axios.get('https://myapi.com/name')
        },
        {
          manual: true, // Disable auto fetch unless `fetch()` is called manually
          expose: 'name', // The name exposed to the template by which can access the hook's return value 
        },
      )
      
      // Manually trigger a refetch
      fetch()

      // Access the returned value of fetch hook
      data.value
    },
  })
  ```
 */
export const useFetch = (callback: Fetch, options: UseFetchOptions) => {
  const vm = getCurrentInstance() as AugmentedComponentInstance | undefined
  if (!vm) throw new Error('This must be called within a setup function.')

  const resultData = ref()
  let callbackProxy: Fetch = async function (this: any, ...args) {
    const result = await callback.apply(this, args)
    resultData.value = result
    return result
  }
  if (options.manual) {
    let callbackManually:Fetch = () => {
      callbackManually = callbackProxy
    }
    registerCallback(vm, callbackManually)
  } else {
    registerCallback(vm, callbackProxy)
  }
  if (options.expose) {
    vm[options.expose] = resultData
  }

  if (typeof vm.$options.fetchOnServer === 'function') {
    vm._fetchOnServer = vm.$options.fetchOnServer.call(vm) !== false
  } else {
    vm._fetchOnServer = vm.$options.fetchOnServer !== false
  }

  if (process.server) {
    vm._fetchKey = getKey(vm)
  }

  setFetchState(vm)

  onServerPrefetch(() => serverPrefetch(vm))

  function result() {
    return {
      fetch: vm!.$fetch,
      fetchState: vm!.$fetchState,
      $fetch: vm!.$fetch,
      $fetchState: vm!.$fetchState,
      data: resultData,
    }
  }

  vm._fetchDelay =
    typeof vm.$options.fetchDelay === 'number' ? vm.$options.fetchDelay : 0

  vm.$fetch = callFetches.bind(vm)

  onBeforeMount(() => !vm._hydrated && callFetches.call(vm))

  if (process.server || !isSsrHydration(vm)) {
    if (process.client && isFullStatic) loadFullStatic(vm)
    return result()
  }

  // Hydrate component
  vm._hydrated = true
  vm._fetchKey = (vm.$vnode.elm as any)?.dataset.fetchKey || getKey(vm)
  const data = nuxtState.fetch[vm._fetchKey!]

  // If fetch error
  if (data && data._error) {
    vm.$fetchState.error = data._error
    return result()
  }

  onBeforeMount(() => {
    // Merge data
    for (const key in data) {
      try {
        if (key in vm && typeof vm[key as keyof typeof vm] === 'function') {
          continue
        }
        set(vm, key, data[key])
      } catch (e) {
        if (process.env.NODE_ENV === 'development')
          // eslint-disable-next-line
          console.warn(`Could not hydrate ${key}.`)
      }
    }
  })

  return result()
}
