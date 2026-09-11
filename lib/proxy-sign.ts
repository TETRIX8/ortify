import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'

const SECRET = process.env.HLS_PROXY_SECRET ?? 'watch-room-dev-secret'

export function signUrl(target: string) {
  return createHmac('sha256', SECRET).update(target).digest('base64url').slice(0, 27)
}

export function verifySignature(target: string, signature: string | null) {
  if (!signature) return false
  const expected = Buffer.from(signUrl(target))
  const provided = Buffer.from(signature)
  return expected.length === provided.length && timingSafeEqual(expected, provided)
}

export function proxyUrl(target: string) {
  return `/api/hls?u=${encodeURIComponent(target)}&s=${signUrl(target)}`
}
