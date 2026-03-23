import { useMutation } from '@tanstack/react-query'
import { diagnoseRetention, type RetentionDiagnosisRequest } from './api'

export function useRetentionDiagnosis() {
  return useMutation({
    mutationFn: (req: RetentionDiagnosisRequest) => diagnoseRetention(req),
  })
}
