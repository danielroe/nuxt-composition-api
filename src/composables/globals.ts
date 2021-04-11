export const globalNuxt = '<%= options.globalNuxt %>'.includes('options')
  ? '$nuxt'
  : ('<%= options.globalNuxt %>' as '$nuxt')

export const globalContext = '<%= options.globalContext %>'.includes('options')
  ? '__NUXT__'
  : ('<%= options.globalContext %>' as '__NUXT__')

export const globalNuxtReady = '<%= options.globalNuxtReady %>'.includes(
  'options'
)
  ? 'onNuxtReady'
  : ('<%= options.globalNuxtReady %>' as 'onNuxtReady')

export const isFullStatic = '<%= options.isFullStatic %>'.includes('options')
  ? false
  : JSON.parse('<%= options.isFullStatic %>')
