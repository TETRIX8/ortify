'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type HlsType from 'hls.js'
import { formatTime } from '@/lib/format'

export type PlayerStatus = 'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'buffering' | 'ended' | 'error'
export type SourceMode = 'direct' | 'proxy'

export interface PlayerSource {
  direct: string
  proxied: string
}

export interface QualityLevel {
  index: number
  height: number
  bitrate: number
}

export interface PlayerEvent {
  id: number
  at: number
  name: string
  detail?: string
}

export interface PlayerState {
  status: PlayerStatus
  currentTime: number
  duration: number
  bufferedEnd: number
  playbackRate: number
  volume: number
  muted: boolean
  levels: QualityLevel[]
  currentLevel: number
  autoLevel: boolean
  mode: SourceMode
  error: string | null
  isFullscreen: boolean
}

export interface PlayerActions {
  load: (source: PlayerSource, mode?: SourceMode, startAt?: number) => Promise<void>
  play: () => void
  pause: () => void
  toggle: () => void
  seek: (seconds: number) => void
  skip: (delta: number) => void
  setRate: (rate: number) => void
  setVolume: (volume: number) => void
  toggleMute: () => void
  setLevel: (index: number) => void
  switchMode: (mode: SourceMode) => void
  setSubtitle: (label: string | null) => void
  toggleFullscreen: (element: HTMLElement | null) => void
}

const INITIAL_STATE: PlayerState = {
  status: 'idle',
  currentTime: 0,
  duration: 0,
  bufferedEnd: 0,
  playbackRate: 1,
  volume: 1,
  muted: false,
  levels: [],
  currentLevel: -1,
  autoLevel: true,
  mode: 'direct',
  error: null,
  isFullscreen: false,
}

const MAX_EVENTS = 40
let eventCounter = 0

function bufferedEndFor(video: HTMLVideoElement) {
  const { buffered, currentTime } = video
  for (let i = 0; i < buffered.length; i++) {
    if (buffered.start(i) <= currentTime && currentTime <= buffered.end(i)) return buffered.end(i)
  }
  return buffered.length ? buffered.end(buffered.length - 1) : 0
}

