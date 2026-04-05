import { Bot } from 'lucide-react'

function CopilotPage() {
  return (
    <div
      className="flex flex-col items-center justify-center"
      style={{ minHeight: '60vh', gap: 'var(--space-4)' }}
    >
      <Bot size={40} style={{ color: 'var(--color-text-muted)' }} aria-hidden />
      <div className="text-center" style={{ maxWidth: 400 }}>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-xl)',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            marginBottom: 'var(--space-2)',
          }}
        >
          Copilot
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-base)',
            color: 'var(--color-text-secondary)',
            lineHeight: 'var(--leading-relaxed)',
          }}
        >
          AI-powered creator intelligence is coming soon. Connect your YouTube account to unlock
          retention diagnosis and personalized growth recommendations.
        </p>
      </div>
    </div>
  )
}

export default CopilotPage
