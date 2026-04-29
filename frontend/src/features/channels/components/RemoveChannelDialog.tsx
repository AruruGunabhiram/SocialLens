import { useEffect, useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import type { ChannelItem } from '@/api/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toastSuccess } from '@/lib/toast'
import { useDeleteChannelMutation } from '../queries'

interface RemoveChannelDialogProps {
  channel: Pick<ChannelItem, 'id' | 'title' | 'channelId'>
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function RemoveChannelDialog({
  channel,
  open,
  onOpenChange,
  onSuccess,
}: RemoveChannelDialogProps) {
  const [countdown, setCountdown] = useState(3)
  const deleteMutation = useDeleteChannelMutation()

  useEffect(() => {
    if (!open) {
      setCountdown(3)
      return
    }
    if (countdown === 0) return
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [open, countdown])

  const handleRemove = async () => {
    await deleteMutation.mutateAsync({ channelDbId: channel.id })
    toastSuccess('Channel removed', `${channel.title ?? channel.channelId} has been removed.`)
    onOpenChange(false)
    onSuccess?.()
  }

  const channelName = channel.title ?? channel.channelId

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove {channelName}?</DialogTitle>
          <DialogDescription>
            This will delete all stored data including snapshots and indexed videos. This cannot be
            undone.
          </DialogDescription>
        </DialogHeader>

        <div
          className="flex gap-3 justify-end"
          style={{ marginTop: 'var(--space-5)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--color-border-subtle)' }}
        >
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            style={{
              padding: 'var(--space-2) var(--space-4)',
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border-base)',
              borderRadius: 'var(--radius-md)',
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-sm)',
              fontWeight: 500,
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-3, var(--color-surface-2))')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-surface-2)')}
          >
            Keep Channel
          </button>

          <button
            type="button"
            disabled={countdown > 0 || deleteMutation.isPending}
            onClick={handleRemove}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              padding: 'var(--space-2) var(--space-4)',
              background: countdown > 0 || deleteMutation.isPending
                ? 'color-mix(in srgb, var(--color-down) 15%, var(--color-surface-1))'
                : 'var(--color-down)',
              border: '1px solid color-mix(in srgb, var(--color-down) 50%, transparent)',
              borderRadius: 'var(--radius-md)',
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
              color: countdown > 0 || deleteMutation.isPending
                ? 'color-mix(in srgb, var(--color-down) 60%, var(--color-text-muted))'
                : '#fff',
              cursor: countdown > 0 || deleteMutation.isPending ? 'default' : 'pointer',
              opacity: deleteMutation.isPending ? 0.7 : 1,
              transition: 'all var(--duration-base) var(--ease-standard)',
            }}
          >
            {deleteMutation.isPending ? (
              <Loader2 size={13} className="animate-spin" aria-hidden />
            ) : (
              <Trash2 size={13} aria-hidden />
            )}
            {countdown > 0
              ? `Remove Channel (${countdown})`
              : deleteMutation.isPending
                ? 'Removing...'
                : 'Remove Channel'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
