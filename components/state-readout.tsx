'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PlayerEvent, PlayerState, PlayerStatus } from '@/hooks/use-hls-player'
import { formatClock, formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'

interface StateReadoutProps {
  state: PlayerState
  events: PlayerEvent[]
}

const STATUS_LABEL: Record<PlayerStatus, string> = {
  idle: 'Ожидание',
  loading: 'Загрузка',
  ready: 'Готов',
  playing: 'Играет',
  paused: 'Пауза',
  buffering: 'Буферизация',
  ended: 'Завершён',
  error: 'Ошибка',
}

function StatusBadge({ status }: { status: PlayerStatus }) {
  const dotClass =
    status === 'playing'
      ? 'bg-primary'
      : status === 'buffering' || status === 'loading'
        ? 'bg-primary animate-pulse'
        : status === 'error'
          ? 'bg-destructive'
          : 'bg-muted-foreground'
  return (
    <span className="inline-flex items-center gap-2 rounded-md border bg-background px-2 py-1 font-mono text-xs">
      <span className={cn('size-1.5 rounded-full', dotClass)} aria-hidden="true" />
      {STATUS_LABEL[status]}
    </span>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[11px] tracking-wider text-muted-foreground uppercase">{label}</dt>
      <dd className="font-mono text-sm text-foreground tabular-nums">{value}</dd>
    </div>
  )
}

export function StateReadout({ state, events }: StateReadoutProps) {
  const [copied, setCopied] = useState(false)
  const bufferAhead = Math.max(state.bufferedEnd - state.currentTime, 0)
  const quality = state.autoLevel
    ? `авто${state.currentLevel >= 0 && state.levels[state.currentLevel]?.height ? ` · ${state.levels[state.currentLevel].height}p` : ''}`
    : (state.levels[state.currentLevel]?.height ? `${state.levels[state.currentLevel].height}p` : `#${state.currentLevel}`)

  const copyState = async () => {
    const snapshot = {
      status: state.status,
      currentTime: Number(state.currentTime.toFixed(3)),
      duration: Number(state.duration.toFixed(3)),
      bufferedEnd: Number(state.bufferedEnd.toFixed(3)),
      playbackRate: state.playbackRate,
      volume: state.volume,
      muted: state.muted,
      mode: state.mode,
      level: state.currentLevel,
      autoLevel: state.autoLevel,
      at: Date.now(),
    }
    await navigator.clipboard.writeText(JSON.stringify(snapshot, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <section aria-label="Состояние плеера" className="flex flex-col rounded-xl border bg-card">
      <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <h2 className="text-sm font-medium">Состояние плеера</h2>
        <StatusBadge status={state.status} />
      </header>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-3">
        <Row label="Позиция" value={formatTime(state.currentTime, true)} />
        <Row label="Длительность" value={formatTime(state.duration)} />
        <Row label="Буфер впереди" value={`${bufferAhead.toFixed(1)} с`} />
        <Row label="Скорость" value={`${state.playbackRate}x`} />
        <Row label="Громкость" value={state.muted ? 'без звука' : `${Math.round(state.volume * 100)}%`} />
        <Row label="Качество" value={state.levels.length ? quality : '—'} />
        <Row label="Источник" value={state.mode === 'direct' ? 'CDN напрямую' : 'через сервер'} />
        <Row label="Экран" value={state.isFullscreen ? 'полный' : 'обычный'} />
      </dl>

      <div className="flex items-center justify-between gap-3 border-t px-4 py-2">
        <h3 className="text-[11px] tracking-wider text-muted-foreground uppercase">Журнал событий</h3>
        <Button variant="ghost" size="xs" onClick={copyState} aria-live="polite">
          {copied ? <Check /> : <Copy />}
          {copied ? 'Скопировано' : 'Снимок JSON'}
        </Button>
      </div>
      <ul className="max-h-60 overflow-y-auto border-t font-mono text-xs" aria-live="polite" aria-relevant="additions">
        {events.length === 0 ? (
          <li className="px-4 py-3 text-muted-foreground">Событий пока нет</li>
        ) : (
          events.map((event) => (
            <li key={event.id} className="flex items-baseline gap-3 border-b px-4 py-1.5 last:border-b-0">
              <span className="shrink-0 text-muted-foreground tabular-nums">{formatClock(event.at)}</span>
              <span className="text-foreground">{event.name}</span>
              {event.detail ? <span className="truncate text-muted-foreground">{event.detail}</span> : null}
            </li>
          ))
        )}
      </ul>
    </section>
  )
}
