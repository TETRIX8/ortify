import { proxyUrl, verifySignature } from '@/lib/proxy-sign'
import { BROWSER_UA, UPSTREAM_REFERER } from '@/lib/upstream'

export const dynamic = 'force-dynamic'
export const preferredRegion = ['fra1', 'cdg1', 'arn1', 'lhr1']

const URI_ATTRIBUTE = /URI="([^"]+)"/g

function rewritePlaylist(playlist: string, base: URL) {
  return playlist
    .split('\n')
    .map((line) => {
      const trimmed = line.trim()
      if (!trimmed) return line
      if (trimmed.startsWith('#')) {
        return trimmed.replace(URI_ATTRIBUTE, (_, uri: string) => `URI="${proxyUrl(new URL(uri, base).href)}"`)
      }
      return proxyUrl(new URL(trimmed, base).href)
    })
    .join('\n')
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const encoded = searchParams.get('u')
  const signature = searchParams.get('s')

  if (!encoded || !verifySignature(encoded, signature)) {
    return new Response('Forbidden', { status: 403 })
  }

  let target: URL
  try {
    target = new URL(encoded)
  } catch {
    return new Response('Bad target', { status: 400 })
  }
  if (target.protocol !== 'https:' && target.protocol !== 'http:') {
    return new Response('Bad target', { status: 400 })
  }

  const range = request.headers.get('range')
  let upstream: Response
  try {
    upstream = await fetch(target, {
      headers: {
        'user-agent': BROWSER_UA,
        referer: UPSTREAM_REFERER,
        origin: UPSTREAM_REFERER.slice(0, -1),
        ...(range ? { range } : {}),
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(30_000),
    })
  } catch (error) {
    return new Response(`Upstream fetch failed: ${error instanceof Error ? error.message : error}`, { status: 502 })
  }

  if (!upstream.ok) {
    return new Response(`Upstream responded ${upstream.status}`, { status: 502 })
  }

  const contentType = upstream.headers.get('content-type') ?? ''
  const isPlaylist = /mpegurl/i.test(contentType) || /\.m3u8$/i.test(target.pathname)

  if (isPlaylist) {
    const body = rewritePlaylist(await upstream.text(), target)
    return new Response(body, {
      headers: {
        'content-type': 'application/vnd.apple.mpegurl',
        'cache-control': 'no-store',
      },
    })
  }

  const headers = new Headers({ 'cache-control': 'public, max-age=3600' })
  for (const name of ['content-type', 'content-range', 'accept-ranges']) {
    const value = upstream.headers.get(name)
    if (value) headers.set(name, value)
  }
  // fetch() transparently decompresses, so the original length is only valid without content-encoding.
  if (!upstream.headers.get('content-encoding')) {
    const length = upstream.headers.get('content-length')
    if (length) headers.set('content-length', length)
  }

  return new Response(upstream.body, { status: upstream.status, headers })
}
