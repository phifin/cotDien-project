import type { MergedMonthlyDataset } from './merger.js'
import { buildStatsModel, type PartnerDebtStats, type PoleCategoryStats } from './stats.js'
import type { DebtBreakdown } from './debt.js'
import { PARTNER_CATEGORY_CODES, type PartnerCategory } from './partners.js'

/**
 * Core semantic difference model.
 * Easily renderable in UI (e.g. conditional green/red arrows).
 */
export interface NumericDiff {
  valueA: number
  valueB: number
  /** valueB - valueA (Change relative to A) */
  delta: number
  /** Safe percent change. Null means period A is zero and the change is not mathematically stable. */
  percentChange: number | null
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
  const percentChange = a === 0 ? (b === 0 ? 0 : null) : delta / Math.abs(a)

  return {
    valueA: a,
    valueB: b,
    delta,
    percentChange,
    isPositiveTrend,
  }
}

function compareDebtBreakdown(a: DebtBreakdown, b: DebtBreakdown) {
  return {
    totalDebt: calcNumericDiff(a.totalDebt, b.totalDebt, true),
    debt2023: calcNumericDiff(a.debt2023, b.debt2023, true),
    debt2024: calcNumericDiff(a.debt2024, b.debt2024, true),
    debt2025: calcNumericDiff(a.debt2025, b.debt2025, true),
    debt2026: calcNumericDiff(a.debt2026, b.debt2026, true),
  }
}

function comparePartnerDebtStats(a: PartnerDebtStats, b: PartnerDebtStats) {
  return {
    totalRevenue: calcNumericDiff(a.totalRevenue, b.totalRevenue),
    totalDebt: calcNumericDiff(a.totalDebt, b.totalDebt, true),
    debtBreakdown: compareDebtBreakdown(a.debtBreakdown, b.debtBreakdown),
  }
}

function comparePoleCategoryStats(a: PoleCategoryStats, b: PoleCategoryStats) {
  return {
    total: calcNumericDiff(a.total, b.total),
    buckets: {
      duoi_8_5m: calcNumericDiff(a.buckets.duoi_8_5m, b.buckets.duoi_8_5m),
      tu_8_5_den_10_5m: calcNumericDiff(a.buckets.tu_8_5_den_10_5m, b.buckets.tu_8_5_den_10_5m),
      tu_10_5_den_12_5m: calcNumericDiff(a.buckets.tu_10_5_den_12_5m, b.buckets.tu_10_5_den_12_5m),
      tren_12_5m: calcNumericDiff(a.buckets.tren_12_5m, b.buckets.tren_12_5m),
    },
  }
}

function compareRevenueByCategory(
  a: Record<PartnerCategory, number>,
  b: Record<PartnerCategory, number>,
) {
  return PARTNER_CATEGORY_CODES.reduce((acc, category) => {
    acc[category] = calcNumericDiff(a[category], b[category])
    return acc
  }, {} as Record<PartnerCategory, NumericDiff>)
}

function comparePolesByCategory(
  a: Record<PartnerCategory, PoleCategoryStats>,
  b: Record<PartnerCategory, PoleCategoryStats>,
) {
  return PARTNER_CATEGORY_CODES.reduce((acc, category) => {
    acc[category] = comparePoleCategoryStats(a[category], b[category])
    return acc
  }, {} as Record<PartnerCategory, ReturnType<typeof comparePoleCategoryStats>>)
}

function compareDebtByCategory(
  a: Record<PartnerCategory, DebtBreakdown>,
  b: Record<PartnerCategory, DebtBreakdown>,
) {
  return PARTNER_CATEGORY_CODES.reduce((acc, category) => {
    acc[category] = compareDebtBreakdown(a[category], b[category])
    return acc
  }, {} as Record<PartnerCategory, ReturnType<typeof compareDebtBreakdown>>)
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
      byCategory: compareRevenueByCategory(statsA.revenue.actualByCategory, statsB.revenue.actualByCategory),
    },
    poles: {
      total: calcNumericDiff(statsA.poles.total, statsB.poles.total),
      buckets: {
        duoi_8_5m: calcNumericDiff(statsA.poles.buckets.duoi_8_5m, statsB.poles.buckets.duoi_8_5m),
        tren_12_5m: calcNumericDiff(statsA.poles.buckets.tren_12_5m, statsB.poles.buckets.tren_12_5m),
      },
      byCategory: comparePolesByCategory(statsA.poles.byCategory, statsB.poles.byCategory),
    },
    debt: {
      // Invert trend flag: Increase in debt is a BAD trend (isPositiveTrend = false)
      total: calcNumericDiff(statsA.debt.total, statsB.debt.total, true),
      breakdown: compareDebtBreakdown(statsA.debt.breakdown, statsB.debt.breakdown),
      byCategory: compareDebtByCategory(statsA.debt.byCategory, statsB.debt.byCategory),
    },
    difficultPartners: {
      VTVCAB: comparePartnerDebtStats(statsA.difficultPartners.VTVCAB, statsB.difficultPartners.VTVCAB),
      SCTV: comparePartnerDebtStats(statsA.difficultPartners.SCTV, statsB.difficultPartners.SCTV),
    },
  }
}
