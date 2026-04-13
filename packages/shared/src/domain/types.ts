import { z } from 'zod'
import {
  ReportPeriodSchema,
  PcIdentitySchema,
  GeneralInfoSchema,
  ContractSchema,
  YearlyExecutionSchema,
  ExecutionSchema,
  PoleQuantitiesSchema,
  RevenueResultSchema,
  DebtAnalysisSchema,
  MonthlyReportPayloadSchema,
} from './schema.js'

// Automatically infer all types from the Zod Schemas to keep a single source of truth.

export type ReportPeriod = z.infer<typeof ReportPeriodSchema>
export type PcIdentity = z.infer<typeof PcIdentitySchema>

export type GeneralInfo = z.infer<typeof GeneralInfoSchema>
export type ContractConfig = z.infer<typeof ContractSchema>
export type YearlyExecution = z.infer<typeof YearlyExecutionSchema>
export type ExecutionMap = z.infer<typeof ExecutionSchema>
export type PoleQuantities = z.infer<typeof PoleQuantitiesSchema>
export type RevenueResult = z.infer<typeof RevenueResultSchema>
export type DebtAnalysis = z.infer<typeof DebtAnalysisSchema>

/**
 * Canonical Payload Type
 * Represents the structured JSON submission from a PC for a specific month.
 * Does not map 1:1 to SQL tables, allowing NoSQL flexibility or JSONB storage.
 */
export type MonthlyReportPayload = z.infer<typeof MonthlyReportPayloadSchema>

// ─── Helpers  ───────────────────────────────────────────────────────────────

/**
 * Helper to generate a determinisic ID for a PC's monthly report.
 * Format: "REPORT_{pcCode}_{YYYY}_{MM}"
 */
export function buildReportId(pcCode: string, year: number, month: number): string {
  const paddedMonth = month.toString().padStart(2, '0')
  return `REPORT_${pcCode}_${year}_${paddedMonth}`
}
