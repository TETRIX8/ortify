'use client'

import { useState, type FormEvent } from 'react'
import { Link2, LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmbedFormProps {
  onSubmit: (value: string) => void
  pending: boolean
  error?: string | null
}

const EXAMPLE = 'https://api.ortified.ws/embed/movie/92157'

export function EmbedForm({ onSubmit, pending, error }: EmbedFormProps) {
  const [value, setValue] = useState(EXAMPLE)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = value.trim()
    if (trimmed) onSubmit(trimmed)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <label htmlFor="embed-url" className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Ссылка на embed
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Link2 className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="embed-url"
            name="url"
            type="text"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={EXAMPLE}
            className="h-10 w-full rounded-lg border border-input bg-card pr-3 pl-9 font-mono text-sm text-foreground placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
          />
        </div>
        <Button type="submit" size="lg" disabled={pending} className="h-10 px-5">
          {pending ? <LoaderCircle className="animate-spin" /> : null}
          {pending ? 'Разбираю…' : 'Загрузить'}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Можно вставить ссылку на embed, целый код {'<iframe>'} или просто ID фильма.
      </p>
      {error ? (
        <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  )
}
