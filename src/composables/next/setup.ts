import { defineComponent, onServerPrefetch, ref } from '@vue/composition-api'
import { getCurrentInstance } from '../utils'
import { isInitialLoad } from './compat'

export const withAsyncSetup: typeof defineComponent = function withAsyncSetup(
  options: any
) {
  const { components, data, setup } = options

  const Suspense = defineComponent({
    props: {
      tag: {
        type: String,
        default: 'div',
      },
    },
    data: () => ({
      data: null,
    }),
    render(h) {
      // hack to link reactivity
      this.data = this.$parent.$data.$setup.value
      if (process.client && isInitialLoad()) {
        // bypassing render on initial load
        return h(this.tag as 'div', { key: 'ssr' })
      }
      if (this.$parent.$data.$setup.value && this.$scopedSlots.default) {
        return h(
          this.tag as 'div',
          this.$scopedSlots.default(this.$parent.$data.$setup.value)
        )
      }
      return h(this.tag as 'div', this.$scopedSlots.fallback?.({}))
    },
  })

  return {
    ...options,
    components: {
      ...components,
      Suspense,
    },
    data() {
      return {
        ...(data?.() || {}),
        // This way we benefit from automatic unwrapping to mimic normal template behaviour
        $setup: ref(null),
      }
    },
    setup() {
      const vm = getCurrentInstance()

      const promise = setup?.()

      if (process.server) {
        onServerPrefetch(() =>
          promise.then((r: any) => (vm!.$data.$setup.value = r))
        )
      } else {
        promise
          .then((r: any) => (vm!.$data.$setup.value = r))
          .catch(console.error)
      }
    },
  }
}
