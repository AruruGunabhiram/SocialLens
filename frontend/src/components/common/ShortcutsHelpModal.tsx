import { useKeyboardShortcutsContext } from '@/lib/KeyboardShortcutsContext'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

const SHORTCUTS: { action: string; shortcut: string }[] = [
  { action: 'Go to Channels', shortcut: 'g then c' },
  { action: 'Go to Insights', shortcut: 'g then i' },
  { action: 'Go to Copilot', shortcut: 'g then p' },
  { action: 'Go to Settings', shortcut: 'g then s' },
  { action: 'Focus search', shortcut: '/' },
  { action: 'Open command palette', shortcut: isMac ? '⌘K' : 'Ctrl+K' },
  { action: 'Show this help', shortcut: '?' },
  { action: 'Close modal', shortcut: 'Escape' },
]

export function ShortcutsHelpModal() {
  const { shortcutsHelpOpen, setShortcutsHelpOpen } = useKeyboardShortcutsContext()

  return (
    <Dialog open={shortcutsHelpOpen} onOpenChange={setShortcutsHelpOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>Action</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Shortcut</th>
            </tr>
          </thead>
          <tbody>
            {SHORTCUTS.map(({ action, shortcut }) => (
              <tr key={action} style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
                <td style={tdStyle}>{action}</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>
                  <KbdGroup shortcut={shortcut} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </DialogContent>
    </Dialog>
  )
}

function KbdGroup({ shortcut }: { shortcut: string }) {
  const parts = shortcut.split(' then ')
  if (parts.length > 1) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)' }}>
        {parts.map((part, i) => (
          <span
            key={i}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)' }}
          >
            <kbd style={kbdStyle}>{part}</kbd>
            {i < parts.length - 1 && (
              <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>
                then
              </span>
            )}
          </span>
        ))}
      </span>
    )
  }
  return <kbd style={kbdStyle}>{shortcut}</kbd>
}

const thStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: 'var(--text-xs)',
  fontWeight: 600,
  color: 'var(--color-text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  paddingBottom: 'var(--space-2)',
  textAlign: 'left',
}

const tdStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: 'var(--text-sm)',
  color: 'var(--color-text-secondary)',
  padding: 'var(--space-2) 0',
  verticalAlign: 'middle',
}

const kbdStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'var(--font-mono)',
  fontSize: '11px',
  color: 'var(--color-text-secondary)',
  background: 'var(--color-surface-3)',
  border: '1px solid var(--color-border-base)',
  borderRadius: 'var(--radius-sm)',
  padding: '2px 6px',
  lineHeight: 1.4,
  minWidth: 20,
}
