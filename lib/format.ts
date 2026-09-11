const pad = (n: number) => String(n).padStart(2, '0')

export function formatTime(seconds: number, withTenths = false): string {
  const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : 0
  const h = Math.floor(safe / 3600)
  const m = Math.floor((safe % 3600) / 60)
  const s = Math.floor(safe % 60)
  const base = h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
  return withTenths ? `${base}.${Math.floor((safe % 1) * 10)}` : base
}

export function parseTimecode(input: string): number | null {
  const parts = input.trim().split(':')
  if (parts.length === 0 || parts.length > 3) return null
  const numbers = parts.map((p) => Number(p))
  if (numbers.some((n) => !Number.isFinite(n) || n < 0)) return null
  return numbers.reduce((acc, n) => acc * 60 + n, 0)
}

export function formatClock(timestamp: number): string {
  const d = new Date(timestamp)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3, '0')}`
}

export function formatBitrate(bps: number): string {
  if (!bps) return ''
  return bps >= 1_000_000 ? `${(bps / 1_000_000).toFixed(1)} Мбит/с` : `${Math.round(bps / 1000)} кбит/с`
}
