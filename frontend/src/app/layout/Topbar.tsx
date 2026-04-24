import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Check,
  ChevronDown,
  Clock,
  Link2Off,
  Loader2,
  Lock,
  Search,
  Settings,
  Youtube,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { isAppError } from '@/api/httpError'
import type { ChannelItem } from '@/api/types'
import { fetchOAuthStartUrl } from '@/features/account/api'
import {
  useAccountDetail,
  useAccountStatus,
  useCurrentUser,
  useDisconnectMutation,
} from '@/features/account/queries'
import { syncChannel } from '@/features/channels/api'
import {
  channelListQueryKeys,
  channelQueryKeys,
} from '@/features/channels/queries'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatDate } from '@/utils/formatters'
import { toastSuccess } from '@/lib/toast'
import { NotificationHistoryDropdown } from '@/components/common/NotificationHistoryDropdown'

// ─── Search history helpers ───────────────────────────────────────────────────

const HISTORY_KEY = 'sl_recent_channels'
const HISTORY_MAX = 5

function loadHistory(): string[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]') as string[]
  } catch {
    return []
  }
}

function saveToHistory(val: string): string[] {
  const next = [val, ...loadHistory().filter((h) => h !== val)].slice(0, HISTORY_MAX)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
  return next
}

// ─── Inline error type ────────────────────────────────────────────────────────

type InlineError =
  | { kind: 'not_found'; input: string }
  | { kind: 'already_tracked'; channelId: number; channelTitle: string }
  | { kind: 'api' }
  | { kind: 'invalid'; message: string }

// ─── DisconnectConfirmDialog ──────────────────────────────────────────────────

