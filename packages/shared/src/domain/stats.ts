import type { MergedMonthlyDataset } from './merger.js'
import {
  addDebtAgingBuckets,
  addDebtBreakdown,
  calculateDebtBreakdown,
  createEmptyDebtAgingBuckets,
  createEmptyDebtBreakdown,
  type DebtAgingBuckets,
  type DebtBreakdown,
} from './debt.js'
import {
  getPartnerCategory,
  PARTNER_CATEGORY_CODES,
  type PartnerCategory,
} from './partners.js'

export interface PoleBucketStats {
  duoi_8_5m: number
  tu_8_5_den_10_5m: number
  tu_10_5_den_12_5m: number
  tren_12_5m: number
}

export interface PoleCategoryStats {
  total: number
  buckets: PoleBucketStats
}

export interface PartnerDebtStats {
  partnerCode: string
  totalRevenue: number
  totalDebt: number
  debtBreakdown: DebtBreakdown
  agingBuckets: DebtAgingBuckets
}

export interface DashboardStats {
  revenue: {
    totalPlanned: number
    totalActual: number
    totalContractValue: number
    /** Revenue grouped by requested major partners */
    byMajorPartner: Record<string, number>
    /** Actual collected revenue grouped by partner category */
    actualByCategory: Record<PartnerCategory, number>
    /** calculated via actualRevenue / plannedRevenue safely */
    completionRate: number
  }
  poles: {
    total: number
    buckets: PoleBucketStats
    byCategory: Record<PartnerCategory, PoleCategoryStats>
  }
  debt: {
    total: number
    breakdown: DebtBreakdown
    agingBuckets: DebtAgingBuckets
    byCategory: Record<PartnerCategory, DebtBreakdown>
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

function createEmptyPoleBuckets(): PoleBucketStats {
  return {
    duoi_8_5m: 0,
    tu_8_5_den_10_5m: 0,
    tu_10_5_den_12_5m: 0,
    tren_12_5m: 0,
  }
}

function createEmptyPoleCategoryStats(): PoleCategoryStats {
  return {
    total: 0,
    buckets: createEmptyPoleBuckets(),
  }
}

function createCategoryNumberRecord(): Record<PartnerCategory, number> {
  return PARTNER_CATEGORY_CODES.reduce((acc, category) => {
    acc[category] = 0
    return acc
  }, {} as Record<PartnerCategory, number>)
}

function createCategoryPoleRecord(): Record<PartnerCategory, PoleCategoryStats> {
  return PARTNER_CATEGORY_CODES.reduce((acc, category) => {
    acc[category] = createEmptyPoleCategoryStats()
    return acc
  }, {} as Record<PartnerCategory, PoleCategoryStats>)
}

function createCategoryDebtRecord(): Record<PartnerCategory, DebtBreakdown> {
  return PARTNER_CATEGORY_CODES.reduce((acc, category) => {
    acc[category] = createEmptyDebtBreakdown()
    return acc
  }, {} as Record<PartnerCategory, DebtBreakdown>)
}

/**
 * Creates empty defaults for deep nested objects
 */
function createEmptyDebtStats(partnerCode: string): PartnerDebtStats {
  return {
    partnerCode,
    totalRevenue: 0,
    totalDebt: 0,
    debtBreakdown: createEmptyDebtBreakdown(),
    agingBuckets: createEmptyDebtAgingBuckets(),
  }
}

function addPoleBuckets(target: PoleBucketStats, source: PoleBucketStats): number {
  target.duoi_8_5m += source.duoi_8_5m
  target.tu_8_5_den_10_5m += source.tu_8_5_den_10_5m
  target.tu_10_5_den_12_5m += source.tu_10_5_den_12_5m
  target.tren_12_5m += source.tren_12_5m

  return source.duoi_8_5m
    + source.tu_8_5_den_10_5m
    + source.tu_10_5_den_12_5m
    + source.tren_12_5m
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
      actualByCategory: createCategoryNumberRecord(),
      completionRate: 0,
    },
    poles: {
      total: 0,
      buckets: createEmptyPoleBuckets(),
      byCategory: createCategoryPoleRecord(),
    },
    debt: {
      total: 0,
      breakdown: createEmptyDebtBreakdown(),
      agingBuckets: createEmptyDebtAgingBuckets(),
      byCategory: createCategoryDebtRecord(),
    },
    difficultPartners: {
      VTVCAB: createEmptyDebtStats('VTVCAB'),
      SCTV: createEmptyDebtStats('SCTV'),
    },
  }

  for (const entry of dataset.entries) {
    const d = entry.data
    const partner = d.general.doi_tac
    const category = getPartnerCategory(partner)
    const debtBreakdown = calculateDebtBreakdown(d)

    stats.revenue.totalPlanned += d.general.doanh_thu_ke_hoach_nam
    stats.revenue.totalActual += d.revenue_result.doanh_thu_thuc_hien_nam
    stats.revenue.totalContractValue += d.contract.gia_tri_hop_dong_nam
    stats.revenue.byMajorPartner[partner] = (stats.revenue.byMajorPartner[partner] ?? 0) + d.general.doanh_thu_ke_hoach_nam
    stats.revenue.actualByCategory[category] += d.revenue_result.doanh_thu_thuc_hien_nam

    const poleTotal = addPoleBuckets(stats.poles.buckets, d.pole_quantities)
    stats.poles.total += poleTotal
    const categoryPoleStats = stats.poles.byCategory[category]
    categoryPoleStats.total += poleTotal
    addPoleBuckets(categoryPoleStats.buckets, d.pole_quantities)

    stats.debt.total += debtBreakdown.totalDebt
    addDebtBreakdown(stats.debt.breakdown, debtBreakdown)
    addDebtBreakdown(stats.debt.byCategory[category], debtBreakdown)
    addDebtAgingBuckets(stats.debt.agingBuckets, d.debt_analysis)

    if (partner === 'VTVCAB' || partner === 'SCTV') {
      const pStats = stats.difficultPartners[partner]
      pStats.totalRevenue += d.general.doanh_thu_ke_hoach_nam
      pStats.totalDebt += debtBreakdown.totalDebt
      addDebtBreakdown(pStats.debtBreakdown, debtBreakdown)
      addDebtAgingBuckets(pStats.agingBuckets, d.debt_analysis)
    }
  }

  stats.revenue.completionRate = safeRate(stats.revenue.totalActual, stats.revenue.totalPlanned)

  return stats
}
