import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowUp, Bot, ChevronDown, Sparkles } from 'lucide-react'

import {
  useChannelAnalyticsByIdQuery,
  useChannelsQuery,
  useVideosQuery,
} from '@/features/channels/queries'
import { ChannelAvatar } from '@/components/common/ChannelAvatar'
import { formatCount, formatDate, formatSubscriberCount } from '@/utils/formatters'
import type { ChannelAnalytics, ChannelItem, VideoRow } from '@/api/types'

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = 'user' | 'assistant'
type Message = { role: Role; content: string }

// ─── Anthropic streaming ──────────────────────────────────────────────────────

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-haiku-4-5-20251001'

function getApiKey(): string {
  return (import.meta as { env: Record<string, string> }).env.VITE_ANTHROPIC_API_KEY ?? ''
}

function buildSystemPrompt(
  channel: ChannelItem,
  analytics: ChannelAnalytics,
  topVideos: VideoRow[],
  bottomVideos: VideoRow[]
): string {
  const snapshots = [...(analytics.timeseries ?? [])]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5)

  return `You are SocialLens Copilot, an analytics assistant for YouTube creators. Answer questions about this channel's performance clearly and concisely. Ground all answers in the data provided. If data is unavailable, say so.

CHANNEL:
- Name: ${channel.title ?? 'Unknown'}
- Handle: ${channel.handle ?? 'N/A'}
- Subscribers: ${analytics.subscriberCount?.toLocaleString() ?? 'N/A'}
- Total Views: ${analytics.totalViews?.toLocaleString() ?? 'N/A'}
- Videos on YouTube: ${analytics.videoCount ?? 'N/A'}
- Channel since: ${channel.publishedAt ? formatDate(channel.publishedAt) : 'N/A'}

RECENT SNAPSHOTS (newest first):
${snapshots.length > 0 ? snapshots.map((s) => `- ${s.date}: ${s.views?.toLocaleString() ?? '—'} views, ${s.subscribers?.toLocaleString() ?? '—'} subscribers`).join('\n') : '- No snapshot data yet'}

TOP 10 VIDEOS BY VIEWS:
${topVideos.length > 0 ? topVideos.map((v, i) => `${i + 1}. "${v.title ?? v.videoId}" — ${v.viewCount?.toLocaleString() ?? '?'} views (published ${v.publishedAt?.slice(0, 10) ?? 'N/A'})`).join('\n') : '- No video data yet'}

LOWEST 5 VIDEOS BY VIEWS:
${bottomVideos.length > 0 ? bottomVideos.map((v, i) => `${i + 1}. "${v.title ?? v.videoId}" — ${v.viewCount?.toLocaleString() ?? '?'} views`).join('\n') : '- No video data yet'}`
}

async function streamClaude(
  apiKey: string,
  systemPrompt: string,
  messages: Message[],
  onToken: (token: string) => void,
  signal: AbortSignal
): Promise<string> {
  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      stream: true,
      system: systemPrompt,
      messages,
    }),
    signal,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Anthropic API error ${res.status}: ${text.slice(0, 200)}`)
  }

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let accumulated = ''

  let done = false
  while (!done) {
    const result = await reader.read()
    done = result.done
    if (done) break
    const value = result.value
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const payload = line.slice(6).trim()
      if (payload === '[DONE]') continue
      try {
        const evt = JSON.parse(payload) as {
          type: string
          delta?: { type: string; text: string }
        }
        if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
          accumulated += evt.delta.text
          onToken(accumulated)
        }
      } catch {
        // malformed SSE chunk — skip
      }
    }
  }

  return accumulated
}

// ─── Shared token styles ──────────────────────────────────────────────────────

const muted: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: 'var(--text-sm)',
  color: 'var(--color-text-muted)',
}

// ─── TypingDots ───────────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="flex items-center gap-1" style={{ padding: 'var(--space-3) 0' }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--color-text-muted)',
            display: 'inline-block',
            animation: `copilot-bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes copilot-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

// ─── MessageBubble ────────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'
  return (
    <div
      className="flex"
      style={{ justifyContent: isUser ? 'flex-end' : 'flex-start', gap: 'var(--space-2)' }}
    >
      {!isUser && (
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: '50%',
            background: 'color-mix(in srgb, var(--accent) 15%, var(--color-surface-2))',
            border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            marginTop: 2,
          }}
        >
          <Sparkles size={12} style={{ color: 'var(--accent)' }} aria-hidden />
        </div>
      )}
      <div
        style={{
          maxWidth: '80%',
          padding: 'var(--space-3) var(--space-4)',
          borderRadius: isUser
            ? 'var(--radius-lg) var(--radius-lg) var(--radius-sm) var(--radius-lg)'
            : 'var(--radius-lg) var(--radius-lg) var(--radius-lg) var(--radius-sm)',
          background: isUser ? 'var(--accent)' : 'var(--color-surface-2)',
          color: isUser ? 'var(--color-text-inverse)' : 'var(--color-text-primary)',
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-sm)',
          lineHeight: 'var(--leading-relaxed)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {msg.content}
      </div>
    </div>
  )
}

