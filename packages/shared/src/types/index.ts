/**
 * Generic identifier wrapper — keeps ID semantics explicit throughout the codebase.
 */
export type Brand<T, Tag extends string> = T & { readonly __brand: Tag }

export type ID = Brand<string, 'ID'>

/** ISO 8601 date-time string */
export type ISODateString = Brand<string, 'ISODateString'>

/**
 * Standard API result — discriminated union ensures callers handle both branches.
 */
export type Result<T, E = Error> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly error: E }

export function ok<T>(data: T): Result<T> {
  return { ok: true, data }
}

export function err<E = Error>(error: E): Result<never, E> {
  return { ok: false, error }
}

/**
 * Pagination cursor passed between layers.
 */
export interface PaginationParams {
  readonly page: number
  readonly pageSize: number
}

export interface PaginatedResult<T> {
  readonly items: T[]
  readonly total: number
  readonly page: number
  readonly pageSize: number
}

/**
 * Lightweight record shape all domain entities extend.
 * Business-specific fields are added in feature packages or apps.
 */
export interface BaseRecord {
  readonly id: ID
  readonly createdAt: ISODateString
  readonly updatedAt: ISODateString
}
