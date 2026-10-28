import { formatCertificationApplyRange } from './certificationBatch.ts'

interface NispApplyPeriod {
  apply_start: string | null
  apply_end: string | null
}

export function formatNispApplyRange(batch: NispApplyPeriod): string {
  return formatCertificationApplyRange(batch)
}
