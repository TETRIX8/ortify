'use client'

import { useEffect, useRef, useState } from 'react'
import useSWR from 'swr'
import { ControlDeck } from '@/components/control-deck'
import { EmbedForm } from '@/components/embed-form'
import { StateReadout } from '@/components/state-readout'
import { Timeline } from '@/components/timeline'
import { VideoStage } from '@/components/video-stage'
import { useHlsPlayer } from '@/hooks/use-hls-player'
import type { ResolvedEmbed } from '@/lib/types'

async function resolveEmbed(url: string): Promise<ResolvedEmbed> {
  const response = await fetch(url)
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(body.error ?? `Ошибка ${response.status}`)
  }
  return body as ResolvedEmbed
}

const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'])

export function WatchDeck() {
  const [embedUrl, setEmbedUrl] = useState<string | null>(null)
  const [activeSubtitle, setActiveSubtitle] = useState<string | null>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const { videoRef, state, events, actions } = useHlsPlayer()
  const { load, setSubtitle, toggle, skip, toggleMute } = actions

  const { data, error, isLoading } = useSWR(
    embedUrl ? `/api/resolve?url=${encodeURIComponent(embedUrl)}` : null,
    resolveEmbed,
    { revalidateOnFocus: false, revalidateOnReconnect: false, shouldRetryOnError: false },
  )

  useEffect(() => {
    if (!data) return
    setActiveSubtitle(null)
    void load(data.source, 'direct')
  }, [data, load])

  useEffect(() => {
    setSubtitle(activeSubtitle)
  }, [activeSubtitle, setSubtitle, data])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && (EDITABLE_TAGS.has(target.tagName) || target.isContentEditable)) return
      switch (event.key) {
        case ' ':
        case 'k':
          event.preventDefault()
          toggle()
          break
        case 'ArrowLeft':
          skip(-5)
          break
        case 'ArrowRight':
          skip(5)
          break
        case 'm':
          toggleMute()
          break
        case 'f':
          actions.toggleFullscreen(stageRef.current)
          break
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [toggle, skip, toggleMute, actions])

  const disabled = state.status === 'idle' || state.status === 'loading'

  return (
    <div className="flex flex-col gap-6">
      <EmbedForm onSubmit={setEmbedUrl} pending={isLoading} error={error?.message} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="flex flex-col gap-3">
          <VideoStage
            ref={stageRef}
            videoRef={videoRef}
            state={state}
            title={data?.title ?? null}
            poster={data?.poster ?? null}
            subtitles={data?.subtitles ?? []}
            onToggle={toggle}
          />
          <Timeline state={state} onSeek={actions.seek} disabled={disabled} />
          {data ? (
            <p className="font-mono text-xs text-muted-foreground">
              id {data.videoId ?? '—'} · {data.audioNames.length ? `озвучка: ${data.audioNames.join(', ')}` : 'озвучка не указана'} ·{' '}
              {data.subtitles.length} субт.
            </p>
          ) : null}
        </div>

        <aside className="flex flex-col gap-4">
          <ControlDeck
            state={state}
            actions={actions}
            subtitles={data?.subtitles ?? []}
            activeSubtitle={activeSubtitle}
            onSubtitleChange={setActiveSubtitle}
            onFullscreen={() => actions.toggleFullscreen(stageRef.current)}
            disabled={disabled}
          />
          <StateReadout state={state} events={events} />
        </aside>
      </div>
    </div>
  )
}
