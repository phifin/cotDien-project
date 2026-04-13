import { mergeMonthlySubmissions, type MergedMonthlyDataset } from './merger.js'

/**
 * Frontend-oriented filter state definition.
 * All optional parameters. Undefined means "do not filter by this rule".
 */
export interface FilterState {
  /** Filter to specific PCs (e.g., ['PC_HUE', 'PC_DANANG']) */
  pcCodes?: string[]
  
  /** Filter to specific partners (e.g., ['VNPT', 'FPT']) */
  partnerCodes?: string[]
  
  hasDebt?: boolean
  
  /** filter debt by floor/ceiling amounts */
  debtRange?: { min?: number; max?: number }
  
  /** substring match on partner codes or contract numbers */
  searchQuery?: string
}

export function sanitizeFilterState(input: FilterState): FilterState {
  const next: FilterState = {}

  if (input.pcCodes && input.pcCodes.length > 0) next.pcCodes = input.pcCodes
  if (input.partnerCodes && input.partnerCodes.length > 0) next.partnerCodes = input.partnerCodes
  if (input.hasDebt !== undefined) next.hasDebt = input.hasDebt
  const min = input.debtRange?.min
  const max = input.debtRange?.max
  if (min !== undefined || max !== undefined) {
    next.debtRange = {}
    if (min !== undefined && Number.isFinite(min)) next.debtRange.min = min
    if (max !== undefined && Number.isFinite(max)) next.debtRange.max = max
  }

  const search = input.searchQuery?.trim()
  if (search) next.searchQuery = search

  return next
}

/**
 * Returns a clean, empty state ready for UI reset/clear interactions.
 */
export function getInitialFilterState(): FilterState {
  return {}
}

/**
 * Applies UI bounds to the monthly aggregate and recalculates the statistics.
 * The operation is purely client-side, extremely fast, and completely deterministic.
 * 
 * Rules applied:
 * - js-min-max-loop / js-combine-iterations : Filters combine simultaneously before re-running aggregate via merger.
 * - js-early-exit : Exits immediately if filter has no criteria.
 */
export function applyFilters(
  dataset: MergedMonthlyDataset,
  filters: FilterState
): MergedMonthlyDataset {
  const cleanedFilters = sanitizeFilterState(filters)

  // Defensive early exit
  if (Object.keys(cleanedFilters).length === 0) return dataset

  const { pcCodes, partnerCodes, hasDebt, debtRange, searchQuery } = cleanedFilters

  const filteredEntries = dataset.entries.filter(entry => {
    const d = entry.data
    
    // 1. PC Match
    if (pcCodes && pcCodes.length > 0 && !pcCodes.includes(entry.meta.pcCode)) return false
    
    // 2. Partner Code Multi-Select Match
    if (partnerCodes && partnerCodes.length > 0 && !partnerCodes.includes(d.general.doi_tac)) return false

    // 3. Debt Presence
    if (hasDebt !== undefined) {
      const hasStrictDebt = d.debt_analysis.duoi_6_thang > 0
        || d.debt_analysis.tu_6_den_duoi_12_thang > 0
        || d.debt_analysis.tu_12_den_duoi_24_thang > 0
        || d.debt_analysis.tu_24_den_duoi_36_thang > 0
        || d.debt_analysis.tren_36_thang > 0
      if (hasDebt !== hasStrictDebt) return false
    }

    // 4. Debt Range
    if (debtRange) {
      const totalDebt = d.debt_analysis.duoi_6_thang
        + d.debt_analysis.tu_6_den_duoi_12_thang
        + d.debt_analysis.tu_12_den_duoi_24_thang
        + d.debt_analysis.tu_24_den_duoi_36_thang
        + d.debt_analysis.tren_36_thang
      if (debtRange.min !== undefined && totalDebt < debtRange.min) return false
      if (debtRange.max !== undefined && totalDebt > debtRange.max) return false
    }

    // 5. Free text string search
    if (searchQuery) {
      const sq = searchQuery.toLowerCase()
      const matchPartner = d.general.doi_tac.toLowerCase().includes(sq)
      const matchContract = d.contract.so_hd_phu_luc_hop_dong.toLowerCase().includes(sq)
      const matchPc = entry.meta.pcCode.toLowerCase().includes(sq)
      if (!matchPartner && !matchContract && !matchPc) return false
    }

    return true
  })

  // By passing the filtered array back into our merge engine, 
  // it seamlessly recalculates the `dataset.summary` statistics block specifically for these filtered rows!
  return mergeMonthlySubmissions(dataset.period, filteredEntries)
}
