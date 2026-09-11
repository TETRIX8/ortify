export interface ResolvedEmbed {
  title: string
  videoId: number | null
  embedUrl: string
  source: { direct: string; proxied: string }
  subtitles: { name: string; url: string }[]
  audioNames: string[]
  poster: string | null
}
