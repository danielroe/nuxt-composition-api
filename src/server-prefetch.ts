import { onServerPrefetch as onPrefetch } from '@vue/composition-api'
const prefetchFunctions: Array<() => any> = []
const prefetchFunctionsEnd: Array<() => any> = []

let hasServerPrefetch = false
function setupOnServerPrefetch() {
  if (!hasServerPrefetch) {
    hasServerPrefetch = true
    onPrefetch(async () => {
      await Promise.all(prefetchFunctions.map(p => p()))
      await Promise.all(prefetchFunctionsEnd.map(p => p()))
    })
  }
}

export function onServerPrefetch(cb: () => any) {
  prefetchFunctions.push(cb)
  setupOnServerPrefetch()
}

export function onServerPrefetchEnd(cb: () => any) {
  prefetchFunctionsEnd.push(cb)
  setupOnServerPrefetch()
}
