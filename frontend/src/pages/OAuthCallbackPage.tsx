import { useSearchParams } from 'react-router-dom'
import { CheckCircle2, XCircle } from 'lucide-react'

// This page is the browser landing point after Google's OAuth redirect.
// The backend exchanges the code, stores the token, then sends the browser
// here with ?connected=true|false[&message=...].
//
// Because this opens in a new tab (window.open from Sidebar), we just show
// a clean result screen. The original tab's useAccountStatus() refetchInterval
// picks up the new connection within 30 seconds automatically.

/**
 * Maps raw backend OAuth error strings to user-facing copy.
 * The backend may return Java exception messages, URL-encoded stack traces,
 * or internal state strings  -  none of which should reach the user verbatim.
 */
function humanizeOAuthError(raw: string | null): string {
  if (!raw) return 'Something went wrong. Please try again from the app.'
  const lower = raw.toLowerCase()
  if (lower.includes('state') && (lower.includes('mismatch') || lower.includes('invalid')))
    return 'Sign-in session expired or was opened in a different browser tab. Please try again.'
  if (lower.includes('access_denied') || lower.includes('access denied'))
    return 'YouTube access was denied. Make sure to allow the requested permissions and try again.'
  if (lower.includes('token') && lower.includes('exchange'))
    return 'Could not complete the sign-in with YouTube. Please try again.'
  if (lower.includes('scope'))
    return 'Insufficient permissions granted. Please reconnect and allow all requested access.'
  if (lower.includes('already connected')) return 'This YouTube account is already connected.'
  // Suppress anything that looks like a Java exception or stack trace
  if (lower.includes('exception') || lower.includes('at com.') || lower.includes('\tat '))
    return 'An unexpected error occurred. Please try again.'
  // If the raw message is short and non-technical, pass it through
  if (raw.length <= 120 && !raw.includes('\n')) return raw
  return 'An unexpected error occurred. Please try again.'
}

export default function OAuthCallbackPage() {
  const [params] = useSearchParams()
  const connected = params.get('connected') === 'true'
  const message = humanizeOAuthError(params.get('message'))

  const pageStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'var(--color-surface-0)',
    padding: 'var(--space-8)',
    gap: 'var(--space-4)',
    textAlign: 'center',
  }

  const headingStyle: React.CSSProperties = {
    fontFamily: 'var(--font-display)',
    fontSize: 'var(--text-2xl)',
    fontWeight: 700,
    color: 'var(--color-text-primary)',
    margin: 0,
  }

  const bodyStyle: React.CSSProperties = {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-text-secondary)',
    maxWidth: '360px',
    lineHeight: 'var(--leading-relaxed)',
    margin: 0,
  }

  const closeBtn: React.CSSProperties = {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    fontWeight: 600,
    border: 'none',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-2) var(--space-5)',
    cursor: 'pointer',
  }

  if (connected) {
    return (
      <div style={pageStyle}>
        <CheckCircle2 size={48} aria-hidden style={{ color: 'var(--color-up)', flexShrink: 0 }} />
        <h1 style={headingStyle}>YouTube connected</h1>
        <p style={bodyStyle}>
          Your YouTube account is linked. Switch back to SocialLens - your connection status will
          update automatically.
        </p>
        <button
          type="button"
          onClick={() => window.close()}
          style={{
            ...closeBtn,
            background: 'var(--accent)',
            color: 'var(--color-text-inverse)',
          }}
        >
          Close tab
        </button>
      </div>
    )
  }

  return (
    <div style={pageStyle}>
      <XCircle size={48} aria-hidden style={{ color: 'var(--color-down)', flexShrink: 0 }} />
      <h1 style={headingStyle}>Connection failed</h1>
      <p style={bodyStyle}>{message}</p>
      <button
        type="button"
        onClick={() => window.close()}
        style={{
          ...closeBtn,
          background: 'var(--color-surface-2)',
          color: 'var(--color-text-secondary)',
          border: '1px solid var(--color-border-base)',
        }}
      >
        Close tab
      </button>
    </div>
  )
}
