'use client'

import { forwardRef, type RefObject } from 'react'
import { Clapperboard, LoaderCircle, TriangleAlert } from 'lucide-react'
import type { PlayerState } from '@/hooks/use-hls-player'
import { formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'

interface Subtitle {
  name: string
  url: string
}

interface VideoStageProps {
  videoRef: RefObject<HTMLVideoElement | null>
  state: PlayerState
  title: string | null
  poster: string | null
  subtitles: Subtitle[]
  onToggle: () => void
}

function guessLang(name: string) {
  const lower = name.toLowerCase()
  if (/укр|ukr/.test(lower)) return 'uk'
  if (/eng|англ/.test(lower)) return 'en'
  return 'ru'
}

export const VideoStage = forwardRef<HTMLDivElement, VideoStageProps>(function VideoStage(
  { videoRef, state, title, poster, subtitles, onToggle },
  stageRef,
) {
  const { status } = state
  const hasMedia = status !== 'idle' && status !== 'loading'

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={stageRef}
        className="relative aspect-video w-full overflow-hidden rounded-xl border bg-stage"
      >
        <video
          ref={videoRef}
          className={cn('size-full bg-stage', hasMedia ? 'cursor-pointer' : 'opacity-0')}
          playsInline
          preload="metadata"
          poster={poster ?? undefined}
          onClick={hasMedia ? onToggle : undefined}
          aria-label={title ?? 'Видеоплеер'}
        >
          {subtitles.map((track) => (
            <track key={track.url} kind="subtitles" src={track.url} label={track.name} srcLang={guessLang(track.name)} />
          ))}
        </video>

        {status === 'idle' ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Clapperboard className="size-8" strokeWidth={1.5} />
            <p className="text-sm">Вставьте ссылку выше, чтобы загрузить фильм</p>
          </div>
        ) : null}

        {status === 'loading' ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <LoaderCircle className="size-7 animate-spin text-primary" />
            <p className="text-sm">Подключаю поток…</p>
          </div>
        ) : null}

        {status === 'buffering' ? (
          <div className="pointer-events-none absolute top-3 left-3 flex items-center gap-2 rounded-md bg-background/80 px-2 py-1 text-xs text-foreground backdrop-blur">
            <LoaderCircle className="size-3.5 animate-spin text-primary" />
            Буферизация
          </div>
        ) : null}

        {status === 'error' ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-stage/90 px-6 text-center">
            <TriangleAlert className="size-7 text-destructive" />
            <p className="text-sm text-foreground">Не удалось воспроизвести</p>
            <p className="max-w-md font-mono text-xs text-muted-foreground">{state.error}</p>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <div className="flex items-baseline gap-2 font-mono tabular-nums">
          <span className="text-2xl font-medium text-primary sm:text-3xl">{formatTime(state.currentTime, true)}</span>
          <span className="text-sm text-muted-foreground">/ {formatTime(state.duration)}</span>
        </div>
        <p className="truncate text-sm text-muted-foreground">{title ?? 'Фильм не загружен'}</p>
      </div>
    </div>
  )
})
