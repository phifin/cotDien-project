import type { MonthlyReportPayload, ReportPeriod } from './types.js'

export interface SubmissionRecordMetadata {
  /** Unique database ID for the submission */
  id: string
  /** Timestamp when the PC committed the report */
  submittedAt: string // ISO8601
  pcCode: string
  pcName: string
  reportYear: number
  reportMonth: number
  /** Tracking status */
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED'
}

export interface ParsedSubmissionEntry {
  /** Source attribution and database metadata */
  meta: SubmissionRecordMetadata
  /** Canonical JSON payload */
  data: MonthlyReportPayload
}

export interface MergedMonthlySummary {
  totalRevenuePlan: number
  totalRevenueActual: number
  totalClosingBalance: number
  totalPoleCount: number
  totalDebtAging: number
}

/**
 * The unified output of the merge engine.
 * Suitable for UI table rendering (entries), stats cards (summary),
 * and client-side filtering workflows.
 */
export interface MergedMonthlyDataset {
  /** The target period this dataset represents */
  period: ReportPeriod

  /** Raw preserved rows for granular preview and filtering by PC / Partner */
  entries: ParsedSubmissionEntry[]

  /** Top-level statistics calculated during the merge */
  summary: MergedMonthlySummary
}

/**
 * Merge Engine Strategy:
 * 1. Takes all raw submissions.
 * 2. Filters them to ensure they strictly belong to the requested period.
 * 3. Preserves the full submission (attribution + data) inside `entries` so the UI
 *    can build sortable/filterable tables without losing PC context.
 * 4. Walks the data exactly once to compute a `summary` aggregate block
 *    used for dashboard high-level statistics.
 *
 * Target Rules:
 *  - js-combine-iterations: Aggregates multiple nested values in a single loop pass.
 */
export function mergeMonthlySubmissions(
  period: ReportPeriod,
  submissions: ParsedSubmissionEntry[],
): MergedMonthlyDataset {
  // 1. Isolate entries strictly for the requested period 
  // (js-filter-map optimization: normally we'd filter then map, but here we just filter)
  const validEntries = submissions.filter((s) => s.meta.reportYear === period.year && s.meta.reportMonth === period.month)

  const summary: MergedMonthlySummary = {
    totalRevenuePlan: 0,
    totalRevenueActual: 0,
    totalClosingBalance: 0,
    totalPoleCount: 0,
    totalDebtAging: 0,
  }

  // 2. Compute aggregate statistics (O(N) single pass over valid records)
  for (const entry of validEntries) {
    const d = entry.data

    summary.totalRevenuePlan += d.general.doanh_thu_ke_hoach_nam
    summary.totalRevenueActual += d.revenue_result.doanh_thu_thuc_hien_nam
    summary.totalClosingBalance += d.execution.closing_balance
    summary.totalPoleCount += d.pole_quantities.duoi_8_5m
      + d.pole_quantities.tu_8_5_den_10_5m
      + d.pole_quantities.tu_10_5_den_12_5m
      + d.pole_quantities.tren_12_5m
    summary.totalDebtAging += d.debt_analysis.duoi_6_thang
      + d.debt_analysis.tu_6_den_duoi_12_thang
      + d.debt_analysis.tu_12_den_duoi_24_thang
      + d.debt_analysis.tu_24_den_duoi_36_thang
      + d.debt_analysis.tren_36_thang
  }

  return {
    period,
    entries: validEntries,
    summary,
  }
}
