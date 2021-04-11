import { NuxtConfig, NuxtOptions } from '@nuxt/types'
import { ModuleThis } from '@nuxt/types/config/module'
import { basename, join } from 'upath'

export function isFullStatic(options: NuxtConfig) {
  return (
    !options.dev &&
    !options._legacyGenerate &&
    options.target === 'static' &&
    options.render?.ssr
  )
}

export function isUrl(url: string) {
  return ['http', '//'].some(str => url.startsWith(str))
}

export function resolveRelativePath(id: string) {
  return require.resolve(`@nuxtjs/composition-api/${id}`)
}

export function addResolvedTemplate(
  this: ModuleThis,
  template: string,
  options: Record<string, any> = {}
) {
  const nuxtOptions: NuxtOptions = this.nuxt.options

  const src = resolveRelativePath(template)
  const { dst } = this.addTemplate({
    src,
    fileName: join('composition-api', basename(src)),
    options,
  })

  const templatePath = join(nuxtOptions.buildDir, dst)

  return templatePath
}

export function resolveCoreJsVersion(this: ModuleThis) {
  let corejsPolyfill = this.nuxt.options.build.corejs
    ? String(this.nuxt.options.build.corejs)
    : undefined
  try {
    if (!['2', '3'].includes(corejsPolyfill || '')) {
      // eslint-disable-next-line
      const corejsPkg = this.nuxt.resolver.requireModule('core-js/package.json')
      corejsPolyfill = corejsPkg.version.slice(0, 1)
    }
  } catch {
    corejsPolyfill = undefined
  }
  return corejsPolyfill
}

export function getNuxtGlobals(this: ModuleThis) {
  const nuxtOptions: NuxtOptions = this.nuxt.options

  const globalName = nuxtOptions.globalName
  const globalContextFactory =
    nuxtOptions.globals.context ||
    ((globalName: string) => `__${globalName.toUpperCase()}__`)
  const globalNuxtFactory =
    nuxtOptions.globals.nuxt || ((globalName: string) => `$${globalName}`)
  const globalNuxtReadyFactory =
    nuxtOptions.globals.readyCallback ||
    ((globalName: string) =>
      `on${globalName[0].toUpperCase() + globalName.slice(1)}Ready`)
  const globalContext = globalContextFactory(globalName)
  const globalNuxt = globalNuxtFactory(globalName)
  const globalNuxtReady = globalNuxtReadyFactory(globalName)

  return { globalContext, globalNuxt, globalNuxtReady }
}
