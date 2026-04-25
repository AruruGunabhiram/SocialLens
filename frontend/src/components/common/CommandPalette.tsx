import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import {
  Bot,
  Hash,
  Lightbulb,
  Loader2,
  PlusCircle,
  RefreshCw,
  Search,
  Settings,
  Tv2,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useKeyboardShortcutsContext } from '@/lib/KeyboardShortcutsContext'
import { useChannelsQuery, channelListQueryKeys } from '@/features/channels/queries'

// ─── Types ────────────────────────────────────────────────────────────────────

type GroupKey = 'channels' | 'pages' | 'actions'

interface PaletteItem {
  id: string
  group: GroupKey
  label: string
  sublabel?: string
  icon: React.ElementType
  onSelect: () => void
}

const GROUP_LABELS: Record<GroupKey, string> = {
  channels: 'Channels',
  pages: 'Pages',
  actions: 'Actions',
}

const GROUP_ORDER: GroupKey[] = ['channels', 'pages', 'actions']

// ─── CommandPalette ───────────────────────────────────────────────────────────

export function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen } = useKeyboardShortcutsContext()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: channels = [], isLoading: channelsLoading } = useChannelsQuery(false)

  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  function close() {
    setCommandPaletteOpen(false)
  }

  function go(path: string) {
    close()
    void navigate(path)
  }

  const allItems = useMemo<PaletteItem[]>(() => {
    const channelItems: PaletteItem[] = channels.map((ch) => ({
      id: `channel-${ch.id}`,
      group: 'channels',
      label: ch.title ?? ch.handle ?? ch.channelId,
      sublabel: ch.handle ?? undefined,
      icon: Hash,
      onSelect: () => go(`/channels/${ch.id}`),
    }))

    const pageItems: PaletteItem[] = [
      {
        id: 'page-channels',
        group: 'pages',
        label: 'Channels',
        icon: Tv2,
        onSelect: () => go('/channels'),
      },
      {
        id: 'page-insights',
        group: 'pages',
        label: 'Insights',
        icon: Lightbulb,
        onSelect: () => go('/insights'),
      },
      {
        id: 'page-copilot',
        group: 'pages',
        label: 'Copilot',
        icon: Bot,
        onSelect: () => go('/copilot'),
      },
      {
        id: 'page-settings',
        group: 'pages',
        label: 'Settings',
        icon: Settings,
        onSelect: () => go('/settings'),
      },
    ]

    const actionItems: PaletteItem[] = [
      {
        id: 'action-track',
        group: 'actions',
        label: 'Track New Channel',
        icon: PlusCircle,
        onSelect: () => {
          close()
          setTimeout(() => {
            document.querySelector<HTMLInputElement>('[data-search-input]')?.focus()
          }, 50)
        },
      },
      {
        id: 'action-refresh',
        group: 'actions',
        label: 'Refresh Channel Data',
        icon: RefreshCw,
        onSelect: () => {
          void queryClient.invalidateQueries({ queryKey: channelListQueryKeys.root })
          close()
        },
      },
    ]

    return [...channelItems, ...pageItems, ...actionItems]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channels, navigate, queryClient])

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return allItems
    return allItems.filter(
      (item) =>
        item.label.toLowerCase().includes(q) || (item.sublabel?.toLowerCase().includes(q) ?? false)
    )
  }, [allItems, query])

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0)
  }, [filteredItems])

  // Focus input when opened
  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery('')
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [commandPaletteOpen])

  // Scroll active item into view
  useEffect(() => {
    const activeEl = listRef.current?.querySelector<HTMLElement>('[data-active="true"]')
    activeEl?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, filteredItems.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      filteredItems[activeIndex]?.onSelect()
    }
  }

  // Group items for rendering
  const grouped = useMemo(() => {
    const map = new Map<GroupKey, { item: PaletteItem; flatIndex: number }[]>()
    GROUP_ORDER.forEach((g) => map.set(g, []))
    filteredItems.forEach((item, flatIndex) => {
      map.get(item.group)?.push({ item, flatIndex })
    })
    return map
  }, [filteredItems])

  return (
    <DialogPrimitive.Root open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0,0,0,0.6)',
          }}
        />
        <DialogPrimitive.Content
          onKeyDown={handleKeyDown}
          aria-label="Command palette"
          style={{
            position: 'fixed',
            top: '15%',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 101,
            width: '100%',
            maxWidth: 560,
            background: 'var(--color-surface-1)',
            border: '1px solid var(--color-border-base)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '70vh',
          }}
        >
          {/* Search row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
              padding: 'var(--space-3) var(--space-4)',
              borderBottom: '1px solid var(--color-border-subtle)',
              flexShrink: 0,
            }}
          >
            <Search
              size={16}
              aria-hidden
              style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}
            />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search channels, features..."
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-base)',
                color: 'var(--color-text-primary)',
              }}
            />
            {channelsLoading && (
              <Loader2
                size={14}
                className="animate-spin"
                style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}
                aria-hidden
              />
            )}
            <kbd style={kbdStyle}>Esc</kbd>
          </div>

          {/* Results */}
          <div ref={listRef} style={{ overflowY: 'auto', padding: 'var(--space-2) 0' }}>
            {filteredItems.length === 0 ? (
              <div
                style={{
                  padding: 'var(--space-8) var(--space-4)',
                  textAlign: 'center',
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-text-muted)',
                }}
              >
                No results for &ldquo;{query}&rdquo;
              </div>
            ) : (
              GROUP_ORDER.map((group) => {
                const groupItems = grouped.get(group) ?? []
                if (groupItems.length === 0) return null
                return (
                  <div key={group}>
                    <div style={groupHeaderStyle}>{GROUP_LABELS[group]}</div>
                    {groupItems.map(({ item, flatIndex }) => {
                      const Icon = item.icon
                      const isActive = flatIndex === activeIndex
                      return (
                        <button
                          key={item.id}
                          type="button"
                          data-active={isActive}
                          onClick={item.onSelect}
                          onMouseEnter={() => setActiveIndex(flatIndex)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-3)',
                            width: '100%',
                            padding: 'var(--space-2) var(--space-4)',
                            background: isActive ? 'var(--color-surface-2)' : 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'background var(--duration-fast) var(--ease-standard)',
                          }}
                        >
                          <Icon
                            size={14}
                            aria-hidden
                            style={{
                              color: isActive ? 'var(--accent)' : 'var(--color-text-muted)',
                              flexShrink: 0,
                            }}
                          />
                          <span
                            style={{
                              fontFamily: 'var(--font-body)',
                              fontSize: 'var(--text-sm)',
                              color: 'var(--color-text-primary)',
                              flex: 1,
                            }}
                          >
                            {item.label}
                          </span>
                          {item.sublabel && (
                            <span
                              style={{
                                fontFamily: 'var(--font-body)',
                                fontSize: 'var(--text-xs)',
                                color: 'var(--color-text-muted)',
                              }}
                            >
                              {item.sublabel}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-4)',
              padding: 'var(--space-2) var(--space-4)',
              borderTop: '1px solid var(--color-border-subtle)',
              flexShrink: 0,
            }}
          >
            <FooterHint keys={['↑', '↓']} label="navigate" />
            <FooterHint keys={['↵']} label="select" />
            <FooterHint keys={['Esc']} label="close" />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const kbdStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  color: 'var(--color-text-muted)',
  background: 'var(--color-surface-3)',
  border: '1px solid var(--color-border-base)',
  borderRadius: 'var(--radius-sm)',
  padding: '2px 5px',
  lineHeight: 1.4,
  flexShrink: 0,
}

const groupHeaderStyle: React.CSSProperties = {
  padding: 'var(--space-2) var(--space-4) var(--space-1)',
  fontFamily: 'var(--font-body)',
  fontSize: '10px',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--color-text-muted)',
}

function FooterHint({ keys, label }: { keys: string[]; label: string }) {
  return (
    <span
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-1)',
        fontFamily: 'var(--font-body)',
        fontSize: 'var(--text-xs)',
        color: 'var(--color-text-muted)',
      }}
    >
      {keys.map((k) => (
        <kbd key={k} style={kbdStyle}>
          {k}
        </kbd>
      ))}
      <span style={{ marginLeft: 'var(--space-1)' }}>{label}</span>
    </span>
  )
}