export function useHlsPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<HlsType | null>(null)
  const sourceRef = useRef<PlayerSource | null>(null)
  const loadIdRef = useRef(0)
  const [state, setState] = useState<PlayerState>(INITIAL_STATE)
  const [events, setEvents] = useState<PlayerEvent[]>([])

  const patch = useCallback((partial: Partial<PlayerState>) => {
    setState((prev) => ({ ...prev, ...partial }))
  }, [])

  const log = useCallback((name: string, detail?: string) => {
    setEvents((prev) => [{ id: ++eventCounter, at: Date.now(), name, detail }, ...prev].slice(0, MAX_EVENTS))
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const listen = (name: keyof HTMLMediaElementEventMap, handler: () => void) => {
      video.addEventListener(name, handler)
      return () => video.removeEventListener(name, handler)
    }

    const cleanups = [
      listen('loadedmetadata', () => {
        patch({ duration: video.duration })
        log('loadedmetadata', formatTime(video.duration))
      }),
      listen('durationchange', () => patch({ duration: video.duration })),
      listen('play', () => {
        patch({ status: 'playing' })
        log('play', formatTime(video.currentTime, true))
      }),
      listen('playing', () => patch({ status: 'playing' })),
      listen('pause', () => {
        if (video.ended) return
        patch({ status: 'paused' })
        log('pause', formatTime(video.currentTime, true))
      }),
      listen('waiting', () => {
        patch({ status: 'buffering' })
        log('waiting', formatTime(video.currentTime, true))
      }),
      listen('seeking', () => log('seeking', formatTime(video.currentTime, true))),
      listen('seeked', () => {
        patch({ currentTime: video.currentTime })
        log('seeked', formatTime(video.currentTime, true))
      }),
      listen('timeupdate', () => patch({ currentTime: video.currentTime, bufferedEnd: bufferedEndFor(video) })),
      listen('progress', () => patch({ bufferedEnd: bufferedEndFor(video) })),
      listen('ratechange', () => {
        patch({ playbackRate: video.playbackRate })
        log('ratechange', `${video.playbackRate}x`)
      }),
      listen('volumechange', () => patch({ volume: video.volume, muted: video.muted })),
      listen('ended', () => {
        patch({ status: 'ended' })
        log('ended')
      }),
      listen('error', () => {
        patch({ status: 'error', error: video.error?.message || 'Ошибка воспроизведения' })
        log('error', video.error?.message)
      }),
    ]

    const onFullscreen = () => patch({ isFullscreen: document.fullscreenElement != null })
    document.addEventListener('fullscreenchange', onFullscreen)

    return () => {
      cleanups.forEach((off) => off())
      document.removeEventListener('fullscreenchange', onFullscreen)
    }
  }, [patch, log])

  useEffect(() => () => hlsRef.current?.destroy(), [])

  const load = useCallback<PlayerActions['load']>(
    async (source, mode = 'direct', startAt = 0) => {
      const video = videoRef.current
      if (!video) return
      sourceRef.current = source
      const loadId = ++loadIdRef.current

      hlsRef.current?.destroy()
      hlsRef.current = null

      patch({ status: 'loading', error: null, mode, levels: [], currentLevel: -1, autoLevel: true })
      log('load', mode === 'direct' ? 'прямой источник' : 'через прокси')

      const src = mode === 'direct' ? source.direct : source.proxied
      const { default: Hls } = await import('hls.js')
      if (loadId !== loadIdRef.current) return

      if (Hls.isSupported()) {
        let networkRetries = 0
        const hls = new Hls({
          enableWorker: true,
          startPosition: startAt > 0 ? startAt : -1,
        })
        hlsRef.current = hls

        hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
          patch({
            status: 'ready',
            levels: data.levels.map((level, index) => ({ index, height: level.height, bitrate: level.bitrate })),
          })
          log('manifestParsed', `${data.levels.length} уровн. качества`)
        })
        hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
          patch({ currentLevel: data.level, autoLevel: hls.autoLevelEnabled })
        })
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (!data.fatal) return
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            if (mode === 'direct') {
              log('fallback', `${data.details} → переключаюсь на прокси`)
              void load(source, 'proxy', video.currentTime)
              return
            }
            if (networkRetries++ < 2) {
              log('retry', data.details)
              hls.startLoad()
              return
            }
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            log('recoverMedia', data.details)
            hls.recoverMediaError()
            return
          }
          hls.destroy()
          patch({ status: 'error', error: data.details })
          log('fatal', data.details)
        })

        hls.loadSource(src)
        hls.attachMedia(video)
        return
      }

      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = src
        if (startAt > 0) video.currentTime = startAt
        patch({ status: 'ready' })
        log('nativeHls')
        return
      }

      patch({ status: 'error', error: 'Браузер не поддерживает HLS' })
    },
    [patch, log],
  )

  const actions = useMemo<PlayerActions>(() => {
    const video = () => videoRef.current
    const play = () => {
      video()
        ?.play()
        .catch((error: Error) => log('playBlocked', error.message))
    }
    const pause = () => video()?.pause()
    const seek = (seconds: number) => {
      const v = video()
      if (!v) return
      const max = Number.isFinite(v.duration) ? v.duration : Number.POSITIVE_INFINITY
      v.currentTime = Math.min(Math.max(seconds, 0), max)
    }

    return {
      load,
      play,
      pause,
      toggle: () => (video()?.paused ? play() : pause()),
      seek,
      skip: (delta) => {
        const v = video()
        if (v) seek(v.currentTime + delta)
      },
      setRate: (rate) => {
        const v = video()
        if (v) v.playbackRate = rate
      },
      setVolume: (volume) => {
        const v = video()
        if (!v) return
        v.volume = volume
        if (volume > 0 && v.muted) v.muted = false
      },
      toggleMute: () => {
        const v = video()
        if (v) v.muted = !v.muted
      },
      setLevel: (index) => {
        const hls = hlsRef.current
        if (!hls) return
        hls.currentLevel = index
        patch({ autoLevel: index === -1, currentLevel: index })
        log('setLevel', index === -1 ? 'auto' : String(index))
      },
      switchMode: (mode) => {
        const source = sourceRef.current
        const v = video()
        if (source && v) void load(source, mode, v.currentTime)
      },
      setSubtitle: (label) => {
        const v = video()
        if (!v) return
        let changed = false
        for (const track of Array.from(v.textTracks)) {
          const next = label != null && track.label === label ? 'showing' : 'disabled'
          if (track.mode !== next) changed = true
          track.mode = next
        }
        if (changed) log('subtitle', label ?? 'выкл')
      },
      toggleFullscreen: (element) => {
        if (document.fullscreenElement) {
          void document.exitFullscreen()
        } else {
          void element?.requestFullscreen().catch((error: Error) => log('fullscreenBlocked', error.message))
        }
      },
    }
  }, [load, patch, log])

  return { videoRef, state, events, actions }
}
