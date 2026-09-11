export const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'

export const UPSTREAM_REFERER = 'https://api.ortified.ws/'

const EMBED_HOST_SUFFIXES = ['ortified.ws']

export function isAllowedEmbedHost(hostname: string) {
  return EMBED_HOST_SUFFIXES.some((suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`))
}

/** Accepts a full URL, a bare host path, an `<iframe>` snippet, or just a movie id. */
export function normalizeEmbedInput(raw: string): URL {
  let value = raw.trim()

  const iframeSrc = value.match(/src\s*=\s*["']([^"']+)["']/i)?.[1]
  if (iframeSrc) value = iframeSrc

  if (/^\d+$/.test(value)) value = `https://api.ortified.ws/embed/movie/${value}`
  if (value.startsWith('//')) value = `https:${value}`
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`

  const url = new URL(value)
  if (!isAllowedEmbedHost(url.hostname)) {
    throw new Error(`Домен ${url.hostname} не поддерживается`)
  }
  url.protocol = 'https:'
  return url
}
