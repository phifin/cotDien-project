/**
 * Partner Master Data Codes
 * Strict dropdown-style coded values mapping to actual partners.
 */
export const PARTNER_CODES = [
  'VNPT',
  'FPT',
  'MOBI',
  'SCTV',
  'VTVCAB',
  'VNMOBILE',
  'CMC',
  'HTC',
  'ACT',
  'TPCOMS',
  'TTVT KVII',
  'TIVICOM',
  'NETNAM',
  'HAILONG',
  'HTV',
  'TANVIETSINH',
  'HTMMN',
  'KHOINGHIEP',
  'STC',
  'HUNGMANH',
  'VIETTHANH',
  'KHAC',
] as const

export type PartnerCode = (typeof PARTNER_CODES)[number]

/**
 * Business reporting year buckets.
 * Opening balances for 2023/2024/2025 are baseline values and should remain
 * unchanged across report months until a previous-month prefill/validation flow is added.
 */
export const OPENING_BALANCE_YEARS = ['2023', '2024', '2025'] as const
export const GENERATED_REVENUE_YEARS = ['2026'] as const
export const COLLECTED_REVENUE_YEARS = ['2023', '2024', '2025', '2026'] as const

export type OpeningBalanceYear = (typeof OPENING_BALANCE_YEARS)[number]
export type GeneratedRevenueYear = (typeof GENERATED_REVENUE_YEARS)[number]
export type CollectedRevenueYear = (typeof COLLECTED_REVENUE_YEARS)[number]

export const REPORT_DEADLINE_DAY = 5
export const REPORT_DEADLINE_MONTH_OFFSET = 1

/**
 * Validates a given year is within a reasonable bounds.
 * Useful for validating dynamic year keys.
 */
export const MIN_YEAR = 2000
export const MAX_YEAR = 2100
