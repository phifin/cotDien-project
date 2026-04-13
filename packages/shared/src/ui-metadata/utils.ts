import type { FormFieldDefinition } from './types.js'

export interface ResolvedColumn {
  /** The final exact JSON path for runtime binding (e.g., 'execution.2024.planned') */
  path: string
  /** Display label, e.g., 'Kế hoạch (2024)' */
  label: string
  /** Parent grouped header */
  section: string
  inputType: FormFieldDefinition['inputType']
  widthHint?: string
  isReadOnly?: boolean
  isRequired: boolean
  isDerivedFromContext?: boolean
  options?: readonly string[]
}

/**
 * Resolves abstract form definitions into concrete table columns / form chunks.
 * Dynamically replaces `[year]` placeholders aligned to requested tracking years.
 *
 * Rules Applied:
 * - js-flatmap-filter: Expanding dynamic year arrays flatly in a single optimized loop.
 * - js-early-exit: Fast returns for invalid state or skipping logic.
 */
export function resolveVisibleColumns(
  definitions: FormFieldDefinition[],
  targetYears: number[],
): ResolvedColumn[] {
  // Sort guarantees structural array rendering order doesn't mutate unexpectedly
  const sorted = [...definitions].sort((a, b) => a.displayOrder - b.displayOrder)

  return sorted.flatMap((def): ResolvedColumn[] => {
    // Handle dynamic year expansions
    if (def.isYearKeyed) {
      if (targetYears.length === 0) return [] // Bail if no dynamic keys asked for

      return targetYears.map((year): ResolvedColumn => {
        return {
          path: def.path.replace('[year]', String(year)),
          label: `${def.label} (${String(year)})`,
          section: def.section, // Optionally interleaf year into section: `${def.section} ${year}`
          inputType: def.inputType,
          widthHint: def.widthHint,
          isReadOnly: def.isReadOnly,
          isDerivedFromContext: def.isDerivedFromContext,
          isRequired: def.isRequired,
          options: def.options,
        }
      })
    }

    // Standard scalar resolving
    return [
      {
        path: def.path,
        label: def.label,
        section: def.section,
        inputType: def.inputType,
        widthHint: def.widthHint,
        isReadOnly: def.isReadOnly,
        isDerivedFromContext: def.isDerivedFromContext,
        isRequired: def.isRequired,
        options: def.options,
      },
    ]
  })
}