function DisconnectConfirmDialog({
  open,
  onClose,
  onConfirm,
  isPending,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  isPending: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Disconnect YouTube?</DialogTitle>
          <DialogDescription>
            Your tracked channels and all analytics data will remain intact. You'll lose access to
            private analytics until you reconnect.
          </DialogDescription>
        </DialogHeader>

        {/* Trust copy */}
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-muted)',
            lineHeight: 'var(--leading-relaxed)',
            padding: 'var(--space-3)',
            background: 'var(--color-surface-2)',
            borderRadius: 'var(--radius-md)',
            marginTop: 'var(--space-2)',
          }}
        >
          Read-only access · We never post on your behalf · Disconnect anytime
        </p>

        {/* Actions */}
        <div
          style={{
            display: 'flex',
            gap: 'var(--space-2)',
            marginTop: 'var(--space-4)',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            style={{
              flex: 1,
              height: 36,
              background: 'transparent',
              border: '1px solid var(--color-border-base)',
              borderRadius: 'var(--radius-md)',
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-sm)',
              fontWeight: 500,
              color: 'var(--color-text-secondary)',
              cursor: isPending ? 'default' : 'pointer',
              opacity: isPending ? 0.5 : 1,
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            style={{
              flex: 1,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-2)',
              background: 'color-mix(in srgb, var(--color-down) 15%, var(--color-surface-2))',
              border: '1px solid color-mix(in srgb, var(--color-down) 35%, transparent)',
              borderRadius: 'var(--radius-md)',
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
              color: 'var(--color-down)',
              cursor: isPending ? 'default' : 'pointer',
              opacity: isPending ? 0.6 : 1,
              transition: 'opacity var(--duration-base) var(--ease-standard)',
            }}
          >
            {isPending && (
              <Loader2 size={13} className="animate-spin" aria-hidden style={{ flexShrink: 0 }} />
            )}
            {isPending ? 'Disconnecting...' : 'Disconnect'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── ConnectedDropdown ────────────────────────────────────────────────────────

function ConnectedDropdown({
  userName,
  userEmail,
  connectedAt,
  onClose,
  onDisconnectClick,
}: {
  userName?: string
  userEmail?: string
  connectedAt?: string | null
  onClose: () => void
  onDisconnectClick: () => void
}) {
  const connectedDate = connectedAt ? formatDate(connectedAt) : null

  return (
    <div
      style={{
        position: 'absolute',
        top: 'calc(100% + var(--space-2))',
        right: 0,
        width: 256,
        background: 'var(--color-surface-1)',
        border: '1px solid var(--color-border-base)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-md)',
        overflow: 'hidden',
        zIndex: 50,
      }}
      role="menu"
    >
      {/* ── Account identity ── */}
      <div
        style={{
          padding: 'var(--space-4)',
          borderBottom: '1px solid var(--color-border-subtle)',
        }}
      >
        <div className="flex items-center gap-2" style={{ marginBottom: 'var(--space-2)' }}>
          <span
            aria-hidden
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: 'var(--color-up)',
              flexShrink: 0,
              boxShadow: '0 0 6px var(--color-up)',
            }}
          />
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
              color: 'var(--color-up)',
            }}
          >
            YouTube Connected
          </span>
        </div>

        {(userName || userEmail) && (
          <div style={{ paddingLeft: 15 }}>
            {userName && (
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                  lineHeight: 1.3,
                }}
              >
                {userName}
              </p>
            )}
            {userEmail && (
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-text-muted)',
                  marginTop: 2,
                }}
              >
                {userEmail}
              </p>
            )}
          </div>
        )}

        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-muted)',
            marginTop: 'var(--space-2)',
            paddingLeft: 15,
          }}
        >
          Read-only
          {connectedDate ? ` · Connected ${connectedDate}` : ''}
        </p>
      </div>

      {/* ── Trust copy ── */}
      <div
        style={{
          padding: 'var(--space-3) var(--space-4)',
          borderBottom: '1px solid var(--color-border-subtle)',
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-muted)',
            lineHeight: 'var(--leading-relaxed)',
          }}
        >
          We never post on your behalf · Disconnect anytime
        </p>
      </div>

      {/* ── Actions ── */}
      <div style={{ padding: 'var(--space-1)' }}>
        <Link
          to="/settings"
          onClick={onClose}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            padding: 'var(--space-2) var(--space-3)',
            borderRadius: 'var(--radius-md)',
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-secondary)',
            textDecoration: 'none',
            transition: 'background var(--duration-fast) var(--ease-standard)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--color-surface-2)'
            e.currentTarget.style.color = 'var(--color-text-primary)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--color-text-secondary)'
          }}
          role="menuitem"
        >
          <Settings size={13} aria-hidden style={{ flexShrink: 0 }} />
          Manage Connection
        </Link>

        <Link
          to="/settings"
          onClick={onClose}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            padding: 'var(--space-2) var(--space-3)',
            borderRadius: 'var(--radius-md)',
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-secondary)',
            textDecoration: 'none',
            transition: 'background var(--duration-fast) var(--ease-standard)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--color-surface-2)'
            e.currentTarget.style.color = 'var(--color-text-primary)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--color-text-secondary)'
          }}
          role="menuitem"
        >
          <Lock size={13} aria-hidden style={{ flexShrink: 0 }} />
          View Permissions
        </Link>

        {/* Divider */}
        <div
          aria-hidden
          style={{
            height: 1,
            background: 'var(--color-border-subtle)',
            margin: 'var(--space-1) var(--space-3)',
          }}
        />

        <button
          type="button"
          onClick={() => {
            onClose()
            onDisconnectClick()
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            width: '100%',
            padding: 'var(--space-2) var(--space-3)',
            borderRadius: 'var(--radius-md)',
            background: 'transparent',
            border: 'none',
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-down)',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'background var(--duration-fast) var(--ease-standard)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background =
              'color-mix(in srgb, var(--color-down) 8%, transparent)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
          }}
          role="menuitem"
        >
          <Link2Off size={13} aria-hidden style={{ flexShrink: 0 }} />
          Disconnect
        </button>
      </div>
    </div>
  )
}

// ─── Topbar ───────────────────────────────────────────────────────────────────

