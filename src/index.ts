import { KVNamespace, ExecutionContext } from '@cloudflare/workers-types'

export default {
  async fetch(
    request: Request,
    env: {
      STORE: KVNamespace
    },
    _ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname.match(/\.well\-known/)) return await fetch(request)

    const cached = await env.STORE.get(url.toString(), 'arrayBuffer')

    if (cached) {
      return new Response(cached, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cacher-Status': 'Cached',
        },
      })
    }

    const response = await fetch(request)
    const buffer = await response.arrayBuffer()

    if (!response.ok) {
      return new Response(buffer, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cacher-Status': 'Error detected',
        },
      })
    }

    // Cache only on specified header
    const validTime = response?.headers.get('Cacher')

    if (validTime) {
      await env.STORE.put(url.toString(), buffer, {
        expirationTtl: parseInt(validTime),
      })
    }

    return new Response(buffer, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cacher-Status': validTime
          ? 'Now Cached for ' + validTime
          : 'Not to be Cached',
      },
    })
  },
}
