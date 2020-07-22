import {
  customRef,
  onServerPrefetch,
  ref,
  shallowRef,
} from '@vue/composition-api'
import type { Ref } from '@vue/composition-api'

import { globalContext, globalNuxt } from './globals'
import { validateKey } from './utils'

function getValue<T>(value: T | (() => T)): T {
  if (value instanceof Function) return value()
  return value
}

let data: any = {}

export function setSSRContext(ssrContext: any) {
  data = Object.assign({}, {})
  ssrContext.nuxt.ssrRefs = data
}

const isProxyable = (val: unknown): val is Record<string, unknown> =>
  val && typeof val === 'object'

const sanitise = (val: unknown) =>
  (val && JSON.parse(JSON.stringify(val))) || val

const ssrValue = <T>(value: T | (() => T), key: string): T => {
  if (process.client) {
    if (
      process.env.NODE_ENV === 'development' &&
      window[globalNuxt]?.context.isHMR
    ) {
      return getValue(value)
    }
    return (window as any)[globalContext]?.ssrRefs?.[key] ?? getValue(value)
  }
  return getValue(value)
}

/**
 * `ssrRef` will automatically add ref values to `window.__NUXT__` on SSR if they have been changed from their initial value. It can be used outside of components, such as in shared utility functions, and it supports passing a factory function that will generate the initial value of the ref. **At the moment, an `ssrRef` is only suitable for one-offs, unless you provide your own unique key.**
 * @param value This can be an initial value or a factory function that will be executed on server-side to get the initial value.
 * @param key Under the hood, `ssrRef` requires a key to ensure that the ref values match between client and server. If you have added `nuxt-composition-api` to your `buildModules`, this will be done automagically by an injected Babel plugin. If you need to do things differently, you can specify a key manually or add `nuxt-composition-api/babel` to your Babel plugins.
 * @example
  ```ts
  import { ssrRef } from 'nuxt-composition-api'

  const val = ssrRef('')

  // When hard-reloaded, `val` will be initialised to 'server set'
  if (process.server) val.value = 'server set'

  // When hard-reloaded, the result of myExpensiveSetterFunction() will
  // be encoded in nuxtState and used as the initial value of this ref.
  // If client-loaded, the setter function will run to come up with initial value.
  const val2 = ssrRef(myExpensiveSetterFunction)
  ```
 */
export const ssrRef = <T>(value: T | (() => T), key?: string): Ref<T> => {
  validateKey(key)
  let val = ssrValue(value, key)

  if (process.client) return ref(val) as Ref<T>

  if (value instanceof Function) data[key] = sanitise(val)

  const getProxy = <T extends Record<string | number, any>>(
    track: () => void,
    trigger: () => void,
    observable: T
  ): T =>
    new Proxy(observable, {
      get(target, prop: string | number) {
        track()
        if (isProxyable(target[prop]))
          return getProxy(track, trigger, target[prop])
        return Reflect.get(target, prop)
      },
      set(obj, prop, newVal) {
        const result = Reflect.set(obj, prop, newVal)
        data[key] = sanitise(val)
        trigger()
        return result
      },
    })

  const proxy = customRef((track, trigger) => ({
    get: () => {
      track()
      if (isProxyable(val)) return getProxy(track, trigger, val)
      return val
    },
    set: (v: T) => {
      data[key] = sanitise(v)
      val = v
      trigger()
    },
  }))

  return proxy
}

/**
 * This helper creates a [`shallowRef`](https://vue-composition-api-rfc.netlify.app/api.html#shallowref) (a ref that tracks its own .value mutation but doesn't make its value reactive) that is synced between client & server.
 * @param value This can be an initial value or a factory function that will be executed on server-side to get the initial value.
 * @param key Under the hood, `shallowSsrRef` requires a key to ensure that the ref values match between client and server. If you have added `nuxt-composition-api` to your `buildModules`, this will be done automagically by an injected Babel plugin. If you need to do things differently, you can specify a key manually or add `nuxt-composition-api/babel` to your Babel plugins.
 
 * @example
  ```ts
  import { shallowSsrRef, onMounted } from 'nuxt-composition-api'

  const shallow = shallowSsrRef({ v: 'init' })
  if (process.server) shallow.value = { v: 'changed' }

  // On client-side, shallow.value will be { v: changed }
  onMounted(() => {
    // This and other changes outside of setup won't trigger component updates.
    shallow.value.v = 'Hello World'
  })
  ```
 */
export const shallowSsrRef = <T>(
  value: T | (() => T),
  key?: string
): Ref<T> => {
  validateKey(key)

  if (process.client) return shallowRef(ssrValue(value, key))

  const _val = getValue(value)

  if (value instanceof Function) {
    data[key] = sanitise(_val)
  }

  return customRef((track, trigger) => ({
    get() {
      track()
      return _val
    },
    set(newValue: T) {
      data[key] = sanitise(newValue)
      value = newValue
      trigger()
    },
  }))
}

/**
 * `ssrPromise` runs a promise on the server and serialises the result as a resolved promise for the client. It needs to be run within the `setup()` function but note that it returns a promise which will require special handling. (For example, you cannot just return a promise from setup and use it in the template.)
 * @param value This can be an initial value or a factory function that will be executed on server-side to get the initial value.
 * @param key Under the hood, `ssrPromise` requires a key to ensure that the ref values match between client and server. If you have added `nuxt-composition-api` to your `buildModules`, this will be done automagically by an injected Babel plugin. If you need to do things differently, you can specify a key manually or add `nuxt-composition-api/babel` to your Babel plugins.
 * @example

    ```ts
    import {
      defineComponent,
      onBeforeMount,
      ref,
      ssrPromise,
    } from 'nuxt-composition-api'

    export default defineComponent({
      setup() {
        const _promise = ssrPromise(async () => myAsyncFunction())
        const resolvedPromise = ref(null)
        
        onBeforeMount(async () => {
          resolvedPromise.value = await _promise
        })

        return {
          // On the server, this will be null until the promise resolves. 
          // On the client, if server-rendered, this will always be the resolved promise.
          resolvedPromise,
        }
      },
    })
    ```
 */
export const ssrPromise = <T>(
  value: () => Promise<T>,
  key?: string
): Promise<T> => {
  validateKey(key)

  const val = ssrValue(value, key)
  if (process.client) return Promise.resolve(val)

  onServerPrefetch(async () => {
    data[key] = sanitise(await val)
  })
  return val
}
