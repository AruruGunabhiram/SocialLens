import { Info } from 'lucide-react'

import { cn } from '@/lib/utils'

type InfoTooltipProps = {
  text: string
  className?: string
}

export function InfoTooltip({ text, className }: InfoTooltipProps) {
  return (
    <span className={cn('group relative inline-flex items-center', className)}>
      <Info className="h-3.5 w-3.5 cursor-help text-muted-foreground/60" aria-hidden="true" />
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 w-56 -translate-x-1/2 rounded-md border bg-popover px-3 py-2 text-left text-xs text-popover-foreground shadow-md opacity-0 transition-opacity duration-150 group-hover:opacity-100"
      >
        {text}
      </span>
    </span>
  )
}
