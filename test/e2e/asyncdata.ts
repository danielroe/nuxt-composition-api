import { Selector } from 'testcafe'
import {
  navigateTo,
  expectOnPage,
  expectPathnameToBe,
  expectNotOnPage,
} from './helpers'

// eslint-disable-next-line
fixture`asyncdata`

test('Shows fetched data on ssr-loaded page', async t => {
  await navigateTo('/asyncdata')
  await expectOnPage('name-Full Name')
  await expectOnPage('component-Component data')
})

test('Shows fetched data on client-loaded page', async t => {
  await navigateTo('/')
  await t.click(Selector('a').withText('asyncdata'))
  await expectPathnameToBe('/asyncdata')
  await expectOnPage('name-Full Name')
  await expectOnPage('component-Component data')
})

test('Shows loading state', async t => {
  await navigateTo('/')
  await t.click(Selector('a').withText('asyncdata'))
  await expectPathnameToBe('/asyncdata')
  await t.wait(4000)
  await expectOnPage('long@load.com')
  await expectNotOnPage('loading email')
})

test('Refetches with refresh', async t => {
  await navigateTo('/asyncdata')
  await expectNotOnPage('loading email')
  await t.click(Selector('button').withText('Refetch'))
  await expectOnPage('loading email')
})
