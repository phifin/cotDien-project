/**
 * @repo/shared — public API
 *
 * Prefer importing from subpaths for better tree-shaking:
 *   import { transformList } from '@repo/shared/transformers'
 *   import { MonthlyReportPayloadSchema } from '@repo/shared/domain'
 */

export * from './types/index.js'
export * from './schemas/index.js'
export * from './transformers/index.js'
export * from './utils/index.js'
export * from './domain/index.js'
export * from './ui-metadata/index.js'
