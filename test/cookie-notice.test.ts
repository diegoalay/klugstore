import { beforeEach, describe, expect, it } from 'vitest'
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils'
import CookieNotice from '@/modules/catalog/components/CookieNotice.vue'

function mountNotice() {
  return mount(CookieNotice, { global: { stubs: { RouterLink: RouterLinkStub } } })
}

describe('cookie notice', () => {
  beforeEach(() => localStorage.clear())

  it('shows on the first visit with a link to the privacy page', async () => {
    const wrapper = mountNotice()
    await flushPromises()
    expect(wrapper.text()).toContain('cookies de analítica')
    expect(wrapper.findComponent(RouterLinkStub).props('to')).toBe('/privacidad')
  })

  it('stays hidden after the visitor dismisses it', async () => {
    const first = mountNotice()
    await flushPromises()
    await first.find('button').trigger('click')
    expect(first.find('.cookie-notice').exists()).toBe(false)

    const again = mountNotice()
    await flushPromises()
    expect(again.find('.cookie-notice').exists()).toBe(false)
  })
})
