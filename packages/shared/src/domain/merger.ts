import type { MonthlyReportPayload, ReportPeriod } from './types.js'

export interface SubmissionRecordMetadata {
  /** Unique database ID for the submission */
  id: string
  /** Timestamp when the PC committed the report */
  submittedAt: string // ISO8601
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
  totalExpectedRevenue: number
  totalActualCollected: number
  totalOverdueDebt: number
  totalDebt: number
  totalPoles: number

  /**
   * Execution data is year-keyed in the payload.
   * This object dynamically aggregates planned/actual sums for whichever years
   * are present across all submissions in this month.
   */
  executionAggregates: Record<
    string,
    {
      totalPlanned: number
      totalActual: number
    }
  >
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
  const validEntries = submissions.filter(
    (s) => s.data.period.year === period.year && s.data.period.month === period.month,
  )

  const summary: MergedMonthlySummary = {
    totalExpectedRevenue: 0,
    totalActualCollected: 0,
    totalOverdueDebt: 0,
    totalDebt: 0,
    totalPoles: 0,
    executionAggregates: {},
  }

  // 2. Compute aggregate statistics (O(N) single pass over valid records)
  for (const entry of validEntries) {
    const d = entry.data

    summary.totalExpectedRevenue += d.revenueResult.expectedRevenue
    summary.totalActualCollected += d.revenueResult.actualCollected
    summary.totalDebt += d.debtAnalysis.totalDebt
    summary.totalOverdueDebt += d.debtAnalysis.overdueDebt
    summary.totalPoles += d.poleQuantities.totalPoles

    // Dynamically aggregate year keys safely
    for (const [yearStr, exec] of Object.entries(d.execution)) {
      if (!summary.executionAggregates[yearStr]) {
        summary.executionAggregates[yearStr] = {
          totalPlanned: 0,
          totalActual: 0,
        }
      }

      // We explicitly bypass '!' or non-null checks since we just initialized it above safely
      const agg = summary.executionAggregates[yearStr] ?? (
        summary.executionAggregates[yearStr] = { totalPlanned: 0, totalActual: 0 }
      )
      agg.totalPlanned += exec.planned
      agg.totalActual += exec.actual
    }
  }

  return {
    period,
    entries: validEntries,
    summary,
  }
}
