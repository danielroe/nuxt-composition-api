import Vue from 'vue'
import CompositionApi from '@vue/composition-api'

Vue.use(CompositionApi)

export { useAsync } from './async'
export { defineComponent } from './component'
export { useContext, withContext } from './context'
export { useFetch } from './fetch'
export { globalPlugin, onGlobalSetup, setMetaPlugin } from './hooks'
export { useMeta } from './meta'
export { reqRef, reqSsrRef } from './req-ref'
export { ssrRef, shallowSsrRef, setSSRContext, ssrPromise } from './ssr-ref'
export { useStatic } from './static'
export * from './defineHelpers'
export * from './wrappers'

export type {
  App,
  ComponentInstance,
  ComponentRenderProxy,
  ComputedRef,
  Data,
  DeepReadonly,
  ExtractDefaultPropTypes,
  ExtractPropTypes,
  FlushMode,
  InjectionKey,
  PropOptions,
  PropType,
  Ref,
  SetupContext,
  SetupFunction,
  ShallowUnwrapRef,
  UnwrapRef,
  VueWatcher,
  WatchCallback,
  WatchEffect,
  WatchOptions,
  WatchOptionsBase,
  WatchSource,
  WatchStopHandle,
  WritableComputedRef,
} from '@vue/composition-api'

export {
  computed,
  createApp,
  customRef,
  defineAsyncComponent,
  del,
  getCurrentInstance,
  h,
  inject,
  isRaw,
  isReactive,
  isReadonly,
  isRef,
  markRaw,
  nextTick,
  onActivated,
  onBeforeMount,
  onBeforeUnmount,
  onBeforeUpdate,
  onDeactivated,
  onErrorCaptured,
  onMounted,
  onServerPrefetch,
  onUnmounted,
  onUpdated,
  provide,
  proxyRefs,
  reactive,
  readonly,
  ref,
  set,
  shallowReactive,
  shallowReadonly,
  shallowRef,
  toRaw,
  toRef,
  toRefs,
  triggerRef,
  unref,
  useCssModule,
  useCSSModule,
  version,
  warn,
  watch,
  watchEffect,
} from '@vue/composition-api'
