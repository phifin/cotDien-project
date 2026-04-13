import type { MergedMonthlyDataset } from './merger.js'
import { buildStatsModel, type PartnerDebtStats } from './stats.js'

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
      duoi_6_thang: calcNumericDiff(a.agingBuckets.duoi_6_thang, b.agingBuckets.duoi_6_thang, true),
      tren_36_thang: calcNumericDiff(a.agingBuckets.tren_36_thang, b.agingBuckets.tren_36_thang, true),
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
      totalPlanned: calcNumericDiff(statsA.revenue.totalPlanned, statsB.revenue.totalPlanned),
      totalActual: calcNumericDiff(
        statsA.revenue.totalActual,
        statsB.revenue.totalActual,
      ),
      completionRate: calcNumericDiff(statsA.revenue.completionRate, statsB.revenue.completionRate),
      byMajorPartner: {
        FPT: calcNumericDiff(statsA.revenue.byMajorPartner.FPT ?? 0, statsB.revenue.byMajorPartner.FPT ?? 0),
        VNPT: calcNumericDiff(statsA.revenue.byMajorPartner.VNPT ?? 0, statsB.revenue.byMajorPartner.VNPT ?? 0),
        MOBI: calcNumericDiff(statsA.revenue.byMajorPartner.MOBI ?? 0, statsB.revenue.byMajorPartner.MOBI ?? 0),
        VTVCAB: calcNumericDiff(statsA.revenue.byMajorPartner.VTVCAB ?? 0, statsB.revenue.byMajorPartner.VTVCAB ?? 0),
        SCTV: calcNumericDiff(statsA.revenue.byMajorPartner.SCTV ?? 0, statsB.revenue.byMajorPartner.SCTV ?? 0),
      },
    },
    poles: {
      total: calcNumericDiff(statsA.poles.total, statsB.poles.total),
      buckets: {
        duoi_8_5m: calcNumericDiff(statsA.poles.buckets.duoi_8_5m, statsB.poles.buckets.duoi_8_5m),
        tren_12_5m: calcNumericDiff(statsA.poles.buckets.tren_12_5m, statsB.poles.buckets.tren_12_5m),
      },
    },
    debt: {
      // Invert trend flag: Increase in debt is a BAD trend (isPositiveTrend = false)
      total: calcNumericDiff(statsA.debt.total, statsB.debt.total, true),
      agingBuckets: {
        duoi_6_thang: calcNumericDiff(
          statsA.debt.agingBuckets.duoi_6_thang,
          statsB.debt.agingBuckets.duoi_6_thang,
          true,
        ),
        tu_6_den_duoi_12_thang: calcNumericDiff(
          statsA.debt.agingBuckets.tu_6_den_duoi_12_thang,
          statsB.debt.agingBuckets.tu_6_den_duoi_12_thang,
          true,
        ),
        tu_12_den_duoi_24_thang: calcNumericDiff(
          statsA.debt.agingBuckets.tu_12_den_duoi_24_thang,
          statsB.debt.agingBuckets.tu_12_den_duoi_24_thang,
          true,
        ),
        tu_24_den_duoi_36_thang: calcNumericDiff(
          statsA.debt.agingBuckets.tu_24_den_duoi_36_thang,
          statsB.debt.agingBuckets.tu_24_den_duoi_36_thang,
          true,
        ),
        tren_36_thang: calcNumericDiff(
          statsA.debt.agingBuckets.tren_36_thang,
          statsB.debt.agingBuckets.tren_36_thang,
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
