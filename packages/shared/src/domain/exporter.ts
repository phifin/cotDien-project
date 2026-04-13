import { resolveVisibleColumns } from '../ui-metadata/utils.js'
import { MONTHLY_REPORT_FORM_DEFS } from '../ui-metadata/definitions.js'
import type { MonthlyReportPayload } from './types.js'

/**
 * Safely extracts a value from a nested object using a dot-notation path.
 * Example: getNestedValue({ metadata: { year: 2024 } }, 'metadata.year') -> 2024
 */
export function getNestedValue(obj: unknown, path: string): string | number | null {
  // Target Rule: js-early-exit
  if (!obj || !path) return null

  let current: unknown = obj
  for (const part of path.split('.')) {
    if (!current || typeof current !== 'object') return null
    const next = (current as Record<string, unknown>)[part]
    if (next === undefined) return null
    current = next
  }

  if (
    typeof current === 'string'
    || typeof current === 'number'
    || current === null
  ) {
    return current
  }
  if (typeof current === 'boolean') return current ? 'true' : 'false'
  return null
}

/**
 * Transforms a single canonical payload into a flat key-value mapping.
 * The keys are explicitly set cleanly as the human-readable Vietnamese labels
 * from our metadata definition so Papa Parse will automatically output
 * perfect CSV headers.
 */
export function buildFlatExportRow(
  payload: MonthlyReportPayload,
  targetYears: number[],
): Record<string, string | number | null> {
  const columns = resolveVisibleColumns(MONTHLY_REPORT_FORM_DEFS, targetYears)
  const row: Record<string, string | number | null> = {}

  for (const col of columns) {
    const rawVal = getNestedValue(payload, col.path)

    // For missing data, export as empty string to keep CSV clean
    row[col.label] = rawVal ?? ''
  }

  return row
}

/**
 * Transformation pipeline: 
 * Takes an array of canonical JSON payloads and converts them into the 
 * exact flat array of records that `Papa.unparse()` requires to generate a CSV file.
 *
 * Example usage:
 * ```ts
 * import { buildCsvExportData } from '@repo/shared/domain'
 * import { unparse } from 'papaparse'
 * 
 * const flatData = buildCsvExportData(submissions, [2024, 2025])
 * const csvString = unparse(flatData) 
 * // -> Downloads beautifully formatted CSV with Vietnamese headers!
 * ```
 */
export function buildCsvExportData(
  payloads: MonthlyReportPayload[],
  targetYears: number[],
): Array<Record<string, string | number | null>> {
  // Target Rule: js-combine-iterations
  // We simply map the payloads through our flattener.
  return payloads.map((payload) => buildFlatExportRow(payload, targetYears))
}
