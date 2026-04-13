import { z } from 'zod'
import { PARTNER_CODES } from './constants.js'

// ─── Metadata Schemas ────────────────────────────────────────────────────────

/**
 * Report Period Metadata
 * Canonical representation of the month/year this report belongs to.
 */
export const ReportPeriodSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
})

/**
 * PC Identity Metadata
 * pcCode: Unique identifier for the Power Company
 * pcName: Display name, NOT editable by end users. Always server/context derived.
 */
export const PcIdentitySchema = z.object({
  pcCode: z.string().min(1, 'PC Code is required'),
  pcName: z.string().readonly().describe('Read-only: Derived from auth context'),
})

// ─── Logical Blocks ─────────────────────────────────────────────────────────

export const GeneralInfoSchema = z.object({
  partnerCode: z.enum(PARTNER_CODES, {
    errorMap: () => ({ message: 'Invalid partner code selected' }),
  }),
  contactPerson: z.string().optional(),
  contactPhone: z.string().optional(),
})

export const ContractSchema = z.object({
  contractNumber: z.string().min(1, 'Contract number is required'),
  signedDate: z.string().date().optional(), // YYYY-MM-DD
  validUntil: z.string().date().optional(),
})

/**
 * Execution metrics that can vary per year.
 * By using z.record(z.string(), ...), we avoid hardcoding "2024", "2025".
 * Keys should be parseable as strings matching 'YYYY'.
 */
export const YearlyExecutionSchema = z.object({
  planned: z.number().nonnegative(),
  actual: z.number().nonnegative(),
  completionPercentage: z.number().min(0).max(100).optional(),
})

export const ExecutionSchema = z.record(
  z.string().regex(/^\d{4}$/, 'Key must be a 4-digit year'),
  YearlyExecutionSchema,
).describe('Year-keyed map of execution data to support dynamic multi-year structures.')

export const PoleQuantitiesSchema = z.object({
  totalPoles: z.number().int().nonnegative(),
  sharedPoles: z.number().int().nonnegative().optional(),
  newlyAdded: z.number().int().nonnegative().optional(),
  heightBuckets: z.object({
    below8_5m: z.number().int().nonnegative().default(0),
    from8_5mTo10_5m: z.number().int().nonnegative().default(0),
    from10_5mTo12_5m: z.number().int().nonnegative().default(0),
    above12_5m: z.number().int().nonnegative().default(0),
  }).optional(),
})

export const RevenueResultSchema = z.object({
  expectedRevenue: z.number().nonnegative(),
  actualCollected: z.number().nonnegative(),
  currency: z.string().default('VND'),
})

export const DebtAgingBucketsSchema = z.object({
  below6Months: z.number().nonnegative().default(0),
  from6To12Months: z.number().nonnegative().default(0),
  from12To24Months: z.number().nonnegative().default(0),
  from24To36Months: z.number().nonnegative().default(0),
  above36Months: z.number().nonnegative().default(0),
})

export const DebtAnalysisSchema = z.object({
  totalDebt: z.number().nonnegative(),
  overdueDebt: z.number().nonnegative(),
  debtClassification: z.enum(['SAFE', 'WARNING', 'CRITICAL']).optional(),
  yearlyDebts: z.record(
    z.string().regex(/^\d{4}$/, 'Key must be a 4-digit year'),
    z.number().nonnegative()
  ).optional(),
  agingBuckets: DebtAgingBucketsSchema.optional()
})

// ─── Canonical Payload ────────────────────────────────────────────────────────

/**
 * The Canonical Submission Payload.
 * This represents the single source of truth for a monthly PC report submission.
 * It is flat enough for document databases but logically grouped for UI and extraction.
 */
export const MonthlyReportPayloadSchema = z.object({
  period: ReportPeriodSchema,
  identity: PcIdentitySchema,
  general: GeneralInfoSchema,
  contract: ContractSchema,
  execution: ExecutionSchema,
  poleQuantities: PoleQuantitiesSchema,
  revenueResult: RevenueResultSchema,
  debtAnalysis: DebtAnalysisSchema,
  notes: z.string().optional().describe('Free-text notes from the PC.'),
})
