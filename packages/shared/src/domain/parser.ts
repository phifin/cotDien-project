import type { ZodError } from 'zod'
import { ok, err, type Result } from '../types/index.js'
import { PARTNER_CODES } from './constants.js'
import { MonthlyReportPayloadSchema } from './schema.js'
import type { MonthlyReportPayload, PcIdentity, ReportPeriod } from './types.js'

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
  fallbackPeriod?: ReportPeriod,
): MonthlyReportPayload {
  const safeData: Partial<MonthlyReportPayload> = (
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Partial<MonthlyReportPayload>)
      : {}
  )

  const partnerCode = (
    typeof safeData.general?.partnerCode === 'string'
    && (PARTNER_CODES as readonly string[]).includes(safeData.general.partnerCode)
  )
    ? safeData.general.partnerCode
    : 'KHAC'

  return {
    period: {
      month: safeData.period?.month ?? fallbackPeriod?.month ?? new Date().getMonth() + 1,
      year: safeData.period?.year ?? fallbackPeriod?.year ?? new Date().getFullYear(),
    },
    identity: {
      pcCode: safeData.identity?.pcCode ?? fallbackIdentity?.pcCode ?? '',
      pcName: safeData.identity?.pcName ?? fallbackIdentity?.pcName ?? '',
    },
    general: {
      partnerCode,
      contactPerson: safeData.general?.contactPerson ?? '',
      contactPhone: safeData.general?.contactPhone ?? '',
    },
    contract: {
      contractNumber: safeData.contract?.contractNumber ?? '',
      signedDate: safeData.contract?.signedDate ?? undefined,
      validUntil: safeData.contract?.validUntil ?? undefined,
    },
    execution: safeData.execution ?? {}, // Guarantee it's at least an empty map
    poleQuantities: {
      totalPoles: safeData.poleQuantities?.totalPoles ?? 0,
      sharedPoles: safeData.poleQuantities?.sharedPoles ?? 0,
      newlyAdded: safeData.poleQuantities?.newlyAdded ?? 0,
      heightBuckets: {
        below8_5m: safeData.poleQuantities?.heightBuckets?.below8_5m ?? 0,
        from8_5mTo10_5m: safeData.poleQuantities?.heightBuckets?.from8_5mTo10_5m ?? 0,
        from10_5mTo12_5m: safeData.poleQuantities?.heightBuckets?.from10_5mTo12_5m ?? 0,
        above12_5m: safeData.poleQuantities?.heightBuckets?.above12_5m ?? 0,
      }
    },
    revenueResult: {
      expectedRevenue: safeData.revenueResult?.expectedRevenue ?? 0,
      actualCollected: safeData.revenueResult?.actualCollected ?? 0,
      currency: safeData.revenueResult?.currency ?? 'VND',
    },
    debtAnalysis: {
      totalDebt: safeData.debtAnalysis?.totalDebt ?? 0,
      overdueDebt: safeData.debtAnalysis?.overdueDebt ?? 0,
      debtClassification: safeData.debtAnalysis?.debtClassification ?? undefined,
      yearlyDebts: safeData.debtAnalysis?.yearlyDebts ?? {},
      agingBuckets: {
        below6Months: safeData.debtAnalysis?.agingBuckets?.below6Months ?? 0,
        from6To12Months: safeData.debtAnalysis?.agingBuckets?.from6To12Months ?? 0,
        from12To24Months: safeData.debtAnalysis?.agingBuckets?.from12To24Months ?? 0,
        from24To36Months: safeData.debtAnalysis?.agingBuckets?.from24To36Months ?? 0,
        above36Months: safeData.debtAnalysis?.agingBuckets?.above36Months ?? 0,
      }
    },
    notes: safeData.notes ?? '',
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
  payload: MonthlyReportPayload,
  context: ValidationContext,
): Result<true, ContextMismatch[]> {
  const mismatches: ContextMismatch[] = []

  if (payload.identity.pcCode !== context.expectedPcCode) {
    mismatches.push({
      field: 'pcCode',
      expected: context.expectedPcCode,
      actual: payload.identity.pcCode,
      message: `File belongs to PC '${payload.identity.pcCode}', expected '${context.expectedPcCode}'.`,
    })
  }

  if (payload.period.year !== context.expectedYear) {
    mismatches.push({
      field: 'year',
      expected: context.expectedYear,
      actual: payload.period.year,
      message: `File is for year ${String(payload.period.year)}, expected ${String(context.expectedYear)}.`,
    })
  }

  if (payload.period.month !== context.expectedMonth) {
    mismatches.push({
      field: 'month',
      expected: context.expectedMonth,
      actual: payload.period.month,
      message: `File is for month ${String(payload.period.month)}, expected ${String(context.expectedMonth)}.`,
    })
  }

  if (mismatches.length > 0) {
    return err<ContextMismatch[]>(mismatches)
  }

  return ok<true>(true)
}
