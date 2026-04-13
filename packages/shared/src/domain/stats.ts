import type { MergedMonthlyDataset } from './merger.js'

export interface PartnerDebtStats {
  partnerCode: string
  totalRevenue: number
  totalDebt: number
  yearlyDebts: Record<string, number>
  agingBuckets: {
    below6Months: number
    from6To12Months: number
    from12To24Months: number
    from24To36Months: number
    above36Months: number
  }
}

export interface DashboardStats {
  revenue: {
    totalExpected: number
    totalActualCollected: number
    totalPlannedExecution: number
    totalActualExecution: number
    /** Revenue grouped by requested major partners */
    byMajorPartner: Record<'FPT' | 'VNPT' | 'MOBI' | 'VTVCAB' | 'SCTV', number>
    /** calculated via actualRevenue / plannedRevenue safely */
    executionRate: number
    /** calculated via collectedInPeriod / generatedInPeriod safely */
    collectionRate: number
  }
  poles: {
    total: number
    buckets: {
      below8_5m: number
      from8_5mTo10_5m: number
      from10_5mTo12_5m: number
      above12_5m: number
    }
  }
  debt: {
    total: number
    /** Dynamically merged years matching raw payload structures e.g. "2023", "2024" */
    yearlyDebts: Record<string, number>
    agingBuckets: {
      below6Months: number
      from6To12Months: number
      from12To24Months: number
      from24To36Months: number
      above36Months: number
    }
  }
  difficultPartners: {
    VTVCAB: PartnerDebtStats
    SCTV: PartnerDebtStats
  }
}

/**
 * Helper to safely calculate rates preventing NaN and Infinity explosions
 */
function safeRate(numerator: number, denominator: number): number {
  if (!denominator || denominator === 0) return 0
  return numerator / denominator
}

/**
 * Creates empty defaults for deep nested objects
 */
function createEmptyDebtStats(partnerCode: string): PartnerDebtStats {
  return {
    partnerCode,
    totalRevenue: 0,
    totalDebt: 0,
    yearlyDebts: {},
    agingBuckets: {
      below6Months: 0,
      from6To12Months: 0,
      from12To24Months: 0,
      from24To36Months: 0,
      above36Months: 0,
    },
  }
}

function mergeAgingBuckets(target: PartnerDebtStats['agingBuckets'], source: any) {
  if (!source) return
  target.below6Months += source.below6Months ?? 0
  target.from6To12Months += source.from6To12Months ?? 0
  target.from12To24Months += source.from12To24Months ?? 0
  target.from24To36Months += source.from24To36Months ?? 0
  target.above36Months += source.above36Months ?? 0
}

/**
 * Computes deep analytics directly from a (potentially filtered) dataset.
 * Runs in a single O(N) pass for performance over large reporting arrays.
 * 
 * Rules:
 *  - js-combine-iterations
 *  - js-cache-property-access
 */
export function buildStatsModel(dataset: MergedMonthlyDataset): DashboardStats {
  const stats: DashboardStats = {
    revenue: {
      totalExpected: 0,
      totalActualCollected: 0,
      totalPlannedExecution: 0,
      totalActualExecution: 0,
      byMajorPartner: { FPT: 0, VNPT: 0, MOBI: 0, VTVCAB: 0, SCTV: 0 },
      executionRate: 0,
      collectionRate: 0,
    },
    poles: {
      total: 0,
      buckets: { below8_5m: 0, from8_5mTo10_5m: 0, from10_5mTo12_5m: 0, above12_5m: 0 },
    },
    debt: {
      total: 0,
      yearlyDebts: {},
      agingBuckets: {
        below6Months: 0,
        from6To12Months: 0,
        from12To24Months: 0,
        from24To36Months: 0,
        above36Months: 0,
      },
    },
    difficultPartners: {
      VTVCAB: createEmptyDebtStats('VTVCAB'),
      SCTV: createEmptyDebtStats('SCTV'),
    },
  }

  for (const entry of dataset.entries) {
    const d = entry.data
    const partner = d.general.partnerCode

    // 1. Revenue
    stats.revenue.totalExpected += d.revenueResult.expectedRevenue
    stats.revenue.totalActualCollected += d.revenueResult.actualCollected

    if (partner in stats.revenue.byMajorPartner) {
      stats.revenue.byMajorPartner[partner as keyof typeof stats.revenue.byMajorPartner] +=
        d.revenueResult.expectedRevenue
    }

    let localPlannedExec = 0
    let localActualExec = 0
    for (const exec of Object.values(d.execution)) {
      localPlannedExec += exec.planned
      localActualExec += exec.actual
    }
    stats.revenue.totalPlannedExecution += localPlannedExec
    stats.revenue.totalActualExecution += localActualExec

    // 2. Poles
    stats.poles.total += d.poleQuantities.totalPoles
    if (d.poleQuantities.heightBuckets) {
      const hb = d.poleQuantities.heightBuckets
      stats.poles.buckets.below8_5m += hb.below8_5m
      stats.poles.buckets.from8_5mTo10_5m += hb.from8_5mTo10_5m
      stats.poles.buckets.from10_5mTo12_5m += hb.from10_5mTo12_5m
      stats.poles.buckets.above12_5m += hb.above12_5m
    }

    // 3. Overall Debt
    stats.debt.total += d.debtAnalysis.totalDebt
    mergeAgingBuckets(stats.debt.agingBuckets, d.debtAnalysis.agingBuckets)

    if (d.debtAnalysis.yearlyDebts) {
      for (const [year, amount] of Object.entries(d.debtAnalysis.yearlyDebts)) {
        if (!stats.debt.yearlyDebts[year]) stats.debt.yearlyDebts[year] = 0
        stats.debt.yearlyDebts[year] += amount
      }
    }

    // 4. Difficult Partners Tracking
    if (partner === 'VTVCAB' || partner === 'SCTV') {
      const pStats = stats.difficultPartners[partner as 'VTVCAB' | 'SCTV']
      pStats.totalRevenue += d.revenueResult.expectedRevenue
      pStats.totalDebt += d.debtAnalysis.totalDebt
      
      mergeAgingBuckets(pStats.agingBuckets, d.debtAnalysis.agingBuckets)

      if (d.debtAnalysis.yearlyDebts) {
        for (const [year, amount] of Object.entries(d.debtAnalysis.yearlyDebts)) {
          if (!pStats.yearlyDebts[year]) pStats.yearlyDebts[year] = 0
          pStats.yearlyDebts[year] += amount
        }
      }
    }
  }

  // Calculate final macro rates
  stats.revenue.executionRate = safeRate(
    stats.revenue.totalActualExecution,
    stats.revenue.totalPlannedExecution,
  )
  stats.revenue.collectionRate = safeRate(
    stats.revenue.totalActualCollected,
    stats.revenue.totalActualExecution,
  )

  return stats
}
