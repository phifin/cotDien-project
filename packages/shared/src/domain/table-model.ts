import { MONTHLY_REPORT_FORM_DEFS, resolveVisibleColumns } from '../ui-metadata/index.js'
import type { ResolvedColumn } from '../ui-metadata/index.js'
import type { MergedMonthlyDataset, ParsedSubmissionEntry } from './merger.js'

export type PrimitiveCellValue = string | number

export interface DashboardTableRowModel {
  id: string
  pcCode: string
  status: ParsedSubmissionEntry['meta']['status']
  values: Record<string, PrimitiveCellValue>
}

export interface DashboardTableModel {
  columns: ResolvedColumn[]
  rows: DashboardTableRowModel[]
}

function getNestedValue(source: unknown, path: string): unknown {
  if (!source || !path) return undefined
  return path.split('.').reduce<unknown>((acc, key) => {
    if (!acc || typeof acc !== 'object') return undefined
    return (acc as Record<string, unknown>)[key]
  }, source)
}

function toPrimitiveCell(value: unknown, fallback: PrimitiveCellValue = ''): PrimitiveCellValue {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (value == null) return fallback
  return fallback
}

function buildYearAliases(entry: ParsedSubmissionEntry): Record<string, PrimitiveCellValue> {
  const data = entry.data as unknown as Record<string, unknown>
  const execution = (data.execution ?? {}) as Record<string, unknown>

  const openingBalanceByYear = ((execution.opening_balance_by_year as Record<string, unknown> | undefined) ?? {})
  const generatedByYear = ((execution.generated_by_year as Record<string, unknown> | undefined) ?? {})
  const collectedByYear = ((execution.collected_by_year as Record<string, unknown> | undefined) ?? {})

  // Supports both old snake_case payloads and normalized canonical execution.<year>.planned/actual.
  const executionMap = entry.data.execution

  return {
    ke_hoach_2024: toPrimitiveCell(openingBalanceByYear['2024'] ?? entry.data.debtAnalysis.yearlyDebts?.['2024'] ?? 0, 0),
    ke_hoach_2025: toPrimitiveCell(openingBalanceByYear['2025'] ?? entry.data.debtAnalysis.yearlyDebts?.['2025'] ?? 0, 0),
    doanh_so_2026: toPrimitiveCell(generatedByYear['2026'] ?? executionMap['2026']?.planned ?? 0, 0),
    da_thu_2026: toPrimitiveCell(collectedByYear['2026'] ?? executionMap['2026']?.actual ?? 0, 0),
  }
}

export function buildDashboardTableModel(
  dataset: MergedMonthlyDataset,
  targetYears: number[],
): DashboardTableModel {
  const columns = resolveVisibleColumns(MONTHLY_REPORT_FORM_DEFS, targetYears)

  const rows = dataset.entries.map((entry) => {
    const values: Record<string, PrimitiveCellValue> = {}

    for (const col of columns) {
      const rawVal = getNestedValue(entry.data, col.path)
      const fallback = col.inputType === 'number' || col.inputType === 'currency' ? 0 : ''
      values[col.path] = toPrimitiveCell(rawVal, fallback)
    }

    Object.assign(values, buildYearAliases(entry))

    return {
      id: entry.meta.id,
      pcCode: entry.data.identity.pcCode,
      status: entry.meta.status ?? 'DRAFT',
      values,
    }
  })

  return { columns, rows }
}
