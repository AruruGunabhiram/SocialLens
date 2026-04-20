import { type FormEvent, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'

import { isAppError } from '@/api/httpError'
import type { ChannelItem } from '@/api/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { syncChannel } from '../api'
import { channelListQueryKeys } from '../queries'

// ─── Error state types ────────────────────────────────────────────────────────

type TrackError =
  | { type: 'not_found' }
  | { type: 'already_tracked'; channelId: number; channelTitle: string }
  | { type: 'api' }

// ─── TrackChannelDialog ───────────────────────────────────────────────────────

interface TrackChannelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TrackChannelDialog({ open, onOpenChange }: TrackChannelDialogProps) {
  const [identifier, setIdentifier] = useState('')
  const [isPending, setIsPending] = useState(false)
  const [trackError, setTrackError] = useState<TrackError | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  // Auto-focus input whenever dialog opens
  useEffect(() => {
    if (open) {
      // Slight delay so the animation doesn't fight focus
      const id = setTimeout(() => inputRef.current?.focus(), 80)
      return () => clearTimeout(id)
    } else {
      // Reset state on close
      setIdentifier('')
      setTrackError(null)
      setIsPending(false)
    }
  }, [open])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = identifier.trim()
    if (!trimmed || isPending) return

    setTrackError(null)
    setIsPending(true)

    try {
      // Snapshot current list so we can detect "already tracked" after sync
      const cachedChannels = queryClient.getQueryData<ChannelItem[]>(
        channelListQueryKeys.list(false)
      )

      const response = await syncChannel(trimmed)

      // Invalidate channel list so new channel appears immediately
      void queryClient.invalidateQueries({ queryKey: channelListQueryKeys.root })

      // Check if the returned channel already existed in the list
      const existingChannel = cachedChannels?.find((ch) => ch.id === response.channelDbId)

      if (existingChannel) {
        setTrackError({
          type: 'already_tracked',
          channelId: response.channelDbId,
          channelTitle: existingChannel.title ?? response.title ?? response.channelId,
        })
        setIsPending(false)
        return
      }

      // New channel successfully added
      onOpenChange(false)
      toast.success(`${response.title ?? response.channelId} added!`, {
        description: 'Syncing data in the background...',
      })
      navigate(`/channels/${response.channelDbId}`)
    } catch (err) {
      const appError = isAppError(err) ? err : null
      if (appError?.status === 404) {
        setTrackError({ type: 'not_found' })
      } else {
        setTrackError({ type: 'api' })
      }
      setIsPending(false)
    }
  }

  const hasInput = Boolean(identifier.trim())
  const isErrorBorder = trackError !== null && trackError.type !== 'already_tracked'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Track a YouTube Channel</DialogTitle>
          <DialogDescription>
            Enter a channel handle, URL, or channel ID to start tracking
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(e)}>
          {/* Input */}
          <input
            ref={inputRef}
            type="text"
            value={identifier}
            onChange={(e) => {
              setIdentifier(e.target.value)
              if (trackError) setTrackError(null)
            }}
            disabled={isPending}
            placeholder="@channelhandle, youtube.com/c/..., or UCxxxxxxxx"
            aria-label="Channel identifier"
            style={{
              display: 'block',
              width: '100%',
              height: 40,
              padding: '0 var(--space-3)',
              background: 'var(--color-surface-0)',
              border: `1px solid ${isErrorBorder ? 'var(--color-down)' : 'var(--color-border-base)'}`,
              borderRadius: 'var(--radius-md)',
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-primary)',
              outline: 'none',
              transition: 'border-color var(--duration-base) var(--ease-standard)',
              opacity: isPending ? 0.6 : 1,
              boxSizing: 'border-box',
            }}
            onFocus={(e) => {
              if (!isErrorBorder) e.currentTarget.style.borderColor = 'var(--accent)'
            }}
            onBlur={(e) => {
              if (!isErrorBorder) e.currentTarget.style.borderColor = 'var(--color-border-base)'
            }}
          />

          {/* Examples hint */}
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-muted)',
              marginTop: 'var(--space-2)',
            }}
          >
            Examples: @MrBeast · youtube.com/@veritasium · UCxxxxxx
          </p>

          {/* Inline error */}
          {trackError && (
            <div
              role="alert"
              style={{
                marginTop: 'var(--space-3)',
                padding: 'var(--space-3)',
                background:
                  trackError.type === 'already_tracked'
                    ? 'color-mix(in srgb, var(--accent) 6%, var(--color-surface-1))'
                    : 'color-mix(in srgb, var(--color-down) 6%, var(--color-surface-1))',
                border:
                  trackError.type === 'already_tracked'
                    ? '1px solid color-mix(in srgb, var(--accent) 25%, transparent)'
                    : '1px solid color-mix(in srgb, var(--color-down) 25%, transparent)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              {trackError.type === 'not_found' && (
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--color-down)',
                    lineHeight: 'var(--leading-relaxed)',
                  }}
                >
                  Channel not found. Check the handle or URL and try again.
                </p>
              )}
              {trackError.type === 'already_tracked' && (
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--color-text-secondary)',
                    lineHeight: 'var(--leading-relaxed)',
                  }}
                >
                  This channel is already being tracked.{' '}
                  <Link
                    to={`/channels/${trackError.channelId}`}
                    onClick={() => onOpenChange(false)}
                    style={{
                      color: 'var(--accent)',
                      fontWeight: 600,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 'var(--space-1)',
                    }}
                  >
                    View {trackError.channelTitle}
                    <ArrowRight size={12} aria-hidden />
                  </Link>
                </p>
              )}
              {trackError.type === 'api' && (
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--color-down)',
                    lineHeight: 'var(--leading-relaxed)',
                  }}
                >
                  Something went wrong. Please try again.
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-2)',
              marginTop: 'var(--space-5)',
            }}
          >
            <button
              type="submit"
              disabled={!hasInput || isPending}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--space-2)',
                width: '100%',
                height: 40,
                background: hasInput && !isPending ? 'var(--accent)' : 'var(--color-surface-2)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                color:
                  hasInput && !isPending ? 'var(--color-text-inverse)' : 'var(--color-text-muted)',
                cursor: hasInput && !isPending ? 'pointer' : 'default',
                transition:
                  'background var(--duration-base) var(--ease-standard), color var(--duration-base) var(--ease-standard)',
              }}
            >
              {isPending && (
                <Loader2 size={14} aria-hidden className="animate-spin" style={{ flexShrink: 0 }} />
              )}
              {isPending ? 'Checking channel...' : 'Start Tracking'}
            </button>

            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: 36,
                background: 'transparent',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: 'var(--radius-md)',
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-sm)',
                fontWeight: 500,
                color: 'var(--color-text-secondary)',
                cursor: isPending ? 'default' : 'pointer',
                opacity: isPending ? 0.5 : 1,
                transition: 'background var(--duration-fast) var(--ease-standard)',
              }}
              onMouseEnter={(e) => {
                if (!isPending) e.currentTarget.style.background = 'var(--color-surface-2)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
