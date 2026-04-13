import { useState, useCallback, useEffect } from 'react'
import type { AccessContextData } from '../contexts/AccessContext'

const LOCAL_STORAGE_PREFIX = 'evnspc_draft_'

/**
 * Vercel Rule: client-localstorage-schema
 * Version the draft format to prevent crash on old tabs
 */
interface DraftSchema {
  version: 2
  savedAt: string
  pcCode: string
  year: number
  month: number
  rows: Array<Record<string, string>>
}

/**
 * Handles isolating Draft backups via AccessContext boundaries.
 * Automatically loads if pre-existing, returning strict canonical entries.
 */
export function useDraftStorage(accessContext: AccessContextData) {
  const storageKey = `${LOCAL_STORAGE_PREFIX}${accessContext.pcCode}_${String(accessContext.period.year)}_${String(accessContext.period.month)}`

  const [hasRestored, setHasRestored] = useState(false)
  const [pendingRows, setPendingRows] = useState<Array<Record<string, string>> | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  // Attempt to restore on mount natively
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<DraftSchema>
        const isMatchingContext =
          parsed.version === 2
          && parsed.pcCode === accessContext.pcCode
          && parsed.year === accessContext.period.year
          && parsed.month === accessContext.period.month
          && Array.isArray(parsed.rows)

        if (isMatchingContext) {
          setPendingRows(parsed.rows ?? null)
          setSavedAt(parsed.savedAt ?? null)
        }
      }
    } catch {
      localStorage.removeItem(storageKey)
    }
    setHasRestored(true)
  }, [storageKey, accessContext.pcCode, accessContext.period.year, accessContext.period.month])

  // Save mechanism that can be triggered on every table blur or explicit 
  const saveDraft = useCallback((rows: Array<Record<string, string>>) => {
    const hasContent = rows.some((row) => Object.values(row).some((value) => value.trim().length > 0))
    if (!hasContent) {
      localStorage.removeItem(storageKey)
      return
    }

    const payload: DraftSchema = {
      version: 2,
      savedAt: new Date().toISOString(),
      pcCode: accessContext.pcCode,
      year: accessContext.period.year,
      month: accessContext.period.month,
      rows,
    }
    localStorage.setItem(storageKey, JSON.stringify(payload))
  }, [storageKey, accessContext.pcCode, accessContext.period.year, accessContext.period.month])

  const clearDraft = useCallback(() => {
    localStorage.removeItem(storageKey)
    setPendingRows(null)
    setSavedAt(null)
  }, [storageKey])

  const restoreDraftRows = useCallback(() => {
    const rows = pendingRows ?? []
    setPendingRows(null)
    return rows
  }, [pendingRows])

  const discardPendingRestore = useCallback(() => {
    setPendingRows(null)
  }, [])

  return {
    hasRestored,
    pendingRows,
    savedAt,
    saveDraft,
    clearDraft,
    restoreDraftRows,
    discardPendingRestore,
  }
}
