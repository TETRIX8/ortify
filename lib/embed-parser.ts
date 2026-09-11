export interface SubtitleTrack {
  name: string
  url: string
}

export interface ParsedEmbed {
  title: string
  videoId: number | null
  hls: string
  subtitles: SubtitleTrack[]
  audioNames: string[]
  poster: string | null
}

export class EmbedParseError extends Error {
  constructor(
    message: string,
    readonly status = 422,
  ) {
    super(message)
    this.name = 'EmbedParseError'
  }
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function findBalancedEnd(src: string, start: number): number {
  let depth = 0
  let quote: string | null = null
  for (let i = start; i < src.length; i++) {
    const ch = src[i]
    if (quote) {
      if (ch === '\\') {
        i++
        continue
      }
      if (ch === quote) quote = null
      continue
    }
    if (ch === '"' || ch === "'") {
      quote = ch
      continue
    }
    if (ch === '[' || ch === '{') depth++
    else if (ch === ']' || ch === '}') {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}

function readStringProp(html: string, key: string): string | null {
  const re = new RegExp(`\\b${key}\\s*:\\s*(["'])((?:\\\\.|(?!\\1)[^\\\\])*)\\1`)
  const match = html.match(re)
  if (!match) return null
  return match[2].replace(/\\(['"\\/])/g, '$1')
}

function readJsonProp<T>(html: string, key: string, open: '[' | '{'): T | null {
  const match = new RegExp(`\\b${key}\\s*:\\s*\\${open}`).exec(html)
  if (!match) return null
  const start = match.index + match[0].length - 1
  const end = findBalancedEnd(html, start)
  if (end < 0) return null
  try {
    return JSON.parse(html.slice(start, end + 1)) as T
  } catch {
    return null
  }
}

/**
 * The embed page appends a short signing token to every media URL right before
 * creating the player (`o[k] += '&' + <ident>`). The identifier is random per
 * page and there is a decoy assignment hidden inside a string literal, so we
 * locate the identifier from the concat expression and then prefer the real
 * `var x = 1, <ident> = "..."` declaration, falling back to the last assignment.
 */
function readToken(html: string): string | null {
  const ident = html.match(/\+=\s*['"]&['"]\s*\+\s*([A-Za-z_$][\w$]*)/)?.[1]
  if (!ident) return null
  const id = escapeRegExp(ident)

  const declared = html.match(new RegExp(`\\bvar\\s+\\w+\\s*=\\s*1\\s*,\\s*${id}\\s*=\\s*["']([^"']+)["']`))
  if (declared) return declared[1]

  let last: string | null = null
  for (const m of html.matchAll(new RegExp(`(?<![\\w$])${id}\\s*=\\s*["']([^"']+)["']`, 'g'))) {
    last = m[1]
  }
  return last
}

function appendToken(url: string, token: string | null) {
  if (!token) return url
  return `${url}${url.includes('?') ? '&' : '?'}${token}`
}

function visibleText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160)
}

export function parseEmbedHtml(html: string): ParsedEmbed {
  if (/\bblocked\s*:\s*true\b/.test(html)) {
    throw new EmbedParseError('Видео заблокировано по просьбе правообладателя', 451)
  }

  const hls = readStringProp(html, 'hls')
  if (!hls) {
    const message = visibleText(html)
    throw new EmbedParseError(
      message ? `Плеер не вернул источник: ${message}` : 'В ответе embed не найден HLS-источник',
      422,
    )
  }

  const token = readToken(html)
  const cc = readJsonProp<Array<{ url?: string; name?: string }>>(html, 'cc', '[') ?? []
  const audio = readJsonProp<{ names?: string[] }>(html, 'audio', '{')
  const title =
    readStringProp(html, 'title') ?? html.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim() ?? 'Без названия'
  const idMatch = html.match(/\bid\s*:\s*(\d+)/)
  const poster = readStringProp(html, 'poster')

  return {
    title,
    videoId: idMatch ? Number(idMatch[1]) : null,
    hls: appendToken(hls, token),
    subtitles: cc
      .filter((t): t is { url: string; name: string } => Boolean(t?.url && t?.name))
      .map((t) => ({ name: t.name, url: t.url })),
    audioNames: audio?.names ?? [],
    poster: poster && /^https?:/i.test(poster) ? poster : null,
  }
}
