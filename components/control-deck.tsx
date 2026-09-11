'use client'

import { useState, type FormEvent } from 'react'
import {
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PlayerActions, PlayerState, SourceMode } from '@/hooks/use-hls-player'
import { formatBitrate, parseTimecode } from '@/lib/format'
import { cn } from '@/lib/utils'

interface Subtitle {
  name: string
  url: string
}

interface ControlDeckProps {
  state: PlayerState
  actions: PlayerActions
  subtitles: Subtitle[]
  activeSubtitle: string | null
  onSubtitleChange: (label: string | null) => void
  onFullscreen: () => void
  disabled: boolean
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2]

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">{children}</p>
}

function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  disabled,
  label,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  disabled?: boolean
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-lg border bg-muted/40 p-0.5">
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex-1 rounded-md px-2 py-1 font-mono text-xs transition-colors disabled:opacity-50',
              active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

const selectClass =
  'h-8 w-full rounded-lg border border-input bg-background px-2 text-sm text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none disabled:opacity-50'

export function ControlDeck({
  state,
  actions,
  subtitles,
  activeSubtitle,
  onSubtitleChange,
  onFullscreen,
  disabled,
}: ControlDeckProps) {
  const [seekInput, setSeekInput] = useState('')
  const isPlaying = state.status === 'playing' || state.status === 'buffering'

  const handleSeekSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const seconds = parseTimecode(seekInput)
    if (seconds != null) actions.seek(seconds)
  }

  return (
    <section aria-label="Управление плеером" className="flex flex-col gap-5 rounded-xl border bg-card p-4">
      <div className="flex flex-col gap-3">
        <SectionLabel>Транспорт</SectionLabel>
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="icon-lg"
            disabled={disabled}
            onClick={() => actions.seek(0)}
            aria-label="В начало"
          >
            <RotateCcw />
          </Button>
          <Button
            variant="outline"
            size="lg"
            disabled={disabled}
            onClick={() => actions.skip(-10)}
            aria-label="Назад на 10 секунд"
            className="font-mono"
          >
            <SkipBack />
            10
          </Button>
          <Button
            size="icon-lg"
            disabled={disabled}
            onClick={actions.toggle}
            aria-label={isPlaying ? 'Пауза' : 'Играть'}
            className="size-12 rounded-full"
          >
            {isPlaying ? <Pause className="size-5" /> : <Play className="size-5 translate-x-px" />}
          </Button>
          <Button
            variant="outline"
            size="lg"
            disabled={disabled}
            onClick={() => actions.skip(10)}
            aria-label="Вперёд на 10 секунд"
            className="font-mono"
          >
            10
            <SkipForward />
          </Button>
          <Button
            variant="outline"
            size="icon-lg"
            disabled={disabled}
            onClick={onFullscreen}
            aria-label={state.isFullscreen ? 'Выйти из полного экрана' : 'На весь экран'}
          >
            {state.isFullscreen ? <Minimize /> : <Maximize />}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSeekSubmit} className="flex flex-col gap-2">
        <label htmlFor="seek-input">
          <SectionLabel>Перейти к времени</SectionLabel>
        </label>
        <div className="flex gap-2">
          <input
            id="seek-input"
            type="text"
            inputMode="numeric"
            placeholder="1:23:45"
            value={seekInput}
            disabled={disabled}
            onChange={(event) => setSeekInput(event.target.value)}
            className="h-8 min-w-0 flex-1 rounded-lg border border-input bg-background px-2 font-mono text-sm text-foreground placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none disabled:opacity-50"
          />
          <Button type="submit" variant="secondary" disabled={disabled || !seekInput.trim()}>
            Перейти
          </Button>
        </div>
      </form>

      <div className="flex flex-col gap-2">
        <SectionLabel>Скорость</SectionLabel>
        <Segmented
          label="Скорость воспроизведения"
          options={SPEEDS.map((speed) => ({ value: speed, label: `${speed}x` }))}
          value={state.playbackRate}
          onChange={actions.setRate}
          disabled={disabled}
        />
      </div>

      <div className="flex flex-col gap-2">
        <SectionLabel>Громкость</SectionLabel>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            disabled={disabled}
            onClick={actions.toggleMute}
            aria-label={state.muted ? 'Включить звук' : 'Выключить звук'}
          >
            {state.muted || state.volume === 0 ? <VolumeX /> : <Volume2 />}
          </Button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={state.muted ? 0 : state.volume}
            disabled={disabled}
            onChange={(event) => actions.setVolume(Number(event.target.value))}
            aria-label="Громкость"
            className="h-1.5 flex-1 cursor-pointer accent-primary disabled:cursor-default"
          />
          <span className="w-9 text-right font-mono text-xs text-muted-foreground tabular-nums">
            {Math.round((state.muted ? 0 : state.volume) * 100)}%
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <label htmlFor="subtitle-select">
            <SectionLabel>Субтитры</SectionLabel>
          </label>
          <select
            id="subtitle-select"
            className={selectClass}
            value={activeSubtitle ?? ''}
            disabled={disabled || subtitles.length === 0}
            onChange={(event) => onSubtitleChange(event.target.value || null)}
          >
            <option value="">Выкл</option>
            {subtitles.map((track) => (
              <option key={track.url} value={track.name}>
                {track.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="quality-select">
            <SectionLabel>Качество</SectionLabel>
          </label>
          <select
            id="quality-select"
            className={selectClass}
            value={state.autoLevel ? -1 : state.currentLevel}
            disabled={disabled || state.levels.length === 0}
            onChange={(event) => actions.setLevel(Number(event.target.value))}
          >
            <option value={-1}>Авто</option>
            {[...state.levels].reverse().map((level) => (
              <option key={level.index} value={level.index}>
                {level.height ? `${level.height}p` : `#${level.index}`}
                {level.bitrate ? ` · ${formatBitrate(level.bitrate)}` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <SectionLabel>Источник потока</SectionLabel>
        <Segmented<SourceMode>
          label="Режим источника"
          options={[
            { value: 'direct', label: 'Напрямую с CDN' },
            { value: 'proxy', label: 'Через сервер' },
          ]}
          value={state.mode}
          onChange={actions.switchMode}
          disabled={disabled}
        />
      </div>
    </section>
  )
}
