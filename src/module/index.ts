import { withTrailingSlash } from 'ufo'

import type {
  Module,
  NuxtConfig,
  NuxtOptions,
  ServerMiddleware,
} from '@nuxt/types'

import { name, version } from '../../package.json'

import { prepareUseStatic } from './static'
import {
  addResolvedTemplate,
  getNuxtGlobals,
  isFullStatic,
  isUrl,
  resolveCoreJsVersion,
  resolveRelativePath,
} from './utils'
import { compositionApiPlugin } from './vite'
import { registerBabelPlugin } from './babel'

const compositionApiModule: Module<never> = function compositionApiModule() {
  const nuxtOptions: NuxtOptions = this.nuxt.options

  // Register entrypoint (where all user-facing content consumed within vite/webpack is located)

  const { staticPath } = prepareUseStatic.call(this)
  const { globalContext, globalNuxt, globalNuxtReady } = getNuxtGlobals.call(
    this
  )

  const routerBase = withTrailingSlash(nuxtOptions.router.base)
  const publicPath = withTrailingSlash(nuxtOptions.build.publicPath)

  const entryFile = addResolvedTemplate.call(this, 'lib/entrypoint.es', {
    // useFetch
    isFullStatic: isFullStatic(nuxtOptions),
    // useStatic
    staticPath,
    publicPath: isUrl(publicPath) ? publicPath : routerBase,
    // Throughout
    globalContext,
    globalNuxt,
    globalNuxtReady,
  })

  nuxtOptions.alias['@nuxtjs/composition-api'] = entryFile

  // Define @vue/composition-api resolution to prevent issues with registrations

  nuxtOptions.alias['@vue/composition-api'] = this.nuxt.resolver.resolveModule(
    '@vue/composition-api'
  )

  // Transpile the Nuxt Composition API to force alias resolution
  // TODO: remove this when we stop shadowing module

  nuxtOptions.build.transpile = nuxtOptions.build.transpile || []
  nuxtOptions.build.transpile.push('@nuxtjs/composition-api')

  // Register the Vue Composition API before any other layouts

  this.addLayout(resolveRelativePath('lib/templates/layout.js'), '0')

  // If we're using nuxt-vite, register vite plugin & inject configuration

  this.nuxt.hook('vite:extend', (ctx: any) => {
    ctx.config.plugins.push(compositionApiPlugin())
    ctx.config.resolve.alias[
      '@vue/composition-api'
    ] = this.nuxt.resolver.resolveModule(
      '@vue/composition-api/dist/vue-composition-api.esm.js'
    )
    // Fake alias to prevent shadowing actual node_module
    ctx.config.resolve.alias['~nuxtjs-composition-api'] = entryFile
  })

  // If we're using Babel, register Babel plugin for injecting keys

  registerBabelPlugin.call(this)

  // Add appropriate corejs polyfill for IE support

  addResolvedTemplate.call(this, 'lib/templates/polyfill.client.js', {
    corejsPolyfill: resolveCoreJsVersion.call(this),
  })

  // Plugin to allow running onGlobalSetup
  const globalPlugin = addResolvedTemplate.call(this, 'lib/templates/plugin.js')

  this.nuxt.hook('modules:done', () => {
    nuxtOptions.plugins.unshift(globalPlugin)
  })

  // TODO: remove
  // Allow setting head() within onGlobalSetup

  if (
    !nuxtOptions.buildModules.includes('@nuxtjs/pwa') &&
    !nuxtOptions.modules.includes('@nuxtjs/pwa')
  ) {
    nuxtOptions.plugins.push(
      addResolvedTemplate.call(this, 'lib/templates/meta.js')
    )
  } else if (nuxtOptions.dev) {
    console.warn(
      'useMeta is not supported in onGlobalSetup as @nuxtjs/pwa detected.\nSee https://github.com/nuxt-community/composition-api/issues/307'
    )
  }
}

// eslint-disable-next-line
// @ts-ignore
compositionApiModule.meta = {
  name,
  version,
}

// Force users to register module to import helper functions from '@nuxtjs/composition-api'
// (which are dependent on registration anyway)

const warnToAddModule = () => {
  console.error(
    'You need to add `@nuxtjs/composition-api/module` to your buildModules in order to use it. See https://composition-api.nuxtjs.org/getting-started/setup.'
  )
  throw new Error(
    'You need to add `@nuxtjs/composition-api/module` to your buildModules in order to use it. See https://composition-api.nuxtjs.org/getting-started/setup.'
  )
}

/* eslint-disable @typescript-eslint/ban-ts-comment */
const helperFunctions: string[] = JSON.parse(`__HELPER_FUNCTIONS__`)
helperFunctions.forEach(helper => {
  // @ts-ignore
  compositionApiModule[helper] = warnToAddModule
})

// Allow using some helper functions directly (required, as these are outside of webpack context)

// @ts-ignore
compositionApiModule.defineNuxtConfig = (config: NuxtConfig) => config
// @ts-ignore
compositionApiModule.defineServerMiddleware = (smw: ServerMiddleware) => smw
// @ts-ignore
compositionApiModule.defineNuxtModule = (mod: Module<any>) => mod
/* eslint-enable @typescript-eslint/ban-ts-comment */

export default compositionApiModule
