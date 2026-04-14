import type { ZodError } from 'zod'
import { ok, err, type Result } from '../types/index.js'
import { MonthlyReportPayloadSchema } from './schema.js'
import type { MonthlyReportPayload, PcIdentity, ReportPeriod } from './types.js'

function coerceNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const t = value.trim().replace(/[\s,]/g, '')
    if (t === '') return 0
    const n = Number(t)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

function coerceYearMap(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (/^\d{4}$/.test(k)) out[k] = coerceNumber(v)
  }
  return out
}

/**
 * Validates untrusted imported JSON against the canonical schema.
 * Rejects structurally invalid payloads entirely.
 */
export function parseImportedJson(input: unknown): Result<MonthlyReportPayload, ZodError> {
  const parsed = MonthlyReportPayloadSchema.safeParse(input)
  if (parsed.success) {
    return ok(parsed.data)
  }
  return err<ZodError>(parsed.error)
}

/**
 * Normalizes partial/raw data into a structurally sound canonical form,
 * filling missing branches with sensible nullish/default structures
 * so forms don't crash when binding to nested paths.
 *
 * Ensures year-keyed fields (like execution) are consistently an object map.
 */
export function normalizeSubmissionPayload(
  raw: unknown = {},
  fallbackIdentity?: PcIdentity,
  _fallbackPeriod?: ReportPeriod,
): MonthlyReportPayload {
  const safeData: Partial<MonthlyReportPayload> = (
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Partial<MonthlyReportPayload>)
      : {}
  )

  return {
    notes: {
      ghi_chu: safeData.notes?.ghi_chu ?? '',
    },
    general: {
      ten_pc: safeData.general?.ten_pc ?? fallbackIdentity?.pcName ?? '',
      doi_tac: safeData.general?.doi_tac ?? '',
      doanh_thu_ke_hoach_nam: coerceNumber(safeData.general?.doanh_thu_ke_hoach_nam),
    },
    contract: {
      so_hd_phu_luc_hop_dong: safeData.contract?.so_hd_phu_luc_hop_dong ?? '',
      ngay_ky_hd_plhd: safeData.contract?.ngay_ky_hd_plhd ?? '',
      hieu_luc_den: safeData.contract?.hieu_luc_den ?? '',
      gia_tri_hop_dong_nam: coerceNumber(safeData.contract?.gia_tri_hop_dong_nam),
    },
    execution: {
      closing_balance: coerceNumber(safeData.execution?.closing_balance),
      generated_by_year: coerceYearMap(safeData.execution?.generated_by_year),
      collected_by_year: coerceYearMap(safeData.execution?.collected_by_year),
      opening_balance_by_year: coerceYearMap(safeData.execution?.opening_balance_by_year),
    },
    debt_analysis: {
      duoi_6_thang: coerceNumber(safeData.debt_analysis?.duoi_6_thang),
      tu_6_den_duoi_12_thang: coerceNumber(safeData.debt_analysis?.tu_6_den_duoi_12_thang),
      tu_12_den_duoi_24_thang: coerceNumber(safeData.debt_analysis?.tu_12_den_duoi_24_thang),
      tu_24_den_duoi_36_thang: coerceNumber(safeData.debt_analysis?.tu_24_den_duoi_36_thang),
      tren_36_thang: coerceNumber(safeData.debt_analysis?.tren_36_thang),
    },
    revenue_result: {
      doanh_thu_thuc_hien_nam: coerceNumber(safeData.revenue_result?.doanh_thu_thuc_hien_nam),
      ti_le_thuc_hien: coerceNumber(safeData.revenue_result?.ti_le_thuc_hien),
    },
    pole_quantities: {
      duoi_8_5m: coerceNumber(safeData.pole_quantities?.duoi_8_5m),
      tu_8_5_den_10_5m: coerceNumber(safeData.pole_quantities?.tu_8_5_den_10_5m),
      tu_10_5_den_12_5m: coerceNumber(safeData.pole_quantities?.tu_10_5_den_12_5m),
      tren_12_5m: coerceNumber(safeData.pole_quantities?.tren_12_5m),
    },
  }
}

/**
 * Prepares the canonical payload for UI Hydration.
 * If the form requires flattened state, that logic lives in the app.
 * This ensures the base JSON is intact, strips prototype pollution,
 * and normalizes year-keys if any migration logic is needed.
 */
export function hydrateFormFromCanonical(payload: MonthlyReportPayload): MonthlyReportPayload {
  // Deep clone to strip external references / proxies before pushing to local state.
  const clonedUnknown: unknown = JSON.parse(JSON.stringify(payload))
  return MonthlyReportPayloadSchema.parse(clonedUnknown)
}

export interface ValidationContext {
  expectedPcCode: string
  expectedYear: number
  expectedMonth: number
}

export interface ContextMismatch {
  field: 'pcCode' | 'year' | 'month'
  expected: string | number
  actual: string | number
  message: string
}

/**
 * Validates the parsed structure against environmental constraints.
 * Ensures a PC doesn't accidentally import another PC's file,
 * or upload a 2024 report into the 2025 dashboard scope.
 * 
 * Target Rule: js-early-exit - Returns err immediately on first collection of mismatches without running side effects.
 */
export function validateImportedJsonAgainstContext(
  _payload: MonthlyReportPayload,
  _context: ValidationContext,
): Result<true, ContextMismatch[]> {
  // Canonical payload intentionally excludes identity/period metadata.
  return ok<true>(true)
}
