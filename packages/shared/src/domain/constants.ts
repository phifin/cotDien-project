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
 * Validates a given year is within a reasonable bounds.
 * Useful for validating dynamic year keys.
 */
export const MIN_YEAR = 2000
export const MAX_YEAR = 2100
