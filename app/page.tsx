import { WatchDeck } from '@/components/watch-deck'

export default function Page() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-7xl flex-col gap-8 px-4 py-6 md:px-8">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex size-9 items-center justify-center rounded-lg bg-primary font-mono text-sm font-semibold text-primary-foreground"
          >
            КП
          </span>
          <div className="flex flex-col">
            <h1 className="text-base font-semibold leading-tight">Комната просмотра</h1>
            <p className="text-xs text-muted-foreground">свой плеер поверх embed-источника</p>
          </div>
        </div>
        <p className="hidden font-mono text-xs text-muted-foreground sm:block">
          пробел · ←/→ 5с · m звук · f экран
        </p>
      </header>

      <WatchDeck />
    </main>
  )
}