// ─── SuggestedQuestions ───────────────────────────────────────────────────────

const SUGGESTED = [
  'Which video has the most views?',
  'What is the average views per video?',
  'How often does this channel upload?',
  'Is this channel growing or declining?',
  'Which videos are underperforming?',
]

function SuggestedQuestions({ onPick }: { onPick: (q: string) => void }) {
  return (
    <div
      className="flex flex-col items-center"
      style={{ padding: 'var(--space-8) var(--space-4)', gap: 'var(--space-4)' }}
    >
      <div className="text-center" style={{ gap: 'var(--space-2)' }}>
        <Sparkles
          size={24}
          style={{ color: 'var(--accent)', margin: '0 auto var(--space-2)' }}
          aria-hidden
        />
        <p
          style={{ ...muted, color: 'var(--color-text-secondary)', marginBottom: 'var(--space-1)' }}
        >
          Ask anything about this channel
        </p>
        <p style={muted}>or try a suggested question:</p>
      </div>
      <div className="flex flex-col gap-2 w-full" style={{ maxWidth: 420 }}>
        {SUGGESTED.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => onPick(q)}
            style={{
              textAlign: 'left' as const,
              padding: 'var(--space-2) var(--space-3)',
              background: 'var(--color-surface-1)',
              border: '1px solid var(--color-border-base)',
              borderRadius: 'var(--radius-md)',
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
              transition: 'border-color var(--duration-base), color var(--duration-base)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent)'
              e.currentTarget.style.color = 'var(--color-text-primary)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border-base)'
              e.currentTarget.style.color = 'var(--color-text-secondary)'
            }}
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── ChannelDropdown ──────────────────────────────────────────────────────────

function ChannelDropdown({
  channels,
  selectedId,
  onChange,
}: {
  channels: ChannelItem[] | undefined
  selectedId: number | undefined
  onChange: (id: number | undefined) => void
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [open])

  const selected = channels?.find((c) => c.id === selectedId)

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          width: '100%',
          padding: 'var(--space-2) var(--space-3)',
          background: 'var(--color-surface-1)',
          border: `1px solid ${open ? 'var(--color-border-strong)' : 'var(--color-border-base)'}`,
          borderRadius: 'var(--radius-md)',
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-sm)',
          color: selected ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'border-color var(--duration-base)',
        }}
      >
        {selected ? (
          <ChannelAvatar
            size="sm"
            thumbnailUrl={selected.thumbnailUrl}
            channelName={selected.title ?? selected.channelId}
          />
        ) : (
          <div
            aria-hidden
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'var(--color-surface-3)',
              flexShrink: 0,
            }}
          />
        )}
        <span className="flex-1 truncate">
          {selected ? (selected.title ?? selected.channelId) : 'Select a channel…'}
        </span>
        <ChevronDown
          size={14}
          aria-hidden
          style={{
            color: 'var(--color-text-muted)',
            flexShrink: 0,
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform var(--duration-base)',
          }}
        />
      </button>

      {/* Dropdown list */}
      {open && channels && channels.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border-base)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-md)',
            zIndex: 50,
            maxHeight: 240,
            overflowY: 'auto',
          }}
        >
          {channels.map((ch) => (
            <button
              key={ch.id}
              type="button"
              onClick={() => {
                onChange(ch.id)
                setOpen(false)
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                width: '100%',
                padding: 'var(--space-2) var(--space-3)',
                background: ch.id === selectedId ? 'var(--color-surface-3)' : 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--color-border-subtle)',
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-sm)',
                color:
                  ch.id === selectedId
                    ? 'var(--color-text-primary)'
                    : 'var(--color-text-secondary)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background var(--duration-fast)',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background =
                  ch.id === selectedId ? 'var(--color-surface-3)' : 'var(--color-surface-1)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background =
                  ch.id === selectedId ? 'var(--color-surface-3)' : 'transparent')
              }
            >
              <ChannelAvatar
                size="sm"
                thumbnailUrl={ch.thumbnailUrl}
                channelName={ch.title ?? ch.channelId}
              />
              <span className="flex-1 truncate">{ch.title ?? ch.channelId}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── ContextPanel ─────────────────────────────────────────────────────────────

function ContextPanel({
  channels,
  selectedId,
  onChange,
  channel,
  analytics,
}: {
  channels: ChannelItem[] | undefined
  selectedId: number | undefined
  onChange: (id: number | undefined) => void
  channel: ChannelItem | undefined
  analytics: ChannelAnalytics | undefined
}) {
  const snapshotCount = (analytics?.timeseries ?? []).length

  return (
    <div
      style={{
        borderRight: '1px solid var(--color-border-subtle)',
        background: 'var(--color-surface-0)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)',
        padding: 'var(--space-5)',
        overflowY: 'auto',
      }}
    >
      <div>
        <p
          style={{
            ...muted,
            fontWeight: 600,
            color: 'var(--color-text-secondary)',
            marginBottom: 'var(--space-2)',
          }}
        >
          Channel context
        </p>
        <ChannelDropdown channels={channels} selectedId={selectedId} onChange={onChange} />
      </div>

      {channel && analytics && (
        <div className="space-y-3">
          {/* Context summary */}
          <div
            style={{
              padding: 'var(--space-3)',
              background: 'var(--color-surface-1)',
              border: '1px solid var(--color-border-base)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                color: 'var(--color-text-primary)',
                marginBottom: 'var(--space-2)',
              }}
            >
              {channel.title ?? channel.channelId}
            </p>
            {[
              { label: 'Subscribers', val: formatCount(analytics.subscriberCount) },
              { label: 'Total views', val: formatCount(analytics.totalViews) },
              { label: 'Videos', val: analytics.videoCount?.toLocaleString() ?? '—' },
              {
                label: 'Snapshots loaded',
                val: snapshotCount > 0 ? `${snapshotCount} days` : 'None',
              },
            ].map(({ label, val }) => (
              <div key={label} className="flex items-center justify-between">
                <span style={muted}>{label}</span>
                <span
                  style={{
                    ...muted,
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  {val}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CopilotPage() {
  const [searchParams] = useSearchParams()
  const paramId = searchParams.get('channelId')

  const [selectedId, setSelectedId] = useState<number | undefined>(
    paramId ? Number(paramId) : undefined
  )
  const [messages, setMessages] = useState<Message[]>([])
  const [streaming, setStreaming] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [input, setInput] = useState('')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const { data: channels } = useChannelsQuery()
  const { data: analytics } = useChannelAnalyticsByIdQuery(selectedId)
  const { data: topPage } = useVideosQuery(selectedId ?? 0, {
    page: 0,
    size: 10,
    sort: 'views',
    dir: 'desc',
  })
  const { data: bottomPage } = useVideosQuery(selectedId ?? 0, {
    page: 0,
    size: 5,
    sort: 'views',
    dir: 'asc',
  })

  const selectedChannel = channels?.find((c) => c.id === selectedId)

  // Scroll to bottom on new messages/streaming
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming])

  // Reset chat when channel changes
  useEffect(() => {
    setMessages([])
    setStreaming('')
    setError(null)
  }, [selectedId])

  const apiKey = getApiKey()
  const hasContext = Boolean(selectedId && analytics && topPage)

  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || isStreaming || !hasContext) return

    setInput('')
    setError(null)

    const newMsg: Message = { role: 'user', content: trimmed }
    const nextMessages = [...messages, newMsg]
    setMessages(nextMessages)
    setIsStreaming(true)
    setStreaming('')

    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    try {
      if (!apiKey) throw new Error('VITE_ANTHROPIC_API_KEY is not set. Add it to your .env file.')

      const systemPrompt = buildSystemPrompt(
        selectedChannel!,
        analytics!,
        topPage?.items ?? [],
        bottomPage?.items ?? []
      )

      const finalText = await streamClaude(
        apiKey,
        systemPrompt,
        nextMessages,
        (partial) => setStreaming(partial),
        ctrl.signal
      )

      setMessages((prev) => [...prev, { role: 'assistant', content: finalText }])
    } catch (err) {
      if ((err as { name?: string }).name === 'AbortError') return
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setError(msg)
    } finally {
      setStreaming('')
      setIsStreaming(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void send(input)
    }
  }

  const showEmpty = messages.length === 0 && !isStreaming && hasContext
  const showNoChannel = !selectedId

  return (
    <div
      style={{
        height: 'calc(100vh - var(--header-height, 56px))',
        display: 'grid',
        gridTemplateColumns: '260px 1fr',
        gridTemplateRows: '1fr',
        overflow: 'hidden',
      }}
      className="lg:grid hidden-mobile"
    >
      {/* ── Left panel ── */}
      <ContextPanel
        channels={channels}
        selectedId={selectedId}
        onChange={(id) => setSelectedId(id)}
        channel={selectedChannel}
        analytics={analytics}
      />

      {/* ── Right panel: chat ── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--color-canvas)',
          overflow: 'hidden',
        }}
      >
        {/* Chat header */}
        <div
          style={{
            padding: 'var(--space-3) var(--space-5)',
            borderBottom: '1px solid var(--color-border-subtle)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            background: 'var(--color-surface-0)',
            flexShrink: 0,
          }}
        >
          <Bot size={16} style={{ color: 'var(--accent)' }} aria-hidden />
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
            }}
          >
            Copilot
          </span>
          {selectedChannel && (
            <span style={{ ...muted, fontSize: '11px' }}>
              · {selectedChannel.title ?? selectedChannel.channelId}
              {analytics?.subscriberCount != null &&
                ` · ${formatSubscriberCount(analytics.subscriberCount)}`}
              {(analytics?.timeseries?.length ?? 0) > 0 &&
                ` · ${analytics!.timeseries!.length} days of data`}
            </span>
          )}
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-5)' }}>
          {showNoChannel ? (
            <div
              className="flex flex-col items-center justify-center"
              style={{ height: '100%', gap: 'var(--space-4)' }}
            >
              <Bot size={36} style={{ color: 'var(--color-text-muted)' }} aria-hidden />
              <p style={muted}>Select a channel on the left to start asking questions.</p>
            </div>
          ) : showEmpty ? (
            <SuggestedQuestions onPick={(q) => void send(q)} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {messages.map((m, i) => (
                <MessageBubble key={i} msg={m} />
              ))}
              {isStreaming && streaming && (
                <MessageBubble msg={{ role: 'assistant', content: streaming }} />
              )}
              {isStreaming && !streaming && <TypingDots />}
              {error && (
                <div
                  style={{
                    padding: 'var(--space-3) var(--space-4)',
                    background: 'color-mix(in srgb, var(--color-down) 8%, var(--color-surface-1))',
                    border: '1px solid color-mix(in srgb, var(--color-down) 30%, transparent)',
                    borderRadius: 'var(--radius-md)',
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--color-down)',
                  }}
                >
                  {error}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div
          style={{
            padding: 'var(--space-3) var(--space-5) var(--space-5)',
            borderTop: '1px solid var(--color-border-subtle)',
            background: 'var(--color-surface-0)',
            flexShrink: 0,
          }}
        >
          {!apiKey && (
            <p
              style={{
                ...muted,
                marginBottom: 'var(--space-2)',
                color: 'var(--color-warn)',
                fontSize: '11px',
              }}
            >
              Add <code style={{ fontFamily: 'var(--font-mono)' }}>VITE_ANTHROPIC_API_KEY</code> to
              your <code style={{ fontFamily: 'var(--font-mono)' }}>.env</code> file to enable the
              chat.
            </p>
          )}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: 'var(--space-2)',
              padding: 'var(--space-2)',
              background: 'var(--color-surface-1)',
              border: `1px solid ${hasContext && apiKey ? 'var(--color-border-base)' : 'var(--color-border-subtle)'}`,
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                !selectedId
                  ? 'Select a channel to start…'
                  : !apiKey
                    ? 'API key required…'
                    : 'Ask anything about this channel…'
              }
              disabled={!hasContext || !apiKey || isStreaming}
              rows={1}
              style={{
                flex: 1,
                resize: 'none',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-sm)',
                color: 'var(--color-text-primary)',
                lineHeight: 'var(--leading-relaxed)',
                maxHeight: 120,
                overflowY: 'auto',
              }}
            />
            <button
              type="button"
              disabled={!input.trim() || !hasContext || !apiKey || isStreaming}
              onClick={() => void send(input)}
              style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-md)',
                background:
                  input.trim() && hasContext && apiKey && !isStreaming
                    ? 'var(--accent)'
                    : 'var(--color-surface-2)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor:
                  input.trim() && hasContext && apiKey && !isStreaming ? 'pointer' : 'default',
                flexShrink: 0,
                transition: 'background var(--duration-base)',
              }}
              aria-label="Send message"
            >
              <ArrowUp
                size={15}
                style={{
                  color:
                    input.trim() && hasContext && apiKey && !isStreaming
                      ? 'var(--color-text-inverse)'
                      : 'var(--color-text-muted)',
                }}
                aria-hidden
              />
            </button>
          </div>
          <p
            style={{
              ...muted,
              fontSize: '11px',
              marginTop: 'var(--space-1)',
              textAlign: 'center' as const,
            }}
          >
            Press Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  )
}
