/**
 * Transformer utilities — pure functions for shaping data between layers
 * (API → domain, domain → view model, etc.).
 *
 * Business-specific transformers live in their respective feature packages.
 * Only generic, reusable transforms belong here.
 */

/**
 * Maps each item through a transformer, collecting results.
 * Rule: js-flatmap-filter — use flatMap to map+filter in one pass.
 */
export function transformList<TIn, TOut>(
  items: TIn[],
  transform: (item: TIn) => TOut | null,
): TOut[] {
  return items.flatMap((item) => {
    const result = transform(item)
    return result !== null ? [result] : []
  })
}

/**
 * Builds an O(1) lookup Map from an array.
 * Rule: js-index-maps — build Map for repeated lookups instead of find().
 */
export function indexBy<T, K extends PropertyKey>(
  items: T[],
  getKey: (item: T) => K,
): Map<K, T> {
  const map = new Map<K, T>()
  for (const item of items) {
    map.set(getKey(item), item)
  }
  return map
}

/**
 * Groups an array by a derived key.
 */
export function groupBy<T, K extends PropertyKey>(
  items: T[],
  getKey: (item: T) => K,
): Map<K, T[]> {
  const map = new Map<K, T[]>()
  for (const item of items) {
    const key = getKey(item)
    const bucket = map.get(key)
    if (bucket !== undefined) {
      bucket.push(item)
    } else {
      map.set(key, [item])
    }
  }
  return map
}
