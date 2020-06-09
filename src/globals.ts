export const globalNuxt = '<%= options.globalNuxt %>'.includes('options')
  ? '$nuxt'
  : ('<%= options.globalNuxt %>' as '$nuxt')

export const globalContext = '<%= options.globalContext %>'.includes('options')
  ? '__NUXT__'
  : ('<%= options.globalContext %>' as '__NUXT__')
