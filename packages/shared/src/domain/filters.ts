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
  
  /** strict true/false for debt existence toggle */
  hasDebt?: boolean
  
  /** filter debt by floor/ceiling amounts */
  debtRange?: { min?: number; max?: number }
  
  /** contract status based on `validUntil` date */
  contractStatus?: 'ACTIVE' | 'EXPIRED'
  
  /** substring match on partner codes or contract numbers */
  searchQuery?: string
}

export function sanitizeFilterState(input: FilterState): FilterState {
  const next: FilterState = {}

  if (input.pcCodes && input.pcCodes.length > 0) next.pcCodes = input.pcCodes
  if (input.partnerCodes && input.partnerCodes.length > 0) next.partnerCodes = input.partnerCodes
  if (input.hasDebt !== undefined) next.hasDebt = input.hasDebt
  if (input.contractStatus) next.contractStatus = input.contractStatus

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

  const { pcCodes, partnerCodes, hasDebt, debtRange, contractStatus, searchQuery } = cleanedFilters
  const todayRaw = new Date().toISOString().split('T')[0] ?? '' // 'YYYY-MM-DD' comparison for safe HTML dates

  const filteredEntries = dataset.entries.filter(entry => {
    const d = entry.data
    
    // 1. PC Match
    if (pcCodes && pcCodes.length > 0 && !pcCodes.includes(d.identity.pcCode)) return false
    
    // 2. Partner Code Multi-Select Match
    if (partnerCodes && partnerCodes.length > 0 && !partnerCodes.includes(d.general.partnerCode)) return false

    // 3. Debt Presence
    if (hasDebt !== undefined) {
      const hasStrictDebt = d.debtAnalysis.totalDebt > 0
      if (hasDebt !== hasStrictDebt) return false
    }

    // 4. Debt Range
    if (debtRange) {
      if (debtRange.min !== undefined && d.debtAnalysis.totalDebt < debtRange.min) return false
      if (debtRange.max !== undefined && d.debtAnalysis.totalDebt > debtRange.max) return false
    }

    // 5. Contract Status
    if (contractStatus) {
      const expiry = d.contract.validUntil
      const isExpired = expiry ? expiry < todayRaw : false
      if (contractStatus === 'ACTIVE' && isExpired) return false
      if (contractStatus === 'EXPIRED' && !isExpired) return false
    }

    // 6. Free text string search
    if (searchQuery) {
      const sq = searchQuery.toLowerCase()
      const matchPartner = d.general.partnerCode.toLowerCase().includes(sq)
      const matchContract = d.contract.contractNumber.toLowerCase().includes(sq)
      const matchPc = d.identity.pcCode.toLowerCase().includes(sq) // Adding PC code as helpful context
      if (!matchPartner && !matchContract && !matchPc) return false
    }

    return true
  })

  // By passing the filtered array back into our merge engine, 
  // it seamlessly recalculates the `dataset.summary` statistics block specifically for these filtered rows!
  return mergeMonthlySubmissions(dataset.period, filteredEntries)
}
