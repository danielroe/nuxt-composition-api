<template>
  <Suspense #default="{ email, name, refresh, pending }">
    <div>
      <p>
        <button @click="refresh">Refetch</button>
        <button @click="name.name = String(Math.random())">Randomise</button>
      </p>
      <blockquote>
        <p>
          <code>name-{{ name.name }}</code>
        </p>
        <p>
          <code>
            email-{{ email.email }}
            <br />
            <span v-if="pending"> loading email </span>
          </code>
        </p>
        <child-comp />
      </blockquote>
    </div>
  </Suspense>
</template>

<script>
import {
  useAsyncData,
  withAsyncSetup,
} from '@nuxtjs/composition-api'

import ChildComp from '~/components/asyncdata.vue'

import { fetcher } from '../utils'

export default withAsyncSetup({
  components: {
    ChildComp,
  },
  async setup() {
    const asyncData = useAsyncData()
    const { data: name } = await asyncData(() => fetcher({ name: 'Full Name' }))
    const { data: email, refresh, pending } = await asyncData(
      () => fetcher({ email: 'long@load.com' }, 2000),
      { defer: true }
    )

    return {
      name,
      email,
      pending,
      refresh,
    }
  },
})
</script>
