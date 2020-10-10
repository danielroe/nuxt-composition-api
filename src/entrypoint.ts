import Vue from 'vue'
import CompositionApi from '@vue/composition-api'

Vue.use(CompositionApi)

export { useAsync } from './async'
export { defineComponent } from './component'
export { useContext, withContext } from './context'
export { useFetch } from './fetch'
export { globalPlugin, onGlobalSetup } from './hooks'
export { useMeta } from './meta'
export { ssrRef, shallowSsrRef, setSSRContext, ssrPromise } from './ssr-ref'
export { useStatic } from './static'
export * from './defineHelpers'

export type {
  ComponentRenderProxy,
  ComputedRef,
  FlushMode,
  InjectionKey,
  PropOptions,
  PropType,
  Ref,
  SetupContext,
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
  useCSSModule,
  version,
  watch,
  watchEffect,
} from '@vue/composition-api'
