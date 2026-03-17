import { motion } from 'framer-motion'

const PANEL_SPRING: [number, number, number, number] = [0.32, 0.72, 0, 1]

const insightItems = [
  { text: 'Your last 3 uploads averaged 18% above channel median.', metric: '+18%' },
  { text: 'Engagement rate peaked on Thursday uploads this quarter.', metric: 'Thu' },
  { text: 'Watch time is trending up over the past 14 days.', metric: '14d' },
]

const actionLabels = ['Summarize last 7 days', 'Best upload time', 'Suggest video topic', 'Audience breakdown']

function SectionLabel({ children }: { children: string }) {
  return (
    <h2
      style={{
        fontFamily: 'var(--font-body)',
        fontSize: 'var(--text-xs)',
        fontWeight: 500,
        letterSpacing: 'var(--tracking-widest)',
        color: 'var(--color-text-muted)',
        textTransform: 'uppercase',
        margin: '0 0 var(--space-3)',
      }}
    >
      {children}
    </h2>
  )
}

export function CopilotPanel() {
  return (
    <motion.aside
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ duration: 0.3, ease: PANEL_SPRING }}
      aria-label="AI Copilot panel"
      style={{
        position: 'fixed',
        right: 0,
        top: 'var(--header-height)',
        height: 'calc(100vh - var(--header-height))',
        width: 'var(--copilot-panel-width)',
        background: 'var(--color-surface-0)',
        borderLeft: '1px solid var(--color-border-base)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 50,
        overflow: 'hidden',
      }}
    >
      {/* ── Header ── */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--space-4) var(--space-5)',
          borderBottom: '1px solid var(--color-border-subtle)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span
            className="animate-copilot-breathe"
            aria-hidden="true"
            style={{
              display: 'block',
              width: 8,
              height: 8,
              borderRadius: 'var(--radius-full)',
              background: 'var(--color-blue-500)',
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-xs)',
              fontWeight: 500,
              letterSpacing: 'var(--tracking-widest)',
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
            }}
          >
            AI Copilot
          </span>
        </div>

        {/* Model badge */}
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-xs)',
            fontWeight: 500,
            letterSpacing: 'var(--tracking-widest)',
            textTransform: 'uppercase',
            color: 'var(--color-blue-400)',
            background: 'var(--color-blue-glow)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: 'var(--radius-full)',
            padding: '2px 8px',
          }}
        >
          BETA
        </span>
      </header>

      {/* ── Scrollable body ── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 'var(--space-5)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-6)',
        }}
      >
        {/* Insights */}
        <section>
          <SectionLabel>Insights</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {insightItems.map((item) => (
              <div
                key={item.metric}
                style={{
                  background: 'var(--color-surface-2)',
                  borderLeft: '3px solid var(--color-amber-500)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-3) var(--space-4)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-2)',
                }}
              >
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--color-text-primary)',
                    lineHeight: 'var(--leading-relaxed)',
                    margin: 0,
                  }}
                >
                  {item.text}
                </p>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 500,
                    letterSpacing: 'var(--tracking-widest)',
                    textTransform: 'uppercase',
                    color: 'var(--color-amber-500)',
                    background: 'var(--color-amber-glow)',
                    border: '1px solid rgba(240, 165, 0, 0.3)',
                    borderRadius: 'var(--radius-full)',
                    padding: '2px 8px',
                    alignSelf: 'flex-start',
                  }}
                >
                  {item.metric}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Actions */}
        <section>
          <SectionLabel>Actions</SectionLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            {actionLabels.map((label) => (
              <ActionChip key={label} label={label} />
            ))}
          </div>
        </section>

        {/* Notes */}
        <section>
          <SectionLabel>Notes</SectionLabel>
          <div
            style={{
              background: 'var(--color-surface-1)',
              border: '1px solid var(--color-border-base)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-3) var(--space-4)',
              minHeight: 120,
            }}
          >
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-sm)',
                color: 'var(--color-text-muted)',
                lineHeight: 'var(--leading-relaxed)',
                margin: 0,
                fontStyle: 'italic',
              }}
            >
              Add notes here...
            </p>
          </div>
        </section>
      </div>
    </motion.aside>
  )
}

function ActionChip({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="transition-interactive"
      style={{
        fontFamily: 'var(--font-body)',
        fontSize: 'var(--text-xs)',
        fontWeight: 500,
        color: 'var(--color-text-secondary)',
        background: 'var(--color-surface-1)',
        border: '1px solid var(--color-border-base)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-2) var(--space-3)',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--color-surface-2)'
        e.currentTarget.style.borderColor = 'var(--color-border-strong)'
        e.currentTarget.style.color = 'var(--color-text-primary)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'var(--color-surface-1)'
        e.currentTarget.style.borderColor = 'var(--color-border-base)'
        e.currentTarget.style.color = 'var(--color-text-secondary)'
      }}
    >
      {label}
    </button>
  )
}
