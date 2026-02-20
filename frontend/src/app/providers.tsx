import { QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import { ErrorBoundary } from 'react-error-boundary'

import { ErrorState } from '@/components/common/ErrorState'
import { Toaster } from '@/components/ui/sonner'

import { queryClient } from './queryClient'

interface ProvidersProps {
  children: ReactNode
}

function GlobalErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="p-4">
      <ErrorState
        title="Something broke"
        description={error.message}
        onAction={resetErrorBoundary}
        actionLabel="Try again"
      />
    </div>
  )
}

export function Providers({ children }: ProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary FallbackComponent={GlobalErrorFallback}>{children}</ErrorBoundary>
      <Toaster />
    </QueryClientProvider>
  )
}
