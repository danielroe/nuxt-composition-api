import type { Module, NuxtOptions } from '@nuxt/types'
import { relative, resolve, sep } from 'upath'

import { name, version } from '../../package.json'

import { registerBabelPlugin } from './babel-register'
import { addGlobalsFile } from './globals-register'
import { addResolvedTemplate, resolveCoreJsVersion } from './utils'

const compositionApiModule: Module<never> = function compositionApiModule() {
  const nuxtOptions: NuxtOptions = this.nuxt.options

  // Register globals file where Nuxt config can be accessed from live library

  addGlobalsFile.call(this)

  // Force transpilation of this library (to enable resolution of globals file)

  const runtimeDir = resolve(__dirname, 'runtime')
  nuxtOptions.build.transpile = nuxtOptions.build.transpile || []
  nuxtOptions.build.transpile.push('@nuxtjs/composition-api', runtimeDir)

  // Define @vue/composition-api resolution to prevent using different versions of @vue/composition-api

  nuxtOptions.alias['@vue/composition-api'] = this.nuxt.resolver.resolveModule(
    '@vue/composition-api/dist/vue-composition-api.esm.js'
  )

  // Register the Vue Composition API

  if (nuxtOptions.features.middleware) {
    const middleware = addResolvedTemplate.call(this, 'register.mjs')
    this.nuxt.hook(
      'build:templates',
      ({ templateVars }: { templateVars: Record<string, any> }) => {
        templateVars.middleware.unshift({
          src: middleware,
          dst: '.' + sep + relative(nuxtOptions.buildDir, middleware),
          name: 'compositionApiRegistration',
        })
      }
    )
  } else if (nuxtOptions.features.layouts) {
    this.addLayout(
      require.resolve('@nuxtjs/composition-api/dist/runtime/templates/layout'),
      '0'
    )
  } else {
    const dst = addResolvedTemplate.call(this, 'register.mjs')
    this.nuxt.hook('modules:done', () =>
      this.nuxt.hook('build:before', () => nuxtOptions.plugins.unshift(dst))
    )
  }

  // Turn off webpack4 module context for .mjs files (as it appears to have some issues)

  this.extendBuild(config => {
    if (!config.module) return

    config.module.rules.forEach(rule => {
      if (rule.test instanceof RegExp && rule.test.test('index.mjs')) {
        rule.type = 'javascript/auto'
      }
    })
  })

  // If we're using nuxt-vite, register vite plugin & inject configuration

  this.nuxt.hook('vite:extend', async (ctx: any) => {
    const { compositionApiPlugin } = await import('./vite-plugin')
    ctx.config.plugins.push(compositionApiPlugin())
  })

  // If we're using Babel, register Babel plugin for injecting keys

  registerBabelPlugin.call(this)

  // Add appropriate corejs polyfill for IE support

  addResolvedTemplate.call(this, 'polyfill.client.mjs', {
    corejsPolyfill: resolveCoreJsVersion.call(this),
  })

  // Plugin to allow running onGlobalSetup
  const globalPlugin = addResolvedTemplate.call(this, 'plugin.mjs')

  // Allow setting head() within onGlobalSetup
  const metaPlugin = addResolvedTemplate.call(this, 'meta.mjs')

  this.nuxt.hook('modules:done', () => {
    nuxtOptions.plugins.push(metaPlugin)
    nuxtOptions.plugins.unshift(globalPlugin)
  })
}

// eslint-disable-next-line
// @ts-ignore
compositionApiModule.meta = {
  name,
  version,
}

export default compositionApiModule
// export * from './defineHelpers'
