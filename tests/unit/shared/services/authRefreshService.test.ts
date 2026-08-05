import { beforeEach, describe, expect, it, vi } from 'vitest'
import { refreshSession } from '../../../../src/shared/services/authRefreshService'

describe('authRefreshService', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('deduplicates concurrent refresh requests globally', async () => {
    let resolveFetch!: (response: Response) => void
    const pending = new Promise<Response>((resolve) => { resolveFetch = resolve })
    vi.stubGlobal('fetch', vi.fn(() => pending))

    const first = refreshSession()
    const second = refreshSession()
    resolveFetch(new Response(JSON.stringify({ authenticated: true }), { status: 200 }))

    await expect(Promise.all([first, second])).resolves.toHaveLength(2)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('exposes nested backend machine codes on errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ error: { message: 'human text', code: 'REFRESH_TOKEN_EXPIRED' } }),
      { status: 401 },
    )))

    await expect(refreshSession()).rejects.toMatchObject({
      code: 'REFRESH_TOKEN_EXPIRED',
      status: 401,
    })
  })
})
