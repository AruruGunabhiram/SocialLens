import { useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChannelAvatarProps {
  thumbnailUrl?: string | null
  /** Used for the fallback initial and deterministic color. */
  channelName: string
  /** sm = 32 × 32  |  md = 48 × 48  |  lg = 64 × 64 */
  size?: 'sm' | 'md' | 'lg'
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SIZE_PX = { sm: 32, md: 48, lg: 64 } as const

const AVATAR_COLORS = [
  { bg: 'color-mix(in srgb, var(--chart-1) 18%, var(--color-surface-2))', fg: 'var(--chart-1)' },
  { bg: 'color-mix(in srgb, var(--chart-2) 18%, var(--color-surface-2))', fg: 'var(--chart-2)' },
  { bg: 'color-mix(in srgb, var(--chart-3) 18%, var(--color-surface-2))', fg: 'var(--chart-3)' },
  { bg: 'color-mix(in srgb, var(--chart-4) 18%, var(--color-surface-2))', fg: 'var(--chart-4)' },
  { bg: 'color-mix(in srgb, var(--chart-5) 18%, var(--color-surface-2))', fg: 'var(--chart-5)' },
  { bg: 'color-mix(in srgb, var(--chart-6) 18%, var(--color-surface-2))', fg: 'var(--chart-6)' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hashName(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) >>> 0
  }
  return h
}

function colorFor(name: string) {
  return AVATAR_COLORS[hashName(name) % AVATAR_COLORS.length]
}

// ─── Fallback circle ──────────────────────────────────────────────────────────

function AvatarFallback({ name, px }: { name: string; px: number }) {
  const { bg, fg } = colorFor(name)
  const fontSize = px <= 32 ? 12 : px <= 48 ? 18 : 24
  return (
    <div
      aria-hidden="true"
      style={{
        width: px,
        height: px,
        borderRadius: '50%',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: bg,
        color: fg,
        fontFamily: 'var(--font-display)',
        fontSize,
        fontWeight: 700,
        lineHeight: 1,
      }}
    >
      {(name || '?').charAt(0).toUpperCase()}
    </div>
  )
}

// ─── ChannelAvatar ────────────────────────────────────────────────────────────

export function ChannelAvatar({ thumbnailUrl, channelName, size = 'md' }: ChannelAvatarProps) {
  const px = SIZE_PX[size]
  const [imgFailed, setImgFailed] = useState(false)

  if (thumbnailUrl && !imgFailed) {
    return (
      <img
        src={thumbnailUrl}
        alt={channelName}
        style={{
          width: px,
          height: px,
          borderRadius: '50%',
          flexShrink: 0,
          objectFit: 'cover',
        }}
        onError={() => setImgFailed(true)}
      />
    )
  }

  return <AvatarFallback name={channelName} px={px} />
}
