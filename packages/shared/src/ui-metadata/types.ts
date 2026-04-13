export type InputType = 'text' | 'number' | 'select' | 'date' | 'currency'

/**
 * Describes a structural node in the data entry payload.
 * Used to automatically render tables, forms, and CSV exports.
 */
export interface FormFieldDefinition {
  /**
   * Dot-notation path mapping to the Canonical JSON payload.
   * e.g., 'general.partnerCode'
   * For year-keyed objects, use `[year]` placeholder: 'execution.[year].planned'
   */
  path: string

  /** Human-readable label for UI tables or forms */
  label: string

  /** Grouping key for header rows or form fieldsets */
  section: string

  inputType: InputType

  isRequired: boolean
  displayOrder: number

  /** Visual hints */
  widthHint?: string

  /** Access control */
  isReadOnly?: boolean
  isDerivedFromContext?: boolean

  /** Expansion */
  isYearKeyed?: boolean
  options?: readonly string[]
}
