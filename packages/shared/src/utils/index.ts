/**
 * Generic utilities — no business logic, no side-effects.
 */

// ─── Async ───────────────────────────────────────────────────────────────────

/**
 * Run independent async operations in parallel.
 * Rule: async-parallel — use Promise.all() for independent operations.
 */
export async function parallel<T extends readonly unknown[]>(
  fns: { [K in keyof T]: () => Promise<T[K]> },
): Promise<T> {
  return Promise.all(fns.map((fn) => fn())) as unknown as Promise<T>
}

/**
 * Wraps a promise in a Result so callers never need try/catch.
 */
export async function tryCatch<T>(
  promise: Promise<T>,
): Promise<{ ok: true; data: T } | { ok: false; error: unknown }> {
  try {
    const data = await promise
    return { ok: true, data }
  } catch (error) {
    return { ok: false, error }
  }
}

// ─── Type guards ──────────────────────────────────────────────────────────────

export function isNonNullable<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined
}

export function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined
}

// ─── String ───────────────────────────────────────────────────────────────────

/** Capitalise the first character of a string. */
export function capitalize(str: string): string {
  if (str.length === 0) return str
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// ─── Object ───────────────────────────────────────────────────────────────────

/**
 * Pick a subset of keys from an object.
 * Rule: js-early-exit — bail fast when keys list is empty.
 */
export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  if (keys.length === 0) return {} as Pick<T, K>
  const result = {} as Pick<T, K>
  for (const key of keys) {
    result[key] = obj[key]
  }
  return result
}

export * from './cn.js'
