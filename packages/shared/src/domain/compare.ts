import type { MergedMonthlyDataset } from './merger.js'
import { buildStatsModel, type DashboardStats, type PartnerDebtStats } from './stats.js'

/**
 * Core semantic difference model.
 * Easily renderable in UI (e.g. conditional green/red arrows).
 */
export interface NumericDiff {
  valueA: number
  valueB: number
  /** valueB - valueA (Change relative to A) */
  delta: number
  /**
   * If true: Increase is "good" (e.g. Revenue)
   * If false: Increase is "bad" (e.g. Debt)
   */
  isPositiveTrend: boolean
}

/**
 * Calculates semantic diff safely.
 * @param invertTrend If true, an increase in delta is flagged as a negative trend (useful for debts/overdue).
 */
export function calcNumericDiff(a: number, b: number, invertTrend = false): NumericDiff {
  const delta = b - a
  // if invertTrend is false: delta >= 0 is a positive trend
  // if invertTrend is true: delta <= 0 is a positive trend
  const isPositiveTrend = invertTrend ? delta <= 0 : delta >= 0

  return {
    valueA: a,
    valueB: b,
    delta,
    isPositiveTrend,
  }
}

function comparePartnerDebtStats(a: PartnerDebtStats, b: PartnerDebtStats) {
  return {
    totalRevenue: calcNumericDiff(a.totalRevenue, b.totalRevenue),
    totalDebt: calcNumericDiff(a.totalDebt, b.totalDebt, true),
    agingBuckets: {
      below6Months: calcNumericDiff(a.agingBuckets.below6Months, b.agingBuckets.below6Months, true),
      above36Months: calcNumericDiff(a.agingBuckets.above36Months, b.agingBuckets.above36Months, true),
    },
  }
}

/**
 * Computes a macro-level semantic difference between two merged datasets.
 * It intentionally compares the `DashboardStats` projection rather than raw JSON serialization,
 * providing the dashboard with explicit business-relevant deltas immediately ready for rendering.
 */
export function compareMergedDatasets(
  datasetA: MergedMonthlyDataset,
  datasetB: MergedMonthlyDataset,
) {
  const statsA = buildStatsModel(datasetA)
  const statsB = buildStatsModel(datasetB)

  return {
    revenue: {
      totalExpected: calcNumericDiff(statsA.revenue.totalExpected, statsB.revenue.totalExpected),
      totalActualCollected: calcNumericDiff(
        statsA.revenue.totalActualCollected,
        statsB.revenue.totalActualCollected,
      ),
      executionRate: calcNumericDiff(statsA.revenue.executionRate, statsB.revenue.executionRate),
      collectionRate: calcNumericDiff(statsA.revenue.collectionRate, statsB.revenue.collectionRate),
      byMajorPartner: {
        FPT: calcNumericDiff(statsA.revenue.byMajorPartner.FPT, statsB.revenue.byMajorPartner.FPT),
        VNPT: calcNumericDiff(
          statsA.revenue.byMajorPartner.VNPT,
          statsB.revenue.byMajorPartner.VNPT,
        ),
        MOBI: calcNumericDiff(
          statsA.revenue.byMajorPartner.MOBI,
          statsB.revenue.byMajorPartner.MOBI,
        ),
        VTVCAB: calcNumericDiff(
          statsA.revenue.byMajorPartner.VTVCAB,
          statsB.revenue.byMajorPartner.VTVCAB,
        ),
        SCTV: calcNumericDiff(
          statsA.revenue.byMajorPartner.SCTV,
          statsB.revenue.byMajorPartner.SCTV,
        ),
      },
    },
    poles: {
      total: calcNumericDiff(statsA.poles.total, statsB.poles.total),
      buckets: {
        below8_5m: calcNumericDiff(statsA.poles.buckets.below8_5m, statsB.poles.buckets.below8_5m),
        above12_5m: calcNumericDiff(
          statsA.poles.buckets.above12_5m,
          statsB.poles.buckets.above12_5m,
        ), // Showing extremes
      },
    },
    debt: {
      // Invert trend flag: Increase in debt is a BAD trend (isPositiveTrend = false)
      total: calcNumericDiff(statsA.debt.total, statsB.debt.total, true),
      agingBuckets: {
        below6Months: calcNumericDiff(
          statsA.debt.agingBuckets.below6Months,
          statsB.debt.agingBuckets.below6Months,
          true,
        ),
        from6To12Months: calcNumericDiff(
          statsA.debt.agingBuckets.from6To12Months,
          statsB.debt.agingBuckets.from6To12Months,
          true,
        ),
        from12To24Months: calcNumericDiff(
          statsA.debt.agingBuckets.from12To24Months,
          statsB.debt.agingBuckets.from12To24Months,
          true,
        ),
        from24To36Months: calcNumericDiff(
          statsA.debt.agingBuckets.from24To36Months,
          statsB.debt.agingBuckets.from24To36Months,
          true,
        ),
        above36Months: calcNumericDiff(
          statsA.debt.agingBuckets.above36Months,
          statsB.debt.agingBuckets.above36Months,
          true,
        ),
      },
    },
    difficultPartners: {
      VTVCAB: comparePartnerDebtStats(statsA.difficultPartners.VTVCAB, statsB.difficultPartners.VTVCAB),
      SCTV: comparePartnerDebtStats(statsA.difficultPartners.SCTV, statsB.difficultPartners.SCTV),
    },
  }
}
