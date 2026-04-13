/**
 * Schema primitives — thin wrappers so the rest of the codebase stays
 * decoupled from whichever validation library is chosen.
 *
 * Replace the stubs below with real Zod / Valibot schemas when business
 * fields are introduced.
 */

export type ValidationError = {
  readonly field: string
  readonly message: string
}

export type ParseResult<T> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly errors: ValidationError[] }

/**
 * Minimal schema contract — implement with Zod / Valibot in feature slices.
 */
export interface Schema<T> {
  parse(input: unknown): T
  safeParse(input: unknown): ParseResult<T>
}
