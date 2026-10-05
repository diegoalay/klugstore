import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeProduct } from './fixtures'

const logEvent = vi.fn()
vi.mock('firebase/analytics', () => ({ logEvent: (...args: unknown[]) => logEvent(...args) }))
vi.mock('@/boot/firebase', () => ({ analyticsReady: Promise.resolve({ fake: 'analytics' }) }))

const { trackSearch, trackWhatsAppClick, trackViewItem } = await import('@/utils/analytics')

async function flush() {
  await new Promise((r) => setTimeout(r, 0))
}

describe('catalog analytics events', () => {
  beforeEach(() => logEvent.mockClear())

  it('records searches with the result count (0 = demand we do not cover)', async () => {
    trackSearch('  Calabazas ', 0)
    await flush()
    expect(logEvent).toHaveBeenCalledWith(expect.anything(), 'search', {
      search_term: 'calabazas',
      results_count: 0,
    })
  })

  it('records WhatsApp clicks with product, price and origin', async () => {
    trackWhatsAppClick('product_card', makeProduct({ id: 'trays-01', name: 'Bandeja', price: 200 }))
    await flush()
    expect(logEvent).toHaveBeenCalledWith(
      expect.anything(),
      'whatsapp_click',
      expect.objectContaining({ source: 'product_card', item_id: 'trays-01', value: 200, currency: 'GTQ' }),
    )
  })

  it('flags views of sold pieces', async () => {
    trackViewItem(makeProduct({ sold: true, available: false }))
    await flush()
    expect(logEvent).toHaveBeenCalledWith(expect.anything(), 'view_item', expect.objectContaining({ sold: true }))
  })

  it('never sends personal data fields', async () => {
    trackWhatsAppClick('floating_button')
    await flush()
    const params = logEvent.mock.calls[0]?.[2] as Record<string, unknown>
    expect(Object.keys(params)).toEqual(['source'])
  })
})
