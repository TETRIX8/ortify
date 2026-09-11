import { NextResponse } from 'next/server'
import { EmbedParseError, parseEmbedHtml } from '@/lib/embed-parser'
import { proxyUrl } from '@/lib/proxy-sign'
import type { ResolvedEmbed } from '@/lib/types'
import { BROWSER_UA, normalizeEmbedInput } from '@/lib/upstream'

export const dynamic = 'force-dynamic'
// The upstream API geo-blocks some regions (US returned 410), so prefer EU.
export const preferredRegion = ['fra1', 'cdg1', 'arn1', 'lhr1']

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get('url')
  if (!raw?.trim()) {
    return NextResponse.json({ error: 'Укажите ссылку на embed' }, { status: 400 })
  }

  let target: URL
  try {
    target = normalizeEmbedInput(raw)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Некорректная ссылка' },
      { status: 400 },
    )
  }

  let html: string
  let upstreamStatus: number
  try {
    const response = await fetch(target, {
      headers: {
        'user-agent': BROWSER_UA,
        accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
        'accept-language': 'ru-RU,ru;q=0.9,en;q=0.7',
      },
      cache: 'no-store',
      redirect: 'follow',
      signal: AbortSignal.timeout(15_000),
    })
    upstreamStatus = response.status
    html = await response.text()
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Не удалось получить страницу embed',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 502 },
    )
  }

  try {
    const parsed = parseEmbedHtml(html)
    const payload: ResolvedEmbed = {
      title: parsed.title,
      videoId: parsed.videoId,
      embedUrl: target.href,
      source: { direct: parsed.hls, proxied: proxyUrl(parsed.hls) },
      subtitles: parsed.subtitles.map((track) => ({ name: track.name, url: proxyUrl(track.url) })),
      audioNames: parsed.audioNames,
      poster: parsed.poster,
    }
    return NextResponse.json(payload)
  } catch (error) {
    if (error instanceof EmbedParseError) {
      return NextResponse.json({ error: error.message, upstreamStatus }, { status: error.status })
    }
    throw error
  }
}
