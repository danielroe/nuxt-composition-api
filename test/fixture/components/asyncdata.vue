<template>
  <Suspense #default="{ val, pending }">
    <div>component-{{ val.val }}</div>
    <button @click="val.val = String(Math.random())">Randomise</button>
  </Suspense>
</template>

<script>
import { withAsyncSetup, asyncData } from '@nuxtjs/composition-api'

export function fetcher(result, time = 100) {
  return new Promise(resolve => {
    return setTimeout(() => {
      resolve(result)
    }, time)
  })
}

export default withAsyncSetup({
  async setup() {
    const { data: val, pending } = await asyncData(() =>
      fetcher({ val: 'Component data' })
    )

    return {
      val,
      pending,
    }
  },
})
</script>
