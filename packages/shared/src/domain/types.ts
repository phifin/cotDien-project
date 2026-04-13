import type * as z from 'zod'
import type {
  ReportPeriodSchema,
  PcIdentitySchema,
  NotesSchema,
  GeneralInfoSchema,
  ContractSchema,
  ExecutionSchema,
  DebtAnalysisSchema,
  RevenueResultSchema,
  PoleQuantitiesSchema,
  MonthlyReportPayloadSchema,
} from './schema.js'

// Automatically infer all types from the Zod Schemas to keep a single source of truth.

export type ReportPeriod = z.infer<typeof ReportPeriodSchema>
export type PcIdentity = z.infer<typeof PcIdentitySchema>
export type Notes = z.infer<typeof NotesSchema>
export type GeneralInfo = z.infer<typeof GeneralInfoSchema>
export type ContractConfig = z.infer<typeof ContractSchema>
export type Execution = z.infer<typeof ExecutionSchema>
export type DebtAnalysis = z.infer<typeof DebtAnalysisSchema>
export type RevenueResult = z.infer<typeof RevenueResultSchema>
export type PoleQuantities = z.infer<typeof PoleQuantitiesSchema>

export type MonthlyReportPayload = z.infer<typeof MonthlyReportPayloadSchema>
export function buildReportId(pcCode: string, year: number, month: number): string {
  const paddedMonth = month.toString().padStart(2, '0')
  return `REPORT_${pcCode}_${String(year)}_${paddedMonth}`
}
