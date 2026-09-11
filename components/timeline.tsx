'use client'

import type { PlayerState } from '@/hooks/use-hls-player'
import { formatTime } from '@/lib/format'

interface TimelineProps {
  state: PlayerState
  onSeek: (seconds: number) => void
  disabled: boolean
}

export function Timeline({ state, onSeek, disabled }: TimelineProps) {
  const duration = state.duration > 0 ? state.duration : 0
  const played = duration ? (state.currentTime / duration) * 100 : 0
  const buffered = duration ? Math.min((state.bufferedEnd / duration) * 100, 100) : 0

  return (
    <div className="group relative h-6 w-full">
      <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-muted">
        <div className="absolute inset-y-0 left-0 bg-muted-foreground/40" style={{ width: `${buffered}%` }} />
        <div className="absolute inset-y-0 left-0 bg-primary" style={{ width: `${played}%` }} />
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary opacity-0 shadow transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
        style={{ left: `${played}%` }}
      />
      <input
        type="range"
        min={0}
        max={duration || 0}
        step={0.1}
        value={Math.min(state.currentTime, duration)}
        disabled={disabled || !duration}
        onChange={(event) => onSeek(Number(event.target.value))}
        aria-label="Позиция воспроизведения"
        aria-valuetext={`${formatTime(state.currentTime)} из ${formatTime(duration)}`}
        className="absolute inset-0 w-full cursor-pointer opacity-0 disabled:cursor-default"
      />
    </div>
  )
}
