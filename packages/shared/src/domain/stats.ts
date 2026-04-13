import type { MergedMonthlyDataset } from './merger.js'

export interface PartnerDebtStats {
  partnerCode: string
  totalRevenue: number
  totalDebt: number
  agingBuckets: {
    duoi_6_thang: number
    tu_6_den_duoi_12_thang: number
    tu_12_den_duoi_24_thang: number
    tu_24_den_duoi_36_thang: number
    tren_36_thang: number
  }
}

export interface DashboardStats {
  revenue: {
    totalPlanned: number
    totalActual: number
    totalContractValue: number
    /** Revenue grouped by requested major partners */
    byMajorPartner: Record<string, number>
    /** calculated via actualRevenue / plannedRevenue safely */
    completionRate: number
  }
  poles: {
    total: number
    buckets: {
      duoi_8_5m: number
      tu_8_5_den_10_5m: number
      tu_10_5_den_12_5m: number
      tren_12_5m: number
    }
  }
  debt: {
    total: number
    agingBuckets: {
      duoi_6_thang: number
      tu_6_den_duoi_12_thang: number
      tu_12_den_duoi_24_thang: number
      tu_24_den_duoi_36_thang: number
      tren_36_thang: number
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
    agingBuckets: {
      duoi_6_thang: 0,
      tu_6_den_duoi_12_thang: 0,
      tu_12_den_duoi_24_thang: 0,
      tu_24_den_duoi_36_thang: 0,
      tren_36_thang: 0,
    },
  }
}

type AgingBuckets = PartnerDebtStats['agingBuckets']

function mergeAgingBuckets(target: AgingBuckets, source?: Partial<AgingBuckets>) {
  if (!source) return
  target.duoi_6_thang += source.duoi_6_thang ?? 0
  target.tu_6_den_duoi_12_thang += source.tu_6_den_duoi_12_thang ?? 0
  target.tu_12_den_duoi_24_thang += source.tu_12_den_duoi_24_thang ?? 0
  target.tu_24_den_duoi_36_thang += source.tu_24_den_duoi_36_thang ?? 0
  target.tren_36_thang += source.tren_36_thang ?? 0
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
      totalPlanned: 0,
      totalActual: 0,
      totalContractValue: 0,
      byMajorPartner: {},
      completionRate: 0,
    },
    poles: {
      total: 0,
      buckets: { duoi_8_5m: 0, tu_8_5_den_10_5m: 0, tu_10_5_den_12_5m: 0, tren_12_5m: 0 },
    },
    debt: {
      total: 0,
      agingBuckets: {
        duoi_6_thang: 0,
        tu_6_den_duoi_12_thang: 0,
        tu_12_den_duoi_24_thang: 0,
        tu_24_den_duoi_36_thang: 0,
        tren_36_thang: 0,
      },
    },
    difficultPartners: {
      VTVCAB: createEmptyDebtStats('VTVCAB'),
      SCTV: createEmptyDebtStats('SCTV'),
    },
  }

  for (const entry of dataset.entries) {
    const d = entry.data
    const partner = d.general.doi_tac

    stats.revenue.totalPlanned += d.general.doanh_thu_ke_hoach_nam
    stats.revenue.totalActual += d.revenue_result.doanh_thu_thuc_hien_nam
    stats.revenue.totalContractValue += d.contract.gia_tri_hop_dong_nam
    stats.revenue.byMajorPartner[partner] = (stats.revenue.byMajorPartner[partner] ?? 0) + d.general.doanh_thu_ke_hoach_nam

    stats.poles.buckets.duoi_8_5m += d.pole_quantities.duoi_8_5m
    stats.poles.buckets.tu_8_5_den_10_5m += d.pole_quantities.tu_8_5_den_10_5m
    stats.poles.buckets.tu_10_5_den_12_5m += d.pole_quantities.tu_10_5_den_12_5m
    stats.poles.buckets.tren_12_5m += d.pole_quantities.tren_12_5m
    stats.poles.total += d.pole_quantities.duoi_8_5m
      + d.pole_quantities.tu_8_5_den_10_5m
      + d.pole_quantities.tu_10_5_den_12_5m
      + d.pole_quantities.tren_12_5m

    const debtAging = d.debt_analysis.duoi_6_thang
      + d.debt_analysis.tu_6_den_duoi_12_thang
      + d.debt_analysis.tu_12_den_duoi_24_thang
      + d.debt_analysis.tu_24_den_duoi_36_thang
      + d.debt_analysis.tren_36_thang
    stats.debt.total += debtAging
    mergeAgingBuckets(stats.debt.agingBuckets, d.debt_analysis)

    if (partner === 'VTVCAB' || partner === 'SCTV') {
      const pStats = stats.difficultPartners[partner]
      pStats.totalRevenue += d.general.doanh_thu_ke_hoach_nam
      pStats.totalDebt += debtAging
      mergeAgingBuckets(pStats.agingBuckets, d.debt_analysis)
    }
  }

  stats.revenue.completionRate = safeRate(stats.revenue.totalActual, stats.revenue.totalPlanned)

  return stats
}
