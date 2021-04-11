<template>
  <Suspense>
    <template #default="{ name, test }">
      Some data:
      <blockquote>
        {{ name }}
      </blockquote>
      {{ test }}
    </template>
    <template #fallback> Loading via async setup ... </template>
  </Suspense>
</template>

<script>
import { withAsyncSetup, ref } from '@nuxtjs/composition-api'

import { fetcher } from '../utils'

export default withAsyncSetup({
  async setup() {
    const val = await fetcher({ name: 'Full Name' }, 500)

    return {
      ...val,
      test: ref('thing'),
    }
  },
})
</script>
