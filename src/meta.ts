import defu from 'defu'
import { getCurrentInstance, toRefs, Ref, reactive } from '@vue/composition-api'

import type { MetaInfo } from 'vue-meta'
import type { UnwrapRef } from '@vue/composition-api/dist/reactivity'

export type ReactiveHead<T = {}> = UnwrapRef<Ref<MetaInfo & T>>

type MetaInfoMapper<T> = {
  [P in keyof T]: P extends 'base'
    ? T[P] | undefined
    : T[P] extends Function
    ? T[P] | undefined
    : T[P] extends Array<any> | Record<string, any>
    ? T[P]
    : T[P] | undefined
}

export function createEmptyMeta(): MetaInfoMapper<Required<MetaInfo>> {
  return {
    __dangerouslyDisableSanitizers: [],
    __dangerouslyDisableSanitizersByTagID: {},

    title: undefined,
    titleTemplate: undefined,
    htmlAttrs: {},
    headAttrs: {},
    bodyAttrs: {},

    base: undefined,

    meta: [],
    link: [],
    style: [],
    script: [],
    noscript: [],

    changed: undefined,
    afterNavigation: undefined,
  }
}

export const getHeadOptions = (options: any) => {
  const _head: ReactiveHead = reactive<MetaInfo>({})
  if (!(options.head instanceof Function)) {
    Object.assign(_head, options.head)
  }
  const head =
    options.head instanceof Function
      ? () => defu(_head, options.head())
      : () => _head
  return { _head, head }
}

type ToRefs<T extends Record<string, any>> = {
  [P in keyof T]: Ref<T[P]>
}

/**
 * `useMeta` lets you interact directly with [`head()` properties](https://nuxtjs.org/api/pages-head/) in `setup`. **Make sure you set `head: {}` in your component options.**
 * @example
    ```ts
    import { defineComponent, useMeta, computed } from 'nuxt-composition-api'

    export default defineComponent({
      head: {},
      setup() {
        const { title } = useMeta()
        title.value = 'My page'
      })
    })
    ```
 * @param init Whatever defaults you want to set for `head` properties.
 */
export const useMeta = <T extends MetaInfo>(init?: T) => {
  const vm = getCurrentInstance()
  if (!vm) throw new Error('useMeta must be called within a component.')

  if (!('_head' in vm.$options))
    throw new Error(
      'In order to enable `useMeta`, please make sure you include `head: {}` within your component definition, and you are using the `defineComponent` exported from nuxt-composition-api.'
    )

  const { _head } = vm.$options as { _head: ReactiveHead }

  Object.assign(_head, createEmptyMeta())
  Object.assign(_head, init || {})
  return toRefs(_head) as ToRefs<ReturnType<typeof createEmptyMeta> & T>
}