export function Topbar() {
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [inlineError, setInlineError] = useState<InlineError | null>(null)
  const [recentChannels, setRecentChannels] = useState<string[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false)
  const [isStartingOAuth, setIsStartingOAuth] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const formWrapRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: currentUser } = useCurrentUser()
  const { data: accountStatus } = useAccountStatus(currentUser?.id)
  const { data: accountDetail } = useAccountDetail(currentUser?.id)
  const disconnectMutation = useDisconnectMutation()

  const connected = accountStatus?.connected ?? false

  // Load history on mount
  useEffect(() => {
    setRecentChannels(loadHistory())
  }, [])

  // Fire a toast when OAuth connection is detected (tab polling picks it up)
  const prevConnectedRef = useRef<boolean | undefined>(undefined)
  useEffect(() => {
    if (prevConnectedRef.current === false && connected === true) {
      toastSuccess('YouTube account connected!')
    }
    prevConnectedRef.current = connected
  }, [connected])

  // Close account dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return
    function handleOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [dropdownOpen])

  // Close history dropdown on outside click
  useEffect(() => {
    if (!showHistory) return
    function handleOutside(e: MouseEvent) {
      if (formWrapRef.current && !formWrapRef.current.contains(e.target as Node)) {
        setShowHistory(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [showHistory])

  function validateInput(val: string): string | null {
    if (val.length < 2) return 'Enter a YouTube handle (@name), URL, or channel ID'
    if (val.startsWith('http') && !val.includes('youtube.com') && !val.includes('youtu.be')) {
      return 'Only YouTube URLs are supported'
    }
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = query.trim()

    if (!trimmed) {
      inputRef.current?.focus()
      return
    }

    const validationMsg = validateInput(trimmed)
    if (validationMsg) {
      setInlineError({ kind: 'invalid', message: validationMsg })
      return
    }

    setInlineError(null)
    setShowHistory(false)
    setIsPending(true)

    try {
      const cachedChannels = queryClient.getQueryData<ChannelItem[]>(
        channelListQueryKeys.list(false)
      )

      const response = await syncChannel(trimmed)

      void queryClient.invalidateQueries({ queryKey: channelListQueryKeys.root })
      void queryClient.invalidateQueries({ queryKey: channelQueryKeys.root })
      void queryClient.invalidateQueries({ queryKey: ['timeseries', response.channelDbId] })

      const channelTitle = response.title ?? response.channelId
      const existingChannel = cachedChannels?.find((ch) => ch.id === response.channelDbId)

      if (existingChannel) {
        setIsPending(false)
        setInlineError({
          kind: 'already_tracked',
          channelId: response.channelDbId,
          channelTitle: existingChannel.title ?? channelTitle,
        })
        return
      }

      // New channel — save history, flash success, navigate
      const updated = saveToHistory(trimmed)
      setRecentChannels(updated)
      setQuery('')
      setIsPending(false)
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 2000)
      toastSuccess(`${channelTitle} added`, 'Syncing data in the background...')
      navigate(`/channels/${response.channelDbId}`)
    } catch (err) {
      setIsPending(false)
      if (isAppError(err) && err.status === 404) {
        setInlineError({ kind: 'not_found', input: trimmed })
      } else {
        setInlineError({ kind: 'api' })
      }
    }
  }

  async function handleConnect() {
    if (!currentUser) return
    setIsStartingOAuth(true)
    try {
      const authUrl = await fetchOAuthStartUrl(currentUser.id)
      window.open(authUrl, '_blank', 'noopener,noreferrer')
    } catch {
      // silently fail  -  the sidebar shows the full error state
    } finally {
      setIsStartingOAuth(false)
    }
  }

  async function handleDisconnectConfirm() {
    if (!currentUser) return
    await disconnectMutation.mutateAsync({ userId: currentUser.id })
    setShowDisconnectDialog(false)
  }

  const isErrorBorder = inlineError !== null && inlineError.kind !== 'already_tracked'
  const inputBorderColor = isErrorBorder
    ? 'var(--color-down)'
    : focused
      ? 'var(--accent)'
      : 'var(--color-border-base)'

  const hasQuery = Boolean(query.trim())
  const showHistoryDropdown = showHistory && !query.trim() && recentChannels.length > 0

  return (
    <>
      <header
        className="sticky top-0 z-20 flex shrink-0 items-center justify-between gap-4 px-5"
        style={{
          height: 'var(--header-height)',
          background: 'var(--color-surface-0)',
          borderBottom: '1px solid var(--color-border-subtle)',
        }}
      >
        {/* LEFT: Logo  -  visible on mobile only; sidebar handles desktop */}
        <div className="flex shrink-0 items-center gap-2 lg:hidden">
          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              textDecoration: 'none',
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 28 28"
              fill="none"
              aria-hidden
              style={{ color: 'var(--accent)', flexShrink: 0 }}
            >
              <rect x="4" y="18" width="4" height="7" rx="1" fill="currentColor" opacity="0.4" />
              <rect x="10" y="11" width="4" height="14" rx="1" fill="currentColor" opacity="0.65" />
              <rect x="16" y="5" width="4" height="20" rx="1" fill="currentColor" />
              <path
                d="M20 5 C24 5 24 9 24 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-base)',
                fontWeight: 700,
                color: 'var(--color-text-primary)',
                letterSpacing: 'var(--tracking-wide)',
              }}
            >
              SocialLens
            </span>
          </Link>
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '10px',
              fontWeight: 700,
              color: 'var(--color-neutral)',
              background: 'color-mix(in srgb, var(--color-neutral) 10%, transparent)',
              border: '1px solid color-mix(in srgb, var(--color-neutral) 25%, transparent)',
              borderRadius: 'var(--radius-full)',
              padding: '2px 6px',
              letterSpacing: 'var(--tracking-wide)',
              lineHeight: 1,
              textTransform: 'uppercase',
            }}
          >
            Beta
          </span>
        </div>

        {/* CENTER: Channel track form */}
        <div
          ref={formWrapRef}
          className="flex flex-1 justify-center"
          style={{ position: 'relative' }}
        >
          <form
            onSubmit={(e) => void handleSubmit(e)}
            className="flex items-center gap-2"
            style={{ width: 480, maxWidth: '100%' }}
          >
            <label
              className="flex flex-1 items-center gap-2"
              style={{
                height: 36,
                background: 'var(--color-surface-1)',
                border: `1px solid ${inputBorderColor}`,
                borderRadius: 'var(--radius-full)',
                padding: '0 var(--space-4)',
                cursor: 'text',
                transition: 'border-color var(--duration-base) var(--ease-standard)',
              }}
            >
              {isPending ? (
                <Loader2
                  size={14}
                  aria-hidden
                  className="animate-spin"
                  style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}
                />
              ) : (
                <Search
                  size={14}
                  aria-hidden
                  style={{
                    color: focused ? 'var(--accent)' : 'var(--color-text-muted)',
                    flexShrink: 0,
                    transition: 'color var(--duration-base) var(--ease-standard)',
                  }}
                />
              )}
              <input
                ref={inputRef}
                type="search"
                aria-label="Track a YouTube channel"
                placeholder="@handle, channel ID, or URL..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  if (inlineError) setInlineError(null)
                }}
                onFocus={() => {
                  setFocused(true)
                  setShowHistory(true)
                }}
                onBlur={() => setFocused(false)}
                disabled={isPending}
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: 'var(--text-sm)',
                  fontFamily: 'var(--font-body)',
                  color: 'var(--color-text-primary)',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                }}
              />
            </label>

            <button
              type="submit"
              disabled={!hasQuery || isPending || showSuccess}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                height: 36,
                padding: '0 var(--space-4)',
                flexShrink: 0,
                borderRadius: 'var(--radius-full)',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                fontFamily: 'var(--font-body)',
                background: showSuccess
                  ? 'color-mix(in srgb, var(--color-up) 15%, var(--color-surface-2))'
                  : hasQuery && !isPending
                    ? 'var(--accent)'
                    : 'var(--color-surface-2)',
                color: showSuccess
                  ? 'var(--color-up)'
                  : hasQuery && !isPending
                    ? 'var(--color-text-inverse)'
                    : 'var(--color-text-muted)',
                border: showSuccess
                  ? '1px solid color-mix(in srgb, var(--color-up) 30%, transparent)'
                  : '1px solid transparent',
                cursor: hasQuery && !isPending && !showSuccess ? 'pointer' : 'default',
                transition:
                  'background var(--duration-base) var(--ease-standard), color var(--duration-base) var(--ease-standard)',
                whiteSpace: 'nowrap',
              }}
            >
              {isPending ? (
                <Loader2 size={13} className="animate-spin" aria-hidden style={{ flexShrink: 0 }} />
              ) : showSuccess ? (
                <Check size={13} aria-hidden style={{ flexShrink: 0 }} />
              ) : (
                <Youtube size={13} aria-hidden style={{ flexShrink: 0 }} />
              )}
              {isPending ? 'Checking...' : showSuccess ? 'Tracked' : 'Track Channel'}
            </button>
          </form>

          {/* Loading hint */}
          {isPending && (
            <p
              style={{
                position: 'absolute',
                top: 'calc(100% + var(--space-1))',
                left: '50%',
                transform: 'translateX(-50%)',
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-xs)',
                color: 'var(--color-text-muted)',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
              }}
            >
              Looking up channel...
            </p>
          )}

          {/* Inline errors */}
          {!isPending && inlineError && (
            <div
              role="alert"
              style={{
                position: 'absolute',
                top: 'calc(100% + var(--space-1))',
                left: '50%',
                transform: 'translateX(-50%)',
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-xs)',
                background:
                  inlineError.kind === 'already_tracked'
                    ? 'color-mix(in srgb, var(--accent) 8%, var(--color-surface-1))'
                    : 'color-mix(in srgb, var(--color-down) 8%, var(--color-surface-1))',
                border:
                  inlineError.kind === 'already_tracked'
                    ? '1px solid color-mix(in srgb, var(--accent) 25%, transparent)'
                    : '1px solid color-mix(in srgb, var(--color-down) 25%, transparent)',
                borderRadius: 'var(--radius-md)',
                padding: '4px var(--space-3)',
                whiteSpace: 'nowrap',
                zIndex: 10,
              }}
            >
              {inlineError.kind === 'not_found' && (
                <span style={{ color: 'var(--color-down)' }}>
                  No YouTube channel found for &lsquo;{inlineError.input}&rsquo;. Check the
                  spelling and try again.
                </span>
              )}
              {inlineError.kind === 'already_tracked' && (
                <span style={{ color: 'var(--color-text-secondary)' }}>
                  Already tracking this channel{' '}
                  <Link
                    to={`/channels/${inlineError.channelId}`}
                    style={{
                      color: 'var(--accent)',
                      fontWeight: 600,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 2,
                    }}
                  >
                    View {inlineError.channelTitle}
                    <ArrowRight size={11} aria-hidden />
                  </Link>
                </span>
              )}
              {inlineError.kind === 'api' && (
                <span style={{ color: 'var(--color-down)' }}>
                  Something went wrong. Please try again.
                </span>
              )}
              {inlineError.kind === 'invalid' && (
                <span style={{ color: 'var(--color-down)' }}>{inlineError.message}</span>
              )}
            </div>
          )}

          {/* Recent channels history dropdown */}
          {showHistoryDropdown && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + var(--space-2))',
                left: '50%',
                transform: 'translateX(-50%)',
                width: 480,
                maxWidth: '100%',
                background: 'var(--color-surface-1)',
                border: '1px solid var(--color-border-base)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-md)',
                overflow: 'hidden',
                zIndex: 20,
              }}
            >
              <div
                style={{
                  padding: 'var(--space-2) var(--space-3) var(--space-1)',
                  borderBottom: '1px solid var(--color-border-subtle)',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 600,
                    color: 'var(--color-text-muted)',
                    letterSpacing: 'var(--tracking-wide)',
                    textTransform: 'uppercase',
                  }}
                >
                  Recent
                </span>
              </div>
              {recentChannels.map((handle) => (
                <button
                  key={handle}
                  type="button"
                  onClick={() => {
                    setQuery(handle)
                    setShowHistory(false)
                    inputRef.current?.focus()
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                    width: '100%',
                    padding: 'var(--space-2) var(--space-3)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--color-text-secondary)',
                    textAlign: 'left',
                    transition: 'background var(--duration-fast) var(--ease-standard)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--color-surface-2)'
                    e.currentTarget.style.color = 'var(--color-text-primary)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = 'var(--color-text-secondary)'
                  }}
                >
                  <Clock size={12} aria-hidden style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                  {handle}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Notifications + Connection status */}
        <div className="flex shrink-0 items-center gap-2">
          <NotificationHistoryDropdown />
          {connected ? (
            <div ref={dropdownRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setDropdownOpen((o) => !o)}
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  height: 32,
                  padding: '0 var(--space-3)',
                  background: dropdownOpen
                    ? 'var(--color-surface-2)'
                    : 'color-mix(in srgb, var(--color-up) 10%, transparent)',
                  border: `1px solid ${dropdownOpen ? 'var(--color-border-base)' : 'color-mix(in srgb, var(--color-up) 30%, transparent)'}`,
                  borderRadius: 'var(--radius-full)',
                  cursor: 'pointer',
                  transition:
                    'background var(--duration-base) var(--ease-standard), border-color var(--duration-base) var(--ease-standard)',
                }}
              >
                <span
                  aria-hidden
                  className="animate-pulse-dot"
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'var(--color-up)',
                    flexShrink: 0,
                    boxShadow: '0 0 5px var(--color-up)',
                  }}
                />
                <span
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 500,
                    color: 'var(--color-up)',
                    letterSpacing: 'var(--tracking-wide)',
                  }}
                >
                  Connected
                </span>
                <ChevronDown
                  size={11}
                  aria-hidden
                  style={{
                    color: 'var(--color-up)',
                    flexShrink: 0,
                    transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform var(--duration-base) var(--ease-standard)',
                  }}
                />
              </button>

              {dropdownOpen && (
                <ConnectedDropdown
                  userName={currentUser?.name}
                  userEmail={currentUser?.email}
                  connectedAt={accountDetail?.createdAt}
                  onClose={() => setDropdownOpen(false)}
                  onDisconnectClick={() => setShowDisconnectDialog(true)}
                />
              )}
            </div>
          ) : (
            <button
              type="button"
              disabled={isStartingOAuth}
              onClick={() => void handleConnect()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                height: 32,
                padding: '0 var(--space-3)',
                background: 'var(--color-amber-glow)',
                border: '1px solid color-mix(in srgb, var(--color-amber-500) 40%, transparent)',
                borderRadius: 'var(--radius-full)',
                cursor: isStartingOAuth ? 'default' : 'pointer',
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                color: 'var(--color-amber-500)',
                transition: 'opacity var(--duration-base) var(--ease-standard)',
                opacity: isStartingOAuth ? 0.7 : 1,
                whiteSpace: 'nowrap',
              }}
            >
              {isStartingOAuth ? (
                <Loader2 size={12} className="animate-spin" aria-hidden style={{ flexShrink: 0 }} />
              ) : (
                <Youtube size={12} aria-hidden style={{ flexShrink: 0 }} />
              )}
              Connect YouTube
            </button>
          )}
        </div>
      </header>

      {/* Disconnect confirm dialog  -  rendered outside header to avoid stacking context issues */}
      <DisconnectConfirmDialog
        open={showDisconnectDialog}
        onClose={() => setShowDisconnectDialog(false)}
        onConfirm={() => void handleDisconnectConfirm()}
        isPending={disconnectMutation.isPending}
      />
    </>
  )
}
